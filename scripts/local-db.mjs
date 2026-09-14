import {spawnSync} from 'node:child_process';
import {existsSync,mkdirSync,readFileSync} from 'node:fs';
import path from 'node:path';
const root=process.cwd(),data=path.join(root,'.local','postgres'),bin=process.env.POSTGRES_BIN||'C:/Program Files/PostgreSQL/18/bin';
function run(name,args){let r=spawnSync(path.join(bin,name+'.exe'),args,{stdio:'inherit',windowsHide:true});if(r.status!==0)process.exit(r.status||1)}
if(process.argv[2]==='stop'){run('pg_ctl',['-D',data,'-m','fast','stop']);process.exit()}
if(!existsSync(path.join(data,'PG_VERSION'))){mkdirSync(data,{recursive:true});run('initdb',['-D',data,'-U','touchline','--pwfile='+path.join(root,'.local/postgres-password'),'--auth=scram-sha-256','--encoding=UTF8','--locale=C'])}
const running=spawnSync(path.join(bin,'pg_ctl.exe'),['-D',data,'status'],{stdio:'ignore',windowsHide:true}).status===0;
if(!running)run('pg_ctl',['-D',data,'-l',path.join(root,'.local','postgres.log'),'-o','-p 55432 -h 127.0.0.1','-w','start']);
const password=readFileSync('.local/postgres-password','utf8').trim();
const check=spawnSync(path.join(bin,'psql.exe'),['-h','127.0.0.1','-p','55432','-U','touchline','-d','postgres','-tAc',"SELECT 1 FROM pg_database WHERE datname='touchline'"],{env:{...process.env,PGPASSWORD:password},encoding:'utf8',windowsHide:true});
if(check.status!==0)throw Error('Cannot connect to isolated project PostgreSQL');
if(check.stdout.trim()!=='1'){const r=spawnSync(path.join(bin,'createdb.exe'),['-h','127.0.0.1','-p','55432','-U','touchline','touchline'],{env:{...process.env,PGPASSWORD:password},stdio:'inherit',windowsHide:true});if(r.status!==0)throw Error('Database creation failed')}
console.log('Isolated Touchline PostgreSQL ready on 127.0.0.1:55432.');
