<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

abstract class TestCase extends BaseTestCase
{
    use RefreshDatabase;

    /**
     * Create and authenticate a user, return [user, token, headers].
     */
    protected function actingAsUser(array $overrides = []): array
    {
        $user = \App\Models\User::factory()->create(array_merge([
            'role'      => 'doctor',
            'is_active' => true,
        ], $overrides));

        $token   = $user->createToken('test')->plainTextToken;
        $headers = ['Authorization' => "Bearer {$token}"];

        return [$user, $token, $headers];
    }

    /**
     * Create a patient with optional stellar identity.
     */
    protected function makePatient(array $overrides = []): \App\Models\Patient
    {
        return \App\Models\Patient::factory()->create($overrides);
    }
}

