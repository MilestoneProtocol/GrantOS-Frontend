const { createPublicClient, http } = require('viem');
const { arbitrumSepolia } = require('viem/chains');

async function main() {
  const client = createPublicClient({
    chain: arbitrumSepolia,
    transport: http('https://sepolia-rollup.arbitrum.io/rpc'),
  });

  const registryAddress = '0x2514f05A498cb3452abeC1a3f8d5A07412A6C4Ad';
  const abi = [{
    name: 'verifier',
    type: 'function',
    inputs: [],
    outputs: [{ type: 'address' }]
  }];

  const verifier = await client.readContract({
    address: registryAddress,
    abi,
    functionName: 'verifier',
  });

  console.log('Verifier in registry contract:', verifier);
  console.log('NEXT_PUBLIC_VERIFIER_ADDRESS from .env:', '0x082029B163e9bBff7Bc4aeA46710041eDd8bb1a4');
}

main().catch(console.error);
