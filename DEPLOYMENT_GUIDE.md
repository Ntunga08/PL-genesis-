# HealthLink Deployment Guide

## Overview
This guide will help you deploy HealthLink to production so real users (patients and doctors) can use it.

## Prerequisites
- MetaMask wallet with some testnet ETH
- Alchemy account (free)
- Pinata account (free)
- Vercel/Netlify account (free)

---

## Step 1: Deploy Smart Contract to Testnet

### Option A: Sepolia Testnet (Ethereum)

1. **Get Sepolia ETH from faucet:**
   - https://sepoliafaucet.com/
   - https://www.alchemy.com/faucets/ethereum-sepolia

2. **Update your .env file:**
   ```bash
   ALCHEMY_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
   PRIVATE_KEY=your_wallet_private_key
   PINATA_JWT=your_pinata_jwt
   ```

3. **Deploy contract:**
   ```bash
   npx hardhat run scripts/deploy.js --network sepolia
   ```

4. **Save the contract address** - you'll need it for the frontend!

### Option B: Base Sepolia (Layer 2 - Cheaper Gas)

1. **Get Base Sepolia ETH:**
   - Bridge from Sepolia: https://bridge.base.org/
   - Or use faucet: https://www.alchemy.com/faucets/base-sepolia

2. **Add Base Sepolia to hardhat.config.js:**
   ```javascript
   baseSepolia: {
     url: "https://base-sepolia.g.alchemy.com/v2/YOUR_KEY",
     accounts: [process.env.PRIVATE_KEY],
     chainId: 84532
   }
   ```

3. **Deploy:**
   ```bash
   npx hardhat run scripts/deploy.js --network baseSepolia
   ```

### Option C: Arbitrum Sepolia (Layer 2 - Very Cheap)

1. **Get Arbitrum Sepolia ETH:**
   - https://faucet.quicknode.com/arbitrum/sepolia

2. **Add to hardhat.config.js:**
   ```javascript
   arbitrumSepolia: {
     url: "https://arb-sepolia.g.alchemy.com/v2/YOUR_KEY",
     accounts: [process.env.PRIVATE_KEY],
     chainId: 421614
   }
   ```

3. **Deploy:**
   ```bash
   npx hardhat run scripts/deploy.js --network arbitrumSepolia
   ```

---

## Step 2: Update Frontend Configuration

1. **Update `frontend/src/constants.js`:**
   ```javascript
   // Replace with your deployed contract address
   export const CONTRACT_ADDRESS = "0xYourContractAddress";

   // Update chain ID based on network:
   // Sepolia: 11155111
   // Base Sepolia: 84532
   // Arbitrum Sepolia: 421614
   export const CHAIN_ID = 11155111;
   ```

2. **Update `frontend/.env`:**
   ```bash
   VITE_PINATA_JWT=your_pinata_jwt_token
   ```

3. **Test locally:**
   ```bash
   cd frontend
   npm run dev
   ```

---

## Step 3: Deploy Frontend to Vercel (Recommended)

### Using Vercel (Easiest)

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Deploy from frontend folder:**
   ```bash
   cd frontend
   vercel
   ```

3. **Follow prompts:**
   - Link to your GitHub account
   - Set project name
   - Set environment variable: `VITE_PINATA_JWT`

4. **Your app will be live at:** `https://your-app.vercel.app`

### Using Netlify

1. **Build the frontend:**
   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy to Netlify:**
   - Go to https://app.netlify.com/
   - Drag and drop the `dist` folder
   - Add environment variable: `VITE_PINATA_JWT`

### Using GitHub Pages

1. **Update `vite.config.js`:**
   ```javascript
   export default defineConfig({
     base: '/PL-genesis-/',  // Your repo name
     // ... rest of config
   })
   ```

2. **Build and deploy:**
   ```bash
   cd frontend
   npm run build
   cd dist
   git init
   git add -A
   git commit -m 'deploy'
   git push -f git@github.com:Ntunga08/PL-genesis-.git main:gh-pages
   ```

3. **Enable GitHub Pages:**
   - Go to repo Settings → Pages
   - Source: Deploy from branch `gh-pages`

---

## Step 4: How Users Access the App

### For Patients:

1. **Install MetaMask:**
   - Go to https://metamask.io/
   - Install browser extension
   - Create a new wallet

2. **Add the correct network:**
   - Open MetaMask
   - Click network dropdown
   - Add network manually:
     - **Sepolia:** Already in MetaMask
     - **Base Sepolia:** 
       - Network name: Base Sepolia
       - RPC URL: https://sepolia.base.org
       - Chain ID: 84532
       - Currency: ETH
     - **Arbitrum Sepolia:**
       - Network name: Arbitrum Sepolia
       - RPC URL: https://sepolia-rollup.arbitrum.io/rpc
       - Chain ID: 421614
       - Currency: ETH

3. **Get testnet ETH:**
   - Use faucets mentioned above
   - Or ask you to send them some

4. **Use the app:**
   - Go to your deployed URL
   - Click "Connect Wallet"
   - Click "I'm a Patient"
   - Grant access to doctors
   - View medical records

### For Doctors:

Same steps as patients, but:
- Click "I'm Medical Staff"
- Enter patient's wallet address
- Add medical records

---

## Step 5: Production Checklist

### Security:
- [ ] Never commit `.env` files
- [ ] Use environment variables for sensitive data
- [ ] Test all features on testnet before mainnet
- [ ] Add rate limiting to prevent spam
- [ ] Consider adding authentication layer

### User Experience:
- [ ] Add network auto-switch functionality
- [ ] Show clear error messages
- [ ] Add loading states
- [ ] Mobile responsive design
- [ ] Add user onboarding tutorial

### Smart Contract:
- [ ] Audit contract code
- [ ] Test with multiple users
- [ ] Consider upgradeability pattern
- [ ] Add emergency pause function
- [ ] Verify contract on block explorer

---

## Step 6: Going to Mainnet (Production)

**WARNING:** Only do this after thorough testing!

### Ethereum Mainnet:
- Very expensive gas fees ($10-$100 per transaction)
- Not recommended for this use case

### Layer 2 Mainnet (Recommended):
- **Base Mainnet:** Very cheap, backed by Coinbase
- **Arbitrum One:** Very cheap, well-established
- **Optimism:** Very cheap, good ecosystem

**Steps:**
1. Get real ETH on Layer 2
2. Deploy contract to mainnet
3. Update frontend config
4. Redeploy frontend
5. Users need real ETH (but very small amounts on L2)

---

## Cost Breakdown

### Testnet (Free):
- Contract deployment: Free (testnet ETH)
- Transactions: Free (testnet ETH)
- Frontend hosting: Free (Vercel/Netlify)
- IPFS storage: Free tier (Pinata)

### Mainnet Layer 2:
- Contract deployment: ~$1-5
- Each transaction: ~$0.01-0.10
- Frontend hosting: Free
- IPFS storage: Free tier

---

## User Registration Flow

**There is NO traditional registration!** Users just need:

1. **MetaMask wallet** (their "account")
2. **Small amount of testnet ETH** (for gas fees)
3. **Your app URL**

**That's it!** The blockchain handles everything:
- Wallet address = User ID
- No passwords to remember
- No email verification
- No database needed
- Fully decentralized

---

## Troubleshooting

### Users can't connect wallet:
- Make sure they're on the correct network
- Check MetaMask is unlocked
- Try refreshing the page

### Transactions failing:
- Check they have enough ETH for gas
- Verify contract address is correct
- Check network is not congested

### Decryption failing:
- Patient must decrypt with their own wallet
- Doctor must have been granted access
- Make sure using same network as deployment

---

## Support Resources

- **Alchemy Dashboard:** https://dashboard.alchemy.com/
- **Pinata Dashboard:** https://app.pinata.cloud/
- **Sepolia Faucet:** https://sepoliafaucet.com/
- **Base Docs:** https://docs.base.org/
- **Arbitrum Docs:** https://docs.arbitrum.io/

---

## Next Steps

1. Deploy to testnet (Sepolia or Base Sepolia)
2. Host frontend on Vercel
3. Share URL with test users
4. Collect feedback
5. Iterate and improve
6. Consider mainnet deployment

**Your app will be live and accessible to anyone with MetaMask!**
