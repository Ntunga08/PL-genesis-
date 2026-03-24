import { useState, useEffect } from 'react';
import { getEncryptionKey, decryptData } from '../utils/encryption';
import { fetchFromIPFS } from '../utils/ipfs';
import RecordCard from './RecordCard';
import LoadingSpinner from './LoadingSpinner';

export default function RecordsListWithDecryption({ contract, account, patientAddress, isPatient, signer, refreshKey }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [decrypting, setDecrypting] = useState(false);

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

  const decryptRecords = async () => {
    if (!signer || records.length === 0) return;

    setDecrypting(true);
    try {
      const encryptionKey = await getEncryptionKey(signer);
      
      const decryptedRecords = await Promise.all(
        records.map(async (record) => {
          if (record.recordType === 'form') {
            try {
              const encryptedData = await fetchFromIPFS(record.ipfsHash);
              const decrypted = decryptData(encryptedData, encryptionKey);
              return { ...record, decryptedData: decrypted };
            } catch (err) {
              console.error('Decryption failed for record:', err);
              return record;
            }
          }
          return record;
        })
      );

      setRecords(decryptedRecords);
    } catch (err) {
      console.error('Error decrypting records:', err);
    } finally {
      setDecrypting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 border border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
          <span>📋</span> Medical Records
        </h3>
        
        {records.length > 0 && !records[0]?.decryptedData && (
          <button
            onClick={decryptRecords}
            disabled={decrypting}
            className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200 transition-colors disabled:opacity-50"
          >
            {decrypting ? 'Decrypting...' : '🔓 Decrypt All'}
          </button>
        )}
      </div>

      {loading ? (
        <LoadingSpinner message="Loading records..." />
      ) : records.length === 0 ? (
        <div className="text-center py-8">
          <span className="text-3xl mb-2 block">📭</span>
          <p className="text-sm text-slate-500">No records yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((record, index) => (
            <RecordCard key={index} record={record} />
          ))}
        </div>
      )}
    </div>
  );
}
