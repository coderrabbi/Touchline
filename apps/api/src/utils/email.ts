import * as tls from 'node:tls';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
import nodemailer from 'nodemailer';
import {env} from '../config/env.js';
export async function sendAccountEmail(to:string,kind:'verify'|'reset',token:string){
 const url=new URL(kind==='verify'?'/verify-email':'/reset-password',env.FRONTEND_URL);url.searchParams.set('token',token);
 const subject=kind==='verify'?'Verify your Touchline account':'Reset your Touchline password';
 const text=`${subject}\n\nOpen this link: ${url}\n\n${kind==='verify'?'This link expires in 24 hours.':'This link expires in 30 minutes.'} If you did not request this, ignore this email.`;
 if(env.EMAIL_MODE==='development'){await mkdir(env.DEV_INBOX_DIR,{recursive:true});await writeFile(path.join(env.DEV_INBOX_DIR,randomUUID()+'.json'),JSON.stringify({to,subject,text,createdAt:new Date().toISOString()}),{mode:0o600});return}
 const trustedCa=process.env.EMAIL_CA_FILE?await readFile(process.env.EMAIL_CA_FILE,'utf8'):process.env.EMAIL_USE_SYSTEM_CA==='true'&&typeof tls.getCACertificates==='function'?[...tls.getCACertificates('default'),...tls.getCACertificates('system')]:undefined;
 const transport=nodemailer.createTransport({host:env.EMAIL_HOST,tls:trustedCa?{ca:trustedCa}:undefined,port:env.EMAIL_PORT,secure:env.EMAIL_PORT===465,requireTLS:env.EMAIL_PORT!==465,auth:env.EMAIL_USER?{user:env.EMAIL_USER,pass:env.EMAIL_PASSWORD}:undefined,connectionTimeout:10000,socketTimeout:15000});
 await transport.sendMail({from:env.EMAIL_FROM,to,subject,text});
}



