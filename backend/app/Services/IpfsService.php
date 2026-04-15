<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * IpfsService
 *
 * Handles AES-256 encryption of medical data and upload/retrieval
 * to/from IPFS.
 *
 * Supports three drivers:
 *   - pinata  (recommended — free tier, no project ID needed)
 *   - infura  (legacy — requires project_id + project_secret)
 *   - local   (local IPFS daemon)
 *
 * IMPORTANT: Raw medical data is NEVER stored in the database or blockchain.
 * Only the IPFS CID is persisted.
 */
class IpfsService
{
    private string  $driver;
    private string  $gateway;
    private ?string $pinataApiKey;
    private ?string $pinataApiSecret;
    private ?string $pinataJwt;
    private ?string $infuraProjectId;
    private ?string $infuraProjectSecret;
    private ?string $infuraEndpoint;
    private ?string $localEndpoint;

    public function __construct()
    {
        $this->driver = config('ipfs.driver', 'pinata');

        // Pinata
        $this->pinataApiKey    = config('ipfs.pinata.api_key');
        $this->pinataApiSecret = config('ipfs.pinata.api_secret');
        $this->pinataJwt       = config('ipfs.pinata.jwt');

        // Infura (legacy)
        $this->infuraEndpoint      = config('ipfs.infura.endpoint');
        $this->infuraProjectId     = config('ipfs.infura.project_id');
        $this->infuraProjectSecret = config('ipfs.infura.project_secret');

        // Local
        $this->localEndpoint = config('ipfs.local.endpoint');

        // Gateway (for retrieval)
        $this->gateway = config('ipfs.gateway', 'https://gateway.pinata.cloud/ipfs');
    }

    /**
     * Encrypt data with AES-256-CBC and upload to IPFS.
     *
     * @param  string|array  $data
     * @return array{cid: string, key_ref: string}
     */
    public function encryptAndUpload(string|array $data): array
    {
        $plaintext = is_array($data) ? json_encode($data) : $data;

        [$encrypted, $keyRef] = $this->encryptAes256($plaintext);

        $cid = $this->uploadToIpfs($encrypted);

        Log::info('IpfsService: uploaded encrypted record', ['cid' => $cid, 'driver' => $this->driver]);

        return ['cid' => $cid, 'key_ref' => $keyRef];
    }

    /**
     * Upload a raw file (already encrypted externally) to IPFS.
     */
    public function uploadFile(string $encryptedContent, string $filename = 'record'): string
    {
        return $this->uploadToIpfs($encryptedContent, $filename);
    }

    /**
     * Retrieve content from IPFS by CID.
     */
    public function retrieve(string $cid): string
    {
        $url = "{$this->gateway}/{$cid}";

        $response = Http::timeout(30)->get($url);

        if (! $response->successful()) {
            throw new RuntimeException("IPFS retrieve failed for CID {$cid}: " . $response->status());
        }

        return $response->body();
    }

    /**
     * Decrypt AES-256-CBC content using a stored key reference.
     */
    public function decryptContent(string $encryptedContent, string $keyRef): string
    {
        [$key, $iv] = $this->resolveKeyRef($keyRef);

        $decrypted = openssl_decrypt(
            base64_decode($encryptedContent),
            'AES-256-CBC',
            $key,
            OPENSSL_RAW_DATA,
            $iv
        );

        if ($decrypted === false) {
            throw new RuntimeException('AES-256 decryption failed.');
        }

        return $decrypted;
    }

    // ─── Private ────────────────────────────────────────────────────────────

    private function uploadToIpfs(string $content, string $filename = 'record.enc'): string
    {
        return match ($this->driver) {
            'pinata' => $this->uploadViaPinata($content, $filename),
            'infura' => $this->uploadViaInfura($content, $filename),
            'local'  => $this->uploadViaLocal($content, $filename),
            default  => throw new RuntimeException("Unknown IPFS driver: {$this->driver}"),
        };
    }

    /**
     * Upload via Pinata API.
     * Docs: https://docs.pinata.cloud/api-reference/endpoint/ipfs/pin-file-to-ipfs
     */
    private function uploadViaPinata(string $content, string $filename): string
    {
        $client = Http::timeout(30);

        // Prefer JWT auth, fall back to API key + secret
        if ($this->pinataJwt) {
            $client = $client->withToken($this->pinataJwt);
        } elseif ($this->pinataApiKey && $this->pinataApiSecret) {
            $client = $client->withHeaders([
                'pinata_api_key'        => $this->pinataApiKey,
                'pinata_secret_api_key' => $this->pinataApiSecret,
            ]);
        } else {
            throw new RuntimeException('Pinata credentials not configured. Set IPFS_PINATA_JWT or IPFS_PINATA_API_KEY + IPFS_PINATA_API_SECRET in .env');
        }

        $response = $client
            ->attach('file', $content, $filename)
            ->post('https://api.pinata.cloud/pinning/pinFileToIPFS');

        if (! $response->successful()) {
            throw new RuntimeException('Pinata upload failed: ' . $response->body());
        }

        $cid = $response->json('IpfsHash');

        if (empty($cid)) {
            throw new RuntimeException('Pinata response missing IpfsHash.');
        }

        return $cid;
    }

    /**
     * Upload via Infura IPFS API (legacy).
     */
    private function uploadViaInfura(string $content, string $filename): string
    {
        $url = "{$this->infuraEndpoint}/api/v0/add";

        $client = Http::timeout(30);

        if ($this->infuraProjectId && $this->infuraProjectSecret) {
            $client = $client->withBasicAuth($this->infuraProjectId, $this->infuraProjectSecret);
        }

        $response = $client->attach('file', $content, $filename)->post($url);

        if (! $response->successful()) {
            throw new RuntimeException('Infura IPFS upload failed: ' . $response->body());
        }

        $cid = $response->json('Hash');

        if (empty($cid)) {
            throw new RuntimeException('Infura IPFS response missing Hash field.');
        }

        return $cid;
    }

    /**
     * Upload via local IPFS daemon.
     */
    private function uploadViaLocal(string $content, string $filename): string
    {
        $url = "{$this->localEndpoint}/api/v0/add";

        $response = Http::timeout(30)->attach('file', $content, $filename)->post($url);

        if (! $response->successful()) {
            throw new RuntimeException('Local IPFS upload failed: ' . $response->body());
        }

        $cid = $response->json('Hash');

        if (empty($cid)) {
            throw new RuntimeException('Local IPFS response missing Hash field.');
        }

        return $cid;
    }

    private function encryptAes256(string $plaintext): array
    {
        $key = random_bytes(32);
        $iv  = random_bytes(16);

        $ciphertext = openssl_encrypt(
            $plaintext,
            'AES-256-CBC',
            $key,
            OPENSSL_RAW_DATA,
            $iv
        );

        if ($ciphertext === false) {
            throw new RuntimeException('AES-256 encryption failed.');
        }

        $keyRef = base64_encode($key . ':' . $iv);

        return [base64_encode($ciphertext), $keyRef];
    }

    private function resolveKeyRef(string $keyRef): array
    {
        $decoded = base64_decode($keyRef);
        $parts   = explode(':', $decoded, 2);

        if (count($parts) !== 2) {
            throw new RuntimeException('Invalid key_ref format.');
        }

        return [$parts[0], $parts[1]];
    }
}
