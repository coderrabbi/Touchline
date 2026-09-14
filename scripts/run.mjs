import {spawn} from 'node:child_process';
import path from 'node:path';
// Keep child processes on the same supported Node runtime as this launcher.
const command=process.argv[2],args=process.argv.slice(3);
if(!command)throw new Error('Usage: node scripts/run.mjs <executable> [arguments]');
const child=spawn(command,args,{stdio:'inherit',shell:process.platform==='win32',env:{...process.env,PATH:path.dirname(process.execPath)+path.delimiter+process.env.PATH},windowsHide:true});
child.on('exit',code=>process.exit(code??1));
