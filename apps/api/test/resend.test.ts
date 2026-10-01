import {afterEach,describe,it,expect,vi} from 'vitest';
import {deliverResend} from '../src/utils/resend';
const message={from:'Touchline <hello@example.com>',to:['player@example.net'],subject:'Verify',text:'private-token',html:'private-token'};
afterEach(()=>vi.unstubAllGlobals());
describe('Resend delivery',()=>{
 it('fails clearly when a key is absent',async()=>{await expect(deliverResend(undefined,message)).rejects.toThrow('RESEND_API_KEY')});
 it('returns the provider ID after acceptance',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({id:'mail-123'})));expect(await deliverResend('test-key',message)).toBe('mail-123')});
 it('retries network failures with the same idempotency key',async()=>{const request=vi.fn().mockRejectedValueOnce(new Error('timeout')).mockResolvedValueOnce(Response.json({id:'mail-123'}));vi.stubGlobal('fetch',request);await deliverResend('test-key',message);expect(request.mock.calls[0]?.[1].headers['Idempotency-Key']).toBe(request.mock.calls[1]?.[1].headers['Idempotency-Key']);expect(request).toHaveBeenCalledTimes(2)});
 it('does not retry permission failures or expose provider response secrets',async()=>{const request=vi.fn().mockResolvedValue(Response.json({message:'private-token test-key'},{status:403}));vi.stubGlobal('fetch',request);await expect(deliverResend('test-key',message)).rejects.toThrow('Verify the sender domain');expect(request).toHaveBeenCalledTimes(1)});
 it('rejects success responses without an email ID',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({})));await expect(deliverResend('test-key',message)).rejects.toThrow('no email ID')});
});
