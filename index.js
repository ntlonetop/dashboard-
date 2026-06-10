import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// تم كتابة هذا الملف بلغة جافا سكريبت بالكامل (Node.js/JavaScript)
// هذا هو الملف الرئيسي لتشغيل البوت ولوحة التحكم الخاصة بك

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const productionPath = path.join(__dirname, 'dist', 'server.cjs');

if (fs.existsSync(productionPath)) {
  console.log('-------------------------------------------');
  console.log('[جافا سكريبت] بدء تشغيل السيرفر المجمّع من: dist/server.cjs...');
  console.log('-------------------------------------------');
  await import('./dist/server.cjs');
} else {
  console.log('-------------------------------------------');
  console.log('[جافا سكريبت] سيرفر الإنتاج غير جاهز. جاري تشغيل TypeScript على الهواء مباشرة باستخدام tsx...');
  console.log('-------------------------------------------');
  try {
    const { spawn } = await import('child_process');
    const child = spawn('npx', ['tsx', 'server.js'], { stdio: 'inherit', shell: true });
    
    child.on('exit', (code) => {
      process.exit(code || 0);
    });
  } catch (err) {
    console.error('فشل في تشغيل ملف TypeScript المباشر:', err);
    console.error('الرجاء كتابة "npm run build" لتجميع المشروع وإنتاج dist/server.cjs أولاً.');
    process.exit(1);
  }
}

