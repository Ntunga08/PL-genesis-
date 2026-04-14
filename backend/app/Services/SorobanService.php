<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * SorobanService
 *
 * Interacts with Soroban smart contracts via the Soroban RPC endpoint.
 *
 * Implements the core business rule:
 *   IF insurance is active AND CID is verified on Stellar AND doctor approved
 *   THEN release payment to hospital wallet
 *   ELSE reject transaction
 *
 * Uses the Soroban JSON-RPC API (simulateTransaction / sendTransaction).
 */
class SorobanService
{
    private string $rpcUrl;
    private string $insuranceContractId;
    private string $paymentContractId;
    private string $hospitalPublicKey;
    private string $hospitalSecretKey;
    private string $network;

    public function __construct()
    {
        $this->rpcUrl              = config('stellar.soroban_rpc_url');
        $this->insuranceContractId = config('stellar.insurance_contract_id', '');
        $this->paymentContractId   = config('stellar.payment_contract_id', '');
        $this->hospitalPublicKey   = config('stellar.hospital_public_key', '');
        $this->hospitalSecretKey   = config('stellar.hospital_secret_key', '');
        $this->network             = config('stellar.network', 'testnet');
    }

    /**
     * Validate insurance status via Soroban smart contract.
     *
     * @param  string  $patientId
     * @param  string  $insuranceNumber
     * @return bool
     */
    public function validateInsurance(string $patientId, string $insuranceNumber): bool
    {
        $result = $this->invokeContract(
            $this->insuranceContractId,
            'validate_insurance',
            [
                ['type' => 'string', 'value' => $patientId],
                ['type' => 'string', 'value' => $insuranceNumber],
            ]
        );

        $isValid = $result['success'] && ($result['result'] ?? false) === true;

        Log::info('SorobanService: insurance validation', [
            'patient_id'       => $patientId,
            'insurance_number' => $insuranceNumber,
            'valid'            => $isValid,
        ]);

        return $isValid;
    }

    /**
     * Verify a CID on-chain via the insurance/verification contract.
     *
     * @param  string  $cid
     * @param  string  $stellarTxHash  The Stellar tx that anchored the CID
     * @return bool
     */
    public function verifyCidOnChain(string $cid, string $stellarTxHash): bool
    {
        $result = $this->invokeContract(
            $this->insuranceContractId,
            'verify_cid',
            [
                ['type' => 'string', 'value' => $cid],
                ['type' => 'string', 'value' => $stellarTxHash],
            ]
        );

        return $result['success'] && ($result['result'] ?? false) === true;
    }

    /**
     * Execute the full insurance + payment release logic.
     *
     * Business rule:
     *   IF insurance_active AND cid_verified AND doctor_approved
     *   THEN release payment → return tx_hash
     *   ELSE throw RuntimeException
     *
     * @param  array  $params {
     *   patient_id, insurance_number, cid, stellar_tx_hash,
     *   doctor_approved, amount, destination_wallet
     * }
     * @return string  Payment transaction hash
     */
    public function releasePayment(array $params): string
    {
        $this->assertContractsConfigured();

        // Step 1: Validate insurance
        $insuranceValid = $this->validateInsurance(
            $params['patient_id'],
            $params['insurance_number']
        );

        if (! $insuranceValid) {
            throw new RuntimeException('Smart contract rejected: insurance is not active.');
        }

        // Step 2: Verify CID on-chain
        $cidVerified = $this->verifyCidOnChain(
            $params['cid'],
            $params['stellar_tx_hash']
        );

        if (! $cidVerified) {
            throw new RuntimeException('Smart contract rejected: CID not verified on Stellar.');
        }

        // Step 3: Check doctor approval
        if (empty($params['doctor_approved'])) {
            throw new RuntimeException('Smart contract rejected: doctor approval not confirmed.');
        }

        // Step 4: Invoke payment release contract
        $result = $this->invokeContract(
            $this->paymentContractId,
            'release_payment',
            [
                ['type' => 'string', 'value' => $params['patient_id']],
                ['type' => 'string', 'value' => $params['cid']],
                ['type' => 'string', 'value' => $params['destination_wallet']],
                ['type' => 'i128',   'value' => (string) $params['amount']],
            ]
        );

        if (! $result['success']) {
            throw new RuntimeException('Payment release contract failed: ' . ($result['error'] ?? 'unknown'));
        }

        $txHash = $result['tx_hash'] ?? ('stub_payment_' . hash('sha256', json_encode($params)));

        Log::info('SorobanService: payment released', [
            'patient_id' => $params['patient_id'],
            'cid'        => $params['cid'],
            'amount'     => $params['amount'],
            'tx_hash'    => $txHash,
        ]);

        return $txHash;
    }

    // ─── Private Helpers ────────────────────────────────────────────────────

    /**
     * Invoke a Soroban contract function via JSON-RPC.
     *
     * In production this builds a Soroban XDR transaction, simulates it,
     * then sends it. Here we delegate to a signing microservice or stub.
     *
     * @param  string  $contractId
     * @param  string  $functionName
     * @param  array   $args  Array of {type, value} objects
     * @return array{success: bool, result: mixed, tx_hash: string|null, error: string|null}
     */
    private function invokeContract(string $contractId, string $functionName, array $args): array
    {
        $signerUrl = env('STELLAR_SIGNER_URL');

        if ($signerUrl) {
            $response = Http::timeout(20)->post("{$signerUrl}/invoke-contract", [
                'contract_id'   => $contractId,
                'function_name' => $functionName,
                'args'          => $args,
                'source'        => $this->hospitalPublicKey,
                'secret'        => $this->hospitalSecretKey,
                'network'       => $this->network,
                'rpc_url'       => $this->rpcUrl,
            ]);

            if ($response->successful()) {
                return $response->json();
            }

            Log::error('SorobanService: contract invocation failed', [
                'contract'  => $contractId,
                'function'  => $functionName,
                'status'    => $response->status(),
                'body'      => $response->body(),
            ]);

            return ['success' => false, 'error' => $response->body()];
        }

        // Development stub — simulates a successful contract call
        Log::warning('SorobanService: STELLAR_SIGNER_URL not set, returning stub result', [
            'contract' => $contractId,
            'function' => $functionName,
        ]);

        return [
            'success' => true,
            'result'  => true,
            'tx_hash' => 'stub_soroban_' . hash('sha256', $contractId . $functionName . microtime()),
        ];
    }

    private function assertContractsConfigured(): void
    {
        if (empty($this->insuranceContractId) || empty($this->paymentContractId)) {
            throw new RuntimeException(
                'Soroban contract IDs not configured. Set STELLAR_INSURANCE_CONTRACT_ID and STELLAR_PAYMENT_CONTRACT_ID in .env'
            );
        }
    }
}
