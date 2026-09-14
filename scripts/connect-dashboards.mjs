import fs from 'node:fs';
fs.writeFileSync('apps/web/app/admin/page.tsx',"import {AdminConsole} from '@/features/admin/admin-console';\nexport default function Page(){return <AdminConsole/>}\n");
fs.writeFileSync('apps/web/app/dashboard/page.tsx',"import {PlayerArena} from '@/features/dashboard/player-arena';\nexport default function Page(){return <PlayerArena/>}\n");
const f='apps/web/components/workspace.tsx';let s=fs.readFileSync(f,'utf8');s=s.replace('<Link href="/dashboard/profile">','<Link href="/dashboard/tournaments">My tournaments</Link><Link href="/dashboard/matches">My matches</Link><Link href="/dashboard/notifications">Notifications</Link><Link href="/dashboard/profile">');fs.writeFileSync(f,s);
