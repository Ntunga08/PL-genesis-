const hre = require("hardhat");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  
  // Chrome account (Doctor)
  const targetAddress = "0x652866962e66F28e039236304dDBcC633BB76366";
  
  console.log("Sending 100 ETH to:", targetAddress);
  
  const tx = await signer.sendTransaction({
    to: targetAddress,
    value: hre.ethers.parseEther("100")
  });
  
  await tx.wait();
  
  console.log("✅ Sent 100 ETH!");
  console.log("Transaction hash:", tx.hash);
  
  const balance = await hre.ethers.provider.getBalance(targetAddress);
  console.log("New balance:", hre.ethers.formatEther(balance), "ETH");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
