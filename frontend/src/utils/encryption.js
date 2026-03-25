import nacl from 'tweetnacl';
import { decodeUTF8, encodeUTF8, encodeBase64, decodeBase64 } from 'tweetnacl-util';

// Generate encryption key from wallet signature
// CRITICAL: The signer must ALWAYS be the wallet that will decrypt (usually patient)
// For doctors encrypting patient records, they need the patient to generate the key first
export async function getEncryptionKey(signer) {
  try {
    // Handle both ethers signer and Wagmi walletClient
    let address, signature;
    
    if (signer.account) {
      // Wagmi walletClient
      address = signer.account.address;
      const message = `HealthLink Encryption Key for ${address}`;
      signature = await signer.signMessage({ message });
    } else {
      // Ethers signer
      address = await signer.getAddress();
      const message = `HealthLink Encryption Key for ${address}`;
      signature = await signer.signMessage(message);
    }
    
    // Use first 32 bytes of signature as key
    const keyBytes = new Uint8Array(
      signature.slice(2).match(/.{1,2}/g).slice(0, 32).map(byte => parseInt(byte, 16))
    );
    
    return keyBytes;
  } catch (err) {
    console.error('Error generating encryption key:', err);
    throw new Error('Failed to generate encryption key. Please try again.');
  }
}

// Encrypt data
export function encryptData(data, key) {
  const nonce = nacl.randomBytes(24);
  const messageUint8 = decodeUTF8(JSON.stringify(data));
  const encrypted = nacl.secretbox(messageUint8, nonce, key);
  
  // Combine nonce + encrypted data
  const fullMessage = new Uint8Array(nonce.length + encrypted.length);
  fullMessage.set(nonce);
  fullMessage.set(encrypted, nonce.length);
  
  return encodeBase64(fullMessage);
}

// Decrypt data
export function decryptData(encryptedBase64, key) {
  const fullMessage = decodeBase64(encryptedBase64);
  
  const nonce = fullMessage.slice(0, 24);
  const encrypted = fullMessage.slice(24);
  
  const decrypted = nacl.secretbox.open(encrypted, nonce, key);
  
  if (!decrypted) {
    throw new Error('Decryption failed');
  }
  
  return JSON.parse(encodeUTF8(decrypted));
}
