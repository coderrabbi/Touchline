import {MatchRoom} from '@/features/matches/match-room';
export const metadata={title:'Match room'};
export default async function Page({params}:{params:Promise<{id:string}>}){return <MatchRoom id={(await params).id}/>}
