# HealthLink V2 - SDK Integration Plan

> **Branch:** `v2-sdk-integration`  
> **Status:** 🚧 In Development  
> **Goal:** Modern SDK-powered version with better UX and multi-wallet support

---

## Why V2?

V1 works great but has limitations:
- Only supports MetaMask
- Manual wallet connection code
- Desktop only (no mobile wallet support)
- Basic UI
- Manual state management

V2 will be:
- ✨ Multi-wallet support (100+ wallets)
- 📱 Mobile-friendly with WalletConnect
- 🎨 Professional UI with RainbowKit
- 🚀 Modern React hooks with Wagmi
- 🔧 Easier to maintain and extend

---

## Tech Stack Changes

### V1 (Current - `main` branch)
```
Frontend: React + Vite + Tailwind CSS
Wallet: Manual ethers.js + MetaMask only
Contract: Direct ethers.js calls
IPFS: Direct Pinata API
State: Manual useState/useEffect
```

### V2 (New - `v2-sdk-integration` branch)
```
Frontend: React + Vite + Tailwind CSS (same)
Wallet: RainbowKit (100+ wallets, mobile support)
Contract: Wagmi hooks (cleaner, automatic caching)
IPFS: Web3.storage or Thirdweb Storage (better reliability)
State: Wagmi automatic state management
```

---

## Implementation Plan

### Phase 1: Setup & Dependencies ✅
- [x] Create `v2-sdk-integration` branch
- [ ] Install RainbowKit + Wagmi
- [ ] Install Thirdweb SDK (optional)
- [ ] Configure wallet connectors
- [ ] Setup Tailwind CSS v4

### Phase 2: Wallet Integration
- [ ] Replace useWallet.js with Wagmi hooks
- [ ] Add RainbowKit ConnectButton
- [ ] Configure supported wallets:
  - MetaMask
  - WalletConnect (mobile)
  - Coinbase Wallet
  - Trust Wallet
  - Ledger
  - Rainbow
- [ ] Test wallet switching
- [ ] Test network switching

### Phase 3: Contract Integration
- [ ] Replace useContract.js with Wagmi hooks
- [ ] Use `useContractRead` for reading data
- [ ] Use `useContractWrite` for transactions
- [ ] Add transaction notifications
- [ ] Improve error handling

### Phase 4: UI Improvements
- [ ] Integrate RainbowKit theme with Tailwind
- [ ] Add wallet avatar/ENS support
- [ ] Improve loading states
- [ ] Add transaction history
- [ ] Mobile-responsive design

### Phase 5: IPFS Upgrade
- [ ] Integrate Web3.storage SDK
- [ ] Add upload progress indicators
- [ ] Implement retry logic
- [ ] Add file preview before upload
- [ ] Optimize large file handling

### Phase 6: Testing & Deployment
- [ ] Test on Sepolia testnet
- [ ] Test mobile wallets via WalletConnect
- [ ] Test on different browsers
- [ ] Deploy V2 to separate Netlify site
- [ ] Create comparison demo

---

## Key Features in V2

### 1. Multi-Wallet Support
```javascript
// V1: Only MetaMask
if (!window.ethereum) return;

// V2: 100+ wallets automatically
<ConnectButton />
```

### 2. Mobile Wallet Support
- WalletConnect integration
- QR code scanning
- Deep linking to mobile wallets
- Works on any device

### 3. Better UX
- Professional wallet modal
- ENS name display
- Wallet avatars
- Balance display
- Network indicator
- Transaction notifications

### 4. Cleaner Code
```javascript
// V1: 60+ lines of wallet code
const { account, provider, signer, connectWallet } = useWallet();

// V2: 1 line
const { address } = useAccount();
```

### 5. Automatic Features
- Account change detection (no refresh needed)
- Network switching prompts
- Transaction status tracking
- Error handling
- Loading states
- Caching

---

## File Structure

```
frontend/                    # V1 (main branch)
├── src/
│   ├── hooks/
│   │   ├── useWallet.js    # Manual wallet connection
│   │   ├── useContract.js  # Manual contract calls
│   │   └── useTransaction.js
│   └── ...

frontend-v2/                 # V2 (v2-sdk-integration branch)
├── src/
│   ├── wagmi.config.js     # Wagmi configuration
│   ├── components/
│   │   ├── WalletButton.jsx  # RainbowKit wrapper
│   │   └── ...
│   └── hooks/
│       └── useHealthLink.js  # Wagmi-based contract hooks
```

---

## Deployment Strategy

### V1 (Production)
- **Branch:** `main`
- **URL:** https://fastidious-rolypoly-4b0715.netlify.app/
- **Status:** Stable, production-ready
- **Users:** Current users continue using V1

### V2 (Beta)
- **Branch:** `v2-sdk-integration`
- **URL:** https://healthlink-v2-beta.netlify.app/ (new site)
- **Status:** Beta testing
- **Users:** Early adopters, testers

### Migration Plan
1. Deploy V2 to separate URL
2. Beta test with community
3. Gather feedback
4. Fix issues
5. When stable, merge to main
6. Redirect V1 users to V2

---

## Benefits for Users

### Patients
- ✅ Use any wallet (not just MetaMask)
- ✅ Connect from mobile phone
- ✅ Better security (hardware wallet support)
- ✅ Smoother experience (no page refreshes)

### Doctors
- ✅ Professional wallet connection UI
- ✅ Use mobile wallets on the go
- ✅ Better transaction feedback
- ✅ Easier to use

### Developers
- ✅ Less code to maintain
- ✅ Better error handling
- ✅ Automatic updates from SDK
- ✅ Easier to add features

---

## Timeline

- **Week 1:** Setup + Wallet Integration
- **Week 2:** Contract Integration + UI
- **Week 3:** IPFS + Testing
- **Week 4:** Beta Deployment + Feedback

---

## How to Test V2

```bash
# Switch to V2 branch
git checkout v2-sdk-integration

# Install dependencies
cd frontend
npm install

# Start development server
npm run dev

# Open http://localhost:5173/
```

---

## Comparison: V1 vs V2

| Feature | V1 (main) | V2 (v2-sdk-integration) |
|---------|-----------|-------------------------|
| Wallets | MetaMask only | 100+ wallets |
| Mobile | Desktop only | Mobile + Desktop |
| UI | Basic button | Professional modal |
| Code | Manual (60+ lines) | SDK (10 lines) |
| State | Manual | Automatic |
| ENS | No | Yes |
| Avatars | No | Yes |
| Network Switch | Page reload | Smooth prompt |
| Account Switch | Manual refresh | Automatic |
| WalletConnect | No | Yes |
| Hardware Wallets | Limited | Full support |

---

## Resources

- **RainbowKit Docs:** https://www.rainbowkit.com/
- **Wagmi Docs:** https://wagmi.sh/
- **Thirdweb Docs:** https://portal.thirdweb.com/
- **Web3.storage:** https://web3.storage/

---

## Contributing to V2

Want to help build V2?

1. Checkout the branch: `git checkout v2-sdk-integration`
2. Make changes
3. Test thoroughly
4. Submit PR to `v2-sdk-integration` (not main!)

---

**Let's build the future of HealthLink! 🚀**
