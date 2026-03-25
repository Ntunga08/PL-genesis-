import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'HealthLink',
  projectId: 'YOUR_WALLETCONNECT_PROJECT_ID', // Get free from https://cloud.walletconnect.com/
  chains: [sepolia],
  ssr: false,
});
