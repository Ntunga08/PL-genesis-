# How Stellar Works in This System

This document explains exactly how the HMS system uses the Stellar blockchain — step by step, from the moment a doctor creates a record to the moment a payment is released.

---

## The Big Picture

The system uses Stellar for three things:

1. **Proof** — every medical record gets a fingerprint anchored on the blockchain. Nobody can change the record without the blockchain knowing.
2. **Payments** — when a patient pays in TZS (Tanzanian Shillings), the system automatically converts and moves value on Stellar.
3. **Automation** — smart contracts (Soroban) enforce insurance rules and release payments automatically, no human needed.

---

## Step 1 — Doctor Creates a Medical Record

A doctor finishes a consultation and saves the record.

```
Doctor fills consultation form
        ↓
POST /api/records/create
        ↓
Backend receives the data
(diagnosis, prescriptions, lab results, vital signs, etc.)
```

At this point the data is still raw — it has not been stored anywhere yet.

---

## Step 2 — Data Gets Encrypted and Sent to IPFS

Before anything is stored, the backend encrypts the entire record using **AES-256** — the same encryption standard used by banks.

```
Raw medical data
        ↓
AES-256 encryption (random 256-bit key generated per record)
        ↓
Encrypted blob uploaded to IPFS via Pinata
        ↓
Pinata returns a CID (Content Identifier)
e.g.  QmWUizDqMnmcev7hP8NNCDcdScPXVdWcb7umReGHUKDCEJ
```

A CID is like a fingerprint of the file. If even one character of the file changes, the CID changes completely. This is what makes it tamper-proof.

**What gets saved in MySQL:**

```
patient_id        → who the record belongs to
doctor_id         → who created it
cid_hash          → the IPFS fingerprint (NOT the actual data)
stellar_tx_hash   → proof it was anchored on blockchain
```

The actual medical content never touches the database. Only the CID reference does.

---

## Step 3 — CID Gets Anchored on Stellar

Now the system takes that CID and writes it permanently onto the Stellar blockchain.

```
CID: QmWUizDqMnmcev7hP8NNCDcdScPXVdWcb7umReGHUKDCEJ
        ↓
StellarService::storeCidHash(cid)
        ↓
Backend builds a Stellar transaction:
  - Operation: ManageData
  - Key:   "HMS_CID_QmWUizDqMnmcev7hP8NNC"
  - Value: SHA-256 hash of the CID (32 bytes)
        ↓
Transaction signed with hospital secret key
        ↓
Submitted to Stellar testnet via Horizon API
        ↓
Stellar network confirms the transaction
        ↓
Transaction hash returned and saved in MySQL
e.g.  de49759376d1f309287bfc7712ed792be640cc97...
```

Now the CID lives on the blockchain forever. Anyone can verify it. Nobody can delete it or change it — not even us.

**Why does this matter?**

If someone tries to alter a patient's record — change a diagnosis, modify a prescription — the CID of the altered file would be completely different. When the system checks the blockchain, it would find the original CID, not the new one. The tampering would be detected immediately.

---

## Step 4 — Patient Pays via Mobile Money

A patient pays their hospital bill using M-Pesa, Airtel, Tigo, or Halopesa through ZenoPay.

```
Patient pays 50,000 TZS via M-Pesa
        ↓
ZenoPay processes the payment
        ↓
ZenoPay sends a webhook to our backend:
  "Payment confirmed — reference PAY-TEST-001"
        ↓
Backend marks payment as Completed in MySQL
        ↓
FiatToStellarBridgeService runs automatically:
```

**The bridge converts TZS to XLM:**

```
Fetch live TZS/XLM rate from CoinGecko API
e.g.  1 XLM = 6,500 TZS
        ↓
50,000 TZS ÷ 6,500 = 7.6923 XLM
        ↓
Build Stellar payment transaction:
  - From:   hospital wallet (GCIUVYTB76RW...)
  - To:     destination wallet
  - Amount: 7.6923 XLM
  - Memo:   "HMS-PAY:PAY-TEST-001"
        ↓
Sign and submit to Stellar testnet
        ↓
stellar_tx_hash saved back to the payment record in MySQL
```

The fiat payment and the on-chain payment are now linked. Every payment has a blockchain receipt.

---

## Step 5 — Soroban Smart Contract (Insurance Patients)

For insured patients, the system goes one step further. Instead of manually approving payments, a **Soroban smart contract** handles the entire validation automatically.

Soroban is Stellar's smart contract platform — think of it as a program that runs on the blockchain and cannot be tampered with.

**The contract enforces this rule:**

```
IF:
  ✓ Insurance is active for this patient
  ✓ CID exists and is verified on Stellar
  ✓ Doctor has approved the record

THEN:
  → Release payment to hospital wallet
  → Record the release on-chain with an audit event

ELSE:
  → Reject the transaction
  → Return an error
```

**How it runs in the system:**

```
POST /api/contract/release-payment
        ↓
MedicalRecordService checks doctor_approved flag
        ↓
SorobanService::releasePayment() called
        ↓
Step 1: Call validate_insurance(patient_id, insurance_number)
        Contract checks if insurance is active → returns true/false
        ↓
Step 2: Call verify_cid(cid, stellar_tx_hash)
        Contract checks if CID is anchored on Stellar → returns true/false
        ↓
Step 3: If both pass → call release_payment(patient_id, cid, wallet, amount)
        Contract records the release on-chain
        Emits an audit event visible on the blockchain
        Returns a transaction hash
        ↓
payment_tx_hash saved in MySQL
medical_records table updated:
  insurance_validated = true
  doctor_approved     = true
  payment_released    = true
```

If insurance is expired, or the CID doesn't match, or the doctor hasn't approved — the contract rejects everything. No payment goes through.

---

## Step 6 — Patient Shares Records with Another Doctor

Every patient gets a **Stellar public key** as their universal medical ID and a short **HMS-XXXXXX** share code.

```
Patient registered → POST /api/patients/{id}/identity
        ↓
System generates a Stellar keypair:
  Public key:  GBTKG...XY7Z  (the patient's medical ID)
  Share code:  HMS-A3F9K2    (short version for verbal sharing)
        ↓
Both saved to the patients table in MySQL
```

**When a patient needs to share their history:**

```
Patient calls: POST /api/patients/{id}/access-grants
  → sends: doctor_id, expires_hours: 48, purpose: "Second opinion"
  → gets back: access_token + QR code payload
        ↓
Patient shares the token with the new doctor
(via WhatsApp, printed QR, or the app shows it)
        ↓
Doctor calls: POST /api/shared-records/access
  → sends: access_token + doctor_id
        ↓
Backend verifies the token is valid and not expired
        ↓
StellarService::verifyCid() checks each record's CID on the blockchain
        ↓
Doctor receives:
  - Patient summary (name, DOB, blood group, allergies)
  - List of CID hashes with Stellar verification status
  - Access level (view or full)
```

The patient can revoke access at any time:
- Revoke one doctor: `DELETE /api/patients/{id}/access-grants/{grantId}`
- Emergency lockdown (revoke everyone): `DELETE /api/patients/{id}/access-grants`

---

## Summary — What Stellar Does in This System

| Job | How |
|---|---|
| Tamper-proof records | CID hashes anchored via ManageData operations |
| Verify authenticity | Any doctor can check a CID against the blockchain |
| Receive fiat payments | ZenoPay webhook triggers TZS→XLM bridge |
| On-chain payment receipts | Every payment has a Stellar transaction hash |
| Insurance automation | Soroban contract validates and releases payments |
| Audit trail | All contract calls emit on-chain events |
| Patient identity | Stellar public key = universal medical ID |

---

## Deployed Contracts (Testnet)

| Contract | ID | Purpose |
|---|---|---|
| Insurance | `CCPOLYYXKPOBMU4CCDQMKMDLYZK5UMCIGL5WA6TMILXLUCMN4MXWE2HW` | Validates insurance, verifies CIDs |
| Payment | `CB764BLLWRJP5QGQXBY7PKJE5ROWFHMOMLLWPGYWSUSALBSSSHUTWOZP` | Records payment releases on-chain |

Hospital wallet: `GCIUVYTB76RWSV2FZ7URYCUPVLUPGWP5THPLO6F4NP6NUINZX4WVDFEW`

View live on Stellar Explorer:
- [Insurance Contract](https://stellar.expert/explorer/testnet/contract/CCPOLYYXKPOBMU4CCDQMKMDLYZK5UMCIGL5WA6TMILXLUCMN4MXWE2HW)
- [Payment Contract](https://stellar.expert/explorer/testnet/contract/CB764BLLWRJP5QGQXBY7PKJE5ROWFHMOMLLWPGYWSUSALBSSSHUTWOZP)
- [Hospital Wallet](https://stellar.expert/explorer/testnet/account/GCIUVYTB76RWSV2FZ7URYCUPVLUPGWP5THPLO6F4NP6NUINZX4WVDFEW)
