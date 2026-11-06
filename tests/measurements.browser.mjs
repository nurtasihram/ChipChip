import assert from 'node:assert/strict';
const {chromium}=await import(process.env.CHIPDRAW_PLAYWRIGHT||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.CHIPDRAW_BROWSER?{executablePath:process.env.CHIPDRAW_BROWSER}:{})});
const close=(a,b)=>assert.ok(Math.abs(a-b)<.001,`${a} != ${b}`);
try{
 const page=await browser.newPage({viewport:{width:1200,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto(new URL('../ChipDraw.html',import.meta.url).href);
 await page.evaluate(()=>{scale=3;viewAngle=27;viewMirrored=true;view();$('snapEnabled').checked=true;$('snapMode').value='nearest';for(const id of ['snapSearchRadius','snapTolerance']){$(id).dataset.quantityUnit='px';ChipUI.measurements.setValue(id,id==='snapTolerance'?0:120,'px')}$('unitSelect').value='mm';$('angleMode').value='deg';setTool('select');el('line',{x1:0,y1:0,x2:30,y2:0,stroke:'#fff','stroke-width':2})});
 const categories=values=>page.evaluate(values=>{snapRuntime.setTypes([...ChipUI.anchorTypes,...ChipUI.implicitAnchorTypes].filter(({id})=>{const legacy=['point','endpoint','node','position','corner'].includes(id)?'node':id;return values.includes(legacy)}).map(t=>t.id));clearSnapFeedback()},values);
 const screen=point=>page.evaluate(point=>transformPoint(point,$('world').getScreenCTM()),point);
 const query=point=>page.evaluate(point=>snap(point,{mode:'measurement'}),point);
 await categories([]);const a=await screen({x:5,y:0}),b=await screen({x:8,y:-4});await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:3});
 assert.equal(await page.locator('[data-measurement-ruler=triangle]').count(),1);
 const triangle=await page.evaluate(()=>({x:triangleMeasurement.corner.x,y:triangleMeasurement.corner.y,dx:$('moveRuler').querySelector('[data-move-x]').textContent,dy:$('moveRuler').querySelector('[data-move-y]').textContent,xColor:$('moveRuler').querySelector('[data-move-x-line]').getAttribute('stroke'),yColor:$('moveRuler').querySelector('[data-move-y-line]').getAttribute('stroke')}));
 close(triangle.x,3);close(triangle.y,0);assert.ok(triangle.dx.includes('3.00'));assert.ok(triangle.dy.includes('4.00'));assert.equal(triangle.xColor,'#ff6464');assert.equal(triangle.yColor,'#54d987');
 await categories(['ruler']);const hit=await query({x:3.1,y:.1});close(hit.x,3.1);close(hit.y,.1);assert.equal(await page.evaluate(()=>snapRuntime.lastHit),null,'an operational triangle is not a placed annotation reference');
 await page.evaluate(()=>document.querySelector('#snapRulerKinds [data-option-id=triangle]').click());const fixed=await query({x:3.1,y:.1});close(fixed.x,3.1);close(fixed.y,.1);await page.evaluate(()=>document.querySelector('#snapRulerKinds [data-option-id=triangle]').click());
 if(process.env.CHIPDRAW_TRIANGLE_SCREENSHOT)await page.screenshot({path:process.env.CHIPDRAW_TRIANGLE_SCREENSHOT});
 await page.mouse.up();assert.equal(await page.locator('#moveRuler').count(),0);assert.deepEqual(await query({x:3.1,y:.1}),{x:3.1,y:.1},'finished triangles are not snap targets');
 // Selection bounds can be targets independently of drawing-object categories.
 await categories(['selection']);const corner=await page.evaluate(()=>selectionSnapPoints()[0]),selectedHit=await query({x:corner.x+.1,y:corner.y+.1});close(selectedHit.x,corner.x);close(selectedHit.y,corner.y);assert.equal(await page.evaluate(()=>snapRuntime.lastHit.type),'selection');
 // Marquee corners snap to grid points rather than raw pointer coordinates.
 await page.evaluate(()=>{selection.clear();selected=null;renderSelection();scale=3;viewAngle=0;viewMirrored=false;view();$('gridX').value='10';$('gridY').value='10'});await categories(['grid']);const m1=await screen({x:-19,y:-19}),m2=await screen({x:19,y:19});await page.mouse.move(m1.x,m1.y);await page.mouse.down();await page.mouse.move(m2.x,m2.y,{steps:3});const rect=await page.evaluate(()=>({...drag.rect})),s1=await screen({x:-20,y:-20}),s2=await screen({x:20,y:20});close(rect.left,s1.x);close(rect.top,s1.y);close(rect.right,s2.x);close(rect.bottom,s2.y);await page.mouse.up();
 // Moving a selection uses its nearby boundary anchor and excludes its own bounds.
 await page.evaluate(()=>{art.innerHTML='';selection.clear();selected=null;layers.normalize();renderLayers();el('rect',{x:0,y:0,width:35,height:20,stroke:'#fff','stroke-width':2,fill:'none'})});await categories(['grid','selection']);const grab=await screen({x:33,y:0}),drop=await screen({x:45.4,y:7.2});await page.mouse.move(grab.x,grab.y);await page.mouse.down();await page.mouse.move(drop.x,drop.y,{steps:3});const moved=await page.evaluate(()=>snapRuntime.origin(selection.items[0]));close(moved.x,15);close(moved.y,10);await page.mouse.up();
 // The transform ruler exposes its fixed reference points while active.
 await categories(['ruler']);const p1=await screen({x:0,y:0}),p2=await screen({x:30,y:0});await page.mouse.move(p1.x,p1.y);await page.mouse.down({button:'middle'});await page.mouse.move(p2.x,p2.y);await page.mouse.up({button:'middle'});assert.equal(await page.evaluate(()=>ringGesture.stage),'mouse-adjust');const r=await query({x:.1,y:.1});close(r.x,0);close(r.y,0);assert.equal(await page.evaluate(()=>snapRuntime.lastHit.source),'縮旋尺');await page.keyboard.press('Escape');assert.deepEqual(await query({x:.1,y:.1}),{x:.1,y:.1});
 await page.evaluate(()=>{document.querySelector('#snapRulerKinds [data-option-id=triangle]').click()});await page.reload();assert.deepEqual(await page.evaluate(()=>snapRuntime.read().dynamicRulerKinds),['transform'],'ruler type preferences survive reload');
 assert.deepEqual(errors,[]);console.log('PASS: triangle X/Y offsets, ruler targets and filtering, selection bounds, snapped marquee, transient lifecycle and preferences');
}finally{await browser.close()}
