import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {api,clearSession,uploadImage,openProtectedUpload} from '../../web/lib/api';
import {proxy} from '../../web/proxy';
import {NextRequest} from 'next/server';
const response=(data:unknown,status=200)=>new Response(JSON.stringify({success:status<400,data,message:'Service unavailable',errors:[]}),{status,headers:{'Content-Type':'application/json'}});
beforeEach(()=>clearSession());
afterEach(()=>vi.unstubAllGlobals());
describe('Session recovery',()=>{
 it('refreshes anonymous session discovery and retries the original request',async()=>{
  const mock=vi.fn().mockResolvedValueOnce(response({},401)).mockResolvedValueOnce(response({csrfToken:'csrf'})).mockResolvedValueOnce(response({csrfToken:'rotated'})).mockResolvedValueOnce(response({user:{id:'p1'}}));
  vi.stubGlobal('fetch',mock);
  expect(await api('/auth/me',{anonymous:true})).toEqual({user:{id:'p1'}});
  expect(mock.mock.calls.map(c=>c[0])).toEqual(['/api/v1/auth/me','/api/v1/auth/csrf','/api/v1/auth/refresh','/api/v1/auth/me']);
 });
 it('does not refresh rejected login credentials',async()=>{
  const mock=vi.fn().mockResolvedValue(response({},401));vi.stubGlobal('fetch',mock);
  await expect(api('/auth/login',{anonymous:true,method:'POST',body:{}})).rejects.toMatchObject({status:401});expect(mock).toHaveBeenCalledTimes(1);
 });
 it('preserves temporary service failures instead of treating them as logout',async()=>{
  const mock=vi.fn().mockResolvedValueOnce(response({},401)).mockResolvedValueOnce(response({csrfToken:'csrf'})).mockResolvedValueOnce(response({},503));vi.stubGlobal('fetch',mock);
  await expect(api('/auth/me')).rejects.toMatchObject({status:503});
 });
 it('stops after one unsuccessful session refresh',async()=>{
  const mock=vi.fn().mockResolvedValue(response({},401));vi.stubGlobal('fetch',mock);
  await expect(api('/auth/me')).rejects.toMatchObject({status:401});expect(mock).toHaveBeenCalledTimes(2);
 });
 it('retries an image upload after expiration',async()=>{
  const mock=vi.fn().mockResolvedValueOnce(response({csrfToken:'csrf'})).mockResolvedValueOnce(response({},401)).mockResolvedValueOnce(response({csrfToken:'rotated'})).mockResolvedValueOnce(response({id:'image',url:'/image'}));vi.stubGlobal('fetch',mock);
  expect(await uploadImage(new File(['test'],'test.png',{type:'image/png'}),'AVATAR')).toEqual({id:'image',url:'/image'});
  expect(mock.mock.calls[3]?.[0]).toBe('/api/v1/uploads');
 });
 it('does not expose protected evidence when permission is denied',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response({},403)));
  await expect(openProtectedUpload('private')).rejects.toMatchObject({status:403});
 });
 it('preserves the protected destination during recovery',()=>{
  const result=proxy(new NextRequest('https://touchline.test/admin/tournaments/123?tab=results',{headers:{cookie:'tl_refresh=fixture'}}));
  const target=new URL(result.headers.get('location')!);
  expect(target.pathname).toBe('/session-refresh');expect(target.searchParams.get('next')).toBe('/admin/tournaments/123?tab=results');
 });
 it('does not send a signed-out guest into a recovery loop',()=>{
  const result=proxy(new NextRequest('https://touchline.test/dashboard'));
  expect(result.headers.get('location')).toBeNull();
 });
});
