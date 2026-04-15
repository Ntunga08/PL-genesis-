<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * IpfsService
 *
 * Handles AES-256 encryption of medical data and upload/retrieval
 * to/from IPFS via Infura or a local node.
 *
 * IMPORTANT: Raw medical data is NEVER stored in the database or blockchain.
 * Only the IPFS CID is persisted.
 */
class IpfsService
{
    private string $endpoint;
    private string $gateway;
    private ?string $projectId;
    private ?string $projectSecret;

    public function __construct()
    {
        $driver = config('ipfs.driver', 'infura');

        if ($driver === 'infura') {
            $this->endpoint      = config('ipfs.infura.endpoint');
            $this->gateway       = config('ipfs.infura.gateway');
            $this->projectId     = config('ipfs.infura.project_id');
            $this->projectSecret = config('ipfs.infura.project_secret');
        } else {
            $this->endpoint      = config('ipfs.local.endpoint');
            $this->gateway       = config('ipfs.local.gateway');
            $this->projectId     = null;
            $this->projectSecret = null;
        }
    }

    /**
     * Encrypt data with AES-256-CBC and upload to IPFS.
     *
     * @param  string|array  $data  Raw medical data (string or array serialized to JSON)
     * @return array{cid: string, key_ref: string}
     */
    public function encryptAndUpload(string|array $data): array
    {
        $plaintext = is_array($data) ? json_encode($data) : $data;

        [$encrypted, $keyRef] = $this->encryptAes256($plaintext);

        $cid = $this->uploadToIpfs($encrypted);

        Log::info('IpfsService: uploaded encrypted record', ['cid' => $cid]);

        return ['cid' => $cid, 'key_ref' => $keyRef];
    }

    /**
     * Upload a raw file (already encrypted externally) to IPFS.
     *
     * @param  string  $encryptedContent  Binary or base64 content
     * @param  string  $filename
     * @return string  CID
     */
    public function uploadFile(string $encryptedContent, string $filename = 'record'): string
    {
        return $this->uploadToIpfs($encryptedContent, $filename);
    }

    /**
     * Retrieve content from IPFS by CID.
     *
     * @param  string  $cid
     * @return string  Raw (encrypted) content
     */
    public function retrieve(string $cid): string
    {
        $url = "{$this->gateway}/{$cid}";

        $response = $this->buildHttpClient()->get($url);

        if (! $response->successful()) {
            throw new RuntimeException("IPFS retrieve failed for CID {$cid}: " . $response->status());
        }

        return $response->body();
    }

    /**
     * Decrypt AES-256-CBC content using a stored key reference.
     * In production, key_ref should point to a KMS or Vault secret.
     *
     * @param  string  $encryptedContent
     * @param  string  $keyRef  Base64-encoded key:iv pair (for demo; use KMS in production)
     * @return string  Plaintext
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

    // ─── Private Helpers ────────────────────────────────────────────────────

    /**
     * Encrypt plaintext with AES-256-CBC.
     * Returns [base64_ciphertext, key_ref].
     *
     * NOTE: In production, store the key in AWS KMS / HashiCorp Vault.
     * key_ref here is a base64(key:iv) for demonstration only.
     */
    private function encryptAes256(string $plaintext): array
    {
        $key = random_bytes(32); // 256-bit key
        $iv  = random_bytes(16); // 128-bit IV

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

        // key_ref: base64(key . ':' . iv) — replace with KMS in production
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

    private function uploadToIpfs(string $content, string $filename = 'record.enc'): string
    {
        $url = "{$this->endpoint}/api/v0/add";

        $response = $this->buildHttpClient()
            ->attach('file', $content, $filename)
            ->post($url);

        if (! $response->successful()) {
            throw new RuntimeException('IPFS upload failed: ' . $response->body());
        }

        $json = $response->json();

        if (empty($json['Hash'])) {
            throw new RuntimeException('IPFS response missing Hash field.');
        }

        return $json['Hash'];
    }

    private function buildHttpClient()
    {
        $client = Http::timeout(30);

        if ($this->projectId && $this->projectSecret) {
            $client = $client->withBasicAuth($this->projectId, $this->projectSecret);
        }

        return $client;
    }
}

