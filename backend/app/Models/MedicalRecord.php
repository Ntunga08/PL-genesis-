<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class MedicalRecord extends Model
{
    use HasUuids;

    protected $fillable = [
        'patient_id',
        'doctor_id',
        'cid_hash',
        'stellar_tx_hash',
        'record_type',
        'encryption_key_ref',
        'status',
        'insurance_validated',
        'doctor_approved',
        'payment_released',
        'payment_tx_hash',
    ];

    protected $casts = [
        'insurance_validated' => 'boolean',
        'doctor_approved'     => 'boolean',
        'payment_released'    => 'boolean',
    ];

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function doctor()
    {
        return $this->belongsTo(User::class, 'doctor_id');
    }
}
