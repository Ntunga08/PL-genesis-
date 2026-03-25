# 🏥 HealthLink - Decentralized Medical Records

Blockchain-based medical records where patients control their health data.

**Live Demo:** https://fastidious-rolypoly-4b0715.netlify.app/

---

## What It Does

- **Patients** grant access to doctors and view their records
- **Doctors** add comprehensive medical records (8 types)
- **Records** stored on IPFS, access controlled by blockchain
- **100+ wallets** supported via RainbowKit (MetaMask, Coinbase, WalletConnect, etc.)

## Record Types

🩺 Consultation | 🧪 Lab Test | 📷 Imaging | 💊 Prescription  
⚕️ Procedure | ❤️ Vitals | 💉 Vaccination | 📋 Discharge Summary

Each type has specialized fields + image upload support

---

## How It Works

1. Patient connects wallet → Grants access to doctor
2. Doctor adds record → Stored on IPFS
3. IPFS hash saved on blockchain
4. Both can view records (access controlled by smart contract)

---

## Quick Start

**Requirements:** Wallet + Sepolia ETH ([get free](https://sepoliafaucet.com/))

**Patient:**
1. Connect wallet → Patient Dashboard
2. Grant Access tab → Enter doctor's address
3. My Records tab → View all records

**Doctor:**
1. Connect wallet → Attendant Dashboard  
2. Enter patient address
3. Add Record tab → Select type, fill form, submit

---

## Tech Stack

**Contract:** Solidity + Hardhat  
**Frontend:** React + Vite + Tailwind + RainbowKit + Wagmi  
**Storage:** IPFS (Pinata)  
**Network:** Sepolia Testnet

**Contract:** `0x5956368Cb494B9A4168c6a104f433A369A13A19D`

---

## Features

✅ 8 professional record types  
✅ Image upload for lab tests & imaging  
✅ Timeline filters (Today/Week/Month/Year)  
✅ 100+ wallet support (RainbowKit)  
✅ Patient-controlled access  
✅ QR code sharing  
✅ IPFS storage  
✅ Blockchain access control

---

## Local Dev

```bash
git clone https://github.com/Ntunga08/PL-genesis-.git
cd PL-genesis-
npm install && cd frontend && npm install && cd ..

# Add .env with ALCHEMY_URL, PRIVATE_KEY, PINATA_JWT
npx hardhat node
npx hardhat run scripts/deploy.js --network localhost
cd frontend && npm run dev
```

---

## Security Note

Records stored on IPFS without encryption (V2). Access controlled by smart contract.  
V3 will add proper asymmetric encryption.

---

## Links

**App:** https://fastidious-rolypoly-4b0715.netlify.app/  
**Contract:** https://sepolia.etherscan.io/address/0x5956368Cb494B9A4168c6a104f433A369A13A19D  
**Faucet:** https://sepoliafaucet.com/

---

**Status:** Alpha Testing | Sepolia Testnet | March 2026
