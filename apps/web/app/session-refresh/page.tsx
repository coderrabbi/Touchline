import {Suspense} from 'react';
import {SessionRecovery} from '@/features/auth/session-recovery';
export default function Page(){return <Suspense fallback={<p role="status">Restoring your session…</p>}><SessionRecovery/></Suspense>}
