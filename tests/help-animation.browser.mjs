import assert from 'node:assert/strict';
const {chromium}=await import(process.env.CHIPDRAW_PLAYWRIGHT||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.CHIPDRAW_BROWSER?{executablePath:process.env.CHIPDRAW_BROWSER}:{})});
try{
 const page=await browser.newPage({viewport:{width:1400,height:900}}),errors=[],results=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(new URL('../ChipDraw.html',import.meta.url).href);await page.waitForFunction(()=>constructionTools);
 await page.evaluate(()=>{$('advanced').open=false;$('panel').classList.remove('show');$('layersPanel').hidden=true});
 for(const type of ['rect','arc']){
  await page.locator('#toolsButtons [data-tool='+type+']').click();
  const methods=await page.evaluate(type=>ChipUI.objectTypes.find(item=>item.id===type).methods.map(item=>item.id),type);
  for(const id of methods){
   await page.locator('#'+type+'ConstructionTools [data-option-id="'+id+'"]').hover();
   const timeline=await page.locator('#chipIconTooltip svg[data-construction-animation]').evaluate(n=>{
    const point=index=>{const dot=n.querySelector('[data-demo-point="'+index+'"]');return {x:Number(dot.getAttribute('cx')),y:Number(dot.getAttribute('cy')),visible:dot.getAttribute('visibility')==='visible'}},cursor=()=>{const m=n.querySelector('[data-demo-pointer]').transform.baseVal.consolidate().matrix;return {x:m.e,y:m.f}},scene=()=>({one:point(1),two:point(2),three:point(3),cursor:cursor(),stage:n.dataset.demoStage,shape:n.querySelector('[data-demo-shape]').outerHTML});
    n.chipHelpSeek(.05);const first=scene();n.chipHelpSeek(.25);const second=scene();n.chipHelpSeek(.5);const moving=scene();n.chipHelpSeek(.90);const done=scene();n.chipHelpSeek(.95);return {first,second,moving,done,hold:scene()};
   });
   assert.equal(timeline.first.two.visible,false,id+' must place point one first');assert.equal(timeline.first.three.visible,false);
   for(const key of ['x','y']){assert.ok(Math.abs(timeline.second.two[key]-timeline.second.cursor[key])<1e-4,id+' point two follows the active cursor');assert.equal(timeline.first.one[key],timeline.moving.one[key],id+' reference point stays fixed')}
   const active=type==='rect'?timeline.moving.two:timeline.moving.three;assert.equal(active.visible,true);for(const key of ['x','y'])assert.ok(Math.abs(active[key]-timeline.moving.cursor[key])<1e-4,id+' active number must not jump to its destination');
   assert.equal(timeline.done.stage,'complete');assert.deepEqual(timeline.done,timeline.hold,id+' holds the completed construction before restarting');
  }
 }
 for(const [type,id]of [['rect','top-right'],['arc','center-start-sweep']]){
  await page.locator('#toolsButtons [data-tool='+type+']').click();await page.locator('#'+type+'ConstructionTools [data-option-id="'+id+'"]').hover();
  const svg=page.locator('#chipIconTooltip svg[data-construction-animation]');await svg.waitFor({state:'visible'});await page.waitForTimeout(1350);
  const result=await svg.evaluate(n=>new Promise(resolve=>{
   const children=[...n.children],values=new Set(),times=[];let start;
   function sample(now){start??=now;times.push(now);values.add(n.querySelector('[data-demo-pointer]').getAttribute('transform'));if(now-start<800)requestAnimationFrame(sample);else{globalThis.lastHelpAnimation=n;resolve({nodes:n.querySelectorAll('*').length,distinct:values.size,samples:times.length,elapsed:now-start,reused:children.every((node,i)=>node===n.children[i])})}}requestAnimationFrame(sample);
  }));
  assert.ok(result.nodes<24,'reuse a small scene instead of duplicating every frame');assert.ok(result.distinct>=20,'pointer must update smoothly rather than six times per second');assert.equal(result.reused,true);
  await page.mouse.move(1350,850);await page.waitForTimeout(50);const stopped=await page.evaluate(()=>lastHelpAnimation.querySelector('[data-demo-pointer]').getAttribute('transform'));await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>lastHelpAnimation.querySelector('[data-demo-pointer]').getAttribute('transform')),stopped,'hidden help must stop updating');
  results.push({type,...result,updatesPerSecond:Math.round(result.distinct*1000/result.elapsed)});
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({ok:true,checks:['continuous SVG pointer updates','stable scene nodes','hidden tooltip animation stops','no browser errors'],results}));
}finally{await browser.close()}
