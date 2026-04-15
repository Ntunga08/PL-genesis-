<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\Patient;
use App\Repositories\MedicalRecordRepository;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * MedicalRecordService
 *
 * Orchestrates the full medical record lifecycle:
 *   1. Encrypt data
 *   2. Upload to IPFS → get CID
 *   3. Store CID on Stellar blockchain
 *   4. Persist only (patient_id, doctor_id, cid_hash, stellar_tx_hash) in DB
 *   5. Trigger Soroban smart contract for insurance + payment automation
 */
class MedicalRecordService
{
    public function __construct(
        private readonly IpfsService             $ipfs,
        private readonly StellarService          $stellar,
        private readonly SorobanService          $soroban,
        private readonly MedicalRecordRepository $repo,
    ) {}

    /**
     * Create a medical record from structured data (JSON).
     *
     * @param  array  $data  {patient_id, doctor_id, record_type, payload}
     * @return array  Created record metadata
     */
    public function createRecord(array $data): array
    {
        // 1. Encrypt + upload to IPFS
        ['cid' => $cid, 'key_ref' => $keyRef] = $this->ipfs->encryptAndUpload($data['payload']);

        // 2. Store CID on Stellar
        $stellarTxHash = $this->stellar->storeCidHash($cid);

        // 3. Persist minimal metadata only
        $record = $this->repo->create([
            'patient_id'        => $data['patient_id'],
            'doctor_id'         => $data['doctor_id'],
            'cid_hash'          => $cid,
            'stellar_tx_hash'   => $stellarTxHash,
            'record_type'       => $data['record_type'] ?? 'general',
            'encryption_key_ref'=> $keyRef,
            'status'            => 'stored',
        ]);

        $this->logActivity('medical_record_created', $record->id, $data['patient_id']);

        return $record->toArray();
    }

    /**
     * Create a medical record from an uploaded file (PDF, image, etc.).
     *
     * @param  array         $meta  {patient_id, doctor_id, record_type}
     * @param  UploadedFile  $file
     * @return array
     */
    public function createRecordFromFile(array $meta, UploadedFile $file): array
    {
        $rawContent = file_get_contents($file->getRealPath());

        // 1. Encrypt + upload
        ['cid' => $cid, 'key_ref' => $keyRef] = $this->ipfs->encryptAndUpload($rawContent);

        // 2. Anchor CID on Stellar
        $stellarTxHash = $this->stellar->storeCidHash($cid);

        // 3. Persist metadata only
        $record = $this->repo->create([
            'patient_id'         => $meta['patient_id'],
            'doctor_id'          => $meta['doctor_id'],
            'cid_hash'           => $cid,
            'stellar_tx_hash'    => $stellarTxHash,
            'record_type'        => $meta['record_type'] ?? 'file',
            'encryption_key_ref' => $keyRef,
            'status'             => 'stored',
        ]);

        $this->logActivity('medical_record_file_uploaded', $record->id, $meta['patient_id']);

        return $record->toArray();
    }

    /**
     * Retrieve all records for a patient (metadata only — no raw data).
     */
    public function getPatientRecords(string $patientId): array
    {
        return $this->repo->getByPatient($patientId)->toArray();
    }

    /**
     * Verify a record's CID against the Stellar blockchain.
     */
    public function verifyRecord(string $cid): array
    {
        $record = $this->repo->findByCid($cid);

        if (! $record) {
            return ['verified' => false, 'reason' => 'Record not found in database.'];
        }

        $onChain = $this->stellar->verifyCid($cid);

        if ($onChain) {
            $this->repo->update($record->id, ['status' => 'verified']);
        }

        return [
            'verified'        => $onChain,
            'cid'             => $cid,
            'stellar_tx_hash' => $record->stellar_tx_hash,
            'status'          => $onChain ? 'verified' : 'unverified',
        ];
    }

    /**
     * Run the full Soroban insurance check + payment release flow.
     *
     * @param  array  $params {cid, patient_id, insurance_number, doctor_approved, amount, destination_wallet}
     * @return array
     */
    public function processInsurancePayment(array $params): array
    {
        $record = $this->repo->findByCid($params['cid']);

        if (! $record) {
            throw new RuntimeException('Medical record not found for CID: ' . $params['cid']);
        }

        $params['stellar_tx_hash'] = $record->stellar_tx_hash;

        // Guard: doctor approval is checked here so it's enforced even when Soroban is mocked
        if (empty($params['doctor_approved'])) {
            throw new RuntimeException('Smart contract rejected: doctor approval not confirmed.');
        }

        // Soroban smart contract handles all validation + payment release
        $paymentTxHash = $this->soroban->releasePayment($params);

        $this->repo->update($record->id, [
            'insurance_validated' => true,
            'doctor_approved'     => true,
            'payment_released'    => true,
            'payment_tx_hash'     => $paymentTxHash,
            'status'              => 'verified',
        ]);

        $this->logActivity('payment_released', $record->id, $record->patient_id);

        return [
            'success'          => true,
            'payment_tx_hash'  => $paymentTxHash,
            'cid'              => $params['cid'],
            'amount'           => $params['amount'],
        ];
    }

    // ─── Private ────────────────────────────────────────────────────────────

    private function logActivity(string $action, string $recordId, string $patientId): void
    {
        try {
            ActivityLog::create([
                'user_id'     => Auth::id(),
                'action'      => $action,
                'description' => "Medical record {$recordId} for patient {$patientId}",
                'ip_address'  => request()->ip(),
                'user_agent'  => request()->userAgent(),
            ]);
        } catch (\Throwable $e) {
            Log::warning('Failed to write activity log: ' . $e->getMessage());
        }
    }
}

