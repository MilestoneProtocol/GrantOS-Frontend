const { createPublicClient, http, decodeErrorResult } = require('viem');
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
  const publicInputs = decoded.args[1];

  const verifierAddress = '0x082029B163e9bBff7Bc4aeA46710041eDd8bb1a4';
  const verifierAbi = [
    {
      name: 'verify',
      type: 'function',
      stateMutability: 'view',
      inputs: [
        { name: 'proof', type: 'bytes' },
        { name: 'publicInputs', type: 'bytes32[]' }
      ],
      outputs: [{ type: 'bool' }]
    },
    {
      type: 'error',
      name: 'InvalidProofSize',
      inputs: [{ name: 'size', type: 'uint256' }]
    },
    {
      type: 'error',
      name: 'InvalidPublicInputCount',
      inputs: [{ name: 'count', type: 'uint256' }]
    },
    {
      type: 'error',
      name: 'InvalidTier',
      inputs: [{ name: 'tier', type: 'uint256' }]
    },
    {
      type: 'error',
      name: 'InvalidGitHubYear',
      inputs: [{ name: 'year', type: 'uint256' }]
    },
    {
      type: 'error',
      name: 'InvalidWalletAddressHi',
      inputs: [{ name: 'hi', type: 'uint256' }]
    },
    {
      type: 'error',
      name: 'InvalidProofStructure',
      inputs: []
    }
  ];

  try {
    await client.readContract({
      address: verifierAddress,
      abi: verifierAbi,
      functionName: 'verify',
      args: [proof, publicInputs],
    });
    console.log('Verification succeeded in dry-run!');
  } catch (err) {
    console.log('Verification failed. Revert data:');
    if (err.data) {
      console.log('Error data:', err.data);
      try {
        const decodedError = decodeErrorResult({
          abi: verifierAbi,
          data: err.data,
        });
        console.log('Decoded custom error:', decodedError);
      } catch (decodeErr) {
        console.log('Could not decode error:', decodeErr.message);
      }
    } else {
      console.log('No direct error data, full error object:', err);
    }
  }
}

main().catch(console.error);
