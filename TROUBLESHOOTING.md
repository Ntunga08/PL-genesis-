# 🔧 Troubleshooting Guide

## Common Issues and Solutions

### 1. "Wrong Network" Banner

**Problem:** App shows "Please switch to Sepolia Testnet"

**Solution:**
1. Click the banner to auto-switch networks
2. Or manually add Sepolia in MetaMask:
   - Network Name: `Sepolia Testnet`
   - RPC URL: `https://ethereum-sepolia-rpc.publicnode.com`
   - Chain ID: `11155111`
   - Currency Symbol: `ETH`
   - Block Explorer: `https://sepolia.etherscan.io`

### 2. RPC Errors ("could not coalesce error")

**Problem:** Transactions fail with RPC endpoint errors

**Causes:**
- Public RPC rate limits
- Network congestion
- Temporary RPC downtime

**Solutions:**
1. **Wait and retry:** Public RPCs have rate limits, wait 30-60 seconds
2. **Change RPC in MetaMask:**
   - Go to MetaMask Settings → Networks → Sepolia
   - Try these alternative RPCs:
     - `https://ethereum-sepolia-rpc.publicnode.com`
     - `https://rpc.sepolia.org`
     - `https://sepolia.gateway.tenderly.co`
3. **Use your own RPC:** Get free API key from [Alchemy](https://www.alchemy.com/) or [Infura](https://www.infura.io/)

### 3. "Insufficient Funds" Error

**Problem:** Can't send transactions

**Solution:**
- Get free Sepolia ETH from faucets:
  - [Google Cloud Faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia) (0.05 ETH, requires mainnet ETH)
  - [Alchemy Faucet](https://sepoliafaucet.com/) (0.5 ETH/day)
  - [Infura Faucet](https://www.infura.io/faucet/sepolia)
- You only need ~0.01 ETH for testing

### 4. MetaMask Connects to Wrong Account

**Problem:** MetaMask auto-connects to unwanted account

**Solution:**
1. Open MetaMask
2. Click the three dots (⋮) → Connected sites
3. Find your app and click "Disconnect"
4. Refresh the page
5. Click "Connect Wallet" and select the correct account

### 5. Can't Switch Accounts in MetaMask

**Problem:** Want to test with different accounts

**Solution:**
1. Disconnect current account (see above)
2. In MetaMask, switch to desired account
3. Refresh the app
4. Click "Connect Wallet"

### 6. Decryption Fails

**Problem:** Records show "Decryption failed"

**Causes:**
- Wrong wallet connected
- Record encrypted with different key
- Corrupted IPFS data

**Solution:**
1. Ensure you're using the PATIENT's wallet (not doctor's)
2. Click "Decrypt All" button
3. Sign the decryption message in MetaMask
4. If still failing, the record may be corrupted

### 7. Files Won't Upload

**Problem:** File upload fails or hangs

**Causes:**
- File too large (>10MB)
- IPFS gateway timeout
- Network issues

**Solution:**
1. Keep files under 5MB
2. Use supported formats: PDF, JPG, PNG, DOC, DOCX
3. Try uploading one file at a time
4. Check your internet connection

### 8. Transaction Pending Forever

**Problem:** MetaMask shows pending transaction

**Solution:**
1. Wait 2-3 minutes (Sepolia can be slow)
2. Check transaction on [Sepolia Etherscan](https://sepolia.etherscan.io)
3. If stuck, speed up or cancel in MetaMask
4. Refresh the app after transaction completes

### 9. "Access Denied" When Viewing Records

**Problem:** Doctor can't see patient records

**Causes:**
- Patient hasn't granted access
- Access was revoked
- Wrong patient address entered

**Solution:**
1. Verify patient granted access to your wallet address
2. Double-check patient address (case-sensitive)
3. Ask patient to re-grant access
4. Refresh the page after access is granted

### 10. App Shows Black Screen

**Problem:** App doesn't load, blank page

**Solution:**
1. Clear browser cache (Ctrl+Shift+Delete)
2. Try incognito/private mode
3. Disable browser extensions temporarily
4. Try different browser (Chrome, Firefox, Brave)
5. Check browser console for errors (F12)

## Still Having Issues?

1. Check the [User Guide](USER_GUIDE.md) for detailed instructions
2. Verify your MetaMask is updated to latest version
3. Ensure you have Sepolia ETH in your wallet
4. Try the app on a different device/browser
5. Check [Sepolia network status](https://sepolia.etherscan.io/)

## Developer Issues

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for development setup and deployment issues.
