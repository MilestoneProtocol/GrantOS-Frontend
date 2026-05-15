// lib/zk/prover.ts
//
// Changes from v1:
//   C3 FIX: wallet_address_hi / wallet_address_lo added as public inputs to
//     the circuit — the proof is now cryptographically bound to the initiating wallet.
//   M1 FIX: circuit.json integrity verified against a SHA-256 hash pinned at
//     build time via NEXT_PUBLIC_ZK_CIRCUIT_HASH env var before proof generation.
//   STABILITY FIX: Dynamic imports for Barretenberg to avoid Turbopack/Next.js init issues.
//   TIMEOUT FIX: Increased timeout and added detailed init logging.

export interface ProveInputs {
  signature:          number[];
  message_hash:       number[];
  github_id:          string;
  github_created_year: string;
  commits:            number;
  stars:              number;
  events:             number;
  wallet_address_hi:  string;
  wallet_address_lo:  string;
}

import { Barretenberg, BackendType, UltraHonkBackend } from '../../node_modules/@aztec/bb.js/dest/browser/index.js';
import { Noir } from '@noir-lang/noir_js';

// Singleton backend — reuse across calls to avoid re-initialising WASM
let backendPromise: Promise<any> | null = null;
let cachedBytecode: string | null = null;

async function getBackend(bytecode: string) {
  // Invalidate if circuit changed
  if (cachedBytecode !== bytecode) {
    backendPromise = null;
    cachedBytecode = bytecode;
  }
  if (!backendPromise) {
    backendPromise = (async () => {
      try {
        const hasSAB = typeof SharedArrayBuffer !== 'undefined';
        const threads = hasSAB
          ? Math.min(typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : 1, 4)
          : 1;

        // bb.js v4.2.1 API: Barretenberg.new() takes BackendOptions object.
        // When SharedArrayBuffer is unavailable (COOP != same-origin, e.g. for
        // wallet popups), we MUST force the plain Wasm backend. The default
        // fallback order tries WasmWorker first, which hangs without SAB.
        const backendType = hasSAB ? BackendType.WasmWorker : BackendType.Wasm;
        console.log(`[ZK] Initializing Barretenberg (${threads} thread(s), backend=${backendType}, SAB=${hasSAB})...`);

        const api = await Barretenberg.new({
          threads,
          backend: backendType,
        });
        console.log('[ZK] Barretenberg ready ✓');
        return new UltraHonkBackend(bytecode, api);
      } catch (e) {
        backendPromise = null;
        throw e;
      }
    })();
  }
  return backendPromise;
}

// ── Validation helpers ────────────────────────────────────────────────────────

function assertFixedBytes(name: string, value: number[], expectedLength: number): number[] {
  if (value.length !== expectedLength) {
    throw new Error(`${name} must be exactly ${expectedLength} bytes, got ${value.length}`);
  }
  return value.map((byte, i) => {
    if (!Number.isInteger(byte) || byte < 0 || byte > 255) {
      throw new Error(`${name}[${i}] is not a valid byte (got ${byte})`);
    }
    return byte;
  });
}

function assertU32(name: string, value: number): number {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) {
    throw new Error(`${name} must be an unsigned 32-bit integer (got ${value})`);
  }
  return value;
}

function assertFieldScalar(name: string, value: string | number | bigint): string {
  const text = value.toString().trim();
  if (!/^\d+$/.test(text)) throw new Error(`${name} must be a non-negative integer string`);
  return text;
}

// ── secp256k1 low-s normalisation ────────────────────────────────────────────

const SECP256K1_N = BigInt(
  '0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141'
);
const SECP256K1_HALF_N = SECP256K1_N / BigInt(2);

function bytesToBigInt(bytes: number[]): bigint {
  return BigInt('0x' + bytes.map(b => b.toString(16).padStart(2, '0')).join(''));
}

function bigIntTo32Bytes(value: bigint): number[] {
  const hex = value.toString(16).padStart(64, '0');
  const bytes: number[] = [];
  for (let i = 0; i < 64; i += 2) bytes.push(parseInt(hex.slice(i, i + 2), 16));
  return bytes;
}

function sanitizeSignatureForNoir(signature: number[]): number[] {
  const normalized = [...signature];
  let s = bytesToBigInt(normalized.slice(32, 64));
  if (s >= SECP256K1_N && (normalized[32] & 0x80) !== 0) {
    normalized[32] &= 0x7f;
    s = bytesToBigInt(normalized.slice(32, 64));
  }
  const r = bytesToBigInt(normalized.slice(0, 32));
  if (r <= BigInt(0) || r >= SECP256K1_N) throw new Error('signature r is out of secp256k1 range');
  if (s <= BigInt(0) || s >= SECP256K1_N) throw new Error('signature s is out of secp256k1 range');
  if (s > SECP256K1_HALF_N) {
    const normS = SECP256K1_N - s;
    normalized.splice(32, 32, ...bigIntTo32Bytes(normS));
  }
  return normalized;
}

// ── Circuit artifact integrity check ─────────────────────────────────

async function fetchAndVerifyCircuit(): Promise<{ bytecode: string }> {
  console.log('[ZK] Fetching circuit.json...');
  const response = await fetch(`/circuit.json?v=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Failed to fetch circuit.json: ${response.status}`);
  const circuit = (await response.json()) as { bytecode: string };
  if (!circuit.bytecode) throw new Error('circuit.json missing bytecode field');

  const expectedHash = process.env.NEXT_PUBLIC_ZK_CIRCUIT_HASH;
  if (expectedHash) {
    const encoder   = new TextEncoder();
    const data      = encoder.encode(circuit.bytecode);
    const hashBuf   = await crypto.subtle.digest('SHA-256', data);
    const hashHex   = '0x' + Array.from(new Uint8Array(hashBuf))
      .map(b => b.toString(16).padStart(2, '0')).join('');

    if (hashHex !== expectedHash.toLowerCase()) {
      throw new Error(`Circuit artifact integrity check FAILED.`);
    }
    console.log('[ZK] Circuit artifact integrity verified ✓');
  }
  return circuit;
}

// ── Main proof generation ─────────────────────────────────────────────────────

/** Call this early (e.g. on page mount) to warm up the WASM backend so proof
 *  generation feels instant when the user clicks the button. */
export async function warmupProver(): Promise<void> {
  try {
    const circuit = await fetchAndVerifyCircuit();
    await getBackend(circuit.bytecode);
  } catch {
    // Silently ignore — warmup is best-effort
  }
}

export async function generateProof(inputs: ProveInputs): Promise<
  | { success: true;  proof: Uint8Array; publicInputs: string[] }
  | { success: false; error: unknown }
> {
  const startTime = Date.now();
  try {
    const circuit = await fetchAndVerifyCircuit();

    console.log('[ZK] Initializing backend...');
    const backend = await getBackend(circuit.bytecode);

    console.log('[ZK] Creating Noir instance...');
    const noir = new Noir(circuit as any);

    const rawSignature   = assertFixedBytes('signature',     Array.from(inputs.signature), 64);
    const rawMessageHash = assertFixedBytes('message_hash',  Array.from(inputs.message_hash), 32);
    const signature      = sanitizeSignatureForNoir(rawSignature);

    const witnessInputs = {
      signature,
      message_hash:         rawMessageHash,
      commits:              assertU32('commits', inputs.commits),
      stars:                assertU32('stars',   inputs.stars),
      events:               assertU32('events',  inputs.events),
      github_id:            assertFieldScalar('github_id',            inputs.github_id),
      github_created_year:  assertFieldScalar('github_created_year',  inputs.github_created_year),
      wallet_address_hi:    assertFieldScalar('wallet_address_hi',    inputs.wallet_address_hi),
      wallet_address_lo:    assertFieldScalar('wallet_address_lo',    inputs.wallet_address_lo),
    };

    console.log('[ZK] Generating witness...');
    const { witness } = await noir.execute(witnessInputs);

    console.log('[ZK] Generating proof (UltraHonk)...');
    const proof = await backend.generateProof(witness);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[ZK] Proof generated successfully in ${duration}s ✓`);
    return { success: true, proof: proof.proof, publicInputs: proof.publicInputs };
  } catch (error) {
    console.error('[ZK] Proof generation failed:', error);
    return { success: false, error };
  }
}
