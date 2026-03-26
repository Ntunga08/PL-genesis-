<div align="center">

# 🏥 HealthLink

### Decentralized Medical Records Management System

**Empowering patients with blockchain-based health data ownership**

[![Live Demo](https://img.shields.io/badge/Live-Demo-blue?style=for-the-badge)](https://healthlink-v2.netlify.app/)
[![Sepolia](https://img.shields.io/badge/Network-Sepolia-purple?style=for-the-badge)](https://sepolia.etherscan.io/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

[Live Demo](https://healthlink-v2.netlify.app/) • [Smart Contract](https://sepolia.etherscan.io/address/0x97A985354D340306633670DB945A736A57102a00) • [Documentation](#documentation)

</div>

---

## 📋 Overview

HealthLink is a decentralized healthcare platform that puts patients in control of their medical records. Built on Ethereum blockchain with IPFS storage, it enables secure, transparent, and patient-controlled health data management.

### Key Features

🔐 **Patient-Controlled Access** - Grant or revoke doctor access anytime  
📊 **8 Professional Record Types** - Comprehensive medical documentation  
💬 **Real-Time Chat** - Secure doctor-patient communication  
🌐 **100+ Wallet Support** - MetaMask, Coinbase, WalletConnect & more  
📱 **QR Code Sharing** - Easy access sharing via QR codes  
🖼️ **Image Upload** - Attach medical images to records  
⏱️ **Timeline Filters** - View records by time period  
🔗 **IPFS Storage** - Decentralized, permanent record storage

---

## 🎯 Use Cases

### For Patients
- Control who accesses your medical records
- View complete medical history in one place
- Share records instantly via QR code
- Communicate securely with healthcare providers
- Own your health data permanently

### For Healthcare Providers
- Access patient records with permission
- Add comprehensive medical documentation
- Upload diagnostic images and lab results
- Consult with patients via secure chat
- Maintain detailed treatment history

---

## 🏗️ Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Patient   │◄────►│  Smart       │◄────►│   Doctor    │
│   Wallet    │      │  Contract    │      │   Wallet    │
└─────────────┘      └──────────────┘      └─────────────┘
       │                     │                      │
       │                     │                      │
       ▼                     ▼                      ▼
┌─────────────────────────────────────────────────────────┐
│                    IPFS Storage (Pinata)                 │
│              Medical Records • Chat Messages             │
└─────────────────────────────────────────────────────────┘
```

**Smart Contract:** `0x97A985354D340306633670DB945A736A57102a00` (Sepolia)

---

## 📚 Medical Record Types

| Type | Icon | Fields | Image Support |
|------|------|--------|---------------|
| **Consultation** | 🩺 | Chief complaint, diagnosis, treatment plan | ❌ |
| **Lab Test** | 🧪 | Test name, results, reference ranges | ✅ |
| **Imaging** | 📷 | Study type, findings, impressions | ✅ |
| **Prescription** | 💊 | Medication, dosage, duration, instructions | ❌ |
| **Procedure** | ⚕️ | Procedure name, indication, outcome | ❌ |
| **Vitals** | ❤️ | BP, heart rate, temperature, SpO2, weight | ❌ |
| **Vaccination** | 💉 | Vaccine name, dose, batch number, site | ❌ |
| **Discharge Summary** | 📋 | Admission date, diagnosis, treatment, follow-up | ❌ |

---

## 🚀 Quick Start

### Prerequisites

- Web3 wallet (MetaMask, Coinbase Wallet, etc.)
- Sepolia testnet ETH ([Get free ETH](https://sepoliafaucet.com/))

### For Patients

1. **Connect Wallet** → Visit [HealthLink V2](https://healthlink-v2.netlify.app/)
2. **Switch to Patient Dashboard** → Click "Patient Dashboard"
3. **Grant Access** → Navigate to "Grant Access" tab, enter doctor's wallet address
4. **View Records** → Check "My Records" tab to see all medical records
5. **Chat** → Use "Chat" tab to communicate with your doctor

### For Healthcare Providers

1. **Connect Wallet** → Visit [HealthLink V2](https://healthlink-v2.netlify.app/)
2. **Switch to Attendant Dashboard** → Click "Attendant Dashboard"
3. **Enter Patient Address** → Input patient's wallet address
4. **Add Records** → Select record type, fill form, upload images if needed
5. **Chat** → Use "Chat" tab to consult with patient

---

## 💻 Tech Stack

### Blockchain
- **Smart Contracts:** Solidity ^0.8.20
- **Development:** Hardhat
- **Network:** Ethereum Sepolia Testnet
- **Testing:** Hardhat Test Suite

### Frontend
- **Framework:** React 18 + Vite
- **Styling:** Tailwind CSS
- **Web3:** RainbowKit + Wagmi + Viem
- **State:** React Hooks
- **HTTP:** Fetch API

### Storage & Infrastructure
- **Decentralized Storage:** IPFS (Pinata)
- **Deployment:** Netlify
- **RPC Provider:** Alchemy

---

## 🛠️ Local Development

### Installation

```bash
# Clone repository
git clone https://github.com/Ntunga08/PL-genesis-.git
cd PL-genesis-

# Install dependencies
npm install
cd frontend && npm install && cd ..
```

### Environment Setup

Create `.env` in root directory:

```env
ALCHEMY_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
PRIVATE_KEY=your_wallet_private_key
```

Create `frontend/.env`:

```env
VITE_PINATA_JWT=your_pinata_jwt_token
VITE_PINATA_GATEWAY=your_pinata_gateway_url
```

### Run Locally

```bash
# Start local blockchain
npx hardhat node

# Deploy contract (new terminal)
npx hardhat run scripts/deploy.js --network localhost

# Update frontend/src/constants.js with deployed address

# Start frontend
cd frontend
npm run dev
```

### Testing

```bash
# Run smart contract tests
npx hardhat test

# Run with coverage
npx hardhat coverage
```

---

## 🔒 Security Considerations

### Current Implementation (V2)
- Records stored on IPFS without encryption
- Access control enforced by smart contract
- Patient can grant/revoke access anytime
- All transactions require wallet signature

### Planned Improvements (V3)
- End-to-end encryption using asymmetric cryptography
- Multi-signature access for sensitive records
- Zero-knowledge proofs for privacy
- HIPAA compliance features

⚠️ **Important:** This is a testnet application. Do not store real medical data.

---

## 📖 Documentation

### Smart Contract Functions

```solidity
// Patient functions
grantAccess(address attendant)        // Grant doctor access
revokeAccess(address attendant)       // Revoke doctor access
getMyRecords()                        // View own records

// Doctor functions (requires access)
addRecord(address patient, string ipfsHash, string recordType)
getRecords(address patient)

// View functions
hasAccess(address patient, address attendant)
```

### Frontend Components

- **Home** - Landing page with role selection
- **PatientDashboard** - Patient interface (records, access, chat)
- **AttendantDashboard** - Doctor interface (add records, view, chat)
- **ChatBox** - Real-time messaging component
- **RecordCard** - Display individual medical records
- **QRCodeCard** - Generate QR codes for access sharing

---

## 🌐 Deployment

### Frontend (Netlify)

```bash
# Build production bundle
cd frontend
npm run build

# Deploy to Netlify
# Connect GitHub repo or drag dist folder to Netlify
```

### Smart Contract (Sepolia)

```bash
# Deploy to Sepolia testnet
npx hardhat run scripts/deployToTestnet.js --network sepolia

# Verify on Etherscan
npx hardhat verify --network sepolia DEPLOYED_ADDRESS
```

---

## 🔗 Links

- **Live Application:** https://healthlink-v2.netlify.app/
- **Smart Contract:** https://sepolia.etherscan.io/address/0x97A985354D340306633670DB945A736A57102a00
- **Sepolia Faucet:** https://sepoliafaucet.com/
- **IPFS Gateway:** https://gateway.pinata.cloud/

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Team

Built with ❤️ by the HealthLink Team

---

## 📞 Support

For questions or support:
- Open an issue on GitHub
- Contact via project repository

---

<div align="center">

**HealthLink V2** • Sepolia Testnet • March 2026

Made with blockchain technology for a healthier future 🏥

</div>
