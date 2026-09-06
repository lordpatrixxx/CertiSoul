import React, { useState, useEffect, useCallback } from "react";
import Navbar from "./components/Navbar";
import PublicVerify from "./components/PublicVerify";
import IssuerDashboard from "./components/IssuerDashboard";
import StudentVault from "./components/StudentVault";
import {
  connectWallet,
  getAccountRole,
  fetchLocalHealth,
  CONTRACT_ADDRESS,
} from "./services/web3";
import { Award, ShieldCheck } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState("verify");
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState(null);
  const [networkName, setNetworkName] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const [isIssuer, setIsIssuer] = useState(false);
  const [roleLabel, setRoleLabel] = useState("Student / Public");
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("");
  const [prefilledRevokeTokenId, setPrefilledRevokeTokenId] = useState("");
  const [health, setHealth] = useState(null);

  // Load local health metrics – defined first so the polling useEffect can reference it safely.
  const refreshHealth = useCallback(async () => {
    try {
      const data = await fetchLocalHealth();
      setHealth(data);
    } catch {
      // ignore
    }
  }, []);

  const handleAccountLoad = useCallback(async (userAccount) => {
    setAccount(userAccount);
    try {
      const currentChainHex = await window.ethereum.request({ method: "eth_chainId" });
      const currentDec = parseInt(currentChainHex, 16);
      setChainId(currentDec);
      const netName =
        currentDec === 11155111
          ? "Sepolia Testnet"
          : currentDec === 31337
          ? "Hardhat Localhost"
          : currentDec === 1
          ? "Ethereum Mainnet"
          : `Chain ${currentDec}`;
      setNetworkName(netName);

      const roles = await getAccountRole(userAccount);
      setIsOwner(roles.isOwner);
      setIsIssuer(roles.isIssuer);
      setRoleLabel(roles.roleLabel);
      refreshHealth();
    } catch (err) {
      console.error("Error loading account roles:", err);
    }
  }, [refreshHealth]);

  useEffect(() => {
    refreshHealth();
    const interval = setInterval(refreshHealth, 8000);
    return () => clearInterval(interval);
  }, [refreshHealth]);

  // Listen for MetaMask account and chain changes
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum
        .request({ method: "eth_accounts" })
        .then((accounts) => {
          if (accounts && accounts.length > 0) {
            handleAccountLoad(accounts[0]);
          }
        })
        .catch(console.error);

      window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length > 0) {
          handleAccountLoad(accounts[0]);
        } else {
          setAccount("");
          setIsOwner(false);
          setIsIssuer(false);
          setRoleLabel("Not Connected");
        }
      });

      window.ethereum.on("chainChanged", (hexChainId) => {
        setChainId(parseInt(hexChainId, 16));
        refreshHealth();
      });
    }
  }, [handleAccountLoad, refreshHealth]);

  const handleConnect = async () => {
    setIsConnecting(true);
    setConnectionStatus("Connecting wallet...");
    try {
      const data = await connectWallet((status) => setConnectionStatus(status));
      setAccount(data.account);
      setChainId(data.chainId);
      setNetworkName(data.networkName);
      setIsOwner(data.isOwner);
      setIsIssuer(data.isIssuer);
      setRoleLabel(data.roleLabel);
      setConnectionStatus("Connected!");
      setTimeout(() => setConnectionStatus(""), 2000);
      refreshHealth();
    } catch (err) {
      console.error("Wallet connection error:", err);
      alert(err.message || "Failed to connect wallet.");
      setConnectionStatus("");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleRefreshRoles = async () => {
    if (account) {
      await handleAccountLoad(account);
    }
    await refreshHealth();
  };

  const handleRevokeFromCard = (tokenId) => {
    setPrefilledRevokeTokenId(tokenId);
    setActiveTab("issuer");
  };

  return (
    <div className="min-h-screen flex flex-col justify-between">
      <div>
        {/* Single Unified Header */}
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          account={account}
          networkName={networkName}
          chainId={chainId}
          isOwner={isOwner}
          isIssuer={isIssuer}
          roleLabel={roleLabel}
          onConnect={handleConnect}
          isConnecting={isConnecting}
          connectionStatus={connectionStatus}
          health={health}
          onRoleRefreshed={handleRefreshRoles}
        />

        {/* Main Content View */}
        <main className="py-8 sm:py-12">
          {activeTab === "verify" && (
            <PublicVerify
              connectedAccount={account}
              userIsIssuerOrOwner={isIssuer || isOwner}
              onRevokeClick={handleRevokeFromCard}
            />
          )}

          {activeTab === "issuer" && (
            <IssuerDashboard
              account={account}
              isOwner={isOwner}
              isIssuer={isIssuer}
              onRefreshRole={handleRefreshRoles}
              prefilledRevokeTokenId={prefilledRevokeTokenId}
            />
          )}

          {activeTab === "vault" && (
            <StudentVault
              connectedAccount={account}
              onConnect={handleConnect}
              onNavigateToIssuer={() => setActiveTab("issuer")}
            />
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#07090e]/95 backdrop-blur-md py-8 text-xs text-slate-400 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-purple-400" />
            <span className="font-semibold text-slate-200">CertiSoul dApp</span>
            <span>&bull;</span>
            <span>HACKBLOX 2026 Web3 Track &bull; Problem Statement 2</span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <span className="font-mono text-slate-400">
              Contract: {CONTRACT_ADDRESS.slice(0, 10)}...{CONTRACT_ADDRESS.slice(-6)}
            </span>
            <span>&bull;</span>
            <span className="inline-flex items-center gap-1 text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              OpenZeppelin v5.6.1 Soulbound Invariants
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
