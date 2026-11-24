import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.CHIPDRAW_PLAYWRIGHT||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.CHIPDRAW_BROWSER?{executablePath:process.env.CHIPDRAW_BROWSER}:{})});
const near=(a,b,eps=.0001)=>assert.ok(Math.abs(a-b)<eps,`${a} != ${b}`);
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(new URL('../../ChipDraw.html',import.meta.url).href);
 await page.evaluate(()=>{$('panel').classList.remove('show');$('advanced').open=false;$('snapEnabled').checked=false;scale=2;view();});
 const click=async p=>{const q=await page.evaluate(p=>transformPoint(p,$('world').getScreenCTM()),p);await page.mouse.click(q.x,q.y);};
 const mode=async id=>{await page.locator('#toolsButtons [data-tool=point]').click();await page.locator('#pointConstructionTools [data-option-id="'+id+'"]').click();};
 const edit=async(id,v)=>{await page.locator('#'+id).fill(String(v));await page.locator('#'+id).dispatchEvent('change');};
 const latest=()=>page.evaluate(()=>({x:Number(selected.getAttribute('x1')),y:Number(selected.getAttribute('y1')),count:layers.active().children.length,history:history.length}));
 await page.evaluate(()=>{el('line',{x1:-100,y1:-70,x2:100,y2:-70,stroke:'#69b8ff','stroke-width':2});});
 await mode('divide');await click({x:-80,y:-70});await click({x:80,y:-70});await edit('pointConstructionNumerator',3);await edit('pointConstructionDenominator',4);
 assert.equal(await page.locator('[data-point-construction-preview]').count(),1);assert.equal(await page.locator('[data-point-construction-marker][data-confirmed=true]').count(),2);
 const before=await page.evaluate(()=>history.length);await page.locator('#pointConstructionCommit').click();let p=await latest();near(p.x,40);near(p.y,-70);assert.equal(p.count,2);assert.equal(p.history,before+1);await page.evaluate(()=>rectangleEditor().undo());assert.equal(await page.evaluate(()=>layers.active().children.length),1);await page.evaluate(()=>rectangleEditor().redo());assert.equal(await page.evaluate(()=>layers.active().children.length),2);
 // Reverse direction and invalid rational values must not create geometry.
 await click({x:80,y:-70});await click({x:-80,y:-70});await edit('pointConstructionDenominator',0);assert.equal(await page.locator('#pointConstructionCommit').isDisabled(),true);assert.equal(await page.locator('[data-point-construction-preview]').count(),0);await edit('pointConstructionDenominator',4);await page.keyboard.press('Enter');p=await latest();near(p.x,-40);
 await mode('length');await click({x:0,y:-70});await click({x:-60,y:-70});await edit('pointConstructionLength',130);await page.keyboard.press('Enter');p=await latest();near(p.x,-130);near(p.y,-70);
 // The same quadratic equation must continue past either endpoint; a tangent gives a different point.
 const extension=await page.evaluate(()=>{const curve=ChipCurveMetrics.bezier([{x:-80,y:70},{x:0,y:70},{x:80,y:150}]),m=ChipCurveMetrics.metric(curve);el('path',{d:'M -80 70 Q 0 70 80 150',stroke:'#69b8ff',fill:'none','stroke-width':2});return {forward:m.length(.5,1.5),reverse:-m.length(.5,-.5)};});
 for(const [direction,distance,expected]of [[{x:40,y:115},extension.forward,{x:160,y:250}],[{x:-40,y:75},extension.reverse,{x:-160,y:90}]]){
  await click({x:0,y:90});await click(direction);await edit('pointConstructionLength',distance);assert.equal(await page.locator('[data-point-extension-preview]').count(),1);const actual=await page.locator('[data-point-construction-preview]').evaluate(n=>({x:Number(n.getAttribute('cx')),y:Number(n.getAttribute('cy'))}));near(actual.x,expected.x);near(actual.y,expected.y);await page.locator('#pointConstructionCommit').click();p=await latest();near(p.x,expected.x);near(p.y,expected.y);
 }
 // A cubic with x(t)=200*t^3: the arc-length midpoint must be x=0, not x=-75.
 await page.evaluate(()=>{el('path',{d:'M -100 30 C -100 30 -100 30 100 30',stroke:'#69b8ff',fill:'none','stroke-width':2});});
 await mode('divide');await edit('pointConstructionNumerator',1);await edit('pointConstructionDenominator',2);await click({x:-100,y:30});await click({x:100,y:30});await page.keyboard.press('Enter');p=await latest();near(p.x,0);near(p.y,30);
 // Affine transforms and camera rotation/mirroring are independent of measurement.
 await page.evaluate(()=>{el('path',{d:'M -50 0 Q 0 -80 50 0',stroke:'#69b8ff',fill:'none','stroke-width':2,transform:'translate(0 110) scale(2 .5)'});viewAngle=27;viewMirrored=true;view();});
 await click({x:-100,y:110});await click({x:100,y:110});await page.locator('#pointConstructionCommit').click();p=await latest();near(p.x,0);near(p.y,90);
 // Units and display precision must not mutate the preview's geometry.
 await mode('length');await click({x:0,y:-70});await click({x:60,y:-70});await edit('pointConstructionLength',25.4);const preview=()=>page.locator('[data-point-construction-preview]').evaluate(n=>({x:Number(n.getAttribute('cx')),y:Number(n.getAttribute('cy'))}));const initial=await preview();await page.evaluate(()=>{$('unitSystem').value='imperial';$('unitSystem').dispatchEvent(new Event('change',{bubbles:true}));$('unitSelect').value='inch';$('unitSelect').dispatchEvent(new Event('change',{bubbles:true}));});near((await preview()).x,initial.x);near(Number(await page.locator('#pointConstructionLength').inputValue()),1);await page.keyboard.press('Escape');assert.equal(await page.locator('[data-point-construction-preview]').count(),0);
 // Every point method has a help animation, and the toolbar uses the shared shell.
 assert.equal(await page.locator('#pointConstructionTools.ui-floating-toolbar').count(),1);
 for(const id of ['divide','length']){
  await page.evaluate(()=>{pointConstruction.cancel();art.replaceChildren();layers.normalize();selected=null;selection.clear();$('unitSystem').value='metric';$('unitSystem').dispatchEvent(new Event('change',{bubbles:true}));$('unitSelect').value='mm';$('unitSelect').dispatchEvent(new Event('change',{bubbles:true}));viewAngle=0;viewMirrored=false;view();el('path',{d:'M -95 28 C -55 -70 65 -70 95 28',stroke:'#69b8ff',fill:'none','stroke-width':2});});
  await mode(id);if(id==='divide'){await edit('pointConstructionNumerator',1);await edit('pointConstructionDenominator',2);}else{const length=await page.evaluate(()=>ChipCurveMetrics.metric(ChipCurveMetrics.bezier([{x:35,y:118},{x:75,y:20},{x:195,y:20},{x:225,y:118}])).length(.12,1.06));await edit('pointConstructionLength',length);}
  const data=await page.evaluate(id=>{const curve=ChipCurveMetrics.bezier([{x:35,y:118},{x:75,y:20},{x:195,y:20},{x:225,y:118}]),a=curve.point(.12),b=curve.point(.83),help=ChipPointConstruction.help(id);const frames=[.1,.4,.7,.9].map(t=>{help.chipHelpSeek(t);return {confirmed:[...help.querySelectorAll('[data-demo-point]')].filter(n=>n.getAttribute('data-demo-confirmed')==='true').length,point:[...help.querySelectorAll('[data-demo-point]')].map(n=>({x:Number(n.getAttribute('cx'))-130,y:Number(n.getAttribute('cy'))-90}))};});return {a:{x:a.x-130,y:a.y-90},b:{x:b.x-130,y:b.y-90},frames};},id);
  assert.deepEqual(data.frames.map(f=>f.confirmed),[0,1,2,3]);
  await click(data.a);await click(data.b);const live=await page.locator('[data-point-construction-preview]').evaluate(n=>({x:Number(n.getAttribute('cx')),y:Number(n.getAttribute('cy'))}));near(live.x,data.frames[2].point[2].x);near(live.y,data.frames[2].point[2].y);await page.locator('#pointConstructionCommit').click();const actual=await latest();near(actual.x,data.frames[3].point[2].x);near(actual.y,data.frames[3].point[2].y);
 }
 await mkdir(new URL('../../output/point-construction/',import.meta.url),{recursive:true});await page.screenshot({path:new URL('../../output/point-construction/desktop.png',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1')});
 await page.setViewportSize({width:375,height:800});await page.evaluate(()=>{viewAngle=0;viewMirrored=false;view();});assert.equal(await page.locator('#pointConstructionControls').evaluate(n=>n.getBoundingClientRect().right<=innerWidth),true);
 assert.deepEqual(errors,[]);console.log('PASS: arc-length point placement, rational validation, reverse direction, original-parameter extension, transformed curves, units, undo/redo, help and narrow layout');
}finally{await browser.close()}
