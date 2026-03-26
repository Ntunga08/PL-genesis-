import { useMemo } from 'react';
import { Contract, BrowserProvider } from 'ethers';
import { useWalletClient, usePublicClient } from 'wagmi';
import { CONTRACT_ADDRESS } from '../constants';
import HealthLinkABI from '../abi/HealthLink.json';

export function useContract() {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const contract = useMemo(() => {
    if (!walletClient && !publicClient) return null;

    try {
      // For write operations, we need the walletClient
      if (walletClient) {
        // Create a custom provider from walletClient
        const provider = new BrowserProvider(walletClient);
        return new Contract(CONTRACT_ADDRESS, HealthLinkABI.abi, provider);
      }
      
      // For read-only operations, use publicClient
      if (publicClient) {
        const provider = new BrowserProvider(publicClient);
        return new Contract(CONTRACT_ADDRESS, HealthLinkABI.abi, provider);
      }
    } catch (err) {
      console.error('Error setting up contract:', err);
      return null;
    }

    return null;
  }, [walletClient, publicClient]);

  return contract;
}
