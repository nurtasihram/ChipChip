import assert from 'node:assert/strict';
const {chromium}=await import(process.env.CHIPDRAW_PLAYWRIGHT||'playwright');
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-gpu','--disable-software-rasterizer'],...(process.env.CHIPDRAW_BROWSER?{executablePath:process.env.CHIPDRAW_BROWSER}:{})});
try{
 for(const app of ['ChipDraw','ChipChip']){
  const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];page.on('pageerror',error=>errors.push(error.message));await page.goto(new URL('../'+app+'.html',import.meta.url).href);
  if(app==='ChipDraw')await page.waitForFunction(()=>document.getElementById('advanced').style.height);
  const ids=app==='ChipDraw'?['advanced','panel','layersPanel']:['advanced'];
  await page.evaluate(()=>{const button=document.createElement('button');button.id='outsideFocus';button.textContent='外部';Object.assign(button.style,{position:'fixed',left:'1200px',top:'900px',zIndex:20000});document.body.append(button)});
  for(const id of ids){
   await page.evaluate(({ids,id})=>{for(const key of ids)document.getElementById(key).style.visibility=key===id?'visible':'hidden';document.getElementById(id).chipFloatingPanel.place(500,120)},{ids,id});
   const panel=page.locator('#'+id),pin=panel.locator('[data-panel-pin]'),restore=panel.locator('.ui-panel-mini button');assert.equal(await pin.getAttribute('aria-pressed'),'true','initial test panels remain pinned and expanded');
   await pin.click();assert.equal(await restore.isVisible(),true,'unpin collapses to the tool button');assert.equal(await pin.getAttribute('aria-pressed'),'false');
   await restore.click();assert.equal(await panel.locator('.ui-floating-body').isVisible(),true);await page.locator('#outsideFocus').focus();assert.equal(await restore.isVisible(),true,'keyboard focus loss immediately collapses');
   await restore.click();await page.locator('#outsideFocus').click();assert.equal(await restore.isVisible(),true,'outside pointer immediately collapses');
   await restore.click();await pin.click();assert.equal(await pin.getAttribute('aria-pressed'),'true');await page.locator('#outsideFocus').click();assert.equal(await panel.locator('.ui-floating-body').isVisible(),true,'repinning prevents automatic collapse');
   await pin.click();await restore.click();await panel.evaluate(node=>node.dispatchEvent(new FocusEvent('focusout',{bubbles:true,relatedTarget:node.querySelector('[data-panel-pin]')})));await pin.focus();assert.equal(await panel.locator('.ui-floating-body').isVisible(),true,'focus changes inside the panel do not collapse it');
   await pin.click();
  }
  if(app==='ChipDraw'){
   await page.evaluate(()=>{for(const id of ['advanced','panel','layersPanel'])document.getElementById(id).style.visibility=id==='panel'?'visible':'hidden';document.getElementById('panel').chipFloatingPanel.setPinned(false)});const object=page.locator('#panel');await object.locator('.ui-panel-mini button').click();await page.locator('#jsonTestToggle').click();await page.locator('#jsonTestText .monaco-editor').waitFor({state:'visible'});const draft=await page.evaluate(()=>{const field=document.getElementById('jsonTestText'),value=JSON.parse(field.value);value.name='未保存草稿';field.value=JSON.stringify(value);field.focus();return field.value});assert.equal(await object.locator('.ui-floating-body').isVisible(),true,'shadow editor focus belongs to the panel');await page.locator('#outsideFocus').focus();assert.equal(await object.locator('.ui-panel-mini button').isVisible(),true);await object.locator('.ui-panel-mini button').click();assert.equal(await page.evaluate(()=>document.getElementById('jsonTestText').value),draft,'auto collapse preserves the JSON draft');
  }
  // The common popup ownership chain keeps subordinate controls inside the transient panel.
  await page.evaluate(()=>{for(const id of ['advanced','panel','layersPanel']){const node=document.getElementById(id);if(node)node.style.visibility=id==='advanced'?'visible':'hidden'}const panel=document.getElementById('advanced');panel.open=true;panel.chipFloatingPanel.setPinned(false)});
  const settings=page.locator('#advanced');await settings.locator('.ui-panel-mini button').click();await page.locator('#uiMeasurementTab').click();await page.locator('#unitSelect').click();await page.locator('#uiChoicePopup').waitFor({state:'visible'});await page.locator('#uiChoicePopup [role=option]').first().click();assert.equal(await settings.locator('.ui-floating-body').isVisible(),true,'owned dropdown does not collapse its panel');
  await page.locator('#uiViewTab').click();await page.locator('#originWidthValue').click();await page.locator('.quantity-precise input').focus();assert.equal(await settings.locator('.ui-floating-body').isVisible(),true,'precise quantity popup belongs to its panel');await page.locator('.quantity-precise input').press('Escape');assert.equal(await settings.locator('.ui-floating-body').isVisible(),true);
  await page.locator('#originWidth').click({button:'right'});await page.getByRole('menuitem',{name:'算式',exact:true}).click();await page.locator('.quantity-popup input').focus();assert.equal(await settings.locator('.ui-floating-body').isVisible(),true,'expression dialog belongs to its panel');await page.locator('#outsideFocus').focus();assert.equal(await settings.locator('.ui-panel-mini button').isVisible(),true);assert.equal(await page.locator('.quantity-popup').count(),0,'collapsing dismisses owned popups');
  await settings.locator('.ui-panel-mini button').click();await page.locator('#originColor').click();await page.locator('#chipColorPopup').waitFor({state:'visible'});assert.equal(await settings.locator('.ui-floating-body').isVisible(),true,'color dialog belongs to its panel');await page.locator('#outsideFocus').click();assert.equal(await settings.locator('.ui-panel-mini button').isVisible(),true);assert.equal(await page.locator('#chipColorPopup').count(),0);
  await settings.locator('.ui-panel-mini button').click();await page.evaluate(()=>window.dispatchEvent(new Event('blur')));assert.equal(await settings.locator('.ui-panel-mini button').isVisible(),true,'window focus loss also collapses');
  assert.deepEqual(errors,[]);await page.close();
 }
 console.log('PASS: common pin state, transient reopen, immediate pointer/keyboard/window focus collapse, repin retention, and owned dropdown/quantity/color popups');
}finally{await browser.close()}
