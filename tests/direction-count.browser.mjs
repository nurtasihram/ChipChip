import assert from 'node:assert/strict';
const {chromium}=await import(process.env.CHIPDRAW_PLAYWRIGHT||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.CHIPDRAW_BROWSER?{executablePath:process.env.CHIPDRAW_BROWSER}:{})});
try{
 const page=await browser.newPage({viewport:{width:1200,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(new URL('../ChipDraw.html',import.meta.url).href);
 await page.evaluate(()=>{setTool('select');$('snapEnabled').checked=false;selected=el('path',{d:'M -2000 0 C -1500 0 -1000 0 -500 0 C 0 0 1000 0 2000 0',stroke:'none',fill:'none'});selection.replace([selected]);scale=2;viewAngle=0;viewMirrored=false;view();renderSelection()});
 const count=()=>page.locator('#geometryHints [data-geometry-direction]').count(),visible=()=>page.locator('#geometryHints [data-geometry-direction]').evaluateAll(nodes=>nodes.map(n=>({x:Number(n.getAttribute('data-direction-tip-x')),y:Number(n.getAttribute('data-direction-tip-y'))}))).then(points=>points.filter(p=>p.x>=8&&p.x<=1192&&p.y>=8&&p.y<=832));
 assert.equal(await count(),2);assert.ok((await visible()).length>=1,'a segment crossing the viewport keeps a visible arrow while both anchors are outside');
 for(const mirror of [false,true])for(const zoom of [1,8]){await page.evaluate(({mirror,zoom})=>{scale=zoom;viewMirrored=mirror;view();paintSelection()},{mirror,zoom});assert.equal(await count(),2);assert.ok((await visible()).length>=1)}
 await page.evaluate(()=>{selected.setAttribute('d','M -1000 0 C -1000 -300 1000 300 1000 0');scale=1;viewMirrored=false;view();paintSelection()});assert.equal(await count(),1);assert.equal((await visible()).length,1,'curved visible portion determines placement, rather than the endpoint or full-curve midpoint');
 await page.evaluate(()=>{selected=replaceVectorType(selected,'polyline',{points:'-1000,0 -20,0 0,10 20,0 1000,0'});selection.replace([selected]);scale=3;view();renderSelection()});assert.equal(await count(),4,'five anchors always produce four arrows');
 await page.evaluate(()=>{selected.setAttribute('points','0,0 0.1,0 0.2,0');renderSelection()});assert.equal(await count(),2,'short segments still retain their arrows');
 await page.evaluate(()=>{selected=replaceVectorType(selected,'path',{d:'M -40 0 L -20 0 M 20 0 L 40 0'});selection.replace([selected]);renderSelection()});assert.equal(await count(),2,'move commands never create an extra connecting segment');
 for(const [d,expected]of [['M -40 0 C -30 -10 -20 10 -10 0 S 10 -10 20 0',2],['M -40 0 Q -30 -20 -20 0 T 0 0 L 20 0',3],['m -40 0 c 10 -10 20 10 30 0 s 20 -10 30 0',2],['M -40 0 A 20 20 0 0 1 0 0 L 20 0',2]]){await page.evaluate(d=>{selected.setAttribute('d',d);renderSelection()},d);assert.equal(await count(),expected,d)}
 if(process.env.CHIPDRAW_DIRECTION_SCREENSHOT){await page.evaluate(()=>{selected.setAttribute('d','M -40 -25 L 40 25');selected.setAttribute('stroke','#69b8ff');selected.setAttribute('stroke-width','2');scale=8;viewAngle=0;viewMirrored=false;view();renderSelection()});await page.screenshot({path:process.env.CHIPDRAW_DIRECTION_SCREENSHOT,fullPage:true})}
 assert.deepEqual(errors,[]);console.log('PASS: one arrow per adjacent anchor pair, stable counts through zoom/mirror, offscreen endpoints, clipped curve placement, short segments and subpath separation');
}finally{await browser.close()}
