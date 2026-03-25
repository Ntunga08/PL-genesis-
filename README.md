# 🏥 HealthLink - Decentralized Medical Records

A blockchain-based medical records system built on Ethereum with encrypted IPFS storage.

## 🌐 Live Demo

**Frontend:** https://fastidious-rolypoly-4b0715.netlify.app/

**Contract Address:** `0x5956368Cb494B9A4168c6a104f433A369A13A19D`

**Network:** Sepolia Testnet (Chain ID: 11155111)

**Block Explorer:** https://sepolia.etherscan.io/address/0x5956368Cb494B9A4168c6a104f433A369A13A19D

## 🚀 How to Use (Public Access)

### Prerequisites
1. Install [MetaMask](https://metamask.io/) browser extension
2. Get free Sepolia ETH from faucets:
   - [Google Cloud Faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia) (requires mainnet ETH)
   - [Alchemy Faucet](https://sepoliafaucet.com/)
   - [Infura Faucet](https://www.infura.io/faucet/sepolia)

### Step-by-Step Guide

1. **Visit the App:** https://fastidious-rolypoly-4b0715.netlify.app/

2. **Connect MetaMask:**
   - Click "Connect Wallet"
   - Approve the connection in MetaMask
   - The app will prompt you to switch to Sepolia Testnet if needed

3. **Choose Your Role:**
   - **Patient Dashboard:** Manage your medical records and grant access to doctors
   - **Attendant Dashboard:** View and add records for patients who granted you access

4. **As a Patient:**
   - Grant access to a doctor by entering their wallet address
   - View your medical records
   - Revoke access anytime
   - Share your wallet address via QR code

5. **As a Doctor/Attendant:**
   - Enter patient's wallet address
   - Add encrypted medical records (forms or files)
   - View patient records (if access granted)

### Important Notes
- All medical data is encrypted before storage
- Only you and authorized doctors can decrypt your records
- Transactions require small amounts of Sepolia ETH (test network, free)
- If you see RPC errors, wait a moment and try again (public RPC rate limits)

## Features

- 🔐 Patient-controlled access management
- 🔒 End-to-end encryption (TweetNaCl)
- 🌐 Decentralized storage (IPFS via Pinata)
- ⛓️ On-chain access control (Ethereum)
- 📱 QR code wallet sharing
- 👨‍⚕️ Separate patient and medical staff interfaces
- 📎 Multiple file uploads support
- ➕ Custom fields for flexible record keeping

## Tech Stack

- **Smart Contract:** Solidity 0.8.20
- **Development:** Hardhat
- **Frontend:** React + Vite + Tailwind CSS v4
- **Blockchain:** Ethers.js v6
- **Storage:** Pinata (IPFS)
- **Encryption:** TweetNaCl

## Quick Start

### 1. Install Dependencies

```bash
# Root (Hardhat)
npm install

# Frontend
cd frontend
npm install
npm install tweetnacl tweetnacl-util qrcode.react
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your keys (already done).

### 3. Start Local Blockchain

```bash
npx hardhat node
```

### 4. Deploy Contract

```bash
npx hardhat run scripts/deploy.js --network localhost
```

### 5. Start Frontend

```bash
cd frontend
npm run dev
```

Open http://localhost:5173/

## Testing

### Run Contract Tests
```bash
npx hardhat test
```

### Manual Testing with MetaMask

1. Add Localhost 8545 network to MetaMask:
   - RPC: `http://127.0.0.1:8545`
   - Chain ID: `31337`

2. Import test accounts (see TEST_ACCOUNTS.md)

3. Test flow:
   - Patient grants access to doctor
   - Doctor adds medical record
   - Patient views the record

## Project Structure

```
healthlink/
├── contracts/          # Smart contracts
├── scripts/           # Deployment scripts
├── test/              # Contract tests
├── frontend/
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Patient & Attendant dashboards
│   │   ├── hooks/       # useWallet, useContract
│   │   ├── utils/       # encryption, ipfs helpers
│   │   └── abi/         # Contract ABI
└── .env               # Environment variables
```

## Deployment to Sepolia

1. Get Sepolia ETH from faucet
2. Update `.env` with your private key
3. Deploy:
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

## Security Notes

- Never commit `.env` file
- Use separate wallet for testing
- All medical data is encrypted before IPFS upload
- Only IPFS hash is stored on-chain

## License

MIT
