<?php

namespace Tests\Feature;

use App\Models\MedicalRecord;
use App\Models\MedicalRecordAccessGrant;
use App\Models\Patient;
use App\Models\User;
use App\Services\StellarService;
use Illuminate\Support\Str;
use Tests\TestCase;

class PatientIdentityTest extends TestCase
{
    private function mockStellar(): void
    {
        $this->mock(StellarService::class, function ($mock) {
            $mock->shouldReceive('verifyCid')->andReturn(true);
            $mock->shouldReceive('storeCidHash')->andReturn('stellar_tx_mock');
        });
    }

    public function test_can_assign_generated_stellar_identity_to_patient(): void
    {
        [, , $headers] = $this->actingAsUser(['role' => 'receptionist']);
        $patient = Patient::factory()->create();

        $res = $this->postJson("/api/patients/{$patient->id}/identity", [
            'generate_wallet' => true,
        ], $headers);

        $res->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['public_key', 'share_code', 'secret_key', 'warning']);

        $this->assertStringStartsWith('G', $res->json('public_key'));
        $this->assertStringStartsWith('HMS-', $res->json('share_code'));

        $this->assertDatabaseHas('patients', [
            'id' => $patient->id,
        ]);
        $this->assertNotNull($patient->fresh()->stellar_public_key);
    }

    public function test_can_link_existing_wallet_to_patient(): void
    {
        [, , $headers] = $this->actingAsUser();
        $patient   = Patient::factory()->create();
        $keyPair   = \Soneso\StellarSDK\Crypto\KeyPair::random();
        $publicKey = $keyPair->getAccountId();

        $res = $this->postJson("/api/patients/{$patient->id}/identity", [
            'public_key' => $publicKey,
        ], $headers);

        $res->assertStatus(201)
            ->assertJsonPath('public_key', $publicKey)
            ->assertJsonMissing(['secret_key']); // no secret when linking external wallet
    }

    public function test_cannot_assign_identity_twice(): void
    {
        [, , $headers] = $this->actingAsUser();
        $patient = Patient::factory()->withStellarIdentity()->create();

        $this->postJson("/api/patients/{$patient->id}/identity", [
            'generate_wallet' => true,
        ], $headers)->assertStatus(422);
    }

    public function test_can_lookup_patient_by_share_code(): void
    {
        $patient = Patient::factory()->create([
            'stellar_public_key' => 'G' . strtoupper(Str::random(55)),
            'share_code'         => 'HMS-LOOKUP',
        ]);

        $res = $this->getJson('/api/patients/lookup/HMS-LOOKUP');

        $res->assertOk()
            ->assertJsonPath('patient.share_code', 'HMS-LOOKUP')
            ->assertJsonPath('patient.id', $patient->id);
    }

    public function test_can_lookup_patient_by_stellar_public_key(): void
    {
        $keyPair = \Soneso\StellarSDK\Crypto\KeyPair::random();
        $patient = Patient::factory()->create([
            'stellar_public_key' => $keyPair->getAccountId(),
            'share_code'         => 'HMS-BYKEY1',
        ]);

        $res = $this->getJson('/api/patients/lookup/' . $keyPair->getAccountId());

        $res->assertOk()->assertJsonPath('patient.id', $patient->id);
    }

    public function test_lookup_returns_404_for_unknown_identifier(): void
    {
        $this->getJson('/api/patients/lookup/HMS-UNKNOWN')
            ->assertStatus(404);
    }

    public function test_patient_can_grant_doctor_access(): void
    {
        [, , $headers] = $this->actingAsUser(['role' => 'receptionist']);
        $doctor  = User::factory()->create(['role' => 'doctor']);
        $patient = Patient::factory()->withStellarIdentity()->create();

        $res = $this->postJson("/api/patients/{$patient->id}/access-grants", [
            'doctor_id'     => $doctor->id,
            'access_level'  => 'view',
            'expires_hours' => 48,
            'purpose'       => 'Second opinion - cardiology',
        ], $headers);

        $res->assertStatus(201)
            ->assertJsonStructure(['access_token', 'expires_at', 'qr_payload', 'share_url']);

        $this->assertDatabaseHas('medical_record_access_grants', [
            'patient_id'         => $patient->id,
            'granted_to_user_id' => $doctor->id,
            'is_active'          => 1,
        ]);
    }

    public function test_doctor_can_access_shared_records_with_valid_token(): void
    {
        $this->mockStellar();

        $doctor  = User::factory()->create(['role' => 'doctor']);
        $patient = Patient::factory()->withStellarIdentity()->create();

        MedicalRecord::factory()->count(2)->create(['patient_id' => $patient->id]);

        $plainToken = Str::random(48);

        MedicalRecordAccessGrant::create([
            'patient_id'                 => $patient->id,
            'granted_to_user_id'         => $doctor->id,
            'patient_stellar_public_key' => $patient->stellar_public_key,
            'access_level'               => 'view',
            'is_active'                  => true,
            'access_token'               => hash('sha256', $plainToken),
        ]);

        $res = $this->postJson('/api/shared-records/access', [
            'access_token' => $plainToken,
            'doctor_id'    => $doctor->id,
        ]);

        $res->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['patient', 'records', 'stellar_verified', 'access_level'])
            ->assertJsonCount(2, 'records');

        // Encryption key ref must NOT be exposed
        $records = $res->json('records');
        foreach ($records as $record) {
            $this->assertArrayNotHasKey('encryption_key_ref', $record);
        }
    }

    public function test_access_denied_with_invalid_token(): void
    {
        $doctor = User::factory()->create(['role' => 'doctor']);

        $this->postJson('/api/shared-records/access', [
            'access_token' => 'completely_wrong_token',
            'doctor_id'    => $doctor->id,
        ])->assertStatus(403);
    }

    public function test_access_denied_with_expired_grant(): void
    {
        $doctor  = User::factory()->create(['role' => 'doctor']);
        $patient = Patient::factory()->withStellarIdentity()->create();

        $plainToken = Str::random(48);

        MedicalRecordAccessGrant::create([
            'patient_id'                 => $patient->id,
            'granted_to_user_id'         => $doctor->id,
            'patient_stellar_public_key' => $patient->stellar_public_key,
            'access_level'               => 'view',
            'is_active'                  => true,
            'expires_at'                 => now()->subHour(), // expired
            'access_token'               => hash('sha256', $plainToken),
        ]);

        $this->postJson('/api/shared-records/access', [
            'access_token' => $plainToken,
            'doctor_id'    => $doctor->id,
        ])->assertStatus(403);
    }

    public function test_patient_can_list_active_grants(): void
    {
        [, , $headers] = $this->actingAsUser();
        $patient = Patient::factory()->withStellarIdentity()->create();
        $doctor  = User::factory()->create(['role' => 'doctor']);

        MedicalRecordAccessGrant::create([
            'patient_id'                 => $patient->id,
            'granted_to_user_id'         => $doctor->id,
            'patient_stellar_public_key' => $patient->stellar_public_key,
            'access_level'               => 'view',
            'is_active'                  => true,
            'access_token'               => hash('sha256', Str::random(48)),
        ]);

        $res = $this->getJson("/api/patients/{$patient->id}/access-grants", $headers);

        $res->assertOk()
            ->assertJsonCount(1, 'grants')
            ->assertJsonStructure(['grants' => [['id', 'doctor', 'access_level', 'expires_at']]]);
    }

    public function test_patient_can_revoke_specific_grant(): void
    {
        [, , $headers] = $this->actingAsUser();
        $patient = Patient::factory()->withStellarIdentity()->create();
        $doctor  = User::factory()->create(['role' => 'doctor']);

        $grant = MedicalRecordAccessGrant::create([
            'patient_id'                 => $patient->id,
            'granted_to_user_id'         => $doctor->id,
            'patient_stellar_public_key' => $patient->stellar_public_key,
            'access_level'               => 'view',
            'is_active'                  => true,
            'access_token'               => hash('sha256', Str::random(48)),
        ]);

        $this->deleteJson("/api/patients/{$patient->id}/access-grants/{$grant->id}", [], $headers)
            ->assertOk();

        $this->assertDatabaseHas('medical_record_access_grants', [
            'id'        => $grant->id,
            'is_active' => 0,
        ]);
    }

    public function test_patient_can_revoke_all_grants(): void
    {
        [, , $headers] = $this->actingAsUser();
        $patient = Patient::factory()->withStellarIdentity()->create();

        foreach (range(1, 3) as $i) {
            $doctor = User::factory()->create(['role' => 'doctor']);
            MedicalRecordAccessGrant::create([
                'patient_id'                 => $patient->id,
                'granted_to_user_id'         => $doctor->id,
                'patient_stellar_public_key' => $patient->stellar_public_key,
                'access_level'               => 'view',
                'is_active'                  => true,
                'access_token'               => hash('sha256', Str::random(48)),
            ]);
        }

        $res = $this->deleteJson("/api/patients/{$patient->id}/access-grants", [], $headers);

        $res->assertOk()->assertJsonPath('grants_revoked', 3);

        $this->assertEquals(0, MedicalRecordAccessGrant::where('patient_id', $patient->id)
            ->where('is_active', true)->count());
    }
}

