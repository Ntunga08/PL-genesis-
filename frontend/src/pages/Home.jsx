import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';

export default function Home({ onSelectRole }) {
  const { isConnected } = useAccount();

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-lg shadow border border-slate-200 p-4 text-center">
        <h2 className="text-lg font-bold text-slate-800">HealthLink</h2>
        <p className="text-xs text-slate-600 mt-1">Decentralized Medical Records Management</p>
      </div>

      {!isConnected ? (
        /* Show Connect Wallet if not connected */
        <>
          {/* Connect Wallet - RainbowKit */}
          <div className="bg-white rounded-lg shadow p-6 border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4 text-center">
              Connect Your Wallet
            </h2>
            <div className="flex justify-center">
              <ConnectButton />
            </div>
            <p className="text-xs text-slate-500 text-center mt-4">
              Supports MetaMask, WalletConnect, Coinbase, Trust Wallet, and 100+ more!
            </p>
          </div>

          {/* Info */}
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg shadow p-4 text-white">
            <div className="flex items-center justify-around text-center text-xs">
              <div className="flex items-center gap-1">
                <span>🔒</span>
                <span className="font-medium">Encrypted</span>
              </div>
              <div className="flex items-center gap-1">
                <span>🌐</span>
                <span className="font-medium">IPFS</span>
              </div>
              <div className="flex items-center gap-1">
                <span>⛓️</span>
                <span className="font-medium">Blockchain</span>
              </div>
              <div className="flex items-center gap-1">
                <span>�</span>
                <span className="font-medium">Mobile</span>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Show Role Selection only after connected */
        <div className="bg-white rounded-lg shadow p-6 border border-slate-200">
          <h2 className="text-lg font-bold text-slate-800 mb-4 text-center">
            Select Your Role
          </h2>

          <div className="grid grid-cols-2 gap-4">
            {/* Patient */}
            <button 
              onClick={() => onSelectRole('patient')}
              className="bg-white border-2 border-slate-200 p-6 rounded-lg hover:border-blue-400 hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              <h3 className="text-base font-bold text-slate-800 mb-1">Patient</h3>
              <p className="text-xs text-slate-600">View & manage records</p>
            </button>

            {/* Staff */}
            <button 
              onClick={() => onSelectRole('attendant')}
              className="bg-white border-2 border-slate-200 p-6 rounded-lg hover:border-blue-400 hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              <h3 className="text-base font-bold text-slate-800 mb-1">Medical Staff</h3>
              <p className="text-xs text-slate-600">Add patient records</p>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
