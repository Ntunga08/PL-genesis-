import { useState } from 'react';

export default function PatientAddressInput({ onPatientSelect, currentPatient }) {
  const [address, setAddress] = useState(currentPatient || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (address) {
      onPatientSelect(address);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 border border-slate-200">
      <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <span>🔍</span> Select Patient
      </h3>

      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Enter patient wallet address (0x...)"
          className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
          required
        />
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold"
        >
          Load
        </button>
      </form>

      {currentPatient && (
        <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
          Current: {currentPatient.slice(0, 10)}...{currentPatient.slice(-8)}
        </div>
      )}
    </div>
  );
}
