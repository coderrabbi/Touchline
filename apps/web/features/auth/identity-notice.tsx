'use client';
import {useQuery} from '@tanstack/react-query';
import {api} from '@/lib/api';
export function IdentityNotice(){const {data}=useQuery({queryKey:['identity-status'],queryFn:()=>api<{requiresUpdate:boolean}>('/users/me/identity-status')});return data?.requiresUpdate?<div className="feedback" role="status">Your eFootball username is shared by an older account. Choose a unique eFootball username below to enable game-username login. Your email and Touchline username still work.</div>:null;}
