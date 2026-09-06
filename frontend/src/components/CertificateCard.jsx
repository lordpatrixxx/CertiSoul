import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  ShieldCheck,
  ShieldAlert,
  ExternalLink,
  Copy,
  Check,
  Printer,
  QrCode,
  Award,
  Calendar,
  X,
  FileCheck2,
} from "lucide-react";
import { formatIpfsGatewayUrl } from "../services/ipfs";

export default function CertificateCard({
  certificate,
  metadata,
  onRevokeClick,
  canRevoke = false,
}) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedStudent, setCopiedStudent] = useState(false);
  const [copiedIssuer, setCopiedIssuer] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  const verificationUrl = `${window.location.origin}/?verify=${certificate.tokenId}`;

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === "link") {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } else if (type === "student") {
      setCopiedStudent(true);
      setTimeout(() => setCopiedStudent(false), 2000);
    } else if (type === "issuer") {
      setCopiedIssuer(true);
      setTimeout(() => setCopiedIssuer(false), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const studentName =
    metadata?.attributes?.find((a) => a.trait_type === "Student Name")?.value ||
    metadata?.studentName ||
    "Recipient Scholar";

  const courseTitle =
    metadata?.attributes?.find((a) => a.trait_type === "Course Title")?.value ||
    metadata?.name?.replace(" - Soulbound Certificate", "") ||
    "Blockchain Engineering & Web3 Architecture";

  const issuerName =
    metadata?.attributes?.find((a) => a.trait_type === "Issuer Name")?.value ||
    "HACKBLOX Academy of Technology";

  const gradeDistinction =
    metadata?.attributes?.find((a) => a.trait_type === "Grade / Distinction")?.value ||
    metadata?.grade ||
    "Passed with Honors";

  const issueDateFormatted = certificate.issueTimestamp
    ? new Date(certificate.issueTimestamp * 1000).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Verified On-Chain";

  const isRevoked = certificate.isRevoked;
  const ipfsGatewayLink = formatIpfsGatewayUrl(certificate.tokenUri);

  return (
    <div className="diploma-card">
      {/* Background Watermark */}
      <div className="diploma-watermark">CERTIFIED</div>

      <div className="diploma-inner-border flex flex-col justify-between min-h-[500px]">
        {/* Ornate Gold Corner Ornaments */}
        <div className="corner-accent corner-tl" />
        <div className="corner-accent corner-tr" />
        <div className="corner-accent corner-bl" />
        <div className="corner-accent corner-br" />

        {/* 1. Header: Institution, Gold Seal & Status */}
        <div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-amber-500/20">
            {/* Institution Crest & Title */}
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 p-0.5 shadow-lg shadow-amber-500/20 flex-shrink-0">
                <div className="w-full h-full bg-[#080d19] rounded-[14px] flex items-center justify-center">
                  <Award className="w-6 h-6 text-amber-300" />
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-[0.25em] text-amber-400 font-['Cinzel']">
                  On-Chain Credential Registry
                </p>
                <h3 className="text-base font-bold text-white tracking-tight font-['Outfit']">
                  {issuerName}
                </h3>
              </div>
            </div>

            {/* Right: Gold Seal & Status Pill */}
            <div className="flex items-center gap-3 self-end sm:self-center">
              {/* Status Badge */}
              <div className="flex items-center gap-2">
                <span className="badge-soulbound text-xs font-mono">
                  Token #{certificate.tokenId}
                </span>

                {isRevoked ? (
                  <span className="badge-revoked text-xs">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    REVOKED
                  </span>
                ) : (
                  <span className="badge-valid text-xs">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    AUTHENTIC & VALID
                  </span>
                )}
              </div>

              {/* Regal Seal Emblem */}
              <div className="hidden md:flex gold-seal-emblem">
                <div className="gold-seal-inner">
                  <span>SOUL<br/>BOUND</span>
                </div>
              </div>
            </div>
          </div>

          {/* Revocation Warning Alert (if revoked) */}
          {isRevoked && (
            <div className="mt-5 p-4 rounded-xl bg-red-950/50 border border-red-500/40 text-red-200 text-xs shadow-inner">
              <div className="flex items-center gap-2 font-bold text-red-400 text-sm">
                <ShieldAlert className="w-4 h-4" />
                Official Certificate Revocation Notice
              </div>
              <p className="mt-1.5 text-red-200">
                <strong>Reason:</strong> {certificate.revocationReason || "Administrative clerical action"}
              </p>
              <p className="text-[11px] text-red-400/90 mt-1 font-mono">
                Revoked on: {new Date(certificate.revokedTimestamp * 1000).toLocaleString()}
              </p>
            </div>
          )}

          {/* 2. Main Diploma Body */}
          <div className="text-center py-10 px-2 sm:px-6">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400 font-semibold font-['Cinzel']">
              This is to officially certify that
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-3 font-['Outfit'] tracking-normal text-balance">
              {studentName}
            </h2>
            <div className="w-32 h-0.5 bg-gradient-to-r from-transparent via-amber-400/70 to-transparent mx-auto my-4"></div>

            <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
              has completed the rigorous requirements and demonstrated verified mastery in
            </p>

            <h3 className="text-xl sm:text-2xl font-bold text-amber-300 mt-2.5 font-['Cinzel'] tracking-wide">
              {courseTitle}
            </h3>

            {/* Distinction Badge */}
            {gradeDistinction && (
              <div className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-semibold">
                <FileCheck2 className="w-3.5 h-3.5 text-amber-400" />
                {gradeDistinction}
              </div>
            )}
          </div>
        </div>

        {/* 3. Footer: Cryptographic Hashes & High-Contrast QR Code */}
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-6 border-t border-amber-500/20 text-xs">
            {/* Recipient & Issuer Cryptographic Proof */}
            <div className="sm:col-span-3 space-y-2.5">
              {/* Student Wallet */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-2 rounded-lg bg-black/30 border border-white/5">
                <span className="text-slate-400 font-medium">Issued To (Student):</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-slate-200 text-[11px] break-all">
                    {certificate.recipient}
                  </span>
                  <button
                    onClick={() => copyToClipboard(certificate.recipient, "student")}
                    className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
                    title="Copy student address"
                  >
                    {copiedStudent ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Issuing Authority Wallet */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-2 rounded-lg bg-black/30 border border-white/5">
                <span className="text-slate-400 font-medium">Issuing Authority:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-slate-200 text-[11px] break-all">
                    {certificate.issuer}
                  </span>
                  <button
                    onClick={() => copyToClipboard(certificate.issuer, "issuer")}
                    className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
                    title="Copy issuer address"
                  >
                    {copiedIssuer ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Issue Date & IPFS Storage */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg bg-black/30 border border-white/5">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Calendar className="w-3.5 h-3.5 text-purple-400" />
                  <span>Issue Date: <strong>{issueDateFormatted}</strong></span>
                </div>

                {certificate.tokenUri && (
                  <div className="flex items-center gap-1 text-[11px]">
                    <span className="text-slate-400">IPFS Proof:</span>
                    <a
                      href={ipfsGatewayLink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-cyan-400 hover:text-cyan-300 font-mono inline-flex items-center gap-1 underline truncate max-w-[180px]"
                      title={certificate.tokenUri}
                    >
                      {certificate.tokenUri}
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Framed QR Code Tile */}
            <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-black/40 border border-white/5 text-center">
              <div
                className="cursor-pointer bg-white p-2 rounded-xl shadow-md hover:scale-105 transition-transform"
                onClick={() => setShowQrModal(true)}
                title="Click to enlarge verification QR"
              >
                <QRCodeSVG
                  value={verificationUrl}
                  size={76}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-2 flex items-center gap-1 font-medium">
                <QrCode className="w-3 h-3 text-amber-400" /> Scan to Verify
              </span>
            </div>
          </div>

          {/* 4. Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-6 mt-6 border-t border-white/5">
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => copyToClipboard(verificationUrl, "link")}
                className="btn-secondary h-9 px-3.5 text-xs"
                title="Copy public verification link"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedLink ? "Link Copied!" : "Share Link"}
              </button>

              <button
                onClick={handlePrint}
                className="btn-secondary h-9 px-3.5 text-xs"
                title="Print or export as PDF"
              >
                <Printer className="w-3.5 h-3.5 text-purple-400" />
                Print / Save PDF
              </button>
            </div>

            {canRevoke && !isRevoked && (
              <button
                onClick={() => onRevokeClick(certificate.tokenId)}
                className="btn-danger h-9 px-3.5 text-xs"
                title="Initiate on-chain revocation"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                Revoke Certificate
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Enlarged QR Code Modal */}
      {showQrModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="glass-panel max-w-sm w-full p-6 text-center space-y-4 border border-purple-500/30 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Public Verification QR Code</h3>
              <button
                onClick={() => setShowQrModal(false)}
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Scan with any mobile camera or QR scanner to audit Certificate #{certificate.tokenId} directly on-chain.
            </p>
            <div className="flex justify-center p-4 bg-white rounded-2xl mx-auto w-fit shadow-2xl">
              <QRCodeSVG value={verificationUrl} size={190} level="H" />
            </div>
            <p className="text-[10px] font-mono text-slate-400 break-all p-2 rounded bg-black/40 border border-white/5">
              {verificationUrl}
            </p>
            <button
              onClick={() => setShowQrModal(false)}
              className="btn-secondary w-full justify-center h-9 text-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
