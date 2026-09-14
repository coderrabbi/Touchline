import type {Prisma} from '../generated/prisma/client.js';
import {AppError} from '../utils/errors.js';

export async function assertIdentityAvailable(tx:Prisma.TransactionClient,efootballUsername:string,otherIdentifiers:string[]=[],exceptUserId?:string) {
  for(const [index,value] of [efootballUsername,...otherIdentifiers].entries()) {
    const existing=await tx.user.findFirst({where:{...(exceptUserId?{id:{not:exceptUserId}}:{}),OR:[{username:{equals:value,mode:'insensitive'}},{email:{equals:value,mode:'insensitive'}},{profile:{efootballUsername:{equals:value,mode:'insensitive'}}}]},select:{id:true}});
    if(existing)throw new AppError(409,index===0?'That eFootball username is already in use.':'That email or username is already in use.',[{path:index===0?'efootballUsername':'username',message:'Choose a unique login identifier.'}]);
  }
}
