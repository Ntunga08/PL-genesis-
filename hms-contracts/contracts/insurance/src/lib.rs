#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Env, String, Symbol};

/// Storage keys
const INSURANCE_KEY: Symbol = symbol_short!("INS");
const CID_KEY: Symbol = symbol_short!("CID");

#[contracttype]
pub struct InsuranceRecord {
    pub patient_id: String,
    pub insurance_number: String,
    pub is_active: bool,
}

#[contract]
pub struct InsuranceContract;

#[contractimpl]
impl InsuranceContract {
    /// Admin registers an insurance record for a patient
    pub fn register_insurance(
        env: Env,
        patient_id: String,
        insurance_number: String,
    ) {
        let key = (INSURANCE_KEY, patient_id.clone());
        let record = InsuranceRecord {
            patient_id,
            insurance_number,
            is_active: true,
        };
        env.storage().persistent().set(&key, &record);
    }

    /// Validate insurance — called by HMS backend
    /// Returns true if insurance is active for this patient
    pub fn validate_insurance(
        env: Env,
        patient_id: String,
        insurance_number: String,
    ) -> bool {
        let key = (INSURANCE_KEY, patient_id);
        let record: Option<InsuranceRecord> = env.storage().persistent().get(&key);
        match record {
            Some(r) => r.is_active && r.insurance_number == insurance_number,
            None => false,
        }
    }

    /// Store a CID hash on-chain for verification
    pub fn store_cid(env: Env, cid: String, stellar_tx_hash: String) {
        let key = (CID_KEY, cid.clone());
        env.storage().persistent().set(&key, &stellar_tx_hash);
    }

    /// Verify a CID exists on-chain
    pub fn verify_cid(env: Env, cid: String, stellar_tx_hash: String) -> bool {
        let key = (CID_KEY, cid);
        let stored: Option<String> = env.storage().persistent().get(&key);
        match stored {
            Some(tx) => tx == stellar_tx_hash,
            None => false,
        }
    }
}
