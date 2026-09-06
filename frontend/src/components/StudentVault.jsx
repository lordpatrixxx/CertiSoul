import React, { useState, useEffect, useCallback } from "react";
import { User, Award, ShieldCheck, Loader2, Sparkles, PlusCircle } from "lucide-react";
import { fetchCertificateById, fetchTokensByOwner } from "../services/web3";
import { fetchMetadataFromIpfs } from "../services/ipfs";
import CertificateCard from "./CertificateCard";

export default function StudentVault({ connectedAccount, onConnect, onNavigateToIssuer }) {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [metadataMap, setMetadataMap] = useState({});

  const loadStudentCertificates = useCallback(async () => {
    if (!connectedAccount) return;
    setLoading(true);
    try {
      const tokenIds = await fetchTokensByOwner(connectedAccount);
      if (tokenIds.length === 0) {
        setTokens([]);
        setLoading(false);
        return;
      }

      const certs = await Promise.all(
        tokenIds.map((id) => fetchCertificateById(id))
      );
      setTokens(certs);

      certs.forEach(async (cert) => {
        if (cert.tokenUri) {
          const meta = await fetchMetadataFromIpfs(cert.tokenUri);
          if (meta) {
            setMetadataMap((prev) => ({ ...prev, [cert.tokenId]: meta }));
          }
        }
      });
    } catch (err) {
      console.error("Error loading student certificates:", err);
    } finally {
      setLoading(false);
    }
  }, [connectedAccount]);

  useEffect(() => {
    if (connectedAccount) {
      loadStudentCertificates();
    } else {
      setTokens([]);
      setMetadataMap({});
    }
  }, [connectedAccount, loadStudentCertificates]);

  if (!connectedAccount) {
    return (
      <div className="max-w-2xl mx-auto text-center glass-panel p-8 sm:p-12 space-y-6 border border-purple-500/20 shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-cyan-400 p-0.5 mx-auto shadow-lg shadow-purple-500/25">
          <div className="w-full h-full bg-[#07090e] rounded-[14px] flex items-center justify-center">
            <Award className="w-8 h-8 text-purple-400" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-['Outfit']">
            Connect Wallet to Access Your Soulbound Vault
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
            Your tamper-proof digital diplomas, degrees, and micro-credentials are permanently tied to your Ethereum address. Connect to view and export.
          </p>
        </div>
        <button onClick={onConnect} className="btn-primary h-12 px-7 text-sm font-bold mx-auto shadow-lg shadow-purple-600/30">
          Connect MetaMask Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Verified Credential Portfolio
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <User className="w-7 h-7 text-purple-400" />
            My Soulbound Credentials
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-mono break-all">
            Student Address: <span className="text-cyan-300">{connectedAccount}</span>
          </p>
        </div>

        <button
          onClick={loadStudentCertificates}
          disabled={loading}
          className="btn-secondary h-9 text-xs self-start sm:self-auto"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          Refresh Portfolio
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="py-16 text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto" />
          <p className="text-sm text-slate-400">Auditing your soulbound certificates on blockchain...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && tokens.length === 0 && (
        <div className="glass-panel p-8 sm:p-12 text-center space-y-5 border border-white/5 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 mx-auto flex items-center justify-center text-slate-400">
            <Award className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">No Soulbound Certificates Found</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              There are currently no soulbound credentials registered to this wallet address. Once an authorized university or institution issues a certificate, it will appear here permanently.
            </p>
          </div>
          {onNavigateToIssuer && (
            <button
              onClick={onNavigateToIssuer}
              className="btn-primary text-xs h-9 px-4 inline-flex items-center gap-1.5 mx-auto"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Go to Issuer Portal to Mint One
            </button>
          )}
        </div>
      )}

      {/* Certificates List */}
      {!loading && tokens.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between text-xs text-slate-400 border-b border-white/10 pb-2">
            <span>
              Total Credentials in Vault: <strong className="text-white">{tokens.length}</strong>
            </span>
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              Non-Transferable (Soulbound)
            </span>
          </div>

          <div className="space-y-8">
            {tokens.map((cert) => (
              <CertificateCard
                key={cert.tokenId}
                certificate={cert}
                metadata={metadataMap[cert.tokenId]}
                canRevoke={false}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
