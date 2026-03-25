# ⚡ Quick Start Guide

## For End Users (No Coding Required)

### 1️⃣ Install MetaMask
- Go to https://metamask.io/
- Install the browser extension
- Create a new wallet or import existing one
- **Save your seed phrase securely!**

### 2️⃣ Get Test ETH
You need Sepolia ETH (free testnet tokens) to use the app:

**Option A: Google Cloud Faucet** (Easiest if you have mainnet ETH)
- Visit: https://cloud.google.com/application/web3/faucet/ethereum/sepolia
- Connect wallet
- Get 0.05 Sepolia ETH instantly

**Option B: Alchemy Faucet**
- Visit: https://sepoliafaucet.com/
- Create free Alchemy account
- Get 0.5 Sepolia ETH per day

**Option C: Infura Faucet**
- Visit: https://www.infura.io/faucet/sepolia
- Sign up and get test ETH

### 3️⃣ Open the App
Visit: **https://fastidious-rolypoly-4b0715.netlify.app/**

### 4️⃣ Connect Your Wallet
1. Click "Connect Wallet" button
2. MetaMask will pop up - click "Connect"
3. If prompted, switch to Sepolia Testnet (or click the banner)

### 5️⃣ Choose Your Role

#### 👤 As a Patient:
1. Click "Patient Dashboard"
2. **Grant Access to Doctor:**
   - Enter doctor's wallet address (e.g., `0x1234...`)
   - Click "Grant Access"
   - Confirm transaction in MetaMask
3. **View Your Records:**
   - Scroll down to see all your medical records
   - Click "Decrypt All" to view encrypted data
4. **Share Your Address:**
   - Use the QR code to share your wallet address with doctors

#### 👨‍⚕️ As a Doctor/Attendant:
1. Click "Attendant Dashboard"
2. **Enter Patient Address:**
   - Get patient's wallet address (they can share via QR code)
   - Paste it in the input field
3. **Add Medical Record:**
   - Fill in symptoms, diagnosis, treatment
   - Add custom fields if needed (e.g., "Blood Pressure: 120/80")
   - Upload files (X-rays, lab reports, etc.)
   - Click "Encrypt & Add Record"
   - Confirm transaction in MetaMask
4. **View Patient Records:**
   - Click "Decrypt All" to view encrypted records
   - Sign the decryption message in MetaMask

## 🎯 Example Workflow

### Scenario: Patient visits doctor

1. **Patient (Alice):**
   - Opens app → Patient Dashboard
   - Shares wallet address with doctor (via QR code or copy-paste)
   - Grants access to doctor's address: `0xBefC9Fb34e9D10DA5476a3081EF7BDaD906F3637`
   - Confirms transaction (costs ~$0.001 in test ETH)

2. **Doctor (Bob):**
   - Opens app → Attendant Dashboard
   - Enters Alice's address: `0x652866962e66F28e039236304dDBcC633BB76366`
   - Adds medical record:
     - Symptoms: "Fever, headache"
     - Diagnosis: "Viral infection"
     - Treatment: "Rest, fluids, paracetamol"
     - Uploads lab report PDF
   - Confirms transaction

3. **Patient (Alice):**
   - Refreshes Patient Dashboard
   - Sees new record from Bob
   - Clicks "Decrypt All" to view details
   - Can revoke Bob's access anytime

## 💡 Tips

- **Multiple Accounts:** Use different MetaMask accounts to test patient/doctor roles
- **Test Safely:** This is a testnet - no real money involved
- **Privacy:** All data is encrypted - only you and authorized doctors can read it
- **Transactions:** Each action (grant access, add record) requires a small gas fee
- **Patience:** Sepolia can be slow - wait 30-60 seconds for transactions

## ❓ Having Issues?

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common problems and solutions.

## 🔗 Useful Links

- **Live App:** https://fastidious-rolypoly-4b0715.netlify.app/
- **Contract:** https://sepolia.etherscan.io/address/0x5956368Cb494B9A4168c6a104f433A369A13A19D
- **GitHub:** https://github.com/Ntunga08/PL-genesis-
- **MetaMask:** https://metamask.io/
- **Sepolia Faucets:** https://sepoliafaucet.com/

## 🚀 Ready to Start?

1. ✅ MetaMask installed
2. ✅ Sepolia ETH in wallet
3. ✅ App opened: https://fastidious-rolypoly-4b0715.netlify.app/

**You're all set! Connect your wallet and start using HealthLink!** 🎉
