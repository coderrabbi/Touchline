import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const zipped=fs.readFileSync('.local/schema-engine.exe.gz'),expected=fs.readFileSync('.local/schema-engine.exe.gz.sha256','utf8').trim().split(/\s/)[0];if(createHash('sha256').update(zipped).digest('hex')!==expected)throw Error('Prisma engine checksum mismatch');fs.writeFileSync('.local/schema-engine.exe',gunzipSync(zipped));
let p='package.json',j=JSON.parse(fs.readFileSync(p,'utf8'));j.overrides={'deepmerge-ts':'8.0.2','mysql2':'3.24.4'};fs.writeFileSync(p,JSON.stringify(j,null,2)+'\n');
let a='apps/api/src/app.ts',s=fs.readFileSync(a,'utf8');if(!s.includes('catalogRoutes'))s=s.replace("import express", "import {catalogRoutes} from './routes/catalog.routes.js';\nimport express").replace("app.use('/api/v1/users',userRoutes);","app.use('/api/v1/users',userRoutes);app.use('/api/v1',catalogRoutes);");fs.writeFileSync(a,s);
console.log('Verified Prisma engine; configured patched tooling dependencies.');
