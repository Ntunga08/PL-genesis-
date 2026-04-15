<?php

namespace Tests\Feature;

use App\Models\Patient;
use App\Models\Payment;
use App\Services\FiatToStellarBridgeService;
use App\Services\StellarService;
use Illuminate\Support\Str;
use Tests\TestCase;

class BridgeTest extends TestCase
{
    private function mockBridge(): void
    {
        $this->mock(StellarService::class, function ($mock) {
            $mock->shouldReceive('sendPayment')->andReturn('bridge_stellar_tx_abc');
            $mock->shouldReceive('storeCidHash')->andReturn('bridge_cid_tx_xyz');
            $mock->shouldReceive('verifyCid')->andReturn(true);
        });
    }

    private function makeCompletedPayment(Patient $patient): Payment
    {
        return Payment::create([
            'id'               => (string) Str::uuid(),
            'patient_id'       => $patient->id,
            'amount'           => 50000, // 50,000 TZS
            'payment_method'   => 'ZenoPay',
            'payment_type'     => 'Consultation',
            'status'           => 'Completed',
            'payment_date'     => now(),
            'reference_number' => 'PAY-TEST-001',
        ]);
    }

    public function test_can_get_live_exchange_rate(): void
    {
        [, , $headers] = $this->actingAsUser();

        // Mock the HTTP call to CoinGecko
        \Illuminate\Support\Facades\Http::fake([
            'api.coingecko.com/*' => \Illuminate\Support\Facades\Http::response([
                'stellar' => ['tzs' => 6500],
            ]),
        ]);

        $res = $this->getJson('/api/bridge/rate', $headers);

        $res->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['tzs_per_xlm', 'xlm_per_tzs', 'source']);
    }

    public function test_can_convert_tzs_to_xlm(): void
    {
        [, , $headers] = $this->actingAsUser();

        \Illuminate\Support\Facades\Http::fake([
            'api.coingecko.com/*' => \Illuminate\Support\Facades\Http::response([
                'stellar' => ['tzs' => 6500],
            ]),
        ]);

        $res = $this->getJson('/api/bridge/convert?tzs=65000', $headers);

        $res->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('tzs', '65000');
        // 65000 / 6500 = 10 XLM
        $this->assertEquals(10.0, $res->json('xlm'));
    }

    public function test_can_bridge_completed_payment_to_stellar(): void
    {
        $this->mockBridge();
        [, , $headers] = $this->actingAsUser();
        $patient = Patient::factory()->create();
        $payment = $this->makeCompletedPayment($patient);

        \Illuminate\Support\Facades\Http::fake([
            'api.coingecko.com/*' => \Illuminate\Support\Facades\Http::response([
                'stellar' => ['tzs' => 6500],
            ]),
        ]);

        $destKey = \Soneso\StellarSDK\Crypto\KeyPair::random()->getAccountId();

        $res = $this->postJson("/api/bridge/payment/{$payment->id}", [
            'destination_wallet' => $destKey,
        ], $headers);

        $res->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['stellar_tx_hash', 'xlm_amount', 'tzs_amount']);

        $this->assertDatabaseHas('payments', [
            'id'              => $payment->id,
            'stellar_tx_hash' => 'bridge_stellar_tx_abc',
            'bridge_status'   => 'bridged',
        ]);
    }

    public function test_cannot_bridge_pending_payment(): void
    {
        [, , $headers] = $this->actingAsUser();
        $patient = Patient::factory()->create();

        $payment = Payment::create([
            'id'               => (string) Str::uuid(),
            'patient_id'       => $patient->id,
            'amount'           => 10000,
            'payment_method'   => 'ZenoPay',
            'status'           => 'Pending', // not completed
            'payment_date'     => now(),
            'reference_number' => 'PAY-PENDING-001',
        ]);

        $this->postJson("/api/bridge/payment/{$payment->id}", [], $headers)
            ->assertStatus(422);
    }

    public function test_bridge_uses_fallback_rate_when_api_fails(): void
    {
        [, , $headers] = $this->actingAsUser();

        // Simulate CoinGecko being down
        \Illuminate\Support\Facades\Http::fake([
            'api.coingecko.com/*' => \Illuminate\Support\Facades\Http::response([], 500),
        ]);

        $res = $this->getJson('/api/bridge/rate', $headers);

        // Should still return a rate (fallback)
        $res->assertOk()->assertJsonPath('success', true);
        $this->assertGreaterThan(0, $res->json('tzs_per_xlm'));
    }
}

