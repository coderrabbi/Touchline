import {describe,it,expect} from 'vitest';
import {safeDestination} from '../../web/lib/auth-destination';
describe('Authentication return destinations',()=>{
  it('preserves a local page, query and fragment',()=>{
    expect(safeDestination('/tournaments/weekend-warriors?view=groups#chat')).toBe('/tournaments/weekend-warriors?view=groups#chat');
  });
  it.each(['https://example.com','//example.com','/\\example.com','/login?next=/login','/register','/reset-password?token=secret','/\nexample.com'])('rejects unsafe or looping destination %s',value=>{
    expect(safeDestination(value)).toBeNull();
  });
});
