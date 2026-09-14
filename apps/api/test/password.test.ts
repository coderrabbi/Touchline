import {describe, expect, it} from 'vitest';
import {passwordStrength, passwordSchema, loginSchema, resetPasswordSchema} from '@touchline/shared';

describe('Password creation policy', () => {
  it.each(['short', 'password', 'Password123!', 'aaaaaaaaaaaaaaaa', 'abcdefgh', '12345678901234567890'])('rejects poor password %s', value => {
    expect(passwordStrength(value)).toBe('Poor');
    expect(passwordSchema.safeParse(value).success).toBe(false);
    expect(resetPasswordSchema.safeParse({token:'a'.repeat(64),password:value,confirmPassword:value}).success).toBe(false);
  });
  it.each([['Mint7Sky2', 'Medium'], ['Cedar7Rain!', 'Medium'], ['Cedar7Rain!Moon', 'Strong'], ['my long river phrase 47', 'Strong']])('classifies %s', (value, strength) => {
    expect(passwordStrength(value)).toBe(strength);
    expect(passwordSchema.safeParse(value).success).toBe(strength !== 'Poor');
  });
  it('keeps existing passwords usable for login', () => {
    expect(loginSchema.safeParse({email:'player@example.com', password:'oldpassword'}).success).toBe(true);
  });
  it('rejects passwords beyond the bcrypt byte limit', () => {
    expect(passwordSchema.safeParse('É'.repeat(36)+'a1!').success).toBe(false);
  });
});

