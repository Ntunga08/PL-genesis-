require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    // Local Hardhat network
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    
    // Ethereum Sepolia Testnet
    sepolia: {
      url: process.env.ALCHEMY_URL || "https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111,
    },
    
    // Base Sepolia Testnet (Layer 2 - Cheaper)
    baseSepolia: {
      url: process.env.BASE_ALCHEMY_URL || "https://base-sepolia.g.alchemy.com/v2/YOUR_KEY",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 84532,
    },
    
    // Arbitrum Sepolia Testnet (Layer 2 - Very Cheap)
    arbitrumSepolia: {
      url: process.env.ARB_ALCHEMY_URL || "https://arb-sepolia.g.alchemy.com/v2/YOUR_KEY",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 421614,
    },
  },
};
