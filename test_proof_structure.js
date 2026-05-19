const { createPublicClient, http } = require('viem');
const { arbitrumSepolia } = require('viem/chains');

async function main() {
  const client = createPublicClient({
    chain: arbitrumSepolia,
    transport: http('https://sepolia-rollup.arbitrum.io/rpc'),
  });

  const txHash = '0x7cd6bf4d61c3dfc7e524509dae6d4166d8950197f1f7c1942262df41905cbaf6';
  const tx = await client.getTransaction({ hash: txHash });

  const abi = [{
    name: 'verifyIdentity',
    type: 'function',
    inputs: [
      { name: 'proof', type: 'bytes' },
      { name: 'publicInputs', type: 'bytes32[]' },
      { name: 'githubHandle', type: 'string' }
    ]
  }];

  const { decodeFunctionData } = require('viem');
  const decoded = decodeFunctionData({
    abi,
    data: tx.input,
  });

  const proofHex = decoded.args[0];
  const clean = proofHex.startsWith('0x') ? proofHex.slice(2) : proofHex;
  const proof = Buffer.from(clean, 'hex');
  console.log('Total bytes:', proof.length);

  // Run the check locally
  const checkPoints = 4;
  const sectionSize = Math.floor(proof.length / checkPoints);

  for (let i = 0; i < checkPoints; i++) {
    const offset = i * sectionSize;
    let hasNonZero = false;
    const checkLength = offset + 32 <= proof.length ? 32 : proof.length - offset;

    const checkedBytes = [];
    for (let j = 0; j < checkLength; j++) {
      const byte = proof[offset + j];
      checkedBytes.push(byte.toString(16).padStart(2, '0'));
      if (byte !== 0) {
        hasNonZero = true;
      }
    }

    console.log(`Section ${i}: offset=${offset}, length=${checkLength}, hasNonZero=${hasNonZero}`);
    console.log(`Bytes: ${checkedBytes.join(' ')}`);
  }
}

main().catch(console.error);
