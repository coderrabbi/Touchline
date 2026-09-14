export type PasswordStrength = 'Poor' | 'Medium' | 'Strong';

/** Shared creation policy: the meter and API must always agree. */
export function passwordStrength(value: string): PasswordStrength {
  const length = [...value].length;
  const categories = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9\s]/].filter(pattern => pattern.test(value)).length;
  const common = /^(password|qwerty|letmein|welcome|admin|abc123|123456|efootball|touchline)[\d\W_]*$/i.test(value);
  if (length < 8 || new TextEncoder().encode(value).length > 72 || common || /^(.)\1+$/u.test(value)) return 'Poor';
  if (length >= 12 && categories >= 3 || length >= 20 && categories >= 2) return 'Strong';
  if (categories >= 3 || length >= 16 && categories >= 2) return 'Medium';
  return 'Poor';
}
