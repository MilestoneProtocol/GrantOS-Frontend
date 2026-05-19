const fs = require('fs');

const files = [
  'app/(builder)/builders/[address]/page.tsx',
  'app/(committee)/committee/page.tsx',
  'app/(dao)/dao/page.tsx',
  'app/(grants)/grants/[id]/page.tsx',
  'app/(grants)/grants/page.tsx',
  'components/builder/milestone-submit/OnchainSubmitStep.tsx',
  'demo/committee-demo.ts',
  'lib/builder-profile-server.ts',
  'lib/notifications.ts',
  'lib/roleDetection.ts',
  'lib/wagmi.ts'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let lines = content.split('\n');
  let newLines = [];
  let inBase = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('<<<<<<< ')) {
      inBase = false;
    } else if (line.startsWith('||||||| ')) {
      inBase = true;
    } else if (line.startsWith('=======')) {
      inBase = false;
    } else if (line.startsWith('>>>>>>> ')) {
      inBase = false;
    } else {
      if (!inBase) {
        newLines.push(line);
      }
    }
  }
  fs.writeFileSync(file, newLines.join('\n'));
  console.log(`Processed ${file}`);
}
