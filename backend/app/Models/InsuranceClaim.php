<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class InsuranceClaim extends Model
{
    use HasUuids;

    protected $fillable = [
        'claim_number', 'patient_id', 'insurance_company_id', 'invoice_id',
        'claim_amount', 'approved_amount', 'status', 'submission_date',
        'approval_date', 'payment_date', 'notes', 'icd10_code', 'icd10_description'
    ];

    protected $casts = [
        'claim_amount' => 'decimal:2',
        'approved_amount' => 'decimal:2',
        'submission_date' => 'date',
        'approval_date' => 'date',
        'payment_date' => 'date',
    ];

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function insuranceCompany()
    {
        return $this->belongsTo(InsuranceCompany::class);
    }

    public function invoice()
    {
        return $this->belongsTo(Invoice::class);
    }
}
