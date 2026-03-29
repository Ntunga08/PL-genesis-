# HealthLink

> Blockchain-based medical records where patients control access to their health data

[![Live Demo](https://img.shields.io/badge/Live-Demo-blue)](https://healthlink-v2.netlify.app/)
[![Contract](https://img.shields.io/badge/Contract-Sepolia-purple)](https://sepolia.etherscan.io/address/0x97A985354D340306633670DB945A736A57102a00)

---

## The Problem

Medical records are trapped in hospital databases. When you switch doctors, travel abroad, or face emergencies, your health data is inaccessible. Patients don't own their medical history - hospitals do.

## The Solution

HealthLink puts patients in control using blockchain and decentralized storage:

- **Patient-Controlled Access** - Grant or revoke doctor permissions instantly
- **Decentralized Storage** - Records stored on IPFS, accessible globally
- **Blockchain Security** - Ethereum smart contracts ensure tamper-proof access control
- **100+ Wallet Support** - Works with MetaMask, Coinbase, Trust Wallet, and more

---

## Tech Stack

**Blockchain:** Solidity smart contracts on Ethereum Sepolia  
**Storage:** IPFS via Pinata for decentralized record storage  
**Frontend:** React + Vite + Tailwind CSS  
**Web3:** RainbowKit + Wagmi for wallet integration  
**Development:** Hardhat + ethers.js

---

## Quick Start

**Live Demo:** [healthlink-v2.netlify.app](https://healthlink-v2.netlify.app/)

**Requirements:** Crypto wallet + Sepolia testnet ETH ([get free ETH](https://sepoliafaucet.com/))

### As Patient:
1. Connect wallet → Patient Dashboard
2. Grant Access → Enter doctor's address
3. View your medical records

### As Doctor:
1. Connect wallet → Attendant Dashboard
2. Enter patient's address
3. Add medical records (8 types supported)

---

## Features

✅ 8 professional medical record types  
✅ Image upload for lab tests & imaging  
✅ Real-time doctor-patient chat  
✅ QR code access sharing  
✅ Timeline filtering  
✅ Patient-controlled permissions

---

## Local Development

```bash
# Install dependencies
npm install
cd frontend && npm install && cd ..

# Setup environment
cp .env.example .env
# Add your ALCHEMY_URL, PRIVATE_KEY, PINATA_JWT

# Deploy contract
npx hardhat run scripts/deployToTestnet.js --network sepolia

# Start frontend
cd frontend && npm run dev
```

---

## Smart Contract

**Address:** `0x97A985354D340306633670DB945A736A57102a00`  
**Network:** Ethereum Sepolia Testnet  
**Explorer:** [View on Etherscan](https://sepolia.etherscan.io/address/0x97A985354D340306633670DB945A736A57102a00)

---

## Architecture

```
Patient → Grants Access → Smart Contract → Doctor Adds Record
                              ↓
                         IPFS Storage
                              ↓
                    Patient Views Records
```

**On-Chain:** Access permissions, IPFS hashes, timestamps  
**Off-Chain:** Medical records, images, chat messages (stored on IPFS)

---

## License

MIT

---

**Built for a healthier, decentralized future** 🏥⛓️
