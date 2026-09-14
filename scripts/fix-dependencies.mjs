import fs from 'node:fs';
const p=JSON.parse(fs.readFileSync('package.json','utf8'));p.devDependencies['deepmerge-ts']='8.0.2';p.devDependencies.mysql2='3.24.4';fs.writeFileSync('package.json',JSON.stringify(p,null,2)+'\n');
const f='apps/api/prisma/seed.ts';let s=fs.readFileSync(f,'utf8');s=s.replace("const startsAt=new Date(Date.now()+f.offset*86400000);", "const {offset,...fields}=f;const startsAt=new Date(Date.now()+offset*86400000);").replace('...f,offset:undefined,','...fields,').replace('} as never});','}});');fs.writeFileSync(f,s);
