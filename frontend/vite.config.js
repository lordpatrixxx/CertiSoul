import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import path from 'node:path';

// Load .env from workspace root or frontend
dotenv.config({ path: path.resolve(import.meta.dirname, '../.env') });
dotenv.config({ path: path.resolve(import.meta.dirname, '.env') });

const mockIpfsStore = new Map();

/**
 * Custom Vite middleware for secure server-side IPFS pinning.
 * Ensures PINATA_JWT is NEVER exposed to client browser code.
 */
function ipfsServerPlugin() {
  return {
    name: 'ipfs-server-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';

        // Health check endpoint
        if (url === '/api/ipfs/health' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          return res.end(
            JSON.stringify({
              status: 'ok',
              pinataConfigured: Boolean(process.env.PINATA_JWT),
            })
          );
        }

        // Mock gateway resolver endpoint
        if (url.startsWith('/api/ipfs/meta/') && req.method === 'GET') {
          const cid = url.replace('/api/ipfs/meta/', '').split('?')[0];
          const cached = mockIpfsStore.get(cid);
          if (cached) {
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify(cached));
          }
        }

        // Pin JSON metadata endpoint
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
                // Production flow: Server-side secure Pinata call
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
                // Development fallback: Deterministic offline mock CID
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

        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), ipfsServerPlugin()],
  server: {
    port: 5173,
  },
});
