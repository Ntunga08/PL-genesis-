<?php

namespace Database\Factories;

use App\Models\Patient;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class MedicalRecordFactory extends Factory
{
    protected $model = \App\Models\MedicalRecord::class;

    public function definition(): array
    {
        return [
            'patient_id'         => Patient::factory(),
            'doctor_id'          => User::factory(),
            'cid_hash'           => 'Qm' . fake()->regexify('[A-Za-z0-9]{44}'),
            'stellar_tx_hash'    => fake()->regexify('[a-f0-9]{64}'),
            'record_type'        => fake()->randomElement(['general', 'pdf', 'json']),
            'encryption_key_ref' => base64_encode(fake()->sha256()),
            'status'             => 'stored',
            'insurance_validated'=> false,
            'doctor_approved'    => false,
            'payment_released'   => false,
        ];
    }
}
