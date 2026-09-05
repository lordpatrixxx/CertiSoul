import { ethers } from "ethers";
import contractArtifact from "../contracts/SoulboundCertificate.json";

export const CONTRACT_ADDRESS = contractArtifact.address;
export const CONTRACT_ABI = contractArtifact.abi;
export const EXPECTED_CHAIN_ID = contractArtifact.chainId;

/**
 * Get an ethers BrowserProvider from window.ethereum
 */
export function getProvider() {
  if (!window.ethereum) {
    throw new Error("No Web3 wallet detected. Please install MetaMask to use this application.");
  }
  return new ethers.BrowserProvider(window.ethereum);
}

/**
 * Get a contract instance connected to signer (for write) or provider (for read)
 */
export async function getContract(needSigner = false) {
  const provider = getProvider();
  if (needSigner) {
    const signer = await provider.getSigner();
    return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
  }
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
}

/**
 * Connect wallet and request accounts
 */
export async function connectWallet() {
  const provider = getProvider();
  const accounts = await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();
  const network = await provider.getNetwork();

  return {
    account: accounts[0],
    signer,
    chainId: Number(network.chainId),
    networkName: network.name,
  };
}

/**
 * Check if the connected address is the contract owner
 */
export async function checkIsOwner(address) {
  try {
    const contract = await getContract(false);
    const owner = await contract.owner();
    return owner.toLowerCase() === address.toLowerCase();
  } catch (err) {
    console.error("Error checking owner:", err);
    return false;
  }
}

/**
 * Check if the connected address is an authorized issuer
 */
export async function checkIsIssuer(address) {
  try {
    const contract = await getContract(false);
    const isIssuer = await contract.isAuthorizedIssuer(address);
    const isOwner = await checkIsOwner(address);
    return isIssuer || isOwner;
  } catch (err) {
    console.error("Error checking issuer:", err);
    return false;
  }
}

/**
 * Mint a soulbound certificate
 */
export async function mintCertificateOnChain(recipientAddress, ipfsUri) {
  const contract = await getContract(true);
  const tx = await contract.mintCertificate(recipientAddress, ipfsUri);
  const receipt = await tx.wait();

  // Find CertificateMinted event
  let tokenId = null;
  for (const log of receipt.logs) {
    try {
      const parsed = contract.interface.parseLog(log);
      if (parsed && parsed.name === "CertificateMinted") {
        tokenId = parsed.args[0].toString();
        break;
      }
    } catch {
      // not our event
    }
  }

  return {
    receipt,
    txHash: receipt.hash,
    tokenId,
  };
}

/**
 * Revoke a certificate on-chain
 */
export async function revokeCertificateOnChain(tokenId, reason) {
  const contract = await getContract(true);
  const tx = await contract.revokeCertificate(tokenId, reason);
  const receipt = await tx.wait();

  return {
    receipt,
    txHash: receipt.hash,
  };
}

/**
 * Authorize an issuer address (Owner only)
 */
export async function authorizeIssuerOnChain(issuerAddress) {
  const contract = await getContract(true);
  const tx = await contract.authorizeIssuer(issuerAddress);
  const receipt = await tx.wait();
  return { txHash: receipt.hash };
}

/**
 * Deauthorize an issuer address (Owner only)
 */
export async function deauthorizeIssuerOnChain(issuerAddress) {
  const contract = await getContract(true);
  const tx = await contract.deauthorizeIssuer(issuerAddress);
  const receipt = await tx.wait();
  return { txHash: receipt.hash };
}

/**
 * Fetch certificate by Token ID
 */
export async function fetchCertificateById(tokenId) {
  const contract = await getContract(false);
  const certRecord = await contract.getCertificate(tokenId);
  const tokenUri = await contract.tokenURI(tokenId);
  const ownerOf = await contract.ownerOf(tokenId);

  return {
    tokenId: certRecord.tokenId.toString(),
    recipient: certRecord.recipient,
    issuer: certRecord.issuer,
    issueTimestamp: Number(certRecord.issueTimestamp),
    isRevoked: certRecord.isRevoked,
    revokedTimestamp: Number(certRecord.revokedTimestamp),
    revocationReason: certRecord.revocationReason,
    tokenUri,
    currentOwner: ownerOf,
  };
}

/**
 * Fetch all token IDs owned by a recipient address
 */
export async function fetchTokensByOwner(recipientAddress) {
  const contract = await getContract(false);
  const tokenIds = await contract.getTokensByOwner(recipientAddress);
  return tokenIds.map((id) => id.toString());
}
