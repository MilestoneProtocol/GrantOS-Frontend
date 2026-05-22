const { secp256k1 } = require('ethereum-cryptography/secp256k1');

function main() {
  const privateKeyHex = '598c536dbcda4f5e33638b5d626bd98b771a7fc5be59c4f87a6c088e8d3f184c';
  const privateKey = Buffer.from(privateKeyHex, 'hex');
  
  const pubKey = secp256k1.getPublicKey(privateKey, false); // uncompressed
  
  // Uncompressed public key format is 0x04 || X (32 bytes) || Y (32 bytes)
  const x = Array.from(pubKey.slice(1, 33));
  const y = Array.from(pubKey.slice(33, 65));

  console.log('Derived Oracle PubKey Coordinates:');
  console.log('x:', JSON.stringify(x));
  console.log('y:', JSON.stringify(y));

  const hardcoded_x = [110, 7, 53, 10, 88, 38, 90, 166, 213, 99, 10, 179, 68, 179, 107, 109, 138, 180, 16, 29, 82, 102, 229, 134, 181, 248, 137, 250, 184, 119, 48, 88];
  const hardcoded_y = [13, 56, 187, 15, 188, 160, 220, 154, 229, 207, 122, 15, 178, 84, 33, 38, 184, 100, 170, 22, 26, 122, 191, 112, 141, 111, 120, 31, 122, 98, 17, 234];

  console.log('Matches X:', JSON.stringify(x) === JSON.stringify(hardcoded_x));
  console.log('Matches Y:', JSON.stringify(y) === JSON.stringify(hardcoded_y));
}

main();
