import {NotificationPreferences} from '@/features/auth/notification-preferences';
import Link from 'next/link';
import {session} from '@/lib/server-api';
import {Button} from '@/components/ui/button';
export const metadata={title:'Account settings'};
export default async function Page(){const user=await session();return <><h1>Account settings</h1><NotificationPreferences/><section className="panel"><h2>Private account</h2><p className="muted" style={{marginTop:15}}>Email: {user?.email}<br/>Username: {user?.username}<br/>Email verification: {user?.emailVerified?'Verified':'Pending'}</p><p className="small muted">Passwords and session tokens are never exposed in your profile. Resetting your password closes every existing session.</p><Button asChild variant="outline"><Link href="/forgot-password">Reset password securely</Link></Button></section><section className="panel"><h2>Timezone & privacy</h2><p className="muted" style={{marginTop:15}}>Adjust these preferences in your profile.</p><Button asChild variant="outline"><Link href="/dashboard/profile">Edit preferences</Link></Button></section></>}

