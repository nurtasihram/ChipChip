import assert from 'node:assert/strict';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {mkdtemp} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(process.env.CHIPDRAW_PLAYWRIGHT||'playwright');
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-gpu','--disable-software-rasterizer'],...(process.env.CHIPDRAW_BROWSER?{executablePath:process.env.CHIPDRAW_BROWSER}:{})});
const directory=await mkdtemp(path.join(tmpdir(),'chipchip-panels-'));
try{
 for(const app of ['ChipDraw','ChipChip']){
  const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];page.on('pageerror',error=>errors.push(error.message));await page.goto(pathToFileURL(path.resolve(app+'.html')).href);
  const ids=app==='ChipDraw'?['advanced','panel','layersPanel']:['advanced'];
  if(app==='ChipDraw'){
   await page.waitForFunction(()=>document.getElementById('advanced').style.height);
   const rectangles=await page.evaluate(()=>['tools','advanced','panel','layersPanel'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return {id,left:r.left,top:r.top,right:r.right,bottom:r.bottom}}));
   for(let i=0;i<rectangles.length;i++)for(let j=i+1;j<rectangles.length;j++){const a=rectangles[i],b=rectangles[j];assert.ok(a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top,a.id+' and '+b.id+' initially do not overlap')}
   await page.screenshot({path:path.join(directory,'expanded.png')});
   assert.equal(await page.locator('#tools').evaluate(node=>!!node.chipFloatingPanel),true,'drawing toolbar mounts the existing common window controller');
  }
  const symbols=await page.evaluate(ids=>ids.map(id=>document.querySelector('#'+id+' .ui-panel-mini button svg').outerHTML),ids);assert.equal(new Set(symbols).size,ids.length,'each panel has a distinct identity icon');
  for(const id of ids)assert.equal(await page.locator('#'+id).isVisible(),true,id+' starts expanded');
  for(const id of ids){
   await page.evaluate(({ids,id})=>{for(const key of ids)document.getElementById(key).style.visibility=key===id?'visible':'hidden'},{ids,id});
   const panel=page.locator('#'+id);assert.equal(await panel.isVisible(),true,id+' starts expanded');assert.equal(await panel.locator('.ui-panel-mini button').isVisible(),false);
   // Separate panels so pointer checks do not depend on the initial overlap.
   await panel.evaluate(node=>node.chipFloatingPanel.place(550,120));
   const titleIcon=panel.locator('.ui-floating-heading > svg');assert.equal(await titleIcon.count(),1);const titleGap=await titleIcon.evaluate(node=>node.nextElementSibling.getBoundingClientRect().left-node.getBoundingClientRect().right);assert.ok(titleGap>=0&&titleGap<=12,'identity icon sits immediately before title');assert.equal(await titleIcon.evaluate(node=>node.nextElementSibling.tagName),id==='advanced'?'STRONG':'B');assert.equal(await titleIcon.locator('path').getAttribute('d'),await panel.locator('.ui-panel-mini button path').getAttribute('d'));const initial=await panel.boundingBox();await panel.locator('.ui-panel-collapse').click();assert.equal(await panel.locator('.ui-panel-mini').isVisible(),true);assert.equal(await panel.getAttribute('data-panel-icon'),{advanced:'eye',panel:'objects',layersPanel:'layers'}[id]);assert.equal(await panel.locator('.ui-floating-body').isVisible(),false);assert.equal(await panel.locator('.ui-panel-edge').first().isVisible(),false);
   assert.equal(await panel.evaluate(node=>node.classList.contains('ui-floating-toolbar')),true);if(app==='ChipDraw'){const dimensions=await panel.evaluate(node=>{const own=node.querySelector('.ui-toolbar-handle').getBoundingClientRect(),original=document.getElementById('toolsHandle').getBoundingClientRect(),button=node.querySelector('.ui-toolbar-button').getBoundingClientRect(),tool=document.querySelector('#toolsButtons button').getBoundingClientRect();return [own.width,original.width,button.width,tool.width,button.height,tool.height]});assert.equal(dimensions[0],dimensions[1]);assert.equal(dimensions[2],dimensions[3]);assert.equal(dimensions[4],dimensions[5])}const small=await panel.boundingBox();assert.ok(small.width<110&&small.height<90,id+' collapses to one toolbar icon');
   const grip=panel.locator('.ui-panel-mini .ui-toolbar-handle');assert.equal(await grip.textContent(),'⠿');assert.equal(await grip.locator('svg').count(),0);if(app==='ChipDraw'){assert.equal(await grip.innerHTML(),await page.locator('#toolsHandle').innerHTML());assert.equal(await grip.evaluate(node=>getComputedStyle(node).font),await page.locator('#toolsHandle').evaluate(node=>getComputedStyle(node).font))}await grip.focus();await page.keyboard.press('ArrowRight');const moved=await panel.boundingBox();assert.ok(Math.abs(moved.x-small.x-10)<1);const handleRect=await grip.boundingBox();await page.mouse.move(handleRect.x+handleRect.width/2,handleRect.y+handleRect.height/2);await page.mouse.down();await page.mouse.move(handleRect.x+handleRect.width/2+30,handleRect.y+handleRect.height/2+20);await page.mouse.up();const dragged=await panel.boundingBox();assert.ok(Math.abs(dragged.x-moved.x-30)<2&&Math.abs(dragged.y-moved.y-20)<2);
   await panel.locator('.ui-panel-mini button').click();assert.equal(await panel.locator('.ui-floating-body').isVisible(),true);const restored=await panel.boundingBox();assert.ok(Math.abs(restored.width-initial.width)<2);assert.ok(Math.abs(restored.height-initial.height)<2);
   // A manually resized panel retains its dimensions after repeated collapse.
   await panel.evaluate(node=>{node.style.setProperty('width','330px','important');node.style.setProperty('height','360px','important')});await panel.locator('.ui-panel-collapse').click();await panel.locator('.ui-panel-mini button').click();const resized=await panel.boundingBox();assert.ok(Math.abs(resized.width-330)<2&&Math.abs(resized.height-360)<2);
   await panel.locator('.ui-panel-collapse').click();await page.setViewportSize({width:400,height:650});await page.waitForFunction(id=>{const r=document.getElementById(id).getBoundingClientRect();return r.left>=0&&r.right<=400},id);const narrow=await panel.boundingBox();assert.ok(narrow.x>=0&&narrow.x+narrow.width<=400);await panel.locator('.ui-panel-mini button').click();const expanded=await panel.boundingBox();assert.ok(expanded.x>=0&&expanded.x+expanded.width<=400);await page.setViewportSize({width:1500,height:1000});
   if(id!=='advanced')await panel.evaluate(node=>node.chipFloatingPanel.place(1000,500));else await page.locator('#closeSettings').click();
  }
  if(app==='ChipDraw'){
   assert.equal(await page.locator('#tools').evaluate(node=>node.classList.contains('ui-floating-toolbar')),true);assert.equal(await page.locator('#toolsHandle').evaluate(node=>node.classList.contains('ui-toolbar-handle')),true);
   await page.locator('#panel').evaluate(node=>{node.style.visibility='visible';node.chipFloatingPanel.setCollapsed(true)});await page.locator('#panel').screenshot({path:path.join(directory,'collapsed.png')});
   await page.evaluate(()=>{for(const id of ['advanced','panel','layersPanel'])document.getElementById(id).style.visibility='hidden'});
   const tools=await page.locator('#tools').boundingBox(),handle=await page.locator('#toolsHandle').boundingBox();await page.mouse.move(handle.x+handle.width/2,handle.y+handle.height/2);await page.mouse.down();await page.mouse.move(handle.x+handle.width/2+1500-8-tools.width-tools.x,handle.y+handle.height/2);assert.equal(await page.locator('#dockPreview').evaluate(node=>node.classList.contains('visible')),true);await page.mouse.up();assert.equal(await page.locator('#tools').getAttribute('aria-orientation'),'vertical','existing toolbar docking still works');
  }
  assert.deepEqual(errors,[]);await page.close();
 }
 const narrowPage=await browser.newPage({viewport:{width:375,height:820}});await narrowPage.goto(pathToFileURL(path.resolve('ChipDraw.html')).href);await narrowPage.waitForFunction(()=>document.getElementById('advanced').style.height);const narrowRects=await narrowPage.evaluate(()=>['tools','advanced','panel','layersPanel'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom}}));for(let i=0;i<narrowRects.length;i++){const a=narrowRects[i];assert.ok(a.left>=0&&a.right<=375&&a.bottom<=820);for(let j=i+1;j<narrowRects.length;j++){const b=narrowRects[j];assert.ok(a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top,'narrow initial layout does not overlap')}}await narrowPage.screenshot({path:path.join(directory,'narrow.png')});await narrowPage.close();
 console.log(JSON.stringify({ok:true,checks:['all current panels start expanded','shared floating panel collapses to shared toolbar icon','pointer and keyboard restore and movement','resized dimensions survive collapse','collapsed and restored panels stay within narrow windows'],screenshot:path.join(directory,'collapsed.png')}));
}finally{await browser.close()}
