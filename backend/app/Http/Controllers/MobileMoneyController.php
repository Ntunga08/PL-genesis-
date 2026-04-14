<?php

namespace App\Http\Controllers;

use App\Models\MobilePayment;
use App\Services\FiatToStellarBridgeService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MobileMoneyController extends Controller
{
    /**
     * Initiate mobile money payment
     */
    public function initiatePayment(Request $request)
    {
        $validated = $request->validate([
            'phone_number' => 'required|string',
            'amount' => 'required|numeric|min:100',
            'provider' => 'required|in:M-Pesa,Airtel Money,Tigo Pesa,Halopesa,Mobile Money,Zenopay',
            'patient_id' => 'nullable|uuid|exists:patients,id',
            'invoice_id' => 'nullable|uuid|exists:invoices,id',
        ]);

        try {
            // Generate unique reference number
            $referenceNumber = 'PAY-' . strtoupper(Str::random(10));

            // Create payment record
            $payment = MobilePayment::create([
                'id' => Str::uuid(),
                'patient_id' => $validated['patient_id'] ?? null,
                'invoice_id' => $validated['invoice_id'] ?? null,
                'phone_number' => $validated['phone_number'],
                'amount' => $validated['amount'],
                'provider' => $validated['provider'],
                'reference_number' => $referenceNumber,
                'status' => 'pending',
                'initiated_at' => now(),
            ]);

            // Call provider API based on provider
            $result = $this->callProviderAPI($payment);

            if ($result['success']) {
                $payment->update([
                    'status' => 'processing',
                    'transaction_id' => $result['transaction_id'] ?? null,
                    'provider_response' => json_encode($result['response'] ?? []),
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Payment initiated successfully',
                    'payment_id' => $payment->id,
                    'reference_number' => $referenceNumber,
                    'status' => 'processing',
                ], 200);
            } else {
                $payment->update([
                    'status' => 'failed',
                    'provider_response' => json_encode($result['error'] ?? 'Unknown error'),
                ]);

                return response()->json([
                    'success' => false,
                    'message' => $result['error'] ?? 'Payment initiation failed',
                ], 400);
            }

        } catch (\Exception $e) {
            Log::error('Mobile money payment error: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to initiate payment: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Check payment status
     */
    public function checkStatus($paymentId)
    {
        $payment = MobilePayment::find($paymentId);

        if (!$payment) {
            return response()->json([
                'success' => false,
                'message' => 'Payment not found',
            ], 404);
        }

        // TODO: Query provider API for real-time status
        // For now, return stored status

        return response()->json([
            'success' => true,
            'payment' => [
                'id' => $payment->id,
                'reference_number' => $payment->reference_number,
                'status' => $payment->status,
                'amount' => $payment->amount,
                'phone_number' => $payment->phone_number,
                'provider' => $payment->provider,
                'transaction_id' => $payment->transaction_id,
            ],
        ]);
    }

    /**
     * Handle callback from mobile money provider
     */
    public function handleCallback(Request $request)
    {
        Log::info('Mobile money callback received', $request->all());

        // TODO: Validate callback signature/authentication
        
        $referenceNumber = $request->input('reference') ?? $request->input('reference_number');
        $status = $request->input('status');
        $transactionId = $request->input('transaction_id');

        if (!$referenceNumber) {
            return response()->json(['message' => 'Invalid callback'], 400);
        }

        $payment = MobilePayment::where('reference_number', $referenceNumber)->first();

        if (!$payment) {
            Log::warning('Payment not found for reference: ' . $referenceNumber);
            return response()->json(['message' => 'Payment not found'], 404);
        }

        // Update payment status
        $newStatus = $this->mapProviderStatus($status);
        
        $payment->update([
            'status' => $newStatus,
            'transaction_id' => $transactionId ?? $payment->transaction_id,
            'provider_response' => json_encode($request->all()),
            'completed_at' => $newStatus === 'completed' ? now() : null,
        ]);

        // ── Bridge confirmed fiat payment to Stellar ───────────────────────
        if ($newStatus === 'completed' && $payment->patient_id) {
            try {
                // MobilePayment doesn't extend Payment model, so we find or create
                // a matching Payment record to bridge
                $fiatPayment = \App\Models\Payment::where('reference_number', $payment->reference_number)->first();
                if ($fiatPayment) {
                    $bridge = app(FiatToStellarBridgeService::class);
                    $bridgeResult = $bridge->bridgePayment($fiatPayment, [
                        'insurance_number' => $request->input('insurance_number'),
                        'doctor_approved'  => $request->boolean('doctor_approved'),
                        'cid'              => $request->input('cid'),
                    ]);
                    Log::info('MobileMoney: fiat→Stellar bridge completed', $bridgeResult);
                }
            } catch (\Throwable $e) {
                Log::error('MobileMoney: fiat→Stellar bridge failed', ['error' => $e->getMessage()]);
            }
        }
        // ──────────────────────────────────────────────────────────────────

        return response()->json(['message' => 'Callback processed'], 200);
    }

    /**
     * Call provider API to initiate payment
     */
    private function callProviderAPI($payment)
    {
        $config = config('mobile-money');
        $provider = strtolower(str_replace(' ', '', $payment->provider));

        // Check if provider is enabled
        if (!($config[$provider]['enabled'] ?? false)) {
            return [
                'success' => false,
                'error' => $payment->provider . ' is not enabled. Please configure API credentials.',
            ];
        }

        // Call respective provider API
        switch ($provider) {
            case 'mpesa':
            case 'm-pesa':
                return $this->initiateMpesaPayment($payment, $config['mpesa']);
            
            case 'airtelmoney':
            case 'airtel':
                return $this->initiateAirtelPayment($payment, $config['airtel']);
            
            case 'tigopesa':
            case 'tigo':
                return $this->initiateTigoPayment($payment, $config['tigo']);
            
            case 'halopesa':
                return $this->initiateHalopesaPayment($payment, $config['halopesa']);
            
            case 'zenopay':
            case 'mobilemoney':
            default:
                // Use Zenopay as default for all mobile money
                return $this->initiateZenopayPayment($payment, $config['zenopay']);
        }
    }

    /**
     * M-Pesa payment initiation
     */
    private function initiateMpesaPayment($payment, $config)
    {
        // TODO: Implement actual M-Pesa API call
        // Documentation: https://developer.mpesa.vm.co.tz/
        
        Log::info('M-Pesa payment initiated (simulated)', [
            'phone' => $payment->phone_number,
            'amount' => $payment->amount,
        ]);

        // Simulated response
        return [
            'success' => true,
            'transaction_id' => 'MPESA-' . Str::random(10),
            'response' => ['message' => 'Payment request sent to customer'],
        ];
    }

    /**
     * Airtel Money payment initiation
     */
    private function initiateAirtelPayment($payment, $config)
    {
        // TODO: Implement actual Airtel Money API call
        // Documentation: https://developers.airtel.africa/
        
        Log::info('Airtel Money payment initiated (simulated)', [
            'phone' => $payment->phone_number,
            'amount' => $payment->amount,
        ]);

        return [
            'success' => true,
            'transaction_id' => 'AIRTEL-' . Str::random(10),
            'response' => ['message' => 'Payment request sent to customer'],
        ];
    }

    /**
     * Tigo Pesa payment initiation
     */
    private function initiateTigoPayment($payment, $config)
    {
        // TODO: Implement actual Tigo Pesa API call
        
        Log::info('Tigo Pesa payment initiated (simulated)', [
            'phone' => $payment->phone_number,
            'amount' => $payment->amount,
        ]);

        return [
            'success' => true,
            'transaction_id' => 'TIGO-' . Str::random(10),
            'response' => ['message' => 'Payment request sent to customer'],
        ];
    }

    /**
     * Halopesa payment initiation
     */
    private function initiateHalopesaPayment($payment, $config)
    {
        // TODO: Implement actual Halopesa API call
        
        Log::info('Halopesa payment initiated (simulated)', [
            'phone' => $payment->phone_number,
            'amount' => $payment->amount,
        ]);

        return [
            'success' => true,
            'transaction_id' => 'HALO-' . Str::random(10),
            'response' => ['message' => 'Payment request sent to customer'],
        ];
    }

    /**
     * Zenopay payment initiation (Unified Mobile Money Gateway)
     */
    private function initiateZenopayPayment($payment, $config)
    {
        if (!$config['api_key']) {
            return [
                'success' => false,
                'error' => 'Zenopay is not configured. Please add API credentials.',
            ];
        }

        try {
            // Zenopay API Documentation: https://docs.zenopay.com/
            $response = Http::timeout($config['timeout'])
                ->withHeaders([
                    'Authorization' => 'Bearer ' . $config['api_key'],
                    'Content-Type' => 'application/json',
                    'Accept' => 'application/json',
                ])
                ->post($config['api_url'] . '/v1/payments/mobile-money', [
                    'merchant_id' => $config['merchant_id'],
                    'amount' => $payment->amount,
                    'currency' => 'TZS',
                    'phone_number' => $payment->phone_number,
                    'reference' => $payment->reference_number,
                    'description' => 'Hospital consultation fee',
                    'callback_url' => $config['callback_url'],
                    'return_url' => $config['return_url'],
                ]);

            if ($response->successful()) {
                $data = $response->json();
                
                Log::info('Zenopay payment initiated successfully', [
                    'reference' => $payment->reference_number,
                    'response' => $data,
                ]);

                return [
                    'success' => true,
                    'transaction_id' => $data['transaction_id'] ?? $data['id'] ?? null,
                    'response' => $data,
                ];
            } else {
                Log::error('Zenopay payment failed', [
                    'status' => $response->status(),
                    'response' => $response->body(),
                ]);

                return [
                    'success' => false,
                    'error' => $response->json()['message'] ?? 'Payment initiation failed',
                ];
            }

        } catch (\Exception $e) {
            Log::error('Zenopay API error: ' . $e->getMessage());
            
            return [
                'success' => false,
                'error' => 'Failed to connect to Zenopay: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Map provider status to our status
     */
    private function mapProviderStatus($providerStatus)
    {
        $statusMap = [
            'success' => 'completed',
            'completed' => 'completed',
            'failed' => 'failed',
            'cancelled' => 'cancelled',
            'pending' => 'pending',
            'processing' => 'processing',
        ];

        return $statusMap[strtolower($providerStatus)] ?? 'pending';
    }
}
