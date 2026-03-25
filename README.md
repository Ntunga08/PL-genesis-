# 🏥 HealthLink - Decentralized Medical Records

> ⚠️ **DEVELOPMENT STATUS:** This project is currently under active development. Features may change, and the system is deployed on Sepolia testnet for testing purposes only. Not ready for production use with real patient data.

A blockchain-based medical records system that gives patients full control over their medical data through decentralized technology.

---

## 📋 Table of Contents
- [The Problem](#-the-problem)
- [Our Solution](#-our-solution)
- [Live Demo](#-live-demo)
- [How It Works](#-how-it-works)
- [For Patients](#-for-patients-how-to-use)
- [For Doctors](#-for-doctors-how-to-use)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Development Status](#-development-status)
- [Known Issues](#-known-issues)
- [Documentation](#-documentation)

---

## 🚨 The Problem

### Current Healthcare Data Challenges:

1. **Centralized Control**
   - Hospitals and clinics own your medical records
   - Patients have limited access to their own data
   - Data is siloed across different healthcare providers

2. **Privacy Concerns**
   - Sensitive medical data stored in centralized databases
   - Risk of data breaches and unauthorized access
   - Third parties can access data without patient consent

3. **Lack of Portability**
   - Difficult to transfer records between providers
   - Patients can't easily share records with new doctors
   - Medical history gets fragmented across systems

4. **Access Control Issues**
   - Patients can't easily grant/revoke doctor access
   - No transparent audit trail of who accessed data
   - Emergency access is complicated

---

## ✅ Our Solution

### HealthLink: Patient-Owned Medical Records

**Core Principles:**
- **Patient Ownership:** Your wallet = your medical records. You control everything.
- **Decentralized Storage:** Data stored on IPFS, not centralized servers
- **End-to-End Encryption:** Only you and authorized doctors can read your data
- **Blockchain Access Control:** Smart contracts manage permissions transparently
- **Portable:** Access your records anywhere with your wallet

**How We Address Each Problem:**

| Problem | HealthLink Solution |
|---------|-------------------|
| Centralized control | Blockchain-based ownership - you control access |
| Privacy concerns | End-to-end encryption with TweetNaCl |
| Lack of portability | Access records anywhere with MetaMask wallet |
| Access control | Grant/revoke doctor access with one click |
| Data breaches | Decentralized IPFS storage, encrypted data |
| Audit trail | All access changes recorded on blockchain |

---

## 🌐 Live Demo

**Status:** 🟡 Active (Testnet Only)

**Frontend:** https://fastidious-rolypoly-4b0715.netlify.app/

**Smart Contract:** `0x5956368Cb494B9A4168c6a104f433A369A13A19D`

**Network:** Sepolia Testnet (Chain ID: 11155111)

**Block Explorer:** [View on Etherscan](https://sepolia.etherscan.io/address/0x5956368Cb494B9A4168c6a104f433A369A13A19D)

---

## 🔄 How It Works

### System Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Patient   │────────▶│   MetaMask   │────────▶│  HealthLink │
│  (Browser)  │         │   (Wallet)   │         │   Frontend  │
└─────────────┘         └──────────────┘         └─────────────┘
                                                         │
                                                         ▼
                        ┌────────────────────────────────────┐
                        │                                    │
                        ▼                                    ▼
                ┌──────────────┐                    ┌──────────────┐
                │   Ethereum   │                    │     IPFS     │
                │   Sepolia    │                    │   (Pinata)   │
                │              │                    │              │
                │ • Access     │                    │ • Encrypted  │
                │   Control    │                    │   Medical    │
                │ • Audit Log  │                    │   Records    │
                └──────────────┘                    └──────────────┘
```

### Data Flow

1. **Patient grants access** → Transaction on Ethereum → Access recorded on blockchain
2. **Doctor adds record** → Data encrypted → Uploaded to IPFS → Hash stored on blockchain
3. **Patient views records** → Fetch from IPFS → Decrypt with wallet signature → Display

### Security Model

- **Encryption Key:** Derived from patient's wallet signature
- **Access Control:** Smart contract enforces permissions
- **Data Storage:** Encrypted data on IPFS, only hash on blockchain
- **Decryption:** Only patient and authorized doctors can decrypt

---

## 👤 For Patients: How to Use

### Prerequisites

1. **Install MetaMask**
   - Go to https://metamask.io/
   - Install browser extension
   - Create wallet and save recovery phrase securely

2. **Add Sepolia Network**
   - Open MetaMask → Settings → Advanced
   - Enable "Show test networks"
   - Select "Sepolia test network" from dropdown

3. **Get Free Sepolia ETH**
   - Visit: https://sepoliafaucet.com/
   - Paste your wallet address
   - Get 0.5 SepoliaETH (free, for testing)

### Using the App

#### Step 1: Connect Your Wallet
1. Visit: https://fastidious-rolypoly-4b0715.netlify.app/
2. Click "Connect Wallet"
3. Approve in MetaMask
4. Switch to Sepolia if prompted

#### Step 2: Access Patient Dashboard
1. Click "Patient Dashboard"
2. Your wallet address is your patient ID

#### Step 3: Grant Access to Doctor
1. Get doctor's wallet address (they can share via QR code)
2. Paste address in "Grant Access" field
3. Click "Grant Access"
4. Confirm transaction in MetaMask (~$0.001 in test ETH)
5. Wait 30-60 seconds for confirmation

#### Step 4: View Your Records
1. Scroll to "Medical Records" section
2. Click "🔓 Decrypt All" button
3. Sign message in MetaMask (free, no gas)
4. View decrypted records

#### Step 5: Revoke Access (Optional)
1. Find doctor in "Authorized Medical Staff" list
2. Click "Revoke" button
3. Confirm transaction
4. Doctor can no longer access your records

### Your Responsibilities
- ✅ Keep your wallet recovery phrase safe
- ✅ Only grant access to trusted doctors
- ✅ Revoke access when no longer needed
- ✅ Verify doctor's address before granting access

---

## 👨‍⚕️ For Doctors: How to Use

### Prerequisites

Same as patients:
1. Install MetaMask
2. Add Sepolia network
3. Get Sepolia ETH from faucet

### Using the App

#### Step 1: Connect Your Wallet
1. Visit: https://fastidious-rolypoly-4b0715.netlify.app/
2. Click "Connect Wallet"
3. Approve in MetaMask

#### Step 2: Access Attendant Dashboard
1. Click "Attendant Dashboard"
2. Your wallet address is your doctor ID

#### Step 3: Get Patient Access
1. Share your wallet address with patient (via QR code or copy)
2. Wait for patient to grant you access
3. Patient will send you their wallet address

#### Step 4: Load Patient Records
1. Paste patient's wallet address in "Select Patient" field
2. Click "Load" or press Enter
3. If access granted, you'll see patient's records
4. If denied, ask patient to grant access first

#### Step 5: Add Medical Record

**Option A: Form Record (Encrypted)**
1. Fill in standard fields:
   - Symptoms
   - Diagnosis
   - Treatment
   - Notes (optional)
2. Add custom fields (optional):
   - Click "+ Add Custom Field"
   - Enter field name (e.g., "Blood Pressure")
   - Select type (Text/Number/Date)
   - Enter value
3. Click "🔒 Encrypt & Add Record"
4. Confirm transaction in MetaMask
5. Wait for confirmation

**Option B: File Upload**
1. Click "Choose Files"
2. Select multiple files (PDF, JPG, PNG, DOC, DOCX)
3. Review selected files
4. Click "📤 Upload X File(s)"
5. Confirm transaction for each file
6. Wait for upload to complete

#### Step 6: View Patient Records
1. Click "🔓 Decrypt All" button
2. Sign message in MetaMask
3. View decrypted records with full details

### Your Responsibilities
- ✅ Verify patient identity before accessing records
- ✅ Keep your wallet secure (it's your professional identity)
- ✅ Never share patient addresses publicly
- ✅ Disconnect wallet when done

---

## ✨ Features

### Current Features (v0.1 - Testnet)

- ✅ **Patient-Controlled Access**
  - Grant access to doctors by wallet address
  - Revoke access anytime
  - View list of authorized doctors

- ✅ **End-to-End Encryption**
  - TweetNaCl encryption (industry standard)
  - Encryption key derived from patient's wallet
  - Both patient and doctor can decrypt

- ✅ **Decentralized Storage**
  - Medical records stored on IPFS via Pinata
  - Only encrypted data hash stored on blockchain
  - Permanent, tamper-proof storage

- ✅ **Flexible Record Types**
  - Standard form fields (symptoms, diagnosis, treatment)
  - Custom fields (add any field you need)
  - Multiple file uploads (X-rays, lab reports, etc.)

- ✅ **User-Friendly Interface**
  - Clean, hospital-themed design
  - QR code for easy address sharing
  - Real-time transaction status
  - Network auto-detection

- ✅ **Blockchain Features**
  - Smart contract access control
  - Transparent audit trail
  - Immutable record history
  - Low gas fees on testnet

### Planned Features (Roadmap)

- 🔄 **Emergency Access** - Temporary access for emergency situations
- 🔄 **Multi-Signature Access** - Require multiple approvals for sensitive records
- 🔄 **Record Categories** - Organize records by type (lab, imaging, prescriptions)
- 🔄 **Search & Filter** - Find records by date, doctor, or keyword
- 🔄 **Export Records** - Download records as PDF
- 🔄 **Notifications** - Alert when new records are added
- 🔄 **Mobile App** - Native iOS/Android apps
- 🔄 **Layer 2 Deployment** - Lower fees on Arbitrum/Base
- 🔄 **IPFS Pinning** - Redundant storage across multiple nodes

---

## 🛠️ Tech Stack

### Smart Contract
- **Language:** Solidity 0.8.20
- **Framework:** Hardhat
- **Network:** Ethereum Sepolia Testnet
- **Testing:** Hardhat Test Suite (11 tests passing)

### Frontend
- **Framework:** React 18
- **Build Tool:** Vite 8
- **Styling:** Tailwind CSS v4
- **Blockchain:** Ethers.js v6
- **Encryption:** TweetNaCl + TweetNaCl-util
- **QR Codes:** qrcode.react

### Storage & Infrastructure
- **IPFS:** Pinata (decentralized file storage)
- **Hosting:** Netlify (frontend)
- **RPC:** Multiple public endpoints with fallback

### Development Tools
- **Version Control:** Git + GitHub
- **Package Manager:** npm
- **Testing:** Hardhat + Chai
- **Deployment:** Hardhat scripts

---

## 🚧 Development Status

### Current Phase: Alpha Testing (v0.1)

**What Works:**
- ✅ Smart contract deployed and verified on Sepolia
- ✅ Frontend deployed and accessible
- ✅ Patient can grant/revoke access
- ✅ Doctor can add encrypted records
- ✅ Both can decrypt and view records
- ✅ File uploads to IPFS working
- ✅ Custom fields functional
- ✅ MetaMask integration stable

**What's Being Tested:**
- 🧪 RPC reliability (using multiple fallback endpoints)
- 🧪 Encryption/decryption across different wallets
- 🧪 IPFS data persistence
- 🧪 Gas optimization
- 🧪 User experience flow

**Not Yet Implemented:**
- ❌ Mainnet deployment (testnet only)
- ❌ Production-grade security audit
- ❌ Mobile app
- ❌ Advanced features (search, export, notifications)
- ❌ Backend API (all client-side currently)

### Timeline

- **Q1 2026:** ✅ MVP development complete
- **Q2 2026:** 🔄 Alpha testing on Sepolia (current phase)
- **Q3 2026:** 📅 Security audit + Beta testing
- **Q4 2026:** 📅 Mainnet deployment (Layer 2)

---

## ⚠️ Known Issues

### Active Issues

1. **RPC Rate Limits**
   - **Problem:** Public RPC endpoints have rate limits
   - **Impact:** Transactions may fail during high usage
   - **Workaround:** Wait 30-60 seconds and retry
   - **Fix:** Using multiple fallback RPC endpoints

2. **Sepolia Network Congestion**
   - **Problem:** Sepolia can be slow during peak times
   - **Impact:** Transactions take 1-3 minutes to confirm
   - **Workaround:** Be patient, check Etherscan for status
   - **Fix:** Will deploy to faster Layer 2 networks

3. **MetaMask Account Switching**
   - **Problem:** App doesn't auto-detect account changes
   - **Impact:** Need to refresh page after switching accounts
   - **Workaround:** Refresh page after switching accounts
   - **Fix:** Implementing account change listener

4. **Large File Uploads**
   - **Problem:** Files >10MB may timeout
   - **Impact:** Upload fails silently
   - **Workaround:** Keep files under 5MB
   - **Fix:** Adding file size validation and chunked uploads

5. **Decryption Error Handling**
   - **Problem:** Unclear error messages when decryption fails
   - **Impact:** Users don't know why decryption failed
   - **Workaround:** Ensure using correct wallet
   - **Fix:** Adding better error messages

### Limitations

- **Testnet Only:** Not suitable for real patient data
- **No Backup:** If you lose wallet, data is inaccessible
- **Gas Costs:** Each action requires transaction fee (free on testnet)
- **Browser Only:** No mobile app yet
- **English Only:** No internationalization yet

---

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

## 🤝 Contributing

This project is under active development. Contributions are welcome!

### How to Contribute

1. **Report Issues:** Found a bug? Open an issue on GitHub
2. **Suggest Features:** Have an idea? Create a feature request
3. **Submit PRs:** Fork, develop, and submit pull requests
4. **Test:** Help test on Sepolia and report issues

### Development Setup

```bash
# Clone repository
git clone https://github.com/Ntunga08/PL-genesis-.git
cd PL-genesis-

# Install dependencies
npm install
cd frontend && npm install && cd ..

# Configure environment
cp .env.example .env
# Edit .env with your keys

# Start local blockchain
npx hardhat node

# Deploy contract (in new terminal)
npx hardhat run scripts/deploy.js --network localhost

# Start frontend (in new terminal)
cd frontend
npm run dev
```

Open http://localhost:5173/

---

## 🔒 Security & Privacy

### Security Measures
- ✅ End-to-end encryption with TweetNaCl
- ✅ Decentralized storage (no central database)
- ✅ Smart contract access control
- ✅ Wallet-based authentication
- ✅ Open source code (auditable)

### Privacy Guarantees
- Your medical data is encrypted before leaving your browser
- Only you and authorized doctors can decrypt records
- IPFS stores encrypted data (unreadable without key)
- Blockchain only stores access permissions and IPFS hashes
- No personal information stored on-chain

### What We DON'T Store
- ❌ Names, emails, or personal identifiers
- ❌ Unencrypted medical data
- ❌ Passwords (wallet-based auth)
- ❌ Centralized user database

### Security Limitations (Alpha)
- ⚠️ Not audited by security firm yet
- ⚠️ Testnet only (not production-ready)
- ⚠️ Client-side encryption (no HSM)
- ⚠️ Single encryption key per patient

---

## ⚖️ Legal & Compliance

### Current Status
- 🧪 **Testnet Only:** Not for real patient data
- 🧪 **Research Project:** Educational/demonstration purposes
- 🧪 **No HIPAA Compliance:** Not certified for healthcare use
- 🧪 **No Warranties:** Use at your own risk

### Future Compliance Goals
- 📅 HIPAA compliance assessment
- 📅 GDPR compliance review
- 📅 Healthcare data standards (HL7, FHIR)
- 📅 Security audit by third party
- 📅 Legal review for production use

### Disclaimer
This software is provided "as is" without warranty. Not intended for production use with real patient data. Always consult legal and compliance experts before deploying healthcare applications.

---

## 📞 Support & Contact

### Getting Help
1. **Documentation:** Check this README for complete information
2. **Issues:** Open an issue on [GitHub](https://github.com/Ntunga08/PL-genesis-/issues)
3. **Discussions:** Join GitHub Discussions (coming soon)

### Project Links
- **Live App:** https://fastidious-rolypoly-4b0715.netlify.app/
- **GitHub:** https://github.com/Ntunga08/PL-genesis-
- **Contract:** https://sepolia.etherscan.io/address/0x5956368Cb494B9A4168c6a104f433A369A13A19D

---

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details

---

## 🙏 Acknowledgments

- **Ethereum Foundation** - For Sepolia testnet
- **Pinata** - For IPFS infrastructure
- **MetaMask** - For wallet integration
- **Alchemy** - For RPC endpoints
- **Netlify** - For frontend hosting
- **OpenZeppelin** - For smart contract patterns

---

## 🎯 Project Goals

### Short Term (Q2 2026)
- ✅ Complete alpha testing on Sepolia
- 🔄 Fix known issues and improve UX
- 🔄 Add comprehensive error handling
- 🔄 Implement account change detection
- 🔄 Optimize gas usage

### Medium Term (Q3-Q4 2026)
- 📅 Security audit
- 📅 Deploy to Layer 2 (Arbitrum/Base)
- 📅 Mobile app development
- 📅 Advanced features (search, export, notifications)
- 📅 Multi-language support

### Long Term (2027+)
- 📅 Mainnet deployment
- 📅 HIPAA compliance certification
- 📅 Integration with existing healthcare systems
- 📅 Partnerships with healthcare providers
- 📅 Decentralized identity integration (DID)

---

## 💡 Why Blockchain for Healthcare?

### Traditional System Problems
- Centralized databases are single points of failure
- Patients don't control their own data
- Data breaches expose millions of records
- Difficult to share records between providers
- No transparent audit trail

### Blockchain Benefits
- **Decentralization:** No single point of failure
- **Patient Control:** You own your data via wallet
- **Transparency:** All access changes on-chain
- **Portability:** Access anywhere with wallet
- **Security:** Cryptographic guarantees
- **Immutability:** Tamper-proof record history

### Why HealthLink?
- Simple, user-friendly interface
- No technical knowledge required
- Free to use (testnet)
- Open source and auditable
- Privacy-first design
- Built for real-world use cases

---

**Built with ❤️ for a decentralized healthcare future**

**Status:** 🚧 Under Active Development | 🧪 Alpha Testing Phase | 🌐 Testnet Only

**Last Updated:** March 2026
