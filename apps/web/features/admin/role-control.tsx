'use client';
import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import type {SessionUser} from '@touchline/shared';
import {api} from '@/lib/api';
import {Button} from '@/components/ui/button';
import {Feedback} from '@/components/ui/feedback';
export function RoleControl({user,onSaved}:{user:{id:string;name:string;role:string};onSaved:()=>Promise<unknown>}) {
  const {data}=useQuery({queryKey:['session'],queryFn:()=>api<{user:SessionUser}>('/auth/me')});
  const [role,setRole]=useState(user.role),[reason,setReason]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  if(data?.user.role!=='SUPER_ADMIN'||user.role==='SUPER_ADMIN'||data.user.id===user.id)return null;
  return <form style={{minWidth:200,marginTop:12}} onSubmit={async event=>{
    event.preventDefault();if(!confirm(`Change ${user.name} to ${role.replace('_',' ')}? This changes their platform permissions and signs them out of all sessions.`))return;
    setBusy(true);setError('');try{await api('/admin/users/'+user.id,{method:'PATCH',body:{role,reason}});await onSaved();setReason('');}catch(e){setError(e instanceof Error?e.message:'Role change failed.');}finally{setBusy(false);}
  }}><label className="field">Account role<select value={role} onChange={e=>setRole(e.target.value)}><option value="PLAYER">Player</option><option value="ADMIN">Admin</option><option value="SUPER_ADMIN">Super admin</option></select></label><label className="field">Reason<input className="input" value={reason} onChange={e=>setReason(e.target.value)} required minLength={10} maxLength={1000}/></label><Button variant="outline" size="sm" type="submit" disabled={busy||role===user.role||reason.trim().length<10}>{busy?'Saving…':'Update role'}</Button><Feedback message={error} error/></form>;
}
