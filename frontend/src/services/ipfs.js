/**
 * IPFS Service Layer
 * Interacts with the secure server-side endpoint (/api/ipfs/pin) so secrets remain safe.
 */

export async function uploadCertificateMetadata({
  studentName,
  courseTitle,
  issueDate,
  issuerName,
  grade,
  recipientAddress,
  issuerAddress,
  extraNotes = "",
}) {
  const metadata = {
    name: `${courseTitle} - Soulbound Certificate`,
    description: `Official Soulbound Credential awarded to ${studentName} for completion of ${courseTitle} by ${issuerName}. This credential is permanently non-transferable and verifiable on-chain.`,
    image: "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi", // High-res academic crest badge
    external_url: "https://hackblox.xyz",
    attributes: [
      { trait_type: "Student Name", value: studentName },
      { trait_type: "Course Title", value: courseTitle },
      { trait_type: "Issuer Name", value: issuerName },
      { trait_type: "Issue Date", value: issueDate || new Date().toISOString().split("T")[0] },
      { trait_type: "Grade / Distinction", value: grade || "Passed" },
      { trait_type: "Recipient Address", value: recipientAddress },
      { trait_type: "Issuer Address", value: issuerAddress },
      { trait_type: "Credential Type", value: "Soulbound (Non-Transferable)" },
      { trait_type: "Standard", value: "ERC-721 Soulbound" },
      ...(extraNotes ? [{ trait_type: "Notes", value: extraNotes }] : []),
    ],
  };

  const response = await fetch("/api/ipfs/pin", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(metadata),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Failed to pin metadata to IPFS");
  }

  const result = await response.json();
  return {
    ...result,
    metadata,
  };
}

export function formatIpfsGatewayUrl(ipfsUri) {
  if (!ipfsUri) return "";
  if (ipfsUri.startsWith("ipfs://")) {
    const cid = ipfsUri.replace("ipfs://", "");
    // If it's a dev-offline-mock CID, use the local resolver
    if (cid.startsWith("bafkrei") && cid.length === 39) {
      return `/api/ipfs/meta/${cid}`;
    }
    return `https://ipfs.io/ipfs/${cid}`;
  }
  return ipfsUri;
}

export async function fetchMetadataFromIpfs(ipfsUri) {
  if (!ipfsUri) return null;
  const primaryUrl = formatIpfsGatewayUrl(ipfsUri);

  try {
    const res = await fetch(primaryUrl);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback to secondary IPFS gateway
    if (ipfsUri.startsWith("ipfs://")) {
      const cid = ipfsUri.replace("ipfs://", "");
      try {
        const fallbackRes = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`);
        if (fallbackRes.ok) {
          return await fallbackRes.json();
        }
      } catch {
        return null;
      }
    }
  }
  return null;
}
