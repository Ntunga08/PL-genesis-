<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use App\Models\Invoice;
use App\Services\FiatToStellarBridgeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class ZenoPayController extends Controller
{
    private $apiKey;
    private $merchantId;
    private $apiUrl;
    private $callbackUrl;
    private $returnUrl;

    public function __construct()
    {
        $this->apiKey = env('ZENOPAY_API_KEY');
        $this->merchantId = env('ZENOPAY_MERCHANT_ID');
        $this->apiUrl = env('ZENOPAY_API_URL', 'https://api.zenopay.com');
        $this->callbackUrl = env('ZENOPAY_CALLBACK_URL');
        $this->returnUrl = env('ZENOPAY_RETURN_URL');
    }

    /**
     * Initiate ZenoPay payment
     */
    public function initiatePayment(Request $request)
    {
        // Log the incoming request for debugging
        Log::info('ZenoPay initiate payment request:', [
            'data' => $request->all(),
            'headers' => $request->headers->all()
        ]);

        $validated = $request->validate([
            'invoice_id' => 'nullable|uuid|exists:invoices,id', // Made optional for registration payments
            'patient_id' => 'nullable|uuid|exists:patients,id', // For payments without invoice
            'amount' => 'required|numeric|min:100', // Reduced minimum for testing
            'customer_name' => 'required|string',
            'customer_email' => 'required|email',
            'customer_phone' => 'required|string',
            'payment_method' => 'required|string', // Add this validation rule
            'payment_type' => 'nullable|string', // e.g., 'Registration', 'Consultation', 'Invoice', 'Quick Service'
            'service_id' => 'nullable|uuid', // For Quick Service
            'service_name' => 'nullable|string', // For Quick Service
            'quantity' => 'nullable|integer|min:1', // For Quick Service
            'unit_price' => 'nullable|numeric|min:0', // For Quick Service
        ]);

        try {
            // Handle both invoice payments and direct payments (registration, consultation)
            $invoice = null;
            $patientId = null;
            
            if (!empty($validated['invoice_id'])) {
                $invoice = Invoice::with('patient')->findOrFail($validated['invoice_id']);
                $patientId = $invoice->patient_id;
                $reference = 'INV-' . $invoice->invoice_number . '-' . time();
            } else {
                // Direct payment without invoice (registration, consultation fee)
                $patientId = $validated['patient_id'] ?? null;
                $paymentType = $validated['payment_type'] ?? 'Payment';
                // Remove spaces from payment type for order_id (ZenoPay webhook issue)
                $paymentTypeClean = str_replace(' ', '_', strtoupper($paymentType));
                $reference = $paymentTypeClean . '-' . time() . '-' . rand(1000, 9999);
            }

            // Prepare ZenoPay request for mobile money Tanzania
            $paymentData = [
                'order_id' => $reference,
                'buyer_name' => $validated['customer_name'],
                'buyer_phone' => $validated['customer_phone'],
                'buyer_email' => $validated['customer_email'],
                'amount' => (int) $validated['amount'],
                'webhook_url' => $this->callbackUrl,
                'metadata' => [
                    'invoice_id' => $invoice ? $invoice->id : null,
                    'invoice_number' => $invoice ? $invoice->invoice_number : null,
                    'patient_id' => $patientId,
                    'payment_type' => $validated['payment_type'] ?? 'Payment',
                    'payment_method' => $validated['payment_method'] ?? 'Mobile Money',
                    'service_id' => $validated['service_id'] ?? null,
                    'service_name' => $validated['service_name'] ?? null,
                    'quantity' => $validated['quantity'] ?? null,
                    'unit_price' => $validated['unit_price'] ?? null,
                ],
            ];

            Log::info('ZenoPay payment request:', [
                'url' => $this->apiUrl . '/api/payments/mobile_money_tanzania',
                'data' => $paymentData,
                'has_api_key' => !empty($this->apiKey),
                'api_key_length' => strlen($this->apiKey ?? ''),
            ]);

            // Check if we're in test/development mode
            $testMode = filter_var(env('ZENOPAY_TEST_MODE', false), FILTER_VALIDATE_BOOLEAN);
            
            if ($testMode) {
                // DEVELOPMENT MODE: Simulate successful payment
                Log::info('ZenoPay TEST MODE: Simulating payment (API not called)');
                Log::info('Payment details:', [
                    'patient_id' => $patientId,
                    'payment_type' => $validated['payment_type'] ?? 'NOT SET',
                    'amount' => $validated['amount']
                ]);
                
                // Create COMPLETED payment record immediately in test mode
                // (In production, payment starts as Pending and webhook updates it)
                $payment = Payment::create([
                    'id' => Str::uuid(),
                    'patient_id' => $patientId,
                    'invoice_id' => $invoice ? $invoice->id : null,
                    'amount' => $validated['amount'],
                    'payment_method' => 'Mobile Money (Test)',
                    'payment_type' => $validated['payment_type'] ?? 'Payment',
                    'status' => 'Completed', // Auto-complete in test mode
                    'payment_date' => now(),
                    'reference_number' => $reference,
                    'notes' => 'TEST MODE: Payment auto-completed (simulated)',
                ]);
                
                // For registration payments, create visit immediately
                if (($validated['payment_type'] ?? '') === 'Registration' && $patientId) {
                    $existingVisit = \App\Models\PatientVisit::where('patient_id', $patientId)
                        ->where('overall_status', 'Active')
                        ->first();
                    
                    if (!$existingVisit) {
                        \App\Models\PatientVisit::create([
                            'id' => Str::uuid(),
                            'patient_id' => $patientId,
                            'visit_date' => now(),
                            'status' => 'Active',
                            'overall_status' => 'Active',
                            'current_stage' => 'nurse',
                            'reception_status' => 'Completed',
                            'nurse_status' => 'Pending',
                            'doctor_status' => 'Pending',
                            'lab_status' => 'Pending',
                            'pharmacy_status' => 'Pending',
                            'billing_status' => 'Pending',
                        ]);
                        
                        Log::info('TEST MODE: Visit created immediately');
                    }
                }

                // For Quick Service payments, create service and visit immediately
                if (($validated['payment_type'] ?? '') === 'Quick Service' && $patientId) {
                    $serviceId = $validated['service_id'] ?? null;
                    $quantity = $validated['quantity'] ?? 1;
                    $unitPrice = $validated['unit_price'] ?? 0;
                    $serviceName = $validated['service_name'] ?? 'Quick Service';

                    // Create patient service record
                    if ($serviceId) {
                        \App\Models\PatientService::create([
                            'id' => Str::uuid(),
                            'patient_id' => $patientId,
                            'service_id' => $serviceId,
                            'quantity' => $quantity,
                            'unit_price' => $unitPrice,
                            'total_price' => $validated['amount'],
                            'service_date' => now()->toDateString(),
                            'status' => 'Completed',
                            'service_name' => $serviceName,
                        ]);
                        
                        Log::info('TEST MODE: Patient service created for Quick Service');
                    }

                    // Create visit for quick service
                    $existingVisit = \App\Models\PatientVisit::where('patient_id', $patientId)
                        ->where('overall_status', 'Active')
                        ->first();
                    
                    if (!$existingVisit) {
                        \App\Models\PatientVisit::create([
                            'id' => Str::uuid(),
                            'patient_id' => $patientId,
                            'visit_date' => now()->toDateString(),
                            'reception_status' => 'Checked In',
                            'reception_completed_at' => now(),
                            'current_stage' => 'nurse',
                            'nurse_status' => 'Pending',
                            'lab_status' => 'Not Required',
                            'overall_status' => 'Active',
                            'visit_type' => 'Quick Service',
                        ]);
                        
                        Log::info('TEST MODE: Visit created for Quick Service');
                    }
                }

                return response()->json([
                    'success' => true,
                    'reference' => $reference,
                    'message' => 'TEST MODE: Payment completed (simulated). Patient added to queue.',
                    'test_mode' => true, // Indicate test mode so frontend shows success immediately
                ]);
            }

            // PRODUCTION MODE: Call real ZenoPay API
            
            // Check if API key is configured
            if (empty($this->apiKey)) {
                Log::error('ZenoPay API key not configured');
                return response()->json([
                    'success' => false,
                    'message' => 'Payment gateway not configured. Please contact support.',
                    'error' => 'API_KEY_MISSING',
                    'details' => 'ZenoPay API key is not set. Please configure ZENOPAY_API_KEY in .env file or enable TEST MODE.',
                ], 400);
            }
            
            try {
                $response = Http::timeout(10)->withHeaders([
                    'x-api-key' => $this->apiKey,
                    'Content-Type' => 'application/json',
                    'Accept' => 'application/json',
                ])->post($this->apiUrl . '/api/payments/mobile_money_tanzania', $paymentData);

                Log::info('ZenoPay response:', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                    'successful' => $response->successful(),
                ]);
            } catch (\Exception $apiError) {
                Log::error('ZenoPay API connection error:', [
                    'error' => $apiError->getMessage(),
                    'url' => $this->apiUrl . '/api/payments/mobile_money_tanzania',
                ]);
                
                // Return error with helpful message
                return response()->json([
                    'success' => false,
                    'message' => 'Unable to connect to ZenoPay API. Please contact ZenoPay support to verify API endpoint and credentials.',
                    'error' => 'API_CONNECTION_TIMEOUT',
                    'details' => 'The payment gateway is not responding. Please enable TEST MODE in .env or contact ZenoPay support.',
                ], 500);
            }

            if ($response->successful()) {
                $data = $response->json();

                // Create pending payment record
                Payment::create([
                    'id' => Str::uuid(),
                    'patient_id' => $patientId,
                    'invoice_id' => $invoice ? $invoice->id : null,
                    'amount' => $validated['amount'],
                    'payment_method' => 'ZenoPay',
                    'payment_type' => $validated['payment_type'] ?? 'Invoice Payment',
                    'status' => 'Pending',
                    'payment_date' => now(),
                    'reference_number' => $reference,
                    'notes' => 'ZenoPay payment initiated',
                ]);

                return response()->json([
                    'success' => true,
                    'payment_url' => $data['payment_url'] ?? null,
                    'reference' => $reference,
                    'message' => 'Payment initiated successfully',
                ]);
            }

            // ZenoPay returned an error
            $errorData = $response->json();
            $status = $response->status();
            
            Log::error('ZenoPay API error:', [
                'status' => $status,
                'error' => $errorData,
                'request' => $paymentData
            ]);

            // Handle specific error codes
            if ($status === 403) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid ZenoPay API credentials. Please contact support.',
                    'error' => 'INVALID_API_KEY',
                    'details' => 'The ZenoPay API key is invalid or expired. Please update ZENOPAY_API_KEY in .env file.',
                ], 400);
            }

            return response()->json([
                'success' => false,
                'message' => $errorData['message'] ?? 'Failed to initiate payment with ZenoPay',
                'error' => $errorData,
                'zenopay_status' => $status,
            ], 400);

        } catch (\Exception $e) {
            Log::error('ZenoPay initiation error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Payment initiation failed',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Handle ZenoPay callback/webhook
     */
    public function handleCallback(Request $request)
    {
        // Log all webhook data for debugging
        Log::info('ZenoPay webhook received:', [
            'headers' => $request->headers->all(),
            'body' => $request->all(),
            'raw_body' => $request->getContent()
        ]);

        try {
            // Verify webhook signature
            $signature = $request->header('X-ZenoPay-Signature');
            $webhookSecret = env('ZENOPAY_WEBHOOK_SECRET');
            
            if ($webhookSecret && $signature) {
                $expectedSignature = hash_hmac('sha256', $request->getContent(), $webhookSecret);
                if (!hash_equals($expectedSignature, $signature)) {
                    Log::warning('Invalid ZenoPay webhook signature');
                    return response()->json(['error' => 'Invalid signature'], 401);
                }
            }

            $data = $request->all();
            $orderId = $data['order_id'] ?? null;
            $reference = $data['reference'] ?? null;
            $status = $data['status'] ?? $data['payment_status'] ?? null;

            Log::info('Processing webhook:', [
                'order_id' => $orderId,
                'reference' => $reference,
                'status' => $status
            ]);

            if (!$orderId && !$reference) {
                Log::error('Webhook missing order_id and reference');
                return response()->json(['error' => 'Missing order_id or reference'], 400);
            }

            // Find payment by order_id (which we stored as reference_number) or by the ZenoPay reference
            $payment = Payment::where('reference_number', $orderId)
                ->orWhere('reference_number', $reference)
                ->first();

            if (!$payment) {
                Log::warning('Payment not found', [
                    'searched_order_id' => $orderId,
                    'searched_reference' => $reference,
                    'all_recent_payments' => Payment::orderBy('created_at', 'desc')->limit(5)->pluck('reference_number')
                ]);
                return response()->json(['error' => 'Payment not found'], 404);
            }

            Log::info('Payment found:', [
                'payment_id' => $payment->id,
                'current_status' => $payment->status,
                'payment_type' => $payment->payment_type,
                'patient_id' => $payment->patient_id
            ]);

            // Update payment with ZenoPay reference if different
            if ($reference && $payment->reference_number !== $reference) {
                $payment->notes = ($payment->notes ? $payment->notes . ' | ' : '') . 'ZenoPay Ref: ' . $reference;
            }

            // Update payment status (case-insensitive check)
            if (strtolower($status) === 'success' || strtolower($status) === 'completed') {
                $payment->status = 'Completed';
                $payment->notes = 'Payment completed via ZenoPay';
                $payment->save();

                // ── Bridge fiat payment to Stellar blockchain ──────────────
                try {
                    $bridge = app(FiatToStellarBridgeService::class);
                    $bridgeResult = $bridge->bridgePayment($payment, [
                        'insurance_number' => $data['metadata']['insurance_number'] ?? null,
                        'doctor_approved'  => $data['metadata']['doctor_approved'] ?? false,
                        'cid'              => $data['metadata']['cid'] ?? null,
                    ]);
                    Log::info('ZenoPay: fiat→Stellar bridge completed', $bridgeResult);
                } catch (\Throwable $e) {
                    // Bridge failure must NOT block the fiat payment confirmation
                    Log::error('ZenoPay: fiat→Stellar bridge failed', ['error' => $e->getMessage()]);
                }
                // ───────────────────────────────────────────────────────────

                // Update invoice
                if ($payment->invoice_id) {
                    $invoice = Invoice::find($payment->invoice_id);
                    if ($invoice) {
                        $invoice->paid_amount += $payment->amount;
                        $invoice->balance = $invoice->total_amount - $invoice->paid_amount;
                        
                        if ($invoice->balance <= 0) {
                            $invoice->status = 'Paid';
                        } elseif ($invoice->paid_amount > 0) {
                            $invoice->status = 'Partial';
                        }
                        
                        $invoice->save();
                    }
                }

                // For registration payments, create a visit so patient appears in nurse queue
                if ($payment->payment_type === 'Registration' && $payment->patient_id) {
                    // Check if visit already exists
                    $existingVisit = \App\Models\PatientVisit::where('patient_id', $payment->patient_id)
                        ->where('overall_status', 'Active')
                        ->first();
                    
                    if (!$existingVisit) {
                        // Create new visit
                        \App\Models\PatientVisit::create([
                            'id' => \Illuminate\Support\Str::uuid(),
                            'patient_id' => $payment->patient_id,
                            'visit_date' => now(),
                            'status' => 'Active',
                            'overall_status' => 'Active',
                            'current_stage' => 'nurse',
                            'reception_status' => 'Completed',
                            'nurse_status' => 'Pending',
                            'doctor_status' => 'Pending',
                            'lab_status' => 'Pending',
                            'pharmacy_status' => 'Pending',
                            'billing_status' => 'Pending',
                        ]);
                        
                        Log::info('Visit created for registration payment: ' . $payment->patient_id);
                    }
                }

                // For consultation payments (returning patients), create a visit
                if ($payment->payment_type === 'Consultation' && $payment->patient_id) {
                    // Check if visit already exists
                    $existingVisit = \App\Models\PatientVisit::where('patient_id', $payment->patient_id)
                        ->where('overall_status', 'Active')
                        ->first();
                    
                    if (!$existingVisit) {
                        // Create new visit for returning patient
                        \App\Models\PatientVisit::create([
                            'id' => \Illuminate\Support\Str::uuid(),
                            'patient_id' => $payment->patient_id,
                            'visit_date' => now(),
                            'status' => 'Active',
                            'overall_status' => 'Active',
                            'current_stage' => 'nurse',
                            'reception_status' => 'Completed',
                            'nurse_status' => 'Pending',
                            'doctor_status' => 'Pending',
                            'lab_status' => 'Pending',
                            'pharmacy_status' => 'Pending',
                            'billing_status' => 'Pending',
                        ]);
                        
                        Log::info('Visit created for consultation payment (returning patient): ' . $payment->patient_id);
                    }
                }

                // For appointment fee payments, update appointment status and create visit
                if ($payment->payment_type === 'Appointment Fee' && $payment->patient_id) {
                    // Check if visit already exists
                    $existingVisit = \App\Models\PatientVisit::where('patient_id', $payment->patient_id)
                        ->where('overall_status', 'Active')
                        ->first();
                    
                    if (!$existingVisit) {
                        // Create new visit for appointment check-in
                        \App\Models\PatientVisit::create([
                            'id' => \Illuminate\Support\Str::uuid(),
                            'patient_id' => $payment->patient_id,
                            'visit_date' => now(),
                            'status' => 'Active',
                            'overall_status' => 'Active',
                            'current_stage' => 'nurse',
                            'reception_status' => 'Completed',
                            'nurse_status' => 'Pending',
                            'doctor_status' => 'Pending',
                            'lab_status' => 'Pending',
                            'pharmacy_status' => 'Pending',
                            'billing_status' => 'Pending',
                        ]);
                        
                        Log::info('Visit created for appointment fee payment: ' . $payment->patient_id);
                    }
                    
                    // Try to update appointment status if invoice_id corresponds to appointment
                    try {
                        $appointment = \App\Models\Appointment::find($payment->invoice_id);
                        if ($appointment) {
                            $appointment->update(['status' => 'Checked In']);
                            Log::info('Appointment checked in via payment: ' . $appointment->id);
                        }
                    } catch (\Exception $e) {
                        Log::warning('Could not update appointment status: ' . $e->getMessage());
                    }
                }

                // For Quick Service payments, create service and visit after payment confirmed
                if ($payment->payment_type === 'Quick Service' && $payment->patient_id) {
                    // Get service details from payment metadata
                    $metadata = $data['metadata'] ?? [];
                    $serviceId = $metadata['service_id'] ?? null;
                    $quantity = $metadata['quantity'] ?? 1;
                    $unitPrice = $metadata['unit_price'] ?? 0;
                    $serviceName = $metadata['service_name'] ?? 'Quick Service';

                    // Create patient service record
                    if ($serviceId) {
                        \App\Models\PatientService::create([
                            'id' => \Illuminate\Support\Str::uuid(),
                            'patient_id' => $payment->patient_id,
                            'service_id' => $serviceId,
                            'quantity' => $quantity,
                            'unit_price' => $unitPrice,
                            'total_price' => $payment->amount,
                            'service_date' => now()->toDateString(),
                            'status' => 'Completed',
                            'service_name' => $serviceName,
                        ]);
                        
                        Log::info('Patient service created for Quick Service payment');
                    }

                    // Create visit for quick service (nurse → doctor → billing, NO lab)
                    $existingVisit = \App\Models\PatientVisit::where('patient_id', $payment->patient_id)
                        ->where('overall_status', 'Active')
                        ->first();
                    
                    if (!$existingVisit) {
                        \App\Models\PatientVisit::create([
                            'id' => \Illuminate\Support\Str::uuid(),
                            'patient_id' => $payment->patient_id,
                            'visit_date' => now()->toDateString(),
                            'reception_status' => 'Checked In',
                            'reception_completed_at' => now(),
                            'current_stage' => 'nurse',
                            'nurse_status' => 'Pending',
                            'lab_status' => 'Not Required',
                            'overall_status' => 'Active',
                            'visit_type' => 'Quick Service',
                        ]);
                        
                        Log::info('Visit created for Quick Service payment: ' . $payment->patient_id);
                    }
                }

                // For billing invoice payments, complete the visit after payment confirmed
                if ($payment->invoice_id && $payment->patient_id) {
                    $invoice = Invoice::find($payment->invoice_id);
                    
                    if ($invoice) {
                        // Check if invoice is now fully paid
                        if ($invoice->status === 'Paid' || $invoice->paid_amount >= $invoice->total_amount) {
                            // Find active visit for this patient in billing stage
                            $visit = \App\Models\PatientVisit::where('patient_id', $payment->patient_id)
                                ->where('current_stage', 'billing')
                                ->where('overall_status', 'Active')
                                ->first();
                            
                            // If no visit in billing, try to find any active visit
                            if (!$visit) {
                                $visit = \App\Models\PatientVisit::where('patient_id', $payment->patient_id)
                                    ->where('overall_status', 'Active')
                                    ->first();
                            }
                            
                            if ($visit) {
                                // Complete the visit
                                $visit->billing_status = 'Paid';
                                $visit->billing_completed_at = now();
                                $visit->current_stage = 'completed';
                                $visit->overall_status = 'Completed';
                                $visit->updated_at = now();
                                $visit->save();
                                
                                Log::info('Visit completed after billing payment: ' . $visit->id);
                            } else {
                                // Create a completed visit record if none exists
                                \App\Models\PatientVisit::create([
                                    'id' => \Illuminate\Support\Str::uuid(),
                                    'patient_id' => $payment->patient_id,
                                    'visit_date' => now()->toDateString(),
                                    'reception_status' => 'Completed',
                                    'nurse_status' => 'Completed',
                                    'doctor_status' => 'Completed',
                                    'lab_status' => 'Not Required',
                                    'pharmacy_status' => 'Completed',
                                    'billing_status' => 'Paid',
                                    'billing_completed_at' => now(),
                                    'current_stage' => 'completed',
                                    'overall_status' => 'Completed',
                                ]);
                                
                                Log::info('Created completed visit record for billing payment');
                            }
                        }
                    }
                }

                Log::info('ZenoPay payment completed: ' . $reference);
            } elseif ($status === 'failed' || $status === 'cancelled') {
                $payment->status = 'Failed';
                $payment->notes = 'Payment ' . $status . ' via ZenoPay';
                $payment->save();

                Log::info('ZenoPay payment ' . $status . ': ' . $reference);
            }

            return response()->json(['success' => true]);

        } catch (\Exception $e) {
            Log::error('ZenoPay callback error: ' . $e->getMessage());
            return response()->json(['error' => 'Callback processing failed'], 500);
        }
    }

    /**
     * Verify payment status
     */
    public function verifyPayment(Request $request)
    {
        $validated = $request->validate([
            'reference' => 'required|string',
        ]);

        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $this->apiKey,
                'Content-Type' => 'application/json',
            ])->get($this->apiUrl . '/v1/payments/verify/' . $validated['reference']);

            if ($response->successful()) {
                $data = $response->json();

                // Update local payment record
                $payment = Payment::where('reference_number', $validated['reference'])->first();
                
                if ($payment && isset($data['status'])) {
                    if ($data['status'] === 'success' || $data['status'] === 'completed') {
                        $payment->status = 'Completed';
                    } elseif ($data['status'] === 'failed' || $data['status'] === 'cancelled') {
                        $payment->status = 'Failed';
                    }
                    $payment->save();
                }

                return response()->json([
                    'success' => true,
                    'status' => $data['status'] ?? 'unknown',
                    'data' => $data,
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Failed to verify payment',
            ], 400);

        } catch (\Exception $e) {
            Log::error('ZenoPay verification error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Payment verification failed',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get payment status
     */
    public function getPaymentStatus($reference)
    {
        try {
            $payment = Payment::where('reference_number', $reference)->first();

            if (!$payment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Payment not found',
                ], 404);
            }

            return response()->json([
                'success' => true,
                'payment' => $payment,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get payment status',
            ], 500);
        }
    }
}
