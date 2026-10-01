import {describe,it,expect} from 'vitest';
import {generatePassword} from '../../web/lib/generate-password';
import {passwordStrength,passwordSchema} from '@touchline/shared';
describe('Strong password generation',()=>{
 it('produces accepted strong passwords with all character groups',()=>{for(let i=0;i<100;i++){const value=generatePassword();expect(value).toHaveLength(20);expect(value).toMatch(/[A-Z]/);expect(value).toMatch(/[a-z]/);expect(value).toMatch(/[0-9]/);expect(value).toMatch(/[!@#$%&*+\-=?]/);expect(passwordStrength(value)).toBe('Strong');expect(passwordSchema.safeParse(value).success).toBe(true)}});
});
