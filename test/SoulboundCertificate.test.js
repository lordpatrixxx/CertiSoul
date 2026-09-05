const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SoulboundCertificate - HACKBLOX 2026 Core & Security Test Suite", function () {
  let SoulboundCertificate;
  let contract;
  let owner;
  let issuerA;
  let issuerB;
  let student1;
  let student2;
  let attacker;

  const sampleURI1 = "ipfs://bafkreifh5a2q6wexv73t4d7aumvxnfkp66h57r4kexi44m7h62t2fq57pa";
  const sampleURI2 = "ipfs://bafkreic7x6h3hwhl32hvh64c2vdh327gh4pkvtq7x6lmsw4b6e56m75tqm";

  beforeEach(async function () {
    [owner, issuerA, issuerB, student1, student2, attacker] = await ethers.getSigners();

    SoulboundCertificate = await ethers.getContractFactory("SoulboundCertificate");
    contract = await SoulboundCertificate.deploy(owner.address);
    await contract.waitForDeployment();
  });

  describe("1. Deployment & Constructor Validation", function () {
    it("Should deploy with correct name, symbol, and initial owner", async function () {
      expect(await contract.name()).to.equal("Soulbound Certificate");
      expect(await contract.symbol()).to.equal("SBCERT");
      expect(await contract.owner()).to.equal(owner.address);
      expect(await contract.totalCertificates()).to.equal(0);
    });

    it("Should revert if initial owner is zero address", async function () {
      await expect(
        SoulboundCertificate.deploy(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(contract, "OwnableInvalidOwner")
        .withArgs(ethers.ZeroAddress);
    });
  });

  describe("2. Issuer Whitelist Management", function () {
    it("Should allow the owner to authorize and de-authorize issuers", async function () {
      await expect(contract.connect(owner).authorizeIssuer(issuerA.address))
        .to.emit(contract, "IssuerAuthorized")
        .withArgs(issuerA.address, (await ethers.provider.getBlock("latest")).timestamp + 1);

      expect(await contract.isAuthorizedIssuer(issuerA.address)).to.be.true;

      await expect(contract.connect(owner).deauthorizeIssuer(issuerA.address))
        .to.emit(contract, "IssuerDeauthorized");

      expect(await contract.isAuthorizedIssuer(issuerA.address)).to.be.false;
    });

    it("Should revert if a non-owner attempts to authorize or de-authorize an issuer", async function () {
      await expect(
        contract.connect(attacker).authorizeIssuer(attacker.address)
      ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");

      await contract.connect(owner).authorizeIssuer(issuerA.address);

      await expect(
        contract.connect(attacker).deauthorizeIssuer(issuerA.address)
      ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");
    });

    it("Should revert when authorizing the zero address", async function () {
      await expect(
        contract.connect(owner).authorizeIssuer(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(contract, "InvalidIssuerAddress");
    });
  });

  describe("3. Certificate Minting & Access Control", function () {
    beforeEach(async function () {
      await contract.connect(owner).authorizeIssuer(issuerA.address);
      await contract.connect(owner).authorizeIssuer(issuerB.address);
    });

    it("Should allow authorized issuer A to mint a certificate to student", async function () {
      const tx = await contract.connect(issuerA).mintCertificate(student1.address, sampleURI1);
      const receipt = await tx.wait();

      expect(await contract.totalCertificates()).to.equal(1);
      expect(await contract.ownerOf(1)).to.equal(student1.address);
      expect(await contract.tokenURI(1)).to.equal(sampleURI1);

      const cert = await contract.getCertificate(1);
      expect(cert.tokenId).to.equal(1);
      expect(cert.recipient).to.equal(student1.address);
      expect(cert.issuer).to.equal(issuerA.address);
      expect(cert.isRevoked).to.be.false;
      expect(cert.revocationReason).to.equal("");

      await expect(tx)
        .to.emit(contract, "CertificateMinted")
        .withArgs(1, student1.address, issuerA.address, sampleURI1, cert.issueTimestamp);
    });

    it("Should allow the contract owner/admin to mint certificates", async function () {
      await contract.connect(owner).mintCertificate(student2.address, sampleURI2);
      expect(await contract.ownerOf(1)).to.equal(student2.address);
    });

    it("Should revert when an unauthorized address attempts to mint", async function () {
      await expect(
        contract.connect(attacker).mintCertificate(student1.address, sampleURI1)
      ).to.be.revertedWithCustomError(contract, "UnauthorizedIssuer");
    });

    it("Should revert if recipient is zero address or URI is empty", async function () {
      await expect(
        contract.connect(issuerA).mintCertificate(ethers.ZeroAddress, sampleURI1)
      ).to.be.revertedWithCustomError(contract, "ZeroAddressRecipient");

      await expect(
        contract.connect(issuerA).mintCertificate(student1.address, "")
      ).to.be.revertedWithCustomError(contract, "EmptyTokenURI");
    });
  });

  describe("4. Strict Revocation Authorization & Invariants", function () {
    let tokenIdA;

    beforeEach(async function () {
      await contract.connect(owner).authorizeIssuer(issuerA.address);
      await contract.connect(owner).authorizeIssuer(issuerB.address);

      // Issuer A mints tokenId 1 to student1
      const tx = await contract.connect(issuerA).mintCertificate(student1.address, sampleURI1);
      await tx.wait();
      tokenIdA = 1;
    });

    it("Should NOT allow authorized Issuer B to revoke Issuer A's certificate (reverts with UnauthorizedRevocation)", async function () {
      await expect(
        contract.connect(issuerB).revokeCertificate(tokenIdA, "Cross-issuer unauthorized revocation attempt")
      ).to.be.revertedWithCustomError(contract, "UnauthorizedRevocation")
        .withArgs(tokenIdA, issuerB.address);
    });

    it("Should NOT allow arbitrary third-party or student to revoke", async function () {
      await expect(
        contract.connect(attacker).revokeCertificate(tokenIdA, "Malicious attempt")
      ).to.be.revertedWithCustomError(contract, "UnauthorizedRevocation")
        .withArgs(tokenIdA, attacker.address);

      await expect(
        contract.connect(student1).revokeCertificate(tokenIdA, "Self revocation")
      ).to.be.revertedWithCustomError(contract, "UnauthorizedRevocation")
        .withArgs(tokenIdA, student1.address);
    });

    it("Should allow the original issuer (Issuer A) to revoke their certificate", async function () {
      const reason = "Academic misconduct identified post-graduation";
      const tx = await contract.connect(issuerA).revokeCertificate(tokenIdA, reason);
      const receipt = await tx.wait();

      const cert = await contract.getCertificate(tokenIdA);
      expect(cert.isRevoked).to.be.true;
      expect(cert.revocationReason).to.equal(reason);
      expect(cert.revokedTimestamp).to.be.gt(0);

      await expect(tx)
        .to.emit(contract, "CertificateRevoked")
        .withArgs(tokenIdA, issuerA.address, reason, cert.revokedTimestamp);
    });

    it("Should allow the contract owner/admin to revoke any certificate", async function () {
      const adminReason = "University-wide institutional audit revocation";
      await expect(
        contract.connect(owner).revokeCertificate(tokenIdA, adminReason)
      ).to.emit(contract, "CertificateRevoked");

      const cert = await contract.getCertificate(tokenIdA);
      expect(cert.isRevoked).to.be.true;
      expect(cert.revocationReason).to.equal(adminReason);
    });

    it("Should revert on non-existent token or double-revocation", async function () {
      await expect(
        contract.connect(issuerA).revokeCertificate(999, "Nonexistent token")
      ).to.be.revertedWithCustomError(contract, "ERC721NonexistentToken");

      // Revoke once
      await contract.connect(issuerA).revokeCertificate(tokenIdA, "First revocation");

      // Attempt second revocation
      await expect(
        contract.connect(issuerA).revokeCertificate(tokenIdA, "Second revocation attempt")
      ).to.be.revertedWithCustomError(contract, "CertificateAlreadyRevoked")
        .withArgs(tokenIdA);
    });

    it("CRITICAL INVARIANT: Revoked certificate remains owned by the student and tokenURI remains readable", async function () {
      // Prior to revocation
      expect(await contract.ownerOf(tokenIdA)).to.equal(student1.address);
      expect(await contract.tokenURI(tokenIdA)).to.equal(sampleURI1);

      // Perform revocation
      await contract.connect(issuerA).revokeCertificate(tokenIdA, "Honor code violation");

      // Post revocation verification: token is NEVER burned
      expect(await contract.ownerOf(tokenIdA)).to.equal(student1.address);
      expect(await contract.tokenURI(tokenIdA)).to.equal(sampleURI1);

      const cert = await contract.getCertificate(tokenIdA);
      expect(cert.isRevoked).to.be.true;
      expect(cert.recipient).to.equal(student1.address);
      expect(cert.issuer).to.equal(issuerA.address);
    });
  });

  describe("5. Permanent Soulbound Invariants (Transfer & Approval Locks)", function () {
    let tokenId;

    beforeEach(async function () {
      await contract.connect(owner).authorizeIssuer(issuerA.address);
      await contract.connect(issuerA).mintCertificate(student1.address, sampleURI1);
      tokenId = 1;
    });

    it("Should revert transferFrom when student attempts to transfer certificate", async function () {
      await expect(
        contract.connect(student1).transferFrom(student1.address, student2.address, tokenId)
      ).to.be.revertedWithCustomError(contract, "SoulboundTransferBlocked")
        .withArgs(tokenId);
    });

    it("Should revert safeTransferFrom when student attempts to transfer certificate", async function () {
      await expect(
        contract.connect(student1)["safeTransferFrom(address,address,uint256)"](
          student1.address,
          student2.address,
          tokenId
        )
      ).to.be.revertedWithCustomError(contract, "SoulboundTransferBlocked")
        .withArgs(tokenId);
    });

    it("Should permanently block transfers even AFTER a certificate is revoked", async function () {
      await contract.connect(issuerA).revokeCertificate(tokenId, "Revocation for testing");

      await expect(
        contract.connect(student1).transferFrom(student1.address, student2.address, tokenId)
      ).to.be.revertedWithCustomError(contract, "SoulboundTransferBlocked")
        .withArgs(tokenId);
    });

    it("Should revert approve() calls unconditionally", async function () {
      await expect(
        contract.connect(student1).approve(student2.address, tokenId)
      ).to.be.revertedWithCustomError(contract, "SoulboundApprovalBlocked");
    });

    it("Should revert setApprovalForAll() calls unconditionally", async function () {
      await expect(
        contract.connect(student1).setApprovalForAll(student2.address, true)
      ).to.be.revertedWithCustomError(contract, "SoulboundApprovalBlocked");
    });
  });

  describe("6. On-Chain Discovery (getTokensByOwner)", function () {
    beforeEach(async function () {
      await contract.connect(owner).authorizeIssuer(issuerA.address);
    });

    it("Should accurately track and return all token IDs for a student wallet", async function () {
      // Initially 0 tokens
      const initialTokens = await contract.getTokensByOwner(student1.address);
      expect(initialTokens.length).to.equal(0);

      // Mint token 1 to student1
      await contract.connect(issuerA).mintCertificate(student1.address, sampleURI1);
      // Mint token 2 to student2
      await contract.connect(issuerA).mintCertificate(student2.address, sampleURI2);
      // Mint token 3 to student1
      await contract.connect(issuerA).mintCertificate(student1.address, sampleURI2);

      const student1Tokens = await contract.getTokensByOwner(student1.address);
      expect(student1Tokens.length).to.equal(2);
      expect(student1Tokens[0]).to.equal(1n);
      expect(student1Tokens[1]).to.equal(3n);

      const student2Tokens = await contract.getTokensByOwner(student2.address);
      expect(student2Tokens.length).to.equal(1);
      expect(student2Tokens[0]).to.equal(2n);
    });

    it("Should retain token in getTokensByOwner list even after revocation", async function () {
      await contract.connect(issuerA).mintCertificate(student1.address, sampleURI1);
      await contract.connect(issuerA).revokeCertificate(1, "Revocation check");

      const tokens = await contract.getTokensByOwner(student1.address);
      expect(tokens.length).to.equal(1);
      expect(tokens[0]).to.equal(1n);
    });
  });
});
