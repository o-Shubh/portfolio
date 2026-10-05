// Run with Playwright available on NODE_PATH. Does not send real messages.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const url = process.env.PORTFOLIO_URL || 'http://127.0.0.1:4180/';
(async () => {
 const browser = await chromium.launch({headless:true,channel:'msedge'});
 const errors=[];
 try {
  const context=await browser.newContext({colorScheme:'dark',reducedMotion:'reduce'});
  const page=await context.newPage(); page.on('pageerror',e=>errors.push(e.message));
  for(const width of [360,768,1024,1440]) {
   await page.setViewportSize({width,height:1000}); await page.goto(url); await page.waitForFunction(()=>!document.querySelector('#contact-form button').disabled);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`Overflow ${width}`);
   assert.equal(await page.locator('h1').count(),1);
   for(const img of await page.locator('img').all()){await img.scrollIntoViewIfNeeded();await img.evaluate(x=>x.decode());}
   assert.equal(await page.locator('img').evaluateAll(imgs=>imgs.every(x=>x.complete&&x.naturalWidth>0)),true);
   await page.getByRole('link',{name:'Home',exact:true}).click();
   await page.screenshot({path:path.join(__dirname,`../preview-${width}.png`),fullPage:true});
   console.log(`PASS responsive ${width}px, loaded images, one h1`);
  }
  await page.getByRole('button',{name:'Switch to light theme'}).click();
  await page.reload(); assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
  await page.getByRole('button',{name:'Switch to dark theme'}).click();
  await page.getByRole('button',{name:'Explore the project'}).click(); assert.equal(await page.locator('dialog').evaluate(x=>x.open),true);
  await page.keyboard.press('Escape'); assert.equal(await page.locator('dialog').evaluate(x=>x.open),false);
  assert.equal(await page.locator('.project-open').evaluate(x=>x===document.activeElement),true);
  await page.getByRole('button',{name:'Open email draft'}).click(); assert.equal(await page.locator('[aria-invalid=true]').count(),3);
  assert.equal(await page.locator('#contact-name').evaluate(x=>x===document.activeElement),true);
  const anchors=await page.locator('a[href^="#"]').evaluateAll(as=>as.map(a=>a.hash).filter(h=>h&&!document.querySelector(h)));
  assert.deepEqual(anchors,[]);
  assert.equal(await page.locator('body').innerText().then(t=>/entrepreneur|brokerage|Grayphyte|Elephas|founding/i.test(t)),false);
  assert.equal((await page.request.get(new URL('Shubham-Chandel-Resume.pdf',url).href)).ok(),true);
  await page.getByRole('link',{name:'Skills',exact:true}).click(); await page.waitForTimeout(100);
  assert.equal(await page.locator('.navlinks a[aria-current]').textContent(),'Skills');
  console.log('PASS theme persistence, modal Escape/focus, validation, anchors, exclusions, resume, active nav');
  // Supply isolated fixtures through intercepted requests; never publish these.
  const config=JSON.parse(fs.readFileSync(path.join(__dirname,'content.json'),'utf8'));
  config.formEndpoint='https://contact.test/send';
  await page.route('**/content.json',r=>r.fulfill({json:config}));
  await page.route('https://contact.test/send',r=>r.fulfill({status:500,body:'error'}));
  await page.reload(); await page.waitForFunction(()=>document.querySelector('#contact-form button').textContent.includes('Send message'));
  await page.locator('#contact-name').fill('Test Visitor'); await page.locator('#contact-email').fill('test@example.com'); await page.locator('#contact-message').fill('A test message, intercepted locally.');
  await page.getByRole('button',{name:'Send message'}).click(); await page.waitForFunction(()=>document.querySelector('#form-status').textContent.includes('could not'));
  await page.unroute('https://contact.test/send'); await page.route('https://contact.test/send',r=>r.fulfill({status:200,json:{ok:true}}));
  await page.getByRole('button',{name:'Send message'}).click(); await page.waitForFunction(()=>document.querySelector('#form-status').textContent.includes('successfully'));
  console.log('PASS contact error/success states with mocked endpoint; no message sent');
  await page.unroute('**/content.json');
  await page.route(url, async route=>{
   const response=await route.fetch();
   const fixture='<div class="video-frame" data-video="abcdefghijk"><button class="video-load">Load fixture video</button></div>';
   const html=(await response.text()).replace('<div class="video-grid">','<div class="video-grid"><article><h3>Test video</h3>'+fixture+'</article>')
    .replace('<div class="carousel" aria-roledescription="carousel">','<div class="carousel" aria-roledescription="carousel"><figure class="quote">Fixture one</figure><figure class="quote" hidden>Fixture two</figure><button data-carousel="-1">Previous fixture</button><button data-carousel="1">Next fixture</button><span id="slide-status"></span>');
   await route.fulfill({response,body:html});
  });
  await page.route('https://www.youtube-nocookie.com/**',r=>r.fulfill({body:'Test player',contentType:'text/html'}));
  await page.reload(); await page.getByRole('button',{name:'Next fixture'}).click(); assert.equal(await page.locator('.quote:visible').textContent(),'Fixture two');
  await page.getByRole('button',{name:'Previous fixture'}).press('Enter'); assert.equal(await page.locator('.quote:visible').textContent(),'Fixture one');
  assert.equal(await page.locator('iframe').count(),0); await page.getByRole('button',{name:'Load fixture video'}).click(); assert.equal(await page.locator('iframe').getAttribute('title'),'Test video');
  console.log('PASS carousel keyboard controls and click-to-load video with isolated fixtures');
  await context.close();
  const systemContext=await browser.newContext({colorScheme:'light',reducedMotion:'reduce'}); const systemPage=await systemContext.newPage(); await systemPage.goto(url);
  assert.equal(await systemPage.locator('html').getAttribute('data-theme'),'light'); await systemPage.emulateMedia({colorScheme:'dark'});
  await systemPage.waitForFunction(()=>document.documentElement.dataset.theme==='dark');
  await systemPage.waitForFunction(()=>document.querySelector('.role-typing').textContent==='Logistics Coordinator');
  assert.equal(await systemPage.locator('.hero-wrap').evaluate(x=>getComputedStyle(x,'::before').animationName),'none');
  await systemContext.close(); console.log('PASS system theme changes and reduced motion');
  const plain=await browser.newContext({javaScriptEnabled:false}); const fallback=await plain.newPage(); await fallback.goto(url); assert.equal(await fallback.locator('h1').isVisible(),true); assert.equal(await fallback.locator('#experience').isVisible(),true); await plain.close();
  assert.deepEqual(errors,[]); console.log('PASS no-JavaScript content and no browser errors');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
