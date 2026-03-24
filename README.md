# 🏥 HealthLink - Decentralized Medical Records

A blockchain-based medical records system built on Ethereum with encrypted IPFS storage.

## Features

- 🔐 Patient-controlled access management
- 🔒 End-to-end encryption (TweetNaCl)
- 🌐 Decentralized storage (IPFS via Pinata)
- ⛓️ On-chain access control (Ethereum)
- 📱 QR code wallet sharing
- 👨‍⚕️ Separate patient and medical staff interfaces

## Tech Stack

- **Smart Contract:** Solidity 0.8.20
- **Development:** Hardhat
- **Frontend:** React + Vite + Tailwind CSS
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
