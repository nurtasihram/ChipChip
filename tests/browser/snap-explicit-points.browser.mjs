import assert from 'node:assert/strict';
const {chromium}=await import(process.env.CHIPDRAW_PLAYWRIGHT||'playwright');
const near=(a,b)=>assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<1e-7,JSON.stringify({a,b}));
const browser=await chromium.launch({headless:true,...(process.env.CHIPDRAW_BROWSER?{executablePath:process.env.CHIPDRAW_BROWSER}:{})});
try{
 const page=await browser.newPage({viewport:{width:1280,height:950}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(new URL('../../ChipDraw.html',import.meta.url).href);
 await page.evaluate(()=>{$('panel').classList.remove('show');$('layersPanel').chipFloatingPanel.setCollapsed(true,{focus:false});$('advanced').open=false;scale=2;view();$('snapEnabled').checked=true;setTool('line');for(const id of ['snapSearchRadius','snapTolerance']){for(let i=0;i<3&&ChipUI.measurements.canonicalUnit($(id+'Unit').textContent)!=='px';i++)$(id+'Unit').click();ChipUI.measurements.setValue(id,id==='snapTolerance'?12:100,'px');$(id).dispatchEvent(new Event('input',{bubbles:true}));}});
 const query=async(p,source=false)=>page.evaluate(({p,source})=>{snapRuntime.clear();if(source)snapRuntime.curveTarget(p);else snapRuntime.snap(p);const h=snapRuntime.lastHit;return h&&{type:h.type,point:h.point,label:h.label};},{p,source});
 for(const mode of ['nearest','all'])for(const amount of [1,0])for(const camera of [{angle:0,mirror:false},{angle:31,mirror:true}]){
  await page.evaluate(({mode,amount,camera})=>{art.replaceChildren();selection.clear();selected=null;layers.normalize();snapRuntime.refreshLayers();viewAngle=camera.angle;viewMirrored=camera.mirror;view();$('snapMode').value=mode;ChipUI.measurements.setValue('snapDisplayAmount',amount,'count');$('snapDisplayAmount').dispatchEvent(new Event('input',{bubbles:true}));el('line',{x1:0,y1:0,x2:100,y2:0,stroke:'#69b8ff'});el('line',{x1:30,y1:-10,x2:30,y2:30,stroke:'#69b8ff'});snapRuntime.setTypes(['endpoint','midpoint','intersection','nearest']);},{mode,amount,camera});
  for(const [p,type,point]of [[{x:2,y:.1},'node',{x:0,y:0}],[{x:48,y:.1},'midpoint',{x:50,y:0}],[{x:28,y:.1},'intersection',{x:30,y:0}]]){
   const hit=await query(p);assert.equal(hit?.type,type,JSON.stringify({mode,amount,camera,p,hit}));near(hit.point,point);
   assert.equal(await page.locator('#snapFeedback [data-snap-candidate^="near:"]').count(),0,'boundary projection cannot compete with an explicit point inside the lock radius');
   {const source=await query(p,true);assert.equal(source?.type,type,'construction uses the same feature priority');near(source.point,point);}
  }
  const scoped=await page.evaluate(()=>{const node=layers.active().children[0];snapRuntime.clear();const hit=snapRuntime.curveTarget({x:28,y:.1},{node,index:0});return hit&&{type:hit.type,source:hit.node===node,point:hit.point};});assert.equal(scoped?.type,'intersection','a selected source must still intersect other eligible objects');assert.equal(scoped.source,true);near(scoped.point,{x:30,y:0});
  const outside=await query({x:4,y:.1});assert.equal(outside.type,'nearest','a feature merely inside the search radius must not suppress the nearest boundary');assert.ok(Math.abs(outside.point.x-4)<1e-7);
  await page.evaluate(()=>snapRuntime.setTypes(['nearest']));assert.equal((await query({x:2,y:.1})).type,'nearest','disabled explicit point types cannot suppress boundary snapping');
 }
 // Every explicit point inside the lock radius remains in the candidate set in display-all mode.
 await page.evaluate(()=>{viewAngle=0;viewMirrored=false;view();art.replaceChildren();layers.normalize();el('line',{x1:0,y1:0,x2:5,y2:0,stroke:'#69b8ff'});el('line',{x1:1,y1:0,x2:4,y2:0,stroke:'#69b8ff'});snapRuntime.refreshLayers();snapRuntime.setTypes(['endpoint','nearest']);$('snapMode').value='all';ChipUI.measurements.setValue('snapDisplayAmount',0,'count');$('snapDisplayAmount').dispatchEvent(new Event('input',{bubbles:true}));});await query({x:2,y:.1});assert.equal(await page.locator('#snapFeedback [data-snap-candidate^="node:"]').count(),4);assert.equal(await page.locator('#snapFeedback [data-snap-candidate^="near:"]').count(),0);
 assert.deepEqual(errors,[]);console.log('PASS: endpoint/midpoint/intersection candidates survive closer boundary projections, lock-radius and type filters hold, all/nearest modes and transformed cameras share the rule');
}finally{await browser.close();}
