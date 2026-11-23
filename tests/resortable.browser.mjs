import assert from 'node:assert/strict';
const {chromium}=await import(process.env.CHIPDRAW_PLAYWRIGHT||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.CHIPDRAW_BROWSER?{executablePath:process.env.CHIPDRAW_BROWSER}:{})});
try{
 const page=await browser.newPage();
 await page.goto(new URL('../ChipDraw.html',import.meta.url).href);
 for(const [options,sortable] of [[{resortable:true},true],[{priority:true,resortable:false},false],[{priority:true},true]]){
  await page.evaluate(options=>{
   document.getElementById('choice-test')?.remove();
   const host=document.createElement('div');host.id='choice-test';
   host.style.cssText='position:fixed;top:10px;left:10px;z-index:99999;display:flex;background:black';
   document.body.append(host);
   ChipUI.optionModel(host,{...options,mode:'single',items:['a','b','c'].map(id=>({id,text:true,label:id})),selected:['b']});
  },options);
  const row=page.locator('#choice-test'),button=id=>row.locator('[data-option-id="'+id+'"]');
  const state=()=>row.evaluate(n=>[n.chipOptionModel.order(),n.chipOptionModel.values()]);
  const a=await button('a').boundingBox(),c=await button('c').boundingBox();
  await page.mouse.move(c.x+c.width/2,c.y+c.height/2);await page.mouse.down();
  await page.mouse.move(a.x+2,a.y+a.height/2,{steps:12});await page.mouse.up();
  assert.deepEqual(await state(),[sortable?['c','a','b']:['a','b','c'],['b']]);
  await button('b').focus();await page.keyboard.press('ArrowUp');
  assert.deepEqual((await state())[1],['a']);
  await button('a').hover();await page.mouse.wheel(0,90);
  await page.waitForFunction(()=>document.getElementById('choice-test').chipOptionModel.values()[0]==='b');
  await row.evaluate(n=>n.chipOptionModel.destroy());
 }
 const row=page.locator('#choice-test');
 await row.evaluate(host=>{
  host.style.width='180px';
  ChipUI.optionModel(host,{mode:'single',items:['a','b','c'].map(id=>({id,label:id,text:true})),selected:['b']});
  for(const button of host.children)button.style.flex='0 0 40px';
 });
 const visible=()=>row.locator('button:visible').evaluateAll(buttons=>buttons.map(b=>b.dataset.optionId));
 for(const mode of ['auto_collapse','collapse','expand']){
  await row.evaluate((host,mode)=>host.chipOptionModel.setDetailType(mode),mode);
  for(const width of [60,180]){
   await row.evaluate((host,width)=>{host.style.width=width+'px';},width);
   const folded=mode==='collapse'||(mode==='auto_collapse'&&width===60);
   await page.waitForFunction(folded=>document.querySelector('#choice-test').hasAttribute('data-choice-collapsed')===folded,folded);
   assert.deepEqual(await visible(),folded?['b']:['a','b','c']);
  }
 }
 await row.evaluate(host=>host.chipOptionModel.setDetailType('collapse'));
 await row.locator('[data-option-id=b]').click();
 assert.deepEqual(await visible(),['a','b','c']);
 await row.locator('[data-option-id=c]').click();
 assert.deepEqual(await visible(),['c']);
 assert.deepEqual(await row.evaluate(host=>host.chipOptionModel.values()),['c']);
 console.log('PASS detail_type width, selection and temporary expansion');
 console.log('PASS resortable drag, retained selection, arrow and wheel, legacy precedence');
}finally{await browser.close();}

