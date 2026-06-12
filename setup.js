const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('\n  PyGen AI — إعداد تلقائي\n');

// إنشاء مجلد db
const dbDir = path.join(__dirname, 'db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log('[Setup] ✓ مجلد db');
}

function run(cmd) {
  try {
    execSync(cmd, { stdio: 'inherit', timeout: 180000, cwd: __dirname });
    return true;
  } catch { return false; }
}

// دائماً شغّل prisma generate بدون تحقق
console.log('[Setup] تشغيل prisma generate...');
if (!run('npx prisma generate')) {
  console.error('[Setup] ✗ فشل — شغّل يدوياً: npx prisma generate');
  process.exit(1);
}
console.log('[Setup] ✓ Prisma Client جاهز');

// prisma db push
const dbFile = path.join(__dirname, 'db', 'custom.db');
if (!fs.existsSync(dbFile)) {
  console.log('[Setup] تشغيل prisma db push...');
  if (!run('npx prisma db push --skip-generate')) {
    console.error('[Setup] ✗ فشل — شغّل يدوياً: npx prisma db push');
    process.exit(1);
  }
  console.log('[Setup] ✓ قاعدة البيانات جاهزة');
} else {
  console.log('[Setup] ✓ قاعدة البيانات موجودة');
}

console.log('\n  ✅ جاهز!\n');
