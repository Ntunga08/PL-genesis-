const { ethers } = require('hardhat');

async function main() {
  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
  const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
  const balance = await provider.getBalance(address);
  console.log('Balance:', ethers.formatEther(balance), 'ETH');
}

main().catch(console.error);
