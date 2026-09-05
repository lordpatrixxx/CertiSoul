import React, { useState, useEffect } from "react";
import { User, Award, ShieldCheck, Loader2, Sparkles, ExternalLink, QrCode } from "lucide-react";
import { fetchCertificateById, fetchTokensByOwner } from "../services/web3";
import { fetchMetadataFromIpfs } from "../services/ipfs";
import CertificateCard from "./CertificateCard";

export default function StudentVault({ connectedAccount, onConnect }) {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [metadataMap, setMetadataMap] = useState({});

  useEffect(() => {
    if (connectedAccount) {
      loadStudentCertificates();
    } else {
      setTokens([]);
      setMetadataMap({});
    }
  }, [connectedAccount]);

  const loadStudentCertificates = async () => {
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
  };

  if (!connectedAccount) {
    return (
      <div className="max-w-2xl mx-auto text-center glass-panel p-8 sm:p-12 space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 mx-auto flex items-center justify-center">
          <Award className="w-8 h-8 text-purple-400" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white font-['Outfit']">
            Connect Wallet to Access Your Soulbound Vault
          </h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Your tamper-proof digital diplomas, degrees, and micro-credentials are permanently tied to your Ethereum address.
          </p>
        </div>
        <button onClick={onConnect} className="btn-primary py-3 px-6 text-sm mx-auto">
          Connect MetaMask Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Verified Credential Portfolio
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <User className="w-7 h-7 text-purple-400" />
            My Soulbound Credentials
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 font-mono break-all">
            Wallet: {connectedAccount}
          </p>
        </div>

        <button
          onClick={loadStudentCertificates}
          disabled={loading}
          className="btn-secondary text-xs self-start sm:self-auto"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          Refresh Portfolio
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="py-16 text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto" />
          <p className="text-sm text-slate-400">Loading your verifiable certificates from blockchain...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && tokens.length === 0 && (
        <div className="glass-panel p-8 sm:p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 mx-auto flex items-center justify-center text-slate-400">
            <Award className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-white">No Soulbound Certificates Found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            There are currently no soulbound credentials registered to this wallet address. Once an authorized university or institution issues a certificate, it will automatically appear here.
          </p>
        </div>
      )}

      {/* Certificates List */}
      {!loading && tokens.length > 0 && (
        <div className="space-y-8">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              Total Credentials: <strong className="text-white">{tokens.length}</strong>
            </span>
            <span>Non-Transferable (Soulbound)</span>
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
