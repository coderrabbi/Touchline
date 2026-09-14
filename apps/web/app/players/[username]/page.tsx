import {serverApi,session} from '@/lib/server-api';
import {ProfileOverview,type PublicPlayer} from '@/features/auth/profile-overview';
export default async function Page({params}:{params:Promise<{username:string}>}) {
 const {username}=await params;
 const [{user},viewer]=await Promise.all([serverApi<{user:PublicPlayer}>('/users/'+encodeURIComponent(username)),session()]);
 return <ProfileOverview user={user} editable={viewer?.id===user.id}/>;
}
