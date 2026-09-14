'use client';
import Link from 'next/link';
import {usePathname,useRouter} from 'next/navigation';
import type {ComponentProps} from 'react';
import {safeDestination} from '@/lib/auth-destination';

export function AuthLink({href, ...props}: ComponentProps<typeof Link>) {
  const pathname = usePathname();
  const router = useRouter();
  const next = safeDestination(pathname);
  const target = String(href) + (next ? '?next=' + encodeURIComponent(next) : '');
  return <Link {...props} href={target} onClick={event => {
    const destination = safeDestination(location.pathname + location.search + location.hash);
    if (destination) try {sessionStorage.setItem('touchline.authDestination', destination);} catch {/* Optional storage. */}
    props.onClick?.(event);
    if(destination&&!event.defaultPrevented&&!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&!event.altKey&&event.button===0){
      event.preventDefault();router.push(String(href)+'?next='+encodeURIComponent(destination));
    }
  }}/>;
}
