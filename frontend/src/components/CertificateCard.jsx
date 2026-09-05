import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ShieldCheck, ShieldAlert, ExternalLink, Copy, Check, Printer, QrCode } from "lucide-react";
import { formatIpfsGatewayUrl } from "../services/ipfs";

export default function CertificateCard({
  certificate,
  metadata,
  onRevokeClick,
  canRevoke = false,
}) {
  const [copied, setCopied] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  const verificationUrl = `${window.location.origin}/?verify=${certificate.tokenId}`;

  const copyVerificationLink = () => {
    navigator.clipboard.writeText(verificationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const studentName =
    metadata?.attributes?.find((a) => a.trait_type === "Student Name")?.value ||
    metadata?.studentName ||
    "Student Recipient";

  const courseTitle =
    metadata?.attributes?.find((a) => a.trait_type === "Course Title")?.value ||
    metadata?.name?.replace(" - Soulbound Certificate", "") ||
    "Blockchain Engineering";

  const issuerName =
    metadata?.attributes?.find((a) => a.trait_type === "Issuer Name")?.value ||
    "Authorized Academic Authority";

  const issueDateFormatted = certificate.issueTimestamp
    ? new Date(certificate.issueTimestamp * 1000).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Verified on-chain";

  const isRevoked = certificate.isRevoked;
  const ipfsGatewayLink = formatIpfsGatewayUrl(certificate.tokenUri);

  return (
    <div className="diploma-card transition-all duration-300">
      {/* Watermark in background */}
      <div className="diploma-watermark">VERIFIED</div>

      <div className="diploma-inner-border flex flex-col justify-between min-h-[480px]">
        {/* Card Header: Institution & Status Badge */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-amber-500/20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 p-0.5 shadow-md shadow-amber-500/20">
                <div className="w-full h-full bg-[#0d121f] rounded-[10px] flex items-center justify-center">
                  <span className="text-xl font-bold font-['Cinzel'] text-amber-300">SBC</span>
                </div>
              </div>
              <div>
                <h4 className="text-xs uppercase font-bold tracking-widest text-amber-400/90 font-['Cinzel']">
                  HACKBLOX Soulbound Registry
                </h4>
                <p className="text-sm font-semibold text-slate-200">{issuerName}</p>
              </div>
            </div>

            {/* Status Pill */}
            <div className="flex items-center gap-2">
              <span className="badge-soulbound text-[11px]">
                Token #{certificate.tokenId}
              </span>

              {isRevoked ? (
                <span className="badge-revoked">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  REVOKED
                </span>
              ) : (
                <span className="badge-valid">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  VALID & VERIFIED
                </span>
              )}
            </div>
          </div>

          {/* Revocation Warning Banner (if revoked) */}
          {isRevoked && (
            <div className="mt-4 p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-200 text-xs">
              <div className="flex items-center gap-2 font-semibold text-red-400">
                <ShieldAlert className="w-4 h-4" />
                Certificate Revocation Record
              </div>
              <p className="mt-1 text-red-300/90">
                <strong>Reason:</strong> {certificate.revocationReason || "No explicit reason specified"}
              </p>
              <p className="text-[11px] text-red-400/80 mt-0.5">
                Revoked on:{" "}
                {new Date(certificate.revokedTimestamp * 1000).toLocaleString()}
              </p>
            </div>
          )}

          {/* Main Diploma Content */}
          <div className="text-center py-8">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400 font-medium">
              This is to officially certify that
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-2 font-['Outfit'] tracking-wide">
              {studentName}
            </h2>
            <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-amber-400/60 to-transparent mx-auto my-3"></div>

            <p className="text-xs text-slate-400 max-w-md mx-auto">
              has successfully fulfilled all institutional criteria and demonstrated mastery in
            </p>
            <h3 className="text-lg sm:text-xl font-bold text-amber-300 mt-2 font-['Cinzel']">
              {courseTitle}
            </h3>
          </div>
        </div>

        {/* Card Footer: Metadata, QR Code & Verification Proof */}
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-amber-500/20 text-xs">
            {/* Recipient & Issuer Hashes */}
            <div className="sm:col-span-2 space-y-1.5">
              <div>
                <span className="text-slate-400">Issued To (Student): </span>
                <span className="font-mono text-slate-300 break-all">{certificate.recipient}</span>
              </div>
              <div>
                <span className="text-slate-400">Issuing Authority: </span>
                <span className="font-mono text-slate-300 break-all">{certificate.issuer}</span>
              </div>
              <div>
                <span className="text-slate-400">Issue Date: </span>
                <span className="text-slate-200">{issueDateFormatted}</span>
              </div>
              {certificate.tokenUri && (
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-slate-400">IPFS Reference: </span>
                  <a
                    href={ipfsGatewayLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-purple-400 hover:text-purple-300 font-mono inline-flex items-center gap-1 underline truncate max-w-[200px]"
                    title={certificate.tokenUri}
                  >
                    {certificate.tokenUri}
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                </div>
              )}
            </div>

            {/* Embedded Dynamic QR Code */}
            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-black/40 border border-white/5">
              <div 
                className="cursor-pointer bg-white p-1.5 rounded-lg shadow-inner hover:scale-105 transition-transform"
                onClick={() => setShowQrModal(true)}
                title="Click to enlarge verification QR"
              >
                <QRCodeSVG
                  value={verificationUrl}
                  size={72}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                <QrCode className="w-3 h-3 text-amber-400" /> Scan to Verify
              </span>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-6 mt-4 border-t border-white/5">
            <div className="flex items-center gap-2">
              <button
                onClick={copyVerificationLink}
                className="btn-secondary text-xs py-1.5 px-3"
                title="Copy public verification link"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Link Copied!" : "Share Link"}
              </button>

              <button
                onClick={handlePrint}
                className="btn-secondary text-xs py-1.5 px-3"
                title="Print or export as PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                Print / Save PDF
              </button>
            </div>

            {canRevoke && !isRevoked && (
              <button
                onClick={() => onRevokeClick(certificate.tokenId)}
                className="btn-danger text-xs py-1.5 px-3"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                Revoke Certificate
              </button>
            )}
          </div>
        </div>
      </div>

      {/* QR Code Enlarged Modal */}
      {showQrModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setShowQrModal(false)}
        >
          <div 
            className="glass-panel max-w-sm w-full p-6 text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white">Public Verification QR Code</h3>
            <p className="text-xs text-slate-400">
              Scan with any mobile camera or QR reader to instantly verify Certificate #{certificate.tokenId} on-chain.
            </p>
            <div className="flex justify-center p-4 bg-white rounded-2xl mx-auto w-fit shadow-2xl">
              <QRCodeSVG value={verificationUrl} size={200} level="H" />
            </div>
            <p className="text-[11px] font-mono text-slate-400 break-all">
              {verificationUrl}
            </p>
            <button
              onClick={() => setShowQrModal(false)}
              className="btn-secondary w-full justify-center text-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
