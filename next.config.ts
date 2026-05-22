import type { NextConfig } from "next";

const BACKEND_URL =
  process.env.BACKEND_URL?.replace(/\/+$/, '') ??
  'https://grantos-backend-9f5v.onrender.com';

const nextConfig: NextConfig = {
  /** Heavy WASM / ESM packages used by `lib/zk/prover.ts` for client-side proofs. */
  transpilePackages: ['@aztec/bb.js', '@noir-lang/noir_js'],
  allowedDevOrigins: ['192.168.88.159'],
  turbopack: {},
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      accounts: false,
      porto: false,
      '@base-org/account': false,
      '@safe-global/safe-apps-provider': false,
      '@safe-global/safe-apps-sdk': false,
    };
    return config;
  },
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
