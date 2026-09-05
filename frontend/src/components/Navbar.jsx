import React from "react";
import { ShieldCheck, Wallet, ExternalLink, Award, Search, Building2, User } from "lucide-react";
import { CONTRACT_ADDRESS } from "../services/web3";

export default function Navbar({
  activeTab,
  setActiveTab,
  account,
  networkName,
  chainId,
  isOwner,
  isIssuer,
  onConnect,
  isConnecting,
}) {
  const truncate = (addr) =>
    addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#07090e]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Logo & Title */}
        <div 
          className="flex items-center gap-3 cursor-pointer select-none"
          onClick={() => setActiveTab("verify")}
        >
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-purple-500/20">
            <div className="w-full h-full bg-[#090d16] rounded-[10px] flex items-center justify-center">
              <Award className="w-6 h-6 text-purple-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-white font-['Outfit']">
                Certi<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">Soul</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30">
                Soulbound v5
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">On-Chain Verifiable Credentials</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-900/60 border border-white/5">
          <button
            onClick={() => setActiveTab("verify")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "verify"
                ? "bg-purple-600/20 text-purple-300 border border-purple-500/30 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            <Search className="w-4 h-4" />
            Public Verifier
          </button>

          <button
            onClick={() => setActiveTab("issuer")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "issuer"
                ? "bg-purple-600/20 text-purple-300 border border-purple-500/30 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            <Building2 className="w-4 h-4" />
            Issuer Dashboard
            {isIssuer && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("vault")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "vault"
                ? "bg-purple-600/20 text-purple-300 border border-purple-500/30 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            <User className="w-4 h-4" />
            My Vault
          </button>
        </nav>

        {/* Network Badge & Wallet Connection */}
        <div className="flex items-center gap-3">
          {/* Network Pill */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-white/5 text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <span>{chainId === 31337 ? "Localhost (31337)" : chainId === 11155111 ? "Sepolia" : `Chain: ${chainId || "Unknown"}`}</span>
          </div>

          {/* Role Pill */}
          {account && (
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-white/5 text-slate-300 border border-white/10">
              {isOwner ? (
                <span className="text-amber-400">Admin/Owner</span>
              ) : isIssuer ? (
                <span className="text-purple-400">Authorized Issuer</span>
              ) : (
                <span className="text-slate-400">Student / Public</span>
              )}
            </div>
          )}

          {/* Wallet Button */}
          {account ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-200 text-sm font-medium">
              <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
              <span>{truncate(account)}</span>
            </div>
          ) : (
            <button
              onClick={onConnect}
              disabled={isConnecting}
              className="btn-primary text-sm py-2 px-4"
            >
              <Wallet className="w-4 h-4" />
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Navigation Row */}
      <div className="flex md:hidden border-t border-white/5 px-4 py-2 gap-2 bg-slate-950/90 overflow-x-auto">
        <button
          onClick={() => setActiveTab("verify")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium ${
            activeTab === "verify" ? "bg-purple-600/30 text-purple-200" : "text-slate-400"
          }`}
        >
          <Search className="w-3.5 h-3.5" /> Verifier
        </button>
        <button
          onClick={() => setActiveTab("issuer")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium ${
            activeTab === "issuer" ? "bg-purple-600/30 text-purple-200" : "text-slate-400"
          }`}
        >
          <Building2 className="w-3.5 h-3.5" /> Issuer
        </button>
        <button
          onClick={() => setActiveTab("vault")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium ${
            activeTab === "vault" ? "bg-purple-600/30 text-purple-200" : "text-slate-400"
          }`}
        >
          <User className="w-3.5 h-3.5" /> My Vault
        </button>
      </div>
    </header>
  );
}
