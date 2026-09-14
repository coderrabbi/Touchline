import {redirect} from 'next/navigation';
import {session,serverApi} from '@/lib/server-api';
import {ProfileForm} from '@/features/auth/profile-form';
import {ProfileOverview,type PublicPlayer} from '@/features/auth/profile-overview';
export const metadata={title:'Your profile'};
export default async function Page(){const account=await session();if(!account)redirect('/login');const {user}=await serverApi<{user:PublicPlayer}>('/users/'+encodeURIComponent(account.username));return <><ProfileOverview user={user} editable/><details className="panel profile-settings"><summary>Edit profile & privacy settings</summary><ProfileForm user={account}/></details></>}
