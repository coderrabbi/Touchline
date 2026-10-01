/** Remote databases always use verified TLS, including local development against Neon. */
export function databaseConnectionString(value: string, production: boolean): string {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error('Invalid database connection configuration'); }
  if (production || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    url.searchParams.delete('ssl');
    url.searchParams.delete('uselibpqcompat');
    url.searchParams.set('sslmode', 'verify-full');
  }
  return url.toString();
}
