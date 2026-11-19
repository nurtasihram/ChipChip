import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const {chromium}=await import(process.env.CHIPDRAW_PLAYWRIGHT||'playwright');
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-gpu','--disable-software-rasterizer'],...(process.env.CHIPDRAW_BROWSER?{executablePath:process.env.CHIPDRAW_BROWSER}:{})});
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-4,`${a} != ${b}`);
try{
 const page=await browser.newPage({viewport:{width:1500,height:1100}}),errors=[];page.on('pageerror',error=>errors.push(error.message));await page.goto(new URL('../ChipDraw.html',import.meta.url).href);await page.waitForFunction(()=>constructionTools);
 async function hidePanels(){await page.evaluate(()=>{$('advanced').open=false;$('panel').classList.remove('show');$('layersPanel').hidden=true;$('snapEnabled').checked=false})}
 await hidePanels();
 const click=async p=>{const q=await page.evaluate(p=>transformPoint(p,$('world').getScreenCTM()),p);await page.mouse.click(q.x,q.y)};
 async function choose(type,id){await page.locator('#toolsButtons [data-tool='+type+']').click();await page.locator('#'+type+'ConstructionTools [data-option-id="'+id+'"]').click()}
 const read=()=>page.evaluate(()=>ChipDrawingJson.encode(selection.items).items[0]);
 // A rectangle can change its SVG rotation while a defining point is being dragged.
 const rectangles=[
  {type:'rect',reference:'edge',points:[[-45,0],[35,0]],height:-25},
  {type:'rect',reference:'right-triangle',points:[[-45,0],[35,0],[-5,40]]}
 ];
 const screenAt=(x,y)=>page.evaluate(p=>transformPoint(p,$('world').getScreenCTM()),{x,y:-y});
 for(const rectangle of rectangles){
  await page.evaluate(data=>{
   scale=4;viewAngle=27;viewMirrored=true;view();
   selected=ChipDrawingJson.create(data,layers.active(),style());layers.active().append(selected);renderSelection();
  },rectangle);
  const start=await screenAt(...rectangle.points[0]);await page.mouse.move(start.x,start.y);await page.mouse.down();
  assert.equal(await page.evaluate(()=>anchorDrag?.index),0);
  for(const [x,y] of [[-42,12],[-38,24],[-30,40],[-25,55]]){
   const screen=await screenAt(x,y);await page.mouse.move(screen.x,screen.y);
   await page.evaluate(()=>flushAnchorDrag());
   const raw=await read();
   assert.ok(Math.hypot(raw.points[0][0]-x,raw.points[0][1]-y)<.4,JSON.stringify(raw.points[0])+' should follow '+[x,y]);
   assert.deepEqual(raw.points[1],rectangle.points[1]);
   if(rectangle.reference==='edge')assert.equal(raw.height,rectangle.height);
   else{
    const expected=await page.evaluate(({points,original})=>ChipDrawingModel.rectangleDefinition('right-triangle',points,original).points[2],
     {points:raw.points.slice(0,2),original:rectangle.points[2]});
    close(raw.points[2][0],expected[0]);close(raw.points[2][1],expected[1]);
   }
  }
  await page.mouse.up();
  await page.evaluate(()=>{selected.remove();renderSelection()});
 }
 const rects=await page.evaluate(()=>ChipUI.toolMethods('rect').map(item=>item.id));
 assert.deepEqual(rects,['diagonal','edge','right-triangle','edge-midpoint']);
 for(const mirrored of [false,true])for(const reference of rects){
  await page.evaluate(mirror=>{scale=2;viewAngle=31;viewMirrored=mirror;view()},mirrored);
  await choose('rect',reference);await hidePanels();
  const before=await page.evaluate(()=>history.length),a={x:-20,y:10},b={x:24,y:44},c={x:34,y:6};
  await click(a);await click(b);
  if(['edge','right-triangle'].includes(reference)){
   assert.equal(await page.evaluate(()=>history.length),before);
   const target=await page.evaluate(p=>transformPoint(p,$('world').getScreenCTM()),c);
   await page.mouse.move(target.x,target.y);assert.equal(await page.locator('[data-rect-preview]').count(),1);
   await click(c);
  }
  const raw=await read(),pivot=raw.point||raw.points[0];
  assert.equal(raw.reference,reference);assert.equal(raw.type,'rect');close(pivot[0],a.x);close(pivot[1],-a.y);
  assert.equal(await page.evaluate(()=>history.length),before+1);
  if(reference==='edge-midpoint'){assert.ok(raw.half_width>0);assert.equal(typeof raw.height,'number')}
  else if(reference==='edge'){assert.notEqual(typeof raw.width,typeof raw.height);assert.equal(raw.points.length,2)}
  else if(reference==='right-triangle'){assert.equal(raw.points.length,3);assert.equal(raw.rotation,undefined)}
  else{assert.equal(raw.points.length,2);assert.equal(typeof raw.rotation,'number')}
  const properties=await page.evaluate(()=>({
   labels:[...$('objectVertices').querySelectorAll('.vertex-number')].map(label=>label.textContent),
   origin:$('objectPosition').hidden,rotation:!$('objectRotationRow').hidden,
   fields:['Width','Height'].filter(name=>!$('object'+name+'Row').hidden).map(name=>$('object'+name+'Caption').textContent)
  }));
  const labels=reference==='edge'?['邊端點 1','邊端點 2']:reference==='edge-midpoint'?['邊中點']:['對角點 1','對角點 2',...(reference==='right-triangle'?['直角點']:[])];
  const fields=reference==='edge'?[(raw.width===undefined?'高':'寬')]:reference==='edge-midpoint'?['半寬','高']:[];
  assert.deepEqual(properties,{labels,origin:true,rotation:reference==='diagonal',fields});
  if(reference==='diagonal'){
   const edited=await page.evaluate(x=>{
    const input=$('objectVertex1x'),unit=$('unitSelect').value;
    ChipUI.measurements.setValue(input.id,x/unitMM(),unit);
    input.dispatchEvent(new Event('change',{bubbles:true}));
    return ChipDrawingJson.read(selected);
   },raw.points[1][0]+3.25);
   assert.deepEqual(edited.points[0],raw.points[0]);close(edited.points[1][0],raw.points[1][0]+3.25);
   close(edited.points[1][1],raw.points[1][1]);assert.equal(edited.rotation,raw.rotation);
  }
  const result=await page.evaluate(()=>{
   const node=selected,raw=ChipDrawingJson.read(node),origin=objectOrigin(node),g=ChipDrawingModel.solve(raw);
   assertModelRoundTrip();
   resizeRectangle(node,'objectWidth',g.width*1.25);
   const resized=ChipDrawingJson.read(node);
   return {before:raw.point||raw.points[0],after:resized.point||resized.points[0],origin,afterOrigin:objectOrigin(node),reference:resized.reference,width:ChipDrawingModel.solve(resized).width,expected:g.width*1.25};
   function assertModelRoundTrip(){
    const decoded=ChipDrawingJson.update(node,JSON.parse(JSON.stringify(raw)));
    if(JSON.stringify(ChipDrawingJson.read(decoded))!==JSON.stringify(raw))throw Error('Rectangle JSON round trip');
   }
  });
  assert.equal(result.reference,reference);close(result.before[0],result.after[0]);close(result.before[1],result.after[1]);
  close(result.origin.x,result.afterOrigin.x);close(result.origin.y,result.afterOrigin.y);close(result.width,result.expected);
 }
 const svgArchive=await page.evaluate(()=>({
  contents:'<svg xmlns="http://www.w3.org/2000/svg">'+archiveDrawing()+'</svg>',
  rectangles:[...art.querySelectorAll('rect[data-model-record]')].map(node=>ChipDrawingJson.read(node))
 }));
 await page.locator('#file').setInputFiles({name:'rectangle-models.svg',mimeType:'image/svg+xml',buffer:Buffer.from(svgArchive.contents)});
 await page.waitForFunction(()=>!$('file').value);
 assert.deepEqual(await page.evaluate(()=>[...art.querySelectorAll('rect[data-model-record]')].map(node=>ChipDrawingJson.read(node))),svgArchive.rectangles);
 await page.evaluate(()=>{scale=2;viewAngle=0;viewMirrored=false;view()});
 const cases=[
  {id:'center-start-end',points:[[0,0],[40,0],[0,-40]]},
  {id:'center-start-sweep',points:[[0,0],[40,0],[0,-40]],sweep:90},
  {id:'three-points',points:[[0,0],[20,-20],[40,0]]},
  {id:'endpoints-radius',points:[[-20,0],[20,0],[0,-10]],radius:25},
  {id:'endpoints-sagitta',points:[[-20,0],[20,0],[0,-12]],sagitta:12},
  {id:'start-tangent-end',points:[[0,0],[0,-20],[20,-20]]},
  {id:'two-tangents',points:[[-20,0],[0,-20],[-20,-20]],angles:[90,0]},
  {id:'center-radius-start-sweep',points:[[5,-5],[25,-5],[5,-25]],radius:20,sweep:90,angle:0}
 ];
 assert.equal(await page.locator('#drawingConstruction').count(),0,'draft parameters must never be assigned in the object property panel');
 for(const test of cases){
  await hidePanels();await choose('arc',test.id);assert.equal(await page.evaluate(()=>$('panel').classList.contains('show')),false,'choosing '+test.id+' must not open properties');
  const before=await page.evaluate(()=>history.length);for(let i=0;i<test.points.length;i++){const [x,y]=test.points[i];if(i===2){const target=await page.evaluate(p=>transformPoint(p,$('world').getScreenCTM()),{x,y});await page.mouse.move(target.x,target.y,{steps:8});assert.equal(await page.locator('[data-arc-preview]').count(),1,test.id+' previews dynamically before confirmation');assert.ok(await page.locator('[data-arc-instruction]').textContent())}await click({x,y})}
  const raw=await read();assert.equal(raw.type,'arc',test.id);assert.equal(raw.reference,test.id);assert.equal(await page.evaluate(()=>history.length),before+1,test.id+' creates one undo record');assert.ok(await page.evaluate(()=>ChipArc.read(selected)),test.id+' has a native editable arc');assert.equal(Object.hasOwn(raw,'attributes'),false);assert.equal(Object.hasOwn(raw,'tag'),false);assert.equal(await page.evaluate(()=>$('panel').classList.contains('show')),false,'finishing '+test.id+' must not open properties');
  if(test.sweep!==undefined)close(raw.sweep,test.sweep);if(test.radius!==undefined)close(raw.radius,test.radius);if(test.sagitta!==undefined)close(raw.sagitta,test.sagitta);if(test.angles)raw.angles.forEach((a,i)=>close(a,test.angles[i]));if(test.id==='three-points')assert.equal(raw.points.length,3);
 }
 const semicircles=await page.evaluate(()=>[-20,20].map(y=>{const raw=ChipConstruction.arcDefinition('endpoints-radius',[{x:-20,y:0},{x:20,y:0}],{x:0,y});return ChipDrawingModel.solve(raw).sweep}));close(semicircles[0],-180);close(semicircles[1],180);
 // Sweep direction follows pointer travel, including large arcs and a complete revolution.
 for(const [id,sweep]of [['center-start-sweep',-270],['center-radius-start-sweep',360]]){await choose('arc',id);await click({x:0,y:0});await click({x:40,y:0});for(let angle=Math.sign(sweep)*30;Math.abs(angle)<=Math.abs(sweep);angle+=Math.sign(sweep)*30){const theta=angle*Math.PI/180,q=await page.evaluate(p=>transformPoint(p,$('world').getScreenCTM()),{x:40*Math.cos(theta),y:-40*Math.sin(theta)});await page.mouse.move(q.x,q.y,{steps:3})}await page.keyboard.press('Enter');close((await read()).sweep,sweep);assert.equal(await page.evaluate(()=>$('panel').classList.contains('show')),false)}
 // Restore a regular explicit arc for the transformed edit check.
 await choose('arc','center-radius-start-sweep');await click({x:5,y:-5});await click({x:25,y:-5});await click({x:5,y:-25});
 const transformed=await page.evaluate(()=>{const before=ChipDrawingJson.encode([selected]).items[0];selected.setAttribute('transform','translate(12 8) rotate(30)');const moved=ChipDrawingJson.encode([selected]).items[0],g=ChipDrawingModel.solve(moved),target=transformPoint({x:g.point[0]-g.radius,y:-g.point[1]},objectMatrix(selected).inverse());ChipArc.vector(selected).set(1,target);return {before,moved,edited:ChipDrawingJson.encode([selected]).items[0],transform:selected.getAttribute('transform')}});
 const expected=[transformed.before.point[0]*Math.cos(Math.PI/6)+transformed.before.point[1]*Math.sin(Math.PI/6)+12,-transformed.before.point[0]*Math.sin(Math.PI/6)+transformed.before.point[1]*Math.cos(Math.PI/6)-8];close(transformed.moved.point[0],expected[0]);close(transformed.moved.point[1],expected[1]);close(transformed.moved.angle,transformed.before.angle-30);close(transformed.edited.sweep,180-transformed.moved.angle);assert.equal(transformed.transform,null,'model editing projects a canonical world definition without retaining an obsolete transform');
 // The public JSON editor round trip retains definitions and creates error markers for impossible arcs.
 await page.evaluate(()=>{$('panel').classList.add('show');objectPanel.setPinned(true)});await page.locator('#jsonTestToggle').click();await page.locator('#jsonTestText .monaco-editor').waitFor({state:'visible'});const original=await read();const sector={...original,closed:'sector',fill:{type:'solid',color:'#abcdef'}};
 await page.evaluate(value=>{$('jsonTestText').value=JSON.stringify(value)},sector);await page.getByRole('button',{name:'保存 JSON 模型',exact:true}).click();assert.equal((await read()).reference,original.reference);assert.equal((await read()).closed,'sector');assert.ok(await page.evaluate(()=>selected.getAttribute('d').endsWith(' Z')));
 const impossible={...original,reference:'three-points',points:[[0,0],[1,0],[2,0]]};for(const key of ['point','radius','angle','sweep'])delete impossible[key];await page.evaluate(value=>{$('jsonTestText').value=JSON.stringify(value)},impossible);await page.getByRole('button',{name:'保存 JSON 模型',exact:true}).click();assert.equal(await page.evaluate(()=>selected.getAttribute('data-model-unresolved')),'true');assert.deepEqual((await read()).points,impossible.points);await page.evaluate(()=>$('undo').click());
 // Arc drafts with no solution do not emit a shape or an undo record.
 await hidePanels();await choose('arc','three-points');await hidePanels();const counts=await page.evaluate(()=>({history:history.length,objects:layers.active().children.length}));await click({x:0,y:0});await click({x:10,y:0});await click({x:20,y:0});assert.deepEqual(await page.evaluate(()=>({history:history.length,objects:layers.active().children.length})),counts);assert.ok(await page.locator('[data-arc-instruction]').textContent());await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>arcDraft),null);
 for(const type of ['rect','arc']){await page.locator('#toolsButtons [data-tool='+type+']').hover();await page.locator('#chipIconTooltip svg[data-construction-animation]').waitFor({state:'visible'})}
 for(const type of ['rect','arc']){const methods=await page.evaluate(type=>ChipUI.objectTypes.find(item=>item.id===type).methods.map(item=>item.id),type);await choose(type,methods[0]);for(const id of methods){await page.locator('#'+type+'ConstructionTools [data-option-id="'+id+'"]').hover();const svg=page.locator('#chipIconTooltip svg[data-construction-animation="'+id+'"]');await svg.waitFor({state:'visible'});assert.ok(await svg.locator('[data-demo-shape]').count()>0,id+' has solved geometry in its animation')}}
 const directory=await mkdtemp(path.join(tmpdir(),'chipchip-construction-'));
 for(const [type,id]of [['rect','edge-midpoint'],['arc','endpoints-radius']]){await choose(type,id);const button=page.locator('#'+type+'ConstructionTools [data-option-id="'+id+'"]');await button.hover();const svg=page.locator('#chipIconTooltip svg[data-construction-animation="'+id+'"]');await svg.waitFor({state:'visible'});assert.equal(await svg.locator('animate').count(),0);assert.ok(await svg.evaluate(n=>n.querySelectorAll('*').length-n.querySelector('[data-demo-input-feedback]').querySelectorAll('*').length-1)<24,'reuse one small SVG scene');assert.ok(await svg.locator('[data-demo-shape]').count()>0,'animation contains actual '+type+' geometry');const frames=await svg.evaluate(n=>{const nodes=[...n.children];n.chipHelpSeek(.4);const before=n.querySelector('[data-demo-pointer]').getAttribute('transform');n.chipHelpSeek(.42);return {before,after:n.querySelector('[data-demo-pointer]').getAttribute('transform'),same:nodes.every((node,i)=>node===n.children[i])}});assert.notEqual(frames.before,frames.after,'continuous progress changes pointer geometry');assert.equal(frames.same,true,'updates reuse SVG nodes');await svg.evaluate(n=>n.chipHelpPlay());await page.waitForTimeout(2800);await page.locator('#chipIconTooltip').screenshot({path:path.join(directory,type+'-help.png')})}
 assert.deepEqual(errors,[]);console.log('PASS: 4 rectangle drawing modes across rotation/reflection; reference-fixed resize; 8 arc modes; transformed model editing; canvas-only gestures without property switching; SVG animated drawing help; compact JSON round trips; sector fill; unsolved preservation and draft cancellation; screenshots '+directory);
}finally{await browser.close()}
