import {EventEmitter} from 'node:events';
import {z} from 'zod';
import {prisma} from '../config/prisma.js';
import type {Prisma} from '../generated/prisma/client.js';
import {AppError} from '../utils/errors.js';
import {transaction} from './transaction.js';
import {audit} from './tournament.service.js';

export const communityEvents = new EventEmitter();
communityEvents.setMaxListeners(0);
export const messageSchema = z.object({body:z.string().trim().min(1).max(1000),clientId:z.uuid()}).strict();
export const linkSchema = z.object({groupLink:z.string().trim().max(2048).refine(value => {
  if (!value) return true;
  try {const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password;} catch {return false;}
}, 'Use a complete HTTPS group link, or leave it empty to remove it.')}).strict();
const author = {id:true,name:true,username:true} as const;

export async function communityAccess(userId:string, tournamentId:string, db:Prisma.TransactionClient=prisma) {
  const user=await db.user.findUnique({where:{id:userId},select:{role:true,status:true,emailVerified:true}});
  if (!user || user.status!=='ACTIVE') throw new AppError(403,'This account cannot access group chat.');
  const tournament=await db.tournament.findUnique({where:{id:tournamentId},select:{status:true}});
  if (!tournament) throw new AppError(404,'Tournament not found.');
  const admin=user.role==='ADMIN'||user.role==='SUPER_ADMIN';
  if (!admin && !await db.tournamentParticipant.findUnique({where:{tournamentId_userId:{tournamentId,userId}}}))
    throw new AppError(403,'Group chat and the group link are available to approved tournament participants and administrators.');
  return {canManage:admin,canSend:(admin||user.emailVerified)&&!['COMPLETED','CANCELLED'].includes(tournament.status)};
}
export async function communitySnapshot(userId:string,tournamentId:string) {
  const permissions=await communityAccess(userId,tournamentId);
  const [settings,messages]=await Promise.all([
    prisma.tournamentCommunity.findUnique({where:{tournamentId}}),
    prisma.chatMessage.findMany({where:{tournamentId},include:{author:{select:author}},orderBy:[{createdAt:'desc'},{id:'desc'}],take:100}),
  ]);
  return {...permissions,groupLink:settings?.groupLink||null,messages:messages.reverse()};
}
export async function sendMessage(userId:string,tournamentId:string,input:z.infer<typeof messageSchema>) {
  const message=await transaction(async tx=>{
    const access=await communityAccess(userId,tournamentId,tx);
    if (!access.canSend) throw new AppError(403,'Chat is read-only. Verify your email or check the tournament status.');
    const existing=await tx.chatMessage.findUnique({where:{authorId_clientId:{authorId:userId,clientId:input.clientId}},include:{author:{select:author}}});
    if (existing) {
      if (existing.tournamentId!==tournamentId||existing.body!==input.body) throw new AppError(409,'This message identifier has already been used.');
      return existing;
    }
    if(await tx.chatMessage.count({where:{authorId:userId,createdAt:{gt:new Date(Date.now()-10000)}}})>=5)
      throw new AppError(429,'Please wait a moment before sending more messages.');
    const created=await tx.chatMessage.create({data:{...input,authorId:userId,tournamentId},include:{author:{select:author}}});
    const tournament=await tx.tournament.findUniqueOrThrow({where:{id:tournamentId},select:{name:true,slug:true,createdById:true,participants:{select:{userId:true}}}});
    const recipients=[...new Set([...tournament.participants.map(p=>p.userId),tournament.createdById])].filter(id=>id!==userId);
    await tx.notification.createMany({data:recipients.map(id=>({userId:id,title:'New group message',message:created.author.name+' sent a message in '+tournament.name,type:'CHAT',link:'/tournaments/'+tournament.slug+'?tab=Groups'}))});
    return created;
  });
  communityEvents.emit(tournamentId);
  return message;
}
export async function updateGroupLink(userId:string,tournamentId:string,groupLink:string) {
  await transaction(async tx=>{
    if (!(await communityAccess(userId,tournamentId,tx)).canManage) throw new AppError(403,'Only administrators can update the group link.');
    await tx.tournamentCommunity.upsert({where:{tournamentId},create:{tournamentId,groupLink:groupLink||null},update:{groupLink:groupLink||null}});
    await audit(tx,userId,'GROUP_LINK_UPDATED',tournamentId,{removed:!groupLink});
  });
  communityEvents.emit(tournamentId);
  return {groupLink:groupLink||null};
}
