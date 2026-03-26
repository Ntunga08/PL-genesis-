import { useState, useEffect } from 'react';
import PatientAddressInput from '../components/PatientAddressInput';
import AddRecordFormWithEncryption from '../components/AddRecordFormWithEncryption';
import RecordsListWithDecryption from '../components/RecordsListWithDecryption';
import ChatBox from '../components/ChatBox';

export default function AttendantDashboard({ contract, account, signer, onBack }) {
  const [patientAddress, setPatientAddress] = useState('');
  const [hasAccess, setHasAccess] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [patientStats, setPatientStats] = useState({ totalRecords: 0, lastVisit: null });
  const [activeTab, setActiveTab] = useState('chart'); // chart, addRecord

  const handlePatientSelect = async (address) => {
    setPatientAddress(address);
    setActiveTab('chart'); // Reset to chart view
    if (contract && address) {
      try {
        const access = await contract.hasAccess(address, account);
        setHasAccess(access);
        
        if (access) {
          const records = await contract.getRecords(address);
          // Filter out chat messages from medical records count
          const medicalRecords = records.filter(r => r.recordType !== 'chat');
          setPatientStats({
            totalRecords: medicalRecords.length,
            lastVisit: medicalRecords.length > 0 ? medicalRecords[medicalRecords.length - 1].timestamp : null
          });
        }
      } catch (err) {
        console.error('Error checking access:', err);
        setHasAccess(false);
      }
    }
  };

  const handleRecordAdded = () => {
    setRefreshKey(prev => prev + 1);
    handlePatientSelect(patientAddress);
    setActiveTab('chart'); // Switch to chart after adding
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'No visits';
    return new Date(Number(timestamp) * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Provider Portal</h1>
          <p className="text-slate-600 mt-1">Electronic Health Records System</p>
        </div>
        <button 
          onClick={onBack}
          className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
        >
          ← Back
        </button>
      </div>

      {/* Patient Search */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Patient Lookup</h3>
        <PatientAddressInput 
          onPatientSelect={handlePatientSelect}
          currentPatient={patientAddress}
        />
      </div>

      {patientAddress ? (
        hasAccess ? (
          <>
            {/* Patient Info Banner */}
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl shadow-sm p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90 mb-1">Current Patient</p>
                  <p className="font-mono text-lg font-semibold">
                    {patientAddress.slice(0, 12)}...{patientAddress.slice(-10)}
                  </p>
                </div>
                <div className="flex gap-6">
                  <div className="text-right">
                    <p className="text-sm opacity-90 mb-1">Total Records</p>
                    <p className="text-2xl font-bold">{patientStats.totalRecords}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm opacity-90 mb-1">Last Visit</p>
                    <p className="text-sm font-semibold">{formatDate(patientStats.lastVisit)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="border-b border-slate-200">
                <div className="flex">
                  <button
                    onClick={() => setActiveTab('chart')}
                    className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                      activeTab === 'chart'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    📋 Patient Chart
                  </button>
                  <button
                    onClick={() => setActiveTab('chat')}
                    className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                      activeTab === 'chat'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    💬 Chat with Patient
                  </button>
                  <button
                    onClick={() => setActiveTab('addRecord')}
                    className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                      activeTab === 'addRecord'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ➕ Add Record
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'chart' && (
                  <div>
                    <RecordsListWithDecryption 
                      contract={contract}
                      account={account}
                      patientAddress={patientAddress}
                      isPatient={false}
                      signer={signer}
                      refreshKey={refreshKey}
                    />
                  </div>
                )}

                {activeTab === 'chat' && (
                  <div>
                    <p className="text-sm text-slate-600 mb-4">
                      Communicate securely with your patient
                    </p>
                    <ChatBox
                      contract={contract}
                      patientAddress={patientAddress}
                      currentUser={account}
                      isPatient={false}
                    />
                  </div>
                )}

                {activeTab === 'addRecord' && (
                  <div className="max-w-2xl mx-auto">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">New Medical Record</h3>
                    <AddRecordFormWithEncryption 
                      contract={contract}
                      patientAddress={patientAddress}
                      signer={signer}
                      onSuccess={handleRecordAdded}
                    />
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Access Denied */
          <div className="bg-white rounded-xl shadow-sm border border-red-200 p-12 text-center">
            <div className="max-w-md mx-auto">
              <span className="text-6xl mb-4 block">🚫</span>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h3>
              <p className="text-slate-600 mb-6">
                You don't have permission to view this patient's records
              </p>
              <div className="bg-slate-50 rounded-lg p-6 text-left">
                <p className="text-sm font-semibold text-slate-900 mb-3">To gain access:</p>
                <ol className="text-sm text-slate-700 space-y-2 list-decimal list-inside">
                  <li>Share your provider ID with the patient</li>
                  <li className="font-mono text-xs text-blue-600 ml-6">{account}</li>
                  <li>Patient must grant you access from their portal</li>
                  <li>Refresh this page after approval</li>
                </ol>
              </div>
            </div>
          </div>
        )
      ) : (
        /* Empty State */
        <div className="bg-white rounded-xl shadow-sm border-2 border-dashed border-slate-300 p-16 text-center">
          <span className="text-6xl mb-4 block">🔍</span>
          <h3 className="text-2xl font-bold text-slate-900 mb-2">No Patient Selected</h3>
          <p className="text-slate-600">
            Enter a patient's wallet address above to access their medical records
          </p>
        </div>
      )}
    </div>
  );
}
