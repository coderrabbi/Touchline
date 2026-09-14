import {Router} from 'express';
import {z} from 'zod';
import {requireAuth,requireCsrf} from '../middleware/auth.js';
import {verifyToken} from '../utils/tokens.js';
import {prisma} from '../config/prisma.js';
import {AppError} from '../utils/errors.js';
import {communityAccess,communitySnapshot,sendMessage,updateGroupLink,messageSchema,linkSchema,communityEvents} from '../services/community.service.js';

export const communityRoutes=Router();
const connections=new Map<string,number>();
communityRoutes.get('/tournaments/:id/community',requireAuth,async(req,res)=>{
  res.json({success:true,message:'Tournament community.',data:await communitySnapshot(req.auth!.userId,z.uuid().parse(req.params.id))});
});
communityRoutes.post('/tournaments/:id/community/messages',requireAuth,requireCsrf,async(req,res)=>{
  res.status(201).json({success:true,message:'Message sent.',data:await sendMessage(req.auth!.userId,z.uuid().parse(req.params.id),messageSchema.parse(req.body))});
});
communityRoutes.patch('/tournaments/:id/community',requireAuth,requireCsrf,async(req,res)=>{
  res.json({success:true,message:'Group link saved.',data:await updateGroupLink(req.auth!.userId,z.uuid().parse(req.params.id),linkSchema.parse(req.body).groupLink)});
});
communityRoutes.get('/tournaments/:id/community/stream',requireAuth,async(req,res)=>{
  const id=z.uuid().parse(req.params.id),userId=req.auth!.userId;
  await communityAccess(userId,id);
  if ((connections.get(userId)||0)>=5) throw new AppError(429,'Close another chat tab before connecting.');
  connections.set(userId,(connections.get(userId)||0)+1);
  res.set({'Content-Type':'text/event-stream','Cache-Control':'no-store, no-transform','X-Accel-Buffering':'no'});
  res.flushHeaders();
  let closed=false,busy=false,queued=false,previous='';
  const cleanup=()=>{
    if(closed)return;
    closed=true;clearInterval(interval);clearTimeout(expiry);communityEvents.off(id,changed);
    const remaining=(connections.get(userId)||1)-1;
    if(remaining)connections.set(userId,remaining);else connections.delete(userId);
  };
  const sync=async()=>{
    if(closed)return;
    if(busy){queued=true;return;}
    busy=true;
    try {
      const claims=verifyToken(req.cookies.tl_access as string,'access');
      const session=await prisma.refreshToken.findFirst({where:{userId,familyId:claims.familyId,revokedAt:null,expiresAt:{gt:new Date()},user:{status:'ACTIVE',tokenVersion:claims.version}}});
      if(!session)throw new AppError(401,'Session expired.');
      const snapshot=JSON.stringify(await communitySnapshot(userId,id));
      if(!closed) {
        if(snapshot!==previous){res.write(`event: snapshot\ndata: ${snapshot}\n\n`);previous=snapshot;}
        else res.write(': heartbeat\n\n');
        if(res.writableLength>262144){cleanup();res.end();}
      }
    } catch {
      if(!closed){res.write('event: access-check\ndata: {}\n\n');cleanup();res.end();}
    } finally {busy=false;if(queued&&!closed){queued=false;void sync();}}
  };
  const changed=()=>{void sync();};
  // Immediate local delivery; periodic database reads also catch changes from other API replicas.
  const interval=setInterval(changed,5000),expiry=setTimeout(()=>{cleanup();res.end();},5*60000);
  res.on('close',cleanup);communityEvents.on(id,changed);void sync();
});
