import { useState, useEffect } from 'react';
import { CHAIN_ID } from '../constants';

export default function NetworkBanner() {
  const [wrongNetwork, setWrongNetwork] = useState(false);
  const [currentChainId, setCurrentChainId] = useState(null);

  useEffect(() => {
    checkNetwork();

    if (window.ethereum) {
      window.ethereum.on('chainChanged', checkNetwork);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('chainChanged', checkNetwork);
      }
    };
  }, []);

  const checkNetwork = async () => {
    if (!window.ethereum) return;

    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      const chainIdDecimal = parseInt(chainId, 16);
      setCurrentChainId(chainIdDecimal);
      setWrongNetwork(chainIdDecimal !== CHAIN_ID);
    } catch (err) {
      console.error('Error checking network:', err);
    }
  };

  const switchNetwork = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${CHAIN_ID.toString(16)}` }],
      });
    } catch (err) {
      // If network doesn't exist, add it
      if (err.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${CHAIN_ID.toString(16)}`,
              chainName: 'Localhost 8545',
              rpcUrls: ['http://127.0.0.1:8545'],
              nativeCurrency: {
                name: 'ETH',
                symbol: 'ETH',
                decimals: 18
              }
            }],
          });
        } catch (addErr) {
          console.error('Error adding network:', addErr);
        }
      }
    }
  };

  if (!wrongNetwork) return null;

  return (
    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-red-800">Wrong Network</p>
            <p className="text-xs text-red-600">
              Please switch to {CHAIN_ID === 31337 ? 'Localhost 8545' : 'Sepolia Testnet'}
            </p>
          </div>
        </div>
        <button
          onClick={switchNetwork}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold"
        >
          Switch Network
        </button>
      </div>
    </div>
  );
}
