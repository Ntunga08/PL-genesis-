<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class PatientVisit extends Model
{
    use HasUuids;

    // Uses patient_visits table by default (Laravel convention)

    protected $fillable = [
        'patient_id', 'doctor_id', 'appointment_id', 'visit_date',
        'chief_complaint', 'provisional_diagnosis', 'treatment_plan', 
        'vital_signs', 'notes', 'status',
        // Comprehensive medical history fields
        'chief_complaint_detailed', 'history_present_illness', 'review_of_systems',
        'past_medical_history', 'family_social_history', 'obstetric_history',
        'developmental_milestones', 'investigation_plan', 'final_diagnosis',
        'treatment_rx', 'other_management', 'provisional_diagnosis_completed',
        // Workflow fields
        'current_stage', 'overall_status',
        'reception_status', 'reception_completed_at',
        'nurse_status', 'nurse_completed_at', 'nurse_notes',
        'doctor_status', 'doctor_completed_at', 'doctor_notes', 'doctor_diagnosis', 
        'doctor_started_at', 'doctor_consultation_saved_at',
        'lab_status', 'lab_completed_at', 'lab_results_reviewed', 'lab_results_reviewed_at',
        'pharmacy_status', 'pharmacy_completed_at',
        'billing_status', 'billing_completed_at'
    ];

    protected $casts = [
        'visit_date' => 'datetime',
        'vital_signs' => 'array',
        'reception_completed_at' => 'datetime',
        'nurse_completed_at' => 'datetime',
        'doctor_completed_at' => 'datetime',
        'doctor_started_at' => 'datetime',
        'doctor_consultation_saved_at' => 'datetime',
        'lab_completed_at' => 'datetime',
        'lab_results_reviewed' => 'boolean',
        'lab_results_reviewed_at' => 'datetime',
        'pharmacy_completed_at' => 'datetime',
        'billing_completed_at' => 'datetime',
        'provisional_diagnosis_completed' => 'boolean',
    ];

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function doctor()
    {
        return $this->belongsTo(User::class, 'doctor_id');
    }

    public function appointment()
    {
        return $this->belongsTo(Appointment::class);
    }

    public function prescriptions()
    {
        return $this->hasMany(Prescription::class, 'visit_id');
    }

    public function labTests()
    {
        return $this->hasMany(LabTest::class, 'visit_id');
    }
}
