export function safeDestination(value: string | null | undefined): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\') || [...value].some(char=>char.charCodeAt(0)<32)) return null;
  try {
    const url = new URL(value, 'https://touchline.invalid');
    if (url.origin !== 'https://touchline.invalid' || /^\/(login|register|verify-email|reset-password|forgot-password)(\/|$)/.test(url.pathname)) return null;
    return url.pathname + url.search + url.hash;
  } catch {return null;}
}
export function authDestination(next?: string | null) {
  let stored: string | null = null;
  try {stored = sessionStorage.getItem('touchline.authDestination');} catch {/* Storage can be disabled. */}
  return safeDestination(next) || safeDestination(stored) || '/dashboard';
}
