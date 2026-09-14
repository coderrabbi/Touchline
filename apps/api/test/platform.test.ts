import {describe,it,expect} from 'vitest';
import {supportedPlatformSchema,platformSchema} from '@touchline/shared';
describe('Supported platform choices',()=>{
 it('accepts only PC and Mobile for new input',()=>{
  expect(supportedPlatformSchema.options).toEqual(['STEAM_PC','MOBILE']);
  expect(supportedPlatformSchema.safeParse('PLAYSTATION').success).toBe(false);
  expect(supportedPlatformSchema.safeParse('XBOX').success).toBe(false);
 });
 it('retains the ability to read legacy records without remapping them',()=>{
  expect(platformSchema.safeParse('PLAYSTATION').success).toBe(true);
 });
});
