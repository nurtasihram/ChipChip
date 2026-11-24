import assert from 'node:assert/strict';
const {chromium}=await import(process.env.CHIPDRAW_PLAYWRIGHT||'playwright');
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-gpu','--disable-software-rasterizer'],...(process.env.CHIPDRAW_BROWSER?{executablePath:process.env.CHIPDRAW_BROWSER}:{})});
async function checkIndependentPanes(page){
 const panes=[
  {body:'selectionProperties',title:'選取',launcher:'selectionPropertiesWindowRestore'},
  {body:'snapProperties',title:'吸附',launcher:'snapPropertiesWindowRestore'},
  {body:'measurementProperties',title:'計量單位',launcher:'measurementPropertiesWindowRestore'}
 ];
 const desktop=page.viewportSize();
 await page.setViewportSize({width:375,height:820});
 await page.reload();
 for(const {body,launcher} of panes){
  await page.locator('#'+launcher).click();
  const heading=page.locator('#'+body+'Window .ui-floating-heading');
  const reachable=await heading.getByRole('button').evaluateAll(buttons=>buttons.map(button=>{
   const rect=button.getBoundingClientRect();
   return button.contains(document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2));
  }));
  assert.deepEqual(reachable,[true,true,true],body+' title buttons stay accessible on a narrow board');
  await heading.locator('.ui-panel-collapse').click();
 }
 await page.setViewportSize(desktop);
 await page.reload();
 await page.locator('#layerAddToggle').click();
 assert.equal(await page.locator('#layerCreation').isVisible(),true);
 await page.locator('#layersClose').click();
 assert.equal(await page.locator('#layerAddToggle').getAttribute('aria-expanded'),'false');
 await page.locator('#layersPanelRestore').click();
 assert.equal(await page.locator('#layerCreation').isVisible(),false);
 await page.locator('#closeSettings').click();
 const view=page.locator('#viewProperties');
 for(const [index,{body,title,launcher}] of panes.entries()){
  const shell=page.getByRole('region',{name:title,exact:true});
  assert.equal(await shell.evaluate(node=>node.parentElement===document.body),true);
  const open=page.locator('#'+launcher);
  assert.equal(await open.getAttribute('aria-controls'),body);
  assert.equal(await open.getAttribute('aria-expanded'),'false');
  await open.press('Enter');
  const heading=shell.locator('.ui-floating-heading');
  assert.deepEqual(await heading.evaluate(node=>[...node.children].map(c=>c.localName)),['svg','strong','button','button','button']);
  assert.deepEqual(await heading.getByRole('button').evaluateAll(buttons=>buttons.map(b=>b.getAttribute('aria-label'))),['釘選'+title,'收縮'+title,'關閉'+title]);
  await heading.getByRole('button',{name:'釘選'+title,exact:true}).click();
  assert.equal(await open.getAttribute('aria-expanded'),'true');
  assert.equal(await view.isVisible(),false);
  const rect=await heading.boundingBox();
  await page.mouse.move(rect.x+45,rect.y+15);await page.mouse.down();
  await page.mouse.move(65+index*455,330,{steps:4});await page.mouse.up();
 }
 const selection=page.locator('#selectionOperationChoices [data-option-id=add]');
 await selection.click();
 await page.locator('#snapEnabled').check();
 await page.locator('#lengthPrecision').fill('3');
 await page.locator('#advancedRestore').press('Space');
 await page.locator('#closeSettings').press('Enter');
 for(const {body} of panes)assert.equal(await page.locator('#'+body).isVisible(),true);
 await page.getByRole('button',{name:'關閉吸附',exact:true}).click();
 assert.equal(await page.locator('#snapProperties').isVisible(),false);
 assert.equal(await page.locator('#selectionProperties').isVisible(),true);
 assert.equal(await page.locator('#measurementProperties').isVisible(),true);
 await page.locator('#snapPropertiesWindowRestore').press('Enter');
 assert.equal(await page.locator('#snapEnabled').isChecked(),true);
 await page.getByRole('button',{name:'收縮計量單位',exact:true}).click();
 assert.equal(await page.locator('#measurementPropertiesWindowRestore').isVisible(),true);
 assert.equal(await selection.getAttribute('aria-pressed'),'true');
 await page.locator('#measurementPropertiesWindowRestore').click();
 assert.equal(await page.locator('#lengthPrecision').inputValue(),'3');
 assert.equal(await view.isVisible(),false);
 await page.evaluate(()=>ChipUI.setLanguage('en'));
 const heading=page.locator('#measurementPropertiesWindow .ui-floating-heading');
 assert.equal(await heading.locator('strong').textContent(),'Measurement Units');
 assert.deepEqual(await heading.getByRole('button').evaluateAll(buttons=>buttons.map(b=>b.getAttribute('aria-label'))),['Pin Measurement Units','Collapse Measurement Units','Close Measurement Units']);
 for(const [id,title] of [['panel','Objects'],['layersPanel','Layers'],['selectionPropertiesWindow','Selection'],['snapPropertiesWindow','Snapping'],['measurementPropertiesWindow','Measurement Units']]){
  const pane=page.locator('#'+id);
  assert.equal(await pane.locator('.ui-floating-heading strong').textContent(),title);
  assert.equal(await pane.locator('.ui-panel-mini').getAttribute('aria-label'),title);
  assert.equal(await pane.locator('.ui-panel-mini button').getAttribute('aria-label'),'Open '+title);
  assert.equal(await pane.locator('[role=tablist],[role=tab],[role=tabpanel]').count(),0);
 }
}
try{
 for(const app of ['ChipDraw','ChipChip']){
  const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];page.on('pageerror',error=>errors.push(error.message));await page.goto(new URL('../../'+app+'.html',import.meta.url).href);
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
  const settings=page.locator('#advanced');
  await settings.locator('.ui-panel-mini button').click();
  await page.locator('#measurementPropertiesWindowRestore').click();
  assert.equal(await settings.locator('.ui-floating-body').isVisible(),false,'leaving the unpinned view collapses it');
  await page.locator('#unitSelect').click();
  await page.locator('#uiChoicePopup').waitFor({state:'visible'});
  await page.locator('#uiChoicePopup [role=option]').first().click();
  assert.equal(await page.locator('#measurementProperties').isVisible(),true,'the dropdown belongs to the measurement pane');
  await page.locator('#advancedRestore').click();await page.locator('#originWidthValue').click();await page.locator('.quantity-precise input').focus();assert.equal(await settings.locator('.ui-floating-body').isVisible(),true,'precise quantity popup belongs to its panel');await page.locator('.quantity-precise input').press('Escape');assert.equal(await settings.locator('.ui-floating-body').isVisible(),true);
  await page.locator('#originWidth').click({button:'right'});await page.getByRole('menuitem',{name:'算式',exact:true}).click();await page.locator('.quantity-popup input').focus();assert.equal(await settings.locator('.ui-floating-body').isVisible(),true,'expression dialog belongs to its panel');await page.locator('#outsideFocus').focus();assert.equal(await settings.locator('.ui-panel-mini button').isVisible(),true);assert.equal(await page.locator('.quantity-popup').count(),0,'collapsing dismisses owned popups');
  await settings.locator('.ui-panel-mini button').click();await page.locator('#originColor').click();await page.locator('#chipColorPopup').waitFor({state:'visible'});assert.equal(await settings.locator('.ui-floating-body').isVisible(),true,'color dialog belongs to its panel');await page.locator('#outsideFocus').click();assert.equal(await settings.locator('.ui-panel-mini button').isVisible(),true);assert.equal(await page.locator('#chipColorPopup').count(),0);
  await settings.locator('.ui-panel-mini button').click();await page.evaluate(()=>window.dispatchEvent(new Event('blur')));assert.equal(await settings.locator('.ui-panel-mini button').isVisible(),true,'window focus loss also collapses');
  await checkIndependentPanes(page);
  assert.deepEqual(errors,[]);await page.close();
 }
 console.log('PASS: common pin state, transient reopen, immediate pointer/keyboard/window focus collapse, repin retention, and owned dropdown/quantity/color popups');
}finally{await browser.close()}
