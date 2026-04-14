<?php

namespace App\Http\Controllers;

use App\Services\MedicalRecordService;
use App\Services\StellarService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class StellarController extends Controller
{
    public function __construct(
        private readonly StellarService       $stellar,
        private readonly MedicalRecordService $recordService,
    ) {}

    /**
     * POST /api/stellar/store-hash
     * Manually anchor a CID hash on the Stellar blockchain.
     */
    public function storeHash(Request $request): JsonResponse
    {
        $request->validate([
            'cid' => 'required|string',
        ]);

        try {
            $txHash = $this->stellar->storeCidHash($request->input('cid'));
            return response()->json(['success' => true, 'tx_hash' => $txHash]);
        } catch (Throwable $e) {
            return response()->json(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /api/stellar/payment
     * Submit a payment transaction on Stellar.
     */
    public function payment(Request $request): JsonResponse
    {
        $request->validate([
            'destination' => 'required|string',
            'amount'      => 'required|numeric|min:0.0000001',
            'memo'        => 'nullable|string|max:28',
        ]);

        try {
            $txHash = $this->stellar->sendPayment(
                $request->input('destination'),
                (string) $request->input('amount'),
                $request->input('memo', '')
            );
            return response()->json(['success' => true, 'tx_hash' => $txHash]);
        } catch (Throwable $e) {
            return response()->json(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /api/stellar/verify/{cid}
     * Verify that a CID is anchored on the Stellar blockchain.
     */
    public function verify(string $cid): JsonResponse
    {
        try {
            $result = $this->recordService->verifyRecord($cid);
            return response()->json(['success' => true, ...$result]);
        } catch (Throwable $e) {
            return response()->json(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }
}
