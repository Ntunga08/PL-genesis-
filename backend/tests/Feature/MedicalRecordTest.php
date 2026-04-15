<?php

namespace Tests\Feature;

use App\Models\MedicalRecord;
use App\Models\Patient;
use App\Services\IpfsService;
use App\Services\StellarService;
use Tests\TestCase;

class MedicalRecordTest extends TestCase
{
    private function mockServices(): void
    {
        // Mock IPFS — don't hit real network in tests
        $this->mock(IpfsService::class, function ($mock) {
            $mock->shouldReceive('encryptAndUpload')
                ->andReturn(['cid' => 'QmTestCID123456789', 'key_ref' => base64_encode('testkey')]);

            $mock->shouldReceive('uploadFile')
                ->andReturn('QmTestFileCID987654');

            $mock->shouldReceive('retrieve')
                ->andReturn(base64_encode('encrypted_content'));
        });

        // Mock Stellar — don't hit real blockchain in tests
        $this->mock(StellarService::class, function ($mock) {
            $mock->shouldReceive('storeCidHash')
                ->andReturn('stellar_tx_hash_abc123');

            $mock->shouldReceive('verifyCid')
                ->andReturn(true);

            $mock->shouldReceive('sendPayment')
                ->andReturn('stellar_payment_tx_xyz');
        });
    }

    public function test_can_create_medical_record(): void
    {
        $this->mockServices();
        [$user, , $headers] = $this->actingAsUser(['role' => 'doctor']);
        $patient = Patient::factory()->create();

        $res = $this->postJson('/api/records/create', [
            'patient_id'  => $patient->id,
            'doctor_id'   => $user->id,
            'record_type' => 'general',
            'payload'     => ['diagnosis' => 'Hypertension', 'notes' => 'BP 140/90'],
        ], $headers);

        $res->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['record' => ['id', 'cid_hash', 'stellar_tx_hash', 'status']]);

        $this->assertDatabaseHas('medical_records', [
            'patient_id' => $patient->id,
            'cid_hash'   => 'QmTestCID123456789',
            'status'     => 'stored',
        ]);
    }

    public function test_medical_record_never_stores_raw_data(): void
    {
        $this->mockServices();
        [$user, , $headers] = $this->actingAsUser(['role' => 'doctor']);
        $patient = Patient::factory()->create();

        $this->postJson('/api/records/create', [
            'patient_id'  => $patient->id,
            'doctor_id'   => $user->id,
            'record_type' => 'general',
            'payload'     => ['secret_diagnosis' => 'SENSITIVE_DATA'],
        ], $headers);

        // Raw payload must NOT be in the database
        $this->assertDatabaseMissing('medical_records', [
            'cid_hash' => 'SENSITIVE_DATA',
        ]);

        // Only CID hash stored
        $record = MedicalRecord::first();
        $this->assertNotNull($record->cid_hash);
        $this->assertNull($record->getRawOriginal('payload') ?? null);
    }

    public function test_can_get_patient_records(): void
    {
        $this->mockServices();
        [, , $headers] = $this->actingAsUser();
        $patient = Patient::factory()->create();

        MedicalRecord::factory()->count(3)->create(['patient_id' => $patient->id]);

        $res = $this->getJson("/api/records/{$patient->id}", $headers);

        $res->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(3, 'records');
    }

    public function test_can_retrieve_ipfs_content_by_cid(): void
    {
        $this->mockServices();
        [, , $headers] = $this->actingAsUser();
        $patient = Patient::factory()->create();

        MedicalRecord::factory()->create([
            'patient_id' => $patient->id,
            'cid_hash'   => 'QmTestCID123456789',
        ]);

        $res = $this->getJson('/api/ipfs/QmTestCID123456789', $headers);

        $res->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['cid', 'content']);
    }

    public function test_ipfs_returns_404_for_unknown_cid(): void
    {
        [, , $headers] = $this->actingAsUser();

        $this->getJson('/api/ipfs/QmUnknownCID', $headers)
            ->assertStatus(404);
    }

    public function test_unauthenticated_cannot_create_record(): void
    {
        $patient = Patient::factory()->create();

        $this->postJson('/api/records/create', [
            'patient_id' => $patient->id,
            'doctor_id'  => '00000000-0000-0000-0000-000000000000',
            'payload'    => ['test' => 'data'],
        ])->assertStatus(401);
    }
}

