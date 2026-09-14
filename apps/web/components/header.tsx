'use client';
import Link from 'next/link';
import {NotificationBell} from './notification-bell';
import {AuthLink} from './auth-link';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {useRouter} from 'next/navigation';
import {LogOut,UserRound,ShieldCheck} from 'lucide-react';
import type {SessionUser} from '@touchline/shared';
import {api,clearSession} from '@/lib/api';
import {Button} from './ui/button';
export function Header(){const router=useRouter(),cache=useQueryClient();const {data}=useQuery({queryKey:['session'],queryFn:()=>api<{user:SessionUser}>('/auth/me',{anonymous:true}),retry:false});const user=data?.user;return <header className="site-header"><Link href="/" className="brand" aria-label="Touchline home"><span className="brand-mark">T</span> TOUCHLINE<span className="lime">.</span></Link><nav aria-label="Main navigation"><Link href="/tournaments">Tournaments</Link><Link href="/dashboard">My arena</Link><Link href="/matches">Find match</Link><Link href="/#how-it-works">How it works</Link></nav><div className="header-actions">{user?<><NotificationBell key={user.id} userId={user.id}/><Button asChild variant="ghost"><Link href="/dashboard/profile"><UserRound size={17}/><span>{user.name.split(' ')[0]}</span></Link></Button>{user.role!=='PLAYER'&&<Button asChild variant="ghost"><Link href="/admin" aria-label="Administrator workspace"><ShieldCheck size={18}/></Link></Button>}<Button variant="ghost" aria-label="Log out" onClick={async()=>{try{await api('/auth/logout',{method:'POST'});}finally{clearSession();cache.removeQueries();router.push('/login');router.refresh()}}}><LogOut size={18}/></Button></>:<><Button asChild variant="ghost"><AuthLink href="/login">Log in</AuthLink></Button><Button asChild><AuthLink href="/register">Get started ↗</AuthLink></Button></>}</div></header>}

