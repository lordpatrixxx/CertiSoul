import React, { useState } from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  KeyRound,
  Loader2,
  Cloud,
} from "lucide-react";
import { bootstrapLocalIssuer } from "../services/web3";

export default function DevStatusPanel({
  health,
  account,
  isOwner,
  isIssuer,
  roleLabel,
  onRoleRefreshed,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [bootstrapMsg, setBootstrapMsg] = useState("");
  const [bootstrapError, setBootstrapError] = useState("");

  const handleEnableLocalIssuer = async () => {
    if (!account) return;
    setBootstrapping(true);
    setBootstrapMsg("Enabling local issuer authorization on-chain...");
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

  const isLocalhost = import.meta.env.DEV && (health?.chainId === 31337 || !health?.chainId);

  return (
    <div className="border-b border-purple-500/20 bg-purple-950/20 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Quick Summary Bar */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5 font-semibold text-purple-300">
              <Activity className="w-3.5 h-3.5 text-purple-400" />
              <span>Local Dev Environment</span>
            </div>

            {/* Hardhat RPC Pill */}
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  health?.hardhatRpcReachable ? "bg-emerald-400" : "bg-red-400 animate-pulse"
                }`}
              ></span>
              <span className="text-slate-300">
                RPC:{" "}
                <span className="font-mono text-slate-200">
                  {health?.hardhatRpcReachable ? "127.0.0.1:8545 (31337)" : "Disconnected"}
                </span>
              </span>
            </div>

            {/* IPFS Pill */}
            <div className="hidden sm:flex items-center gap-1.5 text-slate-300">
              <Cloud className="w-3.5 h-3.5 text-cyan-400" />
              <span>
                IPFS:{" "}
                <span className="text-cyan-300 font-medium">
                  {health?.pinataConfigured ? "Pinata Cloud" : "Local Mock (Offline)"}
                </span>
              </span>
            </div>

            {/* Current Role Pill */}
            {account && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Your Role:</span>
                <span
                  className={`font-semibold px-2 py-0.5 rounded ${
                    isOwner
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : isIssuer
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-slate-800 text-slate-300 border border-white/10"
                  }`}
                >
                  {roleLabel || "Student / Public"}
                </span>
              </div>
            )}
          </div>

          {/* Actions: Enable Issuer / Toggle Diagnostics */}
          <div className="flex items-center gap-2">
            {/* Enable Local Issuer Button if connected but not an issuer */}
            {account && !isIssuer && !isOwner && isLocalhost && (
              <button
                onClick={handleEnableLocalIssuer}
                disabled={bootstrapping}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-sm transition-all"
                title="Automatically authorize your connected MetaMask account as an issuer on the local blockchain"
              >
                {bootstrapping ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Enabling...
                  </>
                ) : (
                  <>
                    <KeyRound className="w-3 h-3 text-amber-300" />
                    Enable Local Issuer
                  </>
                )}
              </button>
            )}

            {/* Toggle Details Chevron */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
            >
              <span>{isOpen ? "Hide Diagnostics" : "Diagnostics"}</span>
              {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Feedback Messages */}
        {bootstrapMsg && (
          <div className="mt-2 p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
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
          <div className="mt-2 p-2 rounded-lg bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-red-400" />
              {bootstrapError}
            </span>
            <button onClick={() => setBootstrapError("")} className="text-red-400 font-bold hover:text-white">
              &times;
            </button>
          </div>
        )}

        {/* Expandable Diagnostic Panel */}
        {isOpen && (
          <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs text-slate-300">
            <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 space-y-1">
              <span className="text-slate-400 block font-medium">Smart Contract</span>
              <p className="font-mono text-purple-300 break-all">
                {health?.contractAddress || "Not deployed"}
              </p>
              <span className="text-[11px] text-slate-400 block">
                Total Minted: {health?.totalCertificates ?? 0}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 space-y-1">
              <span className="text-slate-400 block font-medium">Contract Owner (Admin)</span>
              <p className="font-mono text-slate-300 break-all">
                {health?.contractOwner || "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"}
              </p>
              <span className="text-[11px] text-slate-400 block">
                Hardhat Default Deployer
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 space-y-1 sm:col-span-2 lg:col-span-1">
              <span className="text-slate-400 block font-medium">Connected User Wallet</span>
              <p className="font-mono text-cyan-300 break-all">
                {account || "No wallet connected yet"}
              </p>
              <span className="text-[11px] text-slate-400 block">
                Status: {isIssuer ? "🟢 Authorized to Mint" : "⚪ Read-only / Student"}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
