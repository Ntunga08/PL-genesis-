<?php

namespace App\Http\Controllers;

use App\Services\MedicalRecordService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class MedicalRecordController extends Controller
{
    public function __construct(private readonly MedicalRecordService $service) {}

    /**
     * POST /api/records/create
     * Create a medical record from structured JSON payload.
     */
    public function create(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'patient_id'  => 'required|uuid|exists:patients,id',
            'doctor_id'   => 'required|uuid|exists:users,id',
            'record_type' => 'nullable|string|max:50',
            'payload'     => 'required|array',
        ]);

        try {
            $record = $this->service->createRecord($validated);
            return response()->json(['success' => true, 'record' => $record], 201);
        } catch (Throwable $e) {
            return response()->json(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /api/records/{patient_id}
     * Get all medical record metadata for a patient.
     */
    public function getByPatient(string $patientId): JsonResponse
    {
        try {
            $records = $this->service->getPatientRecords($patientId);
            return response()->json(['success' => true, 'records' => $records]);
        } catch (Throwable $e) {
            return response()->json(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /api/records/upload-ipfs
     * Upload a file (PDF, image, etc.) as an encrypted medical record.
     */
    public function uploadFile(Request $request): JsonResponse
    {
        $request->validate([
            'patient_id'  => 'required|uuid|exists:patients,id',
            'doctor_id'   => 'required|uuid|exists:users,id',
            'record_type' => 'nullable|string|max:50',
            'file'        => 'required|file|max:20480', // 20MB max
        ]);

        try {
            $record = $this->service->createRecordFromFile(
                $request->only('patient_id', 'doctor_id', 'record_type'),
                $request->file('file')
            );
            return response()->json(['success' => true, 'record' => $record], 201);
        } catch (Throwable $e) {
            return response()->json(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }
}
