<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Patient extends Model
{
    use HasUuids, HasFactory;

    protected $fillable = [
        'full_name', 'date_of_birth', 'gender', 'phone', 'email',
        'address', 'emergency_contact', 'emergency_phone', 'blood_group',
        'allergies', 'medical_history', 'insurance_provider',
        'insurance_number', 'insurance_company_id', 'status',
        'stellar_public_key', 'share_code', 'user_id',
    ];

    protected $casts = [
        'date_of_birth' => 'date',
    ];

    public function appointments()
    {
        return $this->hasMany(Appointment::class);
    }

    public function visits()
    {
        return $this->hasMany(PatientVisit::class);
    }

    public function prescriptions()
    {
        return $this->hasMany(Prescription::class);
    }

    public function invoices()
    {
        return $this->hasMany(Invoice::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    public function insuranceCompany()
    {
        return $this->belongsTo(InsuranceCompany::class);
    }

    public function medicalRecords()
    {
        return $this->hasMany(MedicalRecord::class);
    }

    public function accessGrants()
    {
        return $this->hasMany(MedicalRecordAccessGrant::class);
    }

    public function userAccount()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
