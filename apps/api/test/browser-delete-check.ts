import 'dotenv/config';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import bcrypt from 'bcrypt';
import {prisma} from '../src/config/prisma.js';
const {chromium}=createRequire(import.meta.url)('C:/Users/Golam Rabbi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ids:string[]=[];const browser=await chromium.launch({headless:true,channel:'msedge'});
try{const suffix=randomUUID().slice(0,8),password='DeleteTest!'+randomUUID(),hash=await bcrypt.hash(password,12);
for(const role of ['SUPER_ADMIN','PLAYER'] as const){const user=await prisma.user.create({data:{name:role+' Delete Fixture '+suffix,username:role.toLowerCase()+'_'+suffix,email:role.toLowerCase()+suffix+'@example.com',passwordHash:hash,role}});ids.push(user.id);}
const actor=await prisma.user.findUniqueOrThrow({where:{id:ids[0]!}}),target=await prisma.user.findUniqueOrThrow({where:{id:ids[1]!}});
const context=await browser.newContext({viewport:{width:390,height:844}});const login=await context.request.post('http://localhost:4100/api/v1/auth/login',{headers:{Origin:'http://localhost:3100'},data:{email:actor.email,password}});if(login.status()!==200)throw Error('Login failed '+login.status()+' '+(await login.json()).message);
const p=await context.newPage();await p.goto('http://localhost:3100/admin/players');const row=p.locator('tr').filter({hasText:target.email});await row.getByRole('button',{name:'Delete account',exact:true}).click();const dialog=p.locator('dialog[open]');await dialog.waitFor();await dialog.getByRole('button',{name:'Cancel',exact:true}).click();if((await prisma.user.findUniqueOrThrow({where:{id:target.id}})).deletedAt!==null)throw Error('Cancel changed account');
await row.getByRole('button',{name:'Delete account',exact:true}).click();await dialog.getByLabel('Reason for audit history').fill('Temporary browser fixture deletion check.');await dialog.getByLabel('Type '+target.username+' to confirm').fill(target.username);await dialog.getByRole('button',{name:'Permanently delete account',exact:true}).click();await row.waitFor({state:'detached'});if(!(await prisma.user.findUniqueOrThrow({where:{id:target.id}})).deletedAt)throw Error('Deletion failed');console.log('PASS: mobile confirmation dialog, cancel, typed confirmation, account deletion and refreshed user list.');
}finally{await browser.close();await prisma.auditLog.deleteMany({where:{actorId:{in:ids}}});await prisma.user.deleteMany({where:{id:{in:ids}}});await prisma.$disconnect();}



