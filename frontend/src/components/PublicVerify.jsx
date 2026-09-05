import React, { useState, useEffect } from "react";
import { Search, ShieldCheck, AlertCircle, Loader2, Sparkles, UserCheck, Hash } from "lucide-react";
import { fetchCertificateById, fetchTokensByOwner } from "../services/web3";
import { fetchMetadataFromIpfs } from "../services/ipfs";
import CertificateCard from "./CertificateCard";

export default function PublicVerify({ connectedAccount, onRevokeClick, userIsIssuerOrOwner }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState([]);
  const [metadataMap, setMetadataMap] = useState({});

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
  }, []);

  const handleSearch = async (searchTerm = query) => {
    const term = searchTerm.trim();
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
          setError("Invalid search query. Enter a valid Token ID number or a 42-character Ethereum address.");
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
      if (err.message && err.message.includes("ERC721NonexistentToken")) {
        setError(`Certificate #${term} does not exist on-chain.`);
      } else {
        setError(err.message || "Failed to query on-chain certificate. Please check network connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto px-4 sm:px-6">
      {/* Hero Headline */}
      <div className="text-center space-y-3 pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          Trustless On-Chain Credential Verification
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
          Verify Any Soulbound Certificate{" "}
          <span className="gradient-text">Instantly</span>
        </h1>
        <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
          Enter a Token ID or student wallet address to audit the cryptographic proof, issuing authority, and real-time revocation status directly on the blockchain.
        </p>
      </div>

      {/* Search Console */}
      <div className="glass-panel p-4 sm:p-6 shadow-2xl space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              {query.startsWith("0x") ? (
                <UserCheck className="w-5 h-5 text-purple-400" />
              ) : (
                <Hash className="w-5 h-5 text-purple-400" />
              )}
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter Token ID (e.g. 1) or Student Wallet (0x...)"
              className="input-field pl-11 py-3 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary py-3 px-6 whitespace-nowrap justify-center"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Verifying On-Chain...
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
        <div className="flex flex-wrap items-center gap-2 pt-2 text-xs text-slate-400">
          <span>Quick verification presets:</span>
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

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 flex items-start gap-3 text-red-200 text-sm">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-300">Verification Query Notice</p>
            <p className="text-xs text-red-300/80 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Search Results Display */}
      {results.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-white">
                Verification Results ({results.length}{" "}
                {results.length === 1 ? "Certificate" : "Certificates"} Found)
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Live State Audited
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
    </div>
  );
}
