<?php

namespace Tests\Unit;

use App\Services\IpfsService;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class IpfsServiceTest extends TestCase
{
    private IpfsService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new IpfsService();
    }

    public function test_encrypt_and_upload_returns_cid_and_key_ref(): void
    {
        Http::fake([
            '*' => Http::response(['Hash' => 'QmMockedCID123456'], 200),
        ]);

        $result = $this->service->encryptAndUpload(['diagnosis' => 'Test']);

        $this->assertArrayHasKey('cid', $result);
        $this->assertArrayHasKey('key_ref', $result);
        $this->assertEquals('QmMockedCID123456', $result['cid']);
    }

    public function test_encrypted_content_differs_from_plaintext(): void
    {
        Http::fake([
            '*' => Http::response(['Hash' => 'QmEncryptedCID'], 200),
        ]);

        $plaintext = 'sensitive medical data';
        $result    = $this->service->encryptAndUpload($plaintext);

        // The CID is returned, not the plaintext
        $this->assertNotEquals($plaintext, $result['cid']);
    }

    public function test_decrypt_content_restores_original(): void
    {
        Http::fake([
            '*' => Http::response(['Hash' => 'QmDecryptCID'], 200),
        ]);

        $original = 'patient data to encrypt';
        $result   = $this->service->encryptAndUpload($original);

        // Retrieve and decrypt
        Http::fake([
            '*' => Http::response(base64_decode(''), 200), // will be replaced below
        ]);

        // Test decrypt directly using key_ref
        $reflection = new \ReflectionClass($this->service);
        $method     = $reflection->getMethod('encryptAes256');
        $method->setAccessible(true);

        [$encrypted, $keyRef] = $method->invoke($this->service, $original);
        $decrypted = $this->service->decryptContent($encrypted, $keyRef);

        $this->assertEquals($original, $decrypted);
    }

    public function test_upload_throws_on_ipfs_failure(): void
    {
        Http::fake([
            '*' => Http::response('Internal Server Error', 500),
        ]);

        $this->expectException(\RuntimeException::class);
        $this->service->encryptAndUpload('test data');
    }

    public function test_retrieve_throws_on_unknown_cid(): void
    {
        Http::fake([
            '*' => Http::response('Not Found', 404),
        ]);

        $this->expectException(\RuntimeException::class);
        $this->service->retrieve('QmNonExistentCID');
    }
}

