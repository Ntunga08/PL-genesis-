<div align="center">

# 🏥 HMS with Stella

**Decentralized Hospital Management System — IPFS + Stellar + Soroban**

[![Live](https://img.shields.io/badge/Live-hasetcompany.or.tz-blue?style=flat-square)](https://hasetcompany.or.tz)
[![Network](https://img.shields.io/badge/Stellar-Testnet-purple?style=flat-square)](https://stellar.expert/explorer/testnet)
[![Laravel](https://img.shields.io/badge/Laravel-12-red?style=flat-square)](https://laravel.com)

</div>

---

## What is HMS with Stella?

A full hospital management system built on **Laravel 12** with a decentralized backend layer powered by:

- **IPFS** — encrypted medical record storage (AES-256)
- **Stellar** — immutable CID anchoring and payment transactions
- **Soroban** — smart contract automation for insurance validation and payment release
- **ZenoPay / Mobile Money** — fiat payments (TZS) that auto-bridge to XLM on-chain

The patient journey runs from reception → nurse → doctor → lab → pharmacy → billing → discharge, with every medical record encrypted and anchored on the blockchain.

---

## Architecture

```
Frontend (React + Vite)
        ↓
Laravel 12 API (Sanctum auth)
        ↓
┌─────────────────────────────────────┐
│  Services Layer                     │
│  ├── IpfsService       (AES-256)    │
│  ├── StellarService    (Horizon)    │
│  ├── SorobanService    (RPC)        │
│  ├── MedicalRecordService           │
│  ├── FiatToStellarBridgeService     │
│  ├── AccountService                 │
│  └── PatientIdentityService         │
└─────────────────────────────────────┘
        ↓                    ↓
   MySQL / SQLite          IPFS (Infura)
                               ↓
                        Stellar Testnet
                               ↓
                    Soroban Smart Contracts
```

---

## Quick Start

### 1. Clone & install

```bash
git clone https://github.com/Mr-mpange/hms-with-stella.git
cd hms-with-stella

# Frontend
npm install

# Backend
cd backend
composer install
cp .env.example .env   # or copy .env and fill in values
php artisan key:generate
php artisan migrate
```

### 2. Configure environment

Copy `backend/.env` and fill in the sections below.

### 3. Run

```bash
# Backend
cd backend && php artisan serve

# Frontend (separate terminal)
npm run dev
```

---

## Environment Variables

### Database

```env
DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=your_database
DB_USERNAME=root
DB_PASSWORD=your_password
```

---

### IPFS — Medical Record Storage

Medical records are AES-256 encrypted before upload. Only the CID hash is stored in the database.

**Option A — Pinata (recommended, free tier)**

1. Sign up at [pinata.cloud](https://pinata.cloud)
2. Go to **API Keys** → **New Key** → enable `pinFileToIPFS`
3. Copy the **API Key** and **API Secret** (or use the JWT token)

```env
IPFS_DRIVER=pinata
IPFS_PINATA_JWT=your_jwt_token          # recommended
# OR use key + secret:
IPFS_PINATA_API_KEY=your_api_key
IPFS_PINATA_API_SECRET=your_api_secret
IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs
```

**Option B — Infura (legacy)**

1. Sign up at [app.infura.io](https://app.infura.io)
2. Create a project → select any network (e.g. Ethereum)
3. Copy the **API Key** (Project ID) and **API Key Secret**

```env
IPFS_DRIVER=infura
IPFS_INFURA_PROJECT_ID=your_api_key
IPFS_INFURA_PROJECT_SECRET=your_api_key_secret
IPFS_INFURA_ENDPOINT=https://ipfs.infura.io:5001
IPFS_GATEWAY=https://ipfs.io/ipfs
```

**Option C — Local IPFS node**

```bash
# Install IPFS Desktop or run daemon
ipfs daemon
```

```env
IPFS_DRIVER=local
IPFS_LOCAL_ENDPOINT=http://127.0.0.1:5001
IPFS_LOCAL_GATEWAY=http://127.0.0.1:8080/ipfs
```

---

### Stellar — Blockchain Keys

#### Generate a new wallet (testnet)

```bash
# Install Stellar CLI
cargo install --locked stellar-cli --features opt

# Generate identity
stellar keys generate my-hospital --network testnet

# Get public key
stellar keys address my-hospital

# Fund with testnet XLM (free)
curl "https://friendbot.stellar.org?addr=YOUR_PUBLIC_KEY"

# Get secret key
stellar keys secret my-hospital
```

```env
STELLAR_NETWORK=testnet
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
STELLAR_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
STELLAR_HOSPITAL_PUBLIC_KEY=GXXXX...   # from: stellar keys address my-hospital
STELLAR_HOSPITAL_SECRET_KEY=SXXXX...   # from: stellar keys secret my-hospital
```

> **For mainnet**, change `STELLAR_NETWORK=mainnet`, update the URLs, and use a funded mainnet wallet. Never use testnet keys on mainnet.

---

### Soroban Smart Contracts

The system uses two deployed contracts:

| Contract | Purpose |
|---|---|
| Insurance | Validates insurance status, verifies CID on-chain |
| Payment | Records payment release on-chain with audit event |

#### Deploy your own contracts

```bash
cd hms-contracts

# Add wasm32 target
rustup target add wasm32v1-none

# Build
stellar contract build

# Deploy insurance contract
stellar contract deploy \
  --wasm target\wasm32v1-none\release\hms_insurance.wasm \
  --source my-hospital \
  --network testnet

# Deploy payment contract
stellar contract deploy \
  --wasm target\wasm32v1-none\release\hms_payment.wasm \
  --source my-hospital \
  --network testnet
```

Each deploy command outputs a contract ID starting with `C...`

```env
STELLAR_INSURANCE_CONTRACT_ID=CXXXX...   # from insurance deploy
STELLAR_PAYMENT_CONTRACT_ID=CXXXX...     # from payment deploy
STELLAR_PAYMENT_ASSET=XLM
STELLAR_MEMO_PREFIX=HMS_CID:
```

#### Currently deployed (testnet)

```env
STELLAR_INSURANCE_CONTRACT_ID=CCPOLYYXKPOBMU4CCDQMKMDLYZK5UMCIGL5WA6TMILXLUCMN4MXWE2HW
STELLAR_PAYMENT_CONTRACT_ID=CB764BLLWRJP5QGQXBY7PKJE5ROWFHMOMLLWPGYWSUSALBSSSHUTWOZP
```

---

### ZenoPay — Mobile Money (Tanzania)

Accepts M-Pesa, Airtel, Tigo, Halopesa via ZenoPay gateway.

1. Sign up at [zenoapi.com](https://zenoapi.com)
2. Get your API key and Merchant ID from the dashboard

```env
ZENOPAY_API_KEY=your_api_key
ZENOPAY_MERCHANT_ID=your_merchant_id
ZENOPAY_API_URL=https://zenoapi.com
ZENOPAY_ENV=production
ZENOPAY_TEST_MODE=true          # set false in production
ZENOPAY_CALLBACK_URL=https://yourdomain.com/api/payments/zenopay/callback
ZENOPAY_RETURN_URL=https://yourdomain.com/billing/payment-success
ZENOPAY_WEBHOOK_SECRET=your_webhook_secret
```

When a ZenoPay payment is confirmed, the system automatically:
1. Converts TZS → XLM using live CoinGecko rate
2. Submits XLM payment on Stellar
3. Triggers Soroban contract if CID + insurance data is present

---

### Mail — Password Reset Emails

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your@email.com
MAIL_PASSWORD=your_app_password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=your@email.com
MAIL_FROM_NAME="HMS with Stella"
```

---

## Full .env Reference

```env
# App
APP_NAME="HMS with Stella"
APP_ENV=local
APP_KEY=                          # generated by: php artisan key:generate
APP_DEBUG=true
APP_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173

# Database
DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=hms
DB_USERNAME=root
DB_PASSWORD=

# Sanctum
SANCTUM_STATEFUL_DOMAINS=localhost:5173,localhost:8000

# IPFS
IPFS_DRIVER=infura
IPFS_INFURA_PROJECT_ID=
IPFS_INFURA_PROJECT_SECRET=
IPFS_INFURA_ENDPOINT=https://ipfs.infura.io:5001
IPFS_GATEWAY=https://ipfs.io/ipfs

# Stellar
STELLAR_NETWORK=testnet
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
STELLAR_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
STELLAR_HOSPITAL_PUBLIC_KEY=
STELLAR_HOSPITAL_SECRET_KEY=
STELLAR_INSURANCE_CONTRACT_ID=
STELLAR_PAYMENT_CONTRACT_ID=
STELLAR_PAYMENT_ASSET=XLM
STELLAR_MEMO_PREFIX=HMS_CID:

# ZenoPay
ZENOPAY_API_KEY=
ZENOPAY_MERCHANT_ID=
ZENOPAY_API_URL=https://zenoapi.com
ZENOPAY_ENV=production
ZENOPAY_TEST_MODE=true
ZENOPAY_CALLBACK_URL=
ZENOPAY_RETURN_URL=
ZENOPAY_WEBHOOK_SECRET=

# Mail
MAIL_MAILER=log
MAIL_HOST=127.0.0.1
MAIL_PORT=2525
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_FROM_ADDRESS=noreply@hms.local
MAIL_FROM_NAME="HMS with Stella"
```

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register (pass `generate_wallet: true` for auto Stellar wallet) |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Current user |

### Account
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/account/profile` | View profile |
| PUT | `/api/account/profile` | Update profile |
| POST | `/api/account/change-password` | Change password |
| POST | `/api/account/forgot-password` | Send reset email |
| POST | `/api/account/reset-password` | Reset with token |
| POST | `/api/account/wallet/generate` | Generate Stellar wallet |
| POST | `/api/account/wallet/link` | Link external wallet |
| POST | `/api/account/wallet/export` | Export secret (requires password) |

### Medical Records
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/records/create` | Create encrypted record → IPFS → Stellar |
| GET | `/api/records/{patient_id}` | Get patient record metadata |
| POST | `/api/records/upload-ipfs` | Upload file (PDF/image) |

### IPFS
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/ipfs/upload` | Encrypt and upload data |
| GET | `/api/ipfs/{cid}` | Retrieve encrypted content |

### Stellar
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/stellar/store-hash` | Anchor CID on blockchain |
| GET | `/api/stellar/verify/{cid}` | Verify CID on blockchain |
| POST | `/api/stellar/payment` | Send XLM payment |

### Soroban Smart Contracts
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/contract/insurance-check` | Validate insurance via contract |
| POST | `/api/contract/release-payment` | Insurance + CID + doctor → release payment |

### Fiat Bridge
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/bridge/payment/{id}` | Bridge confirmed TZS payment to XLM |
| GET | `/api/bridge/rate` | Live TZS/XLM exchange rate |
| GET | `/api/bridge/convert?tzs=50000` | Convert TZS amount to XLM |

### Patient Identity
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/patients/{id}/identity` | Assign Stellar ID + share code |
| GET | `/api/patients/lookup/{identifier}` | Lookup by public key or HMS-XXXXXX |
| POST | `/api/patients/{id}/access-grants` | Grant doctor access to records |
| GET | `/api/patients/{id}/access-grants` | List active grants |
| DELETE | `/api/patients/{id}/access-grants/{grantId}` | Revoke specific grant |
| DELETE | `/api/patients/{id}/access-grants` | Revoke all (emergency lockdown) |
| POST | `/api/shared-records/access` | Doctor accesses shared records via token |

---

## Patient Record Sharing

Each patient gets a **Stellar public key** as their universal medical ID and a short **HMS-XXXXXX** share code.

```
Patient shares: HMS-A3F9K2  (or their full Stellar public key)
        ↓
Doctor calls: POST /api/patients/lookup/HMS-A3F9K2
        ↓
Patient grants access: POST /api/patients/{id}/access-grants
  → returns access_token + QR payload
        ↓
Doctor uses token: POST /api/shared-records/access
  → gets patient summary + CID hashes + Stellar verification status
```

Patient controls who has access and can revoke at any time.

---

## Running Tests

```bash
cd backend
php artisan test
```

84 tests, 231 assertions — covering Auth, Account, IPFS, Stellar, Soroban, Bridge, and PatientIdentity.

---

## Going to Mainnet

1. Create a funded mainnet Stellar wallet
2. Redeploy contracts to mainnet: `--network mainnet`
3. Update `.env`:

```env
STELLAR_NETWORK=mainnet
STELLAR_HORIZON_URL=https://horizon.stellar.org
STELLAR_SOROBAN_RPC_URL=https://soroban-mainnet.stellar.org
STELLAR_HOSPITAL_PUBLIC_KEY=G...   # mainnet key
STELLAR_HOSPITAL_SECRET_KEY=S...   # mainnet key
STELLAR_INSURANCE_CONTRACT_ID=C... # mainnet contract
STELLAR_PAYMENT_CONTRACT_ID=C...   # mainnet contract
ZENOPAY_TEST_MODE=false
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Backend | Laravel 12, PHP 8.2, Sanctum |
| Blockchain | Stellar (soneso/stellar-php-sdk v1.2.4) |
| Smart Contracts | Soroban (Rust, soroban-sdk v21.7.7) |
| Storage | IPFS via Infura |
| Payments | ZenoPay (M-Pesa, Airtel, Tigo, Halopesa) |
| Database | MySQL / SQLite (tests) |

---

<div align="center">
<sub>HMS with Stella · Tanzania · 2026</sub>
</div>
