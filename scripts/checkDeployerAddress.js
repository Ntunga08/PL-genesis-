const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const address = await deployer.getAddress();
  const balance = await hre.ethers.provider.getBalance(address);
  
  console.log("Deployer address:", address);
  console.log("Balance:", hre.ethers.formatEther(balance), "ETH");
  console.log("\nThis is the account that needs Sepolia ETH!");
  console.log("Get testnet ETH from: https://sepoliafaucet.com/");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
