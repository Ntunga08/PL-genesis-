# 🏥 HealthLink - Decentralized Medical Records

> ⚠️ **Alpha Version** - Currently in testing on Sepolia testnet. Not for production use.

A blockchain-based medical records system where patients own and control their health data.

**Live Demo:** https://fastidious-rolypoly-4b0715.netlify.app/

---

## The Problem

Healthcare data today is:
- Controlled by hospitals, not patients
- Stored in centralized databases (vulnerable to breaches)
- Difficult to share between providers
- Inaccessible to patients when they need it

## Our Solution

HealthLink gives patients full control:
- **You own your data** - Your wallet = your medical records
- **Encrypted storage** - Only you and authorized doctors can read it
- **Decentralized** - Stored on IPFS, not centralized servers
- **Portable** - Access anywhere with your wallet
- **Transparent** - All access changes recorded on blockchain

---

## How It Works

```
Patient grants access → Doctor adds encrypted record → Stored on IPFS → Hash on blockchain
```

1. Patient connects wallet and grants access to doctor
2. Doctor adds medical records (encrypted automatically)
3. Data stored on IPFS, only hash stored on blockchain
4. Both patient and doctor can decrypt and view records
5. Patient can revoke access anytime

---

## Quick Start

### For Patients

1. **Install MetaMask** → https://metamask.io/
2. **Get Sepolia ETH** → https://sepoliafaucet.com/ (free testnet tokens)
3. **Open the app** → https://fastidious-rolypoly-4b0715.netlify.app/
4. **Connect wallet** → Click "Patient Dashboard"
5. **Grant access** → Enter doctor's wallet address
6. **View records** → Click "Decrypt All" to see your data

### For Doctors

1. **Install MetaMask** → https://metamask.io/
2. **Get Sepolia ETH** → https://sepoliafaucet.com/
3. **Open the app** → https://fastidious-rolypoly-4b0715.netlify.app/
4. **Connect wallet** → Click "Attendant Dashboard"
5. **Get patient access** → Patient grants you access
6. **Add records** → Enter patient address, add encrypted records
7. **View records** → Click "Decrypt All" to see patient data

---

## Features

- 🔐 Patient-controlled access (grant/revoke anytime)
- 🔒 End-to-end encryption (TweetNaCl)
- 🌐 Decentralized storage (IPFS)
- ⛓️ Blockchain access control (Ethereum)
- 📎 Multiple file uploads
- ➕ Custom fields for flexible records
- 📱 QR code for easy address sharing

---

## Tech Stack

**Smart Contract:** Solidity 0.8.20 + Hardhat  
**Frontend:** React + Vite + Tailwind CSS  
**Blockchain:** Ethers.js v6 on Sepolia Testnet  
**Storage:** IPFS (Pinata)  
**Encryption:** TweetNaCl  

**Contract Address:** `0x5956368Cb494B9A4168c6a104f433A369A13A19D`  
**Network:** Sepolia Testnet (Chain ID: 11155111)  
**Explorer:** https://sepolia.etherscan.io/address/0x5956368Cb494B9A4168c6a104f433A369a13a19d

---

## Development Status

**Current Phase:** Alpha Testing (v0.1)

**What Works:**
- ✅ Smart contract deployed on Sepolia
- ✅ Patient can grant/revoke access
- ✅ Doctor can add encrypted records
- ✅ Both can decrypt and view records
- ✅ File uploads working
- ✅ Custom fields functional

**Known Issues:**
- RPC rate limits (use multiple endpoints)
- Sepolia can be slow (1-3 min confirmations)
- Need to refresh page after switching accounts
- Files >5MB may timeout

**Coming Soon:**
- Layer 2 deployment (lower fees)
- Mobile app
- Search and filter records
- Export to PDF
- Emergency access

---

## Local Development

```bash
# Clone and install
git clone https://github.com/Ntunga08/PL-genesis-.git
cd PL-genesis-
npm install
cd frontend && npm install && cd ..

# Configure environment
cp .env.example .env
# Add your ALCHEMY_URL, PRIVATE_KEY, PINATA_JWT

# Start local blockchain
npx hardhat node

# Deploy contract (new terminal)
npx hardhat run scripts/deploy.js --network localhost

# Start frontend (new terminal)
cd frontend
npm run dev
```

Open http://localhost:5173/

---

## Security & Privacy

**What's Encrypted:**
- All medical records (symptoms, diagnosis, treatment, files)
- Encryption key derived from patient's wallet signature
- Only patient and authorized doctors can decrypt

**What's On Blockchain:**
- Access permissions (who can view records)
- IPFS hashes (not the actual data)
- Transaction history

**What's NOT Stored:**
- No names, emails, or personal identifiers
- No unencrypted medical data
- No passwords (wallet-based auth)

---

## Troubleshooting

**"Wrong Network" error?**  
→ Switch to Sepolia in MetaMask (Settings → Advanced → Show test networks)

**"Insufficient funds" error?**  
→ Get free Sepolia ETH from https://sepoliafaucet.com/

**RPC errors?**  
→ Wait 30-60 seconds and retry (public RPC rate limits)

**Can't decrypt records?**  
→ Make sure you're using the correct wallet (patient's wallet for patient records)

**MetaMask connects wrong account?**  
→ Disconnect in MetaMask → Connected sites → Disconnect → Refresh page

---

## Contributing

Found a bug? Have an idea? Contributions welcome!

1. Open an issue on GitHub
2. Fork and submit a PR
3. Help test on Sepolia

---

## Legal

**Status:** Research/Educational Project  
**Compliance:** Not HIPAA compliant (yet)  
**Use:** Testnet only - not for real patient data  
**License:** MIT

---

## Links

- **Live App:** https://fastidious-rolypoly-4b0715.netlify.app/
- **GitHub:** https://github.com/Ntunga08/PL-genesis-
- **Contract:** https://sepolia.etherscan.io/address/0x5956368Cb494B9A4168c6a104f433A369A13A19D
- **MetaMask:** https://metamask.io/
- **Sepolia Faucet:** https://sepoliafaucet.com/

---

**Built for a decentralized healthcare future** 🚀

**Status:** 🚧 Alpha Testing | 🌐 Sepolia Testnet | Last Updated: March 2026
