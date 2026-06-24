// lib/stellar/grant.ts
//
// Stellar (Soroban) implementations of the GrantOS platform actions, wrapping
// the generated typed bindings (lib/stellar/bindings/*) and signing with
// Freighter. These are the Stellar branch of the chain-agnostic actions called
// from the UI — the EVM branch stays in the existing wagmi code.

import { Buffer } from 'buffer';
import { signTransaction as freighterSign } from '@stellar/freighter-api';
import { Client as FactoryClient, type MilestoneInput, type ProofType } from './bindings/factory/src';
import { Client as EscrowClient, type Config, type Milestone, type Stream } from './bindings/escrow/src';
import { Client as SentinelClient } from './bindings/sentinel/src';
import {
  STELLAR_RPC_URL,
  STELLAR_NETWORK_PASSPHRASE,
  STELLAR_FACTORY_ID,
  STELLAR_SENTINEL_ID,
} from './client';

type ProofKind = 'ZkGithub' | 'EasOnly';

export interface MilestoneSpec {
  title: string;
  description: string;
  amount: bigint; // USDC base units (i128)
  deadline: bigint; // unix seconds (u64)
  proofType: ProofKind;
}

/** Freighter-backed signer config for the generated ContractClients. */
function signer(publicKey: string) {
  return {
    publicKey,
    signTransaction: async (xdr: string) => {
      const res = await freighterSign(xdr, {
        networkPassphrase: STELLAR_NETWORK_PASSPHRASE,
        address: publicKey,
      });
      if (res.error) throw new Error(String(res.error));
      return { signedTxXdr: res.signedTxXdr, signerAddress: res.signerAddress };
    },
  };
}

function baseOptions(contractId: string, publicKey?: string) {
  return {
    contractId,
    networkPassphrase: STELLAR_NETWORK_PASSPHRASE,
    rpcUrl: STELLAR_RPC_URL,
    allowHttp: STELLAR_RPC_URL.startsWith('http://'),
    ...(publicKey ? signer(publicKey) : {}),
  };
}

const factory = (pk?: string) => new FactoryClient(baseOptions(STELLAR_FACTORY_ID, pk));
const escrow = (id: string, pk?: string) => new EscrowClient(baseOptions(id, pk));
const sentinel = (pk?: string) => new SentinelClient(baseOptions(STELLAR_SENTINEL_ID, pk));

// ── Writes ───────────────────────────────────────────────────────────────────

/** Build the 32-byte grant_id the factory/escrow/sentinel use (id in last 4 bytes). */
export function grantIdBytes(id: number): Uint8Array {
  const b = new Uint8Array(32);
  new DataView(b.buffer).setUint32(28, id, false);
  return b;
}

/** GrantFactory.create_grant — deploys + funds a new escrow. */
export async function createGrant(p: {
  caller: string;
  grantee: string;
  streaming: boolean;
  committee: string[];
  quorum: number;
  milestones: MilestoneSpec[];
}): Promise<{ grantId: number; escrowId: string }> {
  const milestones: MilestoneInput[] = p.milestones.map((m) => ({
    title: m.title,
    description: m.description,
    amount: m.amount,
    deadline: m.deadline,
    proof_type: { tag: m.proofType, values: undefined } as ProofType,
  }));
  const tx = await factory(p.caller).create_grant({
    grantor: p.caller,
    grantee: p.grantee,
    streaming: p.streaming,
    committee: p.committee,
    quorum: p.quorum,
    milestones,
  });
  const { result } = await tx.signAndSend();
  if (result.isErr()) throw new Error(`create_grant failed: ${result.unwrapErr().message}`);
  const [grantId, escrowAddr] = result.unwrap();
  return { grantId: Number(grantId), escrowId: escrowAddr };
}

export async function submitMilestone(p: {
  escrowId: string;
  caller: string; // grantee
  milestoneId: number;
  proof: Uint8Array;
  publicInputs: Uint8Array;
  summary: string;
}): Promise<void> {
  const tx = await escrow(p.escrowId, p.caller).submit_milestone({
    grantee: p.caller,
    milestone_id: p.milestoneId,
    proof: Buffer.from(p.proof),
    public_inputs: Buffer.from(p.publicInputs),
    builder_summary: p.summary,
  });
  await tx.signAndSend();
}

export async function approveMilestone(p: { escrowId: string; voter: string; milestoneId: number }) {
  const tx = await escrow(p.escrowId, p.voter).approve_milestone({ voter: p.voter, milestone_id: p.milestoneId });
  await tx.signAndSend();
}

export async function rejectMilestone(p: { escrowId: string; voter: string; milestoneId: number }) {
  const tx = await escrow(p.escrowId, p.voter).reject_milestone({ voter: p.voter, milestone_id: p.milestoneId });
  await tx.signAndSend();
}

export async function slashMilestone(p: { escrowId: string; voter: string; milestoneId: number }) {
  const tx = await escrow(p.escrowId, p.voter).slash_milestone({ voter: p.voter, milestone_id: p.milestoneId });
  await tx.signAndSend();
}

/** Pull the vested portion of a streaming milestone. Returns claimed amount. */
export async function withdrawStream(p: { escrowId: string; caller: string; milestoneId: number }): Promise<bigint> {
  const tx = await escrow(p.escrowId, p.caller).withdraw_stream({ grantee: p.caller, milestone_id: p.milestoneId });
  const { result } = await tx.signAndSend();
  return result.isOk() ? result.unwrap() : 0n;
}

export async function cancelGrant(p: { escrowId: string; caller: string }) {
  const tx = await escrow(p.escrowId, p.caller).cancel_grant({ grantor: p.caller });
  await tx.signAndSend();
}

/** Sentinel.issue_warning — plants the warning that gates a future slash. */
export async function issueWarning(p: {
  caller: string;
  grantId: Uint8Array; // 32 bytes
  milestoneIndex: number;
  msgHash: Uint8Array; // 32 bytes
}) {
  const tx = await sentinel(p.caller).issue_warning({
    issuer: p.caller,
    grant_id: Buffer.from(p.grantId),
    milestone_index: p.milestoneIndex,
    msg_hash: Buffer.from(p.msgHash),
  });
  await tx.signAndSend();
}

// ── Reads (simulation only — no signing) ─────────────────────────────────────

export async function getGrant(escrowId: string): Promise<Config> {
  return (await escrow(escrowId).get_grant()).result;
}

export async function getMilestones(escrowId: string): Promise<Milestone[]> {
  return (await escrow(escrowId).get_milestones()).result;
}

export async function getStream(escrowId: string, milestoneId: number): Promise<Stream | null> {
  return (await escrow(escrowId).get_stream({ milestone_id: milestoneId })).result ?? null;
}

export async function getEscrowForGrant(grantId: number): Promise<string | null> {
  const info = (await factory().grant({ grant_id: grantId })).result;
  return info ? info.escrow : null;
}

export async function hasValidWarning(grantId: Uint8Array, milestoneIndex: number): Promise<boolean> {
  return (
    await sentinel().has_valid_warning({ grant_id: Buffer.from(grantId), milestone_index: milestoneIndex })
  ).result;
}
