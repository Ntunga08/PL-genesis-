import { useState } from 'react';
import { useWallet } from './hooks/useWallet';
import { useContract } from './hooks/useContract';
import Home from './pages/Home';
import PatientDashboard from './pages/PatientDashboard';
import AttendantDashboard from './pages/AttendantDashboard';
import NetworkBanner from './components/NetworkBanner';

function App() {
  const { account, signer, isConnecting, error, connectWallet, disconnectWallet } = useWallet();
  const contract = useContract(signer);
  const [currentPage, setCurrentPage] = useState('home');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <button 
            onClick={() => setCurrentPage('home')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <span className="text-lg">🏥</span>
            <h1 className="text-lg font-bold text-slate-800">HealthLink</h1>
          </button>
          
          {account && (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs text-slate-500">Connected</p>
                <p className="font-mono text-xs text-slate-700">
                  {account.slice(0, 6)}...{account.slice(-4)}
                </p>
              </div>
              <button 
                onClick={disconnectWallet}
                className="px-3 py-1.5 text-xs bg-slate-100 text-slate-600 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                Disconnect
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Network Warning */}
        {account && <NetworkBanner />}

        {!account ? (
          /* Connect Wallet */
          <div className="max-w-sm mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-8 text-center border border-slate-200">
              <span className="text-3xl mb-4 block">🔐</span>
              
              <h2 className="text-xl font-bold text-slate-800 mb-2">
                Connect Wallet
              </h2>
              <p className="text-sm text-slate-600 mb-6">
                Access your medical records securely
              </p>
              
              <button 
                onClick={connectWallet} 
                disabled={isConnecting}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-3 text-sm font-semibold rounded-lg hover:shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-60"
              >
                {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
              </button>
              
              {error && (
                <div className="mt-4 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                  {error}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Dashboard Pages */
          <>
            {/* Status Bar */}
            <div className="bg-white rounded-lg shadow p-4 border border-slate-200 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">✅</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Connected</p>
                    <p className="font-mono text-xs text-slate-600">
                      {account.slice(0, 6)}...{account.slice(-4)}
                    </p>
                  </div>
                </div>
                {contract && (
                  <p className="font-mono text-xs text-blue-600">
                    {contract.target.slice(0, 6)}...{contract.target.slice(-4)}
                  </p>
                )}
              </div>
            </div>

            {/* Page Router */}
            {currentPage === 'home' && (
              <Home onSelectRole={setCurrentPage} />
            )}

            {currentPage === 'patient' && (
              <PatientDashboard 
                contract={contract}
                account={account}
                signer={signer}
                onBack={() => setCurrentPage('home')}
              />
            )}

            {currentPage === 'attendant' && (
              <AttendantDashboard 
                contract={contract}
                account={account}
                signer={signer}
                onBack={() => setCurrentPage('home')}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
