<?php

namespace Tests\Unit;

use App\Models\User;
use App\Services\AccountService;
use Tests\TestCase;

class AccountServiceTest extends TestCase
{
    private AccountService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new AccountService();
    }

    public function test_register_creates_user_with_correct_role(): void
    {
        $result = $this->service->register([
            'name'     => 'Dr. Smith',
            'email'    => 'smith@hospital.com',
            'password' => 'password123',
            'role'     => 'doctor',
        ]);

        $this->assertArrayHasKey('token', $result);
        $this->assertArrayHasKey('user', $result);
        $this->assertEquals('doctor', $result['user']['role']);
        $this->assertNull($result['wallet']);
    }

    public function test_register_with_wallet_generates_stellar_keypair(): void
    {
        $result = $this->service->register([
            'name'            => 'Patient One',
            'email'           => 'patient@test.com',
            'password'        => 'password123',
            'role'            => 'patient',
            'generate_wallet' => true,
        ]);

        $this->assertNotNull($result['wallet']);
        $this->assertStringStartsWith('G', $result['wallet']['public_key']);
        $this->assertStringStartsWith('S', $result['wallet']['secret_key']);
    }

    public function test_lab_tech_role_normalized(): void
    {
        $result = $this->service->register([
            'name'     => 'Lab Tech',
            'email'    => 'lab@test.com',
            'password' => 'password123',
            'role'     => 'lab_tech',
        ]);

        $this->assertEquals('lab_technician', $result['user']['role']);
    }

    public function test_generate_wallet_creates_valid_stellar_keypair(): void
    {
        $user   = User::factory()->create();
        $wallet = $this->service->generateWallet($user);

        $this->assertStringStartsWith('G', $wallet['public_key']);
        $this->assertStringStartsWith('S', $wallet['secret_key']);

        // Verify it's stored encrypted in DB
        $user->refresh();
        $this->assertNotNull($user->stellar_public_key);
        $this->assertNotNull($user->stellar_encrypted_secret);
        $this->assertNotEquals($wallet['secret_key'], $user->stellar_encrypted_secret);
    }

    public function test_export_wallet_secret_decrypts_correctly(): void
    {
        $password = 'testpass123';
        $user     = User::factory()->create(['password' => bcrypt($password)]);

        $wallet = $this->service->generateWallet($user);
        $user->refresh();

        $exported = $this->service->exportWalletSecret($user, $password);

        $this->assertEquals($wallet['secret_key'], $exported);
    }

    public function test_export_wallet_fails_with_wrong_password(): void
    {
        $user = User::factory()->create(['password' => bcrypt('correct')]);
        $this->service->generateWallet($user);
        $user->refresh();

        $this->expectException(\RuntimeException::class);
        $this->service->exportWalletSecret($user, 'wrong');
    }

    public function test_link_external_wallet_stores_only_public_key(): void
    {
        $user    = User::factory()->create();
        $keyPair = \Soneso\StellarSDK\Crypto\KeyPair::random();

        $this->service->linkWallet($user, $keyPair->getAccountId());
        $user->refresh();

        $this->assertEquals($keyPair->getAccountId(), $user->stellar_public_key);
        $this->assertNull($user->stellar_encrypted_secret); // no secret stored
    }

    public function test_link_wallet_rejects_invalid_key(): void
    {
        $user = User::factory()->create();

        $this->expectException(\RuntimeException::class);
        $this->service->linkWallet($user, 'NOT_A_VALID_KEY');
    }

    public function test_change_password_revokes_all_tokens(): void
    {
        $user = User::factory()->create(['password' => bcrypt('oldpass')]);
        $user->createToken('token1');
        $user->createToken('token2');

        $this->assertCount(2, $user->tokens);

        $this->service->changePassword($user, 'oldpass', 'newpass123');

        $this->assertCount(0, $user->fresh()->tokens);
    }

    public function test_deactivate_account_disables_user(): void
    {
        $user = User::factory()->create(['password' => bcrypt('mypass')]);

        $this->service->deactivateAccount($user, 'mypass');

        $this->assertFalse($user->fresh()->is_active);
    }

    public function test_format_user_never_exposes_encrypted_secret(): void
    {
        $user = User::factory()->create([
            'stellar_encrypted_secret' => 'SHOULD_NEVER_APPEAR',
        ]);

        $formatted = $this->service->formatUser($user);

        $this->assertArrayNotHasKey('stellar_encrypted_secret', $formatted);
        $this->assertArrayNotHasKey('password', $formatted);
    }
}

