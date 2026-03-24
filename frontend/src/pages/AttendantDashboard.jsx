import { useState } from 'react';
import PatientAddressInput from '../components/PatientAddressInput';
import AddRecordFormWithEncryption from '../components/AddRecordFormWithEncryption';
import RecordsListWithDecryption from '../components/RecordsListWithDecryption';

export default function AttendantDashboard({ contract, account, signer, onBack }) {
  const [patientAddress, setPatientAddress] = useState('');
  const [hasAccess, setHasAccess] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handlePatientSelect = async (address) => {
    setPatientAddress(address);
    if (contract && address) {
      try {
        const access = await contract.hasAccess(address, account);
        setHasAccess(access);
      } catch (err) {
        console.error('Error checking access:', err);
        setHasAccess(false);
      }
    }
  };

  const handleRecordAdded = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Medical Staff Dashboard</h2>
          <p className="text-sm text-slate-600">Add and view patient records</p>
        </div>
        <button 
          onClick={onBack}
          className="px-4 py-2 text-sm bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
        >
          ← Back
        </button>
      </div>

      {/* Patient Address Input */}
      <PatientAddressInput 
        onPatientSelect={handlePatientSelect}
        currentPatient={patientAddress}
      />

      {patientAddress && (
        <>
          {hasAccess ? (
            <>
              {/* Add Record Form */}
              <AddRecordFormWithEncryption 
                contract={contract}
                patientAddress={patientAddress}
                signer={signer}
                onSuccess={handleRecordAdded}
              />

              {/* Patient Records */}
              <RecordsListWithDecryption 
                contract={contract}
                patientAddress={patientAddress}
                isPatient={false}
                signer={signer}
                refreshKey={refreshKey}
              />
            </>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <span className="text-3xl mb-2 block">🚫</span>
              <p className="text-red-700 font-semibold">Access Denied</p>
              <p className="text-sm text-red-600 mt-1">
                You don't have permission to view this patient's records
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
