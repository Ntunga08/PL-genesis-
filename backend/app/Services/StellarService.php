<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * StellarService
 *
 * Interacts with the Stellar Horizon REST API to:
 *  - Store CID hashes on-chain via transaction memo
 *  - Verify CID hashes by querying transaction history
 *  - Submit payment transactions between wallets
 *
 * Uses the Stellar Horizon HTTP API directly (no PHP SDK dependency required).
 * For production, consider adding stellar/sdk via composer.
 */
class StellarService
{
    private string $horizonUrl;
    private string $hospitalPublicKey;
    private string $hospitalSecretKey;
    private string $memoPrefix;
    private string $network;

    public function __construct()
    {
        $this->horizonUrl        = config('stellar.horizon_url');
        $this->hospitalPublicKey = config('stellar.hospital_public_key', '');
        $this->hospitalSecretKey = config('stellar.hospital_secret_key', '');
        $this->memoPrefix        = config('stellar.memo_prefix', 'HMS_CID:');
        $this->network           = config('stellar.network', 'testnet');
    }

    /**
     * Store a CID hash on the Stellar blockchain.
     * Submits a minimal XLM self-payment with the CID in the memo field.
     *
     * @param  string  $cid
     * @return string  Transaction hash
     */
    public function storeCidHash(string $cid): string
    {
        $this->assertKeysConfigured();

        $memo = $this->memoPrefix . $cid;

        // Memo text is limited to 28 bytes on Stellar; use hash memo for full CIDs
        $txHash = $this->submitMemoTransaction($memo);

        Log::info('StellarService: CID stored on chain', ['cid' => $cid, 'tx' => $txHash]);

        return $txHash;
    }

    /**
     * Verify that a CID exists on the Stellar blockchain.
     *
     * @param  string  $cid
     * @return bool
     */
    public function verifyCid(string $cid): bool
    {
        $this->assertKeysConfigured();

        $memo   = $this->memoPrefix . $cid;
        $txList = $this->fetchAccountTransactions($this->hospitalPublicKey);

        foreach ($txList as $tx) {
            if (isset($tx['memo']) && $tx['memo'] === $memo) {
                return true;
            }
            // Also check hash memo (SHA-256 of CID)
            if (isset($tx['memo_type']) && $tx['memo_type'] === 'hash') {
                $cidHash = base64_encode(hash('sha256', $cid, true));
                if ($tx['memo'] === $cidHash) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Submit a payment transaction on Stellar.
     *
     * @param  string  $destinationPublicKey
     * @param  string  $amount  Amount in XLM (or token units)
     * @param  string  $memo    Optional memo
     * @return string  Transaction hash
     */
    public function sendPayment(string $destinationPublicKey, string $amount, string $memo = ''): string
    {
        $this->assertKeysConfigured();

        $txHash = $this->submitPaymentTransaction($destinationPublicKey, $amount, $memo);

        Log::info('StellarService: payment sent', [
            'destination' => $destinationPublicKey,
            'amount'      => $amount,
            'tx'          => $txHash,
        ]);

        return $txHash;
    }

    /**
     * Get account details from Horizon.
     *
     * @param  string  $publicKey
     * @return array
     */
    public function getAccount(string $publicKey): array
    {
        $response = Http::get("{$this->horizonUrl}/accounts/{$publicKey}");

        if (! $response->successful()) {
            throw new RuntimeException("Stellar account not found: {$publicKey}");
        }

        return $response->json();
    }

    // ─── Private Helpers ────────────────────────────────────────────────────

    /**
     * Build and submit a transaction with a text memo (self-payment of 0.0000001 XLM).
     * This is the standard pattern for anchoring data on Stellar.
     *
     * NOTE: Full transaction signing requires the Stellar SDK or a signing service.
     * This implementation calls a signing microservice or uses the Stellar Laboratory
     * pattern. For production, integrate stellar/sdk via composer.
     */
    private function submitMemoTransaction(string $memo): string
    {
        // In a real deployment this would use the Stellar PHP SDK to:
        // 1. Load account sequence number
        // 2. Build TransactionBuilder with ManageDataOperation or PaymentOperation
        // 3. Sign with hospitalSecretKey
        // 4. Submit XDR envelope to Horizon

        // For now we call a local signing helper endpoint or return a simulated hash
        // Replace this block with actual SDK calls when stellar/sdk is installed.
        return $this->signAndSubmit([
            'type'        => 'memo',
            'memo'        => $memo,
            'source'      => $this->hospitalPublicKey,
            'secret'      => $this->hospitalSecretKey,
            'network'     => $this->network,
            'horizon_url' => $this->horizonUrl,
        ]);
    }

    private function submitPaymentTransaction(string $destination, string $amount, string $memo): string
    {
        return $this->signAndSubmit([
            'type'        => 'payment',
            'destination' => $destination,
            'amount'      => $amount,
            'memo'        => $memo,
            'source'      => $this->hospitalPublicKey,
            'secret'      => $this->hospitalSecretKey,
            'network'     => $this->network,
            'horizon_url' => $this->horizonUrl,
        ]);
    }

    /**
     * Delegates transaction signing to the Stellar signing microservice.
     * Set STELLAR_SIGNER_URL in .env to point to your signing service.
     * Falls back to a stub hash for local development.
     */
    private function signAndSubmit(array $payload): string
    {
        $signerUrl = env('STELLAR_SIGNER_URL');

        if ($signerUrl) {
            $response = Http::timeout(15)->post("{$signerUrl}/sign-and-submit", $payload);

            if (! $response->successful()) {
                throw new RuntimeException('Stellar signer error: ' . $response->body());
            }

            return $response->json('tx_hash');
        }

        // Development stub — replace with real SDK integration
        Log::warning('StellarService: STELLAR_SIGNER_URL not set, returning stub tx hash');
        return 'stub_tx_' . hash('sha256', json_encode($payload) . microtime());
    }

    private function fetchAccountTransactions(string $publicKey): array
    {
        $response = Http::get("{$this->horizonUrl}/accounts/{$publicKey}/transactions", [
            'limit' => 200,
            'order' => 'desc',
        ]);

        if (! $response->successful()) {
            return [];
        }

        return $response->json('_embedded.records', []);
    }

    private function assertKeysConfigured(): void
    {
        if (empty($this->hospitalPublicKey) || empty($this->hospitalSecretKey)) {
            throw new RuntimeException(
                'Stellar hospital keys not configured. Set STELLAR_HOSPITAL_PUBLIC_KEY and STELLAR_HOSPITAL_SECRET_KEY in .env'
            );
        }
    }
}
