import process from 'node:process';
import console from 'node:console';
import 'dotenv/config';
const checks=[['HTTPS frontend',process.env.FRONTEND_URL?.startsWith('https://')],['HTTPS API',process.env.BACKEND_URL?.startsWith('https://')],['SMTP selected',process.env.EMAIL_MODE==='smtp'],['SMTP host',!!process.env.EMAIL_HOST],['Non-placeholder sender',!!process.env.EMAIL_FROM&&!process.env.EMAIL_FROM.includes('example.com')],['Persistent S3 storage',process.env.STORAGE_PROVIDER==='s3'&&!!process.env.S3_BUCKET],['Production mode',process.env.NODE_ENV==='production']];
for(const [name,ok] of checks)console.log(`${ok?'PASS':'NEEDS SETUP'}: ${name}`);
console.log('Also verify: database backup restoration, provider monitoring, domain DNS, sender-domain authentication and a two-player tournament walkthrough.');
if(checks.some(([,ok])=>!ok))process.exitCode=1;

