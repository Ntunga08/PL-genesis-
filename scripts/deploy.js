const hre = require("hardhat");

async function main() {
  console.log("Deploying HealthLink contract to Sepolia...");

  const HealthLink = await hre.ethers.getContractFactory("HealthLink");
  const healthLink = await HealthLink.deploy();

  await healthLink.waitForDeployment();

  const address = await healthLink.getAddress();
  console.log("✅ HealthLink deployed to:", address);
  console.log("\n📋 Save this address for your frontend!");
  console.log("\n🔍 Verify on Etherscan:");
  console.log(`https://sepolia.etherscan.io/address/${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
