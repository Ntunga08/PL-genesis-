export default function RecordCard({ record, onDecrypt }) {
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
    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">
            {record.recordType === 'form' ? '📝' : '📁'}
          </span>
          <div>
            <span className="text-xs font-semibold text-slate-700 uppercase">
              {record.recordType}
            </span>
            <p className="text-xs text-slate-500">
              {formatDate(record.timestamp)}
            </p>
          </div>
        </div>
        
        {record.recordType === 'file' && (
          <a
            href={`https://gateway.pinata.cloud/ipfs/${record.ipfsHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200 transition-colors"
          >
            View File
          </a>
        )}
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">IPFS:</span>
          <span className="font-mono text-slate-700">
            {record.ipfsHash?.slice(0, 12) || 'N/A'}...
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">Added by:</span>
          <span className="font-mono text-slate-700">
            {record.addedBy?.slice(0, 6) || 'N/A'}...{record.addedBy?.slice(-4) || ''}
          </span>
        </div>
      </div>

      {record.decryptedData && (
        <div className="mt-3 pt-3 border-t border-slate-200">
          <div className="space-y-2 text-xs">
            {record.decryptedData.symptoms && (
              <div>
                <span className="font-semibold text-slate-700">Symptoms:</span>
                <span className="text-slate-600 ml-2">{record.decryptedData.symptoms}</span>
              </div>
            )}
            {record.decryptedData.diagnosis && (
              <div>
                <span className="font-semibold text-slate-700">Diagnosis:</span>
                <span className="text-slate-600 ml-2">{record.decryptedData.diagnosis}</span>
              </div>
            )}
            {record.decryptedData.treatment && (
              <div>
                <span className="font-semibold text-slate-700">Treatment:</span>
                <span className="text-slate-600 ml-2">{record.decryptedData.treatment}</span>
              </div>
            )}
            {record.decryptedData.notes && (
              <div>
                <span className="font-semibold text-slate-700">Notes:</span>
                <span className="text-slate-600 ml-2">{record.decryptedData.notes}</span>
              </div>
            )}
            {record.decryptedData.customFields && Object.keys(record.decryptedData.customFields).length > 0 && (
              <div className="pt-2 mt-2 border-t border-slate-200">
                <p className="font-semibold text-slate-700 mb-1">Custom Fields:</p>
                {Object.entries(record.decryptedData.customFields).map(([key, value]) => (
                  <div key={key} className="ml-2">
                    <span className="font-medium text-slate-600">{key}:</span>
                    <span className="text-slate-600 ml-2">{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
