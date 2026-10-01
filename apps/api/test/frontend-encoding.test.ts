import {describe,it,expect} from 'vitest';
import {readdirSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
function sources(dir:string):string[]{return readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?sources(join(dir,entry.name)):/\.(tsx?|css)$/.test(entry.name)?[join(dir,entry.name)]:[])}
describe('Frontend text encoding',()=>{
 it('contains no replacement characters or corrupted UTF-8 punctuation',()=>{
  const files=['app','components','features','lib'].flatMap(dir=>sources(join('../web',dir)));
  const invalid=files.filter(file=>/[\uFFFD]|\u00e2[\u0080-\u00bf\u20ac\u2020]/u.test(readFileSync(file,'utf8')));
  expect(invalid).toEqual([]);
 });
});
