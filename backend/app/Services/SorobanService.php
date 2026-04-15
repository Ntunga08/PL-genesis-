<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use RuntimeException;
use Soneso\StellarSDK\InvokeContractHostFunction;
use Soneso\StellarSDK\InvokeHostFunctionOperationBuilder;
use Soneso\StellarSDK\Crypto\KeyPair;
use Soneso\StellarSDK\Network;
use Soneso\StellarSDK\Soroban\Responses\GetTransactionResponse;
use Soneso\StellarSDK\Soroban\Responses\SendTransactionResponse;
use Soneso\StellarSDK\Soroban\SorobanServer;
use Soneso\StellarSDK\StellarSDK;
use Soneso\StellarSDK\TransactionBuilder;
use Soneso\StellarSDK\Xdr\XdrInt128Parts;
use Soneso\StellarSDK\Xdr\XdrSCVal;

/**
 * SorobanService
 *
 * Uses soneso/stellar-php-sdk to interact with Soroban smart contracts via:
 *   1. simulateTransaction  — get footprint + resource fee
 *   2. sendTransaction      — submit signed XDR to the network
 *   3. getTransaction       — poll until SUCCESS or FAILED
 *
 * Business rule enforced:
 *   IF insurance_active AND cid_verified AND doctor_approved
 *   THEN release payment → return tx_hash
 *   ELSE throw RuntimeException
 */
class SorobanService
{
    private SorobanServer $soroban;
    private StellarSDK    $sdk;
    private Network       $network;
    private string        $hospitalPublicKey;
    private string        $hospitalSecretKey;
    private string        $insuranceContractId;
    private string        $paymentContractId;

    /** Max ledgers to wait for transaction confirmation */
    private const POLL_MAX_ATTEMPTS = 10;
    private const POLL_SLEEP_SECONDS = 3;

    public function __construct()
    {
        $rpcUrl                    = config('stellar.soroban_rpc_url');
        $horizonUrl                = config('stellar.horizon_url');
        $this->hospitalPublicKey   = config('stellar.hospital_public_key', '');
        $this->hospitalSecretKey   = config('stellar.hospital_secret_key', '');
        $this->insuranceContractId = config('stellar.insurance_contract_id', '');
        $this->paymentContractId   = config('stellar.payment_contract_id', '');

        $networkName   = config('stellar.network', 'testnet');
        $this->network = $networkName === 'mainnet' ? Network::public() : Network::testnet();

        $this->soroban = new SorobanServer($rpcUrl);
        $this->soroban->acknowledgeExperimental = true;

        $this->sdk = new StellarSDK($horizonUrl);
    }

    /**
     * Validate insurance status via Soroban smart contract.
     * Calls: validate_insurance(patient_id: String, insurance_number: String) → Bool
     *
     * @param  string  $patientId
     * @param  string  $insuranceNumber
     * @return bool
     */
    public function validateInsurance(string $patientId, string $insuranceNumber): bool
    {
        $this->assertContractsConfigured();

        $result = $this->invokeContractFunction(
            $this->insuranceContractId,
            'validate_insurance',
            [
                XdrSCVal::forString($patientId),
                XdrSCVal::forString($insuranceNumber),
            ]
        );

        // Contract returns SCV_BOOL true if insurance is active
        $isValid = $result?->b === true;

        Log::info('SorobanService: insurance validation', [
            'patient_id'       => $patientId,
            'insurance_number' => $insuranceNumber,
            'valid'            => $isValid,
        ]);

        return $isValid;
    }

    /**
     * Verify a CID on-chain via the smart contract.
     * Calls: verify_cid(cid: String, stellar_tx_hash: String) → Bool
     *
     * @param  string  $cid
     * @param  string  $stellarTxHash
     * @return bool
     */
    public function verifyCidOnChain(string $cid, string $stellarTxHash): bool
    {
        $this->assertContractsConfigured();

        $result = $this->invokeContractFunction(
            $this->insuranceContractId,
            'verify_cid',
            [
                XdrSCVal::forString($cid),
                XdrSCVal::forString($stellarTxHash),
            ]
        );

        return $result?->b === true;
    }

    /**
     * Full insurance + payment release flow.
     *
     * Business rule:
     *   IF insurance_active AND cid_verified AND doctor_approved
     *   THEN release_payment → return tx_hash
     *   ELSE throw RuntimeException
     *
     * @param  array  $params {
     *   patient_id, insurance_number, cid, stellar_tx_hash,
     *   doctor_approved, amount (in stroops as int), destination_wallet
     * }
     * @return string  Payment transaction hash
     */
    public function releasePayment(array $params): string
    {
        $this->assertContractsConfigured();

        // Step 1: Validate insurance via contract
        if (! $this->validateInsurance($params['patient_id'], $params['insurance_number'])) {
            throw new RuntimeException('Smart contract rejected: insurance is not active.');
        }

        // Step 2: Verify CID on-chain
        if (! $this->verifyCidOnChain($params['cid'], $params['stellar_tx_hash'])) {
            throw new RuntimeException('Smart contract rejected: CID not verified on Stellar.');
        }

        // Step 3: Doctor approval check
        if (empty($params['doctor_approved'])) {
            throw new RuntimeException('Smart contract rejected: doctor approval not confirmed.');
        }

        // Step 4: Invoke release_payment contract
        // amount passed as i128 (stroops: 1 XLM = 10_000_000 stroops)
        $amountStroops = (int) round((float) $params['amount'] * 10_000_000);

        $txHash = $this->invokeContractFunctionAndGetHash(
            $this->paymentContractId,
            'release_payment',
            [
                XdrSCVal::forString($params['patient_id']),
                XdrSCVal::forString($params['cid']),
                XdrSCVal::forString($params['destination_wallet']),
                XdrSCVal::forI128Parts(0, $amountStroops),
            ]
        );

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
     * Invoke a contract function, simulate, sign, send, and poll for result.
     * Returns the XdrSCVal result from the contract.
     *
     * @param  string      $contractId
     * @param  string      $functionName
     * @param  XdrSCVal[]  $args
     * @return XdrSCVal|null
     */
    private function invokeContractFunction(
        string $contractId,
        string $functionName,
        array  $args
    ): ?XdrSCVal {
        $keyPair  = KeyPair::fromSeed($this->hospitalSecretKey);
        $account  = $this->sdk->requestAccount($this->hospitalPublicKey);

        $hostFunction = new InvokeContractHostFunction($contractId, $functionName, $args);
        $operation    = (new InvokeHostFunctionOperationBuilder($hostFunction))->build();

        $transaction = (new TransactionBuilder($account))
            ->addOperation($operation)
            ->build();

        // Simulate to get footprint + resource fee
        $simResponse = $this->soroban->simulateTransaction($transaction);

        if ($simResponse->resultError !== null) {
            throw new RuntimeException(
                "Soroban simulate failed [{$functionName}]: " . $simResponse->resultError
            );
        }

        // Apply soroban data and fee from simulation
        $transaction->setSorobanTransactionData($simResponse->transactionData);
        $transaction->addResourceFee($simResponse->minResourceFee ?? 0);

        // Sign and send
        $transaction->sign($keyPair, $this->network);
        $sendResponse = $this->soroban->sendTransaction($transaction);

        if ($sendResponse->status === SendTransactionResponse::STATUS_ERROR) {
            throw new RuntimeException(
                "Soroban send failed [{$functionName}]: " . ($sendResponse->errorResultXdr ?? 'unknown')
            );
        }

        // Poll for result
        $txHash = $sendResponse->hash;
        $result = $this->pollTransaction($txHash);

        return $result;
    }

    /**
     * Same as invokeContractFunction but returns the transaction hash instead of the result value.
     * Used for payment release where we care about the tx hash, not the return value.
     */
    private function invokeContractFunctionAndGetHash(
        string $contractId,
        string $functionName,
        array  $args
    ): string {
        $keyPair  = KeyPair::fromSeed($this->hospitalSecretKey);
        $account  = $this->sdk->requestAccount($this->hospitalPublicKey);

        $hostFunction = new InvokeContractHostFunction($contractId, $functionName, $args);
        $operation    = (new InvokeHostFunctionOperationBuilder($hostFunction))->build();

        $transaction = (new TransactionBuilder($account))
            ->addOperation($operation)
            ->build();

        $simResponse = $this->soroban->simulateTransaction($transaction);

        if ($simResponse->resultError !== null) {
            throw new RuntimeException(
                "Soroban simulate failed [{$functionName}]: " . $simResponse->resultError
            );
        }

        $transaction->setSorobanTransactionData($simResponse->transactionData);
        $transaction->addResourceFee($simResponse->minResourceFee ?? 0);
        $transaction->sign($keyPair, $this->network);

        $sendResponse = $this->soroban->sendTransaction($transaction);

        if ($sendResponse->status === SendTransactionResponse::STATUS_ERROR) {
            throw new RuntimeException(
                "Soroban send failed [{$functionName}]: " . ($sendResponse->errorResultXdr ?? 'unknown')
            );
        }

        $txHash = $sendResponse->hash;

        // Poll to confirm success
        $this->pollTransaction($txHash);

        return $txHash;
    }

    /**
     * Poll getTransaction until SUCCESS or FAILED (or timeout).
     * Returns the XdrSCVal result on success.
     */
    private function pollTransaction(string $txHash): ?XdrSCVal
    {
        for ($i = 0; $i < self::POLL_MAX_ATTEMPTS; $i++) {
            sleep(self::POLL_SLEEP_SECONDS);

            $response = $this->soroban->getTransaction($txHash);

            if ($response->status === GetTransactionResponse::STATUS_SUCCESS) {
                // Extract return value from result meta XDR
                return $this->extractResultValue($response);
            }

            if ($response->status === GetTransactionResponse::STATUS_FAILED) {
                throw new RuntimeException(
                    "Soroban transaction failed: {$txHash} — " . ($response->resultXdr ?? 'no detail')
                );
            }

            // STATUS_NOT_FOUND — still pending, keep polling
            Log::debug('SorobanService: polling transaction', ['hash' => $txHash, 'attempt' => $i + 1]);
        }

        throw new RuntimeException("Soroban transaction timed out after polling: {$txHash}");
    }

    /**
     * Extract the XdrSCVal return value from a successful GetTransactionResponse.
     */
    private function extractResultValue(GetTransactionResponse $response): ?XdrSCVal
    {
        if ($response->resultMetaXdr === null) {
            return null;
        }

        try {
            $meta = \Soneso\StellarSDK\Xdr\XdrTransactionMeta::fromBase64Xdr($response->resultMetaXdr);
            $sorobanMeta = $meta->v3?->sorobanMeta;
            return $sorobanMeta?->returnValue ?? null;
        } catch (\Throwable $e) {
            Log::warning('SorobanService: could not extract result value', ['error' => $e->getMessage()]);
            return null;
        }
    }

    private function assertContractsConfigured(): void
    {
        if (empty($this->hospitalPublicKey) || empty($this->hospitalSecretKey)) {
            throw new RuntimeException(
                'Stellar keys not configured. Set STELLAR_HOSPITAL_PUBLIC_KEY and STELLAR_HOSPITAL_SECRET_KEY in .env'
            );
        }

        if (empty($this->insuranceContractId) || empty($this->paymentContractId)) {
            throw new RuntimeException(
                'Soroban contract IDs not configured. Set STELLAR_INSURANCE_CONTRACT_ID and STELLAR_PAYMENT_CONTRACT_ID in .env'
            );
        }
    }
}

