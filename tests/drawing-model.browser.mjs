// Real SVG matrices and DOM replacement without a Playwright dependency.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const candidates=[process.env.CHIPDRAW_BROWSER,'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].filter(Boolean);
let browser;for(const candidate of candidates){try{await access(candidate);browser=candidate;break}catch{}}
if(!browser)throw Error('Set CHIPDRAW_BROWSER to a Chromium browser executable');
const directory=await mkdtemp(path.join(tmpdir(),'chipdraw-model-'));
function browserChecks(){
 const checks=[],assert=(condition,message)=>{if(!condition)throw Error(message)},close=(a,b)=>Math.abs(a-b)<1e-6;
 const read=()=>{const value=JSON.parse(document.getElementById('jsonTestText').value);assert(!Object.hasOwn(value,'items'),'single selection is a bare object');return {items:[value]}};
 const save=async model=>{document.getElementById('jsonTestText').value=JSON.stringify(model);document.getElementById('jsonTestLoad').click();await new Promise(resolve=>setTimeout(resolve,0))};
 (async()=>{
  setTool('rect');selected=el('rect',{x:6,y:-8,width:8,height:8,...style()});selection.replace([selected]);renderSelection();document.getElementById('jsonTestToggle').click();
  const initial=read(),id=initial.items[0].id;assert(!Object.hasOwn(initial,'units_system'),'object editor omits document context');assert(initial.items.length===1&&initial.items[0].type==='rect','selected object model');assert(initial.items[0].point[0]===6&&initial.items[0].point[1]===8,'Y-up coordinates');assert(!initial.items[0].attributes&&!initial.items[0].tag,'no SVG wrapper');checks.push('compact typed object and canonical Y-up geometry');
  const model=read();Object.assign(model.items[0],{reference:'center',point:[10,4],width:8,height:8,rotation:30,stroke:{width:.5}});delete model.items[0].fill;await save(model);
  assert(document.getElementById('jsonTestMessage').dataset.error!=='true',document.getElementById('jsonTestMessage').textContent);let origin=objectOrigin(selection.primary);assert(close(origin.x,10)&&close(origin.y,-4),'center reference after rotated projection');
  const reflected=read();assert(reflected.items[0].id===id&&reflected.items[0].point[0]===10&&reflected.items[0].point[1]===4,'identity and authored center stay exact');assert(!Object.hasOwn(reflected.items[0].stroke,'color')&&!Object.hasOwn(reflected.items[0],'fill'),'inheritance not expanded');checks.push('rotated rectangle reference and implicit paint survive native SVG projection');
  resizeRectangle(selection.primary,'objectWidth',12);origin=objectOrigin(selection.primary);assert(close(origin.x,10)&&close(origin.y,-4),'size edit fixes center '+JSON.stringify(origin));assert(read().items[0].width===12&&read().items[0].point[0]===10&&read().items[0].point[1]===4,'size edit writes model without rounding center');checks.push('center-defined rectangle resize retains its defining point');
  const definedCircle=read();Object.assign(definedCircle.items[0],{type:'circle',reference:'three-points',points:[[0,1],[-1,0],[1,0]]});for(const key of ['point','width','height','rotation'])delete definedCircle.items[0][key];await save(definedCircle);assert(document.getElementById('objectRadius').disabled,'three-point circle radius is derived');updateObjectPosition({x:5,y:7});const movedCircle=read().items[0];assert(movedCircle.type==='circle'&&movedCircle.reference==='three-points','circle reference survives movement');assert(movedCircle.points[0][0]===5&&movedCircle.points[0][1]===8,'defining points move together');assert(!Object.hasOwn(movedCircle,'radius'),'derived radius is not materialized');checks.push('three-point circle movement preserves all defining points');
  const hidden=read();hidden.items[0].hiden=true;await save(hidden);assert(selection.primary?.getAttribute('display')==='none'||art.querySelector('[display="none"]'),'hiden projection');
  // Re-select the same retained object explicitly; visibility can be a selection filter.
  const hiddenNode=art.querySelector('[data-model-id="'+id+'"]');hiddenNode.removeAttribute('display');selection.replace([hiddenNode]);selected=selection.primary;renderSelection();objectJsonModel.output();
  const bad=read();Object.assign(bad.items[0],{type:'circle',reference:'three-points',points:[[0,0],[1,0],[2,0]]});for(const key of ['point','width','height','rotation'])delete bad.items[0][key];delete bad.items[0].hiden;await save(bad);
  assert(selection.primary?.getAttribute('data-model-unresolved')==='true','unsolved object retained');assert(read().items[0].points[2][0]===2,'unsolved parameters retained');assert(!document.getElementById('objectModelProblems').hidden,'problem list visible');assert(selection.primary.querySelector('text')?.textContent==='×','located error marker');checks.push('hiden and unsolved circle retain original data with an error marker');
  const missing=read();missing.items[0]={id,name:'missing coordinate',type:'point'};await save(missing);assert(read().items[0].type==='point'&&!Object.hasOwn(read().items[0],'point'),'missing coordinate stays missing');assert(!document.getElementById('objectModelProblems').hidden,'unlocated error in list');checks.push('unlocated errors remain editable through the problem list');
  return checks;
 })().then(checks=>finish({ok:true,checks})).catch(error=>finish({ok:false,error:error.stack||error.message}));
 function finish(result){const report=document.createElement('pre');report.id='drawingModelBrowserResult';report.textContent=JSON.stringify(result);document.body.append(report)}
}
let html=await readFile(new URL('../ChipDraw.html',import.meta.url),'utf8');
html=html.replace(/<\/html>\s*$/,'<script>('+browserChecks.toString()+')();</script></html>');
const input=path.join(directory,'model.html');await writeFile(input,html);
const {stdout}=await promisify(execFile)(browser,['--headless=new','--no-sandbox','--disable-gpu','--disable-software-rasterizer','--no-first-run','--no-default-browser-check','--virtual-time-budget=3000','--window-size=1100,1000','--user-data-dir='+path.join(directory,'profile'),'--dump-dom',pathToFileURL(input).href],{windowsHide:true,timeout:30000,maxBuffer:64*1024*1024});
const match=stdout.match(/<pre id="drawingModelBrowserResult">([^<]*)<\/pre>/);
assert.ok(match,'browser check did not finish');const report=JSON.parse(match[1].replaceAll('&quot;','"').replaceAll('&gt;','>').replaceAll('&lt;','<').replaceAll('&amp;','&'));
assert.equal(report.ok,true,report.error);console.log(JSON.stringify(report));
