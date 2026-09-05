import React, { useState } from "react";
import {
  Award,
  Search,
  Building2,
  User,
  Wallet,
  Loader2,
  Activity,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Info,
  X,
} from "lucide-react";
import { bootstrapLocalIssuer } from "../services/web3";

export default function Navbar({
  activeTab,
  setActiveTab,
  account,
  networkName,
  chainId,
  isOwner,
  isIssuer,
  roleLabel,
  onConnect,
  isConnecting,
  connectionStatus,
  health,
  onRoleRefreshed,
}) {
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [bootstrapMsg, setBootstrapMsg] = useState("");
  const [bootstrapError, setBootstrapError] = useState("");

  const truncate = (addr) =>
    addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";

  const isLocalhost = chainId === 31337 || !chainId;

  const handleEnableLocalIssuer = async () => {
    if (!account) return;
    setBootstrapping(true);
    setBootstrapMsg("");
    setBootstrapError("");

    try {
      const result = await bootstrapLocalIssuer(account);
      setBootstrapMsg(result.message || "Successfully authorized as local issuer!");
      if (onRoleRefreshed) {
        await onRoleRefreshed();
      }
    } catch (err) {
      console.error("Bootstrap error:", err);
      setBootstrapError(err.message || "Failed to bootstrap local issuer.");
    } finally {
      setBootstrapping(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#07090e]/90 backdrop-blur-xl transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between gap-4">
          {/* Brand Logo & Tagline */}
          <div
            className="flex items-center gap-3 cursor-pointer select-none flex-shrink-0"
            onClick={() => setActiveTab("verify")}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-purple-500/25">
              <div className="w-full h-full bg-[#07090e] rounded-[10px] flex items-center justify-center">
                <Award className="w-5 h-5 text-purple-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold tracking-tight text-white font-['Outfit']">
                  Certi<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-300 to-cyan-400">Soul</span>
                </span>
                <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30">
                  Soulbound v5
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                On-Chain Verifiable Credentials
              </p>
            </div>
          </div>

          {/* Centered Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/70 border border-white/5 shadow-inner">
            <button
              onClick={() => setActiveTab("verify")}
              className={`h-9 flex items-center gap-2 px-3.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "verify"
                  ? "bg-purple-600/25 text-purple-200 border border-purple-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              <Search className="w-3.5 h-3.5 text-purple-400" />
              Public Verifier
            </button>

            <button
              onClick={() => setActiveTab("issuer")}
              className={`h-9 flex items-center gap-2 px-3.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "issuer"
                  ? "bg-purple-600/25 text-purple-200 border border-purple-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-purple-400" />
              Issuer Portal
              {isIssuer && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("vault")}
              className={`h-9 flex items-center gap-2 px-3.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "vault"
                  ? "bg-purple-600/25 text-purple-200 border border-purple-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              <User className="w-3.5 h-3.5 text-purple-400" />
              My Vault
            </button>
          </nav>

          {/* Right Action Bar: Status Pill, 1-Click Issuer Button & Wallet */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* 1-Click Enable Local Issuer (if connected but not an issuer on localhost) */}
            {account && !isIssuer && !isOwner && isLocalhost && (
              <button
                onClick={handleEnableLocalIssuer}
                disabled={bootstrapping}
                className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition-all border border-white/10"
                title="Authorize this connected MetaMask account as an issuer on the local blockchain"
              >
                {bootstrapping ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Authorizing...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-3.5 h-3.5 text-amber-300" />
                    <span>⚡ Enable Issuer</span>
                  </>
                )}
              </button>
            )}

            {/* Live Environment Pill (Clickable for Diagnostics) */}
            <button
              onClick={() => setShowDiagnostics(true)}
              className="flex items-center gap-1.5 h-9 px-2.5 rounded-lg bg-slate-900/90 hover:bg-slate-850 border border-white/10 text-xs text-slate-300 transition-colors shadow-sm"
              title="Click to view Hardhat node & IPFS diagnostics"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  health?.hardhatRpcReachable ? "bg-emerald-400" : "bg-red-400 animate-pulse"
                }`}
              ></span>
              <span className="font-mono text-[11px] hidden sm:inline">
                {chainId === 31337 ? "Localhost 31337" : (networkName || "Node 8545")}
              </span>
              <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-200" />
            </button>

            {/* Role Badge */}
            {account && (
              <div className="hidden lg:flex items-center h-9 px-2.5 rounded-lg text-xs font-semibold bg-white/5 text-slate-300 border border-white/10">
                {isOwner ? (
                  <span className="text-amber-400 font-bold">Admin</span>
                ) : isIssuer ? (
                  <span className="text-emerald-400 font-bold">Issuer</span>
                ) : (
                  <span className="text-slate-400 font-medium">Student</span>
                )}
              </div>
            )}

            {/* Wallet Connect Button or Address Pill */}
            {account ? (
              <div className="flex items-center gap-2 h-9 px-3 rounded-lg bg-purple-950/40 border border-purple-500/30 text-purple-200 text-xs font-mono font-medium shadow-sm">
                <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                <span>{truncate(account)}</span>
              </div>
            ) : (
              <button
                onClick={onConnect}
                disabled={isConnecting}
                className="btn-primary h-9 text-xs px-3.5 shadow-md shadow-purple-600/30"
                title="Connect MetaMask wallet and auto-switch to Hardhat Localhost"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span className="truncate max-w-[110px]">{connectionStatus || "Connecting..."}</span>
                  </>
                ) : (
                  <>
                    <Wallet className="w-3.5 h-3.5" />
                    <span>Connect Wallet</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation Sub-bar */}
        <div className="flex md:hidden border-t border-white/5 px-3 py-1.5 gap-1.5 bg-[#07090e]/95 backdrop-blur-md">
          <button
            onClick={() => setActiveTab("verify")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium ${
              activeTab === "verify" ? "bg-purple-600/30 text-purple-200 border border-purple-500/30" : "text-slate-400"
            }`}
          >
            <Search className="w-3 h-3" /> Verifier
          </button>
          <button
            onClick={() => setActiveTab("issuer")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium ${
              activeTab === "issuer" ? "bg-purple-600/30 text-purple-200 border border-purple-500/30" : "text-slate-400"
            }`}
          >
            <Building2 className="w-3 h-3" /> Issuer
          </button>
          <button
            onClick={() => setActiveTab("vault")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium ${
              activeTab === "vault" ? "bg-purple-600/30 text-purple-200 border border-purple-500/30" : "text-slate-400"
            }`}
          >
            <User className="w-3 h-3" /> Vault
          </button>
        </div>

        {/* Mobile quick 1-click bootstrap banner if needed */}
        {account && !isIssuer && !isOwner && isLocalhost && (
          <div className="sm:hidden border-t border-purple-500/20 bg-purple-950/40 px-4 py-2 flex items-center justify-between gap-2 text-xs text-purple-200">
            <span>You have student role. Enable issuer?</span>
            <button
              onClick={handleEnableLocalIssuer}
              disabled={bootstrapping}
              className="px-2.5 py-1 rounded bg-purple-600 text-white font-bold text-[11px]"
            >
              {bootstrapping ? "Enabling..." : "⚡ Enable"}
            </button>
          </div>
        )}

        {/* Feedback Messages */}
        {bootstrapMsg && (
          <div className="border-t border-emerald-500/20 bg-emerald-950/50 px-4 py-1.5 text-xs text-emerald-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              {bootstrapMsg}
            </span>
            <button onClick={() => setBootstrapMsg("")} className="text-emerald-400 font-bold hover:text-white">
              &times;
            </button>
          </div>
        )}

        {bootstrapError && (
          <div className="border-t border-red-500/20 bg-red-950/50 px-4 py-1.5 text-xs text-red-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-red-400" />
              {bootstrapError}
            </span>
            <button onClick={() => setBootstrapError("")} className="text-red-400 font-bold hover:text-white">
              &times;
            </button>
          </div>
        )}
      </header>

      {/* Diagnostics Modal */}
      {showDiagnostics && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setShowDiagnostics(false)}
        >
          <div
            className="glass-panel max-w-lg w-full p-6 space-y-5 border border-purple-500/30 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">
                  Local Web3 & Node Diagnostics
                </h3>
              </div>
              <button
                onClick={() => setShowDiagnostics(false)}
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Diagnostic Details Grid */}
            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
                <span className="text-slate-400">Hardhat RPC (127.0.0.1:8545)</span>
                <span className="flex items-center gap-1.5 font-semibold">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      health?.hardhatRpcReachable ? "bg-emerald-400" : "bg-red-400 animate-pulse"
                    }`}
                  ></span>
                  {health?.hardhatRpcReachable ? "Connected (Chain 31337)" : "Unreachable"}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
                <span className="text-slate-400">IPFS Storage Provider</span>
                <span className="font-semibold text-cyan-300">
                  {health?.pinataConfigured ? "Pinata Cloud (Live API)" : "Local Dedicated Fallback"}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                <span className="text-slate-400 block">Smart Contract Address</span>
                <p className="font-mono text-purple-300 break-all">
                  {health?.contractAddress || "Not configured"}
                </p>
                <p className="text-[11px] text-slate-400">
                  Total Minted Certificates: <strong className="text-white">{health?.totalCertificates ?? 0}</strong>
                </p>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                <span className="text-slate-400 block">Contract Deployer (Admin)</span>
                <p className="font-mono text-slate-300 break-all">
                  {health?.contractOwner || "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                <span className="text-slate-400 block">Connected User Wallet</span>
                <p className="font-mono text-cyan-300 break-all">
                  {account || "No wallet connected"}
                </p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400">
                    Role: <strong className="text-white">{roleLabel}</strong>
                  </span>
                  {account && !isIssuer && !isOwner && isLocalhost && (
                    <button
                      onClick={handleEnableLocalIssuer}
                      disabled={bootstrapping}
                      className="px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] shadow-sm"
                    >
                      {bootstrapping ? "Authorizing..." : "⚡ Authorize as Issuer"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-2 flex items-center justify-between border-t border-white/10 text-xs">
              <span className="text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Zero Private Key Import Required
              </span>
              <button
                onClick={() => setShowDiagnostics(false)}
                className="btn-secondary h-8 px-4 text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
