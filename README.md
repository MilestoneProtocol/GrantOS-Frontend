# GrantOS

GrantOS is an onchain grant enforcement protocol built on Arbitrum. It replaces spreadsheets, forum posts, and social pressure with cryptographic proofs and smart contract automation — so grants actually get delivered, and both DAOs and builders are protected by code, not trust.

## The problem

Traditional DAO grant programs depend on humans chasing updates, debating screenshots, and negotiating over DMs. Builders wait weeks for payment with no guarantee. Committees burn out verifying work that could be checked mathematically. GrantOS fixes that by putting the rules onchain.

## How it works

When a DAO creates a grant on GrantOS, the following happens automatically:

1. **Grant created** — Milestones, amounts, deadlines, and committee members are defined. Total USDC locks into escrow in one transaction.
2. **Identity verified** — The builder cryptographically binds their GitHub account to their wallet before they can submit work.
3. **ZK proof generated** — For each milestone, the builder generates a zero-knowledge proof that their GitHub PR exists and meets the requirements — without exposing private data.
4. **Committee reviews** — Committee members vote onchain. The smart contract enforces quorum; nobody can vote twice.
5. **Payment released** — Once quorum is reached, USDC is released as a lump sum or streamed per second via Sablier until the next deadline.
6. **Accountability** — Missed deadlines trigger onchain warnings (with a mandatory 24-hour window) before any slash. Every action is recorded permanently on EAS attestations.

No step requires trusting a human coordinator. The contract handles verification; the committee handles judgment.

## Who it's for

**DAOs** fund builders with escrowed USDC, define milestones upfront, and let the protocol enforce delivery — including warnings and slashing when deadlines are missed.

**Builders** get cryptographic rights: a 24-hour warning before any slash, the ability to resubmit after rejection, full transparency on every committee vote, and a permanent reputation score derived from onchain history.

**Committee members** govern, not verify. They review submissions, cast votes, and issue warnings — the smart contract handles the rest.

## This repo

This is the GrantOS frontend — a Next.js app for wallet connection, grant dashboards, milestone submission, committee review, treasury views, and protocol guidelines.
