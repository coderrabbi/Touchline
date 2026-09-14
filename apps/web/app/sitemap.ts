import type {MetadataRoute} from 'next';
import {serverApi} from '@/lib/server-api';
import type {Tournament} from '@/lib/catalog';
export default async function sitemap():Promise<MetadataRoute.Sitemap>{const base=process.env.NEXT_PUBLIC_SITE_URL||'http://localhost:3000';let tournaments:Tournament[]=[];try{tournaments=await serverApi<Tournament[]>('/tournaments?limit=100')}catch{/* Core public routes remain discoverable during API outages. */}return [{url:base},{url:base+'/tournaments'},...tournaments.map(t=>({url:base+'/tournaments/'+t.slug}))]}
