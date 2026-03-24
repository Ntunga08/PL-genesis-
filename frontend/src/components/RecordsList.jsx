import { useState, useEffect } from 'react';

export default function RecordsList({ contract, account, patientAddress, isPatient, refreshKey }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRecords();
  }, [contract, account, patientAddress, refreshKey]);

  const loadRecords = async () => {
    if (!contract) return;

    setLoading(true);
    try {
      let recordsData;
      if (isPatient) {
        recordsData = await contract.getMyRecords();
      } else {
        recordsData = await contract.getRecords(patientAddress);
      }
      setRecords(recordsData);
    } catch (err) {
      console.error('Error loading records:', err);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    return new Date(Number(timestamp) * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 border border-slate-200">
      <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <span>📋</span> Medical Records
      </h3>

      {loading ? (
        <p className="text-sm text-slate-500">Loading records...</p>
      ) : records.length === 0 ? (
        <div className="text-center py-8">
          <span className="text-3xl mb-2 block">📭</span>
          <p className="text-sm text-slate-500">No records yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((record, index) => (
            <div 
              key={index}
              className="p-4 bg-slate-50 rounded-lg border border-slate-200"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {record.recordType === 'form' ? '📝' : '📁'}
                  </span>
                  <span className="text-xs font-semibold text-slate-700 uppercase">
                    {record.recordType}
                  </span>
                </div>
                <span className="text-xs text-slate-500">
                  {formatDate(record.timestamp)}
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500">IPFS:</span>
                  <span className="font-mono text-slate-700">
                    {record.ipfsHash.slice(0, 12)}...
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500">Added by:</span>
                  <span className="font-mono text-slate-700">
                    {record.addedBy.slice(0, 6)}...{record.addedBy.slice(-4)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
