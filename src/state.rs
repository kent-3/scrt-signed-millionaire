use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

use cosmwasm_std::{CanonicalAddr, Storage};
use cosmwasm_storage::{singleton, singleton_read, ReadonlySingleton, Singleton};

pub static CONFIG_KEY: &[u8] = b"config";
pub static A_KEY: &[u8] = b"input_a";
pub static B_KEY: &[u8] = b"input_b";

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct State {
    pub owner: CanonicalAddr,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct Input {
    pub address: CanonicalAddr,
    pub input: u32,
}

// State storage
pub fn config<S: Storage>(storage: &mut S) -> Singleton<S, State> {
    singleton(storage, CONFIG_KEY)
}

pub fn config_read<S: Storage>(storage: &S) -> ReadonlySingleton<S, State> {
    singleton_read(storage, CONFIG_KEY)
}

// inputs storage
pub fn write_input_a<S: Storage>(storage: &mut S) -> Singleton<S, Input> {
    singleton(storage, A_KEY)
}

pub fn read_input_a<S: Storage>(storage: &S) -> ReadonlySingleton<S, Input> {
    singleton_read(storage, A_KEY)
}

pub fn write_input_b<S: Storage>(storage: &mut S) -> Singleton<S, Input> {
    singleton(storage, B_KEY)
}

pub fn read_input_b<S: Storage>(storage: &S) -> ReadonlySingleton<S, Input> {
    singleton_read(storage, B_KEY)
}