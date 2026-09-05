# 🎓 CertiSoul: On-Chain Verifiable Credentials (Soulbound Certificates)

> **HACKBLOX 2026 — Web3 Track | Problem Statement 2**  
> An open-source decentralized verifiable credential dApp built on Ethereum & IPFS to eradicate academic and professional credential fraud through non-transferable (soulbound) NFTs, instant public verification, multi-issuer governance, and non-burning revocation.

---

## 🌟 Overview & Problem Solved

Traditional paper or PDF credentials (degrees, diplomas, certifications) suffer from rampant counterfeiting, requiring cumbersome and slow manual verification emails to institutions.

**CertiSoul** solves this by issuing non-transferable ("soulbound") ERC-721 NFT certificates directly to students' Ethereum wallets:
- **Tamper-Proof & Non-Transferable**: Once minted to a student's address, the token can **never** be transferred or approved for sale.
- **Instant Public Verification**: Anyone can verify any certificate in seconds by entering a **Token ID** or **Student Wallet Address**, or scanning an embedded **QR code**.
- **Decentralized Metadata**: Full certificate attributes (student name, course, completion date, issuing authority, grades) are pinned to **IPFS** with canonical `ipfs://<CID>` references anchored on-chain.
- **Strict, Non-Burning Revocation**: If academic fraud or clerical error occurs, the original issuer or university administrator can revoke the credential on-chain with an immutable reason and timestamp. The NFT remains in the student's wallet to maintain an indisputable historical audit trail.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Authority["Institutional Governance"]
        Admin[University Admin / Chancellor] -->|authorizeIssuer| Issuer[Authorized Department / Issuer]
    end

    subgraph MintFlow["Issuance & Storage"]
        Issuer -->|1. Pin Metadata JSON| IPFS["Pinata Cloud / IPFS Gateway (ipfs://<CID>)"]
        Issuer -->|2. mintCertificate| Contract[SoulboundCertificate.sol]
        Contract -->|Mints Non-Transferable NFT| Student[Student Wallet Address]
    end

    subgraph SecurityInvariants["Soulbound & Revocation Rules"]
        Student -.->|transferFrom() Blocked!| Revert1["Revert: SoulboundTransferBlocked"]
        Student -.->|approve() Blocked!| Revert2["Revert: SoulboundApprovalBlocked"]
        OtherIssuer -.->|Cannot Revoke Others| Revert3["Revert: UnauthorizedRevocation"]
        Issuer -->|revokeCertificate()| StateChange["isRevoked = true (Token Preserved!)"]
    end

    subgraph PublicPortal["Trustless Verification"]
        Verifier[Employer / Verifier] -->|Query Token ID or Wallet| Contract
        Contract -->|getCertificate & getTokensByOwner| Verifier
        Verifier -->|Display Badge & Audit Proof| Result["🟢 VALID vs 🔴 REVOKED"]
    end
```

---

## 🛡️ Smart Contract Technical Specifications

Built with **OpenZeppelin Contracts v5.6.1** and Solidity `^0.8.24` targeting EVM `cancun`.

### 1. Soulbound Invariant Enforcement
Transfers and approvals are permanently disabled:
- **`_update(address to, uint256 tokenId, address auth)`**: Overridden from `ERC721`. If `from != address(0)`, the call strictly reverts with custom error `SoulboundTransferBlocked(tokenId)`. Minting from `address(0)` is the only permitted state transition.
- **`approve()` & `setApprovalForAll()`**: Both unconditionally revert with custom error `SoulboundApprovalBlocked()`.

### 2. Strict, Non-Burning Revocation
- **Access Control**: Only the **original issuer** who minted the specific certificate OR the **contract owner/admin** can revoke it. An authorized Issuer B cannot revoke a certificate issued by Issuer A (`UnauthorizedRevocation(tokenId, caller)`).
- **Zero-Burn Auditability**: Revocation sets `isRevoked = true`, stores the exact `revokedTimestamp`, and records the official `revocationReason` string. The token is **never burned**; `ownerOf(tokenId)` and `tokenURI(tokenId)` remain permanently intact.
- **Idempotency**: Double revocation is prevented (`CertificateAlreadyRevoked(tokenId)`).

### 3. Gas-Optimized Wallet Discovery
- **`_tokensOfOwner[recipient].push(tokenId)`**: Storage insertion during minting is $O(1)$.
- **`getTokensByOwner(address recipient)`**: Returns all certificate token IDs belonging to an address with execution cost proportional to the student's credentials count ($O(N)$), eliminating the need for heavy external indexers.

---

## 🔒 Secure Server-Side IPFS Architecture

To adhere to security best practices and prevent credential exposure:
- **Server-Side API**: Certificate metadata is uploaded to Pinata through a dedicated server-side endpoint (`/api/ipfs/pin`).
- **Secret Protection**: Privileged `PINATA_JWT` credentials remain securely stored in `.env` on the server and are **never exposed to client browser bundles**.
- **Offline Mock Fallback**: If running without cloud credentials, the system automatically uses a deterministic SHA-256 IPFS simulator with local gateway resolution so that offline hackathon testing never fails.

---

## 🚀 Quick Start & Local Setup

### Prerequisites
- Node.js `v18+` or `v20+` (tested on `v22`)
- npm `v9+`
- MetaMask browser extension

### 1. Clone & Install Dependencies
```bash
# Clone the repository
git clone https://github.com/<your-team>/certisoul.git
cd certisoul

# Install contract dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Run the Smart Contract Test Suite
Execute the 22-case unit test suite:
```bash
npx hardhat test
```

### 3. Run the End-to-End Integration Script
Simulate the complete lifecycle (Deploy $\rightarrow$ Authorize $\rightarrow$ Mint with IPFS $\rightarrow$ Transfer Lock $\rightarrow$ Discovery $\rightarrow$ Cross-Issuer Block $\rightarrow$ Revoke $\rightarrow$ Audit):
```bash
npx hardhat run scripts/test-e2e-flow.js
```

### 4. Zero-Friction Local Development Workflow (No Private Key Import Needed)

1. **Start the local Hardhat node**:
   ```bash
   npx hardhat node
   ```
2. **Deploy the contract to localhost** (in another terminal):
   ```bash
   npm run deploy:local
   ```
3. **Start the frontend**:
   ```bash
   cd frontend
   npm run dev
   ```
4. **Open the dApp in your browser**:
   Navigate to **`http://localhost:5173`** (or the port displayed in your terminal).
5. **Click "Connect Wallet"**:
   - The dApp automatically requests connection via standard EIP-1193.
   - It automatically requests switching to **Hardhat Localhost** (`31337`). If not present, it prompts MetaMask to add `0x7A69` automatically.
   - Simply click **Approve / Switch** in the MetaMask popup.
6. **Click "Enable Local Issuer"**:
   - For local development, click the **"⚡ Enable Local Issuer"** button on the top status panel or Issuer tab.
   - The local dev server authorizes your existing wallet on-chain without exposing or importing any private key!
7. **Start testing & minting credentials immediately!**

---

## 🌐 Deploying to Sepolia Testnet

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Fill in your `SEPOLIA_RPC_URL`, `PRIVATE_KEY`, and `PINATA_JWT`.
3. Run the deployment script:
   ```bash
   npx hardhat run scripts/deploy.js --network sepolia
   ```
4. The script will automatically output the contract address and sync the updated ABI directly to `frontend/src/contracts/SoulboundCertificate.json`.

---

## 🧪 Verified Test Invariant Matrix

| Category | Invariant Tested | Status |
| :--- | :--- | :--- |
| **Access Control** | Owner can authorize/deauthorize issuers; non-owners revert | ✅ PASS |
| **Access Control** | Authorized issuer can mint; unauthorized address reverts | ✅ PASS |
| **Soulbound** | `transferFrom()` reverts with `SoulboundTransferBlocked` | ✅ PASS |
| **Soulbound** | `safeTransferFrom()` reverts with `SoulboundTransferBlocked` | ✅ PASS |
| **Soulbound** | `approve()` and `setApprovalForAll()` unconditionally revert | ✅ PASS |
| **Revocation** | Issuer B cannot revoke Issuer A's token (`UnauthorizedRevocation`) | ✅ PASS |
| **Revocation** | Original Issuer A or Contract Admin can revoke | ✅ PASS |
| **Revocation** | Token is NOT burned; student retains ownership & URI remains readable | ✅ PASS |
| **Discovery** | `getTokensByOwner()` accurately tracks all credentials for an address | ✅ PASS |
| **Input Validation** | Zero address recipient and empty URI revert | ✅ PASS |

---

## 📄 License
MIT License. Built for **HACKBLOX 2026** by Team CertiSoul.
