module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return res.status(200).json({
    hardhatRpcReachable: false,
    production: true,
    message: 'Running in production environment (Vercel). Hardhat localhost RPC is not active in cloud mode.',
    pinataConfigured: Boolean(process.env.PINATA_JWT),
  });
};
