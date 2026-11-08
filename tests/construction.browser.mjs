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
 const rects=await page.evaluate(()=>ChipUI.objectTypes.find(item=>item.id==='rect').methods.map(item=>item.id));assert.equal(rects.length,11);
 for(const mirrored of [false,true])for(const reference of rects){
  await page.evaluate(mirrored=>{scale=2;viewAngle=31;viewMirrored=mirrored;view()},mirrored);await choose('rect',reference);await hidePanels();const before=await page.evaluate(()=>history.length),a={x:-20,y:10},b={x:24,y:44},A=await page.evaluate(p=>transformPoint(p,$('world').getScreenCTM()),a),B=await page.evaluate(p=>transformPoint(p,$('world').getScreenCTM()),b);await page.mouse.move(A.x,A.y);await page.mouse.down();await page.mouse.move(B.x,B.y,{steps:4});await page.mouse.up();
  const raw=await read();assert.equal(raw.reference,reference);assert.equal(raw.type,'rect');assert.equal(await page.evaluate(()=>history.length),before+1);if(raw.point){close(raw.point[0],a.x);close(raw.point[1],-a.y);assert.equal(typeof raw.width,'number')}else{assert.equal(raw.points.length,2);assert.equal(Object.hasOwn(raw,'width'),false)}
  const result=await page.evaluate(()=>{const before=ChipDrawingJson.encode([selected]).items[0],origin=objectOrigin(selected),width=ChipDrawingModel.solve(before).width;resizeRectangle(selected,'objectWidth',width*1.25);const resized=ChipDrawingJson.encode([selected]).items[0];return {before:before.point||before.points[0],after:resized.point||resized.points[0],origin,afterOrigin:objectOrigin(selected),reference:resized.reference}});assert.equal(result.reference,reference);close(result.before[0],result.after[0]);close(result.before[1],result.after[1]);close(result.origin.x,result.afterOrigin.x);close(result.origin.y,result.afterOrigin.y);
 }
 await page.evaluate(()=>{scale=2;viewAngle=0;viewMirrored=false;view()});
 const cases=[
  {id:'center-start-end',points:[[0,0],[40,0],[0,-40]]},
  {id:'center-start-sweep',points:[[0,0],[40,0],[0,-40]],sweep:-270},
  {id:'three-points',points:[[0,0],[20,-20],[40,0]]},
  {id:'endpoints-radius',points:[[-20,0],[20,0],[0,-20]],radius:25},
  {id:'endpoints-sagitta',points:[[-20,0],[20,0],[0,-20]],sagitta:12},
  {id:'start-tangent-end',points:[[0,0],[0,-20],[20,-20]]},
  {id:'two-tangents',points:[[-20,0],[0,-20],[0,-20]],angles:[90,0]},
  {id:'center-radius-start-sweep',points:[[5,-5],[30,-20]],radius:20,sweep:120,angle:30}
 ];
 for(const test of cases){
  await choose('arc',test.id);await page.evaluate(()=>{$('panel').classList.add('show');objectPanel.setPinned(true)});
  if(test.radius!==undefined){await page.locator('#drawingArcRadius').fill(String(test.radius));await page.locator('#drawingArcRadius').dispatchEvent('change')}
  if(test.sagitta!==undefined){await page.locator('#drawingArcSagitta').fill(String(test.sagitta));await page.locator('#drawingArcSagitta').dispatchEvent('change')}
  for(const [id,value]of [['drawingArcSweepFields',test.sweep],['drawingArcAngleFields',test.angle??test.angles?.[0]],['drawingArcAngle2Fields',test.angles?.[1]]])if(value!==undefined){await page.locator('#'+id+' input').fill(String(value));await page.locator('#'+id+' input').dispatchEvent('change')}
  if(test.id==='two-tangents')await page.locator('#drawingArcDirection [data-option-id=cw]').click();
  await hidePanels();const before=await page.evaluate(()=>history.length);for(const [x,y]of test.points)await click({x,y});
  const raw=await read();assert.equal(raw.type,'arc',test.id);assert.equal(raw.reference,test.id);assert.equal(await page.evaluate(()=>history.length),before+1,test.id+' creates one undo record');assert.ok(await page.evaluate(()=>ChipArc.read(selected)),test.id+' has a native editable arc');assert.equal(Object.hasOwn(raw,'attributes'),false);assert.equal(Object.hasOwn(raw,'tag'),false);
  if(test.sweep!==undefined)assert.equal(raw.sweep,test.sweep);if(test.angles)assert.deepEqual(raw.angles,test.angles);if(test.id==='three-points')assert.equal(raw.points.length,3);
 }
 const transformed=await page.evaluate(()=>{const before=ChipDrawingJson.encode([selected]).items[0];selected.setAttribute('transform','translate(12 8) rotate(30)');const moved=ChipDrawingJson.encode([selected]).items[0],g=ChipDrawingModel.solve(moved),target=transformPoint({x:g.point[0]-g.radius,y:-g.point[1]},objectMatrix(selected).inverse());ChipArc.vector(selected).set(1,target);return {before,moved,edited:ChipDrawingJson.encode([selected]).items[0],transform:selected.getAttribute('transform')}});
 const expected=[transformed.before.point[0]*Math.cos(Math.PI/6)+transformed.before.point[1]*Math.sin(Math.PI/6)+12,-transformed.before.point[0]*Math.sin(Math.PI/6)+transformed.before.point[1]*Math.cos(Math.PI/6)-8];close(transformed.moved.point[0],expected[0]);close(transformed.moved.point[1],expected[1]);close(transformed.moved.angle,transformed.before.angle-30);close(transformed.edited.sweep,180);assert.equal(transformed.transform,null,'model editing projects a canonical world definition without retaining an obsolete transform');
 await choose('arc','endpoints-radius');await page.evaluate(()=>{$('panel').classList.add('show');objectPanel.setPinned(true);$('unitSelect').value='cm';$('unitSelect').dispatchEvent(new Event('change',{bubbles:true}))});close(await page.evaluate(()=>Number($('drawingArcRadius').value)),2);await page.locator('#drawingArcRadius').fill('3');await page.locator('#drawingArcRadius').dispatchEvent('change');assert.equal(await page.evaluate(()=>constructionTools.settings.radius),30);
 await choose('arc','center-start-sweep');await page.evaluate(()=>{$('angleMode').value='rad';$('angleMode').dispatchEvent(new Event('change',{bubbles:true}))});await page.locator('#drawingArcSweepFields input').fill(String(Math.PI/2));await page.locator('#drawingArcSweepFields input').dispatchEvent('change');close(await page.evaluate(()=>constructionTools.settings.sweep),90);await page.evaluate(()=>{$('unitSelect').value='mm';$('unitSelect').dispatchEvent(new Event('change',{bubbles:true}));$('angleMode').value='deg';$('angleMode').dispatchEvent(new Event('change',{bubbles:true}))});
 // The public JSON editor round trip retains definitions and creates error markers for impossible arcs.
 await page.evaluate(()=>{$('panel').classList.add('show');objectPanel.setPinned(true)});await page.locator('#jsonTestToggle').click();await page.locator('#jsonTestText .monaco-editor').waitFor({state:'visible'});const original=await read();const sector={...original,closed:'sector',fill:{type:'solid',color:'#abcdef'}};
 await page.evaluate(value=>{$('jsonTestText').value=JSON.stringify(value)},sector);await page.getByRole('button',{name:'保存 JSON 模型',exact:true}).click();assert.equal((await read()).reference,original.reference);assert.equal((await read()).closed,'sector');assert.ok(await page.evaluate(()=>selected.getAttribute('d').endsWith(' Z')));
 const impossible={...original,reference:'three-points',points:[[0,0],[1,0],[2,0]]};for(const key of ['point','radius','angle','sweep'])delete impossible[key];await page.evaluate(value=>{$('jsonTestText').value=JSON.stringify(value)},impossible);await page.getByRole('button',{name:'保存 JSON 模型',exact:true}).click();assert.equal(await page.evaluate(()=>selected.getAttribute('data-model-unresolved')),'true');assert.deepEqual((await read()).points,impossible.points);await page.evaluate(()=>$('undo').click());
 // Arc drafts with no solution do not emit a shape or an undo record.
 await hidePanels();await choose('arc','three-points');await hidePanels();const counts=await page.evaluate(()=>({history:history.length,objects:layers.active().children.length}));await click({x:0,y:0});await click({x:10,y:0});await click({x:20,y:0});assert.deepEqual(await page.evaluate(()=>({history:history.length,objects:layers.active().children.length})),counts);assert.ok(await page.locator('#drawingConstructionError').textContent());await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>arcDraft),null);
 const directory=await mkdtemp(path.join(tmpdir(),'chipchip-construction-'));await choose('rect','center');await page.mouse.move(1400,1050);await page.locator('#rectConstructionTools').screenshot({path:path.join(directory,'rectangles.png')});await choose('arc','endpoints-radius');await page.mouse.move(1400,1050);await page.locator('#arcConstructionTools').screenshot({path:path.join(directory,'arcs.png')});
 assert.deepEqual(errors,[]);console.log('PASS: 11 rectangle drawing modes across rotation/reflection; reference-fixed resize; 8 arc modes; transformed model editing; common cm/radian inputs; compact JSON round trips; sector fill; unsolved preservation and draft cancellation; screenshots '+directory);
}finally{await browser.close()}
