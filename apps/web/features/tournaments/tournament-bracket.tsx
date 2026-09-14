'use client';
import {useState} from 'react';
import Link from 'next/link';
import type {MatchRecord} from '@/lib/competition';
import {PlayerAvatar} from '@/components/player-avatar';
import {Button} from '@/components/ui/button';

export function TournamentBracket({matches,userId}:{matches:MatchRecord[];userId?:string}) {
 const [list,setList]=useState(false),[selectedRound,setSelectedRound]=useState(0);
 const bracket=matches.filter(m=>['KNOCKOUT','FINAL'].includes(m.stage));
 const rounds=[...new Set(bracket.map(m=>m.round))].sort((a,b)=>a-b);
 const positions=new Map<string,{x:number;y:number}>(),width=208,gap=76,step=152;
 for(const [column,round] of rounds.entries()) {
   const ordered=bracket.filter(m=>m.round===round).sort((a,b)=>a.position-b.position);
   for(const [index,match] of ordered.entries()) {
     const feeders=bracket.filter(m=>m.nextMatchId===match.id).map(m=>positions.get(m.id)).filter((p):p is {x:number;y:number}=>!!p);
     const y=feeders.length?feeders.reduce((sum,p)=>sum+p.y,0)/feeders.length:32+index*step*2**column+(2**column-1)*step/2;
     positions.set(match.id,{x:column*(width+gap),y});
   }
 }
 const boardHeight=Math.max(200,...[...positions.values()].map(p=>p.y+136));
 function card(match:MatchRecord,positioned=false) {
   const position=positions.get(match.id),mine=[match.home?.userId,match.away?.userId].includes(userId||'');
   return <Link key={match.id} href={'/matches/'+match.id} className={'bracket-match'+(mine?' current-player':'')} style={positioned?{position:'absolute',left:position?.x,top:position?.y,width}:undefined} aria-label={`Round ${match.round}: ${match.home?.user.name||'To be decided'} versus ${match.away?.user.name||'To be decided'}. ${match.status.toLowerCase().replaceAll('_',' ')}. View match.`}>
     <div className="bracket-match-label">{match.stage==='FINAL'?'Final':match.stage==='THIRD_PLACE'?'Third place':'Round '+match.round}{mine?' · Your match':''}</div>
     <div className="bracket-players">{[match.home,match.away].map((player,index)=><div key={index} className={match.winnerId&&player?.id===match.winnerId?'bracket-winner':''}><PlayerAvatar name={player?.user.name||'?'} url={player?.user.profile?.avatarUrl}/><span title={player?.user.name}>{player?.user.name||'To be decided'}</span><strong>{(index===0?match.homeScore:match.awayScore)??'—'}{match.winnerId&&player?.id===match.winnerId?<small> W</small>:null}</strong></div>)}</div>
   </Link>;
 }
 if(!bracket.length)return <div className="panel empty">The bracket will appear when knockout fixtures are published.</div>;
 return <section className="panel bracket-panel"><div className="row"><div><h2>Road to the final</h2><p className="small muted">Select a match for details. Scroll to follow every round.</p></div><Button variant="outline" aria-pressed={list} onClick={()=>setList(v=>!v)}>{list?'Show bracket':'Match list'}</Button></div>
   {list?<><label className="field">Round<select aria-label="Bracket round" value={selectedRound} onChange={e=>setSelectedRound(Number(e.target.value))}><option value={0}>All rounds</option>{rounds.map(round=><option value={round} key={round}>Round {round}</option>)}</select></label><div className="bracket-list">{bracket.filter(m=>!selectedRound||m.round===selectedRound).map(m=>card(m))}</div></>:<div className="bracket-scroll" tabIndex={0} role="region" aria-label="Tournament bracket; scroll horizontally to view later rounds"><div className="bracket-board" style={{width:rounds.length*(width+gap)-gap,height:boardHeight}}>
     <svg width="100%" height="100%" aria-hidden="true" className="bracket-lines">{bracket.map(m=>{const from=positions.get(m.id),to=m.nextMatchId?positions.get(m.nextMatchId):undefined;if(!from||!to)return null;const x=from.x+width,mid=x+gap/2;return <path key={m.id} d={`M ${x} ${from.y+64} H ${mid} V ${to.y+64} H ${to.x}`} fill="none" stroke={m.winnerId?'#b8f763':'#3b4550'} strokeWidth={m.winnerId?2:1.5}/>;})}</svg>
     {bracket.map(m=>card(m,true))}
   </div></div>}
   {matches.some(m=>m.stage==='THIRD_PLACE')&&<div style={{marginTop:24}}><h3>Third-place playoff</h3><div className="bracket-list">{matches.filter(m=>m.stage==='THIRD_PLACE').map(m=>card(m))}</div></div>}
 </section>;
}
