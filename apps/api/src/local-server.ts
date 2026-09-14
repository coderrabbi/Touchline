import {startMatchReminders} from './services/reminder.service.js';
import {createApp} from './app.js';
import {env} from './config/env.js';
import {prisma} from './config/prisma.js';
const server=createApp().listen(env.PORT,()=>console.log(`Touchline API: ${env.BACKEND_URL}`));
const stopReminders=startMatchReminders();
async function shutdown(){stopReminders();server.close(async()=>{await prisma.$disconnect();process.exit(0)});setTimeout(()=>process.exit(1),10000).unref()}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);

