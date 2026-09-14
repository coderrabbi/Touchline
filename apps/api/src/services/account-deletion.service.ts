import {randomUUID} from 'node:crypto';
import {transaction} from './transaction.js';
import {AppError} from '../utils/errors.js';
export function deleteAccount(actorId:string,targetId:string,reason:string,confirmation:string){return transaction(async tx=>{
 const actor=await tx.user.findUnique({where:{id:actorId}});
 if(!actor||actor.role!=='SUPER_ADMIN'||actor.status!=='ACTIVE'||actor.deletedAt)throw new AppError(403,'Only super administrators can delete accounts.');
 if(actorId===targetId)throw new AppError(409,'You cannot delete your own account.');
 const user=await tx.user.findUnique({where:{id:targetId}});
 if(!user||user.deletedAt)throw new AppError(404,'Account not found.');
 if(user.role==='SUPER_ADMIN')throw new AppError(403,'Super administrator accounts are protected from deletion.');
 if(confirmation!==user.username)throw new AppError(422,'Enter the exact username to confirm deletion.');
 const replacement='deleted_'+randomUUID().replaceAll('-','').slice(0,16);
 await tx.user.update({where:{id:targetId},data:{deletedAt:new Date(),name:'Deleted player',username:replacement,email:randomUUID()+'@deleted.invalid',passwordHash:'!deleted',status:'BANNED',role:'PLAYER',restrictionReason:'Account deleted',tokenVersion:{increment:1}}});
 await tx.profile.deleteMany({where:{userId:targetId}});
 await tx.refreshToken.deleteMany({where:{userId:targetId}});
 await tx.passwordResetToken.deleteMany({where:{userId:targetId}});
 await tx.emailVerificationToken.deleteMany({where:{userId:targetId}});
 await tx.notification.deleteMany({where:{userId:targetId}});
 await tx.chatMessage.deleteMany({where:{authorId:targetId}});
 await tx.userAchievement.deleteMany({where:{userId:targetId}});
 await tx.tournamentRegistration.updateMany({where:{userId:targetId,status:'PENDING'},data:{status:'REJECTED',reviewReason:'Account deleted',reviewedAt:new Date()}});
 await tx.auditLog.create({data:{actorId,action:'ACCOUNT_DELETED',entityType:'User',entityId:targetId,metadata:{reason,recordsRetained:'Anonymized tournament and match records retained.'}}});
 return null;
});}
