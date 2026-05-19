const { createPublicClient, http } = require('viem');
const { arbitrumSepolia } = require('viem/chains');

const client = createPublicClient({
  chain: arbitrumSepolia,
  transport: http('https://sepolia-rollup.arbitrum.io/rpc')
});

const ABI = [{"inputs":[{"internalType":"uint256","name":"_milestoneId","type":"uint256"}],"name":"getMilestoneStatus","outputs":[{"internalType":"enum GrantEscrow.MilestoneState","name":"","type":"uint8"}],"stateMutability":"view","type":"function"}];

async function main() {
  const status = await client.readContract({
    address: '0x6A377A751CB9c108cc71542aE033c9c374FC8FDd',
    abi: ABI,
    functionName: 'getMilestoneStatus',
    args: [0n],
  });
  console.log("Status from SC:", status);
}
main();
