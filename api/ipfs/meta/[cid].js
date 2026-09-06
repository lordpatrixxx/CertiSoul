module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { cid } = req.query;
  if (!cid) {
    return res.status(400).json({ error: 'CID parameter is required' });
  }

  // Attempt to resolve metadata from public IPFS gateways
  const gateways = [
    `https://gateway.pinata.cloud/ipfs/${cid}`,
    `https://ipfs.io/ipfs/${cid}`,
    `https://cloudflare-ipfs.com/ipfs/${cid}`,
  ];

  for (const gwUrl of gateways) {
    try {
      const response = await fetch(gwUrl, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        const data = await response.json();
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).json(data);
      }
    } catch {
      // Continue to next gateway
    }
  }

  return res.status(404).json({
    error: `Metadata for CID ${cid} could not be resolved from IPFS gateways.`,
  });
};
