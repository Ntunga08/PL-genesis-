import { encryptWithLit, decryptWithLit } from './litProtocol';

// Encrypt medical record data using Lit Protocol
// patientAddress: The wallet address that will be able to decrypt (usually the patient)
// walletClient: The Wagmi wallet client for signing
export async function encryptData(data, patientAddress, walletClient) {
  try {
    console.log('🔒 Encrypting data with Lit Protocol...');
    
    // Encrypt with Lit Protocol
    const encryptedPackage = await encryptWithLit(data, patientAddress, walletClient);
    
    console.log('✅ Data encrypted successfully');
    return encryptedPackage;
  } catch (err) {
    console.error('❌ Encryption error:', err);
    throw new Error(`Failed to encrypt data: ${err.message}`);
  }
}

// Decrypt medical record data using Lit Protocol
// encryptedPackage: The encrypted data package from Lit Protocol
// walletClient: The Wagmi wallet client for signing
export async function decryptData(encryptedPackage, walletClient) {
  try {
    console.log('🔓 Decrypting data with Lit Protocol...');
    
    // Decrypt with Lit Protocol
    const decryptedData = await decryptWithLit(encryptedPackage, walletClient);
    
    console.log('✅ Data decrypted successfully');
    return decryptedData;
  } catch (err) {
    console.error('❌ Decryption error:', err);
    throw new Error(`Failed to decrypt data: ${err.message}`);
  }
}
