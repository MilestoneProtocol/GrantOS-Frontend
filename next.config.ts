import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3001';

const nextConfig: NextConfig = {
  /** Heavy WASM / ESM packages used by `lib/zk/prover.ts` for client-side proofs. */
  transpilePackages: ['@aztec/bb.js', '@noir-lang/noir_js'],
  allowedDevOrigins: ['192.168.88.159'],
  async headers() {
    return [
      {
        source: '/verify/success',
        headers: [
          { key: 'Cross-Origin-Opener-Policy',  value: 'same-origin-allow-popups' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${BACKEND_URL}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
