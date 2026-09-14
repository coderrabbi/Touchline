'use client';
import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {api} from '@/lib/api';
import type {MatchRecord} from '@/lib/competition';
import {Button} from '@/components/ui/button';
import {Feedback} from '@/components/ui/feedback';
import {QueryState} from '@/components/query-state';
interface Room{homeReadyAt:string|null;awayReadyAt:string|null;lobbyDetails:string|null;noShowReason:string|null;noShowReportedAt:string|null;decision:string|null}
export function MatchCoordination({match,admin}:{match:MatchRecord;admin:boolean}){
 const {data,error,isPending,refetch}=useQuery({queryKey:['coordination',match.id],queryFn:()=>api<Room>('/matches/'+match.id+'/coordination'),refetchInterval:5000});
 const [lobby,setLobby]=useState(''),[reason,setReason]=useState(''),[editing,setEditing]=useState(false),[busy,setBusy]=useState(false),[failure,setFailure]=useState(''),[message,setMessage]=useState('');
 async function act(action:string,text?:string){setBusy(true);setFailure('');try{await api('/matches/'+match.id+'/coordination',{method:'POST',body:{action,text}});setMessage('Saved. The relevant players have been notified.');setEditing(false);setReason('');await refetch()}catch(e){setFailure(e instanceof Error?e.message:'Unable to save. Please try again.')}finally{setBusy(false)}}
 const active=['SCHEDULED','LIVE'].includes(match.status);
 return <section className="panel" style={{marginTop:24}}><h2>Private match coordination</h2><p className="small muted">Only the opponents and administrators can view this room. Times are shown in your device timezone.</p><QueryState pending={isPending} error={error} retry={()=>void refetch()}/>{data&&<>
 <div className="field-grid" style={{margin:'20px 0'}}><div><strong>{match.home?.user.name||'Opponent pending'}</strong><p className={data.homeReadyAt?'lime':'muted'}>{data.homeReadyAt?'✓ Ready to play':'Awaiting check-in'}</p></div><div><strong>{match.away?.user.name||'Opponent pending'}</strong><p className={data.awayReadyAt?'lime':'muted'}>{data.awayReadyAt?'✓ Ready to play':'Awaiting check-in'}</p></div></div>
 <p className="small muted">Check-in opens 30 minutes before the match. Allow your opponent 15 minutes after the scheduled time before reporting a no-show. Reports require administrator review and do not automatically award a win.</p>
 {active&&<div className="actions"><Button disabled={busy} onClick={()=>void act('ready')}>Check in · I’m ready</Button><Button variant="outline" disabled={busy} onClick={()=>{setLobby(data.lobbyDetails||'');setEditing(!editing)}}>Edit lobby details</Button></div>}
 {editing?<div className="field"><label htmlFor="match-lobby">Game room ID and coordination instructions</label><textarea className="input" id="match-lobby" maxLength={1000} value={lobby} onChange={e=>setLobby(e.target.value)}/><Button disabled={busy} onClick={()=>void act('lobby',lobby)}>Save lobby details</Button></div>:<p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',marginTop:16}}>{data.lobbyDetails||'No lobby details shared yet.'}</p>}
 {data.noShowReportedAt?<div className="feedback"><strong>{data.decision?'Report reviewed':'No-show report pending review'}</strong><p>{data.noShowReason}</p>{data.decision&&<p>Decision: {data.decision}</p>}</div>:null}
 {(active&&!data.noShowReportedAt||admin&&data.noShowReportedAt&&!data.decision)&&<details style={{marginTop:24}}><summary>{admin&&data.noShowReportedAt?'Review no-show report':'Report opponent no-show'}</summary><div className="field" style={{marginTop:12}}><label htmlFor="coordination-reason">{admin&&data.noShowReportedAt?'Decision and next steps':'Describe your attempts to contact the opponent'}</label><textarea className="input" id="coordination-reason" minLength={10} maxLength={2000} value={reason} onChange={e=>setReason(e.target.value)}/><Button disabled={busy||reason.trim().length<10} onClick={()=>{if(confirm('Submit this report or decision? Both players and the review team will be notified.'))void act(admin&&data.noShowReportedAt?'decision':'no-show',reason)}}>{admin&&data.noShowReportedAt?'Publish decision':'Submit no-show report'}</Button></div></details>}
 </>}<Feedback message={message}/><Feedback message={failure} error/></section>;
}
