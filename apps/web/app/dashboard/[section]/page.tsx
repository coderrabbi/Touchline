import {notFound} from 'next/navigation';
import {PlayerArena} from '@/features/dashboard/player-arena';
export default async function Page({params}:{params:Promise<{section:string}>}){const {section}=await params;if(!['tournaments','matches','notifications'].includes(section))notFound();return <PlayerArena section={section}/>}
