import { useState, useEffect } from 'react';
import { fetchFromIPFS } from '../utils/ipfs';
import { decryptData } from '../utils/encryption';
import RecordCard from './RecordCard';
import LoadingSpinner from './LoadingSpinner';
import { useWalletClient } from 'wagmi';

export default function RecordsListWithDecryption({ contract, account, patientAddress, isPatient, signer, refreshKey }) {
  const { data: walletClient } = useWalletClient();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [decryptingAll, setDecryptingAll] = useState(false);
  const [timeFilter, setTimeFilter] = useState('all');

  useEffect(() => {
    loadRecords();
  }, [contract, account, patientAddress, refreshKey]);

  const loadRecords = async () => {
    if (!contract) {
      console.log('No contract available');
      return;
    }

    setLoading(true);
    try {
      console.log('=== LOADING RECORDS ===');
      console.log('isPatient:', isPatient);
      console.log('account:', account);
      console.log('patientAddress:', patientAddress);
      
      let recordsData;
      
      if (isPatient) {
        recordsData = await contract.getMyRecords();
      } else {
        recordsData = await contract.getRecords(patientAddress);
      }
      
      console.log('Raw records from contract:', recordsData);
      
      // Convert BigInt to regular numbers and format data
      // FILTER OUT CHAT MESSAGES - they should only appear in ChatBox
      const formattedRecords = recordsData
        .filter(record => {
          const recordType = record.recordType || record[1];
          return recordType !== 'chat'; // Exclude chat messages
        })
        .map((record, index) => {
          console.log(`Record ${index}:`, record);
          const formatted = {
            ipfsHash: record.ipfsHash || record[0],
            recordType: record.recordType || record[1],
            timestamp: record.timestamp || record[2],
            addedBy: record.addedBy || record[3]
          };
          console.log(`Formatted record ${index}:`, formatted);
          return formatted;
        });
      
      console.log('All formatted records:', formattedRecords);
      setRecords(formattedRecords);
    } catch (err) {
      console.error('Error loading records:', err);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const decryptAllRecords = async () => {
    if (!walletClient || records.length === 0) {
      console.log('Cannot decrypt:', { hasWalletClient: !!walletClient, recordCount: records.length });
      return;
    }

    setDecryptingAll(true);
    try {
      console.log('🔓 Loading all records...');
      
      // Load and decrypt all records from IPFS
      const loadedRecords = await Promise.all(
        records.map(async (record, index) => {
          if (record.recordType === 'form' && !record.decryptedData) {
            try {
              console.log(`📥 Fetching record ${index} from IPFS:`, record.ipfsHash);
              
              // Fetch data from IPFS
              const ipfsData = await fetchFromIPFS(record.ipfsHash);
              const parsedData = typeof ipfsData === 'string' ? JSON.parse(ipfsData) : ipfsData;
              
              console.log(`📦 Data structure for record ${index}:`, {
                hasCiphertext: !!parsedData.ciphertext,
                hasDataToEncryptHash: !!parsedData.dataToEncryptHash,
                hasAccessControlConditions: !!parsedData.accessControlConditions,
                hasRecordType: !!parsedData.recordType,
                keys: Object.keys(parsedData)
              });
              
              // Check if it's Lit Protocol encrypted format
              if (parsedData.ciphertext && parsedData.dataToEncryptHash && parsedData.accessControlConditions) {
                console.log(`🔓 Lit Protocol encrypted record ${index} - decrypting...`);
                
                // Decrypt with Lit Protocol
                const decryptedData = await decryptData(parsedData, walletClient);
                console.log(`✅ Record ${index} decrypted with Lit Protocol`);
                return { ...record, decryptedData };
              } else {
                // Plain JSON format (legacy v2-sdk-integration records)
                console.log(`📄 Record ${index} is plain JSON (legacy format)`);
                return { ...record, decryptedData: parsedData };
              }
            } catch (err) {
              console.error(`❌ Failed to process record ${index}:`, err);
              return { ...record, decryptionError: err.message };
            }
          }
          return record;
        })
      );

      console.log('✅ All records processed');
      setRecords(loadedRecords);
    } catch (err) {
      console.error('❌ Error processing records:', err);
      alert('Error processing records: ' + err.message);
    } finally {
      setDecryptingAll(false);
    }
  };

  const filterRecordsByTime = (records) => {
    if (timeFilter === 'all') return records;

    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    return records.filter(record => {
      const recordTime = Number(record.timestamp) * 1000;
      const diff = now - recordTime;

      switch (timeFilter) {
        case 'today':
          return diff < oneDayMs;
        case 'week':
          return diff < 7 * oneDayMs;
        case 'month':
          return diff < 30 * oneDayMs;
        case 'year':
          return diff < 365 * oneDayMs;
        default:
          return true;
      }
    });
  };

  const groupRecordsByDate = (records) => {
    const filtered = filterRecordsByTime(records);
    const grouped = {};

    filtered.forEach(record => {
      const date = new Date(Number(record.timestamp) * 1000);
      const dateKey = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(record);
    });

    return grouped;
  };

  const groupedRecords = groupRecordsByDate(records);
  const filteredCount = filterRecordsByTime(records).length;

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex items-center justify-between bg-slate-50 rounded-lg p-3 border border-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-700">Timeline:</span>
          <div className="flex gap-1">
            {[
              { value: 'all', label: 'All' },
              { value: 'today', label: 'Today' },
              { value: 'week', label: 'Week' },
              { value: 'month', label: 'Month' },
              { value: 'year', label: 'Year' }
            ].map(filter => (
              <button
                key={filter.value}
                onClick={() => setTimeFilter(filter.value)}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  timeFilter === filter.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-300'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {records.some(r => r.recordType === 'form' && !r.decryptedData && !r.decryptionError) && (
          <button
            onClick={decryptAllRecords}
            disabled={decryptingAll}
            className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {decryptingAll ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Loading...
              </span>
            ) : (
              '📄 Load All Records'
            )}
          </button>
        )}
      </div>

      {/* Records Count */}
      <div className="flex items-center justify-between text-sm">
        <p className="text-slate-600">
          Showing <span className="font-semibold text-slate-900">{filteredCount}</span> of{' '}
          <span className="font-semibold text-slate-900">{records.length}</span> records
        </p>
      </div>

      {loading ? (
        <LoadingSpinner message="Loading records..." />
      ) : filteredCount === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
          <span className="text-4xl mb-3 block">📭</span>
          <p className="text-sm font-semibold text-slate-700">No records found</p>
          <p className="text-xs text-slate-500 mt-1">
            {timeFilter !== 'all' ? `Try selecting a different time period` : 'No medical records yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedRecords).map(([date, dateRecords]) => (
            <div key={date} className="space-y-3">
              {/* Date Header */}
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full"></div>
                <h4 className="text-sm font-bold text-slate-900">{date}</h4>
                <div className="flex-1 h-px bg-slate-200"></div>
                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
                  {dateRecords.length} {dateRecords.length === 1 ? 'record' : 'records'}
                </span>
              </div>

              {/* Records for this date */}
              <div className="space-y-3 ml-5 border-l-2 border-slate-200 pl-4">
                {dateRecords.map((record, index) => (
                  <RecordCard key={index} record={record} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
