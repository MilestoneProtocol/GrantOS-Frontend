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
    contractId: "CDNFJMSQHIG772WUGQQEA6LCRUWZ3S3FDZVYJ6DXV7BQQWSMXH4AUL73",
  }
} as const

export const Errors = {
  1: {message:"NoMilestones"}
}

export type DataKey = {tag: "EscrowWasmHash", values: void} | {tag: "Usdc", values: void} | {tag: "Registry", values: void} | {tag: "Sentinel", values: void} | {tag: "Verifier", values: void} | {tag: "GrantCount", values: void} | {tag: "Grant", values: readonly [u32]};


export interface GrantInfo {
  escrow: string;
  grantee: string;
  grantor: string;
  total: i128;
}

export type ProofType = {tag: "ZkGithub", values: void} | {tag: "EasOnly", values: void};


export interface MilestoneInput {
  amount: i128;
  deadline: u64;
  description: string;
  proof_type: ProofType;
  title: string;
}

export interface Client {
  /**
   * Construct and simulate a grant transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  grant: ({grant_id}: {grant_id: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Option<GrantInfo>>>

  /**
   * Construct and simulate a grant_count transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  grant_count: (options?: MethodOptions) => Promise<AssembledTransaction<u32>>

  /**
   * Construct and simulate a create_grant transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Create + fund a grant. Returns `(grant_id, escrow_address)`.
   * The grantor authorizes both this call and the USDC transfer into escrow.
   */
  create_grant: ({grantor, grantee, streaming, committee, quorum, milestones}: {grantor: string, grantee: string, streaming: boolean, committee: Array<string>, quorum: u32, milestones: Array<MilestoneInput>}, options?: MethodOptions) => Promise<AssembledTransaction<Result<readonly [u32, string]>>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
        /** Constructor/Initialization Args for the contract's `__constructor` method */
        {escrow_wasm_hash, usdc, registry, sentinel, verifier}: {escrow_wasm_hash: Buffer, usdc: string, registry: string, sentinel: string, verifier: string},
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
    return ContractClient.deploy({escrow_wasm_hash, usdc, registry, sentinel, verifier}, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAAAQAAAAAAAAAMTm9NaWxlc3RvbmVzAAAAAQ==",
        "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAABwAAAAAAAAAAAAAADkVzY3Jvd1dhc21IYXNoAAAAAAAAAAAAAAAAAARVc2RjAAAAAAAAAAAAAAAIUmVnaXN0cnkAAAAAAAAAAAAAAAhTZW50aW5lbAAAAAAAAAAAAAAACFZlcmlmaWVyAAAAAAAAAAAAAAAKR3JhbnRDb3VudAAAAAAAAQAAAAAAAAAFR3JhbnQAAAAAAAABAAAABA==",
        "AAAAAQAAAAAAAAAAAAAACUdyYW50SW5mbwAAAAAAAAQAAAAAAAAABmVzY3JvdwAAAAAAEwAAAAAAAAAHZ3JhbnRlZQAAAAATAAAAAAAAAAdncmFudG9yAAAAABMAAAAAAAAABXRvdGFsAAAAAAAACw==",
        "AAAAAgAAAAAAAAAAAAAACVByb29mVHlwZQAAAAAAAAIAAAAAAAAAAAAAAAhaa0dpdGh1YgAAAAAAAAAAAAAAB0Vhc09ubHkA",
        "AAAAAAAAAAAAAAAFZ3JhbnQAAAAAAAABAAAAAAAAAAhncmFudF9pZAAAAAQAAAABAAAD6AAAB9AAAAAJR3JhbnRJbmZvAAAA",
        "AAAAAQAAAAAAAAAAAAAADk1pbGVzdG9uZUlucHV0AAAAAAAFAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAAAAAACGRlYWRsaW5lAAAABgAAAAAAAAALZGVzY3JpcHRpb24AAAAAEAAAAAAAAAAKcHJvb2ZfdHlwZQAAAAAH0AAAAAlQcm9vZlR5cGUAAAAAAAAAAAAABXRpdGxlAAAAAAAAEA==",
        "AAAAAAAAAAAAAAALZ3JhbnRfY291bnQAAAAAAAAAAAEAAAAE",
        "AAAAAAAAAIVDcmVhdGUgKyBmdW5kIGEgZ3JhbnQuIFJldHVybnMgYChncmFudF9pZCwgZXNjcm93X2FkZHJlc3MpYC4KVGhlIGdyYW50b3IgYXV0aG9yaXplcyBib3RoIHRoaXMgY2FsbCBhbmQgdGhlIFVTREMgdHJhbnNmZXIgaW50byBlc2Nyb3cuAAAAAAAADGNyZWF0ZV9ncmFudAAAAAYAAAAAAAAAB2dyYW50b3IAAAAAEwAAAAAAAAAHZ3JhbnRlZQAAAAATAAAAAAAAAAlzdHJlYW1pbmcAAAAAAAABAAAAAAAAAAljb21taXR0ZWUAAAAAAAPqAAAAEwAAAAAAAAAGcXVvcnVtAAAAAAAEAAAAAAAAAAptaWxlc3RvbmVzAAAAAAPqAAAH0AAAAA5NaWxlc3RvbmVJbnB1dAAAAAAAAQAAA+kAAAPtAAAAAgAAAAQAAAATAAAAAw==",
        "AAAAAAAAAAAAAAANX19jb25zdHJ1Y3RvcgAAAAAAAAUAAAAAAAAAEGVzY3Jvd193YXNtX2hhc2gAAAPuAAAAIAAAAAAAAAAEdXNkYwAAABMAAAAAAAAACHJlZ2lzdHJ5AAAAEwAAAAAAAAAIc2VudGluZWwAAAATAAAAAAAAAAh2ZXJpZmllcgAAABMAAAAA" ]),
      options
    )
  }
  public readonly fromJSON = {
    grant: this.txFromJSON<Option<GrantInfo>>,
        grant_count: this.txFromJSON<u32>,
        create_grant: this.txFromJSON<Result<readonly [u32, string]>>
  }
}