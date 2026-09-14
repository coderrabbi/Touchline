const {chromium}=require('C:/Users/Golam Rabbi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),sharp=require('sharp');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',async r=>{if(r.status()>=400&&r.url().includes('/api/v1/'))console.log('API error',r.status(),r.url().split('?')[0],(await r.json().catch(()=>({}))).message);});
  await page.addInitScript(()=>{window.toneCount=0;const original=AudioContext.prototype.createOscillator;AudioContext.prototype.createOscillator=function(){window.toneCount++;return original.call(this);};});
  let incoming=false;
  await page.route('**/api/v1/notifications',route=>route.fulfill({json:{success:true,message:'Browser fixture',data:incoming?[{id:'6dd9bba8-2ca5-4fb5-aa33-d261189dc8fd',title:'New group message',message:'A test notification for sound validation.',link:'/dashboard/notifications',readAt:null,createdAt:new Date().toISOString()}]:[]}}));
  await page.goto('http://localhost:3100/register');
  assert.deepEqual(await page.locator('#platform option').allTextContents(),['PC','Mobile']);
  const suffix=Date.now().toString(36),username='design_'+suffix;
  for(const [id,value] of Object.entries({name:'Alex Morgan',username,email:username+'@example.com',password:'Cedar7Moon!'+suffix,confirmPassword:'Cedar7Moon!'+suffix,efootballUsername:'DesignStriker_'+suffix}))await page.locator('#'+id).fill(value);
  await page.getByRole('button',{name:'Create account →',exact:true}).click();await page.waitForURL('**/dashboard');
  await page.goto('http://localhost:3100/players/'+username);
  await page.getByRole('button',{name:'Change profile picture',exact:true}).waitFor();
  const picture=await sharp({create:{width:128,height:128,channels:3,background:{r:92,g:129,b:65}}}).png().toBuffer();
  await page.getByLabel('Choose profile picture').setInputFiles({name:'avatar-fixture.png',mimeType:'image/png',buffer:picture});
  await page.locator('.profile-photo img').waitFor();await page.waitForFunction(()=>document.querySelector('.profile-photo img')?.naturalWidth>0);
  await page.reload();await page.locator('.profile-photo img').waitFor();
  await page.screenshot({path:'.local/profile-concept-desktop.png',fullPage:true});
  for(const width of [320,390,768]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'.local/profile-concept-mobile.png',fullPage:true});
  await page.getByRole('button',{name:/^Notifications/}).click();await page.getByRole('button',{name:'Enable notification sound',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'Mute notification sound',exact:true}).getAttribute('aria-pressed'),'true');
  const before=await page.evaluate(()=>window.toneCount);assert.equal(before,2);
  await page.getByRole('button',{name:'Close notifications',exact:true}).click();incoming=true;
  await page.locator('.notification-toast').getByText('New group message',{exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>window.toneCount),4);
  await page.getByRole('button',{name:/^Notifications/}).click();await page.getByRole('button',{name:'Mute notification sound',exact:true}).click();await page.getByRole('button',{name:'Close notifications',exact:true}).click();
  await page.goto('http://localhost:3100/tournaments/summer-community-cup?tab=Bracket');await page.locator('.bracket-match').first().waitFor();
  assert.ok(await page.locator('.bracket-lines path').count()>0);assert.ok(await page.locator('.bracket-match .player-avatar').count()>0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:'.local/bracket-concept-mobile.png',fullPage:true});
  await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'.local/bracket-concept-desktop.png',fullPage:true});
  await page.getByRole('button',{name:'Match list',exact:true}).click();await page.getByRole('combobox',{name:'Bracket round',exact:true}).selectOption('1');assert.ok(await page.locator('.bracket-list .bracket-match').count()>0);
  await page.locator('.bracket-list .bracket-match').first().click();await page.waitForURL('**/matches/**');
  await page.goto('http://localhost:3100/tournaments/european-elite-league?tab=Standings');await page.locator('table').waitFor();assert.equal(await page.getByRole('tab',{name:'Bracket',exact:true}).count(),0);
  assert.deepEqual(errors,[]);console.log(JSON.stringify({errors,checks:'PC/Mobile choices; owner photo upload survives reload; profile fits 320/390/768; sound chime on enable and incoming notification; mute; connected bracket; avatar cards; mobile scroll; match links; league table'}));
 }catch(e){for(const context of browser.contexts())for(const page of context.pages())console.log('Failure screen',page.url().split('?')[0],(await page.locator('body').innerText()).slice(-2000));throw e;}finally{await browser.close();}
})().catch(e=>{console.error(e.message);process.exit(1);});
