import assert from 'node:assert/strict';
const {chromium}=await import(process.env.CHIPDRAW_PLAYWRIGHT||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.CHIPDRAW_BROWSER?{executablePath:process.env.CHIPDRAW_BROWSER}:{})});
try{
 for(const app of ['ChipDraw','PinView']){
  const context=await browser.newContext({viewport:{width:1280,height:1000}});
  const page=await context.newPage();
  const url=new URL('../'+app+'.html',import.meta.url).href;
  await page.goto(url);
  await page.evaluate(()=>{
   const s=ChipUI.measurements.settings;
   s.apply({...s.read(),pixel_phy:[[960,254],'mm']});
   document.getElementById('advanced').open=document.body.dataset.uiTitle!=='ChipDraw';
  });
  await page.locator('#uiMeasurementTab').click();
  const menu=page.locator('#pixelLengthUnit');
  await menu.click();
  await page.locator('#uiChoicePopup [data-value="inch"]').click();
  const current=()=>page.evaluate(()=>({value:ChipUI.measurements.settings.read().pixel_phy,factor:ChipViewport.units.px}));
  assert.deepEqual(await current(),{value:[[96,1],'inch'],factor:25.4/96});
  await page.close();
  const reopened=await context.newPage();await reopened.goto(url);
  const restored=await reopened.evaluate(()=>[ChipUI.measurements.settings.read().pixel_phy,
   document.getElementById('pixelCount').value,document.getElementById('pixelLength').value,
   document.getElementById('pixelLengthUnit').value,document.getElementById('dpiSource').value]);
  assert.deepEqual(restored,[[[96,1],'inch'],'96','1','inch','fraction']);
  await context.close();
  console.log('PASS '+app+' pixel calibration menu and reopen');
 }
}finally{await browser.close();}
