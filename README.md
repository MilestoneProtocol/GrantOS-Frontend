# GrantOS Frontend

## Environment Variables

- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`: Used for WalletConnect functionality. Get this from your project on WalletConnect Cloud (https://cloud.walletconnect.com/).
- `GITHUB_CLIENT_ID`: OAuth Client ID for GitHub login. Get this by creating a new OAuth App in GitHub Developer Settings.
- `GITHUB_CLIENT_SECRET`: OAuth Client Secret for GitHub login. Generated alongside the GITHUB_CLIENT_ID.
- `NEXT_PUBLIC_GRANT_FACTORY_ADDRESS`: GrantFactory contract on Arbitrum.
- `NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS`: GrantIdentityRegistry contract on Arbitrum.
- `NEXT_PUBLIC_GRANT_ESCROW_ADDRESS`: GrantEscrow (Implementation) contract on Arbitrum.
- `NEXT_PUBLIC_VERIFIER_ADDRESS`: UltraHonkVerifier contract on Arbitrum.
- `NEXT_PUBLIC_SENTINEL_EAS_ADDRESS`: SentinelEAS contract on Arbitrum.
- `NEXT_PUBLIC_USDC_ADDRESS`: USDC (Testnet) on Arbitrum Sepolia.
- `NEXT_PUBLIC_EAS_CONTRACT_ADDRESS`: EAS contract on Arbitrum Sepolia.
- `NEXT_PUBLIC_SABLIER_V2_ADDRESS`: Sablier V2 (Fixed) on Arbitrum Sepolia.

## Contract Addresses

### Deployed Contracts on Arbitrum

| Contract | Address |
|---|---|
| GrantFactory | `0xb1fb4eda99821db96cb830413bfb3b18eb67b05f` |
| GrantIdentityRegistry | `0xaf2b31d9b6d10010d32bc99d69807c8da2a3894d` |
| UltraHonkVerifier | `0x888573502e6766744e28f447d1c44536f0d2cddd` |
| SentinelEAS | `0x6d19b30ce66ea738f906f8daf032aeb273e83b5a` |
| GrantEscrow (Implementation) | `0xf45be567e8dfe3982c3e40eb20b47124b626ce2c` |

### External Dependencies on Arbitrum Sepolia

| Contract | Address |
|---|---|
| Sablier V2 (Fixed) | `0x483bdd560dE53DC20f72dC66ACdB622C5075de34` |
| USDC (Testnet) | `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` |
| EAS | `0x2521021fc8BF070473E1e1801D3c7B4aB701E1dE` |

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
