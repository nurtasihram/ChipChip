import assert from 'node:assert/strict';
const {chromium}=await import(process.env.CHIPDRAW_PLAYWRIGHT||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.CHIPDRAW_BROWSER?{executablePath:process.env.CHIPDRAW_BROWSER}:{})});
try {
 for(const app of ['ChipDraw']){
  const page=await browser.newPage();
  await page.goto(new URL('../'+app+'.html',import.meta.url).href);
  await page.evaluate(()=>{
   const host=document.createElement('div');
   host.style.cssText='position:fixed;top:20px;left:20px;z-index:2147483647;background:white';
   host.innerHTML='<input type="range" min="0" max="80" step="any" value="40" style="width:120px"><output>40</output><span>mm</span>';
   document.body.append(host);
   const [input,output,unit]=host.children;
   input.id='wheel-test';
   ChipDrawUI.conversionComponent(input,output,unit,{step:4});
   input.addEventListener('input',()=>output.textContent=input.value);
   input.addEventListener('change',()=>input.dataset.committed=input.value);
  });
  const input=page.locator('#wheel-test');
  await input.hover();
  const before=await page.evaluate(()=>document.activeElement.tagName);
  for(const [delta,expected] of [[-100,60],[-100,80],[-100,80],[100,60]]){
   await page.mouse.wheel(0,delta);
   await page.waitForFunction(n=>document.getElementById('wheel-test').dataset.committed===String(n),expected);
   assert.equal(await input.inputValue(),String(expected));
  }
  assert.equal(await page.evaluate(()=>document.activeElement.tagName),before);
  await input.focus();
  await page.keyboard.press('ArrowLeft');
  assert.equal(await input.inputValue(),'40');
  await page.keyboard.press('ArrowRight');
  assert.equal(await input.inputValue(),'60');
  await page.close();
 }
 console.log('PASS hover wheel, step divisions, bounds and unfocused commit in ChipDraw');
}finally{await browser.close();}

