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
  const [files, setFiles] = useState([]);
  const [customFields, setCustomFields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const addCustomField = () => {
    setCustomFields([...customFields, { name: '', value: '', type: 'text' }]);
  };

  const removeCustomField = (index) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const updateCustomField = (index, field, value) => {
    const updated = [...customFields];
    updated[index][field] = value;
    setCustomFields(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!contract || !patientAddress || !signer) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Get encryption key using PATIENT's address (so patient can decrypt later)
      const encryptionKey = await getEncryptionKey(signer, patientAddress);
      
      // Combine standard fields with custom fields
      const allData = {
        ...formData,
        customFields: customFields.reduce((acc, field) => {
          if (field.name && field.value) {
            acc[field.name] = field.value;
          }
          return acc;
        }, {}),
        timestamp: new Date().toISOString()
      };
      
      // Encrypt the form data
      const encryptedData = encryptData(allData, encryptionKey);
      
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
      setCustomFields([]);
      onSuccess?.();
    } catch (err) {
      console.error('Error:', err);
      setError(err.message || 'Failed to add record');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (files.length === 0 || !contract || !patientAddress) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const uploadedHashes = [];

      // Upload each file to IPFS
      for (const file of files) {
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
        uploadedHashes.push({ name: file.name, hash: result.IpfsHash });
      }

      // Store all file hashes on blockchain
      for (const { name, hash } of uploadedHashes) {
        const tx = await contract.addRecord(
          patientAddress,
          hash,
          `file:${name}`
        );
        await tx.wait();
      }

      setSuccess(`✅ ${files.length} file(s) uploaded successfully!`);
      setFiles([]);
      onSuccess?.();
    } catch (err) {
      console.error('Error:', err);
      setError(err.message || 'Failed to upload files');
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
        <p className="text-xs font-semibold text-slate-700 uppercase">Standard Fields</p>
        
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

        {/* Custom Fields */}
        {customFields.length > 0 && (
          <div className="pt-3 border-t border-slate-200">
            <p className="text-xs font-semibold text-slate-700 uppercase mb-2">Custom Fields</p>
            {customFields.map((field, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={field.name}
                  onChange={(e) => updateCustomField(index, 'name', e.target.value)}
                  placeholder="Field name (e.g., Blood Pressure)"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <select
                  value={field.type}
                  onChange={(e) => updateCustomField(index, 'type', e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                </select>
                <input
                  type={field.type}
                  value={field.value}
                  onChange={(e) => updateCustomField(index, 'value', e.target.value)}
                  placeholder="Value"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeCustomField(index)}
                  className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 text-sm"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={addCustomField}
          className="w-full px-4 py-2 border-2 border-dashed border-slate-300 text-slate-600 rounded-lg hover:border-blue-400 hover:text-blue-600 transition-colors text-sm font-medium"
        >
          + Add Custom Field
        </button>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm font-semibold"
        >
          {loading ? 'Processing...' : '🔒 Encrypt & Add Record'}
        </button>
      </form>

      {/* Multiple File Upload */}
      <div className="pt-6 border-t border-slate-200">
        <p className="text-xs font-semibold text-slate-700 uppercase mb-3">File Attachments</p>
        
        <input
          type="file"
          onChange={(e) => setFiles(Array.from(e.target.files))}
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          multiple
          className="w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 mb-2"
        />
        
        {files.length > 0 && (
          <div className="mb-3 p-3 bg-slate-50 rounded-lg">
            <p className="text-xs font-medium text-slate-700 mb-2">Selected files ({files.length}):</p>
            <ul className="space-y-1">
              {files.map((file, index) => (
                <li key={index} className="text-xs text-slate-600 flex items-center gap-2">
                  <span>📎</span>
                  <span>{file.name}</span>
                  <span className="text-slate-400">({(file.size / 1024).toFixed(1)} KB)</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="button"
          onClick={handleFileUpload}
          disabled={files.length === 0 || loading}
          className="w-full px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors disabled:opacity-50 text-sm font-semibold"
        >
          {loading ? 'Uploading...' : `📤 Upload ${files.length} File(s)`}
        </button>
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
