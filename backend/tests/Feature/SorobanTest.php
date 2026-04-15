<?php

namespace Tests\Feature;

use App\Models\MedicalRecord;
use App\Models\Patient;
use App\Services\SorobanService;
use App\Services\StellarService;
use Tests\TestCase;

class SorobanTest extends TestCase
{
    private function mockSoroban(bool $insuranceValid = true, bool $cidVerified = true): void
    {
        $this->mock(SorobanService::class, function ($mock) use ($insuranceValid, $cidVerified) {
            $mock->shouldReceive('validateInsurance')
                ->andReturn($insuranceValid);

            $mock->shouldReceive('verifyCidOnChain')
                ->andReturn($cidVerified);

            $mock->shouldReceive('releasePayment')
                ->andReturn('soroban_payment_tx_abc123');
        });

        $this->mock(StellarService::class, function ($mock) {
            $mock->shouldReceive('storeCidHash')->andReturn('stellar_tx_123');
            $mock->shouldReceive('verifyCid')->andReturn(true);
            $mock->shouldReceive('sendPayment')->andReturn('stellar_pay_tx_456');
        });
    }

    public function test_insurance_check_returns_valid(): void
    {
        $this->mockSoroban(insuranceValid: true);
        [, , $headers] = $this->actingAsUser();
        $patient = Patient::factory()->create();

        $res = $this->postJson('/api/contract/insurance-check', [
            'patient_id'       => $patient->id,
            'insurance_number' => 'INS-12345',
        ], $headers);

        $res->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('insurance_valid', true);
    }

    public function test_insurance_check_returns_invalid(): void
    {
        $this->mockSoroban(insuranceValid: false);
        [, , $headers] = $this->actingAsUser();
        $patient = Patient::factory()->create();

        $res = $this->postJson('/api/contract/insurance-check', [
            'patient_id'       => $patient->id,
            'insurance_number' => 'INVALID-INS',
        ], $headers);

        $res->assertOk()->assertJsonPath('insurance_valid', false);
    }

    public function test_payment_release_succeeds_when_all_conditions_met(): void
    {
        $this->mockSoroban(insuranceValid: true, cidVerified: true);
        [, , $headers] = $this->actingAsUser();
        $patient = Patient::factory()->create();
        $keyPair = \Soneso\StellarSDK\Crypto\KeyPair::random();

        MedicalRecord::factory()->create([
            'patient_id'      => $patient->id,
            'cid_hash'        => 'QmPaymentCID',
            'stellar_tx_hash' => 'stellar_tx_123',
            'status'          => 'stored',
        ]);

        $res = $this->postJson('/api/contract/release-payment', [
            'cid'                => 'QmPaymentCID',
            'patient_id'         => $patient->id,
            'insurance_number'   => 'INS-VALID-001',
            'doctor_approved'    => true,
            'amount'             => '50.0',
            'destination_wallet' => $keyPair->getAccountId(),
        ], $headers);

        $res->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['payment_tx_hash']);

        $this->assertDatabaseHas('medical_records', [
            'cid_hash'         => 'QmPaymentCID',
            'payment_released' => 1,
        ]);
    }

    public function test_payment_release_fails_without_doctor_approval(): void
    {
        // doctor_approved=false is rejected by MedicalRecordService BEFORE
        // calling Soroban — so the mock doesn't matter here
        $this->mockSoroban(insuranceValid: true, cidVerified: true);
        [, , $headers] = $this->actingAsUser();
        $patient = Patient::factory()->create();
        $keyPair = \Soneso\StellarSDK\Crypto\KeyPair::random();

        MedicalRecord::factory()->create([
            'patient_id' => $patient->id,
            'cid_hash'   => 'QmNoDoctorCID',
        ]);

        $res = $this->postJson('/api/contract/release-payment', [
            'cid'                => 'QmNoDoctorCID',
            'patient_id'         => $patient->id,
            'insurance_number'   => 'INS-001',
            'doctor_approved'    => false,
            'amount'             => '50.0',
            'destination_wallet' => $keyPair->getAccountId(),
        ], $headers);

        // The service rejects before calling Soroban — returns 422
        $res->assertStatus(422)
            ->assertJsonPath('success', false);
        $this->assertStringContainsString('doctor', strtolower($res->json('error')));
    }

    public function test_payment_release_fails_for_unknown_cid(): void
    {
        $this->mockSoroban();
        [, , $headers] = $this->actingAsUser();
        $patient = Patient::factory()->create();
        $keyPair = \Soneso\StellarSDK\Crypto\KeyPair::random();

        $this->postJson('/api/contract/release-payment', [
            'cid'                => 'QmNonExistentCID',
            'patient_id'         => $patient->id,
            'insurance_number'   => 'INS-001',
            'doctor_approved'    => true,
            'amount'             => '50.0',
            'destination_wallet' => $keyPair->getAccountId(),
        ], $headers)->assertStatus(422);
    }
}

