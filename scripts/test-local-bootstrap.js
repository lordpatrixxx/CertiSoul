const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

async function runBootstrapValidation() {
  console.log("================================================================");
  console.log("Validating Local Dev Bootstrap & Health API Integration");
  console.log("================================================================");

  const endpointBase = "http://localhost:5173";

  // 1. Health Check Validation
  console.log("\n1. Testing GET /api/local/health...");
  const healthRes = await fetch(`${endpointBase}/api/local/health`);
  if (!healthRes.ok) {
    throw new Error(`Health check failed with status ${healthRes.status}`);
  }
  const healthData = await healthRes.json();
  console.log("   Health Response:", JSON.stringify(healthData, null, 2));

  if (!healthData.hardhatRpcReachable) {
    throw new Error("FAIL: Hardhat RPC should be reachable at 127.0.0.1:8545");
  }
  if (healthData.chainId !== 31337) {
    throw new Error(`FAIL: Expected chainId 31337, got ${healthData.chainId}`);
  }
  console.log("   ✔ Health check passed: RPC reachable on Chain ID 31337");

  // 2. Connect to local provider & contract directly
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const deployment = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "..", "frontend", "src", "contracts", "SoulboundCertificate.json"),
      "utf8"
    )
  );
  const contract = new ethers.Contract(deployment.address, deployment.abi, provider);

  // 3. Test with a freshly generated arbitrary user wallet (simulating user's existing MetaMask address)
  const randomUser = ethers.Wallet.createRandom();
  console.log(`\n2. Testing with arbitrary user wallet: ${randomUser.address}`);

  const initialStatus = await contract.isAuthorizedIssuer(randomUser.address);
  console.log(`   Initial on-chain isAuthorizedIssuer: ${initialStatus}`);
  if (initialStatus !== false) {
    throw new Error("FAIL: Fresh user address should NOT be an authorized issuer initially");
  }
  console.log("   ✔ Invariant confirmed: User is initially unauthorized");

  // 4. Call POST /api/local/bootstrap-issuer
  console.log("\n3. Invoking POST /api/local/bootstrap-issuer...");
  const bootstrapRes = await fetch(`${endpointBase}/api/local/bootstrap-issuer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address: randomUser.address }),
  });

  if (!bootstrapRes.ok) {
    const errText = await bootstrapRes.text();
    throw new Error(`Bootstrap call failed (${bootstrapRes.status}): ${errText}`);
  }

  const bootstrapData = await bootstrapRes.json();
  console.log("   Bootstrap Response:", JSON.stringify(bootstrapData, null, 2));
  if (!bootstrapData.success || !bootstrapData.txHash) {
    throw new Error("FAIL: Bootstrap response should have success: true and a valid txHash");
  }

  // 5. Verify on-chain state update
  const updatedStatus = await contract.isAuthorizedIssuer(randomUser.address);
  console.log(`\n4. Checking on-chain state after bootstrap: ${updatedStatus}`);
  if (updatedStatus !== true) {
    throw new Error("FAIL: isAuthorizedIssuer should be true after bootstrap");
  }
  console.log("   ✔ On-chain verification confirmed: User address is now an Authorized Issuer!");

  // 6. Test Idempotency: Calling again with same address
  console.log("\n5. Testing idempotency (calling again with already authorized address)...");
  const repeatRes = await fetch(`${endpointBase}/api/local/bootstrap-issuer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address: randomUser.address }),
  });
  const repeatData = await repeatRes.json();
  console.log("   Repeat Call Response:", JSON.stringify(repeatData, null, 2));
  if (!repeatData.success || !repeatData.alreadyAuthorized) {
    throw new Error("FAIL: Repeat call should indicate alreadyAuthorized: true");
  }
  console.log("   ✔ Idempotency confirmed");

  // 7. Test Validation: Invalid address format
  console.log("\n6. Testing validation with invalid address format...");
  const invalidRes = await fetch(`${endpointBase}/api/local/bootstrap-issuer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address: "0xinvalidaddress" }),
  });
  console.log(`   Invalid call status: ${invalidRes.status}`);
  if (invalidRes.status !== 400) {
    throw new Error(`FAIL: Invalid address should return 400, got ${invalidRes.status}`);
  }
  console.log("   ✔ Input validation confirmed: Invalid address rejected with HTTP 400");

  console.log("\n================================================================");
  console.log("ALL LOCAL BOOTSTRAP & HEALTH VALIDATION CHECKS PASSED! 🎉");
  console.log("================================================================");
}

runBootstrapValidation()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
