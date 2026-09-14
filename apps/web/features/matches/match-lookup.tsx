'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {api} from '@/lib/api';
import {Button} from '@/components/ui/button';
import {Feedback} from '@/components/ui/feedback';
export function MatchLookup(){const router=useRouter(),[code,setCode]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');return <form className="panel" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{const match=await api<{id:string}>('/match-lookup/'+encodeURIComponent(code.trim()));router.push('/matches/'+match.id)}catch(e){setError(e instanceof Error?e.message:'Unable to find this match');setBusy(false)}}}><label className="field" htmlFor="match-code">Match ID<input id="match-code" className="input" placeholder="TL-000123" value={code} onChange={e=>setCode(e.target.value)} maxLength={32} required autoCapitalize="characters" spellCheck={false} aria-describedby="match-code-help"/></label><p id="match-code-help" className="small muted" style={{margin:'12px 0 20px'}}>Enter the ID shown on the match page. You can also enter just the number. Private matches require administrator access.</p><Button disabled={busy||!code.trim()} type="submit">{busy?'Finding match…':'Find match →'}</Button><Feedback message={error} error/></form>}
