import {readFile} from 'node:fs/promises';
import * as tls from 'node:tls';
import process from 'node:process';
import console from 'node:console';
import 'dotenv/config';
import nodemailer from 'nodemailer';
const connectionOnly=process.argv.includes('--connection-only');
const mode=process.env.EMAIL_MODE||'development';
if(!connectionOnly&&mode!=='smtp'){console.log('Email mode: local development inbox. Configure EMAIL_MODE=smtp and your provider settings before public launch.');process.exitCode=1;}
else if(!process.env.EMAIL_HOST||!process.env.EMAIL_FROM){console.log('Missing SMTP host or sender. Configure EMAIL_HOST and EMAIL_FROM securely.');process.exitCode=1;}
else{
 const port=Number(process.env.EMAIL_PORT||587);
 const trustedCa=process.env.EMAIL_CA_FILE?await readFile(process.env.EMAIL_CA_FILE,'utf8'):process.env.EMAIL_USE_SYSTEM_CA==='true'&&typeof tls.getCACertificates==='function'?[...tls.getCACertificates('default'),...tls.getCACertificates('system')]:undefined;
 const transport=nodemailer.createTransport({host:process.env.EMAIL_HOST,port,tls:trustedCa?{ca:trustedCa}:undefined,secure:port===465,requireTLS:port!==465,auth:!connectionOnly&&process.env.EMAIL_USER?{user:process.env.EMAIL_USER,pass:process.env.EMAIL_PASSWORD}:undefined,connectionTimeout:10000,socketTimeout:15000});
 try{await transport.verify();console.log(connectionOnly?'SMTP connection and TLS passed. Login was not attempted; no email was sent.':'SMTP connection and authentication passed. No email was sent. Inbox delivery still needs a verification walkthrough.');}
 catch(error){
  const code=typeof error?.code==='string'?error.code:'';
  const hints={EAUTH:'Gmail rejected the login. Generate an App Password while signed into the exact sender account, then retry. Use the App Password, not the normal account password.',ETIMEDOUT:'The SMTP connection timed out. Check firewall, VPN and network access to Gmail SMTP.',EDNS:'The SMTP hostname could not be resolved. Check your internet connection and DNS.',ECONNREFUSED:'The SMTP connection was refused. Check firewall or network restrictions.',ESOCKET:'The secure SMTP connection failed. Check the certificate diagnostic below.',ECONNECTION:'The SMTP connection could not be established.'};
  console.error(hints[code]||'SMTP verification failed. Check network access and Gmail account settings.');
  const certificateCodes=['SELF_SIGNED_CERT_IN_CHAIN','DEPTH_ZERO_SELF_SIGNED_CERT','UNABLE_TO_VERIFY_LEAF_SIGNATURE','UNABLE_TO_GET_ISSUER_CERT_LOCALLY','CERT_HAS_EXPIRED'];
  const tlsCode=[code,error?.cause?.code,error?.reason].find(c=>certificateCodes.includes(c));
  const certificateMessage=typeof error?.message==='string'&&/certificate|self.signed|issuer/i.test(error.message);
  if(tlsCode||certificateMessage)console.error('Certificate trust failed. Use the trusted Windows certificate store with a supported Node version, or configure NODE_EXTRA_CA_CERTS with your trusted CA file. Do not disable TLS verification.');
  if(/^[A-Z_]{2,50}$/.test(code))console.error('Diagnostic code: '+code);
  if(Number.isInteger(error?.responseCode))console.error('SMTP response code: '+error.responseCode);
  console.error('No passwords, server response text or tokens are printed.');process.exitCode=1;
 }finally{transport.close();}
}


