import { ethers } from "ethers";
import contractArtifact from "../contracts/SoulboundCertificate.json";

export const CONTRACT_ADDRESS =
  import.meta.env.VITE_CONTRACT_ADDRESS || contractArtifact.address;
export const CONTRACT_ABI = contractArtifact.abi;
export const EXPECTED_CHAIN_ID = import.meta.env.VITE_CHAIN_ID
  ? Number(import.meta.env.VITE_CHAIN_ID)
  : contractArtifact.chainId;

export const HARDHAT_CHAIN_ID_HEX = "0x7A69"; // 31337 in hex
export const HARDHAT_CHAIN_ID_DEC = 31337;
export const SEPOLIA_CHAIN_ID_HEX = "0xaa36a7"; // 11155111 in hex
export const SEPOLIA_CHAIN_ID_DEC = 11155111;

export const HARDHAT_RPC_URL =
  import.meta.env.VITE_RPC_URL ||
  (EXPECTED_CHAIN_ID === SEPOLIA_CHAIN_ID_DEC
    ? "https://rpc.sepolia.org"
    : "http://127.0.0.1:8545");

export const NETWORK_PARAMS = {
  31337: {
    chainId: HARDHAT_CHAIN_ID_HEX,
    chainName: "Hardhat Localhost",
    rpcUrls: [HARDHAT_RPC_URL],
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
  },
  11155111: {
    chainId: SEPOLIA_CHAIN_ID_HEX,
    chainName: "Sepolia Testnet",
    rpcUrls: [import.meta.env.VITE_RPC_URL || "https://rpc.sepolia.org"],
    nativeCurrency: {
      name: "Sepolia ETH",
      symbol: "ETH",
      decimals: 18,
    },
    blockExplorerUrls: ["https://sepolia.etherscan.io"],
  },
};

export const HARDHAT_CHAIN_PARAMS = NETWORK_PARAMS[31337];

/**
 * Get an ethers provider.
 * For read-only calls, uses BrowserProvider if available or falls back to JsonRpcProvider (e.g. Hardhat or Sepolia RPC)
 * so that public users without MetaMask can verify credentials effortlessly.
 */
export function getReadOnlyProvider() {
  if (typeof window !== "undefined" && window.ethereum) {
    try {
      return new ethers.BrowserProvider(window.ethereum);
    } catch {
      // fallback
    }
  }
  return new ethers.JsonRpcProvider(HARDHAT_RPC_URL);
}

export function getProvider() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No Web3 wallet detected. Please install MetaMask to interact with write transactions.");
  }
  return new ethers.BrowserProvider(window.ethereum);
}

/**
 * Get a contract instance connected to signer (for write) or read-only provider (for queries)
 */
export async function getContract(needSigner = false) {
  if (needSigner) {
    const provider = getProvider();
    const signer = await provider.getSigner();
    return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
  }
  const readProvider = getReadOnlyProvider();
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, readProvider);
}

/**
 * Automatic network switch and add helper via EIP-1193.
 * Prompts MetaMask to switch to Hardhat Localhost (31337).
 * If the network does not exist in MetaMask, prompts to add it automatically.
 */
export async function ensureHardhatNetwork(onStatusUpdate) {
  if (!window.ethereum) {
    throw new Error("No Web3 wallet detected. Please install MetaMask.");
  }

  const targetChainIdDec = EXPECTED_CHAIN_ID;
  const targetChainIdHex =
    targetChainIdDec === SEPOLIA_CHAIN_ID_DEC
      ? SEPOLIA_CHAIN_ID_HEX
      : "0x" + targetChainIdDec.toString(16);
  const targetParams = NETWORK_PARAMS[targetChainIdDec] || {
    chainId: targetChainIdHex,
    chainName: `Network ${targetChainIdDec}`,
    rpcUrls: [HARDHAT_RPC_URL],
  };

  const currentChainHex = await window.ethereum.request({ method: "eth_chainId" });
  if (currentChainHex.toLowerCase() === targetChainIdHex.toLowerCase()) {
    return true;
  }

  if (onStatusUpdate) onStatusUpdate(`Switching to ${targetParams.chainName} (Chain ID: ${targetChainIdDec})...`);

  try {
    // 1. Attempt to switch to target chain
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: targetChainIdHex }],
    });
    return true;
  } catch (switchError) {
    // Error 4902: Unrecognized chain, needs to be added
    if (switchError.code === 4902 || switchError?.data?.originalError?.code === 4902) {
      if (onStatusUpdate) onStatusUpdate(`Adding ${targetParams.chainName} to MetaMask...`);
      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [targetParams],
        });
        return true;
      } catch (addError) {
        if (addError.code === 4001) {
          throw new Error(`You cancelled adding ${targetParams.chainName} in MetaMask.`);
        }
        throw new Error(`Failed to add network: ${addError.message}`);
      }
    }

    if (switchError.code === 4001) {
      throw new Error(`You cancelled switching to ${targetParams.chainName} in MetaMask.`);
    }
    throw switchError;
  }
}

/**
 * Connect wallet, verify/switch network, and load role state
 */
export async function connectWallet(onStatusUpdate) {
  if (!window.ethereum) {
    throw new Error("No Web3 wallet detected. Please install MetaMask to use this application.");
  }

  if (onStatusUpdate) onStatusUpdate("Requesting MetaMask connection...");
  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  if (!accounts || accounts.length === 0) {
    throw new Error("No accounts found in MetaMask.");
  }

  const userAccount = accounts[0];

  if (onStatusUpdate) onStatusUpdate("Verifying network...");
  await ensureHardhatNetwork(onStatusUpdate);

  if (onStatusUpdate) onStatusUpdate("Loading on-chain roles...");
  const roles = await getAccountRole(userAccount);

  if (onStatusUpdate) onStatusUpdate("Connected!");

  const targetChainIdDec = EXPECTED_CHAIN_ID;
  const networkName =
    targetChainIdDec === SEPOLIA_CHAIN_ID_DEC
      ? "Sepolia Testnet"
      : targetChainIdDec === 31337
      ? "Hardhat Localhost"
      : `Chain ${targetChainIdDec}`;

  return {
    account: userAccount,
    chainId: targetChainIdDec,
    networkName,
    ...roles,
  };
}

/**
 * Accurately check role on-chain for any address
 */
export async function getAccountRole(address) {
  if (!address) {
    return { isOwner: false, isIssuer: false, roleLabel: "Not Connected" };
  }

  try {
    const contract = await getContract(false);
    const owner = await contract.owner();
    const isOwner = owner.toLowerCase() === address.toLowerCase();

    let isIssuer = false;
    try {
      isIssuer = await contract.isAuthorizedIssuer(address);
    } catch (e) {
      console.warn("Could not check isAuthorizedIssuer:", e);
    }

    let roleLabel = "Student / Public";
    if (isOwner) {
      roleLabel = "Admin / Owner";
    } else if (isIssuer) {
      roleLabel = "Authorized Issuer";
    }

    return {
      isOwner,
      isIssuer,
      ownerAddress: owner,
      roleLabel,
    };
  } catch (err) {
    console.error("Error reading contract role:", err);
    return {
      isOwner: false,
      isIssuer: false,
      roleLabel: "Student / Public",
      error: err.message,
    };
  }
}

/**
 * Local development only: bootstrap the connected user's MetaMask address
 * as an authorized issuer without requiring importing the Hardhat private key.
 */
export async function bootstrapLocalIssuer(address) {
  const response = await fetch("/api/local/bootstrap-issuer", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ address }),
  });

  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.error || "Failed to bootstrap local issuer");
  }

  return result;
}

/**
 * Fetch local development health status (Hardhat RPC, deployment, IPFS)
 */
export async function fetchLocalHealth() {
  try {
    const response = await fetch("/api/local/health");
    if (!response.ok) return { hardhatRpcReachable: false };
    return await response.json();
  } catch {
    return { hardhatRpcReachable: false };
  }
}

/**
 * Check if the connected address is the contract owner
 */
export async function checkIsOwner(address) {
  const { isOwner } = await getAccountRole(address);
  return isOwner;
}

/**
 * Check if the connected address is an authorized issuer
 */
export async function checkIsIssuer(address) {
  const { isIssuer, isOwner } = await getAccountRole(address);
  return isIssuer || isOwner;
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
