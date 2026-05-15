import { GRANT_ESCROW_ADDRESS, IDENTITY_REGISTRY_ADDRESS } from '@/lib/escrow';
import type { Address } from 'viem';

const REPUTATION_REGISTRY_ADDRESS = (process.env.NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS ||
  '0x0000000000000000000000000000000000000003') as Address;

const WEB_PROOF_VERIFIER_ADDRESS = (process.env.NEXT_PUBLIC_WEB_PROOF_VERIFIER_ADDRESS ||
  '0x0000000000000000000000000000000000000004') as Address;

export type FlowchartStepKind = 'dao' | 'builder' | 'contract';

export type FlowchartStep = {
  step: number;
  label: string;
  sublabel: string;
  kind: FlowchartStepKind;
};

export const PROTOCOL_FLOWCHART: FlowchartStep[] = [
  { step: 1, label: 'Grant', sublabel: 'Created', kind: 'dao' },
  { step: 2, label: 'Identity', sublabel: 'Verified', kind: 'builder' },
  { step: 3, label: 'ZK Proof', sublabel: 'Generated', kind: 'builder' },
  { step: 4, label: 'Committee', sublabel: 'Reviews', kind: 'dao' },
  { step: 5, label: 'Quorum', sublabel: 'Reached', kind: 'contract' },
  { step: 6, label: 'Payment', sublabel: 'Released', kind: 'contract' },
];

export const SCORING_EVENTS = [
  {
    event: 'Milestone approved, on time',
    actor: 'Builder',
    points: '+10',
    positive: true,
    notes: 'Deadline not passed at approval',
  },
  {
    event: 'Milestone approved, late',
    actor: 'Builder',
    points: '+4',
    positive: true,
    notes: 'Deadline passed but still approved',
  },
  {
    event: 'ZK proof submitted',
    actor: 'Builder',
    points: '+2',
    positive: true,
    notes: 'Regardless of outcome — rewards builders who use the proof system',
  },
  {
    event: 'Milestone rejected',
    actor: 'Builder',
    points: '-3',
    positive: false,
    notes: 'Committee quorum voted reject',
  },
  {
    event: 'Warning received',
    actor: 'Builder',
    points: '-5',
    positive: false,
    notes: 'Onchain warning EAS attestation issued against you',
  },
  {
    event: 'Milestone slashed',
    actor: 'Builder',
    points: '-15',
    positive: false,
    notes: 'Escrowed funds returned to treasury',
  },
] as const;

export const REPUTATION_GRADES = [
  { range: '90–100', grade: 'A', meaning: 'Exceptional delivery record' },
  { range: '75–89', grade: 'B', meaning: 'Strong delivery record' },
  { range: '60–74', grade: 'C', meaning: 'Average delivery record' },
  { range: '40–59', grade: 'D', meaning: 'Below average, concerning history' },
  { range: 'Below 40', grade: 'F', meaning: 'Critical — significant delivery failures' },
] as const;

export const GUIDELINES_FAQ = [
  {
    question: 'What happens if vlayer proof generation fails?',
    answer:
      'Proof generation can fail for several reasons: the PR does not exist, the repository is private, the GitHub API timed out, or the vlayer notary server was temporarily unavailable. In all cases, the failure is shown with a specific error reason and a retry button. No transaction is submitted and no fees are spent. You can retry as many times as needed before your deadline.',
  },
  {
    question: 'Can I resubmit after rejection?',
    answer:
      'Yes. When a milestone is rejected by committee quorum, it returns to Pending state. You can generate a new ZK proof and resubmit before your milestone deadline. Read the rejection reason in the EAS attestation carefully — it explains what the committee found insufficient. Address those specific issues in your resubmission.',
  },
  {
    question: 'What if I miss a deadline by one hour?',
    answer:
      'Missing a deadline by any amount of time makes your milestone eligible for the warning and slashing process. However, committee members are humans with discretion. Many will not immediately issue a warning for a minor delay, especially if you communicate proactively. The protocol enforces due process — a 24-hour warning must precede any slash. Use that window.',
  },
  {
    question: 'Can a committee member vote twice on the same milestone?',
    answer:
      'No. The smart contract tracks votes per wallet address per milestone. Calling castVote() a second time from the same address reverts with AlreadyVoted(). This is enforced at the contract level.',
  },
  {
    question: 'What does the AI verifier actually do?',
    answer:
      'The AI verifier calls GPT-4o with the milestone description, the GitHub PR URL, and the ZK proof verification result. It reads the PR diff and writes a plain-English assessment stored in the EAS attestation. It returns one of three verdicts: LIKELY FULFILLED, UNCERTAIN, or LIKELY INSUFFICIENT. It is advisory only. It cannot approve or reject a milestone. The committee votes. The AI assists.',
  },
  {
    question: 'Can my reputation score be manually adjusted?',
    answer:
      'No. There is no admin function on ReputationRegistry.sol that modifies scores. The score is computed from EAS attestation history. The only way to improve your score is to deliver milestones on time with ZK proofs.',
  },
  {
    question: 'What happens to streaming payments if I get slashed?',
    answer:
      "Superfluid's deleteFlow() is called in the slash transaction. The stream stops at that exact millisecond. Whatever USDC had already flowed to your wallet before the slash remains yours. The unstreamed portion returns to the DAO treasury instantly. You earned exactly what streamed before cancellation — not a cent more, not a cent less.",
  },
  {
    question: 'How do I appeal a slash?',
    answer:
      'There is no appeal mechanism built into the GrantOS v3 protocol. Slashes are irreversible onchain actions. The due process protection — the mandatory 24-hour warning — is the appeal window. If you believe a slash was executed without a valid warning, verify the attestation timestamps on easscan.org and the transaction timestamps on Arbiscan. If the warning timestamp is less than 24 hours before the slash transaction, the slash transaction should have reverted — contact the DAO directly with the onchain evidence.',
  },
  {
    question: 'Can I use the same GitHub account for multiple wallets?',
    answer:
      'No. The GrantIdentityRegistry.sol contract enforces a one-to-one binding between GitHub handles and wallet addresses. If a GitHub handle is already registered to a wallet, attempting to register it to a different wallet will revert with AlreadyRegistered(). Each GitHub identity can only be bound to one wallet address permanently.',
  },
  {
    question: 'What chains does GrantOS v3 support?',
    answer:
      'GrantOS v3 is deployed exclusively on Arbitrum One. All contracts, all attestations, all Superfluid streams, and all ZK proof verifications happen on Arbitrum One. There are no plans to deploy on other chains at this time.',
  },
] as const;

export const GUIDELINES_CONTRACTS = [
  { name: 'GrantEscrow.sol', address: GRANT_ESCROW_ADDRESS },
  { name: 'GrantIdentityRegistry.sol', address: IDENTITY_REGISTRY_ADDRESS },
  { name: 'ReputationRegistry.sol', address: REPUTATION_REGISTRY_ADDRESS },
  { name: 'WebProofVerifier.sol', address: WEB_PROOF_VERIFIER_ADDRESS },
] as const;

export function arbiscanAddressUrl(address: string) {
  return `https://arbiscan.io/address/${address}`;
}
