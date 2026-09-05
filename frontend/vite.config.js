import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';
import { ethers } from 'ethers';

// Load .env from workspace root or frontend
dotenv.config({ path: path.resolve(import.meta.dirname, '../.env') });
dotenv.config({ path: path.resolve(import.meta.dirname, '.env') });

const mockIpfsStore = new Map();

// Local Hardhat constants for localhost development bootstrap
const HARDHAT_LOCAL_RPC = 'http://127.0.0.1:8545';
const HARDHAT_DEFAULT_ADMIN_KEY =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

/**
 * Helper to read local contract deployment artifact
 */
function getLocalDeployment() {
  const artifactPath = path.resolve(
    import.meta.dirname,
    'src/contracts/SoulboundCertificate.json'
  );
  if (fs.existsSync(artifactPath)) {
    try {
      return JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Custom Vite middleware for secure server-side IPFS pinning and local dev bootstrap.
 */
function devApiPlugin() {
  return {
    name: 'dev-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';

        // 1. IPFS Health check endpoint
        if (url === '/api/ipfs/health' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          return res.end(
            JSON.stringify({
              status: 'ok',
              pinataConfigured: Boolean(process.env.PINATA_JWT),
            })
          );
        }

        // 2. IPFS Mock gateway resolver endpoint
        if (url.startsWith('/api/ipfs/meta/') && req.method === 'GET') {
          const cid = url.replace('/api/ipfs/meta/', '').split('?')[0];
          const cached = mockIpfsStore.get(cid);
          if (cached) {
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify(cached));
          }
        }

        // 3. IPFS Pin JSON metadata endpoint
        if (url === '/api/ipfs/pin' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });

          req.on('end', async () => {
            try {
              const metadata = JSON.parse(body);
              const pinataJwt = process.env.PINATA_JWT;

              if (pinataJwt) {
                const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
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

                if (!response.ok) {
                  const errorText = await response.text();
                  throw new Error(`Pinata upload failed: ${errorText}`);
                }

                const data = await response.json();
                const cid = data.IpfsHash;

                res.setHeader('Content-Type', 'application/json');
                return res.end(
                  JSON.stringify({
                    success: true,
                    cid,
                    ipfsUri: `ipfs://${cid}`,
                    gatewayUrl: `https://gateway.pinata.cloud/ipfs/${cid}`,
                    mode: 'pinata-live',
                  })
                );
              } else {
                const contentStr = JSON.stringify(metadata);
                const hash = crypto.createHash('sha256').update(contentStr).digest('hex').slice(0, 32);
                const mockCid = `bafkrei${hash}`;
                mockIpfsStore.set(mockCid, metadata);

                res.setHeader('Content-Type', 'application/json');
                return res.end(
                  JSON.stringify({
                    success: true,
                    cid: mockCid,
                    ipfsUri: `ipfs://${mockCid}`,
                    gatewayUrl: `/api/ipfs/meta/${mockCid}`,
                    mode: 'dev-offline-mock',
                    notice: 'Using local IPFS dev simulation. Set PINATA_JWT in .env for live cloud pinning.',
                  })
                );
              }
            } catch (err) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              return res.end(
                JSON.stringify({
                  success: false,
                  error: err.message || 'IPFS pinning failed',
                })
              );
            }
          });
          return;
        }

        // 4. Local Development Health check endpoint
        if (url === '/api/local/health' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          const deployment = getLocalDeployment();

          try {
            const provider = new ethers.JsonRpcProvider(HARDHAT_LOCAL_RPC);
            const network = await provider.getNetwork();
            let contractOwner = null;
            let totalCerts = null;

            if (deployment && deployment.address && deployment.abi) {
              try {
                const contract = new ethers.Contract(deployment.address, deployment.abi, provider);
                contractOwner = await contract.owner();
                totalCerts = Number(await contract.totalCertificates());
              } catch {
                // Node might have restarted or contract not deployed
              }
            }

            return res.end(
              JSON.stringify({
                hardhatRpcReachable: true,
                rpcUrl: HARDHAT_LOCAL_RPC,
                chainId: Number(network.chainId),
                contractAddress: deployment?.address || null,
                contractOwner,
                totalCertificates: totalCerts,
                pinataConfigured: Boolean(process.env.PINATA_JWT),
              })
            );
          } catch (err) {
            return res.end(
              JSON.stringify({
                hardhatRpcReachable: false,
                rpcUrl: HARDHAT_LOCAL_RPC,
                error: err.message,
                contractAddress: deployment?.address || null,
                pinataConfigured: Boolean(process.env.PINATA_JWT),
              })
            );
          }
        }

        // 5. Local Development Issuer Bootstrap endpoint
        if (url === '/api/local/bootstrap-issuer' && req.method === 'POST') {
          // Security boundary: Only allow in development mode on localhost
          if (process.env.NODE_ENV === 'production') {
            res.statusCode = 403;
            res.setHeader('Content-Type', 'application/json');
            return res.end(
              JSON.stringify({
                success: false,
                error: 'Local bootstrap endpoint is strictly disabled in production builds.',
              })
            );
          }

          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });

          req.on('end', async () => {
            res.setHeader('Content-Type', 'application/json');
            try {
              const { address } = JSON.parse(body || '{}');

              // Validate address
              if (!address || !ethers.isAddress(address) || address === ethers.ZeroAddress) {
                res.statusCode = 400;
                return res.end(
                  JSON.stringify({
                    success: false,
                    error: 'Invalid Ethereum wallet address provided.',
                  })
                );
              }

              const deployment = getLocalDeployment();
              if (!deployment || !deployment.address || !deployment.abi) {
                res.statusCode = 400;
                return res.end(
                  JSON.stringify({
                    success: false,
                    error: 'Contract deployment artifact not found. Please run npm run deploy:local first.',
                  })
                );
              }

              // Verify local Hardhat node is running and chain ID is 31337
              const provider = new ethers.JsonRpcProvider(HARDHAT_LOCAL_RPC);
              const network = await provider.getNetwork();
              if (Number(network.chainId) !== 31337) {
                res.statusCode = 400;
                return res.end(
                  JSON.stringify({
                    success: false,
                    error: `Local bootstrap only operates on chain 31337. Current RPC chain: ${network.chainId}`,
                  })
                );
              }

              // Connect using Hardhat local default admin account on server only
              const adminWallet = new ethers.Wallet(HARDHAT_DEFAULT_ADMIN_KEY, provider);
              const contract = new ethers.Contract(
                deployment.address,
                deployment.abi,
                adminWallet
              );

              // Check if already authorized
              const alreadyIssuer = await contract.isAuthorizedIssuer(address);
              if (alreadyIssuer) {
                return res.end(
                  JSON.stringify({
                    success: true,
                    alreadyAuthorized: true,
                    authorizedAddress: address,
                    message: `Address ${address} is already an authorized issuer on-chain.`,
                  })
                );
              }

              // Call authorizeIssuer on-chain using server-side admin key
              const tx = await contract.authorizeIssuer(address);
              const receipt = await tx.wait();

              return res.end(
                JSON.stringify({
                  success: true,
                  alreadyAuthorized: false,
                  authorizedAddress: address,
                  txHash: receipt.hash,
                  message: `Successfully authorized ${address} as an issuer on-chain!`,
                })
              );
            } catch (err) {
              res.statusCode = 500;
              return res.end(
                JSON.stringify({
                  success: false,
                  error: err.message || 'Failed to authorize local issuer.',
                })
              );
            }
          });
          return;
        }

        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), devApiPlugin()],
  server: {
    port: 5173,
  },
});
