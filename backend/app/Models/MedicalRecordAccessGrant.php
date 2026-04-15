<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class MedicalRecordAccessGrant extends Model
{
    use HasUuids;

    protected $fillable = [
        'patient_id',
        'granted_to_user_id',
        'patient_stellar_public_key',
        'access_level',
        'expires_at',
        'is_active',
        'purpose',
        'access_token',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'is_active'  => 'boolean',
    ];

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function grantedTo()
    {
        return $this->belongsTo(User::class, 'granted_to_user_id');
    }

    public function isExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }

    public function isValid(): bool
    {
        return $this->is_active && ! $this->isExpired();
    }
}
