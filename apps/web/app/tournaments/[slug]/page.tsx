import {tournamentCover} from '@/lib/cover-image';
import type {Metadata} from 'next';
import Link from 'next/link';
import {serverApi} from '@/lib/server-api';
import {type Tournament,human} from '@/lib/catalog';
import {CompetitionView} from '@/features/tournaments/competition-view';
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{const {slug}=await params;try{const t=await serverApi<Tournament>('/tournaments/'+slug);return {title:t.name,description:t.description,alternates:{canonical:'/tournaments/'+t.slug},openGraph:{title:t.name,description:t.description,images:[tournamentCover(t.bannerUrl)]}}}catch{return {title:'Tournament unavailable'}}}
export default async function Page({params}:{params:Promise<{slug:string}>}){const {slug}=await params,t=await serverApi<Tournament>('/tournaments/'+slug);return <><Link href="/tournaments" className="small muted">← All tournaments</Link><section className="hero" style={{minHeight:240,marginTop:20,backgroundImage:`linear-gradient(90deg,#0d141be6,#0d141b70),url("${tournamentCover(t.bannerUrl)}")`}}><span className="badge">{human(t.status)}</span><h1 style={{fontSize:50}}>{t.name}</h1><p>Hosted by {t.createdBy.name}</p></section><CompetitionView t={t}/></>}

