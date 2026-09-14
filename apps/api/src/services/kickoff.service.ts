import {transaction} from './transaction.js';
import {generateInTransaction} from './fixture.service.js';
import {audit} from './tournament.service.js';
import {AppError} from '../utils/errors.js';

export async function kickoffNow(actorId:string,id:string) {
  return transaction(async tx=>{
    const actor=await tx.user.findUnique({where:{id:actorId},select:{role:true,status:true}});
    if(!actor||actor.status!=='ACTIVE'||!['ADMIN','SUPER_ADMIN'].includes(actor.role))throw new AppError(403,'Only administrators can start a tournament.');
    const t=await tx.tournament.findUnique({where:{id},include:{participants:true,_count:{select:{matches:true,registrations:{where:{status:'PENDING'}}}}}});
    if(!t)throw new AppError(404,'Tournament not found.');
    if(!['REGISTRATION_OPEN','REGISTRATION_CLOSED','UPCOMING'].includes(t.status))throw new AppError(409,'Publish the tournament first. Live, completed and cancelled tournaments cannot be started again.');
    if(t.participants.length<t.minPlayers)throw new AppError(409,`At least ${t.minPlayers} approved players are required to kick off.`);
    if(t._count.registrations)throw new AppError(409,'Review all pending registrations before kickoff.');
    const now=new Date(),deadline=new Date(Math.min(t.registrationDeadline.getTime(),now.getTime()-1));
    await tx.tournament.update({where:{id},data:{status:'REGISTRATION_CLOSED',startsAt:now,registrationDeadline:deadline,registrationStartsAt:new Date(Math.min(t.registrationStartsAt.getTime(),deadline.getTime()-1))}});
    if(!t._count.matches)await generateInTransaction(tx,actorId,id);
    else {
      const scheduled=await tx.match.findMany({where:{tournamentId:id,status:'SCHEDULED'}});
      for(const match of scheduled)await tx.match.update({where:{id:match.id},data:{scheduledAt:new Date(now.getTime()+Math.max(0,(match.scheduledAt?.getTime()??t.startsAt.getTime())-t.startsAt.getTime()))}});
    }
    await tx.match.updateMany({where:{tournamentId:id,status:'SCHEDULED',round:1,homeId:{not:null},awayId:{not:null}},data:{status:'LIVE'}});
    const result=await tx.tournament.update({where:{id},data:{status:'ONGOING',version:{increment:1}}});
    await tx.notification.createMany({data:t.participants.map(p=>({userId:p.userId,title:'Tournament kicks off now',message:`${t.name} is live. Check your opening match.`,type:'SCHEDULE',link:'/tournaments/'+t.slug}))});
    await audit(tx,actorId,'IMMEDIATE_KICKOFF',id,{previousStartsAt:t.startsAt.toISOString(),startsAt:now.toISOString()});
    return result;
  });
}
