'use client';
import Link from 'next/link';
import {useQuery} from '@tanstack/react-query';
import {api} from '@/lib/api';
import {QueryState} from '@/components/query-state';
export function NoShowQueue(){const {data,error,isPending,refetch}=useQuery({queryKey:['no-show-queue'],queryFn:()=>api<Array<{matchId:string;noShowReason:string;match:{tournament:{name:string}}}>>('/admin/no-show-reports'),refetchInterval:10000});return <section className="panel"><h2>No-show reports</h2><QueryState pending={isPending} error={error} retry={()=>void refetch()}/>{data?.length?data.map(r=><Link className="match-row" href={'/matches/'+r.matchId} key={r.matchId}><div className="grow"><h3>{r.match.tournament.name}</h3><p className="small muted">{r.noShowReason}</p></div><span className="lime">Review →</span></Link>):data&&<p className="muted">No open no-show reports.</p>}</section>}
