import { useState } from 'react';
import GrantAccessForm from '../components/GrantAccessForm';
import AccessList from '../components/AccessList';
import RecordsListWithDecryption from '../components/RecordsListWithDecryption';
import QRCodeCard from '../components/QRCodeCard';

export default function PatientDashboard({ contract, account, signer, onBack }) {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleAccessGranted = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Patient Dashboard</h2>
          <p className="text-sm text-slate-600">Manage your medical records</p>
        </div>
        <button 
          onClick={onBack}
          className="px-4 py-2 text-sm bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
        >
          ← Back
        </button>
      </div>

      {/* Grant Access Form */}
      <GrantAccessForm 
        contract={contract} 
        onSuccess={handleAccessGranted}
      />

      {/* QR Code */}
      <QRCodeCard address={account} />

      {/* Access List */}
      <AccessList 
        contract={contract} 
        account={account}
        refreshKey={refreshKey}
        onRevoke={handleAccessGranted}
      />

      {/* My Records */}
      <RecordsListWithDecryption 
        contract={contract}
        account={account}
        isPatient={true}
        signer={signer}
      />
    </div>
  );
}
