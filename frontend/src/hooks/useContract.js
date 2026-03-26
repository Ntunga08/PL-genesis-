import { useEffect, useState } from 'react';
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
          console.log('Setting up contract with wallet client');
          // Create provider from walletClient
          const provider = new BrowserProvider(walletClient);
          // Get signer
          const signer = await provider.getSigner();
          console.log('Signer address:', await signer.getAddress());
          // Create contract with signer
          const contractInstance = new Contract(CONTRACT_ADDRESS, HealthLinkABI.abi, signer);
          console.log('Contract created with signer');
          setContract(contractInstance);
        } else if (publicClient) {
          console.log('Setting up read-only contract');
          // Read-only contract
          const provider = new BrowserProvider(publicClient);
          const contractInstance = new Contract(CONTRACT_ADDRESS, HealthLinkABI.abi, provider);
          setContract(contractInstance);
        } else {
          console.log('No wallet or public client available');
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
