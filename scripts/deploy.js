const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = await hre.ethers.provider.getNetwork();

  console.log("==================================================");
  console.log("Deploying SoulboundCertificate Contract");
  console.log("==================================================");
  console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`Deployer Address: ${deployer.address}`);

  const SoulboundCertificate = await hre.ethers.getContractFactory("SoulboundCertificate");
  const contract = await SoulboundCertificate.deploy(deployer.address);
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log(`SoulboundCertificate deployed to: ${contractAddress}`);

  // Authorize deployer as initial issuer for immediate testing convenience
  console.log("Authorizing deployer as an authorized issuer...");
  const authTx = await contract.authorizeIssuer(deployer.address);
  await authTx.wait();
  console.log("Deployer successfully authorized as an issuer!");

  // Export contract address & ABI to frontend
  const frontendContractsDir = path.join(__dirname, "..", "frontend", "src", "contracts");
  if (!fs.existsSync(frontendContractsDir)) {
    fs.mkdirSync(frontendContractsDir, { recursive: true });
  }

  const contractArtifact = await hre.artifacts.readArtifact("SoulboundCertificate");

  const deploymentData = {
    address: contractAddress,
    chainId: Number(network.chainId),
    networkName: network.name,
    deployer: deployer.address,
    abi: contractArtifact.abi,
    deployedAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(frontendContractsDir, "SoulboundCertificate.json"),
    JSON.stringify(deploymentData, null, 2)
  );

  console.log(`Deployment artifact written to: ${path.join(frontendContractsDir, "SoulboundCertificate.json")}`);
  console.log("==================================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
