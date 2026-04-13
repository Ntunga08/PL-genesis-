<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use App\Models\Patient;
use App\Models\InsuranceCompany;
use App\Models\Invoice;
use App\Models\InsuranceClaim;
use App\Models\PatientVisit;

class InsuranceBillingSeeder extends Seeder
{
    public function run(): void
    {
        $companies = InsuranceCompany::all();
        if ($companies->isEmpty()) {
            $this->command->warn('No insurance companies found. Run InsuranceCompaniesSeeder first.');
            return;
        }

        $doctor = \App\Models\User::where('role', 'doctor')->first();
        if (!$doctor) {
            $this->command->warn('No doctor found. Skipping.');
            return;
        }

        $samplePatients = [
            ['full_name' => 'Grace Mwangi',    'phone' => '0712100001', 'gender' => 'Female', 'date_of_birth' => '1985-03-12', 'address' => 'Dar es Salaam', 'insurance_number' => 'NHIF-2024-001'],
            ['full_name' => 'Peter Omondi',    'phone' => '0712100002', 'gender' => 'Male',   'date_of_birth' => '1978-07-22', 'address' => 'Arusha',        'insurance_number' => 'AAR-2024-002'],
            ['full_name' => 'Fatuma Salim',    'phone' => '0712100003', 'gender' => 'Female', 'date_of_birth' => '1992-11-05', 'address' => 'Mwanza',        'insurance_number' => 'JUB-2024-003'],
            ['full_name' => 'David Kimani',    'phone' => '0712100004', 'gender' => 'Male',   'date_of_birth' => '1965-01-30', 'address' => 'Dodoma',        'insurance_number' => 'NHIF-2024-004'],
            ['full_name' => 'Amina Rashid',    'phone' => '0712100005', 'gender' => 'Female', 'date_of_birth' => '1990-09-18', 'address' => 'Zanzibar',      'insurance_number' => 'STR-2024-005'],
        ];

        $claimStatuses = ['Pending', 'Approved', 'Paid', 'Rejected'];
        $diagnoses = [
            ['dx' => 'Malaria',              'icd' => 'B54',   'amount' => 45000],
            ['dx' => 'Hypertension',         'icd' => 'I10',   'amount' => 35000],
            ['dx' => 'Type 2 Diabetes',      'icd' => 'E11',   'amount' => 60000],
            ['dx' => 'Upper Respiratory Infection', 'icd' => 'J06.9', 'amount' => 25000],
            ['dx' => 'Acute Gastroenteritis','icd' => 'A09',   'amount' => 30000],
        ];

        foreach ($samplePatients as $i => $pd) {
            $company = $companies[$i % $companies->count()];
            $diagData = $diagnoses[$i % count($diagnoses)];

            // Create or find patient
            $patient = Patient::firstOrCreate(
                ['phone' => $pd['phone']],
                array_merge($pd, [
                    'id' => Str::uuid(),
                    'insurance_company_id' => $company->id,
                    'status' => 'Active',
                ])
            );

            // Create visit
            $visit = PatientVisit::create([
                'id'                    => Str::uuid(),
                'patient_id'            => $patient->id,
                'doctor_id'             => $doctor->id,
                'visit_date'            => now()->subDays(rand(1, 30)),
                'visit_type'            => 'Consultation',
                'current_stage'         => 'billing',
                'overall_status'        => 'Active',
                'reception_status'      => 'Completed',
                'nurse_status'          => 'Completed',
                'doctor_status'         => 'Completed',
                'billing_status'        => 'Insurance',
                'doctor_diagnosis'      => $diagData['dx'],
                'icd10_code'            => $diagData['icd'],
                'icd10_description'     => $diagData['dx'],
                'doctor_completed_at'   => now()->subDays(rand(1, 30)),
            ]);

            // Create invoice — paid by insurance
            $date = now()->format('Ymd');
            $count = Invoice::whereDate('created_at', today())->count() + $i + 1;
            $invoiceNumber = 'INV-' . $date . '-' . str_pad($count, 4, '0', STR_PAD_LEFT);
            while (Invoice::where('invoice_number', $invoiceNumber)->exists()) {
                $count++;
                $invoiceNumber = 'INV-' . $date . '-' . str_pad($count, 4, '0', STR_PAD_LEFT);
            }

            $invoice = Invoice::create([
                'id'             => Str::uuid(),
                'invoice_number' => $invoiceNumber,
                'patient_id'     => $patient->id,
                'invoice_date'   => now()->subDays(rand(1, 30)),
                'total_amount'   => $diagData['amount'],
                'paid_amount'    => $diagData['amount'],
                'balance'        => 0,
                'status'         => 'Paid',
                'notes'          => "Insurance: {$company->name} | {$diagData['dx']} [{$diagData['icd']}] | No. {$pd['insurance_number']}",
            ]);

            // Create insurance claim
            $claimStatus = $claimStatuses[$i % count($claimStatuses)];
            $claimNumber = 'CLM-' . $date . '-' . str_pad($i + 1, 4, '0', STR_PAD_LEFT);
            while (InsuranceClaim::where('claim_number', $claimNumber)->exists()) {
                $claimNumber = 'CLM-' . $date . '-' . rand(1000, 9999);
            }

            InsuranceClaim::create([
                'id'                   => Str::uuid(),
                'claim_number'         => $claimNumber,
                'patient_id'           => $patient->id,
                'insurance_company_id' => $company->id,
                'invoice_id'           => $invoice->id,
                'claim_amount'         => $diagData['amount'],
                'approved_amount'      => in_array($claimStatus, ['Approved', 'Paid']) ? $diagData['amount'] : null,
                'status'               => $claimStatus,
                'submission_date'      => now()->subDays(rand(1, 25)),
                'approval_date'        => in_array($claimStatus, ['Approved', 'Paid']) ? now()->subDays(rand(1, 10)) : null,
                'payment_date'         => $claimStatus === 'Paid' ? now()->subDays(rand(1, 5)) : null,
                'icd10_code'           => $diagData['icd'],
                'icd10_description'    => $diagData['dx'],
                'notes'                => "Auto-seeded claim for {$patient->full_name}",
            ]);

            $this->command->info("✓ {$patient->full_name} — {$company->name} — {$diagData['dx']} [{$diagData['icd']}] — Claim: {$claimStatus}");
        }

        $this->command->info("\n✅ Insurance billing seeder complete. 5 patients with invoices and claims created.");
    }
}
