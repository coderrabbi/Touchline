'use client';
import {useEffect,useRef,useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import type {SessionUser} from '@touchline/shared';
import {api,ApiError,apiBase} from '@/lib/api';
import {Button} from '@/components/ui/button';
import {Feedback} from '@/components/ui/feedback';
import {AuthLink} from '@/components/auth-link';

interface ChatMessage {id:string;body:string;createdAt:string;author:{id:string;name:string;username:string}}
interface Community {groupLink:string|null;canManage:boolean;canSend:boolean;messages:ChatMessage[]}

function GroupLinkEditor({initial,onSave}: {initial:string|null;onSave:(link:string)=>Promise<void>}) {
  const [link,setLink]=useState(initial||''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
  return <form onSubmit={async event=>{event.preventDefault();setBusy(true);setError('');setMessage('');try{await onSave(link);setMessage('Group link saved.');}catch(e){setError(e instanceof Error?e.message:'Could not save link.');}finally{setBusy(false);}}}>
    <label className="field">Group invite link<input className="input" type="url" placeholder="https://…" value={link} onChange={e=>setLink(e.target.value)} maxLength={2048}/></label>
    <p className="small muted">Add a WhatsApp, Discord, Telegram or other HTTPS group link. Only approved participants and administrators can see it. Clear the field to remove it.</p>
    <Button type="submit" variant="outline" disabled={busy}>{busy?'Saving…':'Save group link'}</Button>
    <Feedback message={message}/><Feedback message={error} error/>
  </form>;
}

export function CommunityRoom({tournamentId,user}: {tournamentId:string;user?:SessionUser}) {
  const cache=useQueryClient(),path='/tournaments/'+tournamentId+'/community';
  const key=['community',tournamentId,user?.id];
  const {data,error,isPending,refetch}=useQuery({queryKey:key,queryFn:()=>api<Community>(path),enabled:!!user,retry:false});
  const [connection,setConnection]=useState('Connecting…'),[body,setBody]=useState(''),[sending,setSending]=useState(false),[failure,setFailure]=useState('');
  const attempt=useRef<{body:string;id:string}|null>(null),log=useRef<HTMLDivElement>(null),nearBottom=useRef(true);
  const allowed=!!user&&!!data&&!error;
  useEffect(()=>{
    if(!allowed)return;
    let stopped=false,source:EventSource|undefined,timer:ReturnType<typeof setTimeout>|undefined;
    const reconnect=()=>{
      source?.close();if(stopped)return;setConnection('Reconnecting…');
      timer=setTimeout(()=>{void api<Community>(path).then(snapshot=>{
        if(stopped)return;cache.setQueryData(['community',tournamentId,user?.id],snapshot);connect();
      }).catch((e:unknown)=>{
        if(stopped)return;
        if(e instanceof ApiError&&[401,403,404].includes(e.status)){cache.removeQueries({queryKey:['community',tournamentId,user?.id]});void refetch();setConnection('Access unavailable');}
        else reconnect();
      });},2000);
    };
    const connect=()=>{
      if(stopped)return;
      source=new EventSource(apiBase+path+'/stream',{withCredentials:true});
      source.addEventListener('snapshot',event=>{
        if(stopped)return;
        cache.setQueryData(['community',tournamentId,user?.id],JSON.parse((event as MessageEvent).data) as Community);setConnection('Live');
      });
      source.addEventListener('open',()=>setConnection('Live'));
      source.addEventListener('access-check',reconnect);
      source.onerror=reconnect;
    };
    connect();return()=>{stopped=true;source?.close();clearTimeout(timer);};
  },[allowed,path,tournamentId,user?.id,cache,refetch]);
  useEffect(()=>{if(nearBottom.current&&log.current)log.current.scrollTop=log.current.scrollHeight;},[data?.messages]);
  if(!user)return <section className="panel"><h2>Tournament group</h2><p className="muted">Log in and join this tournament to access its group link and participant chat.</p><Button asChild><AuthLink href="/login">Log in to continue →</AuthLink></Button></section>;
  if(error)return <section className="panel"><h2>Tournament group</h2><Feedback message={error.message} error/><Button variant="outline" onClick={()=>void refetch()}>Check access again</Button></section>;
  if(isPending||!data)return <div className="panel" role="status">Loading tournament group…</div>;
  return <div className="community-grid"><section className="panel"><h2>Your tournament group</h2><p className="muted">Coordinate matches with the tournament community. Matches are played inside eFootball.</p>
    {data.groupLink?<a className="button" href={data.groupLink} target="_blank" rel="noopener noreferrer">Open group invite ↗</a>:<p className="small muted">The administrator has not added a group link yet.</p>}
    {data.canManage&&<GroupLinkEditor key={data.groupLink} initial={data.groupLink} onSave={async groupLink=>{await api(path,{method:'PATCH',body:{groupLink}});await refetch();}}/>}
  </section><section className="panel community-chat"><div className="row"><h2>Group chat</h2><span className="badge" role="status">{connection}</span></div>
    <p className="small muted">Approved participants and administrators · Latest 100 messages</p>
    <div className="chat-log" ref={log} role="log" aria-label="Tournament group messages" aria-live="polite" aria-relevant="additions" tabIndex={0} onScroll={()=>{const el=log.current;if(el)nearBottom.current=el.scrollHeight-el.scrollTop-el.clientHeight<80;}}>
      {data.messages.length?data.messages.map(message=><article key={message.id} className={'chat-message'+(message.author.id===user.id?' mine':'')}><div className="row"><strong>{message.author.name}{message.author.id===user.id?' (you)':''}</strong><time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</time></div><p>{message.body}</p></article>):<p className="empty muted">No messages yet. Say hello to your opponents.</p>}
    </div>
    {data.canSend?<form onSubmit={async event=>{event.preventDefault();const text=body.trim();if(!text||sending)return;setSending(true);setFailure('');if(attempt.current?.body!==text)attempt.current={body:text,id:crypto.randomUUID()};try{await api(path+'/messages',{method:'POST',body:{body:text,clientId:attempt.current.id}});setBody('');attempt.current=null;nearBottom.current=true;await refetch();}catch(e){setFailure(e instanceof Error?e.message:'Message not sent. Try again.');}finally{setSending(false);}}}>
      <label className="field" htmlFor="chat-message">Message<textarea className="input" id="chat-message" value={body} onChange={e=>setBody(e.target.value)} maxLength={1000} rows={3} placeholder="Arrange a time to play…" disabled={sending}/></label>
      <div className="row"><span className="small muted">{body.length}/1000</span><Button type="submit" disabled={sending||!body.trim()}>{sending?'Sending…':'Send message →'}</Button></div><Feedback message={failure} error/>
    </form>:<p className="feedback">Chat is read-only for completed or cancelled tournaments and unverified accounts.</p>}
  </section></div>;
}
