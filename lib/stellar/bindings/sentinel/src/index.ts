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
    contractId: "CBSZ2ETXILOE6TJY7XT5YQHG52NAGIIV44DFP3CJQGOVED6QUJYWVOZF",
  }
} as const

export const Errors = {
  1: {message:"NotOwner"},
  2: {message:"NotAuthorizedIssuer"},
  /**
   * A warning is already active and still within its lifetime (anti-reset).
   */
  3: {message:"ActiveWarningExists"},
  /**
   * Caller is neither the warning's issuer nor the owner.
   */
  4: {message:"NotIssuerOrOwner"},
  5: {message:"ZeroOwner"}
}

export type DataKey = {tag: "Owner", values: void} | {tag: "MaturitySecs", values: void} | {tag: "ExpirySecs", values: void} | {tag: "AuthorizedIssuers", values: void} | {tag: "Warning", values: readonly [Buffer, u32]};


export interface Warning {
  active: boolean;
  issuer: string;
  /**
 * keccak/sha hash of the human warning message (auditability; 0 if none).
 */
msg_hash: Buffer;
  timestamp: u64;
}

export interface Client {
  /**
   * Construct and simulate a windows transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  windows: (options?: MethodOptions) => Promise<AssembledTransaction<readonly [u64, u64]>>

  /**
   * Construct and simulate a issue_warning transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Plant a warning for `(grant_id, milestone_index)`. Authorized issuers only.
   * Anti-reset: refuses if a warning is still active and younger than expiry,
   * so a fresh issuance cannot keep pushing a maturing warning back below the
   * maturity threshold and block slashing forever (`SentinelEAS.sol:107-108`).
   */
  issue_warning: ({issuer, grant_id, milestone_index, msg_hash}: {issuer: string, grant_id: Buffer, milestone_index: u32, msg_hash: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a owner_address transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  owner_address: (options?: MethodOptions) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a get_warning_age transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Age in seconds of an active warning, else 0.
   */
  get_warning_age: ({grant_id, milestone_index}: {grant_id: Buffer, milestone_index: u32}, options?: MethodOptions) => Promise<AssembledTransaction<u64>>

  /**
   * Construct and simulate a has_valid_warning transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * True iff an active warning exists and `maturity <= age < expiry`.
   * This is the gate `grant_escrow.slash_milestone` checks.
   */
  has_valid_warning: ({grant_id, milestone_index}: {grant_id: Buffer, milestone_index: u32}, options?: MethodOptions) => Promise<AssembledTransaction<boolean>>

  /**
   * Construct and simulate a deactivate_warning transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Deactivate a warning. Only the original issuer or the owner — so a grantee
   * cannot neutralize the warning gating their overdue milestone.
   */
  deactivate_warning: ({caller, grant_id, milestone_index}: {caller: string, grant_id: Buffer, milestone_index: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a transfer_ownership transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  transfer_ownership: ({new_owner}: {new_owner: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a set_authorized_issuer transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Grant or revoke an address's ability to issue warnings. Owner only.
   */
  set_authorized_issuer: ({issuer, allowed}: {issuer: string, allowed: boolean}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
        /** Constructor/Initialization Args for the contract's `__constructor` method */
        {owner, maturity_secs, expiry_secs}: {owner: string, maturity_secs: u64, expiry_secs: u64},
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
    return ContractClient.deploy({owner, maturity_secs, expiry_secs}, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAABQAAAAAAAAAITm90T3duZXIAAAABAAAAAAAAABNOb3RBdXRob3JpemVkSXNzdWVyAAAAAAIAAABHQSB3YXJuaW5nIGlzIGFscmVhZHkgYWN0aXZlIGFuZCBzdGlsbCB3aXRoaW4gaXRzIGxpZmV0aW1lIChhbnRpLXJlc2V0KS4AAAAAE0FjdGl2ZVdhcm5pbmdFeGlzdHMAAAAAAwAAADVDYWxsZXIgaXMgbmVpdGhlciB0aGUgd2FybmluZydzIGlzc3VlciBub3IgdGhlIG93bmVyLgAAAAAAABBOb3RJc3N1ZXJPck93bmVyAAAABAAAAAAAAAAJWmVyb093bmVyAAAAAAAABQ==",
        "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAABQAAAAAAAAAAAAAABU93bmVyAAAAAAAAAAAAAAAAAAAMTWF0dXJpdHlTZWNzAAAAAAAAAAAAAAAKRXhwaXJ5U2VjcwAAAAAAAAAAAAAAAAARQXV0aG9yaXplZElzc3VlcnMAAAAAAAABAAAAJihncmFudF9pZCwgbWlsZXN0b25lX2luZGV4KSAtPiBXYXJuaW5nAAAAAAAHV2FybmluZwAAAAACAAAD7gAAACAAAAAE",
        "AAAAAQAAAAAAAAAAAAAAB1dhcm5pbmcAAAAABAAAAAAAAAAGYWN0aXZlAAAAAAABAAAAAAAAAAZpc3N1ZXIAAAAAABMAAABHa2VjY2FrL3NoYSBoYXNoIG9mIHRoZSBodW1hbiB3YXJuaW5nIG1lc3NhZ2UgKGF1ZGl0YWJpbGl0eTsgMCBpZiBub25lKS4AAAAACG1zZ19oYXNoAAAD7gAAACAAAAAAAAAACXRpbWVzdGFtcAAAAAAAAAY=",
        "AAAAAAAAAAAAAAAHd2luZG93cwAAAAAAAAAAAQAAA+0AAAACAAAABgAAAAY=",
        "AAAAAAAAAHxgbWF0dXJpdHlfc2Vjc2AgLyBgZXhwaXJ5X3NlY3NgOiB3YXJuaW5nIGlzIHZhbGlkIGZvciBzbGFzaGluZyB3aGVuCmBtYXR1cml0eV9zZWNzIDw9IGFnZSA8IGV4cGlyeV9zZWNzYC4gRVZNIHVzZWQgMjRoIC8gN2QuAAAADV9fY29uc3RydWN0b3IAAAAAAAADAAAAAAAAAAVvd25lcgAAAAAAABMAAAAAAAAADW1hdHVyaXR5X3NlY3MAAAAAAAAGAAAAAAAAAAtleHBpcnlfc2VjcwAAAAAGAAAAAA==",
        "AAAAAAAAASpQbGFudCBhIHdhcm5pbmcgZm9yIGAoZ3JhbnRfaWQsIG1pbGVzdG9uZV9pbmRleClgLiBBdXRob3JpemVkIGlzc3VlcnMgb25seS4KQW50aS1yZXNldDogcmVmdXNlcyBpZiBhIHdhcm5pbmcgaXMgc3RpbGwgYWN0aXZlIGFuZCB5b3VuZ2VyIHRoYW4gZXhwaXJ5LApzbyBhIGZyZXNoIGlzc3VhbmNlIGNhbm5vdCBrZWVwIHB1c2hpbmcgYSBtYXR1cmluZyB3YXJuaW5nIGJhY2sgYmVsb3cgdGhlCm1hdHVyaXR5IHRocmVzaG9sZCBhbmQgYmxvY2sgc2xhc2hpbmcgZm9yZXZlciAoYFNlbnRpbmVsRUFTLnNvbDoxMDctMTA4YCkuAAAAAAANaXNzdWVfd2FybmluZwAAAAAAAAQAAAAAAAAABmlzc3VlcgAAAAAAEwAAAAAAAAAIZ3JhbnRfaWQAAAPuAAAAIAAAAAAAAAAPbWlsZXN0b25lX2luZGV4AAAAAAQAAAAAAAAACG1zZ19oYXNoAAAD7gAAACAAAAABAAAD6QAAAAIAAAAD",
        "AAAAAAAAAAAAAAANb3duZXJfYWRkcmVzcwAAAAAAAAAAAAABAAAAEw==",
        "AAAAAAAAACxBZ2UgaW4gc2Vjb25kcyBvZiBhbiBhY3RpdmUgd2FybmluZywgZWxzZSAwLgAAAA9nZXRfd2FybmluZ19hZ2UAAAAAAgAAAAAAAAAIZ3JhbnRfaWQAAAPuAAAAIAAAAAAAAAAPbWlsZXN0b25lX2luZGV4AAAAAAQAAAABAAAABg==",
        "AAAAAAAAAHlUcnVlIGlmZiBhbiBhY3RpdmUgd2FybmluZyBleGlzdHMgYW5kIGBtYXR1cml0eSA8PSBhZ2UgPCBleHBpcnlgLgpUaGlzIGlzIHRoZSBnYXRlIGBncmFudF9lc2Nyb3cuc2xhc2hfbWlsZXN0b25lYCBjaGVja3MuAAAAAAAAEWhhc192YWxpZF93YXJuaW5nAAAAAAAAAgAAAAAAAAAIZ3JhbnRfaWQAAAPuAAAAIAAAAAAAAAAPbWlsZXN0b25lX2luZGV4AAAAAAQAAAABAAAAAQ==",
        "AAAAAAAAAIpEZWFjdGl2YXRlIGEgd2FybmluZy4gT25seSB0aGUgb3JpZ2luYWwgaXNzdWVyIG9yIHRoZSBvd25lciDigJQgc28gYSBncmFudGVlCmNhbm5vdCBuZXV0cmFsaXplIHRoZSB3YXJuaW5nIGdhdGluZyB0aGVpciBvdmVyZHVlIG1pbGVzdG9uZS4AAAAAABJkZWFjdGl2YXRlX3dhcm5pbmcAAAAAAAMAAAAAAAAABmNhbGxlcgAAAAAAEwAAAAAAAAAIZ3JhbnRfaWQAAAPuAAAAIAAAAAAAAAAPbWlsZXN0b25lX2luZGV4AAAAAAQAAAABAAAD6QAAAAIAAAAD",
        "AAAAAAAAAAAAAAASdHJhbnNmZXJfb3duZXJzaGlwAAAAAAABAAAAAAAAAAluZXdfb3duZXIAAAAAAAATAAAAAQAAA+kAAAACAAAAAw==",
        "AAAAAAAAAENHcmFudCBvciByZXZva2UgYW4gYWRkcmVzcydzIGFiaWxpdHkgdG8gaXNzdWUgd2FybmluZ3MuIE93bmVyIG9ubHkuAAAAABVzZXRfYXV0aG9yaXplZF9pc3N1ZXIAAAAAAAACAAAAAAAAAAZpc3N1ZXIAAAAAABMAAAAAAAAAB2FsbG93ZWQAAAAAAQAAAAEAAAPpAAAAAgAAAAM=" ]),
      options
    )
  }
  public readonly fromJSON = {
    windows: this.txFromJSON<readonly [u64, u64]>,
        issue_warning: this.txFromJSON<Result<void>>,
        owner_address: this.txFromJSON<string>,
        get_warning_age: this.txFromJSON<u64>,
        has_valid_warning: this.txFromJSON<boolean>,
        deactivate_warning: this.txFromJSON<Result<void>>,
        transfer_ownership: this.txFromJSON<Result<void>>,
        set_authorized_issuer: this.txFromJSON<Result<void>>
  }
}