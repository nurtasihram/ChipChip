import assert from 'node:assert/strict';
const {chromium}=await import(process.env.CHIPDRAW_PLAYWRIGHT||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.CHIPDRAW_BROWSER?{executablePath:process.env.CHIPDRAW_BROWSER}:{})});
const near=(a,b)=>assert.ok(Math.abs(a-b)<.003,`${a} != ${b}`),extent=(actual,expected)=>{for(const key of ['left','top','right','bottom'])near(actual[key],expected[key]);};
try{
 const page=await browser.newPage({viewport:{width:1400,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(new URL('../ChipDraw.html',import.meta.url).href);
 await page.evaluate(()=>{ChipUI.panel.setOpen(false);$('panel').classList.remove('show');showLayers(false);$('advanced').open=false;$('snapEnabled').checked=false;$('toolsButtons').querySelector('[data-tool=rect]').click();});
 const results=await page.evaluate(()=>{
  const screenBounds=n=>{const b=n.getBBox(),m=n.getScreenCTM(),r=svg.getBoundingClientRect(),p=[[b.x,b.y],[b.x+b.width,b.y],[b.x+b.width,b.y+b.height],[b.x,b.y+b.height]].map(([x,y])=>transformPoint({x,y},m));return {left:Math.min(...p.map(p=>p.x))-r.left,top:Math.min(...p.map(p=>p.y))-r.top,right:Math.max(...p.map(p=>p.x))-r.left,bottom:Math.max(...p.map(p=>p.y))-r.top};};
  const results=[];for(const mirror of [false,true])for(const angle of [0,37,-31,90])for(const reference of Object.keys(ChipDrawingModel.rectAnchors)){
   scale=3;viewAngle=angle;viewMirrored=mirror;ox=17;oy=-13;view();constructionTools.toolChanged('rect');$('rectConstructionTools').querySelector('[data-option-id="'+reference+'"]').click();const factor=ChipDrawingModel.rectAnchors[reference],A={x:500,y:380},B={x:A.x+(factor[0]===1?-120:120),y:A.y+(factor[1]===-1?-60:60)},camera=drawCamera(),world=p=>{const q=camera.toWorld(p);return {x:q.x,y:-q.y}},a=world(A),b=world(B),w=120*(factor[0]===.5?2:1),h=60*(factor[1]===-.5?2:1),expected={left:A.x-w*factor[0],top:A.y+h*factor[1],right:A.x+w*(1-factor[0]),bottom:A.y+h*(1+factor[1])};
   const draft=makeShape('rect',a,b,preview),draftBounds=screenBounds(draft);draft.remove();const n=makeShape('rect',a,b),finished=screenBounds(n),raw=ChipDrawingJson.read(n),projected=ChipDrawingJson.update(n,raw),roundtrip=screenBounds(projected);projected.remove();results.push({mirror,angle,reference,expected,draft:draftBounds,finished,roundtrip,raw});
  }return results;
 });
 assert.equal(results.length,88);for(const row of results){extent(row.draft,row.expected);extent(row.finished,row.expected);extent(row.roundtrip,row.expected);assert.equal(Object.hasOwn(row.raw,'mirror'),false);}
 // Replay the reported case through real pointer events, including touch, both ways of completing and undo.
 const bounds=()=>page.evaluate(()=>{const n=selected||preview.querySelector('rect'),b=n.getBBox(),r=svg.getBoundingClientRect(),m=n.getScreenCTM(),p=[[b.x,b.y],[b.x+b.width,b.y],[b.x+b.width,b.y+b.height],[b.x,b.y+b.height]].map(([x,y])=>transformPoint({x,y},m));return {left:Math.min(...p.map(p=>p.x))-r.left,top:Math.min(...p.map(p=>p.y))-r.top,right:Math.max(...p.map(p=>p.x))-r.left,bottom:Math.max(...p.map(p=>p.y))-r.top};});
 for(const input of ['mouse','touch'])for(const gesture of ['click','drag']){
  const positions=await page.evaluate(()=>{setTool('select');selection.clear();selected=null;layers.active().replaceChildren();scale=3;viewAngle=37;viewMirrored=true;view();setTool('rect');$('rectConstructionTools').querySelector('[data-option-id="top-left"]').click();const r=svg.getBoundingClientRect();return {a:{x:r.left+500,y:r.top+380},b:{x:r.left+620,y:r.top+440},before:history.length};}),{a,b}=positions,expected={left:500,top:380,right:620,bottom:440};let cdp;
  if(input==='touch'){cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});}
  const down=async p=>input==='mouse'?(await page.mouse.move(p.x,p.y),await page.mouse.down()):cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,...p}]}),move=async p=>input==='mouse'?page.mouse.move(p.x,p.y,{steps:4}):cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,...p}]}),up=async()=>input==='mouse'?page.mouse.up():cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await down(a);if(gesture==='click'){await up();if(input==='mouse')await move(b);await down(b);}else await move(b);await up();extent(await bounds(),expected);assert.equal(await page.evaluate(()=>history.length),positions.before+1);const before=await page.evaluate(()=>layers.active().children.length);await page.evaluate(()=>$('undo').click());assert.equal(await page.evaluate(()=>layers.active().children.length),before-1);if(cdp)await cdp.detach();
 }
 assert.deepEqual(errors,[]);console.log('PASS: 88 rectangle screen-reference placements, preview/commit/JSON round trip under rotation and reflection, mouse/touch click/drag and single-step undo');
}finally{await browser.close();}
