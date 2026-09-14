import sharp from 'sharp';
import {storage} from '../src/utils/storage.js';
import 'dotenv/config';
import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import request from 'supertest';
import {readdir,readFile} from 'node:fs/promises';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {createApp} from '../src/app.js';
import {prisma} from '../src/config/prisma.js';
import {env} from '../src/config/env.js';
import {hashToken} from '../src/utils/tokens.js';
if(env.NODE_ENV!=='test'||env.EMAIL_MODE!=='development')throw new Error('Integration tests require test mode and the local email adapter.');
const app=createApp(),origin=env.FRONTEND_URL,suffix=randomBytes(4).toString('hex'),username='spec_'+suffix,email=username+'@example.com',password='Str0ng-'+suffix+'-password';
const registration={name:'Integration Player',username,email,password,confirmPassword:password,country:'BD',platform:'STEAM_PC',efootballUsername:'SpecStriker_'+suffix};
let userId='';
const cookieArray=(response:request.Response)=>{const raw=response.headers['set-cookie'];return (Array.isArray(raw)?raw:raw?[raw]:[]).map((s:string)=>s.split(';')[0]!).join('; ')};
async function signIn(){const response=await request(app).post('/api/v1/auth/login').set('Origin',origin).send({email,password});expect(response.status).toBe(200);return {cookie:cookieArray(response),csrf:String(response.body.data.csrfToken)}}
async function mailToken(subject:string){
 const files=await readdir(env.DEV_INBOX_DIR);
 const messages=await Promise.all(files.map(async file=>JSON.parse(await readFile(path.join(env.DEV_INBOX_DIR,file),'utf8')) as {to:string;subject:string;text:string;createdAt:string}));
 const mail=messages.filter(item=>item.to===email&&item.subject.includes(subject)).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0];
 const token=mail?.text.match(/token=([a-f0-9]{64})/)?.[1];
 if(!token)throw Error('Expected account email was not delivered to private inbox');
 return token;
}
beforeAll(async()=>{const response=await request(app).post('/api/v1/auth/register').set('Origin',origin).send(registration);expect(response.status).toBe(201);expect(response.body.data.emailDelivery).toBe('local_inbox');userId=response.body.data.user.id});
afterAll(async()=>{if(userId){await prisma.upload.deleteMany({where:{ownerId:userId}});await prisma.user.delete({where:{id:userId}})}await prisma.$disconnect()});
describe('PostgreSQL-backed authentication',()=>{
 it('accepts email, Touchline username and unique eFootball username',async()=>{
  for(const identifier of [email,username.toUpperCase(),registration.efootballUsername.toUpperCase()]){
   const response=await request(app).post('/api/v1/auth/login').set('Origin',origin).send({email:identifier,password});
   expect(response.status).toBe(200);expect(response.body.data.user.id).toBe(userId);
  }
 });
 it('rejects duplicate eFootball names through the API and database',async()=>{
  const duplicate={...registration,username:'other_'+suffix,email:'other_'+suffix+'@example.com',efootballUsername:registration.efootballUsername.toUpperCase()};
  expect((await request(app).post('/api/v1/auth/register').set('Origin',origin).send(duplicate)).status).toBe(409);
  await expect(prisma.user.create({data:{name:'Duplicate fixture',username:duplicate.username,email:duplicate.email,passwordHash:'not-login-data',profile:{create:{country:'BD',platform:'STEAM_PC',efootballUsername:duplicate.efootballUsername}}}})).rejects.toMatchObject({code:'P2002'});
 });
 it('hashes passwords and assigns PLAYER on the server',async()=>{const user=await prisma.user.findUniqueOrThrow({where:{id:userId}});expect(user.passwordHash).not.toBe(password);expect(user.passwordHash).toMatch(/^\$2[ab]\$12\$/);expect(user.role).toBe('PLAYER');const injected=await request(app).post('/api/v1/auth/register').set('Origin',origin).send({...registration,role:'SUPER_ADMIN'});expect(injected.status).toBe(422)});
 it('rejects duplicate accounts and mismatched passwords',async()=>{expect((await request(app).post('/api/v1/auth/register').set('Origin',origin).send(registration)).status).toBe(409);expect((await request(app).post('/api/v1/auth/register').set('Origin',origin).send({...registration,confirmPassword:'different'})).status).toBe(422)});
 it('reports local delivery honestly and replaces stale verification links',async()=>{
  const oldToken=await mailToken('Verify');
  const response=await request(app).post('/api/v1/auth/resend-verification').set('Origin',origin).send({email});
  expect(response.status).toBe(200);
  expect(response.body.data).toEqual({deliveryMode:'development'});
  expect((await request(app).post('/api/v1/auth/verify-email').set('Origin',origin).send({token:oldToken})).status).toBe(400);
  expect(await mailToken('Verify')).not.toBe(oldToken);
 });
 it('verifies a single-use email link without exposing raw tokens in PostgreSQL',async()=>{const token=await mailToken('Verify');const record=await prisma.emailVerificationToken.findUnique({where:{tokenHash:hashToken(token)}});expect(record).not.toBeNull();expect((await request(app).post('/api/v1/auth/verify-email').set('Origin',origin).send({token})).status).toBe(200);expect((await request(app).post('/api/v1/auth/verify-email').set('Origin',origin).send({token})).status).toBe(400)});
 it('uses HTTP-only cookies and returns only safe account fields',async()=>{const response=await request(app).post('/api/v1/auth/login').set('Origin',origin).send({email,password});expect(response.status).toBe(200);expect(response.headers['set-cookie'].join(' ')).toContain('HttpOnly');expect(response.body.data.user.passwordHash).toBeUndefined();expect(response.body.data.accessToken).toBeUndefined();const me=await request(app).get('/api/v1/auth/me').set('Cookie',cookieArray(response));expect(me.body.data.user.email).toBe(email)});
 it('rejects wrong passwords, missing auth and player admin access',async()=>{expect((await request(app).post('/api/v1/auth/login').set('Origin',origin).send({email,password:'wrong'})).status).toBe(401);expect((await request(app).get('/api/v1/auth/me')).status).toBe(401);const s=await signIn();expect((await request(app).get('/api/v1/admin/access').set('Cookie',s.cookie)).status).toBe(403)});
 it('enforces Origin and session-bound CSRF on profile edits',async()=>{const s=await signIn(),body={name:'Updated Player',country:'BD',platform:'STEAM_PC',efootballUsername:'UpdatedStriker_'+suffix,efootballUserId:'EF-12345',platformUsername:'XboxStriker',timezone:'Asia/Dhaka',publicHistory:false};expect((await request(app).patch('/api/v1/users/me').set('Cookie',s.cookie).set('Origin','https://untrusted.example').set('X-CSRF-Token',s.csrf).send(body)).status).toBe(403);expect((await request(app).patch('/api/v1/users/me').set('Cookie',s.cookie).set('Origin',origin).send(body)).status).toBe(403);const updated=await request(app).patch('/api/v1/users/me').set('Cookie',s.cookie).set('Origin',origin).set('X-CSRF-Token',s.csrf).send(body);expect(updated.status).toBe(200);expect(updated.body.data.user.profile.platform).toBe('STEAM_PC');const publicUser=await request(app).get('/api/v1/users/'+username);expect(publicUser.body.data.user.email).toBeUndefined();expect(publicUser.body.data.user.profile.efootballUserId).toBeUndefined()});
 it('rotates refresh tokens and revokes the family on replay',async()=>{const s=await signIn();const fresh=await request(app).post('/api/v1/auth/refresh').set('Origin',origin).set('Cookie',s.cookie).set('X-CSRF-Token',s.csrf);expect(fresh.status).toBe(200);expect(cookieArray(fresh)).not.toBe(s.cookie);const replay=await request(app).post('/api/v1/auth/refresh').set('Origin',origin).set('Cookie',s.cookie).set('X-CSRF-Token',s.csrf);expect(replay.status).toBe(401);expect((await request(app).get('/api/v1/auth/me').set('Cookie',cookieArray(fresh))).status).toBe(401)});
 it('revokes the access session on logout',async()=>{const s=await signIn();expect((await request(app).post('/api/v1/auth/logout').set('Origin',origin).set('Cookie',s.cookie).set('X-CSRF-Token',s.csrf)).status).toBe(200);expect((await request(app).get('/api/v1/auth/me').set('Cookie',s.cookie)).status).toBe(401)});
 it('checks current role and account restriction from PostgreSQL',async()=>{const s=await signIn();await prisma.user.update({where:{id:userId},data:{role:'ADMIN'}});expect((await request(app).get('/api/v1/admin/access').set('Cookie',s.cookie)).status).toBe(200);await prisma.user.update({where:{id:userId},data:{status:'SUSPENDED'}});expect((await request(app).get('/api/v1/auth/me').set('Cookie',s.cookie)).status).toBe(403);await prisma.user.update({where:{id:userId},data:{status:'ACTIVE',role:'PLAYER'}})});
 it('serves public avatars across the frontend origin while keeping evidence private',async()=>{
  const session=await signIn();const picture=await sharp({create:{width:16,height:16,channels:3,background:'#b8f763'}}).png().toBuffer();
  const uploads=[];
  try{for(const purpose of ['AVATAR','MATCH_EVIDENCE']){
   const response=await request(app).post('/api/v1/uploads').set('Origin',origin).set('Cookie',session.cookie).set('X-CSRF-Token',session.csrf).field('purpose',purpose).attach('image',picture,{filename:'fixture.png',contentType:'image/png'});
   expect(response.status).toBe(201);uploads.push(response.body.data);
  }
  const avatar=await request(app).get('/api/v1/uploads/'+uploads[0].id).set('Cookie','tl_access=expired');
  expect(avatar.status).toBe(200);expect(avatar.headers['cross-origin-resource-policy']).toBe('cross-origin');
  expect((await request(app).get('/api/v1/uploads/'+uploads[1].id)).status).toBe(401);
  expect((await request(app).get('/api/v1/uploads/'+uploads[1].id).set('Cookie',session.cookie)).status).toBe(200);
  }finally{for(const upload of uploads)await storage.remove(upload.objectKey);}
 });
 it('resets passwords once, revokes all sessions and prevents email enumeration',async()=>{const s=await signIn();const known=await request(app).post('/api/v1/auth/forgot-password').set('Origin',origin).send({email}),unknown=await request(app).post('/api/v1/auth/forgot-password').set('Origin',origin).send({email:'absent-'+suffix+'@example.com'});expect(known.body.message).toBe(unknown.body.message);const token=await mailToken('Reset'),newPassword=password+'-new';expect((await request(app).post('/api/v1/auth/reset-password').set('Origin',origin).send({token,password:newPassword,confirmPassword:newPassword})).status).toBe(200);expect((await request(app).post('/api/v1/auth/reset-password').set('Origin',origin).send({token,password:newPassword,confirmPassword:newPassword})).status).toBe(400);expect((await request(app).get('/api/v1/auth/me').set('Cookie',s.cookie)).status).toBe(401);expect((await request(app).post('/api/v1/auth/login').set('Origin',origin).send({email,password:newPassword})).status).toBe(200)});
});
