<?php

return [
    /*
    |--------------------------------------------------------------------------
    | IPFS Driver
    |--------------------------------------------------------------------------
    | 'pinata'  — Pinata cloud (recommended, free tier available)
    | 'infura'  — Infura IPFS (legacy, requires project_id + secret)
    | 'local'   — Local IPFS daemon
    */
    'driver' => env('IPFS_DRIVER', 'pinata'),

    /*
    |--------------------------------------------------------------------------
    | Pinata (https://pinata.cloud)
    |--------------------------------------------------------------------------
    | Get credentials from: app.pinata.cloud → API Keys → New Key
    | Use JWT (recommended) OR api_key + api_secret
    */
    'pinata' => [
        'jwt'        => env('IPFS_PINATA_JWT'),           // recommended
        'api_key'    => env('IPFS_PINATA_API_KEY'),       // alternative
        'api_secret' => env('IPFS_PINATA_API_SECRET'),    // alternative
    ],

    /*
    |--------------------------------------------------------------------------
    | Infura (legacy)
    |--------------------------------------------------------------------------
    */
    'infura' => [
        'project_id'     => env('IPFS_INFURA_PROJECT_ID'),
        'project_secret' => env('IPFS_INFURA_PROJECT_SECRET'),
        'endpoint'       => env('IPFS_INFURA_ENDPOINT', 'https://ipfs.infura.io:5001'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Local IPFS daemon
    |--------------------------------------------------------------------------
    */
    'local' => [
        'endpoint' => env('IPFS_LOCAL_ENDPOINT', 'http://127.0.0.1:5001'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Public Gateway (for retrieval)
    |--------------------------------------------------------------------------
    */
    'gateway' => env('IPFS_GATEWAY', 'https://gateway.pinata.cloud/ipfs'),
];
