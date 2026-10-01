import {NextResponse, type NextRequest} from 'next/server';

// Only route recovery here. The API still validates every session and permission.
export function proxy(request: NextRequest) {
  const destination=request.nextUrl.pathname+request.nextUrl.search;
  if (!request.cookies.has('tl_access') && request.cookies.has('tl_refresh')) {
    const target=new URL('/session-refresh',request.url);
    target.searchParams.set('next',destination);
    return NextResponse.redirect(target);
  }
  const headers=new Headers(request.headers);
  headers.set('x-touchline-return-to',destination);
  return NextResponse.next({request:{headers}});
}
export const config={matcher:['/dashboard/:path*','/admin/:path*']};
