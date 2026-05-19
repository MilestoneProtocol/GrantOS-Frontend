const { createPublicClient, http } = require('viem');
const { arbitrumSepolia } = require('viem/chains');

async function main() {
  const client = createPublicClient({
    chain: arbitrumSepolia,
    transport: http('https://sepolia-rollup.arbitrum.io/rpc'),
  });

  const txHash = '0xda8c92ee8a00f6780090d28a6473639dd84fe439c1daa3e2b5f174e6f79696a0';
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

  const proof = decoded.args[0];
  const proofBytesLength = (proof.length - 2) / 2; // Hex string to byte length
  console.log('Proof hex length:', proof.length);
  console.log('Proof size in bytes:', proofBytesLength);
}

main().catch(console.error);
