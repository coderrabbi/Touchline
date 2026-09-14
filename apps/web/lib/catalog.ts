export interface Tournament{id:string;name:string;slug:string;description:string;bannerUrl:string|null;format:string;platform:string;region:string;maxPlayers:number;registrationDeadline:string;startsAt:string;status:string;rules:string;createdBy:{name:string};_count:{participants:number}}
export interface Community{players:number;tournaments:number;matches:number;countries:number}
export const human=(s:string)=>s==='STEAM_PC'?'PC':s.toLowerCase().replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase()).replace('Steam Pc','Steam / PC');
export const date=(s:string)=>new Date(s).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'});
