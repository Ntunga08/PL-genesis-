import nacl from 'tweetnacl';
import { decodeUTF8, encodeUTF8, encodeBase64, decodeBase64 } from 'tweetnacl-util';

// Generate encryption key from wallet signature
export async function getEncryptionKey(signer, forAddress = null) {
  // If forAddress is provided, use that address in the message
  // This ensures patient and doctor use the same key (patient's key)
  const address = forAddress || (await signer.getAddress());
  const message = `HealthLink Encryption Key for ${address}`;
  const signature = await signer.signMessage(message);
  
  // Use first 32 bytes of signature as key
  const keyBytes = new Uint8Array(
    signature.slice(2).match(/.{1,2}/g).slice(0, 32).map(byte => parseInt(byte, 16))
  );
  
  return keyBytes;
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
