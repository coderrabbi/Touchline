import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const root=process.cwd();mkdirSync('.local',{recursive:true});
const secret=()=>randomBytes(48).toString('hex');
if(!existsSync('apps/api/.env')){
 const dbPassword=secret(),adminPassword=secret();
 writeFileSync('.local/postgres-password',dbPassword+'\n',{mode:0o600});
 writeFileSync('.local/admin-credentials.txt',`Local-only seed account\nEmail: jordan@touchline.example\nPassword: ${adminPassword}\n`,{mode:0o600});
 writeFileSync('apps/api/.env',`NODE_ENV=development\nPORT=4100\nDATABASE_URL=postgresql://touchline:${dbPassword}@127.0.0.1:55432/touchline\nJWT_ACCESS_SECRET=${secret()}\nJWT_REFRESH_SECRET=${secret()}\nFRONTEND_URL=http://localhost:3100\nBACKEND_URL=http://localhost:4100\nEMAIL_MODE=development\nEMAIL_FROM=Touchline <noreply@touchline.example>\nDEV_INBOX_DIR=${JSON.stringify(path.join(root,'.local','mail').replaceAll('\\','/'))}\nSEED_ADMIN_PASSWORD=${adminPassword}\n`,{mode:0o600});
 console.log('Created private local API configuration and seed credentials.');
}else console.log('Existing API environment preserved.');
if(!existsSync('apps/web/.env.local'))writeFileSync('apps/web/.env.local','NEXT_PUBLIC_API_URL=http://localhost:4100/api/v1\nAPI_INTERNAL_URL=http://localhost:4100/api/v1\nNEXT_PUBLIC_SITE_URL=http://localhost:3100\n');
