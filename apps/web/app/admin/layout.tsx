import {redirect} from 'next/navigation';
import {session} from '@/lib/server-api';
export default async function Layout({children}:{children:React.ReactNode}){const user=await session();if(!user)redirect('/login?next=/admin');if(user.role==='PLAYER')return <div className="panel empty"><h1>Access restricted</h1><p>Administrator permission is required.</p></div>;return <>{children}</>}
