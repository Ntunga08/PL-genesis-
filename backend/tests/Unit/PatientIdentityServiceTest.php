<?php

namespace Tests\Unit;

use App\Models\MedicalRecordAccessGrant;
use App\Models\Patient;
use App\Models\User;
use App\Repositories\MedicalRecordRepository;
use App\Services\PatientIdentityService;
use App\Services\StellarService;
use Illuminate\Support\Str;
use Mockery;
use Tests\TestCase;

class PatientIdentityServiceTest extends TestCase
{
    private PatientIdentityService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $stellar = Mockery::mock(StellarService::class);
        $stellar->shouldReceive('verifyCid')->andReturn(true)->byDefault();
        $stellar->shouldReceive('storeCidHash')->andReturn('mock_tx')->byDefault();

        $this->service = new PatientIdentityService($stellar, new MedicalRecordRepository());
    }

    public function test_assign_identity_generates_keypair_and_share_code(): void
    {
        $patient = Patient::factory()->create();

        $result = $this->service->assignIdentity($patient, ['generate_wallet' => true]);

        $this->assertStringStartsWith('G', $result['public_key']);
        $this->assertStringStartsWith('S', $result['secret_key']);
        $this->assertStringStartsWith('HMS-', $result['share_code']);

        $patient->refresh();
        $this->assertNotNull($patient->stellar_public_key);
        $this->assertNotNull($patient->share_code);
    }

    public function test_assign_identity_links_external_wallet(): void
    {
        $patient   = Patient::factory()->create();
        $keyPair   = \Soneso\StellarSDK\Crypto\KeyPair::random();
        $publicKey = $keyPair->getAccountId();

        $result = $this->service->assignIdentity($patient, ['public_key' => $publicKey]);

        $this->assertEquals($publicKey, $result['public_key']);
        $this->assertArrayNotHasKey('secret_key', $result); // no secret for external wallet
    }

    public function test_cannot_assign_identity_twice(): void
    {
        $patient = Patient::factory()->withStellarIdentity()->create();

        $this->expectException(\RuntimeException::class);
        $this->service->assignIdentity($patient, ['generate_wallet' => true]);
    }

    public function test_find_by_share_code(): void
    {
        $patient = Patient::factory()->create(['share_code' => 'HMS-FINDME']);

        $found = $this->service->findByIdentifier('HMS-FINDME');

        $this->assertEquals($patient->id, $found->id);
    }

    public function test_find_by_stellar_public_key(): void
    {
        $keyPair = \Soneso\StellarSDK\Crypto\KeyPair::random();
        $patient = Patient::factory()->create([
            'stellar_public_key' => $keyPair->getAccountId(),
        ]);

        $found = $this->service->findByIdentifier($keyPair->getAccountId());

        $this->assertEquals($patient->id, $found->id);
    }

    public function test_find_throws_for_unknown_identifier(): void
    {
        $this->expectException(\RuntimeException::class);
        $this->service->findByIdentifier('HMS-UNKNOWN');
    }

    public function test_grant_access_creates_active_grant(): void
    {
        $patient = Patient::factory()->withStellarIdentity()->create();
        $doctor  = User::factory()->create(['role' => 'doctor']);

        $result = $this->service->grantAccess($patient, [
            'doctor_id'     => $doctor->id,
            'access_level'  => 'view',
            'expires_hours' => 24,
            'purpose'       => 'Referral',
        ]);

        $this->assertArrayHasKey('access_token', $result);
        $this->assertArrayHasKey('qr_payload', $result);
        $this->assertNotNull($result['expires_at']);

        $this->assertDatabaseHas('medical_record_access_grants', [
            'patient_id'         => $patient->id,
            'granted_to_user_id' => $doctor->id,
            'is_active'          => 1,
        ]);
    }

    public function test_granting_access_revokes_previous_grant_to_same_doctor(): void
    {
        $patient = Patient::factory()->withStellarIdentity()->create();
        $doctor  = User::factory()->create(['role' => 'doctor']);

        // First grant
        $this->service->grantAccess($patient, [
            'doctor_id'    => $doctor->id,
            'access_level' => 'view',
        ]);

        // Second grant to same doctor
        $this->service->grantAccess($patient, [
            'doctor_id'    => $doctor->id,
            'access_level' => 'full',
        ]);

        // Only one active grant should exist
        $activeCount = MedicalRecordAccessGrant::where('patient_id', $patient->id)
            ->where('granted_to_user_id', $doctor->id)
            ->where('is_active', true)
            ->count();

        $this->assertEquals(1, $activeCount);
    }

    public function test_revoke_all_access_deactivates_all_grants(): void
    {
        $patient = Patient::factory()->withStellarIdentity()->create();

        foreach (range(1, 4) as $i) {
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

        $revoked = $this->service->revokeAllAccess($patient);

        $this->assertEquals(4, $revoked);
        $this->assertEquals(0, MedicalRecordAccessGrant::where('patient_id', $patient->id)
            ->where('is_active', true)->count());
    }

    public function test_share_codes_are_unique(): void
    {
        $codes = [];
        foreach (range(1, 10) as $i) {
            $patient = Patient::factory()->create();
            $result  = $this->service->assignIdentity($patient, ['generate_wallet' => true]);
            $codes[] = $result['share_code'];
        }

        $this->assertCount(10, array_unique($codes));
    }
}

