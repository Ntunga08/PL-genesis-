import { useMemo, useEffect, useState } from 'react';
import { Contract, BrowserProvider } from 'ethers';
import { useWalletClient, usePublicClient } from 'wagmi';
import { CONTRACT_ADDRESS } from '../constants';
import HealthLinkABI from '../abi/HealthLink.json';

export function useContract() {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [contract, setContract] = useState(null);

  useEffect(() => {
    async function setupContract() {
      try {
        if (walletClient) {
          // For write operations - need signer
          const provider = new BrowserProvider(walletClient);
          const signer = await provider.getSigner();
          const contractWithSigner = new Contract(CONTRACT_ADDRESS, HealthLinkABI.abi, signer);
          setContract(contractWithSigner);
        } else if (publicClient) {
          // For read-only operations
          const provider = new BrowserProvider(publicClient);
          const contractReadOnly = new Contract(CONTRACT_ADDRESS, HealthLinkABI.abi, provider);
          setContract(contractReadOnly);
        } else {
          setContract(null);
        }
      } catch (err) {
        console.error('Error setting up contract:', err);
        setContract(null);
      }
    }

    setupContract();
  }, [walletClient, publicClient]);

  return contract;
}
