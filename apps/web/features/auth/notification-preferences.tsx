'use client';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {useState} from 'react';
import {api} from '@/lib/api';
import {Feedback} from '@/components/ui/feedback';
import {QueryState} from '@/components/query-state';
export function NotificationPreferences(){const cache=useQueryClient();const {data,error,isPending,refetch}=useQuery({queryKey:['notification-preferences'],queryFn:()=>api<{matchReminders:boolean}>('/users/me/notification-preferences')});const [busy,setBusy]=useState(false),[failure,setFailure]=useState('');return <section className="panel"><h2>Notification preferences</h2><QueryState pending={isPending} error={error} retry={()=>void refetch()}/>{data&&<label style={{display:'block',marginTop:16}}><input type="checkbox" checked={data.matchReminders} disabled={busy} onChange={async e=>{const matchReminders=e.target.checked;cache.setQueryData(['notification-preferences'],{matchReminders});setBusy(true);setFailure('');try{await api('/users/me/notification-preferences',{method:'PATCH',body:{matchReminders}});await refetch()}catch(e){cache.setQueryData(['notification-preferences'],data);setFailure(e instanceof Error?e.message:'Unable to save')}finally{setBusy(false)}}}/> Remind me when match check-in opens</label>}<p className="small muted">Reminders appear in your notification bell. Enable or mute sound in that menu. Registration, result, dispute and schedule updates remain enabled.</p><Feedback message={failure} error/></section>}

