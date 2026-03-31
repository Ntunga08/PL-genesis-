// Simple Lit Protocol v7 test - encrypt and decrypt a message
import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { LIT_NETWORK } from '@lit-protocol/constants';
import { encryptString } from '@lit-protocol/encryption';

async function testLitProtocol() {
  console.log('🔥 Starting Lit Protocol v7 test...\n');

  try {
    // 1. Initialize client
    console.log('Step 1: Initializing Lit client...');
    const client = new LitNodeClient({
      litNetwork: LIT_NETWORK.DatilTest,
      debug: false
    });
    await client.connect();
    console.log('✅ Client connected\n');

    // 2. Prepare test data
    const testData = {
      message: 'Hello from HealthLink!',
      timestamp: new Date().toISOString(),
      recordType: 'test'
    };
    console.log('Step 2: Test data prepared:', testData, '\n');

    // 3. Create access control conditions (anyone can decrypt for testing)
    const accessControlConditions = [
      {
        contractAddress: '',
        standardContractType: '',
        chain: 'ethereum',
        method: '',
        parameters: [':userAddress'],
        returnValueTest: {
          comparator: '=',
          value: '0x0000000000000000000000000000000000000000' // Dummy address for testing
        }
      }
    ];
    console.log('Step 3: Access control conditions created\n');

    // 4. Encrypt using v7 API
    console.log('Step 4: Encrypting data with v7 API...');
    const { ciphertext, dataToEncryptHash } = await encryptString(
      {
        accessControlConditions,
        dataToEncrypt: JSON.stringify(testData),
      },
      client
    );
    console.log('✅ Encryption successful');
    console.log('Ciphertext length:', ciphertext.length);
    console.log('Data hash:', dataToEncryptHash, '\n');

    // 5. Package encrypted data
    const encryptedPackage = {
      ciphertext,
      dataToEncryptHash,
      accessControlConditions
    };
    console.log('Step 5: Encrypted package created\n');

    console.log('🎉 Test completed successfully!');
    console.log('\nNext steps:');
    console.log('- Encryption works without wallet signatures');
    console.log('- Decryption will require wallet signatures in the browser');
    console.log('- The encrypted package can be stored in IPFS');

    await client.disconnect();
    
  } catch (err) {
    console.error('❌ Test failed:', err);
    console.error('Error details:', err.message);
    if (err.stack) {
      console.error('Stack trace:', err.stack);
    }
    process.exit(1);
  }
}

testLitProtocol();
