import React, { useState } from "react";
import confetti from "canvas-confetti";
import {
  Building2,
  FilePlus,
  ShieldAlert,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ExternalLink,
  KeyRound,
  ShieldCheck,
} from "lucide-react";
import {
  mintCertificateOnChain,
  revokeCertificateOnChain,
  authorizeIssuerOnChain,
  deauthorizeIssuerOnChain,
  bootstrapLocalIssuer,
} from "../services/web3";
import { uploadCertificateMetadata, formatIpfsGatewayUrl } from "../services/ipfs";

export default function IssuerDashboard({
  account,
  isOwner,
  isIssuer,
  onRefreshRole,
  prefilledRevokeTokenId,
}) {
  const [activeSubTab, setActiveSubTab] = useState(
    prefilledRevokeTokenId ? "revoke" : "mint"
  );

  // Mint Form State
  const [recipient, setRecipient] = useState("");
  const [studentName, setStudentName] = useState("");
  const [courseTitle, setCourseTitle] = useState("");
  const [issuerName, setIssuerName] = useState("HACKBLOX Academy of Technology");
  const [grade, setGrade] = useState("Passed with Honors");
  const [issueDate, setIssueDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [extraNotes, setExtraNotes] = useState("");

  const [mintStatus, setMintStatus] = useState({
    loading: false,
    step: "", // 'ipfs' | 'chain' | 'success' | 'error'
    error: "",
    cid: "",
    ipfsUri: "",
    tokenId: "",
    txHash: "",
  });

  // Revoke Form State
  const [revokeTokenId, setRevokeTokenId] = useState(prefilledRevokeTokenId || "");
  const [revokeReason, setRevokeReason] = useState("");
  const [revokeStatus, setRevokeStatus] = useState({
    loading: false,
    success: false,
    error: "",
    txHash: "",
  });

  // Whitelist Form State
  const [targetIssuer, setTargetIssuer] = useState("");
  const [whitelistStatus, setWhitelistStatus] = useState({
    loading: false,
    error: "",
    successMsg: "",
  });

  const [bootstrapping, setBootstrapping] = useState(false);
  const [bootstrapNotice, setBootstrapNotice] = useState("");

  const handleEnableLocalIssuer = async () => {
    if (!account) return;
    setBootstrapping(true);
    setBootstrapNotice("Authorizing current wallet on local blockchain...");
    try {
      const res = await bootstrapLocalIssuer(account);
      setBootstrapNotice(res.message || "Successfully authorized as local issuer!");
      if (onRefreshRole) await onRefreshRole();
    } catch (err) {
      setBootstrapNotice(err.message || "Failed to authorize local issuer.");
    } finally {
      setBootstrapping(false);
    }
  };

  // Trigger celebration confetti
  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  // Handle Minting Execution
  const handleMint = async (e) => {
    e.preventDefault();
    if (!recipient || !studentName || !courseTitle) {
      setMintStatus({
        loading: false,
        step: "error",
        error: "Please fill in all required fields (Recipient, Name, Course).",
      });
      return;
    }

    setMintStatus({
      loading: true,
      step: "ipfs",
      error: "",
      cid: "",
      ipfsUri: "",
      tokenId: "",
      txHash: "",
    });

    try {
      // Step 1: Upload Metadata to IPFS via secure server-side endpoint
      const ipfsResult = await uploadCertificateMetadata({
        studentName,
        courseTitle,
        issueDate,
        issuerName,
        grade,
        recipientAddress: recipient,
        issuerAddress: account,
        extraNotes,
      });

      setMintStatus((prev) => ({
        ...prev,
        step: "chain",
        cid: ipfsResult.cid,
        ipfsUri: ipfsResult.ipfsUri,
      }));

      // Step 2: Mint Soulbound NFT on-chain
      const chainResult = await mintCertificateOnChain(recipient, ipfsResult.ipfsUri);

      setMintStatus({
        loading: false,
        step: "success",
        error: "",
        cid: ipfsResult.cid,
        ipfsUri: ipfsResult.ipfsUri,
        tokenId: chainResult.tokenId || "1",
        txHash: chainResult.txHash,
      });

      triggerConfetti();

      // Reset form fields
      setRecipient("");
      setStudentName("");
      setCourseTitle("");
    } catch (err) {
      console.error("Mint error:", err);
      setMintStatus({
        loading: false,
        step: "error",
        error: err.message || "Failed to mint certificate. Check console for details.",
      });
    }
  };

  // Handle Revocation Execution
  const handleRevoke = async (e) => {
    e.preventDefault();
    if (!revokeTokenId || !revokeReason) {
      setRevokeStatus({
        loading: false,
        success: false,
        error: "Please enter both a Token ID and an official revocation reason.",
        txHash: "",
      });
      return;
    }

    setRevokeStatus({
      loading: true,
      success: false,
      error: "",
      txHash: "",
    });

    try {
      const result = await revokeCertificateOnChain(revokeTokenId, revokeReason);
      setRevokeStatus({
        loading: false,
        success: true,
        error: "",
        txHash: result.txHash,
      });
      setRevokeReason("");
    } catch (err) {
      console.error("Revoke error:", err);
      let errMsg = err.message || "Revocation failed.";
      if (err.message && err.message.includes("UnauthorizedRevocation")) {
        errMsg = "Unauthorized: Only the original issuer of this certificate or the contract admin can revoke it.";
      } else if (err.message && err.message.includes("CertificateAlreadyRevoked")) {
        errMsg = `Certificate #${revokeTokenId} is already marked as revoked.`;
      }
      setRevokeStatus({
        loading: false,
        success: false,
        error: errMsg,
        txHash: "",
      });
    }
  };

  // Handle Issuer Whitelist
  const handleAuthorize = async (addressToAuthorize) => {
    const addr = addressToAuthorize || targetIssuer;
    if (!addr) return;

    setWhitelistStatus({ loading: true, error: "", successMsg: "" });
    try {
      const result = await authorizeIssuerOnChain(addr);
      setWhitelistStatus({
        loading: false,
        error: "",
        successMsg: `Successfully authorized issuer: ${addr}`,
      });
      setTargetIssuer("");
      if (onRefreshRole) onRefreshRole();
    } catch (err) {
      setWhitelistStatus({
        loading: false,
        error: err.message || "Failed to authorize issuer.",
        successMsg: "",
      });
    }
  };

  const handleDeauthorize = async () => {
    if (!targetIssuer) return;

    setWhitelistStatus({ loading: true, error: "", successMsg: "" });
    try {
      const result = await deauthorizeIssuerOnChain(targetIssuer);
      setWhitelistStatus({
        loading: false,
        error: "",
        successMsg: `Successfully de-authorized issuer: ${targetIssuer}`,
      });
      setTargetIssuer("");
      if (onRefreshRole) onRefreshRole();
    } catch (err) {
      setWhitelistStatus({
        loading: false,
        error: err.message || "Failed to de-authorize issuer.",
        successMsg: "",
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
      {/* Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Building2 className="w-7 h-7 text-purple-400" />
            Issuer Governance Portal
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Authorize universities, issue soulbound credentials, and manage on-chain revocations.
          </p>
        </div>

        {/* Quick self-authorize button for local testing */}
        {isOwner && !isIssuer && (
          <button
            onClick={() => handleAuthorize(account)}
            disabled={whitelistStatus.loading}
            className="btn-secondary text-xs"
            title="Authorize current admin wallet as an issuer"
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-400" />
            Authorize My Address
          </button>
        )}
      </div>

      {/* Role Notice Banner */}
      {!isIssuer && (
        <div className="p-5 rounded-2xl bg-purple-950/30 border border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-purple-200 text-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-white text-base">Enable Local Issuer Authorization</p>
              <p className="text-xs text-purple-200/80 mt-1 max-w-xl">
                Connected MetaMask wallet: <span className="font-mono text-cyan-300 font-semibold">{account || "No wallet connected"}</span>
                <br />
                In local development on chain 31337, click below to authorize this wallet on-chain automatically. No private key import into MetaMask is needed!
              </p>
              {bootstrapNotice && (
                <p className="text-xs font-semibold text-emerald-400 mt-2">
                  {bootstrapNotice}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={handleEnableLocalIssuer}
            disabled={bootstrapping || !account}
            className="btn-primary whitespace-nowrap text-xs py-2.5 px-4 flex-shrink-0 self-start sm:self-auto"
          >
            {bootstrapping ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enabling Local Issuer...
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4 text-amber-300" />
                Enable Local Issuer
              </>
            )}
          </button>
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        <button
          onClick={() => setActiveSubTab("mint")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeSubTab === "mint"
              ? "bg-purple-600/20 text-purple-300 border border-purple-500/40 shadow-sm"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <FilePlus className="w-4 h-4" />
          Mint Credential
        </button>

        <button
          onClick={() => setActiveSubTab("revoke")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeSubTab === "revoke"
              ? "bg-red-600/20 text-red-300 border border-red-500/40 shadow-sm"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          Revocation Manager
        </button>

        {isOwner && (
          <button
            onClick={() => setActiveSubTab("whitelist")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeSubTab === "whitelist"
                ? "bg-amber-600/20 text-amber-300 border border-amber-500/40 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Users className="w-4 h-4" />
            Whitelist Management
          </button>
        )}
      </div>

      {/* TAB 1: MINT CREDENTIAL */}
      {activeSubTab === "mint" && (
        <div className="glass-panel p-6 sm:p-8 space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              Issue New Soulbound Credential
            </h2>
            <p className="text-xs text-slate-400">
              Metadata will be pinned to IPFS and the non-transferable certificate will be permanently minted to the student's wallet.
            </p>
          </div>

          <form onSubmit={handleMint} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Student Wallet Address (Recipient) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="0x..."
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="input-field text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Student Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Morgan"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="input-field text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Course Title / Credential Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Full-Stack Web3 Engineering"
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  className="input-field text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Grade / Distinction
                </label>
                <input
                  type="text"
                  placeholder="e.g. Magna Cum Laude / Grade A"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="input-field text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Issuing Organization / University
                </label>
                <input
                  type="text"
                  value={issuerName}
                  onChange={(e) => setIssuerName(e.target.value)}
                  className="input-field text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Completion / Issue Date
                </label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="input-field text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Additional Notes / Competencies (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Solidity, OpenZeppelin v5, Hardhat, IPFS, Decentralized Governance"
                value={extraNotes}
                onChange={(e) => setExtraNotes(e.target.value)}
                className="input-field text-sm resize-none"
              ></textarea>
            </div>

            {/* Mint Progress / Status Banner */}
            {mintStatus.loading && (
              <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-500/30 space-y-2">
                <div className="flex items-center gap-2.5 text-sm font-semibold text-purple-300">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                  {mintStatus.step === "ipfs"
                    ? "Step 1/2: Uploading & Pinning Metadata to IPFS..."
                    : "Step 2/2: Broadcasting Mint Transaction to Blockchain..."}
                </div>
                {mintStatus.cid && (
                  <p className="text-xs font-mono text-purple-300/80">
                    Pinned CID: {mintStatus.cid}
                  </p>
                )}
              </div>
            )}

            {/* Mint Error */}
            {mintStatus.step === "error" && (
              <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 flex items-start gap-2 text-sm text-red-200">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <span>{mintStatus.error}</span>
              </div>
            )}

            {/* Mint Success Modal/Box */}
            {mintStatus.step === "success" && (
              <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-base">
                  <CheckCircle2 className="w-5 h-5" />
                  Soulbound Certificate Successfully Minted!
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-emerald-200/90 font-mono">
                  <div>Token ID: #{mintStatus.tokenId}</div>
                  <div>
                    IPFS CID:{" "}
                    <a
                      href={formatIpfsGatewayUrl(mintStatus.ipfsUri)}
                      target="_blank"
                      rel="noreferrer"
                      className="underline text-emerald-300 inline-flex items-center gap-1"
                    >
                      {mintStatus.cid} <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="sm:col-span-2 break-all">
                    Tx Hash: {mintStatus.txHash}
                  </div>
                </div>
                <div className="pt-2">
                  <a
                    href={`/?verify=${mintStatus.tokenId}`}
                    className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-1.5"
                  >
                    View in Public Verifier
                  </a>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={mintStatus.loading || !isIssuer}
              className="btn-primary w-full py-3.5 justify-center text-sm font-bold shadow-lg shadow-purple-600/30"
            >
              {mintStatus.loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Minting in Progress...
                </>
              ) : (
                <>
                  <FilePlus className="w-4 h-4" />
                  Pin to IPFS & Mint Soulbound Certificate
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* TAB 2: REVOCATION MANAGER */}
      {activeSubTab === "revoke" && (
        <div className="glass-panel p-6 sm:p-8 space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-400" />
              On-Chain Revocation Management
            </h2>
            <p className="text-xs text-slate-400">
              Strictly callable ONLY by the original issuer of the certificate or the contract admin.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 text-xs text-slate-300 space-y-1.5">
            <div className="font-semibold text-slate-200 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              Official Soulbound Invariant Notice:
            </div>
            <p>
              Under Problem Statement 2 requirements, a revoked certificate is <strong>never burned</strong>. It remains permanently in the student recipient's wallet to preserve an immutable historical record, but its on-chain status is flagged as <strong>REVOKED</strong> with the exact timestamp and official reason string recorded.
            </p>
          </div>

          <form onSubmit={handleRevoke} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Certificate Token ID *
              </label>
              <input
                type="number"
                min="1"
                required
                placeholder="e.g. 1"
                value={revokeTokenId}
                onChange={(e) => setRevokeTokenId(e.target.value)}
                className="input-field text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Official Revocation Reason *
              </label>
              <textarea
                rows={3}
                required
                placeholder="e.g. Academic integrity violation / Administrative clerical correction"
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                className="input-field text-sm"
              ></textarea>
            </div>

            {revokeStatus.error && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{revokeStatus.error}</span>
              </div>
            )}

            {revokeStatus.success && (
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 space-y-1">
                <div className="flex items-center gap-2 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  Certificate #{revokeTokenId} has been successfully revoked on-chain!
                </div>
                <p className="font-mono text-[11px] text-emerald-400/80">
                  Tx Hash: {revokeStatus.txHash}
                </p>
                <div className="pt-2">
                  <a
                    href={`/?verify=${revokeTokenId}`}
                    className="underline font-semibold hover:text-emerald-200"
                  >
                    Audit revoked state in Public Verifier &rarr;
                  </a>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={revokeStatus.loading}
              className="btn-danger w-full py-3.5 justify-center text-sm font-bold"
            >
              {revokeStatus.loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing Revocation on Blockchain...
                </>
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4" />
                  Submit Official On-Chain Revocation
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: WHITELIST MANAGEMENT (Owner only) */}
      {activeSubTab === "whitelist" && isOwner && (
        <div className="glass-panel p-6 sm:p-8 space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-400" />
              Institutional Issuer Whitelist
            </h2>
            <p className="text-xs text-slate-400">
              Contract Administrator control: Authorize or de-authorize university and department wallet addresses.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Target Institution / Issuer Wallet Address
              </label>
              <input
                type="text"
                placeholder="0x..."
                value={targetIssuer}
                onChange={(e) => setTargetIssuer(e.target.value)}
                className="input-field text-sm font-mono"
              />
            </div>

            {whitelistStatus.error && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{whitelistStatus.error}</span>
              </div>
            )}

            {whitelistStatus.successMsg && (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{whitelistStatus.successMsg}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleAuthorize()}
                disabled={whitelistStatus.loading || !targetIssuer}
                className="btn-primary flex-1 py-3 justify-center text-sm"
              >
                {whitelistStatus.loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Authorize Issuer
              </button>

              <button
                type="button"
                onClick={handleDeauthorize}
                disabled={whitelistStatus.loading || !targetIssuer}
                className="btn-secondary flex-1 py-3 justify-center text-sm hover:border-red-500/40 hover:text-red-300"
              >
                {whitelistStatus.loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                De-authorize Issuer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
