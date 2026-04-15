#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    Address, Env, String, Symbol,
};

const PAYMENT_KEY: Symbol = symbol_short!("PAY");

#[contracttype]
pub struct PaymentRecord {
    pub patient_id: String,
    pub cid: String,
    pub amount: i128,
    pub released: bool,
}

#[contract]
pub struct PaymentContract;

#[contractimpl]
impl PaymentContract {
    /// Release payment to hospital wallet.
    /// Records the release on-chain and emits an audit event.
    pub fn release_payment(
        env: Env,
        patient_id: String,
        cid: String,
        destination_wallet: Address,
        amount: i128,
    ) -> bool {
        let key = (PAYMENT_KEY, cid.clone());
        let record = PaymentRecord {
            patient_id: patient_id.clone(),
            cid: cid.clone(),
            amount,
            released: true,
        };
        env.storage().persistent().set(&key, &record);

        env.events().publish(
            (symbol_short!("pay_rel"), patient_id),
            (cid, amount, destination_wallet),
        );

        true
    }

    /// Check if payment was released for a CID
    pub fn is_payment_released(env: Env, cid: String) -> bool {
        let key = (PAYMENT_KEY, cid);
        let record: Option<PaymentRecord> = env.storage().persistent().get(&key);
        record.map(|r| r.released).unwrap_or(false)
    }
}
