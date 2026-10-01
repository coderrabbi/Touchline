import {databaseConnectionString} from './database-transport.js';
import {PrismaPg} from '@prisma/adapter-pg';
import {PrismaClient} from '../generated/prisma/client.js';
import {env} from './env.js';
export const prisma=new PrismaClient({adapter:new PrismaPg({connectionString:databaseConnectionString(env.DATABASE_URL,env.NODE_ENV==='production'),max:10})});
