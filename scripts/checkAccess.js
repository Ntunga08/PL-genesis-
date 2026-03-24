const hre = require("hardhat");

async function main() {
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const HealthLink = await hre.ethers.getContractAt("HealthLink", contractAddress);
  
  const patient = "0xBefC9Fb34e9D10DA5476a3081EF7BDaD906F3637";
  const doctor = "0x652866962e66F28e039236304dDBcC633BB76366";
  
  console.log("Checking access...");
  console.log("Patient:", patient);
  console.log("Doctor:", doctor);
  
  const hasAccess = await HealthLink.hasAccess(patient, doctor);
  console.log("Has access:", hasAccess);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
