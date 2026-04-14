<?php

namespace App\Repositories;

use App\Models\MedicalRecord;
use Illuminate\Database\Eloquent\Collection;

/**
 * MedicalRecordRepository
 *
 * Data access layer for medical records.
 * Controllers and services should use this instead of querying the model directly.
 */
class MedicalRecordRepository
{
    public function create(array $data): MedicalRecord
    {
        return MedicalRecord::create($data);
    }

    public function findById(string $id): ?MedicalRecord
    {
        return MedicalRecord::with(['patient', 'doctor'])->find($id);
    }

    public function findByCid(string $cid): ?MedicalRecord
    {
        return MedicalRecord::where('cid_hash', $cid)->first();
    }

    public function getByPatient(string $patientId): Collection
    {
        return MedicalRecord::with(['doctor'])
            ->where('patient_id', $patientId)
            ->orderByDesc('created_at')
            ->get();
    }

    public function update(string $id, array $data): bool
    {
        return MedicalRecord::where('id', $id)->update($data) > 0;
    }

    public function updateByCid(string $cid, array $data): bool
    {
        return MedicalRecord::where('cid_hash', $cid)->update($data) > 0;
    }
}
