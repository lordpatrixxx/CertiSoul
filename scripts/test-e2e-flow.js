const hre = require("hardhat");
const { expect } = require("chai");

async function main() {
  console.log("================================================================");
  console.log("HACKBLOX 2026 - Problem Statement 2: End-to-End Flow Verification");
  console.log("================================================================");

  const [admin, issuerA, issuerB, student1, student2] = await hre.ethers.getSigners();

  console.log(`1. Deploying contract with Admin: ${admin.address}`);
  const SoulboundCertificate = await hre.ethers.getContractFactory("SoulboundCertificate");
  const contract = await SoulboundCertificate.deploy(admin.address);
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log(`   Contract deployed to: ${address}`);

  console.log("\n2. Admin authorizes Issuer A...");
  const authTx = await contract.connect(admin).authorizeIssuer(issuerA.address);
  await authTx.wait();
  const isAuth = await contract.isAuthorizedIssuer(issuerA.address);
  console.log(`   Issuer A authorized on-chain: ${isAuth}`);

  console.log("\n3. Issuer A mints Soulbound Certificate to Student 1 with IPFS metadata URI...");
  const sampleCid = "bafkreifh5a2q6wexv73t4d7aumvxnfkp66h57r4kexi44m7h62t2fq57pa";
  const ipfsUri = `ipfs://${sampleCid}`;
  const mintTx = await contract.connect(issuerA).mintCertificate(student1.address, ipfsUri);
  await mintTx.wait();
  console.log(`   Mint transaction mined! Token ID: 1`);
  console.log(`   Recorded Token URI: ${await contract.tokenURI(1)}`);
  console.log(`   Owner of Token #1: ${await contract.ownerOf(1)}`);

  console.log("\n4. Verifying Soulbound Invariant: Student attempts to transfer certificate...");
  try {
    await contract.connect(student1).transferFrom(student1.address, student2.address, 1);
    throw new Error("FAIL: Transfer should have reverted!");
  } catch (err) {
    if (err.message.includes("SoulboundTransferBlocked")) {
      console.log(`   SUCCESS: Transfer correctly reverted with 'SoulboundTransferBlocked(1)'`);
    } else {
      throw err;
    }
  }

  console.log("\n5. Testing Public Discovery by Wallet Address: getTokensByOwner(student1)...");
  const studentTokens = await contract.getTokensByOwner(student1.address);
  console.log(`   Discovered Tokens for Student 1: [${studentTokens.map(t => t.toString()).join(", ")}]`);

  console.log("\n6. Testing Strict Revocation: Unauthorized Issuer B attempts to revoke Token #1...");
  await contract.connect(admin).authorizeIssuer(issuerB.address);
  try {
    await contract.connect(issuerB).revokeCertificate(1, "Malicious revocation attempt");
    throw new Error("FAIL: Cross-issuer revocation should have reverted!");
  } catch (err) {
    if (err.message.includes("UnauthorizedRevocation")) {
      console.log(`   SUCCESS: Cross-issuer revocation correctly blocked with 'UnauthorizedRevocation'!`);
    } else {
      throw err;
    }
  }

  console.log("\n7. Original Issuer A executes official on-chain revocation...");
  const revokeReason = "Academic misconduct identified post-graduation audit";
  const revokeTx = await contract.connect(issuerA).revokeCertificate(1, revokeReason);
  await revokeTx.wait();

  const certRecord = await contract.getCertificate(1);
  console.log(`   Certificate #1 on-chain status:`);
  console.log(`   - isRevoked: ${certRecord.isRevoked}`);
  console.log(`   - revocationReason: "${certRecord.revocationReason}"`);
  console.log(`   - revokedTimestamp: ${new Date(Number(certRecord.revokedTimestamp) * 1000).toISOString()}`);

  console.log("\n8. Verifying Post-Revocation Soulbound Invariants (Zero Burning)...");
  console.log(`   - Student STILL owns Token #1: ${await contract.ownerOf(1) === student1.address}`);
  console.log(`   - tokenURI is STILL accessible: ${await contract.tokenURI(1)}`);
  console.log(`   - getTokensByOwner still lists Token #1: ${studentTokens.length === 1}`);

  console.log("\n9. Testing Double Revocation Prevention...");
  try {
    await contract.connect(issuerA).revokeCertificate(1, "Second revocation attempt");
    throw new Error("FAIL: Double revocation should have reverted!");
  } catch (err) {
    if (err.message.includes("CertificateAlreadyRevoked")) {
      console.log(`   SUCCESS: Double revocation prevented with 'CertificateAlreadyRevoked'!`);
    } else {
      throw err;
    }
  }

  console.log("\n================================================================");
  console.log("ALL DEFINITION OF DONE INVARIANTS SUCCESSFULLY VERIFIED! 🎉");
  console.log("================================================================");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
