import 'dotenv/config';
import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import {randomUUID} from 'node:crypto';
import {createApp} from '../src/app.js';
import {prisma} from '../src/config/prisma.js';
import {env} from '../src/config/env.js';
import {tournamentSchema} from '@touchline/shared';
import * as tournaments from '../src/services/tournament.service.js';

const app=createApp(),ids:string[]=[],suffix=randomUUID().slice(0,8),password='Cedar7Rain!Moon';
const sessions:Array<{cookie:string;csrf:string}>=[];
let tournamentId='';
const endpoint=()=>'/api/v1/tournaments/'+tournamentId+'/community';
const post=(index:number,path:string,body:unknown)=>request(app).post(path).set('Origin',env.FRONTEND_URL).set('Cookie',sessions[index]!.cookie).set('X-CSRF-Token',sessions[index]!.csrf).send(body);
const patch=(index:number,path:string,body:unknown)=>request(app).patch(path).set('Origin',env.FRONTEND_URL).set('Cookie',sessions[index]!.cookie).set('X-CSRF-Token',sessions[index]!.csrf).send(body);

beforeAll(async()=>{
  const passwordHash=await bcrypt.hash(password,12);
  for(const [i,role] of (['SUPER_ADMIN','ADMIN','PLAYER','PLAYER'] as const).entries()) {
    const email=`chat_${suffix}_${i}@example.com`;
    const user=await prisma.user.create({data:{name:'Chat Test '+i,username:`chat_${suffix}_${i}`,email,passwordHash,role,emailVerified:true,profile:{create:{country:'BD',platform:'STEAM_PC',efootballUsername:'ChatFixture_'+suffix+'_'+i}}}});
    ids.push(user.id);
    const login=await request(app).post('/api/v1/auth/login').set('Origin',env.FRONTEND_URL).send({email,password});
    expect(login.status).toBe(200);
    const cookies=login.headers['set-cookie'] as unknown as string[];
    sessions.push({cookie:cookies.map(c=>c.split(';')[0]).join('; '),csrf:login.body.data.csrfToken});
  }
  const tournament=await tournaments.create(ids[0]!,tournamentSchema.parse({name:'Community Test '+suffix,slug:'community-'+suffix,description:'Private test fixture for community permissions.',format:'KNOCKOUT',platform:'STEAM_PC',region:'Global',minPlayers:2,maxPlayers:4,matchDuration:10,registrationStartsAt:new Date(Date.now()-86400000).toISOString(),registrationDeadline:new Date(Date.now()+86400000).toISOString(),startsAt:new Date(Date.now()+172800000).toISOString(),rules:'Official results require confirmation and evidence.'}));
  tournamentId=tournament.id;
  await tournaments.changeStatus(ids[0]!,tournamentId,'REGISTRATION_OPEN','Open community test registration.');
  await tournaments.join(ids[2]!,tournamentId);
});
afterAll(async()=>{
  if(tournamentId)await prisma.tournament.delete({where:{id:tournamentId}});
  await prisma.auditLog.deleteMany({where:{actorId:{in:ids}}});
  await prisma.user.deleteMany({where:{id:{in:ids}}});await prisma.$disconnect();
});

describe('Tournament community',()=>{
  it('keeps chat and group invites private to participants and administrators',async()=>{
    expect((await request(app).get(endpoint())).status).toBe(401);
    expect((await request(app).get(endpoint()).set('Cookie',sessions[3]!.cookie)).status).toBe(403);
    expect((await request(app).get(endpoint()).set('Cookie',sessions[2]!.cookie)).status).toBe(200);
    expect((await patch(2,endpoint(),{groupLink:'https://example.com/group'})).status).toBe(403);
    expect((await patch(1,endpoint(),{groupLink:'javascript:alert(1)'})).status).toBe(422);
    expect((await patch(1,endpoint(),{groupLink:'https://example.com/group'})).status).toBe(200);
    const snapshot=await request(app).get(endpoint()).set('Cookie',sessions[2]!.cookie);
    expect(snapshot.body.data.groupLink).toBe('https://example.com/group');
    expect(snapshot.body.data.canManage).toBe(false);
    expect(await prisma.auditLog.count({where:{actorId:ids[1],action:'GROUP_LINK_UPDATED'}})).toBe(1);
  });
  it('validates messages, enforces CSRF and persists retries only once',async()=>{
    const body={clientId:randomUUID(),body:'Ready for our match?'};
    expect((await request(app).post(endpoint()+'/messages').set('Origin',env.FRONTEND_URL).set('Cookie',sessions[2]!.cookie).send(body)).status).toBe(403);
    expect((await post(3,endpoint()+'/messages',body)).status).toBe(403);
    expect((await post(2,endpoint()+'/messages',{...body,body:'   '})).status).toBe(422);
    expect((await post(2,endpoint()+'/messages',body)).status).toBe(201);
    expect((await post(2,endpoint()+'/messages',body)).status).toBe(201);
    expect(await prisma.chatMessage.count({where:{clientId:body.clientId}})).toBe(1);expect(await prisma.notification.count({where:{userId:ids[0],type:'CHAT'}})).toBe(1);expect(await prisma.notification.count({where:{userId:ids[2],type:'CHAT'}})).toBe(0);
    expect((await post(2,endpoint()+'/messages',{...body,body:'Changed content'})).status).toBe(409);
  });
  it('pushes new messages to another session and closes revoked streams',async()=>{
    const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
    const address=server.address();if(!address||typeof address==='string')throw Error('No test server address');
    const abort=new AbortController();
    try {
      const response=await fetch(`http://127.0.0.1:${address.port}${endpoint()}/stream`,{headers:{Cookie:sessions[2]!.cookie},signal:abort.signal});
      expect(response.headers.get('content-type')).toContain('text/event-stream');
      const reader=response.body!.getReader(),decoder=new TextDecoder();
      const until=async(text:string)=>{let output='';while(!output.includes(text)){const chunk=await reader.read();if(chunk.done)throw Error('Stream ended early');output+=decoder.decode(chunk.value);}return output;};
      await until('event: snapshot');
      expect((await post(1,endpoint()+'/messages',{clientId:randomUUID(),body:'Live message from the administrator'})).status).toBe(201);
      expect(await until('Live message from the administrator')).toContain('Live message from the administrator');
      await prisma.refreshToken.updateMany({where:{userId:ids[2]},data:{revokedAt:new Date()}});
      expect(await until('event: access-check')).toContain('event: access-check');
      await reader.cancel();
    } finally {abort.abort();server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
  });
  it('allows only a super admin to promote accounts and audits the change',async()=>{
    const body={role:'ADMIN',reason:'Approved test administrator application.'};
    expect((await patch(1,'/api/v1/admin/users/'+ids[3],body)).status).toBe(403);
    expect((await patch(0,'/api/v1/admin/users/'+ids[3],body)).status).toBe(200);
    expect((await prisma.user.findUniqueOrThrow({where:{id:ids[3]}})).role).toBe('ADMIN');
    expect((await request(app).get('/api/v1/auth/me').set('Cookie',sessions[3]!.cookie)).status).toBe(401);
  });
});

