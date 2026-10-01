"use client";
import {useEffect,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {api,ApiError} from '@/lib/api';
import {safeDestination} from '@/lib/auth-destination';
import {Button} from '@/components/ui/button';
export function SessionRecovery(){
  const params=useSearchParams();
  const destination=safeDestination(params.get('next'))||'/dashboard';
  const [failure,setFailure]=useState('');
  const [attempt,setAttempt]=useState(0);
  useEffect(()=>{
    let active=true;
    api('/auth/me').then(()=>{if(active)window.location.replace(destination)}).catch(error=>{
      if(!active)return;
      if(error instanceof ApiError&&(error.status===401||error.status===403)){
        window.location.replace('/login?next='+encodeURIComponent(destination));
      }else setFailure('We could not reconnect to your account. Please try again.');
    });
    return ()=>{active=false};
  },[destination,attempt]);
  return <section className="panel session-recovery"><h1>Restoring your session</h1><p role="status">{failure||'Please wait. We’ll return you to your previous page.'}</p>{failure&&<Button onClick={()=>{setFailure('');setAttempt(value=>value+1)}}>Try again</Button>}</section>;
}
