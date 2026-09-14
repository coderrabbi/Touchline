'use client';
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import {safeDestination} from '@/lib/auth-destination';
export function AuthNavigation({login}: {login: boolean}) {
  const params = useSearchParams();
  const next = safeDestination(params.get('next'));
  const suffix = next ? '?next=' + encodeURIComponent(next) : '';
  return <div className="actions small">{login ? <><Link href={'/register'+suffix} className="lime">Create an account</Link><Link href="/forgot-password" className="muted">Forgot password?</Link></> : <Link href={'/login'+suffix} className="lime">Back to log in →</Link>}</div>;
}
