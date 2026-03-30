import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { LIT_NETWORK, LIT_CAPABILITY } from '@lit-protocol/constants';
import { encryptString, decryptToString } from '@lit-protocol/encryption';
import { checkAndSignAuthMessage, getSessionSigs, LitAccessControlConditionResource } from '@lit-protocol/auth-helpers';

let litNodeClient = null;

// Initialize Lit Protocol client
export async function initLitClient() {
  // If there's an existing client, return it if ready
  if (litNodeClient) {
    if (litNodeClient.ready) {
      return litNodeClient;
    }
    // Reset if not ready
    console.log('🔄 Resetting non-ready Lit client...');
    litNodeClient = null;
  }

  try {
    console.log('🔥 Initializing Lit Protocol client...');
    
    const client = new LitNodeClient({
      litNetwork: LIT_NETWORK.DatilTest,
      debug: false
    });

    await client.connect();
    
    if (!client.ready) {
      throw new Error('Lit client failed to become ready');
    }
    
    litNodeClient = client;
    console.log('✅ Lit Protocol client connected');
    
    return litNodeClient;
  } catch (err) {
    console.error('❌ Failed to initialize Lit client:', err);
    litNodeClient = null; // Reset on failure
    
    // Provide helpful error message for network issues
    if (err.message?.includes('fetch failed') || err.message?.includes('EHOSTUNREACH') || err.message?.includes('Failed to fetch') || err.message?.includes('net::ERR')) {
      throw new Error('Cannot connect to Lit Protocol network. Please check your internet connection and firewall settings.');
    }
    throw new Error(`Failed to initialize Lit Protocol: ${err.message}`);
  }
}

// Get Lit client instance (always use await to ensure connection is ready)
export async function getLitClient() {
  return await initLitClient();
}

// Create access control conditions for a specific wallet address
export function createAccessControlConditions(walletAddress) {
  return [
    {
      contractAddress: '',
      standardContractType: '',
      chain: 'ethereum',
      method: '',
      parameters: [':userAddress'],
      returnValueTest: {
        comparator: '=',
        value: walletAddress.toLowerCase()
      }
    }
  ];
}

// Encrypt data with Lit Protocol (v7 API)
export async function encryptWithLit(data, patientAddress, walletClient) {
  try {
    console.log('🔒 Starting Lit Protocol encryption...');
    
    const client = await getLitClient();
    
    // Convert data to string
    const dataString = JSON.stringify(data);
    
    // Create access control conditions - only patient can decrypt
    const accessControlConditions = createAccessControlConditions(patientAddress);
    
    // Encrypt using v7 API
    const { ciphertext, dataToEncryptHash } = await encryptString(
      {
        accessControlConditions,
        dataToEncrypt: dataString,
      },
      client
    );
    
    console.log('✅ Encryption successful');
    
    // Return the encrypted package
    return {
      ciphertext,
      dataToEncryptHash,
      accessControlConditions
    };
  } catch (err) {
    console.error('❌ Encryption failed:', err);
    throw new Error(`Lit Protocol encryption failed: ${err.message}`);
  }
}

// Decrypt data with Lit Protocol (v7 API)
export async function decryptWithLit(encryptedPackage, walletClient) {
  try {
    console.log('🔓 Starting Lit Protocol decryption...');
    
    const client = await getLitClient();
    
    // Get wallet address
    const address = walletClient.account.address;
    
    // Extract encrypted data
    const { ciphertext, dataToEncryptHash, accessControlConditions } = encryptedPackage;
    
    // Get session signatures for authentication using SIWE
    const sessionSigs = await getSessionSigs({
      chain: 'ethereum',
      expiration: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // 24 hours
      resourceAbilityRequests: [
        {
          resource: new LitAccessControlConditionResource('*'),
          ability: LIT_CAPABILITY.AccessControlConditionDecryption
        }
      ],
      authNeededCallback: async ({ resourceAbilityRequests, expiration }) => {
        // Check and sign SIWE auth message (proper SIWE format)
        const authSig = await checkAndSignAuthMessage({
          walletClient,
          chain: 'ethereum',
          expiration,
        });
        
        return authSig;
      }
    });
    
    // Decrypt using v7 API
    const decryptedString = await decryptToString(
      {
        accessControlConditions,
        ciphertext,
        dataToEncryptHash,
        sessionSigs,
        chain: 'ethereum'
      },
      client
    );
    
    console.log('✅ Decryption successful');
    
    // Parse JSON
    const parsedData = JSON.parse(decryptedString);
    
    return parsedData;
  } catch (err) {
    console.error('❌ Decryption failed:', err);
    throw new Error(`Lit Protocol decryption failed: ${err.message}`);
  }
}

// Disconnect Lit client
export async function disconnectLit() {
  if (litNodeClient) {
    await litNodeClient.disconnect();
    litNodeClient = null;
    console.log('🔌 Lit Protocol client disconnected');
  }
}
