# HMS with Stella — Full System Documentation

How the system works end to end, from patient registration to blockchain-verified payment release.

---

## Table of Contents

1. System Architecture
2. Technology Stack
3. Patient Journey
4. Medical Record Lifecycle
5. Payment Flow
6. Insurance and Smart Contracts
7. Patient Identity and Record Sharing
8. Authentication and Account Management
9. Department Workflows
10. Data Storage Map
11. Security Model
12. API Reference

---

## 1. System Architecture

```
FRONTEND
React 18 + TypeScript + Vite + Tailwind CSS
http://localhost:5173
        |
        | HTTP (Sanctum token auth)
        |
BACKEND
Laravel 12 / PHP 8.2
http://localhost:8000

Services:
  IpfsService            encrypt + upload to IPFS
  StellarService         anchor CIDs, send payments
  SorobanService         smart contract calls
  MedicalRecordService   orchestrates the full flow
  FiatToStellarBridge    TZS to XLM conversion
  AccountService         users, wallets, passwords
  PatientIdentityService Stellar IDs, access grants
        |
   _____|_____________________
  |           |               |
MySQL       IPFS           Stellar
(haset)   (Pinata)         Testnet

Metadata    Encrypted      CID anchors
only        medical        XLM payments
            records        Soroban contracts
```

---

## 2. Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React 18, TypeScript, Vite | User interface for all departments |
| Styling | Tailwind CSS, shadcn/ui | UI components |
| Backend | Laravel 12, PHP 8.2 | API, business logic, orchestration |
| Auth | Laravel Sanctum | Token-based API authentication |
| Database | MySQL | Metadata, users, patients, payments |
| Encryption | AES-256-CBC | Medical data encryption before IPFS |
| IPFS | Pinata cloud | Encrypted medical record storage |
| Blockchain | Stellar testnet | CID anchoring, XLM payments |
| SDK | soneso/stellar-php-sdk v1.2.4 | Stellar transaction building and signing |
| Smart Contracts | Soroban (Rust) | Insurance validation, payment release |
| Payments | ZenoPay | Mobile money M-Pesa, Airtel, Tigo, Halopesa |
| Exchange Rate | CoinGecko API | Live TZS/XLM conversion |

---

## 3. Patient Journey

Every patient moves through the hospital in a fixed workflow.

```
RECEPTION
  Register new patient (cash or insurance)
  Book appointment
  Check in returning patient
        |
NURSE
  Record vital signs (BP, temp, weight, height, SpO2)
  Complete nursing procedures
  Order lab tests for direct lab patients
        |
DOCTOR
  Review patient history
  Full clinical consultation
  Provisional diagnosis with ICD-10 code
  Order investigations (lab tests)
  Final diagnosis with ICD-10 code
  Prescribe medications sent to pharmacy
  Order procedures sent to nurse
        |
LAB (if ordered)
  Receive test orders
  Enter results (value, unit, normal range)
  Complete - results appear in doctor view instantly
        |
PHARMACY (if prescribed)
  Receive prescription from doctor
  Verify dosage and dispense medications
        |
BILLING
  Generate invoice for all services
  Accept payment (cash or mobile money)
  Process insurance claims
  Mark visit as paid - patient discharged
        |
DISCHARGE
```

Visit status fields in the database:

```
reception_status   Pending / Completed
nurse_status       Pending / In Progress / Completed
doctor_status      Pending / In Progress / Completed
lab_status         Pending / In Progress / Completed / Not Required
pharmacy_status    Pending / Completed / Not Required
billing_status     Pending / Paid
overall_status     Active / Completed
current_stage      reception / nurse / doctor / lab / pharmacy / billing / completed
```

---

## 4. Medical Record Lifecycle

Every medical record goes through 4 stages.

### Stage 1 — Doctor saves the consultation

```
Doctor completes consultation form
        |
POST /api/records/create
{
  patient_id:  uuid,
  doctor_id:   uuid,
  record_type: general,
  payload: {
    diagnosis:     Hypertension,
    icd10_code:    I10,
    prescriptions: [...],
    vital_signs:   {...},
    notes:         ...
  }
}
```

### Stage 2 — AES-256 Encryption

```
MedicalRecordService receives the payload
        |
IpfsService::encryptAndUpload(payload)
        |
Generate random 256-bit AES key + 128-bit IV
        |
openssl_encrypt(plaintext, AES-256-CBC, key, iv)
        |
Encrypted blob ready for upload
key_ref = base64(key + ":" + iv) stored in DB
```

### Stage 3 — IPFS Upload via Pinata

```
Encrypted blob
        |
POST https://api.pinata.cloud/pinning/pinFileToIPFS
Authorization: Bearer JWT
        |
Pinata pins the file across multiple nodes
        |
Returns: IpfsHash = QmWUizDqMnmcev7hP8NNCDcdScPXVdWcb7umReGHUKDCEJ
        |
This CID is the file permanent fingerprint
If the file changes by 1 byte the CID is completely different
```

### Stage 4 — Stellar Anchoring

```
StellarService::storeCidHash(cid)
        |
Load hospital account from Stellar (GCIUVYTB76RW...)
        |
Build transaction:
  Operation: ManageData
  Key:   HMS_CID_QmWUizDqMnmcev7hP8NNC
  Value: SHA-256(cid) as 32 raw bytes
        |
Sign with hospital secret key (SA5KYG...)
        |
Submit to Stellar testnet via Horizon API
        |
Transaction confirmed, hash returned
e.g. de49759376d1f309287bfc7712ed792be640cc97...
```

### What gets saved in MySQL

```
patient_id          who the record belongs to
doctor_id           who created it
cid_hash            IPFS fingerprint (NOT the data)
stellar_tx_hash     blockchain proof
record_type         general / pdf / json / file
encryption_key_ref  encrypted key reference
status              pending / stored / verified
```

The actual medical content is never in MySQL. Only the reference.

### Verification

```
GET /api/stellar/verify/{cid}
        |
StellarService::verifyCid(cid)
        |
Load hospital account data entries from Horizon
        |
Check if SHA-256(cid) matches stored value
        |
Returns: { verified: true, stellar_tx_hash: ..., status: verified }
```

---

## 5. Payment Flow

### Cash Payment

```
Billing staff records cash payment
        |
POST /api/payments
        |
Payment saved in MySQL
Invoice updated (paid_amount, balance, status)
Visit marked as completed
```

### Mobile Money via ZenoPay

```
Patient pays via M-Pesa / Airtel / Tigo / Halopesa
        |
ZenoPay processes the payment
        |
ZenoPay sends webhook to:
POST /api/payments/zenopay/callback
        |
Backend verifies webhook signature
        |
Payment marked as Completed in MySQL
Invoice updated, visit workflow advanced
        |
FiatToStellarBridgeService runs automatically
```

### Fiat to Stellar Bridge

```
Payment confirmed (e.g. 50,000 TZS)
        |
GET https://api.coingecko.com/api/v3/simple/price
  ids=stellar, vs_currencies=tzs
  rate: 1 XLM = 6,500 TZS
        |
50,000 / 6,500 = 7.6923 XLM
        |
StellarService::sendPayment(destination, 7.6923, memo)
        |
Build PaymentOperation (XLM, native asset)
Sign with hospital secret key
Submit to Stellar testnet
        |
stellar_tx_hash saved to payments table
bridge_status = bridged
xlm_amount = 7.6923
```

Every mobile money payment now has a blockchain receipt.

---

## 6. Insurance and Smart Contracts

### The Business Rule

```
IF:
  insurance is active for this patient
  medical record CID is verified on Stellar
  doctor has approved the record

THEN:
  release payment to hospital wallet on-chain
  emit audit event on blockchain

ELSE:
  reject transaction and return specific error
```

### How It Runs

```
POST /api/contract/release-payment
{
  cid:                QmWUizDq...,
  patient_id:         uuid,
  insurance_number:   NHIF-12345,
  doctor_approved:    true,
  amount:             7.6923,
  destination_wallet: GXXXX...
}
        |
MedicalRecordService::processInsurancePayment()
        |
Guard: doctor_approved must be true (checked before Soroban)
        |
SorobanService::releasePayment()
        |
Step 1 - validate_insurance contract call
  Args: patient_id (String), insurance_number (String)
  Simulate to get footprint and resource fee
  Sign and submit to Soroban RPC
  Poll getTransaction() until SUCCESS
  Contract returns: true or false
        |
Step 2 - verify_cid contract call
  Args: cid (String), stellar_tx_hash (String)
  Same simulate, sign, submit, poll flow
  Contract returns: true or false
        |
Step 3 - release_payment contract call
  Args: patient_id, cid, destination_wallet, amount in i128 stroops
  Contract records release on-chain
  Emits event: (pay_rel, patient_id) with (cid, amount, wallet)
  Returns: true
        |
payment_tx_hash saved in MySQL
medical_records updated:
  insurance_validated = true
  doctor_approved     = true
  payment_released    = true
  status              = verified
```

### Deployed Contracts (Testnet)

| Contract | ID |
|---|---|
| Insurance | CCPOLYYXKPOBMU4CCDQMKMDLYZK5UMCIGL5WA6TMILXLUCMN4MXWE2HW |
| Payment | CB764BLLWRJP5QGQXBY7PKJE5ROWFHMOMLLWPGYWSUSALBSSSHUTWOZP |

### Contract Functions

Insurance Contract:
- `register_insurance(patient_id, insurance_number)` — admin registers insurance
- `validate_insurance(patient_id, insurance_number)` returns bool
- `store_cid(cid, stellar_tx_hash)` — store CID on-chain
- `verify_cid(cid, stellar_tx_hash)` returns bool

Payment Contract:
- `release_payment(patient_id, cid, destination_wallet, amount)` returns bool
- `is_payment_released(cid)` returns bool

---

## 7. Patient Identity and Record Sharing

### Assigning a Stellar Identity

```
POST /api/patients/{id}/identity
{ generate_wallet: true }
        |
PatientIdentityService::assignIdentity()
        |
KeyPair::random() generates Stellar keypair
  Public key:  GBTKG...XY7Z  (universal medical ID)
  Secret key:  SXXXX...      (shown once, patient must save it)
        |
Share code generated: HMS-A3F9K2 (unique, human-readable)
        |
Saved to patients table:
  stellar_public_key = GBTKG...XY7Z
  share_code         = HMS-A3F9K2
```

The patient Stellar public key is their medical ID — globally unique, works at any hospital using this system.

### Sharing Records with Another Doctor

```
Patient wants to share history with a specialist
        |
POST /api/patients/{id}/access-grants
{
  doctor_id:     uuid of specialist,
  access_level:  view,
  expires_hours: 48,
  purpose:       Second opinion cardiology
}
        |
System generates a one-time access_token
Stores SHA-256(token) in database (never the plain token)
        |
Returns to patient:
{
  access_token: xK9mP2...   patient shares this
  expires_at:   2026-04-16T20:00:00
  qr_payload:   base64...   for QR code display
  share_url:    https://app/shared-records?token=xK9mP2...
}
        |
Patient sends token to specialist via WhatsApp, QR, or verbally
        |
Specialist calls:
POST /api/shared-records/access
{ access_token: xK9mP2..., doctor_id: uuid }
        |
Backend verifies token hash matches, not expired, doctor matches
        |
StellarService::verifyCid() checks each record on blockchain
        |
Specialist receives:
{
  patient: { name, DOB, blood_group, allergies, stellar_public_key },
  records: [ { cid_hash, stellar_tx_hash, record_type, created_at } ],
  stellar_verified: true,
  access_level: view
}
```

The encryption_key_ref is never exposed to external doctors. They get the CID and can fetch encrypted content from IPFS but cannot decrypt it without the key.

### Revoking Access

```
Revoke one doctor:
DELETE /api/patients/{id}/access-grants/{grantId}

Revoke everyone (emergency lockdown):
DELETE /api/patients/{id}/access-grants
Returns: { grants_revoked: 3 }
```

---

## 8. Authentication and Account Management

### Registration

```
POST /api/auth/register
{
  name:                  Dr. John Smith,
  email:                 john@hospital.com,
  password:              password123,
  password_confirmation: password123,
  role:                  doctor,
  generate_wallet:       true (optional)
}
        |
User created in MySQL
If generate_wallet is true:
  KeyPair::random() generates Stellar keypair
  Secret key AES-256 encrypted with APP_KEY derivative
  Stored encrypted in users.stellar_encrypted_secret
  Public key stored in users.stellar_public_key
        |
Returns: { token, user, wallet: { public_key, secret_key (once only) } }
```

### Login

```
POST /api/auth/login
{ email: ..., password: ... }
        |
Verify credentials, update last_login_at
Create Sanctum token
        |
Returns: { token, user (with stellar_public_key, has_managed_wallet) }
```

### Password Reset

```
POST /api/account/forgot-password
{ email: user@example.com }
        |
Generate 64-char random token
Store SHA-256(token) in DB with 60-minute expiry
Send email with reset link
        |
User clicks link:
POST /api/account/reset-password
{ email, token, new_password, new_password_confirmation }
        |
Verify token hash matches and not expired
Update password (bcrypt)
Revoke all Sanctum tokens (force re-login on all devices)
```

### Stellar Wallet Management

```
Generate new wallet:
POST /api/account/wallet/generate
Returns secret key ONCE — user must save it
Secret stored AES-256 encrypted in DB

Link external wallet (Freighter, Lobstr, etc.):
POST /api/account/wallet/link
{ public_key: GXXXX... }
Only public key stored, no secret

Export secret for backup:
POST /api/account/wallet/export
{ password: current_password }
Requires password verification, decrypts and returns secret key
```

---

## 9. Department Workflows

### Reception — New Patient

```
POST /api/patients
{
  full_name, date_of_birth, gender, phone, email,
  address, blood_group, allergies,
  insurance_provider, insurance_number, insurance_company_id
}
        |
Patient created in MySQL
If cash: payment initiated via ZenoPay
If insurance: visit created immediately, claim auto-generated
```

### Nurse

```
GET /api/visits?stage=nurse&status=Pending
Shows all patients waiting for nurse

PUT /api/visits/{id}/nurse-complete
{
  vital_signs: {
    blood_pressure: 120/80,
    temperature: 36.6,
    weight: 70,
    height: 175,
    spo2: 98
  },
  nurse_notes: ...
}
Moves patient to doctor queue
```

### Doctor

```
GET /api/visits/{id}
Full patient history, previous visits, lab results, prescriptions

PUT /api/visits/{id}/consultation
{
  chief_complaint, history_present_illness,
  provisional_diagnosis, icd10_code,
  final_diagnosis, final_icd10_code,
  treatment_rx, investigation_plan
}

POST /api/prescriptions
{ visit_id, medications: [{ medication_id, dosage, frequency, duration }] }

POST /api/lab-tests
{ visit_id, tests: [{ test_name, instructions }] }
```

### Lab

```
GET /api/lab-tests?status=Pending
Shows all pending tests

PUT /api/lab-tests/{id}/complete
{
  result_value, result_unit, normal_range,
  result_notes, status: Completed
}
Results appear instantly in doctor consultation view
```

### Pharmacy

```
GET /api/prescriptions?status=Pending
Shows all prescriptions to dispense

POST /api/prescriptions/{id}/dispense
{ dispensed_quantity, pharmacist_notes }
Updates medication stock, marks prescription as dispensed
```

### Billing

```
GET /api/invoices?patient_id={id}
Shows all charges for the visit

POST /api/payments
{
  patient_id, invoice_id, amount,
  payment_method: ZenoPay,
  payment_type: Invoice Payment
}
If ZenoPay: initiates mobile money request
On confirmation: auto-bridges to Stellar
If insurance: triggers Soroban contract
```

---

## 10. Data Storage Map

| Data | MySQL | IPFS Pinata | Stellar Blockchain |
|---|---|---|---|
| Patient demographics | Yes | No | No |
| Appointments | Yes | No | No |
| Visit workflow status | Yes | No | No |
| Vital signs | Yes | No | No |
| Medical record metadata (CID, tx hash) | Yes | No | No |
| Medical record content (diagnosis, notes) | No | Yes encrypted | No |
| CID fingerprints (tamper proof) | No | No | Yes |
| Payment records | Yes | No | No |
| Payment receipts (XLM tx hash) | Yes | No | Yes |
| Insurance validation results | Yes | No | Yes via contract |
| Payment release records | Yes | No | Yes via contract |
| User accounts | Yes | No | No |
| Stellar public keys | Yes | No | No |
| Stellar secret keys | Yes encrypted | No | No |
| Access grants | Yes | No | No |
| Activity logs | Yes | No | No |

---

## 11. Security Model

### Medical Data

- All medical content encrypted with AES-256-CBC before leaving the server
- Each record gets a unique random key — compromise of one key does not affect others
- Encryption keys stored as key_ref in MySQL — in production move to AWS KMS or HashiCorp Vault
- Raw data never stored in MySQL, never sent to Stellar

### Authentication

- Sanctum tokens — stateless bearer tokens for API access
- Passwords hashed with bcrypt (12 rounds)
- Password reset tokens stored as SHA-256 hash — plain token only in email
- Changing password revokes all active tokens on all devices
- Inactive accounts cannot log in

### Stellar Keys

- Hospital secret key stored in .env — never in database or code
- Patient and user wallet secrets encrypted with AES-256-CBC using a key derived from APP_KEY
- stellar_encrypted_secret field hidden from all API responses
- Secret key shown only once at generation — only retrievable via export with password verification

### Access Control

- All API endpoints protected by auth:sanctum middleware except public routes
- Shared record access uses one-time tokens stored as SHA-256 hash
- Access grants have optional expiry and can be revoked instantly
- Doctor can only access shared records if patient explicitly granted them a token

### Blockchain Integrity

- CID hashes on Stellar cannot be deleted or modified
- Any tampering with a medical record produces a different CID — verification fails
- All Soroban contract calls are on-chain and publicly auditable
- Payment releases emit on-chain events — permanent audit trail

---

## 12. API Reference

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /api/auth/register | Public | Register new user |
| POST | /api/auth/login | Public | Login |
| POST | /api/auth/logout | Token | Logout |
| GET | /api/auth/me | Token | Current user |

### Account

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /api/account/profile | Token | View profile |
| PUT | /api/account/profile | Token | Update profile |
| POST | /api/account/change-password | Token | Change password |
| POST | /api/account/forgot-password | Public | Send reset email |
| POST | /api/account/reset-password | Public | Reset with token |
| POST | /api/account/wallet/generate | Token | Generate Stellar wallet |
| POST | /api/account/wallet/link | Token | Link external wallet |
| POST | /api/account/wallet/export | Token | Export secret (needs password) |
| DELETE | /api/account/wallet | Token | Remove wallet |
| DELETE | /api/account | Token | Deactivate account |

### Medical Records

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /api/records/create | Token | Encrypt, IPFS, Stellar |
| GET | /api/records/{patient_id} | Token | Get record metadata |
| POST | /api/records/upload-ipfs | Token | Upload file PDF or image |

### IPFS

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /api/ipfs/upload | Token | Encrypt and upload |
| GET | /api/ipfs/{cid} | Token | Retrieve encrypted content |

### Stellar

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /api/stellar/store-hash | Token | Anchor CID on blockchain |
| GET | /api/stellar/verify/{cid} | Token | Verify CID on blockchain |
| POST | /api/stellar/payment | Token | Send XLM payment |

### Soroban

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /api/contract/insurance-check | Token | Validate insurance via contract |
| POST | /api/contract/release-payment | Token | Full automation flow |

### Fiat Bridge

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /api/bridge/payment/{id} | Token | Bridge TZS payment to XLM |
| GET | /api/bridge/rate | Token | Live TZS/XLM rate |
| GET | /api/bridge/convert?tzs=50000 | Token | Convert TZS to XLM |

### Patient Identity

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /api/patients/{id}/identity | Token | Assign Stellar ID |
| GET | /api/patients/lookup/{identifier} | Public | Lookup by key or HMS-XXXXXX |
| POST | /api/patients/{id}/access-grants | Token | Grant doctor access |
| GET | /api/patients/{id}/access-grants | Token | List active grants |
| DELETE | /api/patients/{id}/access-grants/{grantId} | Token | Revoke one grant |
| DELETE | /api/patients/{id}/access-grants | Token | Revoke all grants |
| POST | /api/shared-records/access | Public | Doctor accesses via token |

---

HMS with Stella · Tanzania · 2026
