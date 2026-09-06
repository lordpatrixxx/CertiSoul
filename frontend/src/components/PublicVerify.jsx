import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Sparkles,
  UserCheck,
  Hash,
  Lock,
  Cloud,
  CheckCircle2,
  Info,
} from "lucide-react";
import { fetchCertificateById, fetchTokensByOwner, EXPECTED_CHAIN_ID } from "../services/web3";
import { fetchMetadataFromIpfs } from "../services/ipfs";
import CertificateCard from "./CertificateCard";

/**
 * Convert raw ethers.js errors (CALL_EXCEPTION, ECONNREFUSED, etc.) into
 * user-facing sentences that don't leak internal JSON or stack traces.
 */
function sanitizeError(err, term) {
  const msg = err?.message || "";
  if (msg.includes("ERC721NonexistentToken")) {
    return `Certificate #${term} has not been minted or does not exist on-chain.`;
  }
  if (
    msg.includes("CALL_EXCEPTION") ||
    msg.includes("could not decode result data") ||
    msg.includes("missing revert data")
  ) {
    return (
      "Could not read data from the smart contract. " +
      "Make sure MetaMask is connected to the correct network " +
      `(Chain ID ${EXPECTED_CHAIN_ID}) and the contract is deployed.`
    );
  }
  if (
    msg.includes("ECONNREFUSED") ||
    msg.includes("ERR_CONNECTION_REFUSED") ||
    msg.includes("could not detect network")
  ) {
    return (
      "Cannot connect to the blockchain node. " +
      "If running locally, start the Hardhat node (npx hardhat node). " +
      "For the live demo, please connect MetaMask to the correct network."
    );
  }
  if (msg.includes("user rejected") || msg.includes("User rejected")) {
    return "Connection request was rejected in MetaMask.";
  }
  // Truncate any overly long messages that contain JSON blobs
  const cleaned = msg.split(" (action=")[0].split(" (error=")[0];
  return cleaned.length > 200 ? cleaned.slice(0, 197) + "..." : cleaned || "Failed to query on-chain certificate.";
}

export default function PublicVerify({ connectedAccount, onRevokeClick, userIsIssuerOrOwner }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState([]);
  const [metadataMap, setMetadataMap] = useState({});

  const handleSearch = useCallback(async (searchTerm) => {
    const term = (searchTerm ?? query).trim();
    if (!term) {
      setError("Please enter a Token ID (e.g. 1) or a Student Wallet Address (0x...)");
      return;
    }

    setError("");
    setLoading(true);
    setResults([]);
    setMetadataMap({});

    try {
      const isAddress = term.startsWith("0x") && term.length === 42;

      if (isAddress) {
        // Search by recipient student wallet address
        const tokenIds = await fetchTokensByOwner(term);
        if (tokenIds.length === 0) {
          setError(`No soulbound certificates found for student wallet: ${term}`);
          setLoading(false);
          return;
        }

        // Fetch each certificate record
        const certRecords = await Promise.all(
          tokenIds.map((id) => fetchCertificateById(id))
        );

        setResults(certRecords);

        // Fetch IPFS metadata in background
        certRecords.forEach(async (cert) => {
          if (cert.tokenUri) {
            const meta = await fetchMetadataFromIpfs(cert.tokenUri);
            if (meta) {
              setMetadataMap((prev) => ({ ...prev, [cert.tokenId]: meta }));
            }
          }
        });
      } else {
        // Search by Token ID
        const tokenIdNum = parseInt(term, 10);
        if (isNaN(tokenIdNum) || tokenIdNum <= 0) {
          setError("Invalid query. Please enter a valid numerical Token ID (e.g. 1) or an Ethereum address (0x...).");
          setLoading(false);
          return;
        }

        const cert = await fetchCertificateById(tokenIdNum);
        setResults([cert]);

        if (cert.tokenUri) {
          const meta = await fetchMetadataFromIpfs(cert.tokenUri);
          if (meta) {
            setMetadataMap((prev) => ({ ...prev, [cert.tokenId]: meta }));
          }
        }
      }
    } catch (err) {
      console.error("Verification query error:", err);
      setError(sanitizeError(err, term));
    } finally {
      setLoading(false);
    }
  }, [query]);

  // Auto-detect URL parameter ?verify=<tokenId> or ?address=<wallet>
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenIdParam = params.get("verify") || params.get("tokenId");
    const addressParam = params.get("address");

    if (tokenIdParam) {
      setQuery(tokenIdParam);
      handleSearch(tokenIdParam);
    } else if (addressParam) {
      setQuery(addressParam);
      handleSearch(addressParam);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-10 max-w-5xl mx-auto px-4 sm:px-6">
      {/* 1. Hero Headline */}
      <div className="text-center space-y-3 pt-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          Trustless On-Chain Credential Verification
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
          Verify Any Soulbound Certificate{" "}
          <span className="gradient-text">Instantly</span>
        </h1>
        <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Audit the cryptographic proof, issuing authority, and real-time revocation status directly on the blockchain. Fully immutable and publicly verifiable.
        </p>
      </div>

      {/* Production Demo Notice – only shown in production Vercel builds */}
      {!import.meta.env.DEV && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-sm">
          <Info className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-300">Demo Network Notice</p>
            <p className="text-xs text-amber-200/80 mt-1 leading-relaxed">
              This demo uses a smart contract deployed on{" "}
              <strong>Hardhat Localhost (Chain ID {EXPECTED_CHAIN_ID})</strong>. To verify credentials,
              open MetaMask, switch to the <em>Localhost 8545</em> network, and make sure the local
              Hardhat node is running (<code className="bg-black/40 px-1 rounded">npx hardhat node</code>).
              Full Sepolia testnet support coming soon.
            </p>
          </div>
        </div>
      )}

      {/* 2. Unified Search Console */}
      <div className="glass-panel p-5 sm:p-7 shadow-2xl space-y-4 border border-purple-500/20">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex flex-col sm:flex-row gap-3 items-stretch"
        >
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              {query.startsWith("0x") ? (
                <UserCheck className="w-5 h-5 text-cyan-400" />
              ) : (
                <Hash className="w-5 h-5 text-purple-400" />
              )}
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter Token ID (e.g. 1) or Student Wallet Address (0x...)"
              className="input-field pl-11 text-sm h-12"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary h-12 px-7 text-sm font-bold whitespace-nowrap justify-center shadow-lg shadow-purple-600/30"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Auditing On-Chain...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Verify Credential
              </>
            )}
          </button>
        </form>

        {/* Quick Sample Prefills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-400">
          <span className="font-medium text-slate-400">Quick presets:</span>
          <button
            type="button"
            onClick={() => {
              setQuery("1");
              handleSearch("1");
            }}
            className="px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-purple-300 border border-white/10 transition-colors"
          >
            Token #1
          </button>

          {connectedAccount && (
            <button
              type="button"
              onClick={() => {
                setQuery(connectedAccount);
                handleSearch(connectedAccount);
              }}
              className="px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-cyan-300 border border-white/10 transition-colors"
            >
              My Connected Wallet
            </button>
          )}
        </div>
      </div>

      {/* 3. Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 flex items-start gap-3 text-red-200 text-sm animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-300">Verification Notice</p>
            <p className="text-xs text-red-300/80 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* 4. Search Results Display */}
      {results.length > 0 && (
        <div className="space-y-6 pt-2">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-white">
                Verification Results ({results.length}{" "}
                {results.length === 1 ? "Certificate" : "Certificates"} Audited)
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-mono bg-white/5 px-2.5 py-1 rounded-md">
              Chain ID: {EXPECTED_CHAIN_ID}
            </span>
          </div>

          <div className="space-y-8">
            {results.map((cert) => (
              <CertificateCard
                key={cert.tokenId}
                certificate={cert}
                metadata={metadataMap[cert.tokenId]}
                canRevoke={userIsIssuerOrOwner}
                onRevokeClick={onRevokeClick}
              />
            ))}
          </div>
        </div>
      )}

      {/* 5. 3-Pillar Web3 Architecture Cards (When no search has been performed or idle) */}
      {results.length === 0 && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4">
          <div className="glass-panel p-6 space-y-3 border border-white/5 hover:border-purple-500/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Soulbound Non-Transferable</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Enforced at the EVM smart contract layer. All transfers, approvals, and burning mechanisms are disabled to guarantee credential permanence.
            </p>
          </div>

          <div className="glass-panel p-6 space-y-3 border border-white/5 hover:border-cyan-500/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Cloud className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Decentralized IPFS Storage</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Certificate metadata, student distinctions, and course syllabi are cryptographically hashed and pinned to IPFS, ensuring zero tampering.
            </p>
          </div>

          <div className="glass-panel p-6 space-y-3 border border-white/5 hover:border-emerald-500/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Cryptographic Trust & Revocation</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Authorized institutions can revoke certificates on-chain if necessary, preserving historical ownership while publicly signaling revocation.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
