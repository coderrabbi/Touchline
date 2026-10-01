"use client";
import Link from 'next/link';
import {useRef,useState} from 'react';
import {NotificationBell} from './notification-bell';
import {AuthLink} from './auth-link';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {usePathname,useRouter} from 'next/navigation';
import {LogOut,UserRound,ShieldCheck,Menu,X} from 'lucide-react';
import type {SessionUser} from '@touchline/shared';
import {api,clearSession} from '@/lib/api';
import {Button} from './ui/button';

export function Header(){
 const router=useRouter(),pathname=usePathname(),cache=useQueryClient();
 const [openPath,setOpenPath]=useState<string|null>(null);
 const open=openPath===pathname;
 const toggle=useRef<HTMLButtonElement>(null);
 const {data}=useQuery({queryKey:['session'],queryFn:()=>api<{user:SessionUser}>('/auth/me',{anonymous:true}),retry:false});
 const user=data?.user;
 const close=()=>setOpenPath(null);
 return <header className={'site-header'+(open?' menu-open':'')} onKeyDown={event=>{
  if(event.key==='Escape'&&open){close();toggle.current?.focus();}
 }}>
  <Link href="/" className="brand" aria-label="Touchline home" onClick={close}><span className="brand-mark">T</span> TOUCHLINE<span className="lime">.</span></Link>
  <button ref={toggle} type="button" className="button button-ghost header-menu-toggle" aria-label={open?'Close navigation menu':'Open navigation menu'} aria-expanded={open} aria-controls="header-navigation header-account-actions" onClick={()=>setOpenPath(open?null:pathname)}>{open?<X size={22}/>:<Menu size={22}/>}</button>
  <nav id="header-navigation" aria-label="Main navigation" onClick={close}>
   <Link href="/tournaments">Tournaments</Link><Link href="/dashboard">My arena</Link><Link href="/matches">Find match</Link><Link href="/#how-it-works">How it works</Link>
  </nav>
  <div className="header-actions">
   {user&&<NotificationBell key={user.id} userId={user.id}/>}
   <div id="header-account-actions" className="header-account-actions" onClick={close}>
    {user?<>
     <Button asChild variant="ghost"><Link href="/dashboard/profile" aria-label="My profile"><UserRound size={17}/><span className="header-desktop-name">{user.name.split(' ')[0]}</span><span className="header-mobile-label">My profile</span></Link></Button>
     {user.role!=='PLAYER'&&<Button asChild variant="ghost"><Link href="/admin" aria-label="Administrator workspace"><ShieldCheck size={18}/><span className="header-mobile-label">Admin</span></Link></Button>}
     <Button variant="ghost" aria-label="Log out" onClick={async()=>{try{await api('/auth/logout',{method:'POST'});}finally{clearSession();cache.removeQueries();router.push('/login');router.refresh()}}}><LogOut size={18}/><span className="header-mobile-label">Log out</span></Button>
    </>:<><Button asChild variant="ghost"><AuthLink href="/login">Log in</AuthLink></Button><Button asChild><AuthLink href="/register">Get started ↗</AuthLink></Button></>}
   </div>
  </div>
 </header>;
}
