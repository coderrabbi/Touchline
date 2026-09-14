import 'server-only';
import {cookies} from 'next/headers';
import type {ApiResponse,SessionUser} from '@touchline/shared';
const base=process.env.API_INTERNAL_URL||'http://localhost:4100/api/v1';
export async function serverApi<T>(path:string):Promise<T>{const response=await fetch(base+path,{cache:'no-store',signal:AbortSignal.timeout(8000)});if(!response.ok)throw new Error('The tournament service is unavailable. Please try again.');const value:ApiResponse<T>=await response.json();return value.data}
export async function session():Promise<SessionUser|null>{try{const jar=await cookies();const response=await fetch(base+'/auth/me',{headers:{cookie:jar.toString()},cache:'no-store',signal:AbortSignal.timeout(8000)});if(response.status===401||response.status===403)return null;if(!response.ok)throw new Error('Account service unavailable');const value:ApiResponse<{user:SessionUser}>=await response.json();return value.data.user}catch{return null}}
