const hre = require("hardhat");

async function main() {
  const provider = hre.ethers.provider;
  
  // Check first account
  const address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  const balance = await provider.getBalance(address);
  
  console.log("Address:", address);
  console.log("Balance:", hre.ethers.formatEther(balance), "ETH");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
