const { execSync } = require('child_process');

console.log('\n  PyGen AI — Setup\n');

function run(cmd) {
  try { execSync(cmd, { stdio: 'inherit', timeout: 180000, cwd: __dirname }); return true; }
  catch { return false; }
}

console.log('[Setup] prisma generate...');
if (!run('npx prisma generate')) { process.exit(1); }
console.log('[Setup] ✓ Done\n');
