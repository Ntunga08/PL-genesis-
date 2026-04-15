<?php

namespace Tests\Feature;

use App\Models\User;
use Tests\TestCase;

class AccountTest extends TestCase
{
    public function test_user_can_view_profile(): void
    {
        [, , $headers] = $this->actingAsUser();

        $this->getJson('/api/account/profile', $headers)
            ->assertOk()
            ->assertJsonStructure(['user' => ['id', 'name', 'email', 'stellar_public_key']]);
    }

    public function test_user_can_update_profile(): void
    {
        [, , $headers] = $this->actingAsUser();

        $this->putJson('/api/account/profile', [
            'name'  => 'Updated Name',
            'phone' => '0712345678',
        ], $headers)
            ->assertOk()
            ->assertJsonPath('user.name', 'Updated Name');
    }

    public function test_user_can_change_password(): void
    {
        [$user, , $headers] = $this->actingAsUser(['password' => bcrypt('oldpass123')]);

        $this->postJson('/api/account/change-password', [
            'current_password'          => 'oldpass123',
            'new_password'              => 'newpass456',
            'new_password_confirmation' => 'newpass456',
        ], $headers)->assertOk();

        // Verify password was actually changed in DB
        $this->assertTrue(\Illuminate\Support\Facades\Hash::check('newpass456', $user->fresh()->password));
        // Verify all tokens were deleted
        $this->assertEquals(0, $user->fresh()->tokens()->count());
    }

    public function test_change_password_fails_with_wrong_current(): void
    {
        [, , $headers] = $this->actingAsUser();

        $this->postJson('/api/account/change-password', [
            'current_password'          => 'wrongpassword',
            'new_password'              => 'newpass456',
            'new_password_confirmation' => 'newpass456',
        ], $headers)->assertStatus(422);
    }

    public function test_forgot_password_always_returns_success(): void
    {
        // Should not reveal whether email exists
        $this->postJson('/api/account/forgot-password', [
            'email' => 'nonexistent@example.com',
        ])->assertOk()->assertJsonPath('success', true);
    }

    public function test_reset_password_with_valid_token(): void
    {
        $token = \Illuminate\Support\Str::random(64);

        $user = User::factory()->create([
            'password_reset_token'      => hash('sha256', $token),
            'password_reset_expires_at' => now()->addHour(),
        ]);

        $this->postJson('/api/account/reset-password', [
            'email'                 => $user->email,
            'token'                 => $token,
            'new_password'          => 'resetpass123',
            'new_password_confirmation' => 'resetpass123',
        ])->assertOk()->assertJsonPath('success', true);
    }

    public function test_reset_password_fails_with_expired_token(): void
    {
        $token = \Illuminate\Support\Str::random(64);

        $user = User::factory()->create([
            'password_reset_token'      => hash('sha256', $token),
            'password_reset_expires_at' => now()->subHour(), // expired
        ]);

        $this->postJson('/api/account/reset-password', [
            'email'                     => $user->email,
            'token'                     => $token,
            'new_password'              => 'resetpass123',
            'new_password_confirmation' => 'resetpass123',
        ])->assertStatus(422);
    }

    public function test_user_can_generate_stellar_wallet(): void
    {
        [, , $headers] = $this->actingAsUser();

        $res = $this->postJson('/api/account/wallet/generate', [], $headers);

        $res->assertStatus(201)
            ->assertJsonStructure(['wallet' => ['public_key', 'secret_key', 'message']]);

        $this->assertStringStartsWith('G', $res->json('wallet.public_key'));
        $this->assertStringStartsWith('S', $res->json('wallet.secret_key'));
    }

    public function test_user_cannot_generate_wallet_twice(): void
    {
        [$user, , $headers] = $this->actingAsUser([
            'stellar_public_key' => 'GEXISTINGKEY123',
        ]);

        $this->postJson('/api/account/wallet/generate', [], $headers)
            ->assertStatus(422);
    }

    public function test_user_can_link_external_wallet(): void
    {
        [, , $headers] = $this->actingAsUser();

        // Generate a real valid Stellar public key
        $keyPair   = \Soneso\StellarSDK\Crypto\KeyPair::random();
        $publicKey = $keyPair->getAccountId();

        $this->postJson('/api/account/wallet/link', [
            'public_key' => $publicKey,
        ], $headers)
            ->assertOk()
            ->assertJsonPath('public_key', $publicKey);
    }

    public function test_link_wallet_rejects_invalid_key(): void
    {
        [, , $headers] = $this->actingAsUser();

        $this->postJson('/api/account/wallet/link', [
            'public_key' => 'INVALID_KEY_FORMAT',
        ], $headers)->assertStatus(422);
    }

    public function test_user_can_export_wallet_secret(): void
    {
        $password = 'testpass123';
        [$user, , $headers] = $this->actingAsUser(['password' => bcrypt($password)]);

        // First generate a wallet
        $this->postJson('/api/account/wallet/generate', [], $headers);

        $res = $this->postJson('/api/account/wallet/export', [
            'password' => $password,
        ], $headers);

        $res->assertOk()->assertJsonStructure(['secret_key', 'warning']);
        $this->assertStringStartsWith('S', $res->json('secret_key'));
    }

    public function test_export_wallet_fails_with_wrong_password(): void
    {
        [, , $headers] = $this->actingAsUser();
        $this->postJson('/api/account/wallet/generate', [], $headers);

        $this->postJson('/api/account/wallet/export', [
            'password' => 'wrongpassword',
        ], $headers)->assertStatus(422);
    }

    public function test_user_can_deactivate_account(): void
    {
        [$user, , $headers] = $this->actingAsUser(['password' => bcrypt('mypass123')]);

        $this->deleteJson('/api/account', ['password' => 'mypass123'], $headers)
            ->assertOk();

        $this->assertFalse($user->fresh()->is_active);
    }
}

