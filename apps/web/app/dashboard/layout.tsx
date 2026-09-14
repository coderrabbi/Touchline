import {redirect} from 'next/navigation';
import {session} from '@/lib/server-api';
import {Workspace} from '@/components/workspace';
export default async function Layout({children}:{children:React.ReactNode}){const user=await session();if(!user)redirect('/login?next=/dashboard');return <Workspace admin={user.role!=='PLAYER'}>{children}</Workspace>}
