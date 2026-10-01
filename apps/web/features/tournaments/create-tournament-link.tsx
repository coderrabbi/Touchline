"use client";
import Link from 'next/link';
import {Plus} from 'lucide-react';
import {useQuery} from '@tanstack/react-query';
import type {SessionUser} from '@touchline/shared';
import {api} from '@/lib/api';
import {Button} from '@/components/ui/button';
export function CreateTournamentLink(){
 const {data}=useQuery({queryKey:['session'],queryFn:()=>api<{user:SessionUser}>('/auth/me',{anonymous:true}),retry:false});
 if(!data?.user||!['ADMIN','SUPER_ADMIN'].includes(data.user.role))return null;
 return <Button asChild><Link href="/admin/tournaments/create"><Plus size={18} aria-hidden="true"/>Create tournament</Link></Button>;
}
