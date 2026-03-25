import { useState, useEffect } from 'react';
import GrantAccessForm from '../components/GrantAccessForm';
import RecordsListWithDecryption from '../components/RecordsListWithDecryption';
import QRCodeCard from '../components/QRCodeCard';

export default function PatientDashboard({ contract, account, signer, onBack }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [stats, setStats] = useState({ totalRecords: 0 });
  const [activeTab, setActiveTab] = useState('records');

  const handleAccessGranted = () => {
    setRefreshKey(prev => prev + 1);
    loadStats();
  };

  const loadStats = async () => {
    if (!contract) return;
    try {
      const records = await contract.getMyRecords();
      setStats({
        totalRecords: records.length
      });
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  useEffect(() => {
    loadStats();
  }, [contract, account, refreshKey]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Patient Portal</h1>
          <p className="text-slate-600 mt-1">Manage your health records securely</p>
        </div>
        <button 
          onClick={onBack}
          className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
        >
          ← Back
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Medical Records</p>
              <p className="text-3xl font-bold text-slate-900">{stats.totalRecords}</p>
            </div>
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">📋</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Your Patient ID</p>
              <p className="text-xs font-mono text-slate-900">{account?.slice(0, 10)}...</p>
            </div>
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">🆔</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Blockchain</p>
              <p className="text-lg font-bold text-slate-900">Sepolia</p>
            </div>
            <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">⛓️</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="border-b border-slate-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('records')}
              className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                activeTab === 'records'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📋 My Records
            </button>
            <button
              onClick={() => setActiveTab('team')}
              className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                activeTab === 'team'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              👥 Grant Access
            </button>
            <button
              onClick={() => setActiveTab('share')}
              className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                activeTab === 'share'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🔗 Share ID
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'records' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-slate-600">
                  Your medical records added by healthcare providers
                </p>
                <button
                  onClick={() => setRefreshKey(prev => prev + 1)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-200 transition-colors flex items-center gap-2"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              </div>
              <RecordsListWithDecryption 
                contract={contract}
                account={account}
                isPatient={true}
                signer={signer}
                refreshKey={refreshKey}
              />
            </div>
          )}

          {activeTab === 'team' && (
            <div className="max-w-2xl mx-auto">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Grant Access to Healthcare Provider</h3>
              <p className="text-sm text-slate-600 mb-6">
                Enter the wallet address of your doctor or healthcare provider to give them access to your medical records.
              </p>
              <GrantAccessForm 
                contract={contract} 
                onSuccess={handleAccessGranted}
              />
            </div>
          )}

          {activeTab === 'share' && (
            <div className="max-w-md mx-auto text-center">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Share Your Patient ID</h3>
              <p className="text-sm text-slate-600 mb-6">
                Show this QR code to your healthcare provider to grant them access
              </p>
              <QRCodeCard address={account} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
