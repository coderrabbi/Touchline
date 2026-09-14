import sharp from 'sharp';
import {randomUUID} from 'node:crypto';
import {prisma} from '../config/prisma.js';
import {env} from '../config/env.js';
import type {UploadPurpose} from '../generated/prisma/client.js';
import {storage} from '../utils/storage.js';
import {AppError} from '../utils/errors.js';
export async function upload(userId:string,purpose:UploadPurpose,buffer:Buffer){let image:Buffer;try{image=await sharp(buffer,{limitInputPixels:20000000}).rotate().resize({width:purpose==='AVATAR'?512:2400,withoutEnlargement:true}).webp({quality:90}).toBuffer()}catch{throw new AppError(422,'Choose a valid JPG, PNG or WebP image under 5 MB.')}const id=randomUUID(),key=id+'.webp';await storage.put(key,image);try{const record=await prisma.upload.create({data:{id,ownerId:userId,purpose,provider:process.env.STORAGE_PROVIDER||'local',objectKey:key,url:env.BACKEND_URL+'/api/v1/uploads/'+id,mimeType:'image/webp',sizeBytes:image.length}});if(purpose==='AVATAR')await prisma.profile.update({where:{userId},data:{avatarUrl:record.url}});return record}catch(e){await storage.remove(key);throw e}}
export async function read(id:string,userId?:string,admin=false){const item=await prisma.upload.findUnique({where:{id}});if(!item)throw new AppError(404,'Image not found.');if(item.purpose==='MATCH_EVIDENCE'&&!admin&&item.ownerId!==userId){const permitted=userId&&await prisma.matchResultSubmission.findFirst({where:{OR:[{evidenceId:id},{disputeEvidenceId:id}],match:{OR:[{home:{userId}},{away:{userId}}]}}});if(!permitted)throw new AppError(403,'This evidence is private.')}return {data:await storage.get(item.objectKey),mime:item.mimeType}}
