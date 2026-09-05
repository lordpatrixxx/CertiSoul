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
  Zap,
  GraduationCap,
  Bot,
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

  // Preset fill helpers for quick 1-click demonstration
  const fillPresetWeb3 = () => {
    setRecipient(account || "0x70997970C51812dc3A010C7d01b50e0d17dc79C8");
    setStudentName("Alex Rivera");
    setCourseTitle("Full-Stack Web3 & Smart Contract Engineering");
    setGrade("Summa Cum Laude (Top 1%)");
    setIssuerName("HACKBLOX Academy of Technology");
    setExtraNotes("Solidity, OpenZeppelin v5, Soulbound ERC-721, IPFS Pinning, EIP-1193");
  };

  const fillPresetAI = () => {
    setRecipient(account || "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC");
    setStudentName("Elena Rostova");
    setCourseTitle("Advanced Deep Learning & Generative Models");
    setGrade("Passed with Distinction");
    setIssuerName("HACKBLOX Institute of AI");
    setExtraNotes("Transformer Architecture, PyTorch, Multi-Agent Systems, Neural Alignment");
  };

  const fillMyWalletAsRecipient = () => {
    if (account) {
      setRecipient(account);
    }
  };

  const handleEnableLocalIssuer = async () => {
    if (!account) return;
    setBootstrapping(true);
    setBootstrapNotice("");
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

  const triggerConfetti = () => {
    confetti({
      particleCount: 110,
      spread: 75,
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
        error: "Please complete all mandatory fields (Recipient Wallet, Student Name, Course Title).",
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
      // Step 1: Upload Metadata to IPFS via server-side endpoint
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

      // Clear main fields
      setRecipient("");
      setStudentName("");
      setCourseTitle("");
    } catch (err) {
      console.error("Mint error:", err);
      setMintStatus({
        loading: false,
        step: "error",
        error: err.message || "Failed to mint certificate on-chain. Please check console.",
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
        errMsg = `Certificate #${revokeTokenId} has already been marked as revoked.`;
      }
      setRevokeStatus({
        loading: false,
        success: false,
        error: errMsg,
        txHash: "",
      });
    }
  };

  // Handle Whitelist Authorize
  const handleAuthorize = async (addressToAuthorize) => {
    const addr = addressToAuthorize || targetIssuer;
    if (!addr) return;

    setWhitelistStatus({ loading: true, error: "", successMsg: "" });
    try {
      await authorizeIssuerOnChain(addr);
      setWhitelistStatus({
        loading: false,
        error: "",
        successMsg: `Successfully authorized issuer address: ${addr}`,
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

  // Handle Whitelist De-authorize
  const handleDeauthorize = async () => {
    if (!targetIssuer) return;

    setWhitelistStatus({ loading: true, error: "", successMsg: "" });
    try {
      await deauthorizeIssuerOnChain(targetIssuer);
      setWhitelistStatus({
        loading: false,
        error: "",
        successMsg: `Successfully de-authorized issuer address: ${targetIssuer}`,
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
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <Building2 className="w-7 h-7 text-purple-400" />
            Issuer Governance Portal
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Issue soulbound NFT credentials, manage IPFS metadata, and enforce on-chain revocations.
          </p>
        </div>

        {isOwner && !isIssuer && (
          <button
            onClick={() => handleAuthorize(account)}
            disabled={whitelistStatus.loading}
            className="btn-secondary h-9 text-xs self-start sm:self-auto"
            title="Authorize your current admin wallet as an issuer"
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-400" />
            Authorize My Address
          </button>
        )}
      </div>

      {/* 2. 1-Click Authorization Banner (if connected wallet is not an authorized issuer) */}
      {!isIssuer && (
        <div className="glass-panel p-5 border border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0 mt-0.5">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-white text-sm sm:text-base">
                Enable Local Issuer Authorization
              </p>
              <p className="text-xs text-slate-300 mt-0.5 max-w-xl leading-relaxed">
                Wallet: <span className="font-mono text-cyan-300 font-semibold">{account || "No wallet connected"}</span>
                <br />
                To mint certificates from this wallet, 1-click authorize it on your local Hardhat chain. Zero manual private key imports needed.
              </p>
              {bootstrapNotice && (
                <p className="text-xs font-semibold text-emerald-400 mt-2 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {bootstrapNotice}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={handleEnableLocalIssuer}
            disabled={bootstrapping || !account}
            className="btn-primary h-10 px-5 text-xs font-bold whitespace-nowrap flex-shrink-0 self-start sm:self-auto shadow-md shadow-purple-600/30"
          >
            {bootstrapping ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Authorizing...</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>⚡ Enable Local Issuer</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* 3. Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        <button
          onClick={() => setActiveSubTab("mint")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === "mint"
              ? "bg-purple-600/25 text-purple-200 border border-purple-500/40 shadow-sm"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <FilePlus className="w-4 h-4 text-purple-400" />
          Mint Credential
        </button>

        <button
          onClick={() => setActiveSubTab("revoke")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === "revoke"
              ? "bg-red-600/25 text-red-200 border border-red-500/40 shadow-sm"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-red-400" />
          Revocation Manager
        </button>

        {isOwner && (
          <button
            onClick={() => setActiveSubTab("whitelist")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === "whitelist"
                ? "bg-amber-600/25 text-amber-200 border border-amber-500/40 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Users className="w-4 h-4 text-amber-400" />
            Whitelist Management
          </button>
        )}
      </div>

      {/* TAB 1: MINT CREDENTIAL */}
      {activeSubTab === "mint" && (
        <div className="glass-panel p-6 sm:p-8 space-y-6 border border-purple-500/20 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                Issue New Soulbound Credential
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Metadata is pinned to IPFS and the non-transferable certificate is minted to the student's wallet.
              </p>
            </div>

            {/* Quick Sample Autofill Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-slate-400 font-medium">1-Click Demos:</span>
              <button
                type="button"
                onClick={fillPresetWeb3}
                className="px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-purple-300 border border-white/10 text-xs font-semibold flex items-center gap-1 transition-colors"
                title="Fill sample Web3 Engineering student details"
              >
                <GraduationCap className="w-3.5 h-3.5" />
                Web3 Eng.
              </button>

              <button
                type="button"
                onClick={fillPresetAI}
                className="px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-cyan-300 border border-white/10 text-xs font-semibold flex items-center gap-1 transition-colors"
                title="Fill sample AI student details"
              >
                <Bot className="w-3.5 h-3.5" />
                AI Tech
              </button>

              {account && (
                <button
                  type="button"
                  onClick={fillMyWalletAsRecipient}
                  className="px-2.5 py-1 rounded-md bg-purple-950/40 hover:bg-purple-900/40 text-purple-200 border border-purple-500/30 text-xs font-semibold transition-colors"
                  title="Insert your connected wallet as the recipient student"
                >
                  My Address
                </button>
              )}
            </div>
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
                    ? "Step 1/2: Cryptographically Pinning Metadata to IPFS..."
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
              <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 space-y-3 shadow-inner">
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
                    className="btn-primary text-xs h-9 px-4 inline-flex items-center gap-1.5"
                  >
                    View in Public Verifier &rarr;
                  </a>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={mintStatus.loading || !isIssuer}
              className="btn-primary w-full h-12 justify-center text-sm font-bold shadow-lg shadow-purple-600/30"
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
        <div className="glass-panel p-6 sm:p-8 space-y-6 border border-red-500/20 shadow-2xl">
          <div className="space-y-1 border-b border-white/10 pb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-400" />
              On-Chain Revocation Management
            </h2>
            <p className="text-xs text-slate-400">
              Callable strictly ONLY by the original issuing authority or the contract admin.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/70 border border-white/5 text-xs text-slate-300 space-y-1.5">
            <div className="font-semibold text-slate-200 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              Official Soulbound Invariant Notice:
            </div>
            <p className="leading-relaxed">
              Under Problem Statement 2 requirements, a revoked certificate is <strong>never burned</strong>. It remains permanently in the student recipient's wallet to preserve an immutable historical record, while its on-chain status is flagged as <strong>REVOKED</strong> with the exact timestamp and official reason string recorded.
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
              className="btn-danger w-full h-12 justify-center text-sm font-bold shadow-lg shadow-red-600/30"
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
        <div className="glass-panel p-6 sm:p-8 space-y-6 border border-amber-500/20 shadow-2xl">
          <div className="space-y-1 border-b border-white/10 pb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
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
                className="btn-primary flex-1 h-11 justify-center text-sm"
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
                className="btn-secondary flex-1 h-11 justify-center text-sm hover:border-red-500/40 hover:text-red-300"
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
