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
  const icons={advanced:'eye',panel:'objects',layersPanel:'layers',selectionPropertiesWindow:'select',snapPropertiesWindow:'snap',measurementPropertiesWindow:'tapeRuler'};
  const ids=Object.keys(icons);
  let peerHeader,peerToolbar;
  if(app==='ChipDraw'){
   await page.waitForFunction(()=>document.getElementById('advanced').style.height);
   const rectangles=await page.evaluate(()=>['tools','advanced','panel','layersPanel'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return {id,left:r.left,top:r.top,right:r.right,bottom:r.bottom}}));
   for(let i=0;i<rectangles.length;i++)for(let j=i+1;j<rectangles.length;j++){const a=rectangles[i],b=rectangles[j];assert.ok(a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top,a.id+' and '+b.id+' initially do not overlap')}
   await page.screenshot({path:path.join(directory,'expanded.png')});
   assert.equal(await page.locator('#tools').evaluate(node=>!!node.chipFloatingPanel),true,'drawing toolbar mounts the existing common window controller');
  }
  const symbols=await page.evaluate(ids=>ids.map(id=>document.querySelector('#'+id+' .ui-panel-mini button svg').outerHTML),ids);assert.equal(new Set(symbols).size,ids.length,'each panel has a distinct identity icon');
  for(const id of ids){
   const shell=page.locator('#'+id);
   assert.equal(await shell.isVisible(),true);
   assert.equal(await shell.locator('.ui-floating-body').isVisible(),!id.endsWith('Window'),id+' starts in its own configured state');
  }
  for(const id of ids){
   await page.evaluate(({ids,id})=>{for(const key of ids)document.getElementById(key).style.visibility=key===id?'visible':'hidden'},{ids,id});
   const panel=page.locator('#'+id);
   await panel.evaluate(node=>node.chipFloatingPanel.setPinned(true));
   assert.equal(await panel.locator('.ui-panel-mini button').isVisible(),false);
   // Separate panels so pointer checks do not depend on the initial overlap.
   await panel.evaluate(node=>node.chipFloatingPanel.place(550,120));
   await page.mouse.move(0,0);
   const heading=panel.locator('.ui-floating-heading');
   const titleIcon=heading.locator(':scope > svg');
   assert.deepEqual(await heading.evaluate(h=>[...h.children].map(c=>c.localName)),['svg','strong','button','button','button']);
   const titleGap=await titleIcon.evaluate(n=>n.nextElementSibling.getBoundingClientRect().left-n.getBoundingClientRect().right);
   assert.ok(titleGap>=0&&titleGap<=12,'identity icon sits immediately before title');
   const shape=await titleIcon.innerHTML();
   if(id!=='advanced'){
    const chrome=await heading.evaluate(h=>[h,...h.children].map(node=>{
     const css=getComputedStyle(node);return [css.height,css.font,css.padding,css.color,css.backgroundColor];
    }));
    peerHeader??=chrome;assert.deepEqual(chrome,peerHeader,id+' uses the same header and controls as Objects');
   }
   const initial=await panel.boundingBox();
   await heading.locator('.ui-panel-collapse').click();
   const toolbar=panel.getByRole('toolbar',{name:await heading.locator('strong').textContent(),exact:true});
   const restore=toolbar.getByRole('button');
   assert.equal(await restore.count(),1);assert.equal(await restore.locator('svg').innerHTML(),shape);
   assert.equal(await restore.getAttribute('aria-controls'),await panel.locator('.ui-floating-body').getAttribute('id'));
   assert.equal(await panel.getAttribute('data-panel-icon'),icons[id]);
   assert.equal(await panel.locator('.ui-floating-body').isVisible(),false);
   assert.equal(await panel.locator('.ui-panel-edge').first().isVisible(),false);
   assert.equal(await toolbar.locator('.ui-toolbar-handle').isVisible(),false);
   const small=await panel.boundingBox();
   assert.ok(small.width<110&&small.height<90,id+' collapses to one toolbar icon');
   if(id!=='advanced'){
    const chrome=await restore.evaluate(button=>{const css=getComputedStyle(button);return [css.width,css.height,css.padding,css.color,css.backgroundColor]});
    peerToolbar??=chrome;assert.deepEqual(chrome,peerToolbar,id+' uses the same restore button as Objects');
   }
   await restore.press('ArrowRight');const moved=await panel.boundingBox();assert.ok(Math.abs(moved.x-small.x-10)<1);
   const r=await restore.boundingBox(),x=r.x+r.width/2,y=r.y+r.height/2;
   await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+30,y+20);await page.mouse.up();
   const dragged=await panel.boundingBox();assert.ok(Math.abs(dragged.x-moved.x-30)<2&&Math.abs(dragged.y-moved.y-20)<2);
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
 console.log(JSON.stringify({ok:true,checks:['independent initial pane states and matching headers','shared floating panel collapses to shared toolbar icon','pointer and keyboard restore and movement','resized dimensions survive collapse','collapsed and restored panels stay within narrow windows'],screenshot:path.join(directory,'collapsed.png')}));
}finally{await browser.close()}
