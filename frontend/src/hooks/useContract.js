import { Contract } from 'ethers';
import { CONTRACT_ADDRESS } from '../constants';
import HealthLinkABI from '../abi/HealthLink.json';

export function useContract(signer) {
  if (!signer) return null;

  return new Contract(
    CONTRACT_ADDRESS,
    HealthLinkABI.abi,
    signer
  );
}
