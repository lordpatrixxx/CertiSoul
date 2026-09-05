const hre = require("hardhat");
const http = require("http");

async function pinMetadataViaServer(metadata) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(metadata);
    const req = http.request(
      {
        hostname: "localhost",
        port: 5173,
        path: "/api/ipfs/pin",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
        },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error(`Failed to parse IPFS response: ${body}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log("Seeding sample certificate on local Hardhat blockchain...");
  const [deployer] = await hre.ethers.getSigners();
  const contractAddress = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";

  const SoulboundCertificate = await hre.ethers.getContractFactory("SoulboundCertificate");
  const contract = SoulboundCertificate.attach(contractAddress);

  const total = await contract.totalCertificates();
  console.log(`Current total certificates on-chain: ${total}`);

  if (total > 0n) {
    console.log("Sample certificate already exists. Skipping seed.");
    return;
  }

  // Ensure deployer is authorized issuer
  const isAuth = await contract.isAuthorizedIssuer(deployer.address);
  if (!isAuth) {
    console.log("Authorizing deployer as issuer...");
    const authTx = await contract.connect(deployer).authorizeIssuer(deployer.address);
    await authTx.wait();
  }

  const sampleStudent = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  const sampleMetadata = {
    name: "Full-Stack Web3 & Smart Contract Engineering - Soulbound Certificate",
    description: "Official, non-transferable Soulbound Certificate issued for mastering EVM smart contracts, OpenZeppelin v5, and decentralized verifiable credentials.",
    studentName: "Alex Rivera",
    courseTitle: "Full-Stack Web3 & Smart Contract Engineering",
    issueDate: "2026-03-15",
    issuerName: "HACKBLOX Academy of Technology",
    grade: "Summa Cum Laude (Top 1%)",
    recipientAddress: sampleStudent,
    issuerAddress: deployer.address,
    attributes: [
      { trait_type: "Student Name", value: "Alex Rivera" },
      { trait_type: "Course Title", value: "Full-Stack Web3 & Smart Contract Engineering" },
      { trait_type: "Issuer Name", value: "HACKBLOX Academy of Technology" },
      { trait_type: "Grade / Distinction", value: "Summa Cum Laude (Top 1%)" },
      { trait_type: "Issue Date", value: "2026-03-15" },
      { trait_type: "Credential Type", value: "Soulbound Token (ERC-721)" },
      { trait_type: "Verification Standard", value: "HACKBLOX Problem Statement 2" }
    ]
  };

  console.log("Pinning sample metadata to IPFS endpoint...");
  const pinResult = await pinMetadataViaServer(sampleMetadata);
  console.log(`Pinned successfully! CID: ${pinResult.cid}, URI: ${pinResult.ipfsUri}`);

  console.log("Minting Token #1 on-chain...");
  const mintTx = await contract.connect(deployer).mintCertificate(sampleStudent, pinResult.ipfsUri);
  await mintTx.wait();
  console.log("Token #1 successfully minted on-chain!");
  console.log(`New total certificates: ${await contract.totalCertificates()}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
