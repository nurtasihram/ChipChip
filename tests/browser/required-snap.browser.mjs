import assert from 'node:assert/strict';
const {chromium}=await import(process.env.CHIPDRAW_PLAYWRIGHT||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.CHIPDRAW_BROWSER?{executablePath:process.env.CHIPDRAW_BROWSER}:{})});
try{
 const page=await browser.newPage({viewport:{width:1280,height:950}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(new URL('../../ChipDraw.html',import.meta.url).href);
 await page.evaluate(()=>{$('panel').classList.remove('show');$('layersClose').click();$('advanced').open=false;scale=3;view();for(const id of ['snapSearchRadius','snapTolerance']){for(let i=0;i<3&&ChipUI.measurements.canonicalUnit($(id+'Unit').textContent)!=='px';i++)$(id+'Unit').click();ChipUI.measurements.setValue(id,id==='snapTolerance'?20:100,'px');$(id).dispatchEvent(new Event('input',{bubbles:true}));}});
 const click=async p=>{const q=await page.evaluate(p=>transformPoint(p,$('world').getScreenCTM()),p);await page.mouse.click(q.x,q.y);};
 const setup=async(enabled=false,anchors=['endpoint'])=>page.evaluate(({enabled,anchors})=>{setTool('select');art.replaceChildren();selection.clear();selected=null;layers.normalize();el('line',{x1:-60,y1:0,x2:60,y2:0,stroke:'#69b8ff','stroke-width':1});snapRuntime.refreshLayers();snapRuntime.setTypes(anchors);$('snapEnabled').checked=enabled;$('snapEnabled').dispatchEvent(new Event('change',{bubbles:true}));}, {enabled,anchors});
 const mode=async(tool,id)=>{await page.locator('#toolsButtons [data-tool="'+tool+'"]').click();await page.locator('#'+tool+'ConstructionTools [data-option-id="'+id+'"]').click();};
 const state=()=>page.evaluate(()=>({enabled:snapRuntime.read().enabled,anchors:snapRuntime.read().anchorTypes,checked:$('snapEnabled').checked,nearest:$('snapTargets').querySelector('[data-option-id=nearest]').getAttribute('aria-pressed'),stored:JSON.parse(localStorage.getItem('snap_system'))}));
 for(const [tool,id]of [['point','divide'],['point','length'],['line','tangent'],['line','normal']]){
  await setup();const before=await state();await mode(tool,id);let active=await state();assert.equal(active.enabled,true,id);assert.equal(active.checked,true);assert.equal(active.nearest,'true');assert.deepEqual(active.stored,before.stored,'activation must not write temporary preferences');
  // A settings save while drawing must archive the original enabled/anchor values.
  await page.evaluate(()=>$('snapMode').dispatchEvent(new Event('change',{bubbles:true})));active=await state();assert.equal(active.stored.enabled,false);assert.deepEqual(active.stored.anchorTypes,['endpoint']);assert.deepEqual(await page.evaluate(()=>snapRuntime.read({preferences:true}).enabledTypes),['node']);
  await click({x:-20,y:2});assert.equal(await page.locator('[data-point-construction-marker][data-confirmed=true]').count(),1,'source locks outside the visible stroke without manually enabling snapping');
  if(tool==='point'){await click({x:20,y:2});await page.locator('#pointConstructionCommit').click();}else await click({x:20,y:30});
  const after=await state();assert.equal(after.enabled,false,id+' completion immediately restores disabled snapping');assert.equal(after.nearest,'false');assert.deepEqual(after.anchors,['endpoint']);assert.equal(await page.evaluate(()=>layers.active().children.length),2);
  // The next drawing acquires a fresh scope and pointer cancellation restores it.
  await click({x:-30,y:2});assert.equal((await state()).enabled,true);await page.locator('#svg').dispatchEvent('pointercancel',{pointerId:1});assert.equal((await state()).enabled,false);
  await mode(tool,id);await page.keyboard.press('Escape');assert.equal((await state()).enabled,false);
  await mode(tool,id);await page.locator('#toolsButtons [data-tool=select]').click();assert.equal((await state()).enabled,false);
 }
 // Existing enabled snapping and selected boundary points survive the temporary scope exactly.
 await setup(true,['endpoint','nearest','center']);const original=await state();await mode('line','tangent');await page.keyboard.press('Escape');const restored=await state();assert.equal(restored.enabled,original.enabled);assert.deepEqual(restored.anchors,original.anchors);assert.deepEqual(restored.stored,original.stored);
 // Display-all does not enumerate one projection per edge: a continuous boundary only supplies the closest point.
 await setup(true,['nearest']);await page.evaluate(()=>{$('snapMode').value='all';$('snapMode').dispatchEvent(new Event('change',{bubbles:true}));ChipUI.measurements.setValue('snapDisplayAmount',0,'count');$('snapDisplayAmount').dispatchEvent(new Event('input',{bubbles:true}));el('line',{x1:-60,y1:3,x2:60,y2:3,stroke:'#69b8ff'});el('line',{x1:-60,y1:6,x2:60,y2:6,stroke:'#69b8ff'});snap({x:13,y:.5},{mode:'preview'});});
 assert.equal(await page.locator('#snapFeedback [data-snap-candidate]').count(),1);assert.equal(await page.locator('#snapOverlapList').isVisible(),false);assert.equal(await page.evaluate(()=>snapRuntime.lastHit.point.y),0);
 await page.evaluate(()=>snap({x:13,y:5.5},{mode:'preview'}));assert.equal(await page.locator('#snapFeedback [data-snap-candidate]').count(),1);assert.equal(await page.evaluate(()=>snapRuntime.lastHit.point.y),6);
 assert.deepEqual(errors,[]);console.log('PASS: required boundary snapping auto-enables, restores after completion/cancel/tool change, never leaks into storage, and continuous boundaries only offer the closest point');
}finally{await browser.close();}
