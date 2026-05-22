# GrantOS Frontend

## Environment Variables

- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`: Used for WalletConnect functionality. Get this from your project on WalletConnect Cloud (https://cloud.walletconnect.com/).
- `GITHUB_CLIENT_ID`: OAuth Client ID for GitHub login. Get this by creating a new OAuth App in GitHub Developer Settings.
- `GITHUB_CLIENT_SECRET`: OAuth Client Secret for GitHub login. Generated alongside the GITHUB_CLIENT_ID.
- `NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS`: The address of the Identity Registry contract on Arbitrum.

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
