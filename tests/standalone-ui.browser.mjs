import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const {chromium}=await import(process.env.CHIPDRAW_PLAYWRIGHT||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.CHIPDRAW_BROWSER?{executablePath:process.env.CHIPDRAW_BROWSER}:{})});
try {
 const page=await browser.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.setContent('<main class="chip-ui"><div id="method"></div><div id="sampleTime"></div><input id="level" type="range" min="0" max="8" value="0" step="any"><output id="levelValue">0</output><select aria-label="Sample"><option>A</option><option>B</option></select></main>');
 const path=name=>fileURLToPath(new URL('../shared/'+name,import.meta.url));
 await page.addStyleTag({path:path('workspace-ui.css')});
 for(const file of ['ui-definitions.js','quantity-editor.js','workspace-ui.js'])await page.addScriptTag({path:path(file)});
 await page.evaluate(()=>{
  ChipUI.mount();ChipUI.mount();
  ChipUI.optionModel(document.querySelector('#method'),{items:[{id:'mean',label:'Mean'},{id:'median',label:'Median'}],mode:'single',selected:['mean']});
  ChipUI.conversionComponent(document.getElementById('level'),document.getElementById('levelValue'),null,{step:4});
  window.sample={time:{value:2,unit:'s'}};
  ChipUI.physicalQuantityComponent(document.querySelector('#sampleTime'),{id:'time',dimension:'time',object:sample,key:'time'});
 });
 await page.getByRole('button',{name:'Median'}).click();
 assert.equal(await page.getByRole('button',{name:'Median'}).getAttribute('aria-pressed'),'true');
 await page.locator('#level').focus();await page.keyboard.press('ArrowRight');
 assert.equal(await page.locator('#level').inputValue(),'2');
 await page.locator('#levelValue').click();await page.locator('.conversion-editor').fill('5');await page.locator('.conversion-editor').press('Enter');
 assert.equal(await page.locator('#level').inputValue(),'5');
 await page.locator('#time').fill('3');await page.locator('#time').press('Enter');
 assert.equal(await page.evaluate(()=>sample.time.value),3);
 await page.getByRole('combobox',{name:'Sample'}).click();
 await page.locator('#uiChoicePopup [data-value=B]').click();
 assert.equal(await page.getByRole('combobox',{name:'Sample'}).inputValue(),'B');
 assert.equal(await page.locator('#chipIconTooltip').count(),1);
 assert.equal(await page.locator('#advanced,#layersPanel,#snapProperties,svg[data-drawing-layer]').count(),0);
 assert.equal(await page.evaluate(()=>['ChipDrawUI','ChipDrawingLayers','ChipViewport','ChipSnap'].some(key=>key in window)||'layerOptions' in ChipUI),false);
 assert.deepEqual(errors,[]);
 console.log('PASS: standalone ChipUI, application choices, bound time input and application menu');
} finally {await browser.close();}
