import { useState, useEffect } from 'react';

export default function AccessList({ contract, account, refreshKey, onRevoke }) {
  const [authorizedList, setAuthorizedList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [revoking, setRevoking] = useState(null);

  useEffect(() => {
    loadAccessList();
  }, [contract, account, refreshKey]);

  const loadAccessList = async () => {
    if (!contract) return;
    
    setLoading(true);
    try {
      // Listen to past events to build the list
      const filter = contract.filters.AccessGranted(account);
      const events = await contract.queryFilter(filter);
      
      const addresses = [...new Set(events.map(e => e.args.attendant))];
      
      // Check which ones still have access
      const accessChecks = await Promise.all(
        addresses.map(addr => contract.hasAccess(account, addr))
      );
      
      const authorized = addresses.filter((_, i) => accessChecks[i]);
      setAuthorizedList(authorized);
    } catch (err) {
      console.error('Error loading access list:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (attendantAddress) => {
    setRevoking(attendantAddress);
    try {
      const tx = await contract.revokeAccess(attendantAddress);
      await tx.wait();
      onRevoke?.();
    } catch (err) {
      console.error('Error revoking access:', err);
    } finally {
      setRevoking(null);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 border border-slate-200">
      <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <span>👥</span> Authorized Medical Staff
      </h3>

      {loading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : authorizedList.length === 0 ? (
        <p className="text-sm text-slate-500">No authorized staff yet</p>
      ) : (
        <div className="space-y-2">
          {authorizedList.map((address) => (
            <div 
              key={address}
              className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
            >
              <span className="font-mono text-xs text-slate-700">
                {address.slice(0, 8)}...{address.slice(-6)}
              </span>
              <button
                onClick={() => handleRevoke(address)}
                disabled={revoking === address}
                className="px-3 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors disabled:opacity-50"
              >
                {revoking === address ? 'Revoking...' : 'Revoke'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
