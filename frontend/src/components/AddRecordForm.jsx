import { useState } from 'react';

export default function AddRecordForm({ contract, patientAddress, onSuccess }) {
  const [formData, setFormData] = useState({
    symptoms: '',
    diagnosis: '',
    treatment: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!contract || !patientAddress) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // For now, we'll use a mock IPFS hash
      // In Day 4, we'll add real encryption + IPFS upload
      const mockIpfsHash = `Qm${Date.now()}${Math.random().toString(36).slice(2)}`;
      
      const tx = await contract.addRecord(
        patientAddress,
        mockIpfsHash,
        'form'
      );
      await tx.wait();
      
      setSuccess(`Record added! TX: ${tx.hash.slice(0, 10)}...`);
      setFormData({ symptoms: '', diagnosis: '', treatment: '', notes: '' });
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Failed to add record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 border border-slate-200">
      <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <span>➕</span> Add Medical Record
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Symptoms
          </label>
          <input
            type="text"
            value={formData.symptoms}
            onChange={(e) => setFormData({...formData, symptoms: e.target.value})}
            placeholder="e.g., Fever, headache"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Diagnosis
          </label>
          <input
            type="text"
            value={formData.diagnosis}
            onChange={(e) => setFormData({...formData, diagnosis: e.target.value})}
            placeholder="e.g., Common cold"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Treatment
          </label>
          <input
            type="text"
            value={formData.treatment}
            onChange={(e) => setFormData({...formData, treatment: e.target.value})}
            placeholder="e.g., Rest, fluids, paracetamol"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({...formData, notes: e.target.value})}
            placeholder="Additional notes..."
            rows="3"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
        >
          {loading ? 'Adding Record...' : 'Add Record'}
        </button>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-600">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded text-xs text-green-600">
            {success}
          </div>
        )}
      </form>
    </div>
  );
}
