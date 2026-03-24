const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying HealthLink to testnet...\n");

  // Deploy contract
  const HealthLink = await hre.ethers.getContractFactory("HealthLink");
  const healthLink = await HealthLink.deploy();
  await healthLink.waitForDeployment();

  const contractAddress = await healthLink.getAddress();
  
  console.log("✅ HealthLink deployed to:", contractAddress);
  console.log("\n📋 Next steps:");
  console.log("1. Update frontend/src/constants.js with this address");
  console.log("2. Update CHAIN_ID in constants.js");
  console.log("3. Deploy frontend to Vercel/Netlify");
  
  // Get network info
  const network = await hre.ethers.provider.getNetwork();
  console.log("\n🌐 Network:", network.name);
  console.log("Chain ID:", network.chainId.toString());
  
  // Update constants.js automatically
  const constantsPath = path.join(__dirname, "../frontend/src/constants.js");
  const constantsContent = `// Contract deployed on ${network.name}
export const CONTRACT_ADDRESS = "${contractAddress}";

// Chain ID for ${network.name}
export const CHAIN_ID = ${network.chainId.toString()};
`;

  fs.writeFileSync(constantsPath, constantsContent);
  console.log("\n✅ Updated frontend/src/constants.js automatically!");
  
  // Copy ABI to frontend
  const artifactPath = path.join(__dirname, "../artifacts/contracts/HealthLink.sol/HealthLink.json");
  const frontendAbiPath = path.join(__dirname, "../frontend/src/abi/HealthLink.json");
  
  if (fs.existsSync(artifactPath)) {
    fs.copyFileSync(artifactPath, frontendAbiPath);
    console.log("✅ Updated frontend ABI!");
  }
  
  console.log("\n🔍 Verify contract on block explorer:");
  if (network.chainId === 11155111n) {
    console.log(`https://sepolia.etherscan.io/address/${contractAddress}`);
  } else if (network.chainId === 84532n) {
    console.log(`https://sepolia.basescan.org/address/${contractAddress}`);
  } else if (network.chainId === 421614n) {
    console.log(`https://sepolia.arbiscan.io/address/${contractAddress}`);
  }
  
  console.log("\n🎉 Deployment complete!");
  console.log("\n📦 To deploy frontend:");
  console.log("cd frontend");
  console.log("npm run build");
  console.log("vercel");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
