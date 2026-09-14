'use client';
import Link from 'next/link';
import {Mail} from 'lucide-react';
import {useQuery} from '@tanstack/react-query';
import type {SessionUser} from '@touchline/shared';
import {api} from '@/lib/api';

export function VerificationNotice() {
  const {data}=useQuery({
    queryKey:['session'],
    queryFn:()=>api<{user:SessionUser;emailDeliveryMode?:string}>('/auth/me',{anonymous:true}),
    retry:false,
    refetchOnWindowFocus:true,
    refetchInterval:query=>query.state.data?.user&&!query.state.data.user.emailVerified?30000:false,
  });
  if(!data?.user||data.user.emailVerified)return null;
  const local=data.emailDeliveryMode==='development';
  return <aside className="verification-notice" role="status" aria-label="Email verification required">
    <Mail size={22} aria-hidden="true"/>
    <div><p>{local?'Please verify your email to join a tournament.':'Verification link sent to your email. To join the tournament, please verify your email.'}</p>
      {local&&<p className="small">Local preview: your verification link is saved in the private .local/mail folder on this computer, instead of your email inbox.</p>}
    </div>
    <Link href="/verify-email" className="button button-outline">Verify email / Resend →</Link>
  </aside>;
}
