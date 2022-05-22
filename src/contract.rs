#![allow(unused)]

use cosmwasm_std::{
    log, debug_print, to_binary, Api, Binary, Env, Extern, HandleResponse, InitResponse, Querier,
    StdError, StdResult, Storage, HumanAddr,
};

use crate::msg::{HandleMsg, InitMsg, QueryMsg, InputAResponse, InputBResponse};
use crate::state::{config, write_input_a, write_input_b, read_input_a, read_input_b, State, Input};

pub fn init<S: Storage, A: Api, Q: Querier>(
    deps: &mut Extern<S, A, Q>,
    env: Env,
    _msg: InitMsg,
) -> StdResult<InitResponse> {
    // saving owner address not really necessary, but good to have if needed later
    let state = State {
        owner: deps.api.canonical_address(&env.message.sender)?,
    };
    config(&mut deps.storage).save(&state)?;

    Ok(InitResponse::default())
}

pub fn handle<S: Storage, A: Api, Q: Querier>(
    deps: &mut Extern<S, A, Q>,
    env: Env,
    msg: HandleMsg,
) -> StdResult<HandleResponse> {
    match msg {
        HandleMsg::SetInputA { input, message, signature, pub_key } 
            => handle_input_a(deps, env, input, message, signature, pub_key),
        HandleMsg::SetInputB { input, message, signature, pub_key } 
            => handle_input_b(deps, env, input, message, signature, pub_key),
        HandleMsg::Compare {}
            => try_compare(deps, env),
    }
}

pub fn handle_input_a<S: Storage, A: Api, Q: Querier>(
    deps: &mut Extern<S, A, Q>,
    env: Env,
    input: u32,
    message: Binary,
    signature: Binary,
    pub_key: Binary,
) -> StdResult<HandleResponse> {
    // Exit the function if the signature verification fails
    if !deps.api.ed25519_verify(message.as_slice(), signature.as_slice(), pub_key.as_slice()).unwrap_or(false) {
        return Err(StdError::generic_err("Invalid signature"))
    }

    let input_a = Input {
        address: deps.api.canonical_address(&env.message.sender)?,
        input: input,
    };
    write_input_a(&mut deps.storage).save(&input_a)?;

    Ok(HandleResponse::default())
}

pub fn handle_input_b<S: Storage, A: Api, Q: Querier>(
    deps: &mut Extern<S, A, Q>,
    env: Env,
    input: u32,
    message: Binary,
    signature: Binary,
    pub_key: Binary,
) -> StdResult<HandleResponse> {
    // Exit the function if the signature verification fails
    if !deps.api.ed25519_verify(message.as_slice(), signature.as_slice(), pub_key.as_slice()).unwrap_or(false) {
        return Err(StdError::generic_err("Invalid signature"))
    }

    let input_b = Input {
        address: deps.api.canonical_address(&env.message.sender)?,
        input: input,
    };
    write_input_b(&mut deps.storage).save(&input_b)?;

    Ok(HandleResponse::default())
}

pub fn try_compare<S: Storage, A: Api, Q: Querier>(
    deps: &mut Extern<S, A, Q>,
    _env: Env,
) -> StdResult<HandleResponse> {
    let input_a = read_input_a(&deps.storage).load()?;
    let input_b = read_input_b(&deps.storage).load()?;

    let address_a = deps.api.human_address(&input_a.address)?;
    let address_b = deps.api.human_address(&input_b.address)?;

    let result: HumanAddr;

    if input_a.input > input_b.input {result = address_a.clone()}
    else {result = address_b.clone()}

    debug_print("comparison happened successfully");
    Ok(HandleResponse {
        messages: vec![],
        log: vec![
            log("address A",&address_a),
            log("address B",&address_b),
            log("larger number belongs to",&result)],
        data: None
    })
}

pub fn query<S: Storage, A: Api, Q: Querier>(
    deps: &Extern<S, A, Q>,
    msg: QueryMsg,
) -> StdResult<Binary> {
    match msg {
        QueryMsg::InputA {} => to_binary(&query_input_a(deps)?),
        QueryMsg::InputB {} => to_binary(&query_input_b(deps)?),
    }
}

fn query_input_a<S: Storage, A: Api, Q: Querier>(deps: &Extern<S, A, Q>) -> StdResult<InputAResponse> {
    let input = read_input_a(&deps.storage).load()?;
    Ok(InputAResponse { 
        input_a: input.input,
        address_a: deps.api.human_address(&input.address)?,
    })
}

fn query_input_b<S: Storage, A: Api, Q: Querier>(deps: &Extern<S, A, Q>) -> StdResult<InputBResponse> {
    let input = read_input_b(&deps.storage).load()?;
    Ok(InputBResponse { 
        input_b: input.input,
        address_b: deps.api.human_address(&input.address)?,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use cosmwasm_std::testing::{mock_dependencies, mock_env};
    use cosmwasm_std::{coins, from_binary, StdError};

    #[test]
    fn proper_initialization() {
        let mut deps = mock_dependencies(20, &[]);

        let msg = InitMsg {};
        let env = mock_env("creator", &coins(1000, "earth"));

        // we can just call .unwrap() to assert this was a success
        let res = init(&mut deps, env, msg).unwrap();
        assert_eq!(0, res.messages.len());
    }
}
