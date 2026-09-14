import {kickoffNow} from '../src/services/kickoff.service.js';
import {publicProfile} from '../src/services/user.service.js';
import 'dotenv/config';
import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {randomBytes} from 'node:crypto';
import {prisma} from '../src/config/prisma.js';
import * as tournaments from '../src/services/tournament.service.js';
import * as fixtures from '../src/services/fixture.service.js';
import * as results from '../src/services/result.service.js';
import {tournamentSchema} from '@touchline/shared';
const suffix=randomBytes(4).toString('hex'),ids:string[]=[],events:string[]=[];let admin='';
function config(name:string,capacity=4,format:'KNOCKOUT'|'LEAGUE'|'GROUP_KNOCKOUT'='KNOCKOUT'){return tournamentSchema.parse({name,slug:'spec-'+suffix+'-'+events.length,description:'Isolated integration tournament.',format,platform:'STEAM_PC',region:'Global',minPlayers:2,maxPlayers:capacity,registrationStartsAt:new Date(Date.now()-86400000).toISOString(),registrationDeadline:new Date(Date.now()+86400000).toISOString(),startsAt:new Date(Date.now()+172800000).toISOString(),matchDuration:10,rules:'Official scores require opponent confirmation and screenshot evidence.',numberOfGroups:2,advancingPerGroup:1,manualQualification:true})}
beforeAll(async()=>{for(let i=0;i<6;i++){const user=await prisma.user.create({data:{name:'Competition Player '+i,username:'spec_'+suffix+'_'+i,email:'spec_'+suffix+'_'+i+'@example.com',passwordHash:'not-an-authentication-fixture',emailVerified:true,role:i===0?'ADMIN':'PLAYER',profile:{create:{country:'BD',platform:'STEAM_PC',efootballUsername:'Fixture_'+suffix+'_'+i}}}});ids.push(user.id)}admin=ids[0]!});
afterAll(async()=>{await prisma.matchResultSubmission.deleteMany({where:{match:{tournamentId:{in:events}}}});await prisma.match.deleteMany({where:{tournamentId:{in:events}}});await prisma.tournamentWinner.deleteMany({where:{tournamentId:{in:events}}});await prisma.standing.deleteMany({where:{tournamentId:{in:events}}});await prisma.groupMember.deleteMany({where:{group:{tournamentId:{in:events}}}});await prisma.tournamentGroup.deleteMany({where:{tournamentId:{in:events}}});await prisma.tournamentParticipant.deleteMany({where:{tournamentId:{in:events}}});await prisma.tournament.deleteMany({where:{id:{in:events}}});await prisma.upload.deleteMany({where:{ownerId:{in:ids}}});await prisma.auditLog.deleteMany({where:{actorId:{in:ids}}});await prisma.user.deleteMany({where:{id:{in:ids}}});await prisma.$disconnect()});
describe('Transactional tournament lifecycle',()=>{
 it('starts immediately once, creates live fixtures and exposes only official profile stats',async()=>{
  const t=await tournaments.create(admin,config('Immediate Kickoff Cup',2));events.push(t.id);
  await tournaments.changeStatus(admin,t.id,'REGISTRATION_OPEN','Open kickoff test.');
  await expect(kickoffNow(ids[1]!,t.id)).rejects.toMatchObject({status:403});
  await expect(kickoffNow(admin,t.id)).rejects.toMatchObject({status:409});
  for(const userId of ids.slice(1,3))await tournaments.join(userId,t.id);
  const attempts=await Promise.allSettled([kickoffNow(admin,t.id),kickoffNow(admin,t.id)]);
  expect(attempts.filter(r=>r.status==='fulfilled')).toHaveLength(1);
  const event=await prisma.tournament.findUniqueOrThrow({where:{id:t.id}});
  expect(event.status).toBe('ONGOING');expect(event.startsAt.getTime()).toBeLessThanOrEqual(Date.now());
  expect(await prisma.match.count({where:{tournamentId:t.id}})).toBe(1);
  const match=await prisma.match.findFirstOrThrow({where:{tournamentId:t.id},include:{home:{include:{user:true}}}});
  expect(match.status).toBe('LIVE');
  const before=await publicProfile(match.home!.user.username);expect(before.stats.played).toBe(0);
  await results.resolve(admin,match.id,{homeScore:3,awayScore:1},'Verified test final score.');
  const after=await publicProfile(match.home!.user.username);expect(after.stats).toMatchObject({played:1,wins:1,losses:0,goalsFor:3,goalsAgainst:1});
  expect(after).not.toHaveProperty('email');expect(after).not.toHaveProperty('passwordHash');
 });
 it('holds disputed scores until an audited decision and rejects reused evidence ownership', async () => {
  const tournament = await tournaments.create(admin, config('Dispute Review Cup', 2));
  events.push(tournament.id);
  await tournaments.changeStatus(admin, tournament.id, 'REGISTRATION_OPEN', 'Open dispute test registration.');
  for (const userId of ids.slice(1, 3)) await tournaments.join(userId, tournament.id);
  await tournaments.changeStatus(admin, tournament.id, 'REGISTRATION_CLOSED', 'Close dispute test registration.');
  await fixtures.generate(admin, tournament.id);
  await tournaments.changeStatus(admin, tournament.id, 'ONGOING', 'Start dispute test final.');
  const match = await prisma.match.findFirstOrThrow({where: {tournamentId: tournament.id}, include: {home: true, away: true}});
  const evidence = await Promise.all([match.home!.userId, match.away!.userId].map((ownerId, index) => prisma.upload.create({data: {
   ownerId, purpose: 'MATCH_EVIDENCE', provider: 'test', objectKey: `dispute-${suffix}-${index}.webp`,
   url: 'https://example.invalid/dispute.webp', mimeType: 'image/webp', sizeBytes: 100,
  }})));
  await results.submit(match.home!.userId, match.id, {homeScore: 3, awayScore: 1, evidenceId: evidence[0]!.id});
  await expect(results.dispute(match.away!.userId, match.id, 'The score is reversed.', evidence[0]!.id)).rejects.toMatchObject({status: 403});
  await results.dispute(match.away!.userId, match.id, 'My final screen shows an away win.', evidence[1]!.id);
  await expect(results.confirm(match.away!.userId, match.id)).rejects.toMatchObject({status: 409});
  const disputed = await prisma.match.findUniqueOrThrow({where: {id: match.id}});
  expect(disputed.status).toBe('DISPUTED');
  expect(disputed.homeScore).toBeNull();
  expect(await prisma.tournamentWinner.count({where: {tournamentId: tournament.id}})).toBe(0);
  await results.resolve(admin, match.id, {homeScore: 1, awayScore: 3}, 'Both screenshots reviewed; away player won 3–1.');
  const submission = await prisma.matchResultSubmission.findFirstOrThrow({where: {matchId: match.id}});
  expect(submission.status).toBe('RESOLVED');
  expect(submission.reviewedById).toBe(admin);
  expect(submission.disputeEvidenceId).toBe(evidence[1]!.id);
  expect((await prisma.tournamentWinner.findFirstOrThrow({where: {tournamentId: tournament.id, place: 1}})).participantId).toBe(match.awayId);
  expect(await prisma.auditLog.count({where: {actorId: admin, action: 'RESULT_RESOLVED'}})).toBeGreaterThan(0);
  await expect(results.resolve(admin, match.id, {homeScore: 3, awayScore: 1}, 'Attempt to overwrite completed result.')).rejects.toMatchObject({status: 409});
 });
 it('enforces capacity under concurrent registration and rejects duplicates',async()=>{const t=await tournaments.create(admin,config('Capacity Cup',2));events.push(t.id);await tournaments.changeStatus(admin,t.id,'REGISTRATION_OPEN','Open for integration test.');const joined=await Promise.allSettled(ids.slice(1,4).map(u=>tournaments.join(u,t.id)));expect(joined.filter(r=>r.status==='fulfilled')).toHaveLength(2);expect(await prisma.tournamentParticipant.count({where:{tournamentId:t.id}})).toBe(2);const p=await prisma.tournamentParticipant.findFirstOrThrow({where:{tournamentId:t.id}});await expect(tournaments.join(p.userId,t.id)).rejects.toMatchObject({status:409});await tournaments.withdraw(p.userId,t.id);expect(await prisma.tournamentParticipant.count({where:{tournamentId:t.id}})).toBe(1)});
 it('keeps submissions unofficial, confirms once and progresses a knockout to champion',async()=>{const t=await tournaments.create(admin,config('Progression Cup'));events.push(t.id);await tournaments.changeStatus(admin,t.id,'REGISTRATION_OPEN','Registration open.');for(const u of ids.slice(1,5))await tournaments.join(u,t.id);await tournaments.changeStatus(admin,t.id,'REGISTRATION_CLOSED','Registration closed.');await fixtures.generate(admin,t.id);await expect(fixtures.generate(admin,t.id)).rejects.toMatchObject({status:409});await tournaments.changeStatus(admin,t.id,'ONGOING','Kickoff for integration match.');const match=await prisma.match.findFirstOrThrow({where:{tournamentId:t.id,round:1},include:{home:true,away:true},orderBy:{position:'asc'}});const upload=await prisma.upload.create({data:{ownerId:match.home!.userId,purpose:'MATCH_EVIDENCE',provider:'test',objectKey:'spec-'+suffix+'.webp',url:'https://example.invalid/evidence.webp',mimeType:'image/webp',sizeBytes:100}});await results.submit(match.home!.userId,match.id,{homeScore:3,awayScore:1,evidenceId:upload.id});expect((await prisma.match.findUniqueOrThrow({where:{id:match.id}})).homeScore).toBeNull();expect((await prisma.match.findUniqueOrThrow({where:{id:match.nextMatchId!}})).homeId).toBeNull();await expect(results.confirm(match.home!.userId,match.id)).rejects.toMatchObject({status:403});await results.confirm(match.away!.userId,match.id);await expect(results.confirm(match.away!.userId,match.id)).rejects.toMatchObject({status:409});expect((await prisma.match.findUniqueOrThrow({where:{id:match.nextMatchId!}})).homeId).toBe(match.homeId);const second=await prisma.match.findFirstOrThrow({where:{tournamentId:t.id,round:1,status:'SCHEDULED'}});await results.resolve(admin,second.id,{homeScore:2,awayScore:0},'Reviewed official result.');const final=await prisma.match.findFirstOrThrow({where:{tournamentId:t.id,stage:'FINAL'}});await results.resolve(admin,final.id,{homeScore:1,awayScore:1,homePenalties:5,awayPenalties:4},'Penalty shootout verified.');expect((await prisma.tournament.findUniqueOrThrow({where:{id:t.id}})).status).toBe('COMPLETED');expect((await prisma.tournamentWinner.findFirstOrThrow({where:{tournamentId:t.id,place:1}})).participantId).toBe(final.homeId)});
 it('calculates league draws and completes the official table',async()=>{const t=await tournaments.create(admin,config('League Cup',3,'LEAGUE'));events.push(t.id);await tournaments.changeStatus(admin,t.id,'REGISTRATION_OPEN','Open league registration.');for(const u of ids.slice(1,4))await tournaments.join(u,t.id);await tournaments.changeStatus(admin,t.id,'REGISTRATION_CLOSED','Close league registration.');await fixtures.generate(admin,t.id);await tournaments.changeStatus(admin,t.id,'ONGOING','Start league.');const matches=await prisma.match.findMany({where:{tournamentId:t.id},orderBy:{round:'asc'}});await results.resolve(admin,matches[0]!.id,{homeScore:2,awayScore:2},'Draw verified by evidence.');const table=await prisma.standing.findMany({where:{tournamentId:t.id,played:1}});expect(table).toHaveLength(2);expect(table.every(r=>r.draws===1&&r.points===1)).toBe(true)});
 it('qualifies only after every group match is official',async()=>{const t=await tournaments.create(admin,config('Group Cup',4,'GROUP_KNOCKOUT'));events.push(t.id);await tournaments.changeStatus(admin,t.id,'REGISTRATION_OPEN','Open group registration.');for(const u of ids.slice(1,5))await tournaments.join(u,t.id);await tournaments.changeStatus(admin,t.id,'REGISTRATION_CLOSED','Close group registration.');await fixtures.generate(admin,t.id);await tournaments.changeStatus(admin,t.id,'ONGOING','Start groups.');await expect(fixtures.confirmQualification(admin,t.id)).rejects.toMatchObject({status:409});for(const m of await prisma.match.findMany({where:{tournamentId:t.id}}))await results.resolve(admin,m.id,{homeScore:2,awayScore:0},'Group result verified.');await fixtures.confirmQualification(admin,t.id);expect(await prisma.match.count({where:{tournamentId:t.id,stage:'FINAL'}})).toBe(1);expect(await prisma.tournamentParticipant.count({where:{tournamentId:t.id,qualified:true}})).toBe(2)})
});
