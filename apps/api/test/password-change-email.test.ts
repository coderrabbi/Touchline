import {describe,it,expect,vi} from 'vitest';
vi.mock('../src/config/env.js',()=>({env:{EMAIL_MODE:'resend',RESEND_API_KEY:'test-key',EMAIL_FROM:'Touchline <noreply@example.com>',FRONTEND_URL:'https://touchline.example'}}));
vi.mock('../src/utils/resend.js',()=>({deliverResend:vi.fn().mockResolvedValue('test-email')}));
import {sendAccountEmail} from '../src/utils/email';
import {deliverResend} from '../src/utils/resend';
describe('Password-change notification',()=>{
 it('sends a security notice without a password or reset token',async()=>{
  await sendAccountEmail('player@example.com','changed');
  const message=vi.mocked(deliverResend).mock.calls[0]![1];
  expect(message.to).toEqual(['player@example.com']);
  expect(message.subject).toBe('Your Touchline password was changed');
  expect(message.text).toContain('All previous sessions have been signed out');
  expect(message.text).toContain('https://touchline.example/forgot-password');
  expect(message.text).not.toContain('token=');
  expect(message.html).not.toContain('you can safely ignore');
 });
});
