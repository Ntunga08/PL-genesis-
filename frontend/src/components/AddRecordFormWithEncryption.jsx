import { useState } from 'react';
import { getEncryptionKey, encryptData } from '../utils/encryption';
import { uploadToPinata } from '../utils/ipfs';

export default function AddRecordFormWithEncryption({ contract, patientAddress, signer, onSuccess }) {
  const [formData, setFormData] = useState({
    symptoms: '',
    diagnosis: '',
    treatment: '',
    notes: ''
  });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!contract || !patientAddress || !signer) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Get encryption key from wallet signature
      const encryptionKey = await getEncryptionKey(signer);
      
      // Encrypt the form data
      const encryptedData = encryptData(formData, encryptionKey);
      
      // Upload to IPFS
      const ipfsHash = await uploadToPinata(encryptedData, {
        name: `Medical Record - ${new Date().toISOString()}`,
        type: 'form'
      });
      
      // Store hash on blockchain
      const tx = await contract.addRecord(
        patientAddress,
        ipfsHash,
        'form'
      );
      await tx.wait();
      
      setSuccess(`✅ Record encrypted & stored! TX: ${tx.hash.slice(0, 10)}...`);
      setFormData({ symptoms: '', diagnosis: '', treatment: '', notes: '' });
      onSuccess?.();
    } catch (err) {
      console.error('Error:', err);
      setError(err.message || 'Failed to add record');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!file || !contract || !patientAddress) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // For files, we upload directly (encryption can be added later)
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_PINATA_JWT}`
        },
        body: formData
      });

      const result = await response.json();
      const ipfsHash = result.IpfsHash;

      // Store hash on blockchain
      const tx = await contract.addRecord(
        patientAddress,
        ipfsHash,
        'file'
      );
      await tx.wait();

      setSuccess(`✅ File uploaded! TX: ${tx.hash.slice(0, 10)}...`);
      setFile(null);
      onSuccess?.();
    } catch (err) {
      console.error('Error:', err);
      setError(err.message || 'Failed to upload file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 border border-slate-200">
      <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <span>➕</span> Add Medical Record
      </h3>

      {/* Form Record */}
      <form onSubmit={handleSubmit} className="space-y-3 mb-6">
        <p className="text-xs font-semibold text-slate-700 uppercase">Form Record</p>
        
        <input
          type="text"
          value={formData.symptoms}
          onChange={(e) => setFormData({...formData, symptoms: e.target.value})}
          placeholder="Symptoms"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          required
        />

        <input
          type="text"
          value={formData.diagnosis}
          onChange={(e) => setFormData({...formData, diagnosis: e.target.value})}
          placeholder="Diagnosis"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          required
        />

        <input
          type="text"
          value={formData.treatment}
          onChange={(e) => setFormData({...formData, treatment: e.target.value})}
          placeholder="Treatment"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          required
        />

        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({...formData, notes: e.target.value})}
          placeholder="Notes (optional)"
          rows="2"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm font-semibold"
        >
          {loading ? 'Processing...' : '🔒 Encrypt & Add Record'}
        </button>
      </form>

      {/* File Upload */}
      <div className="pt-6 border-t border-slate-200">
        <p className="text-xs font-semibold text-slate-700 uppercase mb-3">File Upload</p>
        
        <div className="flex gap-2">
          <input
            type="file"
            onChange={(e) => setFile(e.target.files[0])}
            accept=".pdf,.jpg,.jpeg,.png"
            className="flex-1 text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
          />
          <button
            type="button"
            onClick={handleFileUpload}
            disabled={!file || loading}
            className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors disabled:opacity-50 text-sm font-semibold"
          >
            Upload
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-xs text-red-600">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-xs text-green-600">
          {success}
        </div>
      )}
    </div>
  );
}
