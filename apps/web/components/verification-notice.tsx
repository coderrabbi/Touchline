"use client";
import {useEffect,useState} from 'react';
import {Mail} from 'lucide-react';
import {useQuery} from '@tanstack/react-query';
import type {SessionUser} from '@touchline/shared';
import {api} from '@/lib/api';
import {Button} from './ui/button';
export function VerificationNotice(){
 const {data}=useQuery({queryKey:['session'],queryFn:()=>api<{user:SessionUser;emailDeliveryMode?:string}>('/auth/me',{anonymous:true}),retry:false,refetchOnWindowFocus:true,refetchInterval:query=>query.state.data?.user&&!query.state.data.user.emailVerified?30000:false});
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[failure,setFailure]=useState(''),[cooldown,setCooldown]=useState(0);
 useEffect(()=>{if(!cooldown)return;const timer=setTimeout(()=>setCooldown(value=>Math.max(0,value-1)),1000);return()=>clearTimeout(timer)},[cooldown]);
 if(!data?.user||data.user.emailVerified)return null;
 const local=data.emailDeliveryMode==='development';
 return <aside className="verification-notice" aria-label="Email verification required">
  <Mail size={22} aria-hidden="true"/>
  <div><p>Verify your email to join tournaments. Check your inbox and spam folder for the verification link.</p>
   {local&&<p className="small">Local preview mode saves verification emails on this computer instead of sending them.</p>}
   {message&&<p className="small" role="status">{message}</p>}
   {failure&&<p className="field-error" role="alert">{failure}</p>}
  </div>
  <Button variant="outline" disabled={busy||cooldown>0} onClick={async()=>{
   setBusy(true);setMessage('');setFailure('');
   try{
    const result=await api<{deliveryMode:string}>('/auth/resend-verification',{method:'POST',body:{email:data.user.email}});
    setMessage(result.deliveryMode==='development'?'Verification email saved to the local development inbox.':`Verification email requested for ${data.user.email}. Check your inbox and spam folder.`);
    setCooldown(60);
   }catch(error){setFailure(error instanceof Error?error.message:'Could not send the verification email. Please try again.')}
   finally{setBusy(false)}
  }}>{busy?'Sending...':cooldown>0?`Resend in ${cooldown}s`:'Verify email / Resend'}</Button>
 </aside>;
}
