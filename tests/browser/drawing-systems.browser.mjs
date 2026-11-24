import assert from 'node:assert/strict';
const {chromium}=await import(process.env.CHIPDRAW_PLAYWRIGHT||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.CHIPDRAW_BROWSER?{executablePath:process.env.CHIPDRAW_BROWSER}:{})});
const context=await browser.newContext({viewport:{width:1400,height:1000}});
const page=await context.newPage();
const errors=[];
page.on('pageerror',error=>errors.push(error.message));
const near=(value,expected)=>assert.ok(Math.abs(value-expected)<1e-9,`${value} != ${expected}`);
const records=()=>page.evaluate(()=>Object.fromEntries(['graph_system','units_system','snap_system','select_system'].map(key=>[key,JSON.parse(localStorage.getItem(key))])));
async function change(id,value){
 await page.locator('#'+id).evaluate((input,value)=>{
  input.value=value;
  input.dispatchEvent(new Event('input',{bubbles:true}));
  input.dispatchEvent(new Event('change',{bubbles:true}));
 },value);
}
async function checkUnits(){
 await change('coordinateMode','polar');
 assert.equal((await records()).graph_system.fields.coordinateMode,'polar');
 const unitsBefore=(await records()).units_system;
 await page.reload();
 assert.equal(await page.locator('#coordinateMode').inputValue(),'polar');
 assert.deepEqual((await records()).units_system,unitsBefore);
 await page.evaluate(()=>{
  const data=ChipUI.measurements.settings.read();
  data.coordinate='orth';data.angle='clock';data.angle_precision=0;data.time_approx='us';data.time_precision=0;
  delete data.angle_approx;
  ChipUI.measurements.settings.apply(data);
 });
 await change('lengthPrecision','2');
 let units=(await records()).units_system;
 assert.equal(units.coordinate,'orth');
 assert.equal(units.angle_precision,0);assert.equal(units.time_precision,0);
 assert.equal(units.time_approx,'us');assert.ok(!Object.hasOwn(units,'angle_approx'));
 assert.equal(await page.locator('#anglePrecision').inputValue(),'microsecond');
 await page.evaluate(()=>{$('selectionOverflowUnit').click();$('selectionOverflowUnit').click();$('gridLineWidthUnit').click()});
 await change('selectionOverflow','2');
 await change('gridLineWidth','1.23');
 const dimensions=()=>page.evaluate(()=>({
  grid:widthWorld('gridLineWidth'),
  overflow:ChipUI.selectionStyle().overflow.value*ChipUI.measurements.unitFactor($('unitSelect').value),
  search:snapRuntime.read().searchRadius,
  capture:snapRuntime.read().tolerance
 }));
 const start=await dimensions();near(start.grid,1.23);near(start.overflow,2);
 const before=await records();
 for(const unit of ['cm','m','mm','cm']){
  await change('unitSelect',unit);
  const actual=await dimensions();
  for(const key of Object.keys(start))near(actual[key],start[key]);
  const saved=await records();
  assert.deepEqual(saved.graph_system,before.graph_system);
  assert.deepEqual(saved.select_system,before.select_system);
  assert.deepEqual(saved.snap_system,before.snap_system);
  assert.equal(await page.locator('#snapToleranceUnit').textContent(),unit);
 }
 await change('selectionOutlineOpacity','74');await change('gridX','3');
 const saved=await records();
 assert.deepEqual(saved.select_system.style.fields.selectionOverflow,{value:2,unit:'mm'});
 assert.deepEqual(saved.graph_system.fields.gridX,{value:30,unit:'mm'});
 await page.reload();
 const restored=await dimensions();near(restored.grid,1.23);near(restored.overflow,2);
 assert.equal(await page.locator('#coordinateMode').inputValue(),'polar');
 assert.equal(await page.locator('#unitSelect').inputValue(),'cm');
 assert.equal(await page.locator('#anglePrecision').inputValue(),'microsecond');
 await change('anglePrecision','minute');
 assert.equal((await records()).units_system.angle_approx,'min');
 await change('angleMode','deg');
 assert.equal(await page.locator('#anglePrecision').inputValue(),'0');
}
async function checkControlSources(){
 const configure=unit=>page.evaluate(unit=>{
  const settings=ChipUI.measurements.settings;
  settings.apply({...settings.read(),length:'metric',length_approx:unit,angle:'deg',localized:false});
 },unit);
 await configure('mm');
 const slider=()=>page.evaluate(()=>{
  const input=$('gridLineWidth');
  return {value:Number(input.value),min:Number(input.min),max:Number(input.max),world:widthWorld(input.id)};
 });
 const start=await slider();
 await page.evaluate(()=>$('gridLineWidthValue').click());
 assert.equal(await page.locator('.quantity-precise').count(),1);
 await configure('cm');
 assert.equal(await page.locator('.quantity-precise').count(),0);
 const after=await slider();near(after.world,start.world);
 for(const key of ['min','max','value'])near(after[key]*10,start[key]);
 await page.locator('#gridLineWidth').dispatchEvent('contextmenu');
 await page.locator('.quantity-menu button').filter({hasText:'換算'}).evaluate(b=>b.click());
 assert.match(await page.locator('.quantity-popup').textContent(),/cm/);
 await configure('mm');assert.equal(await page.locator('.quantity-popup').count(),0);
 const read=await page.evaluate(()=>{
  $('unitSelect').value='cm';$('angleMode').value='rad';
  $('selectionOutlineUnit').dataset.widthUnit='physical';
  $('selectionOutlineUnit').textContent='inch';
  $('lengthPrecision').dispatchEvent(new Event('change',{bubbles:true}));
  return {length:ChipUI.measurements.lengthUnit,angle:ChipUI.measurements.read().angle.unit,
   selectedWidth:ChipUI.measurements.unitForInput('selectionOutlineWidth'),ruler:unitMM(),
   archive:JSON.parse(localStorage.getItem('units_system')).length_approx};
 });
 assert.deepEqual(read,{length:'mm',angle:'deg',selectedWidth:'mm',ruler:1,archive:'mm'});
 await page.reload();
}
async function checkOpenWindows(){
 const other=await context.newPage();
 try{
  await other.goto(page.url());
  await change('unitSelect','cm');
  await other.waitForFunction(()=>ChipUI.measurements.lengthUnit==='cm');
  assert.equal(await other.locator('#unitSelect').inputValue(),'cm');
  await change('rotationValue','90');
  await page.locator('#rotationValue').focus();
  await other.evaluate(()=>ChipUI.measurements.settings.apply({...ChipUI.measurements.settings.read(),length_approx:'mm',angle:'radius',angle_precision:4}));
  await page.waitForFunction(()=>ChipUI.measurements.lengthUnit==='mm');
  assert.equal(await page.locator('#rotationValue').inputValue(),'1.5708','a focused view field follows a change from the independent units pane');
  assert.equal((await records()).units_system.length_approx,'mm');
 }finally{await other.close()}
}
async function checkLegacyLengths(){
 await page.evaluate(()=>{
  const graph=JSON.parse(localStorage.getItem('graph_system'));
  graph.fields.gridX=graph.fields.gridY={value:0.5,unit:'inch'};
  localStorage.setItem('graph_system',JSON.stringify(graph));
  const selection=JSON.parse(localStorage.getItem('select_system'));
  selection.style.fields.selectionOverflow={value:0.2,unit:'cm'};
  localStorage.setItem('select_system',JSON.stringify(selection));
  const snap=JSON.parse(localStorage.getItem('snap_system'));
  snap.searchDiameter={value:3,unit:'cm'};snap.captureDiameter={value:0.25,unit:'inch'};
  localStorage.setItem('snap_system',JSON.stringify(snap));
 });
 await page.reload();
 const lengths=await page.evaluate(()=>({
  grid:gridSpacing().x,
  overflow:ChipUI.measurements.standardLength('selectionOverflow').value,
  capture:ChipUI.measurements.standardLength('snapTolerance').value,
  search:ChipUI.measurements.standardLength('snapSearchRadius').value
 }));
 near(lengths.grid,12.7);near(lengths.overflow,2);near(lengths.capture,6.35);near(lengths.search,30);
 await change('snapMode','all');
 const stored=(await records()).snap_system;
 assert.equal(stored.captureDiameter.unit,'mm');near(stored.captureDiameter.value,6.35);
}
async function checkColors(){
 await page.evaluate(()=>{
  localStorage.setItem('chipdraw.functional-anchor-colors.v1',JSON.stringify({grid:'#123456'}));
  const snap=JSON.parse(localStorage.getItem('snap_system')||'{}');
  delete snap.anchorColors;localStorage.setItem('snap_system',JSON.stringify(snap));
 });
 await page.reload();
 const color=page.locator('#snapProperties [data-anchor-color=grid]');
 assert.equal(await color.inputValue(),'#123456');
 const writes=await color.evaluate(input=>{
  const keys=[],write=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){keys.push(key);return write.call(this,key,value)};
  try{input.value='#123abc';input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}))}
  finally{Storage.prototype.setItem=write}
  return [...new Set(keys)];
 });
 assert.deepEqual(writes,['snap_system']);
 await page.reload();assert.equal(await color.inputValue(),'#123abc');
 assert.equal((await records()).snap_system.anchorColors.grid,'#123abc');
}
async function checkSelection(){
 const positions=await page.evaluate(()=>{
  ChipUI.panel.setOpen(false);$('panel').classList.remove('show');$('layersClose')?.click();
  setTool('select');scale=3;view();layers.active().replaceChildren();
  const line=ChipDrawingJson.create({type:'polyline',points:[[-80,0],[-20,0],[20,0],[80,0]]},layers.active());layers.active().append(line);
  selectionTools.setTargets({objects:[],anchors:['subline']});
  const type=$('snapTypeChoices').querySelector('[data-option-id=polyline]');
  if(type.getAttribute('aria-pressed')==='true')type.click();
  for(const layer of $('snapLayerChoices').querySelectorAll('[aria-pressed=true]'))layer.click();
  $('snapEnabled').checked=false;$('snapEnabled').dispatchEvent(new Event('change',{bubbles:true}));
  return [[0,0],[-30,-15],[30,15]].map(([x,y])=>transformPoint({x,y},$('world').getScreenCTM()));
 });
 const [middle,a,b]=positions;
 const selected=()=>page.evaluate(()=>selectionTools.sublines.map(ref=>ref.index));
 const snap=(await records()).snap_system;
 await page.mouse.click(middle.x,middle.y);assert.deepEqual(await selected(),[1]);
 assert.deepEqual((await records()).snap_system,snap);
 await page.evaluate(()=>selectionTools.clear());
 await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:5});await page.mouse.up();
 assert.deepEqual(await selected(),[1]);
 await page.evaluate(()=>{
  selectionTools.clear();
  for(const button of $('selectionLayerChoices').querySelectorAll('[aria-pressed=true]'))button.click();
 });
 await page.mouse.click(middle.x,middle.y);assert.deepEqual(await selected(),[]);
 assert.equal(await page.locator('#snapEnabled').isChecked(),false);
}
try{
 await page.goto(new URL('../../ChipDraw.html',import.meta.url).href);
 await checkUnits();await checkControlSources();await checkOpenWindows();await checkColors();await checkSelection();await checkLegacyLengths();
 assert.deepEqual(errors,[]);
 console.log('PASS: graph coordinates, one units configuration, snap colors, independent subline selection');
}finally{await browser.close()}
