import {prisma} from '../config/prisma.js';
import {transaction} from './transaction.js';
import {AppError} from '../utils/errors.js';
import type {Prisma} from '../generated/prisma/client.js';
const include={home:true,away:true,tournament:true,coordination:true} as const;
async function access(db:Prisma.TransactionClient,id:string,userId:string,admin:boolean){const m=await db.match.findUnique({where:{id},include});if(!m)throw new AppError(404,'Match not found.');if(!admin&&![m.home?.userId,m.away?.userId].includes(userId))throw new AppError(403,'This room is private to the opponents and administrators.');return m;}
export async function room(id:string,userId:string,admin:boolean){const m=await access(prisma,id,userId,admin);return m.coordination||{homeReadyAt:null,awayReadyAt:null,lobbyDetails:null,noShowReason:null,noShowReportedAt:null,decision:null};}
export async function coordinate(id:string,userId:string,admin:boolean,input:{action:'ready'|'lobby'|'no-show'|'decision';text?:string}){return transaction(async tx=>{
 const m=await access(tx,id,userId,admin),participant=[m.home?.userId,m.away?.userId].includes(userId),active=['SCHEDULED','LIVE'].includes(m.status)&&['UPCOMING','ONGOING'].includes(m.tournament.status);
 if(input.action!=='decision'&&!active)throw new AppError(409,'Coordination is closed for this match.');
 let data:Prisma.MatchCoordinationUpdateInput={};
 if(input.action==='ready'){
  if(!participant)throw new AppError(403,'Only the opponents can check in.');
  if(!m.homeId||!m.awayId)throw new AppError(409,'Both opponents must be assigned.');
  if(m.scheduledAt&&Date.now()<m.scheduledAt.getTime()-30*60000)throw new AppError(409,'Check-in opens 30 minutes before the scheduled match.');
  const key=m.home?.userId===userId?'homeReadyAt':'awayReadyAt';if(m.coordination?.[key])return m.coordination;data={[key]:new Date()};
 }else if(input.action==='lobby'){data={lobbyDetails:input.text||null};}
 else if(input.action==='no-show'){
  if(!participant)throw new AppError(403,'Only an opponent can report a no-show.');
  if(!m.scheduledAt||Date.now()<m.scheduledAt.getTime()+15*60000)throw new AppError(409,'Allow 15 minutes after the scheduled time before reporting a no-show.');
  if(!m.coordination?.[m.home?.userId===userId?'homeReadyAt':'awayReadyAt'])throw new AppError(409,'Check in before reporting an absent opponent.');
  if(m.coordination?.noShowReportedAt)throw new AppError(409,'A report already exists. An administrator will review it.');
  data={noShowReporterId:userId,noShowReason:input.text,noShowReportedAt:new Date()};
 }else{if(!admin)throw new AppError(403,'Only administrators can publish a decision.');if(!m.coordination?.noShowReportedAt||m.coordination.decision)throw new AppError(409,'No open report to review.');data={decision:input.text};}
 const result=await tx.matchCoordination.upsert({where:{matchId:id},create:{matchId:id,...data} as Prisma.MatchCoordinationUncheckedCreateInput,update:data});
 const recipients=new Set([m.home?.userId,m.away?.userId].filter((x):x is string=>!!x&&x!==userId));
 if(input.action==='no-show'){for(const a of await tx.user.findMany({where:{role:{in:['ADMIN','SUPER_ADMIN']},status:'ACTIVE'},select:{id:true}}))recipients.add(a.id);}
 const titles={ready:'Opponent checked in',lobby:'Match lobby updated','no-show':'No-show report needs review',decision:'No-show decision published'};
 await tx.notification.createMany({data:[...recipients].map(recipient=>({userId:recipient,title:titles[input.action],message:m.tournament.name,type:'MATCH_COORDINATION',link:'/matches/'+id}))});
 await tx.auditLog.create({data:{actorId:userId,action:'MATCH_'+input.action.toUpperCase().replace('-','_'),entityType:'Match',entityId:id,metadata:input.action==='decision'?{reason:input.text}:undefined}});
 return result;
});}

export async function reschedule(id:string,actorId:string,scheduledAt:string,reason:string){return transaction(async tx=>{
 const m=await access(tx,id,actorId,true);if(m.status!=='SCHEDULED'||!['UPCOMING','ONGOING'].includes(m.tournament.status))throw new AppError(409,'Only scheduled matches in active competitions can be rescheduled.');
 if(m.coordination?.noShowReportedAt&&!m.coordination.decision)throw new AppError(409,'Publish a decision on the open no-show report before rescheduling.');
 const date=new Date(scheduledAt);if(date.getTime()<=Date.now())throw new AppError(422,'Choose a future match time.');
 const updated=await tx.match.update({where:{id},data:{scheduledAt:date,version:{increment:1}}});
 await tx.matchCoordination.updateMany({where:{matchId:id},data:{homeReadyAt:null,awayReadyAt:null,lobbyDetails:null,noShowReporterId:null,noShowReason:null,noShowReportedAt:null,decision:null}});
 const users=[m.home?.userId,m.away?.userId].filter((x):x is string=>!!x);
 await tx.notification.createMany({data:users.map(userId=>({userId,title:'Match rescheduled',message:`${m.tournament.name}: ${date.toISOString()}. ${reason}`,type:'SCHEDULE_CHANGE',link:'/matches/'+id}))});
 await tx.auditLog.create({data:{actorId,action:'MATCH_RESCHEDULED',entityType:'Match',entityId:id,metadata:{scheduledAt,previousTime:m.scheduledAt?.toISOString(),reason,previousReport:m.coordination?.noShowReportedAt?{reason:m.coordination.noShowReason,decision:m.coordination.decision}:null}}});return updated;
});}

