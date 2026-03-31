import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'HealthLink',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '0000000000000000000000000000000000000000',
  chains: [sepolia],
  ssr: false,
});
