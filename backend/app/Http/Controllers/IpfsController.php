<?php

namespace App\Http\Controllers;

use App\Services\IpfsService;
use App\Repositories\MedicalRecordRepository;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class IpfsController extends Controller
{
    public function __construct(
        private readonly IpfsService             $ipfs,
        private readonly MedicalRecordRepository $repo,
    ) {}

    /**
     * POST /api/ipfs/upload
     * Encrypt and upload arbitrary data to IPFS.
     */
    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'data' => 'required',
        ]);

        try {
            $result = $this->ipfs->encryptAndUpload($request->input('data'));
            return response()->json(['success' => true, 'cid' => $result['cid']]);
        } catch (Throwable $e) {
            return response()->json(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /api/ipfs/{cid}
     * Retrieve encrypted content from IPFS by CID.
     * Returns raw encrypted bytes — caller must decrypt with their key.
     */
    public function retrieve(string $cid): JsonResponse
    {
        // Ensure the CID belongs to a known record (authorization check)
        $record = $this->repo->findByCid($cid);

        if (! $record) {
            return response()->json(['success' => false, 'error' => 'CID not found in system.'], 404);
        }

        try {
            $content = $this->ipfs->retrieve($cid);
            return response()->json([
                'success'  => true,
                'cid'      => $cid,
                'content'  => base64_encode($content), // base64 for safe JSON transport
            ]);
        } catch (Throwable $e) {
            return response()->json(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }
}
