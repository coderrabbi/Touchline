import fs from 'node:fs';
for(const f of ['apps/api/.env','apps/web/.env.local']){const s=fs.readFileSync(f,'utf8').replaceAll('localhost:3000','localhost:3100').replaceAll('localhost:4000','localhost:4100').replace('PORT=4000','PORT=4100');fs.writeFileSync(f,s)}
const f='apps/web/package.json',p=JSON.parse(fs.readFileSync(f,'utf8'));p.scripts.dev='next dev --port 3100';p.scripts.start='next start --port 3100';fs.writeFileSync(f,JSON.stringify(p,null,2)+'\n');
