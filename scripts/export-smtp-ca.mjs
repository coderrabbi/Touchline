import * as tls from 'node:tls';
import fs from 'node:fs';
import path from 'node:path';
if(typeof tls.getCACertificates!=='function'||!process.env.EMAIL_CA_FILE)process.exit(1);
const target=process.env.EMAIL_CA_FILE;
fs.mkdirSync(path.dirname(target),{recursive:true});
fs.writeFileSync(target,[...tls.getCACertificates('default'),...tls.getCACertificates('system')].join('\n'));
