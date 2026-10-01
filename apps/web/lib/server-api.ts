import 'server-only';
import {cache} from 'react';
import {cookies,headers} from 'next/headers';
import {redirect} from 'next/navigation';
import type {ApiResponse,SessionUser} from '@touchline/shared';
import {safeDestination} from './auth-destination';
const base=process.env.API_INTERNAL_URL||'http://localhost:4100/api/v1';
export async function serverApi<T>(path:string):Promise<T>{const response=await fetch(base+path,{cache:'no-store',signal:AbortSignal.timeout(8000)});if(!response.ok)throw new Error('The tournament service is unavailable. Please try again.');const value:ApiResponse<T>=await response.json();return value.data}
export const session=cache(async ():Promise<SessionUser|null>=>{
  const jar=await cookies();
  if(!jar.has('tl_access')&&!jar.has('tl_refresh'))return null;
  const response=await fetch(base+'/auth/me',{headers:{cookie:jar.toString()},cache:'no-store',signal:AbortSignal.timeout(8000)});
  if(response.status===401){
    const destination=safeDestination((await headers()).get('x-touchline-return-to'));
    if(jar.has('tl_refresh')&&destination)redirect('/session-refresh?next='+encodeURIComponent(destination));
    return null;
  }
  if(response.status===403)return null;
  if(!response.ok)throw new Error('Account service unavailable. Please try again.');
  const value:ApiResponse<{user:SessionUser}>=await response.json();
  return value.data.user;
});
