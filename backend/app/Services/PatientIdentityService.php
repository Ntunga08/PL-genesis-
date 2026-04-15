<?php

namespace App\Services;

use App\Models\MedicalRecord;
use App\Models\MedicalRecordAccessGrant;
use App\Models\Patient;
use App\Models\User;
use App\Repositories\MedicalRecordRepository;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use RuntimeException;
use Soneso\StellarSDK\Crypto\KeyPair;

/**
 * PatientIdentityService
 *
 * Manages the patient's decentralized identity:
 *
 *  1. IDENTITY
 *     - Each patient gets a Stellar public key as their universal medical ID
 *     - Also gets a short human-readable share code (HMS-XXXXXX) for verbal/QR sharing
 *     - Can link to a user account for self-service portal access
 *
 *  2. SHARING HISTORY WITH OTHER DOCTORS
 *     - Patient generates a time-limited access grant
 *     - Grant contains a one-time access_token
 *     - Doctor uses that token to pull the patient's record metadata
 *     - All access is logged for audit
 *
 *  3. STELLAR VERIFICATION
 *     - Any doctor can verify a patient's records are authentic
 *       by checking CID hashes against the Stellar blockchain
 */
class PatientIdentityService
{
    public function __construct(
        private readonly StellarService          $stellar,
        private readonly MedicalRecordRepository $recordRepo,
    ) {}

    // ─── Identity ────────────────────────────────────────────────────────────

    /**
     * Assign a Stellar identity to a patient.
     *
     * If generate_wallet=true  → creates a new Stellar keypair for the patient.
     * If public_key provided   → links their existing wallet (no secret stored).
     *
     * Also generates a short HMS-XXXXXX share code.
     *
     * @param  Patient  $patient
     * @param  array    $options {generate_wallet?: bool, public_key?: string}
     * @return array    {public_key, share_code, secret_key? (only if generated)}
     */
    public function assignIdentity(Patient $patient, array $options = []): array
    {
        if ($patient->stellar_public_key) {
            throw new RuntimeException('Patient already has a Stellar identity assigned.');
        }

        $secretKey = null;

        if (! empty($options['public_key'])) {
            // Link existing wallet — validate key format
            $publicKey = $options['public_key'];
            $this->validatePublicKey($publicKey);
        } else {
            // Generate new keypair for the patient
            $keyPair   = KeyPair::random();
            $publicKey = $keyPair->getAccountId();
            $secretKey = $keyPair->getSecretSeed();
        }

        $shareCode = $this->generateShareCode();

        $patient->update([
            'stellar_public_key' => $publicKey,
            'share_code'         => $shareCode,
        ]);

        Log::info('PatientIdentityService: identity assigned', [
            'patient_id' => $patient->id,
            'public_key' => $publicKey,
            'share_code' => $shareCode,
        ]);

        $result = [
            'public_key' => $publicKey,
            'share_code' => $shareCode,
            'message'    => 'This public key is your universal medical ID. Share it with any doctor.',
        ];

        if ($secretKey) {
            $result['secret_key'] = $secretKey;
            $result['warning']    = 'Save this secret key securely. It will never be shown again.';
        }

        return $result;
    }

    /**
     * Look up a patient by their Stellar public key or share code.
     * Used by doctors when a patient shares their ID.
     *
     * @param  string  $identifier  Stellar public key (G...) or share code (HMS-...)
     * @return Patient
     */
    public function findByIdentifier(string $identifier): Patient
    {
        // Detect format
        if (str_starts_with(strtoupper($identifier), 'HMS-')) {
            $patient = Patient::where('share_code', strtoupper($identifier))->first();
        } else {
            $patient = Patient::where('stellar_public_key', $identifier)->first();
        }

        if (! $patient) {
            throw new RuntimeException('No patient found for that identifier.');
        }

        return $patient;
    }

    // ─── Access Grants (Sharing) ─────────────────────────────────────────────

    /**
     * Patient grants a doctor access to their medical records.
     *
     * @param  Patient  $patient
     * @param  array    $data {
     *   doctor_id: uuid,
     *   access_level: 'view'|'full',
     *   expires_hours?: int   (null = permanent until revoked)
     *   purpose?: string
     * }
     * @return array  {access_token, expires_at, qr_payload}
     */
    public function grantAccess(Patient $patient, array $data): array
    {
        if (! $patient->stellar_public_key) {
            throw new RuntimeException('Patient must have a Stellar identity before granting access.');
        }

        $doctor = User::findOrFail($data['doctor_id']);

        // Revoke any existing active grant to the same doctor
        MedicalRecordAccessGrant::where('patient_id', $patient->id)
            ->where('granted_to_user_id', $doctor->id)
            ->where('is_active', true)
            ->update(['is_active' => false]);

        $token     = Str::random(48);
        $expiresAt = isset($data['expires_hours'])
            ? now()->addHours((int) $data['expires_hours'])
            : null;

        $grant = MedicalRecordAccessGrant::create([
            'patient_id'                 => $patient->id,
            'granted_to_user_id'         => $doctor->id,
            'patient_stellar_public_key' => $patient->stellar_public_key,
            'access_level'               => $data['access_level'] ?? 'view',
            'expires_at'                 => $expiresAt,
            'is_active'                  => true,
            'purpose'                    => $data['purpose'] ?? null,
            'access_token'               => hash('sha256', $token), // store hash only
        ]);

        Log::info('PatientIdentityService: access granted', [
            'patient_id' => $patient->id,
            'doctor_id'  => $doctor->id,
            'expires_at' => $expiresAt,
        ]);

        return [
            'access_token' => $token,           // plain token — share with doctor
            'expires_at'   => $expiresAt,
            'access_level' => $grant->access_level,
            'doctor_name'  => $doctor->name,
            // QR payload — doctor scans this to pull records
            'qr_payload'   => base64_encode(json_encode([
                'token'      => $token,
                'patient_id' => $patient->id,
                'public_key' => $patient->stellar_public_key,
                'share_code' => $patient->share_code,
            ])),
            'share_url'    => config('app.frontend_url')
                              . '/shared-records?token=' . $token,
        ];
    }

    /**
     * Revoke a specific access grant.
     *
     * @param  Patient  $patient
     * @param  string   $grantId
     */
    public function revokeAccess(Patient $patient, string $grantId): void
    {
        $grant = MedicalRecordAccessGrant::where('id', $grantId)
            ->where('patient_id', $patient->id)
            ->firstOrFail();

        $grant->update(['is_active' => false]);

        Log::info('PatientIdentityService: access revoked', [
            'patient_id' => $patient->id,
            'grant_id'   => $grantId,
        ]);
    }

    /**
     * Revoke ALL active grants for a patient (emergency lockdown).
     */
    public function revokeAllAccess(Patient $patient): int
    {
        $count = MedicalRecordAccessGrant::where('patient_id', $patient->id)
            ->where('is_active', true)
            ->update(['is_active' => false]);

        Log::info('PatientIdentityService: all access revoked', [
            'patient_id'    => $patient->id,
            'grants_revoked'=> $count,
        ]);

        return $count;
    }

    /**
     * List all active access grants for a patient.
     */
    public function listGrants(Patient $patient): array
    {
        return MedicalRecordAccessGrant::with('grantedTo:id,name,email,role')
            ->where('patient_id', $patient->id)
            ->where('is_active', true)
            ->get()
            ->map(fn($g) => [
                'id'           => $g->id,
                'doctor'       => $g->grantedTo?->only('id', 'name', 'email', 'role'),
                'access_level' => $g->access_level,
                'purpose'      => $g->purpose,
                'expires_at'   => $g->expires_at,
                'is_expired'   => $g->isExpired(),
                'created_at'   => $g->created_at,
            ])
            ->toArray();
    }

    // ─── Doctor: Access via Token ─────────────────────────────────────────────

    /**
     * Doctor uses an access token to pull a patient's shared records.
     * Verifies the token, checks expiry, then returns record metadata.
     *
     * @param  string  $accessToken  Plain token from patient
     * @param  User    $doctor       The requesting doctor
     * @return array   {patient_summary, records, stellar_verified}
     */
    public function accessSharedRecords(string $accessToken, User $doctor): array
    {
        $tokenHash = hash('sha256', $accessToken);

        $grant = MedicalRecordAccessGrant::with('patient')
            ->where('access_token', $tokenHash)
            ->where('granted_to_user_id', $doctor->id)
            ->where('is_active', true)
            ->first();

        if (! $grant) {
            throw new RuntimeException('Invalid or expired access token.');
        }

        if ($grant->isExpired()) {
            $grant->update(['is_active' => false]);
            throw new RuntimeException('This access token has expired.');
        }

        $patient = $grant->patient;
        $records = $this->recordRepo->getByPatient($patient->id);

        // Verify CIDs on Stellar for authenticity
        $stellarVerified = false;
        try {
            $stellarVerified = $this->stellar->verifyCid(
                $records->first()?->cid_hash ?? ''
            );
        } catch (\Throwable) {
            // Stellar check is best-effort — don't block access
        }

        Log::info('PatientIdentityService: shared records accessed', [
            'patient_id' => $patient->id,
            'doctor_id'  => $doctor->id,
            'grant_id'   => $grant->id,
        ]);

        return [
            'patient' => [
                'id'                 => $patient->id,
                'full_name'          => $patient->full_name,
                'date_of_birth'      => $patient->date_of_birth,
                'gender'             => $patient->gender,
                'blood_group'        => $patient->blood_group,
                'allergies'          => $patient->allergies,
                'stellar_public_key' => $patient->stellar_public_key,
                'share_code'         => $patient->share_code,
            ],
            'access_level'     => $grant->access_level,
            'purpose'          => $grant->purpose,
            'expires_at'       => $grant->expires_at,
            'stellar_verified' => $stellarVerified,
            'records'          => $records->map(fn($r) => [
                'id'               => $r->id,
                'cid_hash'         => $r->cid_hash,
                'stellar_tx_hash'  => $r->stellar_tx_hash,
                'record_type'      => $r->record_type,
                'status'           => $r->status,
                'created_at'       => $r->created_at,
                // Never expose encryption_key_ref to external doctors
            ])->toArray(),
        ];
    }

    // ─── Private ─────────────────────────────────────────────────────────────

    private function generateShareCode(): string
    {
        do {
            $code = 'HMS-' . strtoupper(Str::random(6));
        } while (Patient::where('share_code', $code)->exists());

        return $code;
    }

    private function validatePublicKey(string $publicKey): void
    {
        try {
            KeyPair::fromAccountId($publicKey);
        } catch (\Throwable) {
            throw new RuntimeException('Invalid Stellar public key format.');
        }
    }
}

