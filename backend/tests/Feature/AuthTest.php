<?php

namespace Tests\Feature;

use App\Models\User;
use Tests\TestCase;

class AuthTest extends TestCase
{
    public function test_user_can_register(): void
    {
        $res = $this->postJson('/api/auth/register', [
            'name'                  => 'John Doe',
            'email'                 => 'john@example.com',
            'password'              => 'password123',
            'password_confirmation' => 'password123',
            'role'                  => 'doctor',
        ]);

        $res->assertStatus(201)
            ->assertJsonStructure(['token', 'user' => ['id', 'name', 'email', 'role']]);
    }

    public function test_register_with_wallet_generation(): void
    {
        $res = $this->postJson('/api/auth/register', [
            'name'                  => 'Jane Doe',
            'email'                 => 'jane@example.com',
            'password'              => 'password123',
            'password_confirmation' => 'password123',
            'role'                  => 'patient',
            'generate_wallet'       => true,
        ]);

        $res->assertStatus(201)
            ->assertJsonStructure([
                'token', 'user',
                'wallet' => ['public_key', 'secret_key', 'message'],
            ]);

        $this->assertStringStartsWith('G', $res->json('wallet.public_key'));
    }

    public function test_user_can_login(): void
    {
        User::factory()->create([
            'email'    => 'test@example.com',
            'password' => bcrypt('password123'),
            'role'     => 'doctor',
        ]);

        $res = $this->postJson('/api/auth/login', [
            'email'    => 'test@example.com',
            'password' => 'password123',
        ]);

        $res->assertOk()
            ->assertJsonStructure(['token', 'user'])
            ->assertJsonPath('user.email', 'test@example.com');
    }

    public function test_login_fails_with_wrong_password(): void
    {
        User::factory()->create(['email' => 'test2@example.com']);

        $this->postJson('/api/auth/login', [
            'email'    => 'test2@example.com',
            'password' => 'wrongpassword',
        ])->assertStatus(422);
    }

    public function test_inactive_user_cannot_login(): void
    {
        User::factory()->create([
            'email'     => 'inactive@example.com',
            'password'  => bcrypt('password123'),
            'is_active' => false,
        ]);

        $this->postJson('/api/auth/login', [
            'email'    => 'inactive@example.com',
            'password' => 'password123',
        ])->assertStatus(403);
    }

    public function test_authenticated_user_can_get_profile(): void
    {
        [, , $headers] = $this->actingAsUser();

        $this->getJson('/api/auth/me', $headers)
            ->assertOk()
            ->assertJsonStructure(['user' => ['id', 'name', 'email', 'role']]);
    }

    public function test_user_can_logout(): void
    {
        [$user, , $headers] = $this->actingAsUser();

        $this->assertCount(1, $user->tokens);

        $this->postJson('/api/auth/logout', [], $headers)->assertOk();

        // Token deleted from DB
        $this->assertCount(0, $user->fresh()->tokens);
    }

    public function test_duplicate_email_registration_fails(): void
    {
        User::factory()->create(['email' => 'dup@example.com']);

        $this->postJson('/api/auth/register', [
            'name'                  => 'Dup',
            'email'                 => 'dup@example.com',
            'password'              => 'password123',
            'password_confirmation' => 'password123',
            'role'                  => 'patient',
        ])->assertStatus(422);
    }
}

