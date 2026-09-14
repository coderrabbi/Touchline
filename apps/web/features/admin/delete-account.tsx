'use client';
import {useRef,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import type {SessionUser} from '@touchline/shared';
import {api} from '@/lib/api';
import {Button} from '@/components/ui/button';
import {Feedback} from '@/components/ui/feedback';
export function DeleteAccount({user,onSaved}:{user:{id:string;name:string;username:string;role:string};onSaved:()=>Promise<unknown>}){
 const {data}=useQuery({queryKey:['session'],queryFn:()=>api<{user:SessionUser}>('/auth/me')});
 const dialog=useRef<HTMLDialogElement>(null),[reason,setReason]=useState(''),[confirmation,setConfirmation]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 if(data?.user.role!=='SUPER_ADMIN'||user.role==='SUPER_ADMIN'||data.user.id===user.id)return null;
 return <><Button variant="outline" size="sm" style={{marginTop:12,color:'#ffb4b4'}} onClick={()=>{setError('');setReason('');setConfirmation('');dialog.current?.showModal()}}>Delete account</Button><dialog ref={dialog} className="account-delete-dialog" onCancel={e=>{if(busy)e.preventDefault()}}><form onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{await api('/admin/users/'+user.id,{method:'DELETE',body:{reason,confirmation}});dialog.current?.close();await onSaved()}catch(e){setError(e instanceof Error?e.message:'Account deletion failed')}finally{setBusy(false)}}}><h2>Delete {user.name}?</h2><p>This permanently removes login access, the profile and chat messages, and signs out all sessions. Tournament and match records remain under “Deleted player”. This cannot be undone.</p><p className="small muted">For active tournaments, review their remaining fixtures and publish any necessary decisions separately.</p><label className="field">Reason for audit history<textarea className="input" value={reason} onChange={e=>setReason(e.target.value)} required minLength={10} maxLength={1000}/></label><label className="field">Type {user.username} to confirm<input className="input" value={confirmation} onChange={e=>setConfirmation(e.target.value)} autoComplete="off" required/></label><Feedback message={error} error/><div className="actions"><Button type="button" variant="outline" disabled={busy} onClick={()=>dialog.current?.close()}>Cancel</Button><Button type="submit" disabled={busy||reason.trim().length<10||confirmation!==user.username}>{busy?'Deleting…':'Permanently delete account'}</Button></div></form></dialog></>;
}
