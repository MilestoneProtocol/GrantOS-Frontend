const { createPublicClient, http } = require('viem');
const { arbitrumSepolia } = require('viem/chains');

const factoryAbi = [
  {
    name: 'grantCount',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }]
  }
];

async function main() {
  const client = createPublicClient({
    chain: arbitrumSepolia,
    transport: http('https://sepolia-rollup.arbitrum.io/rpc'),
  });

  const factoryAddress = '0x2A82714B82b0D00Ef16e10705462fA6ad1FD0a2D';
  const count = await client.readContract({
    address: factoryAddress,
    abi: factoryAbi,
    functionName: 'grantCount',
  });

  console.log('On-chain grantCount:', count.toString());
}

main().catch(console.error);
