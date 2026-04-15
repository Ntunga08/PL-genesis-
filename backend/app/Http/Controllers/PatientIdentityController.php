<?php

namespace App\Http\Controllers;

use App\Models\Patient;
use App\Services\PatientIdentityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class PatientIdentityController extends Controller
{
    public function __construct(private readonly PatientIdentityService $service) {}

    // ─── Identity ─────────────────────────────────────────────────────────────

    /**
     * POST /api/patients/{id}/identity
     * Assign a Stellar identity to a patient.
     * generate_wallet=true → auto-create keypair
     * public_key=G...     → link their own wallet
     */
    public function assign(Request $request, string $patientId): JsonResponse
    {
        $patient = Patient::findOrFail($patientId);

        $request->validate([
            'generate_wallet' => 'nullable|boolean',
            'public_key'      => 'nullable|string',
        ]);

        try {
            $result = $this->service->assignIdentity($patient, $request->only(
                'generate_wallet', 'public_key'
            ));
            return response()->json(['success' => true, ...$result], 201);
        } catch (Throwable $e) {
            return response()->json(['success' => false, 'error' => $e->getMessage()], 422);
        }
    }

    /**
     * GET /api/patients/lookup/{identifier}
     * Look up a patient by Stellar public key (G...) or share code (HMS-XXXXXX).
     * Used by doctors when a patient shares their ID verbally or via QR.
     */
    public function lookup(string $identifier): JsonResponse
    {
        try {
            $patient = $this->service->findByIdentifier($identifier);
            return response()->json([
                'success' => true,
                'patient' => [
                    'id'                 => $patient->id,
                    'full_name'          => $patient->full_name,
                    'date_of_birth'      => $patient->date_of_birth,
                    'gender'             => $patient->gender,
                    'blood_group'        => $patient->blood_group,
                    'stellar_public_key' => $patient->stellar_public_key,
                    'share_code'         => $patient->share_code,
                ],
            ]);
        } catch (Throwable $e) {
            return response()->json(['success' => false, 'error' => $e->getMessage()], 404);
        }
    }

    // ─── Access Grants ────────────────────────────────────────────────────────

    /**
     * POST /api/patients/{id}/access-grants
     * Patient grants a doctor access to their records.
     * Returns an access_token + QR payload the patient shares with the doctor.
     */
    public function grantAccess(Request $request, string $patientId): JsonResponse
    {
        $patient = Patient::findOrFail($patientId);

        $request->validate([
            'doctor_id'      => 'required|uuid|exists:users,id',
            'access_level'   => 'nullable|in:view,full',
            'expires_hours'  => 'nullable|integer|min:1|max:8760', // max 1 year
            'purpose'        => 'nullable|string|max:255',
        ]);

        try {
            $result = $this->service->grantAccess($patient, $request->all());
            return response()->json(['success' => true, ...$result], 201);
        } catch (Throwable $e) {
            return response()->json(['success' => false, 'error' => $e->getMessage()], 422);
        }
    }

    /**
     * GET /api/patients/{id}/access-grants
     * List all active access grants for a patient.
     */
    public function listGrants(string $patientId): JsonResponse
    {
        $patient = Patient::findOrFail($patientId);

        return response()->json([
            'success' => true,
            'grants'  => $this->service->listGrants($patient),
        ]);
    }

    /**
     * DELETE /api/patients/{id}/access-grants/{grantId}
     * Revoke a specific access grant.
     */
    public function revokeGrant(string $patientId, string $grantId): JsonResponse
    {
        $patient = Patient::findOrFail($patientId);

        try {
            $this->service->revokeAccess($patient, $grantId);
            return response()->json(['success' => true, 'message' => 'Access revoked.']);
        } catch (Throwable $e) {
            return response()->json(['success' => false, 'error' => $e->getMessage()], 422);
        }
    }

    /**
     * DELETE /api/patients/{id}/access-grants
     * Revoke ALL active grants (emergency lockdown).
     */
    public function revokeAll(string $patientId): JsonResponse
    {
        $patient = Patient::findOrFail($patientId);
        $count   = $this->service->revokeAllAccess($patient);

        return response()->json([
            'success'        => true,
            'message'        => "All access revoked.",
            'grants_revoked' => $count,
        ]);
    }

    // ─── Doctor: Access Shared Records ───────────────────────────────────────

    /**
     * POST /api/shared-records/access
     * Doctor submits the access token the patient shared with them.
     * Returns patient summary + record metadata (CIDs, Stellar tx hashes).
     * Public endpoint — token IS the authentication.
     */
    public function accessShared(Request $request): JsonResponse
    {
        $request->validate([
            'access_token' => 'required|string',
            'doctor_id'    => 'required|uuid|exists:users,id',
        ]);

        try {
            $doctor = \App\Models\User::findOrFail($request->input('doctor_id'));
            $result = $this->service->accessSharedRecords(
                $request->input('access_token'),
                $doctor
            );
            return response()->json(['success' => true, ...$result]);
        } catch (Throwable $e) {
            return response()->json(['success' => false, 'error' => $e->getMessage()], 403);
        }
    }
}
