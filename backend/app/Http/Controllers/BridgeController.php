<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use App\Services\FiatToStellarBridgeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

/**
 * BridgeController
 *
 * Exposes manual bridge endpoints for:
 *  - Triggering a fiat→Stellar bridge for a specific payment
 *  - Getting the live TZS/XLM exchange rate
 *  - Converting a TZS amount to XLM
 */
class BridgeController extends Controller
{
    public function __construct(private readonly FiatToStellarBridgeService $bridge) {}

    /**
     * POST /api/bridge/payment/{payment_id}
     * Manually trigger fiat→Stellar bridge for a confirmed payment.
     */
    public function bridgePayment(Request $request, string $paymentId): JsonResponse
    {
        $payment = Payment::findOrFail($paymentId);

        if ($payment->status !== 'Completed') {
            return response()->json([
                'success' => false,
                'error'   => 'Payment must be Completed before bridging to Stellar.',
            ], 422);
        }

        $request->validate([
            'destination_wallet' => 'nullable|string',
            'cid'                => 'nullable|string',
            'insurance_number'   => 'nullable|string',
            'doctor_approved'    => 'nullable|boolean',
        ]);

        try {
            $result = $this->bridge->bridgePayment($payment, $request->only(
                'destination_wallet', 'cid', 'insurance_number', 'doctor_approved'
            ));
            return response()->json($result);
        } catch (Throwable $e) {
            return response()->json(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /api/bridge/rate
     * Get the current live TZS/XLM exchange rate.
     */
    public function getRate(): JsonResponse
    {
        try {
            $rate = $this->bridge->fetchLiveRate();
            return response()->json([
                'success'      => true,
                'tzs_per_xlm'  => $rate,
                'xlm_per_tzs'  => round(1 / $rate, 10),
                'source'       => 'CoinGecko',
            ]);
        } catch (Throwable $e) {
            return response()->json(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /api/bridge/convert?tzs=50000
     * Convert a TZS amount to XLM.
     */
    public function convert(Request $request): JsonResponse
    {
        $request->validate(['tzs' => 'required|numeric|min:1']);

        try {
            $xlm = $this->bridge->convertTzsToXlm((float) $request->input('tzs'));
            return response()->json([
                'success'    => true,
                'tzs'        => $request->input('tzs'),
                'xlm'        => $xlm,
                'rate_used'  => $this->bridge->fetchLiveRate(),
            ]);
        } catch (Throwable $e) {
            return response()->json(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }
}
