import assert from 'node:assert/strict';
const {chromium}=await import(process.env.CHIPDRAW_PLAYWRIGHT||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.CHIPDRAW_BROWSER?{executablePath:process.env.CHIPDRAW_BROWSER}:{})});
try{
 const page=await browser.newPage({viewport:{width:1200,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(new URL('../ChipDraw.html',import.meta.url).href);
 await page.evaluate(()=>{setTool('line');$('snapEnabled').checked=true;snapRuntime.setTypes(['endpoint']);scale=4;viewAngle=0;viewMirrored=false;view();el('line',{x1:0,y1:0,x2:40,y2:0,'data-name':'A'});el('line',{x1:0,y1:0,x2:0,y2:40,'data-name':'B'});snap({x:0,y:0},{mode:'preview'})});
 assert.equal(await page.locator('#snapOverlapList').isVisible(),true);
 await page.evaluate(()=>snap({x:40,y:0},{mode:'preview'}));assert.equal(await page.locator('#snapOverlapList').isVisible(),false);
 await page.evaluate(()=>view());assert.equal(await page.evaluate(()=>snapRuntime.lastHit?.point.x),40,'redraw uses latest solitary query instead of old overlap');
 const result=await page.evaluate(()=>{const client=transformPoint({x:40,y:0},$('world').getScreenCTM());scale=7;viewAngle=35;viewMirrored=true;ox+=500;oy+=200;view();const expected=transformPoint(client,$('world').getScreenCTM().inverse());return {expected,hit:snapRuntime.lastHit?.point||null,guide:$('snapFeedback').getAttribute('data-snap-type')}});
 assert.equal(result.hit,null,'camera change must not snap back to an anchor far from stationary pointer');assert.equal(result.guide,null);
 await page.evaluate(()=>{clearSnapFeedback();view()});assert.equal(await page.locator('#snapFeedback > *').count(),0,'cleared feedback stays cleared after view changes');
 await page.evaluate(()=>{viewAngle=0;viewMirrored=false;scale=4;ox=0;oy=0;view();setTool('select')});
 const p=await page.evaluate(()=>transformPoint({x:0,y:0},$('world').getScreenCTM()));await page.mouse.move(p.x,p.y);await page.evaluate(()=>snap({x:0,y:0},{mode:'preview'}));await page.mouse.move(p.x+260,p.y+180);const before=await page.evaluate(()=>scale);await page.mouse.wheel(0,120);await page.waitForFunction(before=>scale!==before,before);assert.equal(await page.locator('#snapOverlapList').isVisible(),false,'zoom at the current pointer does not resurrect old overlap candidates');assert.equal(await page.evaluate(()=>snapRuntime.lastHit),null);
 assert.deepEqual(errors,[]);console.log('PASS: latest snap probe, stationary pointer under zoom/rotation/mirror/pan, cleared feedback and wheel zoom after leaving overlapping anchors');
}finally{await browser.close()}
