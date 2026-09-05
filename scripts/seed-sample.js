const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer, student] = await hre.ethers.getSigners();
  const deployment = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "..", "frontend", "src", "contracts", "SoulboundCertificate.json"),
      "utf8"
    )
  );

  const contract = await hre.ethers.getContractAt("SoulboundCertificate", deployment.address, deployer);

  console.log("Seeding sample certificate on local node...");
  const sampleCid = "bafkreifh5a2q6wexv73t4d7aumvxnfkp66h57r4kexi44m7h62t2fq57pa";
  const ipfsUri = `ipfs://${sampleCid}`;

  const tx = await contract.mintCertificate(student.address, ipfsUri);
  await tx.wait();

  console.log(`Successfully minted sample Certificate #1 to Student: ${student.address}`);
  console.log(`URI: ${ipfsUri}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
