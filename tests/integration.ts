import axios from "axios";
import { Wallet, SecretNetworkClient, fromUtf8 } from "secretjs";
import fs from "fs";
import assert from "assert";

// Returns a client with which we can interact with secret network
const initializeClient = async (endpoint: string, chainId: string) => {
  const wallet = new Wallet(); // Use default constructor of wallet to generate random mnemonic.
  const accAddress = wallet.address;
  const client = await SecretNetworkClient.create({
    // Create a client to interact with the network
    grpcWebUrl: endpoint,
    chainId: chainId,
    wallet: wallet,
    walletAddress: accAddress,
  });

  console.log(`Initialized client A with wallet address: ${accAddress}`);
  return client;
};

// Stores and instantiaties a new contract in our network
const initializeContract = async (
  client: SecretNetworkClient,
  contractPath: string
) => {
  const wasmCode = fs.readFileSync(contractPath);
  console.log("Uploading contract");

  const uploadReceipt = await client.tx.compute.storeCode(
    {
      wasmByteCode: wasmCode,
      sender: client.address,
      source: "",
      builder: "",
    },
    {
      gasLimit: 5000000,
    }
  );

  if (uploadReceipt.code !== 0) {
    console.log(
      `Failed to get code id: ${JSON.stringify(uploadReceipt.rawLog)}`
    );
    throw new Error(`Failed to upload contract`);
  }

  const codeIdKv = uploadReceipt.jsonLog![0].events[0].attributes.find(
    (a: any) => {
      return a.key === "code_id";
    }
  );

  const codeId = Number(codeIdKv!.value);
  console.log("Contract codeId: ", codeId);

  const contractCodeHash = await client.query.compute.codeHash(codeId);
  console.log(`Contract hash: ${contractCodeHash}`);

  const contract = await client.tx.compute.instantiateContract(
    {
      sender: client.address,
      codeId,
      // Initialize the contract with public key (base64 encoded string). This message will trigger our Init function
      initMsg: {},
      codeHash: contractCodeHash,
      label: "My contract" + Math.ceil(Math.random() * 10000), // The label should be unique for every contract, add random string in order to maintain uniqueness
    },
    {
      gasLimit: 1000000,
    }
  );

  if (contract.code !== 0) {
    throw new Error(
      `Failed to instantiate the contract with the following error ${contract.rawLog}`
    );
  }

  const contractAddress = contract.arrayLog!.find(
    (log) => log.type === "message" && log.key === "contract_address"
  )!.value;

  console.log(`Contract address: ${contractAddress}`);

  var contractInfo: [string, string] = [contractCodeHash, contractAddress];
  return contractInfo;
};

const getFromFaucet = async (address: string) => {
  await axios.get(`http://localhost:5000/faucet?address=${address}`);
};

async function getScrtBalance(userCli: SecretNetworkClient): Promise<string> {
  let balanceResponse = await userCli.query.bank.balance({
    address: userCli.address,
    denom: "uscrt",
  });
  return balanceResponse.balance!.amount;
}

async function fillUpFromFaucet(
  client: SecretNetworkClient,
  targetBalance: Number
) {
  let balance = await getScrtBalance(client);
  while (Number(balance) < targetBalance) {
    try {
      await getFromFaucet(client.address);
    } catch (e) {
      console.error(`failed to get tokens from faucet: ${e}`);
    }
    balance = await getScrtBalance(client);
  }
  console.error(`got tokens from faucet: ${balance}`);
}

// Initialization procedure
async function initializeAndUploadContract() {
  let endpoint = "http://localhost:9091";
  let chainId = "secretdev-1";

  const client = await initializeClient(endpoint, chainId);

  await fillUpFromFaucet(client, 100_000_000);

  const [contractHash, contractAddress] = await initializeContract(
    client,
    "contract.wasm.gz"
  );

  var clientInfo: [SecretNetworkClient, string, string] = [
    client,
    contractHash,
    contractAddress,
  ];
  return clientInfo;
}

async function queryInputA(
  client: SecretNetworkClient,
  contractHash: string,
  contractAddress: string
): Promise<number> {
  type InputAResponse = { input_a: number };

  const inputAResponse = (await client.query.compute.queryContract({
    contractAddress: contractAddress,
    codeHash: contractHash,
    query: { input_a: {} },
  })) as InputAResponse;

  if ('err"' in inputAResponse) {
    throw new Error(
      `Query failed with the following err: ${JSON.stringify(inputAResponse)}`
    );
  }

  return inputAResponse.input_a;
}

async function queryInputB(
  client: SecretNetworkClient,
  contractHash: string,
  contractAddress: string
): Promise<number> {
  type InputBResponse = { input_b: number };

  const inputBResponse = (await client.query.compute.queryContract({
    contractAddress: contractAddress,
    codeHash: contractHash,
    query: { input_b: {} },
  })) as InputBResponse;

  if ('err"' in inputBResponse) {
    throw new Error(
      `Query failed with the following err: ${JSON.stringify(inputBResponse)}`
    );
  }

  return inputBResponse.input_b;
}

async function compareTx(
  client: SecretNetworkClient,
  contractHash: string,
  contractAddress: string
) {
  const tx = await client.tx.compute.executeContract(
    {
      sender: client.address,
      contractAddress: contractAddress,
      codeHash: contractHash,
      msg: {
        compare: {},
      },
      sentFunds: [],
    },
    {
      gasLimit: 200000,
    }
  );

  // let compareResult = tx.arrayLog.find((log) => log.key === "result").value;
  let compareResult = tx.arrayLog.find((log) => log.key === "larger number belongs to").value;
  console.log(`Compare TX used ${tx.gasUsed} gas`);
  return compareResult;
}

async function setInputATx(
  client: SecretNetworkClient,
  contractHash: string,
  contractAddress: string
) {
  const tx = await client.tx.compute.executeContract(
    {
      sender: client.address,
      contractAddress: contractAddress,
      codeHash: contractHash,
      msg: {
        set_input_a: {
          input: 17,
          message: "MTc=",
          signature: "TzEt4B35WA6zF5iNqUieOehEgw2MBwqoFdidZxHg0QFvuo0OlojyoQ5ZphE+COO2coAzNoxJZGN3H0bis26pCg==",
          pub_key: "GNBrKE1JwUDF9F1sR268gWbATvlxf5XWMZUS7OanKnw=",
        },
      },
      sentFunds: [],
    },
    {
      gasLimit: 200000,
    }
  );

  console.log(`Set Input A TX used ${tx.gasUsed} gas`);
}

async function setInputBTx(
  client: SecretNetworkClient,
  contractHash: string,
  contractAddress: string
) {
  const tx = await client.tx.compute.executeContract(
    {
      sender: client.address,
      contractAddress: contractAddress,
      codeHash: contractHash,
      msg: {
        set_input_b: {
          input: 3,
          message: "Mw==",
          signature: "z/fuZmYdoE0MJgqgCO+r96Nca/X8Yy6X/H+mtRqRhcINUC5zdYv+MDZd5BO6OE2ZCuxIVMnV5inR2huDWvEUDg==",
          pub_key: "YYXgbomDWBcuN1d8r1aQTyhBpwqOpa32GlRaWiavyZA=",
        },
      },
      sentFunds: [],
    },
    {
      gasLimit: 200000,
    }
  );

  console.log(`Set Input B TX used ${tx.gasUsed} gas`);
}

async function setWrongInputATx(
  client: SecretNetworkClient,
  contractHash: string,
  contractAddress: string
) {
  const tx = await client.tx.compute.executeContract(
    {
      sender: client.address,
      contractAddress: contractAddress,
      codeHash: contractHash,
      msg: {
        set_input_a: {
          input: 17,
          message: "MTc=",
          //this is signed by the input b's pub_key
          signature: "DEnj68Spr/DrczxUydcyu6iBlaYn/sAUEvowKTi7P5A8N3ET1p2Pskw3+XyC5PeKwK+MX+XUNn/EF1EcRPBtCg==",
          pub_key: "GNBrKE1JwUDF9F1sR268gWbATvlxf5XWMZUS7OanKnw=",
        },
      },
      sentFunds: [],
    },
    {
      gasLimit: 200000,
    }
  );
  
  console.log(`Set Wrong Input A TX used ${tx.gasUsed} gas`);
  return (tx)
}

async function test_query_inputs(
  client: SecretNetworkClient,
  contractHash: string,
  contractAddress: string
) {
  await setInputATx(client, contractHash, contractAddress);
  await setInputBTx(client, contractHash, contractAddress);

  const inputA: number = await queryInputA(
    client,
    contractHash,
    contractAddress
  );
  console.log(`Input A is ${inputA}`);

  const inputB: number = await queryInputB(
    client,
    contractHash,
    contractAddress
  );
  console.log(`Input B is ${inputB}`);
  
  assert(
    inputA === 17,
    `Input A expected to be 17 instead of ${inputA}`
  );
  assert(
    inputB === 3,
    `Input B expected to be 3 instead of ${inputB}`
  );
}

async function test_comparison(
  client: SecretNetworkClient,
  contractHash: string,
  contractAddress: string
) {
  let compareResult = await compareTx(client, contractHash, contractAddress);
  assert(
    compareResult === client.address,
    'The result expected to be the same address as our client'
  );
}

async function test_wrong_signature(
  client: SecretNetworkClient,
  contractHash: string,
  contractAddress: string
) {
  let tx = await setWrongInputATx(client, contractHash, contractAddress);
  assert(
    tx.rawLog.includes("Invalid signature") === true
  )
}

async function runTestFunction(
  tester: (
    client: SecretNetworkClient,
    contractHash: string,
    contractAddress: string
  ) => void,
  client: SecretNetworkClient,
  contractHash: string,
  contractAddress: string
) {
  console.log(`Testing ${tester.name}`);
  await tester(client, contractHash, contractAddress);
  console.log(`[SUCCESS] ${tester.name}`);
}

(async () => {
  const [client, contractHash, contractAddress] =
    await initializeAndUploadContract();

  await runTestFunction(
    test_query_inputs,
    client,
    contractHash,
    contractAddress
  );
  await runTestFunction(
    test_comparison,
    client,
    contractHash,
    contractAddress
  );
  await runTestFunction(
    test_wrong_signature,
    client,
    contractHash,
    contractAddress
  );
})();
