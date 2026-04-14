<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Stellar / Soroban Configuration
    |--------------------------------------------------------------------------
    */

    'network'    => env('STELLAR_NETWORK', 'testnet'), // 'testnet' or 'mainnet'

    'horizon_url' => env('STELLAR_HORIZON_URL', 'https://horizon-testnet.stellar.org'),

    'soroban_rpc_url' => env('STELLAR_SOROBAN_RPC_URL', 'https://soroban-testnet.stellar.org'),

    // Hospital wallet
    'hospital_public_key'  => env('STELLAR_HOSPITAL_PUBLIC_KEY'),
    'hospital_secret_key'  => env('STELLAR_HOSPITAL_SECRET_KEY'),

    // Smart contract IDs
    'insurance_contract_id' => env('STELLAR_INSURANCE_CONTRACT_ID'),
    'payment_contract_id'   => env('STELLAR_PAYMENT_CONTRACT_ID'),

    // Asset for payments (XLM or custom token)
    'payment_asset' => env('STELLAR_PAYMENT_ASSET', 'XLM'),
    'payment_issuer' => env('STELLAR_PAYMENT_ISSUER', null),

    // Memo prefix for CID storage
    'memo_prefix' => env('STELLAR_MEMO_PREFIX', 'HMS_CID:'),
];
