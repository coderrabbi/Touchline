import {prisma} from '../config/prisma.js';
export async function sendMatchReminders(now=new Date()){
 const matches=await prisma.match.findMany({where:{status:{in:['SCHEDULED','LIVE']},scheduledAt:{gte:new Date(now.getTime()-15*60000),lte:new Date(now.getTime()+30*60000)},tournament:{status:{in:['UPCOMING','ONGOING']}}},include:{home:{include:{user:{select:{status:true,profile:{select:{matchReminders:true}}}}}},away:{include:{user:{select:{status:true,profile:{select:{matchReminders:true}}}}}},tournament:{select:{name:true}}}});
 const data=matches.flatMap(m=>[m.home,m.away].filter(p=>p&&p.user.status==='ACTIVE'&&p.user.profile?.matchReminders!==false).map(p=>({userId:p!.userId,title:'Your match check-in is open',message:`${m.tournament.name}: open the match room to check in and coordinate with your opponent.`,type:'MATCH_REMINDER',link:'/matches/'+m.id,dedupeKey:`checkin:${m.id}:${m.scheduledAt!.toISOString()}:${p!.userId}`})));
 if(data.length)await prisma.notification.createMany({data,skipDuplicates:true});
}
export function startMatchReminders(){let running=false;const tick=async()=>{if(running)return;running=true;try{await sendMatchReminders()}catch{console.error('Match reminder delivery failed; retrying next minute.')}finally{running=false}};const timer=setInterval(()=>void tick(),60000);timer.unref();void tick();return()=>clearInterval(timer);}
