import { useState, useEffect } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { BrowserProvider } from 'ethers';
import { useContract } from './hooks/useContract';
import Home from './pages/Home';
import PatientDashboard from './pages/PatientDashboard';
import AttendantDashboard from './pages/AttendantDashboard';
import NetworkBanner from './components/NetworkBanner';

function App() {
  const { address: account } = useAccount();
  const { data: walletClient } = useWalletClient();
  const contract = useContract();
  const [currentPage, setCurrentPage] = useState('home');
  const [signer, setSigner] = useState(null);

  // Get signer from walletClient
  useEffect(() => {
    async function getSigner() {
      if (walletClient) {
        try {
          const provider = new BrowserProvider(walletClient);
          const ethersSigner = await provider.getSigner();
          setSigner(ethersSigner);
        } catch (err) {
          console.error('Error getting signer:', err);
          setSigner(null);
        }
      } else {
        setSigner(null);
      }
    }
    getSigner();
  }, [walletClient]);

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
            <h1 className="text-lg font-bold text-slate-800">HealthLink V2</h1>
            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-bold rounded">SDK</span>
          </button>
          
          {/* RainbowKit Connect Button in Header */}
          <div className="flex items-center gap-3">
            <ConnectButton />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Network Warning */}
        {account && <NetworkBanner />}

        {!account ? (
          /* Home Page with Connect Button */}
          <div className="max-w-sm mx-auto">
            <Home onSelectRole={setCurrentPage} />
          </div>
        ) : (
          /* Dashboard Pages */}
          <>
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
