/** Suggestions follow the registration rules; the server checks availability. */
export function suggestUsername(name: string, current = ''): string {
  const cleaned = name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  const base = (cleaned || 'touchline').slice(0, 19).replace(/_+$/g, '');
  let suffix = Math.floor(Math.random() * 9000) + 1000;
  if (`${base}_${suffix}` === current) suffix = suffix === 9999 ? 1000 : suffix + 1;
  return `${base}_${suffix}`;
}
