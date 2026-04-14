<?php

return [
    /*
    |--------------------------------------------------------------------------
    | IPFS Configuration
    |--------------------------------------------------------------------------
    | Supports Infura IPFS or a local IPFS node.
    | Set IPFS_DRIVER to 'infura' or 'local'.
    */

    'driver'     => env('IPFS_DRIVER', 'infura'),

    'infura' => [
        'project_id'     => env('IPFS_INFURA_PROJECT_ID'),
        'project_secret' => env('IPFS_INFURA_PROJECT_SECRET'),
        'endpoint'       => env('IPFS_INFURA_ENDPOINT', 'https://ipfs.infura.io:5001'),
        'gateway'        => env('IPFS_GATEWAY', 'https://ipfs.io/ipfs'),
    ],

    'local' => [
        'endpoint' => env('IPFS_LOCAL_ENDPOINT', 'http://127.0.0.1:5001'),
        'gateway'  => env('IPFS_LOCAL_GATEWAY', 'http://127.0.0.1:8080/ipfs'),
    ],
];
