import {redirect} from 'next/navigation';
import {session,serverApi} from '@/lib/server-api';
import {ProfileForm} from '@/features/auth/profile-form';
import {ProfileOverview,type PublicPlayer} from '@/features/auth/profile-overview';
export const metadata={title:'Your profile'};
export default async function Page(){const account=await session();if(!account)redirect('/login');const {user}=await serverApi<{user:PublicPlayer}>('/users/'+encodeURIComponent(account.username));return <><ProfileOverview user={user} editable/><section className="panel" aria-label="Private email address"><h2>Your email</h2><p style={{marginTop:12,overflowWrap:"anywhere"}}>{account.email}</p><p className="small muted">Only you can see this email here. It is not shown on your public player profile.</p></section><details className="panel profile-settings"><summary>Edit profile & privacy settings</summary><ProfileForm user={account}/></details></>}
