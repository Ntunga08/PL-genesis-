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
      if (!walletClient && !publicClient) {
        setContract(null);
        return;
      }

      try {
        // Use walletClient for write operations, publicClient for read
        const client = walletClient || publicClient;
        const provider = new BrowserProvider(client.transport);
        
        let contractInstance;
        if (walletClient) {
          const signer = await provider.getSigner(walletClient.account.address);
          contractInstance = new Contract(CONTRACT_ADDRESS, HealthLinkABI.abi, signer);
        } else {
          contractInstance = new Contract(CONTRACT_ADDRESS, HealthLinkABI.abi, provider);
        }
        
        setContract(contractInstance);
      } catch (err) {
        console.error('Error setting up contract:', err);
        setContract(null);
      }
    }

    setupContract();
  }, [walletClient, publicClient]);

  return contract;
}
