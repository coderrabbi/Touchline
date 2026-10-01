import {describe,it,expect,vi} from 'vitest';
import express from 'express';
import request from 'supertest';
import {databaseConnectionString} from '../src/config/database-transport';
import {errorHandler} from '../src/middleware/errors';

describe('Security hardening',()=>{
 it('forces verified TLS for remote databases even in development',()=>{
  const url=new URL(databaseConnectionString('postgresql://user:secret@db.example/db?sslmode=no-verify&ssl=0&uselibpqcompat=true',false));
  expect(url.searchParams.get('sslmode')).toBe('verify-full');
  expect(url.searchParams.has('ssl')).toBe(false);
  expect(url.searchParams.has('uselibpqcompat')).toBe(false);
 });
 it('only allows unencrypted loopback database access outside production',()=>{
  const url='postgresql://user:secret@localhost/db';
  expect(new URL(databaseConnectionString(url,false)).searchParams.has('sslmode')).toBe(false);
  expect(new URL(databaseConnectionString(url,true)).searchParams.get('sslmode')).toBe('verify-full');
 });
 it('does not echo database credentials or error stacks to responses or logs',async()=>{
  const log=vi.spyOn(console,'error').mockImplementation(()=>{});
  try {
   const app=express();app.get('/',()=>{throw new Error('postgresql://admin:PRIVATE_SECRET@database/db');});app.use(errorHandler);
   const response=await request(app).get('/');
   expect(response.status).toBe(500);
   expect(JSON.stringify(response.body)).not.toContain('PRIVATE_SECRET');
   expect(JSON.stringify(log.mock.calls)).not.toContain('PRIVATE_SECRET');
   expect(response.body).not.toHaveProperty('stack');
  } finally {log.mockRestore();}
 });
});
