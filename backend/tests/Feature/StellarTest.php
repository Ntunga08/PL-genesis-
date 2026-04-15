<?php

namespace Tests\Feature;

use App\Models\MedicalRecord;
use App\Models\Patient;
use App\Services\StellarService;
use Tests\TestCase;

class StellarTest extends TestCase
{
    private function mockStellar(): void
    {
        $this->mock(StellarService::class, function ($mock) {
            $mock->shouldReceive('storeCidHash')
                ->andReturn('mock_stellar_tx_abc123');

            $mock->shouldReceive('verifyCid')
                ->with('QmVerifiedCID')
                ->andReturn(true);

            $mock->shouldReceive('verifyCid')
                ->with('QmUnverifiedCID')
                ->andReturn(false);

            $mock->shouldReceive('sendPayment')
                ->andReturn('mock_payment_tx_xyz789');
        });
    }

    public function test_can_store_cid_hash_on_stellar(): void
    {
        $this->mockStellar();
        [, , $headers] = $this->actingAsUser();

        $res = $this->postJson('/api/stellar/store-hash', [
            'cid' => 'QmTestCID123',
        ], $headers);

        $res->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('tx_hash', 'mock_stellar_tx_abc123');
    }

    public function test_can_verify_cid_on_stellar(): void
    {
        $this->mockStellar();
        [, , $headers] = $this->actingAsUser();
        $patient = Patient::factory()->create();

        MedicalRecord::factory()->create([
            'patient_id'      => $patient->id,
            'cid_hash'        => 'QmVerifiedCID',
            'stellar_tx_hash' => 'mock_stellar_tx_abc123',
        ]);

        $res = $this->getJson('/api/stellar/verify/QmVerifiedCID', $headers);

        $res->assertOk()
            ->assertJsonPath('verified', true)
            ->assertJsonPath('status', 'verified');
    }

    public function test_unverified_cid_returns_false(): void
    {
        $this->mockStellar();
        [, , $headers] = $this->actingAsUser();
        $patient = Patient::factory()->create();

        MedicalRecord::factory()->create([
            'patient_id' => $patient->id,
            'cid_hash'   => 'QmUnverifiedCID',
        ]);

        $res = $this->getJson('/api/stellar/verify/QmUnverifiedCID', $headers);

        $res->assertOk()->assertJsonPath('verified', false);
    }

    public function test_can_send_stellar_payment(): void
    {
        $this->mockStellar();
        [, , $headers] = $this->actingAsUser();

        $keyPair = \Soneso\StellarSDK\Crypto\KeyPair::random();

        $res = $this->postJson('/api/stellar/payment', [
            'destination' => $keyPair->getAccountId(),
            'amount'      => '10.5',
            'memo'        => 'Test payment',
        ], $headers);

        $res->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('tx_hash', 'mock_payment_tx_xyz789');
    }

    public function test_stellar_payment_requires_valid_amount(): void
    {
        [, , $headers] = $this->actingAsUser();

        $this->postJson('/api/stellar/payment', [
            'destination' => 'GSOME_KEY',
            'amount'      => '-5',
        ], $headers)->assertStatus(422);
    }
}

