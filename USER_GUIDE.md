# HealthLink User Guide

## 📚 Documentation

- **Quick Start:** [QUICK_START.md](QUICK_START.md) - Get started in 5 minutes
- **Troubleshooting:** [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Common issues and solutions
- **Deployment:** [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - For developers

## What is HealthLink?

HealthLink is a decentralized medical records system where:
- **Patients** control their own medical data
- **Doctors** can only access records with patient permission
- All data is encrypted and stored securely
- No central authority can access your records

## Getting Started

### 1. Install MetaMask

MetaMask is your digital wallet and identity.

1. Go to https://metamask.io/
2. Click "Download" and install the browser extension
3. Create a new wallet and save your recovery phrase safely
4. **IMPORTANT:** Never share your recovery phrase with anyone!

### 2. Get Testnet ETH

You need a small amount of testnet ETH to pay for transactions (it's free!).

**For Sepolia:**
- Visit https://sepoliafaucet.com/
- Paste your wallet address
- Click "Send Me ETH"

**For Base Sepolia:**
- Visit https://www.alchemy.com/faucets/base-sepolia
- Connect your wallet
- Request testnet ETH

### 3. Add the Correct Network

Open MetaMask and add the network where HealthLink is deployed:

**Sepolia (Ethereum Testnet):**
- Already in MetaMask by default
- Just select it from the network dropdown

**Base Sepolia (Layer 2 - Recommended):**
- Click network dropdown → "Add network"
- Enter these details:
  - Network name: `Base Sepolia`
  - RPC URL: `https://sepolia.base.org`
  - Chain ID: `84532`
  - Currency symbol: `ETH`
  - Block explorer: `https://sepolia.basescan.org`

**Arbitrum Sepolia (Layer 2):**
- Click network dropdown → "Add network"
- Enter these details:
  - Network name: `Arbitrum Sepolia`
  - RPC URL: `https://sepolia-rollup.arbitrum.io/rpc`
  - Chain ID: `421614`
  - Currency symbol: `ETH`
  - Block explorer: `https://sepolia.arbiscan.io`

---

## For Patients

### Connecting Your Wallet

1. Go to the HealthLink website
2. Click "Connect Wallet"
3. Approve the connection in MetaMask
4. Click "I'm a Patient"

### Granting Access to Doctors

1. Get the doctor's wallet address (they can share it with you)
2. In the "Grant Access" section, paste the doctor's address
3. Click "Grant Access"
4. Confirm the transaction in MetaMask
5. Wait for confirmation (usually 5-30 seconds)

### Viewing Your Medical Records

1. Your records are displayed on the Patient Dashboard
2. Click "🔓 Decrypt All" to view encrypted records
3. You'll need to sign a message in MetaMask (this doesn't cost anything)
4. Your records will be decrypted and displayed

### Revoking Access

1. Find the doctor in your "Authorized Medical Staff" list
2. Click "Revoke" next to their address
3. Confirm the transaction
4. They will no longer be able to view your records

### Sharing Your Wallet Address

- Click "Copy Address" button to copy your wallet address
- Or scan the QR code with the doctor's phone
- Share this address with doctors so they can add records

---

## For Doctors/Medical Staff

### Connecting Your Wallet

1. Go to the HealthLink website
2. Click "Connect Wallet"
3. Approve the connection in MetaMask
4. Click "I'm Medical Staff"

### Accessing Patient Records

1. Get the patient's wallet address (they can share it via QR code or text)
2. Paste the address in the "Select Patient" field
3. Click "Load"
4. If you have access, you'll see the patient's records
5. If not, you'll see "Access Denied" - ask the patient to grant you access

### Adding Medical Records

Once you have access to a patient:

1. Fill in the standard fields:
   - Symptoms
   - Diagnosis
   - Treatment
   - Notes (optional)

2. Add custom fields (optional):
   - Click "+ Add Custom Field"
   - Enter field name (e.g., "Blood Pressure")
   - Select type (Text, Number, or Date)
   - Enter value
   - Add as many fields as needed

3. Upload files (optional):
   - Click "Choose Files"
   - Select multiple files (lab results, X-rays, etc.)
   - Supported formats: PDF, JPG, PNG, DOC, DOCX

4. Click "🔒 Encrypt & Add Record"
5. Confirm the transaction in MetaMask
6. Wait for confirmation

### Viewing Patient Records

1. Records are displayed after loading a patient
2. Click "🔓 Decrypt All" to view encrypted records
3. Sign the message in MetaMask
4. Records will be decrypted and displayed

---

## Understanding Costs

### Testnet (Free):
- All transactions are FREE
- You're using fake testnet ETH
- Perfect for testing and learning

### Mainnet (Real Money):
- **Ethereum Mainnet:** $10-$100 per transaction (NOT recommended)
- **Layer 2 (Base, Arbitrum):** $0.01-$0.10 per transaction (Recommended)

---

## Security Tips

### For Everyone:

1. **Never share your recovery phrase** - Anyone with it can steal your funds
2. **Double-check addresses** - Blockchain transactions are irreversible
3. **Use a hardware wallet** for large amounts (Ledger, Trezor)
4. **Keep your MetaMask updated**
5. **Be careful of phishing sites** - Always check the URL

### For Patients:

1. **Only grant access to trusted doctors**
2. **Revoke access when no longer needed**
3. **Your wallet = your medical records** - Keep it safe!
4. **Backup your recovery phrase** in multiple secure locations

### For Doctors:

1. **Verify patient identity** before accessing records
2. **Never share patient addresses** publicly
3. **Keep your wallet secure** - it's your professional identity
4. **Log out when done** - Disconnect your wallet

---

## Troubleshooting

### "Insufficient funds" error:
- You need more testnet ETH
- Visit a faucet and request more

### "Wrong network" warning:
- Switch to the correct network in MetaMask
- Check which network HealthLink is deployed on

### "Transaction failed":
- Check you have enough ETH for gas
- Try increasing gas limit
- Network might be congested - wait and try again

### Can't decrypt records:
- Make sure you're using the correct wallet
- Patient must decrypt with their own wallet
- Doctor must have been granted access first

### MetaMask not connecting:
- Refresh the page
- Make sure MetaMask is unlocked
- Try disconnecting and reconnecting

---

## FAQ

**Q: Do I need to create an account?**
A: No! Your MetaMask wallet IS your account.

**Q: Can I use this on mobile?**
A: Yes! Use MetaMask mobile app and open the website in the in-app browser.

**Q: Is my data really private?**
A: Yes! Data is encrypted with your wallet signature. Only you and authorized doctors can decrypt it.

**Q: What if I lose my wallet?**
A: If you have your recovery phrase, you can restore it. Without it, your data is lost forever.

**Q: Can the app owner see my records?**
A: No! Everything is encrypted and stored on IPFS. Even the app owner can't decrypt your data.

**Q: How much does it cost?**
A: On testnet: FREE. On mainnet Layer 2: ~$0.01-$0.10 per transaction.

**Q: Can I delete my records?**
A: No. Blockchain data is permanent. You can revoke access, but records remain on-chain.

**Q: What happens if a doctor loses access?**
A: They can no longer view your records. You can re-grant access anytime.

---

## Support

If you need help:
1. Check this guide first
2. Check the troubleshooting section
3. Contact the app administrator
4. Join the community Discord/Telegram (if available)

---

## Privacy Notice

- Your medical data is encrypted end-to-end
- Only you and authorized doctors can decrypt it
- Data is stored on IPFS (decentralized storage)
- Transaction history is public on blockchain (but encrypted data is not readable)
- Your wallet address is your identity (pseudonymous, not anonymous)

---

**Remember: You are in control of your medical data!**
