use cosmwasm_std::{Binary, HumanAddr};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct InitMsg {
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub enum HandleMsg {
    SetInputA {
        input: u32,
        message: Binary,
        signature: Binary,
        pub_key: Binary,
    },
    SetInputB {
        input: u32,
        message: Binary,
        signature: Binary,
        pub_key: Binary,
    },
    Compare {},
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub enum QueryMsg {
    InputA {},
    InputB {},
}

// We define a custom struct for each query response
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct InputAResponse {
    pub input_a: u32,
    pub address_a: HumanAddr,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct InputBResponse {
    pub input_b: u32,
    pub address_b: HumanAddr,
}