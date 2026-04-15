#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# HMS Soroban Contract Deployment Script
# Deploys insurance + payment contracts to Stellar testnet
# and outputs the contract IDs to paste into backend/.env
# ─────────────────────────────────────────────────────────────────────────────

set -e

NETWORK="testnet"
RPC_URL="https://soroban-testnet.stellar.org"
NETWORK_PASSPHRASE="Test SDF Network ; September 2015"

echo ""
echo "═══════════════════════════════════════════════════"
echo "  HMS Soroban Contract Deployment — Testnet"
echo "═══════════════════════════════════════════════════"
echo ""

# ── Step 1: Create or load deployer identity ─────────────────────────────────
echo "▶ Setting up deployer identity..."

if ! stellar keys show hms-deployer &>/dev/null; then
    stellar keys generate hms-deployer --network testnet
    echo "  ✓ New identity created: hms-deployer"
else
    echo "  ✓ Using existing identity: hms-deployer"
fi

DEPLOYER_ADDRESS=$(stellar keys address hms-deployer)
echo "  Address: $DEPLOYER_ADDRESS"

# ── Step 2: Fund with Friendbot (testnet only) ────────────────────────────────
echo ""
echo "▶ Funding account via Friendbot..."
curl -s "https://friendbot.stellar.org?addr=$DEPLOYER_ADDRESS" > /dev/null
echo "  ✓ Account funded"

# ── Step 3: Build contracts ───────────────────────────────────────────────────
echo ""
echo "▶ Building contracts..."
stellar contract build
echo "  ✓ Contracts built"

# ── Step 4: Deploy Insurance Contract ────────────────────────────────────────
echo ""
echo "▶ Deploying Insurance Contract..."
INSURANCE_CONTRACT_ID=$(stellar contract deploy \
    --wasm target/wasm32-unknown-unknown/release/hms_insurance.wasm \
    --source hms-deployer \
    --network testnet \
    --rpc-url "$RPC_URL" \
    --network-passphrase "$NETWORK_PASSPHRASE")

echo "  ✓ Insurance Contract ID: $INSURANCE_CONTRACT_ID"

# ── Step 5: Deploy Payment Contract ──────────────────────────────────────────
echo ""
echo "▶ Deploying Payment Contract..."
PAYMENT_CONTRACT_ID=$(stellar contract deploy \
    --wasm target/wasm32-unknown-unknown/release/hms_payment.wasm \
    --source hms-deployer \
    --network testnet \
    --rpc-url "$RPC_URL" \
    --network-passphrase "$NETWORK_PASSPHRASE")

echo "  ✓ Payment Contract ID: $PAYMENT_CONTRACT_ID"

# ── Step 6: Output .env values ────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════"
echo "  ✅ Deployment Complete! Add these to backend/.env:"
echo "═══════════════════════════════════════════════════"
echo ""
echo "STELLAR_INSURANCE_CONTRACT_ID=$INSURANCE_CONTRACT_ID"
echo "STELLAR_PAYMENT_CONTRACT_ID=$PAYMENT_CONTRACT_ID"
echo ""
echo "  Deployer public key (use as STELLAR_HOSPITAL_PUBLIC_KEY if needed):"
echo "  $DEPLOYER_ADDRESS"
echo ""
echo "  To get the deployer secret key:"
echo "  stellar keys show hms-deployer --show-secret"
echo ""
