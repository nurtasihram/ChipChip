import assert from 'node:assert/strict';
const {chromium}=await import(process.env.CHIPDRAW_PLAYWRIGHT||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.CHIPDRAW_BROWSER?{executablePath:process.env.CHIPDRAW_BROWSER}:{})});
const close=(a,b)=>assert.ok(Math.abs(a-b)<.001,`${a} != ${b}`);
try{
 const page=await browser.newPage({viewport:{width:1200,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(new URL('../ChipDraw.html',import.meta.url).href);
 await page.evaluate(()=>{ChipUI.panel.setOpen(false);$('panel').classList.remove('show');showLayers(false);scale=3;viewAngle=37;viewMirrored=true;view();$('snapEnabled').checked=true;$('snapMode').value='nearest';snapRuntime.setTypes([...ChipUI.anchorTypes,...ChipUI.implicitAnchorTypes].filter(({id})=>{const legacy=['point','endpoint','node','position','corner'].includes(id)?'node':id;return id==='grid'}).map(t=>t.id));$('gridX').value='10';$('gridY').value='10';for(const id of ['snapSearchRadius','snapTolerance']){$(id).dataset.quantityUnit='px';ChipUI.measurements.setValue(id,id==='snapTolerance'?0:120,'px')}});
 const screen=p=>page.evaluate(p=>transformPoint(p,$('world').getScreenCTM()),p),state=()=>page.evaluate(()=>triangleMeasurement&&({start:triangleMeasurement.start,end:triangleMeasurement.target}));
 for(const tool of ['line','rect','circle','ellipse','point']){
  await page.evaluate(tool=>setTool(tool),tool);const a=await screen({x:-20,y:-10}),b=await screen({x:10.2,y:9.8});await page.mouse.move(a.x,a.y);await page.mouse.down();assert.equal(await page.locator('#moveRuler').count(),1,tool+' starts with a reference ruler');await page.mouse.move(b.x,b.y,{steps:3});const ruler=await state();close(ruler.start.x,-20);close(ruler.start.y,-10);close(ruler.end.x,10);close(ruler.end.y,10);assert.equal(await page.locator('#moveRuler').evaluate(n=>n.parentElement.id),'world');await page.mouse.up();assert.equal(await page.locator('#moveRuler').count(),0,tool+' commit clears its ruler');
 }
 for(const tool of ['line','rect']){await page.evaluate(tool=>setTool(tool),tool);const a=await screen({x:-20,y:-10}),b=await screen({x:10,y:10});await page.mouse.click(a.x,a.y);assert.equal(await page.locator('#moveRuler').count(),1,'click placement keeps the pending anchor ruler');await page.mouse.move(b.x,b.y);close((await state()).end.x,10);await page.mouse.click(b.x,b.y);assert.equal(await page.locator('#moveRuler').count(),0)}
 await page.evaluate(()=>setTool('poly'));let a=await screen({x:-20,y:-20}),b=await screen({x:-10,y:0}),c=await screen({x:20,y:10});await page.mouse.click(a.x,a.y);await page.mouse.move(b.x,b.y);let ruler=await state();close(ruler.start.x,-20);close(ruler.end.x,-10);await page.mouse.click(b.x,b.y);await page.mouse.move(c.x,c.y);ruler=await state();close(ruler.start.x,-10);close(ruler.start.y,0);close(ruler.end.x,20);close(ruler.end.y,10);await page.keyboard.press('Escape');assert.equal(await page.locator('#moveRuler').count(),0);
 await page.evaluate(()=>setTool('bezier'));a=await screen({x:-20,y:-20});b=await screen({x:-10,y:0});c=await screen({x:20,y:10});await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y);ruler=await state();close(ruler.start.x,-20);close(ruler.end.x,-10);await page.mouse.up();await page.mouse.move(c.x,c.y);ruler=await state();close(ruler.start.x,-20);close(ruler.end.x,20);await page.mouse.click(c.x,c.y);await page.keyboard.press('Enter');assert.equal(await page.locator('#moveRuler').count(),0);
 const metric=path=>page.locator('[data-tool-path="tools.metric.'+path+'"]');
 const objects=page.locator('#art [data-object-type^="measurement-"]'),fixed=page.locator('#staticMeasurements [data-measurement-id]');
 await page.evaluate(()=>{setTool('select');scale=4;viewAngle=0;viewMirrored=false;view();$('snapEnabled').checked=false});
 const click=async(x,y)=>{const p=await screen({x,y});await page.mouse.click(p.x,p.y)};
 const initialDefault=await page.evaluate(()=>defaultTool());
 await metric('triangle.right').click();await click(-65,-45);await click(-30,-15);
 await click(-65,10);await click(-35,35);
 await metric('triangle.arbitrary').click();await click(0,-40);await click(40,-42);
 assert.equal(await objects.count(),2);
 await click(25,-10);
 await metric('tape').click();await click(15,25);await click(55,25);
 assert.equal(await objects.count(),4);assert.equal(await fixed.count(),4);
 const records=()=>page.evaluate(()=>measurementNodes().map(n=>ChipDrawingJson.read(n)));
 const placed=await records();assert.deepEqual(placed.map(n=>[n.type,n.reference]),[['measurement-triangle','right'],['measurement-triangle','right'],['measurement-triangle','arbitrary'],['measurement-tape',undefined]]);
 assert.equal(new Set(placed.map(n=>n.id)).size,4);
 assert.match(await fixed.last().locator('[data-metric-length]').textContent(),/40/);
 assert.equal(await fixed.nth(2).locator('[data-metric-angle]').count(),3);
 await click(60,40);await page.keyboard.press('Escape');assert.equal(await objects.count(),4);assert.deepEqual(await records(),placed);
 await page.evaluate(()=>setTool('select'));
 for(const [x,y,i]of [[-48,-45,0],[20,-41,2]]){await click(x,y);assert.equal(await page.evaluate(()=>ChipDrawingJson.read(selection.primary).id),placed[i].id)}
 await click(33,25);
 assert.equal(await page.evaluate(()=>ChipDrawingJson.read(selection.primary).id),placed[3].id);
 const moved=await screen({x:33,y:25}),target=await screen({x:35,y:32});
 await page.mouse.move(moved.x,moved.y);await page.mouse.down();await page.mouse.move(target.x,target.y,{steps:4});await page.mouse.up();
 const afterMove=await records();close(afterMove[3].points[0][0],17);close(afterMove[3].points[0][1],-32);
 assert.match(await fixed.last().locator('[data-metric-length]').textContent(),/40/);
 await metric('clear').click();assert.equal(await objects.count(),3);assert.deepEqual(await records(),placed.slice(0,3));
 await page.evaluate(()=>$('undo').click());assert.equal(await objects.count(),4);
 await page.evaluate(()=>{viewAngle=27;viewMirrored=true;view();$('snapEnabled').checked=true;snapRuntime.setTypes(['ruler','nearest']);clearSnapFeedback()});
 const snapped=await page.evaluate(()=>snapRuntime.snap({x:-65.1,y:-45.1},{mode:'measurement'}));close(snapped.x,-65);close(snapped.y,-45);
 const svg=await page.evaluate(()=>'<svg xmlns="http://www.w3.org/2000/svg">'+archiveDrawing()+'</svg>');
 await page.locator('#file').setInputFiles({name:'measurements.svg',mimeType:'image/svg+xml',buffer:Buffer.from(svg)});
 await page.waitForFunction(()=>!$('file').value);
 assert.deepEqual(await records(),afterMove);assert.equal(await fixed.count(),4);
 await page.evaluate(()=>$('snapEnabled').checked=false);await metric('tape').click();
 const touch=await page.context().newCDPSession(page);
 await touch.send('Emulation.setTouchEmulationEnabled',{enabled:true});
 const touchStart=await screen({x:-15,y:45}),touchEnd=await screen({x:40,y:48});
 await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:touchStart.x,y:touchStart.y}]});
 await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:touchEnd.x,y:touchEnd.y}]});
 await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();
 assert.equal(await objects.count(),5);assert.equal((await records()).at(-1).type,'measurement-tape');
 assert.equal(await page.evaluate(()=>defaultTool()),initialDefault);
 for(const [path,mode,count]of [['triangle.right','drag',3],['triangle.arbitrary','click',3],['tape','drag',2],['clear','clear',0]]){
  assert.equal(await metric(path).evaluate((n,mode)=>{const demo=n.chipHelpVisual();demo.chipHelpMode(mode,.86);const shape=demo.querySelector('[data-demo-shape]');return shape.getAttribute('visibility')==='visible'?shape.querySelectorAll('circle[visibility="visible"]').length:0},mode),count);
 }
 assert.deepEqual(errors,[]);console.log('PASS: all drawing tools show snapped anchor rulers, click placement retains reference, poly/pen use prior anchors, commit/cancel/delete clean up; multiple selectable static triangles and tapes preserve object geometry, distances, snapping, deletion, undo and SVG round trips');
}finally{await browser.close()}
