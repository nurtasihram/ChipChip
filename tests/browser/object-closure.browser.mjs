import assert from 'node:assert/strict';
const {chromium}=await import(process.env.CHIPDRAW_PLAYWRIGHT||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.CHIPDRAW_BROWSER?{executablePath:process.env.CHIPDRAW_BROWSER}:{})});
async function checkPathFill(page) {
 const closeButton = page.locator('#objectClosureControl button');
 const fillButton = page.locator('#fillEnabled');
 const triangle = 'M0 0 L20 0 Q20 10 20 20';
 const paths = [[' L0 0',false,4],[' Z',true,3],[' L0 0 z',true,3]];
 const svg = '<svg xmlns="http://www.w3.org/2000/svg">' + paths.map(([ending],i) =>
  '<path data-name="closure-'+i+'" d="'+triangle+ending+'" stroke="#336699" fill="#aa3377"/>'
 ).join('') + '</svg>';
 await page.locator('#file').setInputFiles({name:'path-closure.svg',mimeType:'image/svg+xml',buffer:Buffer.from(svg)});
 await page.locator('#art [data-name="closure-2"]').waitFor({state:'attached'});
 for (const [index,[ending,closed,anchors]] of paths.entries()) {
  const before = await page.evaluate(i => {
   const node = art.querySelector('[data-name="closure-'+i+'"]');
   const initial = isClosedObject(node);
   selected = node;
   selection.replace([node]);
   renderSelection();
   return {initial, fill:node.getAttribute('fill'), bundle:ChipDrawingJson.encode([node])};
  }, index);
  const model = before.bundle.items[0];
  assert.equal(before.initial, closed, ending);
  assert.equal(model.closed, closed);
  assert.equal(model.points.length, anchors);
  assert.equal(model.control_points.length, anchors);
  if (!closed) assert.deepEqual(model.points.at(-1), model.points[0]);
  assert.equal(before.fill, closed ? '#aa3377' : 'none');
  assert.equal(await closeButton.getAttribute('aria-pressed'), String(closed));
  assert.equal(await fillButton.isVisible(), closed);
  const restored = await page.evaluate(bundle => {
   const [node] = ChipDrawingJson.decode(bundle, [selected]);
   selected.replaceWith(node);
   selected = node;
   selection.replace([node]);
   renderSelection();
   return {model:ChipDrawingJson.read(node), d:node.getAttribute('d'), fill:node.getAttribute('fill')};
  }, before.bundle);
  assert.deepEqual(restored.model, model);
  assert.equal(restored.d.endsWith(' Z'), closed);
  assert.equal(restored.fill, before.fill);
  if (closed) {
   assert.equal(await fillButton.isChecked(), true);
   await fillButton.uncheck();
   const readPaint = () => page.evaluate(() => ({
    canvas:selected.getAttribute('fill'), model:ChipDrawingJson.encode([selected]).items[0].fill
   }));
   const disabled = await readPaint();
   assert.equal(disabled.canvas, 'none');
   assert.equal(disabled.model.type, 'none');
   await fillButton.check();
   const enabled = await readPaint();
   assert.equal(enabled.canvas, before.fill);
   assert.equal(enabled.model.type, 'solid');
   assert.equal(enabled.model.color, before.fill);
  }
  assert.equal(await fillButton.isVisible(), closed);
  await closeButton.click();
  assert.equal(await fillButton.isVisible(), !closed);
  await closeButton.click();
  const toggled = await page.evaluate(() => ChipDrawingJson.read(selected));
  assert.deepEqual(toggled.points, model.points);
  assert.deepEqual(toggled.control_points, model.control_points);
  assert.equal(toggled.id, model.id);
  assert.equal(toggled.closed, closed);
 }
 const arcFills = await page.evaluate(() => {
  return ['none','chord','sector'].map(closed => {
   const data = {type:'arc',reference:'center-radius-start-sweep',point:[0,0],radius:12,
    angle:0,sweep:360,closed,fill:{type:'solid',color:'#aa3377'}};
   const node = ChipDrawingJson.create(data,layers.active());
   layers.active().append(node);
   const fill = node.getAttribute('fill');
   selected = node;
   selection.replace([node]);
   renderSelection();
   return [fill,node.getAttribute('fill'),!$('objectFillRow').hidden,ChipDrawingJson.read(node).closed];
  });
 });
 assert.deepEqual(arcFills,[['none','none',false,'none'],['#aa3377','#aa3377',true,'chord'],['#aa3377','#aa3377',true,'sector']]);
 const compounds = await page.evaluate(() => {
  return ['M0 0 L15 0 L15 15 z M30 0 l15 0 0 15 z',
          'M0 0 L15 0 L15 15 L0 0 M30 0 l15 0 0 15 z'].map(d => {
   const node = el('path',{d,stroke:'#336699',fill:'#aa3377'});
   selected = node;
   selection.replace([node]);
   renderSelection();
   return {closed:isClosedObject(node),filled:node.getAttribute('fill') !== 'none',
    button:!$('objectFillRow').hidden};
  });
 });
 assert.deepEqual(compounds,[{closed:true,filled:true,button:true},{closed:false,filled:false,button:false}]);
 for (const type of ['polyline','bezier']) {
  for (const closed of [undefined,false]) {
   const state = await page.evaluate(({type,closed}) => {
    const model = {type,points:[[0,0],[20,0],[20,20],[0,0]],fill:{type:'solid',color:'#aa3377'}};
    if (type === 'bezier') model.control_points = [[10,0],[0,10],[-10,-10],[0,0]];
    if (closed !== undefined) model.closed = closed;
    const node = ChipDrawingJson.create(model,layers.active());
    layers.active().append(node);
    selected = node;
    selection.replace([node]);
    renderSelection();
    node.setAttribute('transform','translate(3 4)');
    const saved = ChipDrawingJson.encode([node]).items[0];
    return {closed:saved.closed === true, points:saved.points, fill:node.getAttribute('fill'), canvas:isClosedObject(node)};
   }, {type,closed});
   assert.equal(state.closed,false);
   assert.equal(state.canvas,false);
   assert.equal(state.fill,'none');
   assert.equal(state.points.length,4);
   assert.deepEqual(state.points[0],state.points.at(-1));
   assert.equal(await closeButton.getAttribute('aria-pressed'),'false');
   assert.equal(await fillButton.isVisible(),false);
  }
 }
}
try{
 const page=await browser.newPage({viewport:{width:1200,height:950}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(new URL('../../ChipDraw.html',import.meta.url).href);
 await page.evaluate(()=>{ChipUI.panel.setOpen(false);$('layersPanel').chipFloatingPanel.setCollapsed(true,{focus:false});setTool('select');selected=el('polyline',{points:'0,0 40,0 40,30',stroke:'#69b8ff',fill:'none'});selection.replace([selected]);renderSelection();$('panel').classList.add('show');});
 const button=page.locator('#objectClosureControl button');assert.equal(await page.locator('#objectClosureRow').isVisible(),true);assert.equal(await page.locator('#objectVertices').evaluate(n=>n.nextElementSibling.id),'objectClosureRow');assert.equal(await button.locator('svg').count(),1);assert.equal(await button.getAttribute('aria-pressed'),'false');
 const before=await page.evaluate(()=>({data:ChipDrawingJson.encode([selected]).items[0],history:history.length}));await button.click();let after=await page.evaluate(()=>({data:ChipDrawingJson.encode([selected]).items[0],tag:selected.localName,history:history.length}));assert.equal(after.data.type,'polyline');assert.equal(after.data.closed,true);assert.equal(after.data.id,before.data.id);assert.deepEqual(after.data.points,before.data.points);assert.equal(after.tag,'polygon');assert.equal(after.history,before.history+1);assert.equal(await button.getAttribute('aria-pressed'),'true');
 await page.evaluate(()=>rectangleEditor().undo());await page.evaluate(()=>{selected=layers.active().children[0];selection.replace([selected]);renderSelection()});assert.equal(await button.getAttribute('aria-pressed'),'false');await page.evaluate(()=>rectangleEditor().redo());await page.evaluate(()=>{selected=layers.active().children[0];selection.replace([selected]);renderSelection()});assert.equal(await button.getAttribute('aria-pressed'),'true');await button.click();after=await page.evaluate(()=>({data:ChipDrawingJson.encode([selected]).items[0],tag:selected.localName}));assert.equal(after.data.closed,false);assert.equal(after.tag,'polyline');assert.deepEqual(after.data.points,before.data.points);
 await page.evaluate(()=>{selected.setAttribute('data-locked','true');renderSelection();});assert.equal(await button.isDisabled(),true);await page.evaluate(()=>{selected.removeAttribute('data-locked');selected=el('line',{x1:0,y1:0,x2:30,y2:20,stroke:'#69b8ff'});selection.replace([selected]);renderSelection();});assert.equal(await button.isDisabled(),true);assert.match(await page.locator('#objectClosureReason').textContent(),/直線模型/);assert.equal(await page.evaluate(()=>Object.hasOwn(ChipDrawingJson.encode([selected]).items[0],'closed')),false,'unsupported line models must not acquire a new closed field');
 await page.evaluate(()=>{const data={type:'arc',reference:'center-radius-start-sweep',point:[0,0],radius:30,angle:0,sweep:90};selected=ChipDrawingJson.create(data,layers.active(),{stroke:'#69b8ff',fill:'none'});layers.active().append(selected);selection.replace([selected]);renderSelection();});assert.equal(await button.isDisabled(),false);await button.click();assert.equal(await page.evaluate(()=>ChipDrawingJson.encode([selected]).items[0].closed),'chord');await button.click();assert.equal(await page.evaluate(()=>ChipDrawingJson.encode([selected]).items[0].closed),'none');
 await page.evaluate(()=>{selected=el('path',{d:'M0 0 C0 40 40 40 40 0',stroke:'#69b8ff',fill:'none'});selection.replace([selected]);renderSelection();});assert.equal(await button.isDisabled(),true,'unsupported complete Bezier JSON must not be implemented with hidden SVG closure state');
 await checkPathFill(page);
 assert.deepEqual(errors,[]);console.log('PASS: shared SVG closure toggle below coordinates, explicit existing JSON fields, geometry/identity/undo, locks, SVG close commands, coincident endpoints and JSON fill round trips');
}finally{await browser.close();}
