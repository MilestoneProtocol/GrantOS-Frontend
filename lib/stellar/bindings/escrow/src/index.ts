import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Timepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}


export const networks = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    contractId: "CDWEHBXOREGFZDME4BAZESWO4PZ6575XM7AHWVNW6GKHQXBJXTYAULP2",
  }
} as const

export const Errors = {
  1: {message:"AlreadyInitialized"},
  2: {message:"BadCommittee"},
  3: {message:"BadQuorum"},
  4: {message:"BadMilestones"},
  5: {message:"NotGrantor"},
  6: {message:"NotGrantee"},
  7: {message:"NotCommittee"},
  8: {message:"Cancelled"},
  9: {message:"InvalidMilestone"},
  10: {message:"InvalidState"},
  11: {message:"ZkIdentityRequired"},
  12: {message:"ProofRequired"},
  13: {message:"ProofInvalid"},
  14: {message:"AlreadyVoted"},
  15: {message:"NotOverdue"},
  16: {message:"OnTimeUnderReview"},
  17: {message:"NoValidWarning"},
  18: {message:"NotStreaming"}
}


export interface Config {
  committee: Array<string>;
  created_at: u64;
  grant_id: Buffer;
  grantee: string;
  grantor: string;
  is_streaming: boolean;
  quorum: u32;
  registry: string;
  sentinel: string;
  usdc: string;
  verifier: string;
}


export interface Stream {
  end: u64;
  start: u64;
  total: i128;
  withdrawn: i128;
}

export type DataKey = {tag: "Config", values: void} | {tag: "Cancelled", values: void} | {tag: "Milestones", values: void} | {tag: "Submission", values: readonly [u32]} | {tag: "Voted", values: readonly [u32, string]} | {tag: "Stream", values: readonly [u32]};


export interface Milestone {
  amount: i128;
  deadline: u64;
  description: string;
  proof_type: ProofType;
  state: MilestoneState;
  title: string;
}

export type ProofType = {tag: "ZkGithub", values: void} | {tag: "EasOnly", values: void};


export interface Submission {
  approval_count: u32;
  builder_summary: string;
  proof_hash: Buffer;
  rejection_count: u32;
  submitted_at: u64;
}


export interface MilestoneInput {
  amount: i128;
  deadline: u64;
  description: string;
  proof_type: ProofType;
  title: string;
}

export type MilestoneState = {tag: "Pending", values: void} | {tag: "Submitted", values: void} | {tag: "Approved", values: void} | {tag: "Rejected", values: void} | {tag: "Slashed", values: void} | {tag: "Streaming", values: void};

export interface Client {
  /**
   * Construct and simulate a get_grant transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_grant: (options?: MethodOptions) => Promise<AssembledTransaction<Config>>

  /**
   * Construct and simulate a get_stream transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_stream: ({milestone_id}: {milestone_id: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Option<Stream>>>

  /**
   * Construct and simulate a cancel_grant transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Grantor cancels and reclaims all unspent USDC (`GrantEscrow.sol:486`).
   */
  cancel_grant: ({grantor}: {grantor: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a is_cancelled transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  is_cancelled: (options?: MethodOptions) => Promise<AssembledTransaction<boolean>>

  /**
   * Construct and simulate a get_milestones transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_milestones: (options?: MethodOptions) => Promise<AssembledTransaction<Array<Milestone>>>

  /**
   * Construct and simulate a get_submission transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_submission: ({milestone_id}: {milestone_id: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Option<Submission>>>

  /**
   * Construct and simulate a slash_milestone transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Slash an overdue, undelivered milestone (`GrantEscrow.sol:442`).
   */
  slash_milestone: ({voter, milestone_id}: {voter: string, milestone_id: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a withdraw_stream transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Grantee withdraws the vested portion of a streaming milestone. Linear,
   * cliff-free over `STREAM_DURATION_SECS` (our Sablier replacement).
   */
  withdraw_stream: ({grantee, milestone_id}: {grantee: string, milestone_id: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Result<i128>>>

  /**
   * Construct and simulate a reject_milestone transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Committee rejection; enough rejections returns the milestone to Pending
   * (`GrantEscrow.sol:415`).
   */
  reject_milestone: ({voter, milestone_id}: {voter: string, milestone_id: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a submit_milestone transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Builder submits a milestone with a ZK proof (`GrantEscrow.sol:297`).
   */
  submit_milestone: ({grantee, milestone_id, proof, public_inputs, builder_summary}: {grantee: string, milestone_id: u32, proof: Buffer, public_inputs: Buffer, builder_summary: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a approve_milestone transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Committee approval; on quorum pays lump-sum or starts a stream
   * (`GrantEscrow.sol:362`).
   */
  approve_milestone: ({voter, milestone_id}: {voter: string, milestone_id: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a get_milestone_status transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_milestone_status: ({milestone_id}: {milestone_id: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Option<MilestoneState>>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
        /** Constructor/Initialization Args for the contract's `__constructor` method */
        {usdc, registry, sentinel, verifier, grantor, grantee, is_streaming, committee, quorum, milestones, grant_id}: {usdc: string, registry: string, sentinel: string, verifier: string, grantor: string, grantee: string, is_streaming: boolean, committee: Array<string>, quorum: u32, milestones: Array<MilestoneInput>, grant_id: Buffer},
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy({usdc, registry, sentinel, verifier, grantor, grantee, is_streaming, committee, quorum, milestones, grant_id}, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAAEgAAAAAAAAASQWxyZWFkeUluaXRpYWxpemVkAAAAAAABAAAAAAAAAAxCYWRDb21taXR0ZWUAAAACAAAAAAAAAAlCYWRRdW9ydW0AAAAAAAADAAAAAAAAAA1CYWRNaWxlc3RvbmVzAAAAAAAABAAAAAAAAAAKTm90R3JhbnRvcgAAAAAABQAAAAAAAAAKTm90R3JhbnRlZQAAAAAABgAAAAAAAAAMTm90Q29tbWl0dGVlAAAABwAAAAAAAAAJQ2FuY2VsbGVkAAAAAAAACAAAAAAAAAAQSW52YWxpZE1pbGVzdG9uZQAAAAkAAAAAAAAADEludmFsaWRTdGF0ZQAAAAoAAAAAAAAAElprSWRlbnRpdHlSZXF1aXJlZAAAAAAACwAAAAAAAAANUHJvb2ZSZXF1aXJlZAAAAAAAAAwAAAAAAAAADFByb29mSW52YWxpZAAAAA0AAAAAAAAADEFscmVhZHlWb3RlZAAAAA4AAAAAAAAACk5vdE92ZXJkdWUAAAAAAA8AAAAAAAAAEU9uVGltZVVuZGVyUmV2aWV3AAAAAAAAEAAAAAAAAAAOTm9WYWxpZFdhcm5pbmcAAAAAABEAAAAAAAAADE5vdFN0cmVhbWluZwAAABI=",
        "AAAAAQAAAAAAAAAAAAAABkNvbmZpZwAAAAAACwAAAAAAAAAJY29tbWl0dGVlAAAAAAAD6gAAABMAAAAAAAAACmNyZWF0ZWRfYXQAAAAAAAYAAAAAAAAACGdyYW50X2lkAAAD7gAAACAAAAAAAAAAB2dyYW50ZWUAAAAAEwAAAAAAAAAHZ3JhbnRvcgAAAAATAAAAAAAAAAxpc19zdHJlYW1pbmcAAAABAAAAAAAAAAZxdW9ydW0AAAAAAAQAAAAAAAAACHJlZ2lzdHJ5AAAAEwAAAAAAAAAIc2VudGluZWwAAAATAAAAAAAAAAR1c2RjAAAAEwAAAAAAAAAIdmVyaWZpZXIAAAAT",
        "AAAAAQAAAAAAAAAAAAAABlN0cmVhbQAAAAAABAAAAAAAAAADZW5kAAAAAAYAAAAAAAAABXN0YXJ0AAAAAAAABgAAAAAAAAAFdG90YWwAAAAAAAALAAAAAAAAAAl3aXRoZHJhd24AAAAAAAAL",
        "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAABgAAAAAAAAAAAAAABkNvbmZpZwAAAAAAAAAAAAAAAAAJQ2FuY2VsbGVkAAAAAAAAAAAAAAAAAAAKTWlsZXN0b25lcwAAAAAAAQAAAAAAAAAKU3VibWlzc2lvbgAAAAAAAQAAAAQAAAABAAAAAAAAAAVWb3RlZAAAAAAAAAIAAAAEAAAAEwAAAAEAAAAAAAAABlN0cmVhbQAAAAAAAQAAAAQ=",
        "AAAAAQAAAAAAAAAAAAAACU1pbGVzdG9uZQAAAAAAAAYAAAAAAAAABmFtb3VudAAAAAAACwAAAAAAAAAIZGVhZGxpbmUAAAAGAAAAAAAAAAtkZXNjcmlwdGlvbgAAAAAQAAAAAAAAAApwcm9vZl90eXBlAAAAAAfQAAAACVByb29mVHlwZQAAAAAAAAAAAAAFc3RhdGUAAAAAAAfQAAAADk1pbGVzdG9uZVN0YXRlAAAAAAAAAAAABXRpdGxlAAAAAAAAEA==",
        "AAAAAgAAAAAAAAAAAAAACVByb29mVHlwZQAAAAAAAAIAAAAAAAAAAAAAAAhaa0dpdGh1YgAAAAAAAAAAAAAAB0Vhc09ubHkA",
        "AAAAAQAAAAAAAAAAAAAAClN1Ym1pc3Npb24AAAAAAAUAAAAAAAAADmFwcHJvdmFsX2NvdW50AAAAAAAEAAAAAAAAAA9idWlsZGVyX3N1bW1hcnkAAAAAEAAAAAAAAAAKcHJvb2ZfaGFzaAAAAAAD7gAAACAAAAAAAAAAD3JlamVjdGlvbl9jb3VudAAAAAAEAAAAAAAAAAxzdWJtaXR0ZWRfYXQAAAAG",
        "AAAAAAAAAAAAAAAJZ2V0X2dyYW50AAAAAAAAAAAAAAEAAAfQAAAABkNvbmZpZwAA",
        "AAAAAQAAAAAAAAAAAAAADk1pbGVzdG9uZUlucHV0AAAAAAAFAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAAAAAACGRlYWRsaW5lAAAABgAAAAAAAAALZGVzY3JpcHRpb24AAAAAEAAAAAAAAAAKcHJvb2ZfdHlwZQAAAAAH0AAAAAlQcm9vZlR5cGUAAAAAAAAAAAAABXRpdGxlAAAAAAAAEA==",
        "AAAAAgAAAAAAAAAAAAAADk1pbGVzdG9uZVN0YXRlAAAAAAAGAAAAAAAAAAAAAAAHUGVuZGluZwAAAAAAAAAAAAAAAAlTdWJtaXR0ZWQAAAAAAAAAAAAAAAAAAAhBcHByb3ZlZAAAAAAAAAAAAAAACFJlamVjdGVkAAAAAAAAAAAAAAAHU2xhc2hlZAAAAAAAAAAAAAAAAAlTdHJlYW1pbmcAAAA=",
        "AAAAAAAAAAAAAAAKZ2V0X3N0cmVhbQAAAAAAAQAAAAAAAAAMbWlsZXN0b25lX2lkAAAABAAAAAEAAAPoAAAH0AAAAAZTdHJlYW0AAA==",
        "AAAAAAAAAEZHcmFudG9yIGNhbmNlbHMgYW5kIHJlY2xhaW1zIGFsbCB1bnNwZW50IFVTREMgKGBHcmFudEVzY3Jvdy5zb2w6NDg2YCkuAAAAAAAMY2FuY2VsX2dyYW50AAAAAQAAAAAAAAAHZ3JhbnRvcgAAAAATAAAAAQAAA+kAAAACAAAAAw==",
        "AAAAAAAAAAAAAAAMaXNfY2FuY2VsbGVkAAAAAAAAAAEAAAAB",
        "AAAAAAAAAAAAAAANX19jb25zdHJ1Y3RvcgAAAAAAAAsAAAAAAAAABHVzZGMAAAATAAAAAAAAAAhyZWdpc3RyeQAAABMAAAAAAAAACHNlbnRpbmVsAAAAEwAAAAAAAAAIdmVyaWZpZXIAAAATAAAAAAAAAAdncmFudG9yAAAAABMAAAAAAAAAB2dyYW50ZWUAAAAAEwAAAAAAAAAMaXNfc3RyZWFtaW5nAAAAAQAAAAAAAAAJY29tbWl0dGVlAAAAAAAD6gAAABMAAAAAAAAABnF1b3J1bQAAAAAABAAAAAAAAAAKbWlsZXN0b25lcwAAAAAD6gAAB9AAAAAOTWlsZXN0b25lSW5wdXQAAAAAAAAAAAAIZ3JhbnRfaWQAAAPuAAAAIAAAAAEAAAPpAAAAAgAAAAM=",
        "AAAAAAAAAAAAAAAOZ2V0X21pbGVzdG9uZXMAAAAAAAAAAAABAAAD6gAAB9AAAAAJTWlsZXN0b25lAAAA",
        "AAAAAAAAAAAAAAAOZ2V0X3N1Ym1pc3Npb24AAAAAAAEAAAAAAAAADG1pbGVzdG9uZV9pZAAAAAQAAAABAAAD6AAAB9AAAAAKU3VibWlzc2lvbgAA",
        "AAAAAAAAAEBTbGFzaCBhbiBvdmVyZHVlLCB1bmRlbGl2ZXJlZCBtaWxlc3RvbmUgKGBHcmFudEVzY3Jvdy5zb2w6NDQyYCkuAAAAD3NsYXNoX21pbGVzdG9uZQAAAAACAAAAAAAAAAV2b3RlcgAAAAAAABMAAAAAAAAADG1pbGVzdG9uZV9pZAAAAAQAAAABAAAD6QAAAAIAAAAD",
        "AAAAAAAAAIhHcmFudGVlIHdpdGhkcmF3cyB0aGUgdmVzdGVkIHBvcnRpb24gb2YgYSBzdHJlYW1pbmcgbWlsZXN0b25lLiBMaW5lYXIsCmNsaWZmLWZyZWUgb3ZlciBgU1RSRUFNX0RVUkFUSU9OX1NFQ1NgIChvdXIgU2FibGllciByZXBsYWNlbWVudCkuAAAAD3dpdGhkcmF3X3N0cmVhbQAAAAACAAAAAAAAAAdncmFudGVlAAAAABMAAAAAAAAADG1pbGVzdG9uZV9pZAAAAAQAAAABAAAD6QAAAAsAAAAD",
        "AAAAAAAAAGBDb21taXR0ZWUgcmVqZWN0aW9uOyBlbm91Z2ggcmVqZWN0aW9ucyByZXR1cm5zIHRoZSBtaWxlc3RvbmUgdG8gUGVuZGluZwooYEdyYW50RXNjcm93LnNvbDo0MTVgKS4AAAAQcmVqZWN0X21pbGVzdG9uZQAAAAIAAAAAAAAABXZvdGVyAAAAAAAAEwAAAAAAAAAMbWlsZXN0b25lX2lkAAAABAAAAAEAAAPpAAAAAgAAAAM=",
        "AAAAAAAAAERCdWlsZGVyIHN1Ym1pdHMgYSBtaWxlc3RvbmUgd2l0aCBhIFpLIHByb29mIChgR3JhbnRFc2Nyb3cuc29sOjI5N2ApLgAAABBzdWJtaXRfbWlsZXN0b25lAAAABQAAAAAAAAAHZ3JhbnRlZQAAAAATAAAAAAAAAAxtaWxlc3RvbmVfaWQAAAAEAAAAAAAAAAVwcm9vZgAAAAAAAA4AAAAAAAAADXB1YmxpY19pbnB1dHMAAAAAAAAOAAAAAAAAAA9idWlsZGVyX3N1bW1hcnkAAAAAEAAAAAEAAAPpAAAAAgAAAAM=",
        "AAAAAAAAAFdDb21taXR0ZWUgYXBwcm92YWw7IG9uIHF1b3J1bSBwYXlzIGx1bXAtc3VtIG9yIHN0YXJ0cyBhIHN0cmVhbQooYEdyYW50RXNjcm93LnNvbDozNjJgKS4AAAAAEWFwcHJvdmVfbWlsZXN0b25lAAAAAAAAAgAAAAAAAAAFdm90ZXIAAAAAAAATAAAAAAAAAAxtaWxlc3RvbmVfaWQAAAAEAAAAAQAAA+kAAAACAAAAAw==",
        "AAAAAAAAAAAAAAAUZ2V0X21pbGVzdG9uZV9zdGF0dXMAAAABAAAAAAAAAAxtaWxlc3RvbmVfaWQAAAAEAAAAAQAAA+gAAAfQAAAADk1pbGVzdG9uZVN0YXRlAAA=" ]),
      options
    )
  }
  public readonly fromJSON = {
    get_grant: this.txFromJSON<Config>,
        get_stream: this.txFromJSON<Option<Stream>>,
        cancel_grant: this.txFromJSON<Result<void>>,
        is_cancelled: this.txFromJSON<boolean>,
        get_milestones: this.txFromJSON<Array<Milestone>>,
        get_submission: this.txFromJSON<Option<Submission>>,
        slash_milestone: this.txFromJSON<Result<void>>,
        withdraw_stream: this.txFromJSON<Result<i128>>,
        reject_milestone: this.txFromJSON<Result<void>>,
        submit_milestone: this.txFromJSON<Result<void>>,
        approve_milestone: this.txFromJSON<Result<void>>,
        get_milestone_status: this.txFromJSON<Option<MilestoneState>>
  }
}