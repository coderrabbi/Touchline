import {remove as removeTournament} from '../src/services/tournament.service.js';
import {deleteAccount} from '../src/services/account-deletion.service.js';
import 'dotenv/config';
import {beforeAll,afterAll,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {prisma} from '../src/config/prisma.js';
import {coordinate,room,reschedule} from '../src/services/coordination.service.js';
import {sendMatchReminders} from '../src/services/reminder.service.js';
import {view,lookup} from '../src/services/result.service.js';
const ids:string[]=[];let tournamentId='',matchId='';
beforeAll(async()=>{for(let i=0;i<4;i++){const suffix=randomUUID();const u=await prisma.user.create({data:{name:'Coordination fixture',username:suffix.slice(0,20),email:suffix+'@example.com',passwordHash:'unusable-test-hash',profile:{create:{platform:'STEAM_PC',country:'BD',efootballUsername:suffix,avatarUrl:'https://example.com/avatar.png'}}}});ids.push(u.id);}
const t=await prisma.tournament.create({data:{name:'Coordination fixture',slug:randomUUID(),description:'Test fixture',format:'KNOCKOUT',platform:'STEAM_PC',maxPlayers:4,registrationStartsAt:new Date(Date.now()-86400000),registrationDeadline:new Date(Date.now()-7200000),startsAt:new Date(Date.now()-3600000),rules:'Test rules',createdById:ids[0]!,status:'ONGOING',publishedAt:new Date()}});tournamentId=t.id;
const p=await Promise.all([1,2].map(i=>prisma.tournamentParticipant.create({data:{tournamentId,userId:ids[i]!}})));
const m=await prisma.match.create({data:{tournamentId,stage:'FINAL',round:1,position:1,homeId:p[0]!.id,awayId:p[1]!.id,scheduledAt:new Date(Date.now()-20*60000)}});matchId=m.id;});
afterAll(async()=>{if(tournamentId)await prisma.tournament.delete({where:{id:tournamentId}});await prisma.auditLog.deleteMany({where:{actorId:{in:ids}}});await prisma.user.deleteMany({where:{id:{in:ids}}});await prisma.$disconnect()});
it('keeps lobby details private and returns public profile pictures',async()=>{await expect(room(matchId,ids[3]!,false)).rejects.toMatchObject({status:403});await coordinate(matchId,ids[1]!,false,{action:'lobby',text:'Room 456'});expect((await room(matchId,ids[2]!,false)).lobbyDetails).toBe('Room 456');const publicMatch=await view(matchId);expect(publicMatch.home?.user.profile?.avatarUrl).toBe('https://example.com/avatar.png');expect(publicMatch).not.toHaveProperty('coordination');});
it('makes check-in idempotent and no-show decisions admin-only',async()=>{await coordinate(matchId,ids[1]!,false,{action:'ready'});const count=await prisma.notification.count({where:{userId:ids[2]!,title:'Opponent checked in'}});await coordinate(matchId,ids[1]!,false,{action:'ready'});expect(await prisma.notification.count({where:{userId:ids[2]!,title:'Opponent checked in'}})).toBe(count);await coordinate(matchId,ids[1]!,false,{action:'no-show',text:'Opponent has not replied to my messages.'});await expect(coordinate(matchId,ids[2]!,false,{action:'decision',text:'Award a win to myself.'})).rejects.toMatchObject({status:403});await coordinate(matchId,ids[0]!,true,{action:'decision',text:'Reschedule with both players available.'});expect((await room(matchId,ids[2]!,false)).decision).toContain('Reschedule');expect((await prisma.match.findUniqueOrThrow({where:{id:matchId}})).status).toBe('SCHEDULED');});
it('resets readiness, notifies both players and rejects early check-in after reschedule',async()=>{await reschedule(matchId,ids[0]!,new Date(Date.now()+86400000).toISOString(),'Both players agreed to tomorrow.');expect((await room(matchId,ids[1]!,false)).homeReadyAt).toBeNull();expect(await prisma.notification.count({where:{userId:{in:[ids[1]!,ids[2]!]},type:'SCHEDULE_CHANGE'}})).toBe(2);await expect(coordinate(matchId,ids[1]!,false,{action:'ready'})).rejects.toMatchObject({status:409});});


it('deduplicates reminders and respects the player preference',async()=>{await prisma.profile.update({where:{userId:ids[2]!},data:{matchReminders:false}});await prisma.match.update({where:{id:matchId},data:{scheduledAt:new Date(Date.now()+10*60000)}});await sendMatchReminders();await sendMatchReminders();expect(await prisma.notification.count({where:{userId:ids[1]!,type:'MATCH_REMINDER'}})).toBe(1);expect(await prisma.notification.count({where:{userId:ids[2]!,type:'MATCH_REMINDER'}})).toBe(0);});

it('assigns a unique match number and restricts lookup of private matches',async()=>{const m=await prisma.match.findUniqueOrThrow({where:{id:matchId}});expect(m.matchNumber).toBeGreaterThan(0);expect((await lookup('tl-'+String(m.matchNumber).padStart(6,'0'))).id).toBe(matchId);expect((await lookup(String(m.matchNumber))).id).toBe(matchId);await expect(lookup('invalid-id')).rejects.toMatchObject({status:422});await prisma.tournament.update({where:{id:tournamentId},data:{visibility:'PRIVATE'}});try{await expect(lookup(String(m.matchNumber))).rejects.toMatchObject({status:404});expect((await lookup(String(m.matchNumber),ids[0]!,true)).id).toBe(matchId);}finally{await prisma.tournament.update({where:{id:tournamentId},data:{visibility:'PUBLIC'}})}});

it('limits account deletion to super admins and preserves match history',async()=>{
 await expect(deleteAccount(ids[2]!,ids[1]!,'Account deletion test reason','anything')).rejects.toMatchObject({status:403});
 await prisma.user.update({where:{id:ids[0]!},data:{role:'SUPER_ADMIN'}});
 await expect(deleteAccount(ids[0]!,ids[0]!,'Account deletion test reason','anything')).rejects.toMatchObject({status:409});
 await prisma.user.update({where:{id:ids[3]!},data:{role:'SUPER_ADMIN'}});
 await expect(deleteAccount(ids[0]!,ids[3]!,'Account deletion test reason','anything')).rejects.toMatchObject({status:403});
 const target=await prisma.user.findUniqueOrThrow({where:{id:ids[1]!}});
 await expect(deleteAccount(ids[0]!,target.id,'Account deletion test reason','wrong-username')).rejects.toMatchObject({status:422});
 await deleteAccount(ids[0]!,target.id,'Account deletion test reason',target.username);
 const deleted=await prisma.user.findUniqueOrThrow({where:{id:target.id}});
 expect(deleted.deletedAt).not.toBeNull();expect(deleted.name).toBe('Deleted player');expect(deleted.email).not.toBe(target.email);expect(deleted.status).toBe('BANNED');expect(deleted.passwordHash).toBe('!deleted');
 expect(await prisma.profile.count({where:{userId:target.id}})).toBe(0);expect(await prisma.notification.count({where:{userId:target.id}})).toBe(0);
 expect((await prisma.match.findUniqueOrThrow({where:{id:matchId},include:{home:true}})).home?.userId).toBe(target.id);
 expect(await prisma.auditLog.count({where:{action:'ACCOUNT_DELETED',entityId:target.id,actorId:ids[0]!}})).toBe(1);
 await expect(deleteAccount(ids[0]!,target.id,'Account deletion test reason',target.username)).rejects.toMatchObject({status:404});
});

it('allows admins to delete populated tournaments while preserving players and audit history',async()=>{
 const t=await prisma.tournament.findUniqueOrThrow({where:{id:tournamentId}});
 await expect(removeTournament(ids[2]!,t.id,'Tournament deletion test',t.slug)).rejects.toMatchObject({status:403});
 await prisma.user.update({where:{id:ids[2]!},data:{role:'ADMIN'}});
 await expect(removeTournament(ids[2]!,t.id,'Tournament deletion test','wrong')).rejects.toMatchObject({status:422});
 await prisma.standing.create({data:{tournamentId:t.id,participantId:(await prisma.match.findUniqueOrThrow({where:{id:matchId}})).homeId!,scope:'overall'}});
 await removeTournament(ids[2]!,t.id,'Tournament deletion test',t.slug);tournamentId='';
 expect(await prisma.match.count({where:{tournamentId:t.id}})).toBe(0);expect(await prisma.tournamentParticipant.count({where:{tournamentId:t.id}})).toBe(0);expect(await prisma.user.count({where:{id:{in:ids}}})).toBe(ids.length);
 expect(await prisma.auditLog.count({where:{entityId:t.id,action:'TOURNAMENT_DELETED'}})).toBe(1);
 const {id:_id,...copy}=t;const draft=await prisma.tournament.create({data:{...copy,slug:randomUUID(),status:'DRAFT'}});
 await removeTournament(ids[0]!,draft.id,'Super admin deletion test',draft.slug);expect(await prisma.tournament.count({where:{id:draft.id}})).toBe(0);
});
