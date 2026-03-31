import { useState, useEffect } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { BrowserProvider } from 'ethers';
import { useContract } from './hooks/useContract';
import { useLitProtocol } from './hooks/useLitProtocol';
import Home from './pages/Home';
import PatientDashboard from './pages/PatientDashboard';
import AttendantDashboard from './pages/AttendantDashboard';
import NetworkBanner from './components/NetworkBanner';

function App() {
  const { address: account } = useAccount();
  const { data: walletClient } = useWalletClient();
  const contract = useContract();
  const { isInitialized: litInitialized, error: litError } = useLitProtocol();
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

  // Check if we're on home page (landing page should be full width)
  const isHomePage = currentPage === 'home' && !account;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
      {/* Hide header on landing page since Home.jsx has its own nav */}
      {!isHomePage && (
        <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
          <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
            <button 
              onClick={() => setCurrentPage('home')}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <h1 className="text-lg font-bold text-slate-800">HealthLink</h1>
            </button>
            
            <div className="flex items-center gap-3">
              <ConnectButton />
            </div>
          </div>
        </header>
      )}

      <main className={isHomePage ? '' : 'max-w-4xl mx-auto px-6 py-8'}>
        {account && <NetworkBanner />}
        
        {/* Lit Protocol Status */}
        {litError && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            ⚠️ Lit Protocol initialization failed. Encryption features may not work.
          </div>
        )}
        {!litInitialized && !litError && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            🔥 Initializing Lit Protocol...
          </div>
        )}

        {!account ? (
          <Home onSelectRole={setCurrentPage} />
        ) : (
          <>
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
