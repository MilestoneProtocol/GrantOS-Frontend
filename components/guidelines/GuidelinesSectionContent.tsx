'use client';

import GuidelinesCallout from '@/components/guidelines/GuidelinesCallout';
import GuidelinesContractsTable from '@/components/guidelines/GuidelinesContractsTable';
import GuidelinesFaq from '@/components/guidelines/GuidelinesFaq';
import GuidelinesFlowchart from '@/components/guidelines/GuidelinesFlowchart';
import GuidelinesScoringTable from '@/components/guidelines/GuidelinesScoringTable';
import GuidelinesSectionHeading from '@/components/guidelines/GuidelinesSectionHeading';
import {
  GuidelinesBody,
  GuidelinesLead,
  GuidelinesList,
  GuidelinesListItem,
  GuidelinesStepBlock,
  GuidelinesSubheading,
} from '@/components/guidelines/GuidelinesProse';
import { REPUTATION_GRADES } from '@/lib/guidelines/data';
import type { GuidelinesSectionId } from '@/lib/guidelines/types';

import GuidelinesScrollTable from '@/components/guidelines/GuidelinesScrollTable';
import type { ReactNode } from 'react';

function SectionShell({
  id,
  lead,
  children,
}: {
  id: GuidelinesSectionId;
  lead?: string;
  children: ReactNode;
}) {
  return (
    <article className="guidelines-section animate-grantos-reveal space-y-8">
      <GuidelinesSectionHeading sectionId={id} />
      {lead ? <GuidelinesLead>{lead}</GuidelinesLead> : null}
      <div className="max-w-prose space-y-6">{children}</div>
    </article>
  );
}

function SectionHowItWorks() {
  return (
    <SectionShell
      id="how-it-works"
      lead="GrantOS v3 is an onchain grant enforcement protocol built on Arbitrum. It replaces spreadsheets, forum posts, and social pressure with cryptographic proofs and smart contract automation. When a DAO creates a grant on GrantOS v3, the following happens automatically and in order — no human coordination required."
    >
      <GuidelinesSubheading>The end of trust-based grant delivery.</GuidelinesSubheading>
      <GuidelinesFlowchart />
      <div className="max-w-prose space-y-6">
        <GuidelinesStepBlock title="Step 1 — Grant Created">
          A DAO committee member defines the grant: the builder&apos;s wallet address, milestone titles and descriptions, USDC amounts per milestone, deadlines, proof requirements, committee members, quorum, and payment mode. The total USDC locks into GrantEscrow.sol in one transaction. The funds never touch anyone&apos;s personal wallet until a milestone is approved.
        </GuidelinesStepBlock>
        <GuidelinesStepBlock title="Step 2 — Builder Verifies Identity">
          Before receiving any funds, the builder completes a one-time ZK identity binding at /verify. They cryptographically prove that their wallet is controlled by the same person as a real GitHub account with a verified contribution history. This proof is verified onchain. It is permanent. It cannot be faked.
        </GuidelinesStepBlock>
        <GuidelinesStepBlock title="Step 3 — Builder Submits ZK Proof">
          When a milestone is complete, the builder does not paste a URL into a text box. They click Generate Proof. The app calls the Noir ZK Coprocessor which runs the proof generation against the GitHub API. A cryptographic proof is generated confirming the PR exists, is merged, and is authored by the builder&apos;s verified GitHub account. The smart contract reads this proof. No human reads anything.
        </GuidelinesStepBlock>
        <GuidelinesStepBlock title="Step 4 — Committee Reviews Evidence">
          Committee members see the ZK proof verification status, the AI verifier verdict, and the builder&apos;s written summary side by side. The ZK Verified checkmark is the most important signal. The AI verdict is advisory. The committee votes approve or reject. When quorum is reached, payment executes automatically.
        </GuidelinesStepBlock>
        <GuidelinesStepBlock title="Step 5 — Payment Releases">
          If lump-sum mode: USDC transfers to the builder&apos;s wallet immediately when quorum is reached. If streaming mode: USDC flows to the builder per second via Superfluid from the moment of approval until the next milestone deadline. The builder earns exactly what they earned — to the millisecond.
        </GuidelinesStepBlock>
        <GuidelinesStepBlock title="Step 6 — Missed Deadlines">
          If a builder misses a deadline, the committee issues an onchain warning EAS attestation. The builder has 24 hours to respond. After 24 hours, the committee can execute a slash. USDC returns to the DAO treasury automatically. The builder&apos;s reputation score updates immediately.
        </GuidelinesStepBlock>
      </div>
      <GuidelinesCallout variant="info" title="Smart contract enforcement">
        Every step above is enforced by smart contracts on Arbitrum. There is no step that requires trusting a human.
      </GuidelinesCallout>
    </SectionShell>
  );
}

function SectionZkProof() {
  return (
    <SectionShell
      id="zk-proof"
      lead={'When you see a ZK Verified badge on GrantOS v3, it means a zero-knowledge proof confirmed that something happened — not that a person said it happened, not that a screenshot showed it happened, but that mathematics confirmed it happened.'}
    >
      <GuidelinesSubheading>What does &quot;cryptographically verified&quot; actually mean?</GuidelinesSubheading>
      <GuidelinesSubheading>What is TLSNotary?</GuidelinesSubheading>
      <GuidelinesBody>
        TLSNotary is a protocol developed by the Ethereum Foundation. When your browser makes a request to a website like GitHub, TLS encryption protects that connection. TLSNotary splits the TLS session keys between you and a notary server — neither party can alter the data without breaking the proof. The result is a cryptographic certificate that says: this specific API response genuinely came from GitHub&apos;s servers at this specific time and has not been modified by anyone.
      </GuidelinesBody>
      <GuidelinesSubheading>What is the Noir ZK Coprocessor?</GuidelinesSubheading>
      <GuidelinesBody>
        The Noir ZK Coprocessor generates a compact zero-knowledge proof that can be verified by a smart contract on Arbitrum in a single transaction. Without it, the raw proof would be too large and expensive to verify onchain. The coprocessor makes onchain web proof verification practical.
      </GuidelinesBody>
      <GuidelinesSubheading>What does &quot;the contract verified this&quot; mean?</GuidelinesSubheading>
      <GuidelinesBody>
        It means the WebProofVerifier smart contract on Arbitrum ran the mathematical verification of the ZK proof in the same transaction as the milestone submission. If verification failed, the entire transaction reverted. The milestone cannot advance to Submitted state unless the proof passes. No committee member approved this. No admin reviewed it. The math either checks out or the transaction fails.
      </GuidelinesBody>
      <GuidelinesSubheading>Three things ZK proofs prevent on GrantOS v3:</GuidelinesSubheading>
      <GuidelinesList>
        <GuidelinesListItem>
          <strong>First — Forged pull requests.</strong> A builder cannot submit a PR opened against a private repository that gets deleted after approval. The TLSNotary proof captures the GitHub API response at the moment of proof generation. The repository and PR must exist and be publicly verifiable.
        </GuidelinesListItem>
        <GuidelinesListItem>
          <strong>Second — Shared evidence.</strong> A builder cannot submit the same PR link across multiple grant applications with minor modifications. The proof is cryptographically bound to the builder&apos;s verified GitHub identity and wallet address. The same evidence cannot pass verification for a different wallet.
        </GuidelinesListItem>
        <GuidelinesListItem>
          <strong>Third — Identity spoofing.</strong> A builder cannot use a PR authored by a different GitHub account. The ZK identity binding established at /verify permanently links one wallet to one GitHub handle. The WebProofVerifier checks that the PR author matches the registered identity.
        </GuidelinesListItem>
      </GuidelinesList>
      <GuidelinesCallout variant="info" title="ZK Verified badge">
        The ZK Verified badge means cryptography confirmed it — not a human opinion. If you see this badge on a milestone, the smart contract already ran the math.
      </GuidelinesCallout>
    </SectionShell>
  );
}

function SectionCommittee() {
  return (
    <SectionShell
      id="committee"
      lead="Being a committee member on GrantOS v3 is different from being a committee member in a traditional DAO grant program. Your role is governance, not verification. The smart contract handles verification. You handle judgment."
    >
      <GuidelinesSubheading>What you are responsible for as a committee member.</GuidelinesSubheading>
      <GuidelinesSubheading>Your responsibilities in order:</GuidelinesSubheading>
      <GuidelinesList>
        <GuidelinesListItem>
          <strong>One — Check the ZK proof status first.</strong> Before reading anything else, look at whether the milestone has a ZK Verified checkmark or not. A verified proof means the PR exists, is merged, and is authored by the builder&apos;s registered identity. An unverified proof means the submission failed cryptographic verification and should be treated with significant skepticism.
        </GuidelinesListItem>
        <GuidelinesListItem>
          <strong>Two — Read the AI verdict as advisory only.</strong> The AI verifier reads the PR diff and writes a plain-English assessment of whether the code fulfills the milestone description. It is labelled LIKELY FULFILLED, UNCERTAIN, or LIKELY INSUFFICIENT. This is not binding. The AI can be wrong. Read it as a starting point for your own assessment, not a final answer.
        </GuidelinesListItem>
        <GuidelinesListItem>
          <strong>Three — Vote within 48 hours of submission.</strong> Builders are working on deadlines. Delayed committee votes create uncertainty and unfairness. If you cannot assess a milestone within 48 hours, coordinate with other committee members to ensure quorum is not stalled.
        </GuidelinesListItem>
        <GuidelinesListItem>
          <strong>Four — Issue warnings before slashing.</strong> You cannot slash a milestone without first issuing an onchain warning EAS attestation. This is not a recommendation — it is a smart contract requirement. The slash transaction will revert if no valid 24-hour warning exists for that milestone. Issue the warning, wait 24 hours, then execute the slash.
        </GuidelinesListItem>
        <GuidelinesListItem>
          <strong>Five — Never use slashing as a first response.</strong> Slashing is the last resort for builders who have gone completely silent past their deadline. Use the warning system as intended. Give builders the 24-hour window. Check the builder&apos;s communication history. Slashing a builder who communicated a delay through other channels is a misuse of the system and will be reflected in the onchain warning attestation history permanently.
        </GuidelinesListItem>
      </GuidelinesList>
      <GuidelinesSubheading>On quorum:</GuidelinesSubheading>
      <GuidelinesBody>
        Quorum is the minimum number of committee approvals required for a milestone to be approved or rejected. It is set at grant creation and cannot be changed. When quorum is reached on approvals, payment executes automatically in the same transaction. When quorum is reached on rejections, the milestone returns to Pending state and the builder may resubmit before their deadline. A tie — where neither approve nor reject quorum is reached — leaves the milestone in Submitted state indefinitely until more votes are cast.
      </GuidelinesBody>
      <GuidelinesCallout variant="warning" title="24-hour warning required">
        Slashing without a valid 24-hour onchain warning attestation is impossible. The contract enforces this. You cannot bypass it.
      </GuidelinesCallout>
    </SectionShell>
  );
}

function SectionBuilderRights() {
  return (
    <SectionShell
      id="builder-rights"
      lead="GrantOS v3 does not just protect DAOs from bad builders. It protects builders from bad committees. The following rights are enforced at the smart contract level. They are not policies. They cannot be overridden by a committee member, a DAO admin, or Anthropic."
    >
      <GuidelinesSubheading>Your cryptographic rights as a builder on GrantOS v3.</GuidelinesSubheading>
      <GuidelinesList>
        <GuidelinesListItem>
          <strong>Right 1 — The right to a 24-hour warning before slash.</strong> No committee member can slash your milestone without first submitting an onchain warning EAS attestation for that specific milestone. The warning must be timestamped at least 24 hours before the slash transaction. If a slash is attempted without a valid warning, the transaction reverts. You have 24 hours from the warning timestamp to respond, communicate, or prepare. You can verify any warning issued against you by viewing the EAS attestation directly on easscan.org.
        </GuidelinesListItem>
        <GuidelinesListItem>
          <strong>Right 2 — The right to resubmit after rejection.</strong> If your milestone is rejected by the committee, it returns to Pending state. You may generate a new ZK proof and resubmit before your deadline. The committee&apos;s rejection reason is written into an EAS attestation and is permanently visible to you, to future DAOs, and to the public. Use it to understand what was insufficient and address it in your resubmission.
        </GuidelinesListItem>
        <GuidelinesListItem>
          <strong>Right 3 — The right to full transparency.</strong> Every vote cast on your milestones, every warning issued against you, every attestation written about you is publicly readable onchain. Nothing happens in private. You can verify every committee action by reading the smart contract state and the EAS attestation history directly. No backroom decisions, no unexplained rejections, no invisible penalties.
        </GuidelinesListItem>
        <GuidelinesListItem>
          <strong>Right 4 — The right to a permanent cryptographic record.</strong> Your reputation score, your ZK proof history, your delivery record — all of it is derived from onchain EAS attestations. No admin can modify it. No committee member can delete it. No DAO can reset it. It is what the blockchain says you did.
        </GuidelinesListItem>
      </GuidelinesList>
      <GuidelinesSubheading>How to verify your due process was followed:</GuidelinesSubheading>
      <GuidelinesBody>
        Navigate to /guidelines and find the Contract Addresses section. Open GrantEscrow.sol on Arbiscan. Read the warningRecords mapping for your grant ID and milestone index. Confirm a warning attestation exists with a timestamp at least 24 hours before the slash transaction. Then open easscan.org and search for the attestation UID. The full warning details are permanently readable there.
      </GuidelinesBody>
      <GuidelinesCallout variant="critical" title="Onchain due process evidence">
        If you believe a slash was executed without a valid 24-hour warning, the evidence is onchain. The contract enforces due process mathematically. Check the warning attestation timestamp against the slash transaction timestamp on Arbiscan.
      </GuidelinesCallout>
    </SectionShell>
  );
}

function SectionSlashing() {
  return (
    <SectionShell
      id="slashing"
      lead="Slashing is the mechanism by which escrowed USDC is returned to the DAO treasury when a builder fails to deliver a milestone. It is irreversible. It is automatic. It is final."
    >
      <GuidelinesSubheading>When slashing happens, how it works, and what it means.</GuidelinesSubheading>
      <GuidelinesSubheading>The slashing process step by step:</GuidelinesSubheading>
      <GuidelinesList>
        <GuidelinesListItem>
          <strong>Step 1 — Milestone misses its deadline.</strong> The milestone status does not automatically change. It remains Pending. The committee must identify the overdue milestone and take action.
        </GuidelinesListItem>
        <GuidelinesListItem>
          <strong>Step 2 — Committee identifies the overdue milestone.</strong> On the /committee page and the /tasks page, overdue milestones display a red OVERDUE badge. The normal Approve and Reject voting buttons are replaced with Warning and Slash controls.
        </GuidelinesListItem>
        <GuidelinesListItem>
          <strong>Step 3 — Committee issues a warning EAS attestation.</strong> The committee member clicks Issue Warning, writes a warning message, and submits the EAS attestation onchain. The attestation is written to Arbitrum One permanently. The builder sees the warning immediately on their dashboard with a live countdown.
        </GuidelinesListItem>
        <GuidelinesListItem>
          <strong>Step 4 — 24-hour window.</strong> From the warning timestamp, the builder has 24 hours. The slash button remains locked during this window. The committee member can see the live countdown on their /tasks and /committee pages.
        </GuidelinesListItem>
        <GuidelinesListItem>
          <strong>Step 5 — Slash becomes eligible.</strong> When the countdown expires, the Slash button activates. The committee member clicks Slash, confirms the irreversible action in the confirmation modal, and submits the transaction.
        </GuidelinesListItem>
        <GuidelinesListItem>
          <strong>Step 6 — Contract validates the warning.</strong> GrantEscrow.sol checks: does a warningRecord exist for this milestone with a timestamp older than 24 hours? If not, the transaction reverts with WarningRequired(). If yes, the slash executes.
        </GuidelinesListItem>
        <GuidelinesListItem>
          <strong>Step 7 — Funds return to treasury.</strong> If lump-sum mode: the full escrowed milestone amount transfers back to the DAO treasury address in the same transaction. If streaming mode: Superfluid&apos;s deleteFlow() is called, the stream stops instantly, and all unstreamed USDC returns to the treasury. The builder keeps whatever had already streamed to their wallet before the cancellation — down to the millisecond.
        </GuidelinesListItem>
        <GuidelinesListItem>
          <strong>Step 8 — Reputation updates.</strong> The builder&apos;s reputation score updates immediately: -5 for the warning received, -15 for the slash. The milestone status updates to Slashed permanently. No further submissions or votes are possible on this milestone.
        </GuidelinesListItem>
      </GuidelinesList>
      <GuidelinesCallout variant="critical" title="Irreversible slashing">
        Slashed milestones are permanent and cannot be reversed. There is no appeal mechanism built into the protocol. Choose your committee members carefully at grant creation.
      </GuidelinesCallout>
      <GuidelinesSubheading>Streaming vs lump-sum slashing:</GuidelinesSubheading>
      <GuidelinesBody>
        In lump-sum mode, slashing returns the full milestone amount to treasury regardless of how much work was done. In streaming mode, slashing returns only the unstreamed portion — the builder keeps what already flowed to their wallet. Streaming mode is therefore more builder-friendly in partial delivery scenarios.
      </GuidelinesBody>
    </SectionShell>
  );
}

function SectionReputation() {
  return (
    <SectionShell
      id="reputation"
      lead="Every builder address on GrantOS v3 has a permanent public reputation score derived entirely from onchain EAS attestation history. No admin controls it. No committee member can modify it. No DAO can reset it. It is a mathematical function of what you actually did."
    >
      <GuidelinesSubheading>Your reputation score is your onchain track record. It cannot be faked.</GuidelinesSubheading>
      <GuidelinesSubheading>Scoring events table:</GuidelinesSubheading>
      <GuidelinesScoringTable />
      <GuidelinesSubheading>Score scale and letter grades:</GuidelinesSubheading>
      <GuidelinesScrollTable caption="Reputation grade scale">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <th className="px-4 py-3">Score</th>
            <th className="px-4 py-3">Grade</th>
            <th className="px-4 py-3">What it means</th>
          </tr>
        </thead>
        <tbody>
          {REPUTATION_GRADES.map((row, i) => (
            <tr key={row.grade} className={`border-b border-slate-100 ${i % 2 === 1 ? 'bg-slate-50/60' : ''}`}>
              <th scope="row" className="px-4 py-3 text-sm font-medium text-slate-900">{row.range}</th>
              <td className="px-4 py-3 text-sm font-bold text-slate-900">{row.grade}</td>
              <td className="px-4 py-3 text-sm text-slate-600">{row.meaning}</td>
            </tr>
          ))}
        </tbody>
      </GuidelinesScrollTable>
      <GuidelinesSubheading>The ZK Verified badge on your reputation score:</GuidelinesSubheading>
      <GuidelinesBody>
        If you have submitted at least one cryptographic ZK proof across your grant history, your reputation score displays a ZK Verified badge alongside it. This badge signals to DAOs that you engage with the cryptographic proof system rather than relying on EAS-only evidence. Sophisticated DAOs will filter for this badge when evaluating grant applications.
      </GuidelinesBody>
      <GuidelinesSubheading>How DAOs use reputation scores:</GuidelinesSubheading>
      <GuidelinesBody>
        When a DAO committee member creates a new grant at /grants/new, the builder&apos;s reputation score and ZK Verified status are displayed in real time as soon as the builder&apos;s wallet address is entered. A committee member can see at a glance: this builder has an A grade, 87% delivery rate, ZK Verified, no warnings, no slashes. Or: this builder has a D grade, 3 warnings, 2 slashes. The score is the first signal — not the only signal, but the first.
      </GuidelinesBody>
      <GuidelinesCallout variant="info" title="100% onchain score">
        Your score is 100% derived from onchain EAS attestations. There is no database behind it. There is no admin panel. There is no support ticket to modify it. The score is what the blockchain says you did.
      </GuidelinesCallout>
    </SectionShell>
  );
}

function SectionFaq() {
  return (
    <SectionShell id="faq" lead="Frequently asked questions about GrantOS v3 protocol mechanics.">
      <GuidelinesSubheading>Frequently asked questions.</GuidelinesSubheading>
      <GuidelinesFaq />
    </SectionShell>
  );
}

function SectionContracts() {
  return (
    <SectionShell
      id="contracts"
      lead="All contracts are deployed on Arbitrum One, verified on Arbiscan, and open source."
    >
      <GuidelinesSubheading>All contracts are deployed on Arbitrum One, verified on Arbiscan, and open source.</GuidelinesSubheading>
      <GuidelinesContractsTable />
      <GuidelinesBody>
        All contracts are open source. You can read every function, every mapping, every event. There are no hidden admin functions. There are no upgrade proxies. What you see is what runs.
      </GuidelinesBody>
    </SectionShell>
  );
}

const SECTIONS: Record<GuidelinesSectionId, () => React.JSX.Element> = {
  'how-it-works': SectionHowItWorks,
  'zk-proof': SectionZkProof,
  committee: SectionCommittee,
  'builder-rights': SectionBuilderRights,
  slashing: SectionSlashing,
  reputation: SectionReputation,
  faq: SectionFaq,
  contracts: SectionContracts,
};

export default function GuidelinesSectionContent({ sectionId }: { sectionId: GuidelinesSectionId }) {
  const Section = SECTIONS[sectionId];
  return <Section key={sectionId} />;
}
