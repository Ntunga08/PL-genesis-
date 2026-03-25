// Contract deployed on sepolia
export const CONTRACT_ADDRESS = "0x5956368Cb494B9A4168c6a104f433A369A13A19D";

// Chain ID for sepolia
export const CHAIN_ID = 11155111;

// Multiple RPC URLs for better reliability (fallback support)
export const SEPOLIA_RPC_URLS = [
  "https://ethereum-sepolia-rpc.publicnode.com",
  "https://rpc.sepolia.org",
  "https://eth-sepolia.g.alchemy.com/v2/demo",
  "https://sepolia.gateway.tenderly.co"
];

// Primary RPC URL
export const SEPOLIA_RPC_URL = SEPOLIA_RPC_URLS[0];

// Network details for adding to MetaMask
export const SEPOLIA_NETWORK = {
  chainId: `0x${CHAIN_ID.toString(16)}`,
  chainName: 'Sepolia Testnet',
  nativeCurrency: {
    name: 'Sepolia ETH',
    symbol: 'ETH',
    decimals: 18
  },
  rpcUrls: SEPOLIA_RPC_URLS,
  blockExplorerUrls: ['https://sepolia.etherscan.io']
};
