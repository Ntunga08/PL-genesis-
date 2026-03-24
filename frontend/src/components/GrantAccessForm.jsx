import { useState } from 'react';

export default function GrantAccessForm({ contract, onSuccess }) {
  const [attendantAddress, setAttendantAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleGrantAccess = async (e) => {
    e.preventDefault();
    if (!contract || !attendantAddress) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const tx = await contract.grantAccess(attendantAddress);
      await tx.wait();
      
      setSuccess(`Access granted! TX: ${tx.hash.slice(0, 10)}...`);
      setAttendantAddress('');
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Failed to grant access');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 border border-slate-200">
      <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <span>🔑</span> Grant Access
      </h3>

      <form onSubmit={handleGrantAccess} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Medical Staff Wallet Address
          </label>
          <input
            type="text"
            value={attendantAddress}
            onChange={(e) => setAttendantAddress(e.target.value)}
            placeholder="0x..."
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm font-mono"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading || !attendantAddress}
          className="w-full bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
        >
          {loading ? 'Granting Access...' : 'Grant Access'}
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
