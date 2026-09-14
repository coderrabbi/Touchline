import {prisma} from '../config/prisma.js';
import {Prisma} from '../generated/prisma/client.js';
export async function transaction<T>(fn:(tx:Prisma.TransactionClient)=>Promise<T>):Promise<T>{for(let attempt=0;;attempt++){try{return await prisma.$transaction(fn,{isolationLevel:'Serializable',maxWait:5000,timeout:15000})}catch(e){if(!(e instanceof Prisma.PrismaClientKnownRequestError)||e.code!=='P2034'||attempt>=3)throw e;await new Promise(resolve=>setTimeout(resolve,20*(attempt+1)))}}}
