<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use RuntimeException;
use Soneso\StellarSDK\Asset;
use Soneso\StellarSDK\KeyPair;
use Soneso\StellarSDK\ManageDataOperationBuilder;
use Soneso\StellarSDK\Memo;
use Soneso\StellarSDK\Network;
use Soneso\StellarSDK\PaymentOperationBuilder;
use Soneso\StellarSDK\StellarSDK;
use Soneso\StellarSDK\TransactionBuilder;

/**
 * StellarService
 *
 * Uses soneso/stellar-php-sdk to:
 *  - Anchor CID hashes on Stellar via ManageData operations
 *  - Verify CID hashes by querying account data entries on Horizon
 *  - Submit XLM payment transactions between wallets
 */
class StellarService
{
    private StellarSDK $sdk;
    private Network $network;
    private string $horizonUrl;
    private string $hospitalPublicKey;
    private string $hospitalSecretKey;

    public function __construct()
    {
        $this->horizonUrl       = config('stellar.horizon_url');
        $this->hospitalPublicKey = config('stellar.hospital_public_key', '');
        $this->hospitalSecretKey = config('stellar.hospital_secret_key', '');

        $networkName = config('stellar.network', 'testnet');
        $this->network = $networkName === 'mainnet' ? Network::public() : Network::testnet();

        $this->sdk = new StellarSDK($this->horizonUrl);
    }

    /**
     * Anchor a CID hash on Stellar using a ManageData operation.
     * The CID is stored as an account data entry: key = "HMS_CID", value = sha256(cid).
     *
     * @param  string  $cid  IPFS Content Identifier
     * @return string  Stellar transaction hash
     */
    public function storeCidHash(string $cid): string
    {
        $this->assertKeysConfigured();

        $keyPair    = KeyPair::fromSeed($this->hospitalSecretKey);
        $account    = $this->sdk->requestAccount($this->hospitalPublicKey);

        // Store SHA-256 of CID as a 32-byte data entry (Stellar data value limit is 64 bytes)
        $dataKey   = 'HMS_CID_' . substr($cid, 0, 24); // keep key ≤ 64 chars
        $dataValue = hash('sha256', $cid, true);        // raw 32 bytes

        $operation = (new ManageDataOperationBuilder($dataKey, $dataValue))->build();

        $transaction = (new TransactionBuilder($account))
            ->addOperation($operation)
            ->addMemo(Memo::text('HMS:' . substr($cid, 0, 24)))
            ->build();

        $transaction->sign($keyPair, $this->network);

        $response = $this->sdk->submitTransaction($transaction);

        if (! $response->isSuccessful()) {
            $extras = $response->getExtras();
            $detail = $extras ? json_encode($extras->getResultCodes()) : 'unknown error';
            throw new RuntimeException("Stellar storeCidHash failed: {$detail}");
        }

        $txHash = $response->getHash();

        Log::info('StellarService: CID anchored on chain', ['cid' => $cid, 'tx' => $txHash]);

        return $txHash;
    }

    /**
     * Verify a CID exists on Stellar by checking the account's data entries.
     *
     * @param  string  $cid
     * @return bool
     */
    public function verifyCid(string $cid): bool
    {
        $this->assertKeysConfigured();

        try {
            $account  = $this->sdk->requestAccount($this->hospitalPublicKey);
            $dataKey  = 'HMS_CID_' . substr($cid, 0, 24);
            $expected = base64_encode(hash('sha256', $cid, true));

            $storedValue = $account->getData()->get($dataKey);

            return $storedValue !== null && $storedValue === $expected;
        } catch (\Throwable $e) {
            Log::warning('StellarService: verifyCid error', ['error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Send an XLM payment on Stellar.
     *
     * @param  string  $destinationPublicKey
     * @param  string  $amount  Amount in XLM
     * @param  string  $memo    Optional text memo (max 28 bytes)
     * @return string  Transaction hash
     */
    public function sendPayment(string $destinationPublicKey, string $amount, string $memo = ''): string
    {
        $this->assertKeysConfigured();

        $keyPair   = KeyPair::fromSeed($this->hospitalSecretKey);
        $account   = $this->sdk->requestAccount($this->hospitalPublicKey);

        $operation = (new PaymentOperationBuilder(
            $destinationPublicKey,
            Asset::native(),
            $amount
        ))->build();

        $builder = (new TransactionBuilder($account))->addOperation($operation);

        if ($memo !== '') {
            $builder->addMemo(Memo::text(substr($memo, 0, 28)));
        }

        $transaction = $builder->build();
        $transaction->sign($keyPair, $this->network);

        $response = $this->sdk->submitTransaction($transaction);

        if (! $response->isSuccessful()) {
            $extras = $response->getExtras();
            $detail = $extras ? json_encode($extras->getResultCodes()) : 'unknown error';
            throw new RuntimeException("Stellar payment failed: {$detail}");
        }

        $txHash = $response->getHash();

        Log::info('StellarService: payment sent', [
            'destination' => $destinationPublicKey,
            'amount'      => $amount,
            'tx'          => $txHash,
        ]);

        return $txHash;
    }

    /**
     * Get raw account details from Horizon.
     */
    public function getAccount(string $publicKey): array
    {
        $account = $this->sdk->requestAccount($publicKey);
        return [
            'id'       => $account->getAccountId(),
            'sequence' => $account->getSequenceNumber(),
            'balances' => array_map(fn($b) => [
                'asset'   => $b->getAssetType() === 'native' ? 'XLM' : $b->getAssetCode(),
                'balance' => $b->getBalance(),
            ], $account->getBalances()->toArray()),
        ];
    }

    // ─── Private ────────────────────────────────────────────────────────────

    private function assertKeysConfigured(): void
    {
        if (empty($this->hospitalPublicKey) || empty($this->hospitalSecretKey)) {
            throw new RuntimeException(
                'Stellar keys not configured. Set STELLAR_HOSPITAL_PUBLIC_KEY and STELLAR_HOSPITAL_SECRET_KEY in .env'
            );
        }
    }
}
