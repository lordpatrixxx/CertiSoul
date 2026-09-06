const crypto = require('crypto');

module.exports = async function handler(req, res) {
  // CORS handling
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    let metadata = req.body;
    if (typeof metadata === 'string') {
      try {
        metadata = JSON.parse(metadata);
      } catch (e) {
        // continue
      }
    }

    if (!metadata || typeof metadata !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid JSON metadata in request body',
      });
    }

    const pinataJwt = process.env.PINATA_JWT;

    if (pinataJwt) {
      const pinataRes = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${pinataJwt}`,
        },
        body: JSON.stringify({
          pinataContent: metadata,
          pinataMetadata: {
            name: `${metadata.name || 'Certificate'}-metadata.json`,
          },
        }),
      });

      if (!pinataRes.ok) {
        const errorText = await pinataRes.text();
        throw new Error(`Pinata upload failed: ${errorText}`);
      }

      const data = await pinataRes.json();
      const cid = data.IpfsHash;

      return res.status(200).json({
        success: true,
        cid,
        ipfsUri: `ipfs://${cid}`,
        gatewayUrl: `https://gateway.pinata.cloud/ipfs/${cid}`,
        mode: 'pinata-live',
      });
    }

    // Fallback if PINATA_JWT is not configured
    const contentStr = JSON.stringify(metadata);
    const hash = crypto.createHash('sha256').update(contentStr).digest('hex').slice(0, 32);
    const mockCid = `bafkrei${hash}`;

    return res.status(200).json({
      success: true,
      cid: mockCid,
      ipfsUri: `ipfs://${mockCid}`,
      gatewayUrl: `/api/ipfs/meta/${mockCid}`,
      mode: 'mock-simulation',
      notice: 'Using simulated IPFS CID. Configure PINATA_JWT in Vercel Environment Variables for live Pinata cloud pinning.',
    });
  } catch (err) {
    console.error('IPFS Pinning Error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'IPFS pinning failed',
    });
  }
};
