import assert from 'node:assert/strict';
const {chromium}=await import(process.env.CHIPDRAW_PLAYWRIGHT||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.CHIPDRAW_BROWSER?{executablePath:process.env.CHIPDRAW_BROWSER}:{})});
try{
 const page=await browser.newPage({viewport:{width:1200,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const entry of ['ChipDraw.html','ChipChip.html']){
  await page.goto(new URL('../'+entry,import.meta.url).href);await page.locator('#viewMenuButton').click();
  await page.evaluate(()=>{document.getElementById('selectionDisplayMode').value='independent'});await page.locator('#selectionMerge').click();
  await page.locator('#selectionMerge').hover();await page.mouse.wheel(0,100);await page.waitForTimeout(100);
  assert.equal(await page.locator('#selectionDisplayMode').inputValue(),'all-simple','wheel immediately selects');
  assert.equal(await page.locator('#uiChoicePopup .focused').getAttribute('data-value'),'all-simple');
  await page.keyboard.press('Enter');assert.equal(await page.locator('#selectionDisplayMode').inputValue(),'all-simple');
  await page.locator('#selectionMerge').click();await page.locator('#selectionMerge').hover();await page.mouse.wheel(0,100);await page.waitForTimeout(100);await page.keyboard.press('Escape');
  assert.equal(await page.locator('#selectionDisplayMode').inputValue(),'adjacent-simple','Escape keeps the immediately selected value');
 }
 await page.goto(new URL('../ChipDraw.html',import.meta.url).href);
 await page.evaluate(()=>{selected=el('line',{x1:0,y1:0,x2:80,y2:40,stroke:'#69b8ff','stroke-width':2,'stroke-linecap':'round',fill:'none'});renderSelection();$('panel').classList.add('show')});
 const before=await page.locator('#selectionOverlay').innerHTML();
 await page.evaluate(()=>{ChipUI.measurements.setValue('sw',20,$('unitSelect').value);$('sw').dispatchEvent(new Event('input',{bubbles:true}))});
 assert.notEqual(await page.locator('#selectionOverlay').innerHTML(),before,'live stroke changes repaint selection');
 await page.locator('#viewMenuButton').click();await page.locator('#uiSnapTab').click();
 assert.equal(await page.locator('#snapSettings').isVisible(),false);await page.locator('#snapEnabled').check();assert.equal(await page.locator('#snapSettings').isVisible(),true);
 assert.equal(await page.locator('#snapSearchRadius').evaluate(n=>n.closest('.viewSettingsRow')===$('snapTolerance').closest('.viewSettingsRow')),true);
 assert.equal(await page.locator('#snapLayerChoices').getAttribute('data-selection-mode'),'multiple');
 await page.locator('#snapEnabled').uncheck();assert.equal(await page.locator('#snapSettings').isVisible(),false);
 await page.reload();await page.locator('#viewMenuButton').click();await page.locator('#uiSnapTab').click();assert.equal(await page.locator('#snapSettings').isVisible(),false);
 assert.deepEqual(errors,[]);console.log('PASS: shared immediate wheel selection and dismissal, live selection styling, grouped snap controls and persisted disabled state');
}finally{await browser.close()}
