import Link from 'next/link';
import {Trophy} from 'lucide-react';
import {PlayerAvatar} from '@/components/player-avatar';
import type {CompetitionData} from '@/lib/competition';

export function ChampionCard({winners,name,league}:{winners:CompetitionData['winners'];name:string;league:boolean}){
 const champion=winners.find(w=>w.place===1)?.participant.user;
 if(!champion)return <section className="panel" style={{marginBottom:24}}><h2>Competition completed</h2><p className="muted">The champion will appear here once the final decision is confirmed.</p></section>;
 return <section className="champion-card" aria-label={league?'League champion':'Tournament champion'}>
  <div className="champion-photo"><PlayerAvatar key={champion.profile?.avatarUrl||champion.id} name={champion.name} url={champion.profile?.avatarUrl} large/><span className="champion-medal" aria-label="Champion trophy"><Trophy size={24} aria-hidden="true"/></span></div>
  <div className="champion-copy"><span className="eyebrow">{league?'League champion':'Tournament champion'}</span><h2><Link href={'/players/'+champion.username}>{champion.name}</Link></h2><p className="muted">{champion.profile?.efootballUsername?'eFootball: '+champion.profile.efootballUsername:'@'+champion.username}</p><p className="small">Winner of {name}</p><Link className="lime small" href={'/players/'+champion.username}>View player profile →</Link></div>
  <Trophy className="champion-cup" size={88} strokeWidth={1.3} aria-hidden="true"/>
 </section>;
}
