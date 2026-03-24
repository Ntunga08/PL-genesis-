const PINATA_JWT = import.meta.env.VITE_PINATA_JWT;
const PINATA_GATEWAY = 'https://gateway.pinata.cloud/ipfs/';

// Upload encrypted data to Pinata
export async function uploadToPinata(encryptedData, metadata = {}) {
  if (!PINATA_JWT) {
    throw new Error('Pinata JWT not configured');
  }

  const blob = new Blob([encryptedData], { type: 'application/octet-stream' });
  const formData = new FormData();
  formData.append('file', blob, 'encrypted-record.bin');
  
  const pinataMetadata = JSON.stringify({
    name: metadata.name || 'HealthLink Record',
    keyvalues: {
      type: metadata.type || 'medical-record',
      timestamp: Date.now().toString()
    }
  });
  formData.append('pinataMetadata', pinataMetadata);

  const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PINATA_JWT}`
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error('Failed to upload to IPFS');
  }

  const result = await response.json();
  return result.IpfsHash; // Returns CID
}

// Fetch encrypted data from IPFS
export async function fetchFromIPFS(ipfsHash) {
  const response = await fetch(`${PINATA_GATEWAY}${ipfsHash}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch from IPFS');
  }

  return await response.text();
}

// Upload file (PDF, image, etc.)
export async function uploadFileToPinata(file) {
  if (!PINATA_JWT) {
    throw new Error('Pinata JWT not configured');
  }

  const formData = new FormData();
  formData.append('file', file);
  
  const pinataMetadata = JSON.stringify({
    name: file.name,
    keyvalues: {
      type: 'medical-file',
      originalName: file.name,
      timestamp: Date.now().toString()
    }
  });
  formData.append('pinataMetadata', pinataMetadata);

  const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PINATA_JWT}`
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error('Failed to upload file to IPFS');
  }

  const result = await response.json();
  return result.IpfsHash;
}
