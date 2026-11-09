import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const {chromium}=await import(process.env.CHIPDRAW_PLAYWRIGHT||'playwright');
const output=path.resolve(process.argv[2]||'.codex-attachments/test-recordings/2026-11-09/animation-audit');
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.CHIPDRAW_BROWSER?{executablePath:process.env.CHIPDRAW_BROWSER}:{})});
const close=(a,b,message)=>assert.ok(Math.abs(a-b)<.002,`${message}: ${a} != ${b}`);
try{
 const page=await browser.newPage({viewport:{width:1500,height:1100}}),errors=[],results=[];
 page.on('pageerror',error=>errors.push(error.message));await page.goto(new URL('../ChipDraw.html',import.meta.url).href);await page.waitForFunction(()=>constructionTools);
 await page.evaluate(()=>{$('advanced').open=false;$('panel').classList.remove('show');$('layersPanel').hidden=true;$('snapEnabled').checked=false;scale=2;viewAngle=0;viewMirrored=false;view()});
 const methods=await page.evaluate(()=>['rect','arc'].flatMap(type=>ChipUI.objectTypes.find(item=>item.id===type).methods.map(({id,label})=>({type,id,label}))));assert.equal(methods.length,19);
 const progress=[.05,.12,.2,.25,.30,.325,.35,.4,.5,.6,.68,.75,.8,.82,.9,.95];
 const position=p=>page.evaluate(p=>transformPoint({x:p.x-130,y:p.y-90},$('world').getScreenCTM()),p);
 for(const {type,id,label}of methods){
  await page.locator('#toolsButtons [data-tool='+type+']').click();const button=page.locator('#'+type+'ConstructionTools [data-option-id="'+id+'"]');await button.click();await button.hover();
  const svg=page.locator('#chipIconTooltip svg[data-construction-animation]');await svg.waitFor({state:'visible'});const scenes=[];
  for(const time of progress){
   const scene=await svg.evaluate((n,time)=>{
    n.chipHelpSeek(time);const dot=index=>{const e=n.querySelector('[data-demo-point="'+index+'"]');return {x:Number(e.getAttribute('cx')),y:Number(e.getAttribute('cy')),visible:e.getAttribute('visibility')==='visible',confirmed:e.getAttribute('data-demo-confirmed')==='true'}},m=n.querySelector('[data-demo-pointer]').transform.baseVal.consolidate().matrix,shape=n.querySelector('[data-demo-shape]'),visible=shape.getAttribute('visibility')==='visible',samples=visible?Array.from({length:9},(_,i)=>{const p=shape.getPointAtLength(shape.getTotalLength()*i/8);return {x:p.x,y:p.y}}):[],guides=[...n.querySelectorAll('[data-demo-guide]')].filter(e=>e.getAttribute('visibility')==='visible').map(e=>{const a=e.getPointAtLength(0),b=e.getPointAtLength(e.getTotalLength());return [{x:a.x,y:a.y},{x:b.x,y:b.y}]}).filter(([a,b])=>Math.hypot(a.x-b.x,a.y-b.y)>.002),ring=n.querySelector('[data-demo-click]');return {time,points:[dot(1),dot(2),dot(3)],cursor:{x:m.e,y:m.f},stage:n.dataset.demoStage,visible,samples,guides,click:ring.getAttribute('visibility')==='visible',clickAt:{x:Number(ring.getAttribute('cx')),y:Number(ring.getAttribute('cy'))}};
   },time);scenes.push(scene);
   if([.12,.25,.5,.95].includes(time))await svg.screenshot({path:path.join(output,id+'-'+time+'.png')});
  }
  let first=false,second=false,finished=false;const before=await page.evaluate(()=>history.length);
  for(const scene of scenes){
   const screen=await position(scene.cursor);await page.mouse.move(screen.x,screen.y);
   if(!first&&scene.time>=.12){await page.mouse.click(screen.x,screen.y);first=true}
   else if(type==='arc'&&!second&&scene.time>=.30){await page.mouse.click(screen.x,screen.y);second=true}
   else if(!finished&&scene.stage==='complete'){await page.mouse.click(screen.x,screen.y);finished=true}
   const actual=await page.evaluate(({type,finished})=>{
    const node=finished?selected:preview.querySelector(type==='rect'?'rect':'[data-arc-preview]');return {visible:!!node,samples:node?Array.from({length:9},(_,i)=>{const p=node.getPointAtLength(node.getTotalLength()*i/8);return {x:p.x+130,y:p.y+90}}):[],guides:[...preview.querySelectorAll('line')].map(e=>[{x:Number(e.getAttribute('x1'))+130,y:Number(e.getAttribute('y1'))+90},{x:Number(e.getAttribute('x2'))+130,y:Number(e.getAttribute('y2'))+90}]).filter(([a,b])=>Math.hypot(a.x-b.x,a.y-b.y)>.002),history:history.length,anchor:clickAnchor?{x:clickAnchor.x+130,y:clickAnchor.y+90}:null,points:arcDraft?.points.map(p=>({x:p.x+130,y:p.y+90})),panel:$('panel').classList.contains('show')};
   },{type,finished});
   assert.equal(scene.points.filter(p=>p.visible&&p.confirmed).length,finished?(type==='rect'?2:3):first?(second?2:1):0,id+' confirmed markers follow actual clicks');
   assert.equal(actual.panel,false,id+' must remain on the drawing canvas');assert.equal(actual.visible,scene.visible,id+' shape formation at '+scene.time);assert.equal(actual.history,before+(finished?1:0),id+' must commit only on the final click');
   for(let i=0;i<scene.samples.length;i++)for(const axis of ['x','y'])close(actual.samples[i][axis],scene.samples[i][axis],id+' native shape sample at '+scene.time);
   if(type==='rect'&&first&&!finished)for(const axis of ['x','y'])close(actual.anchor[axis],scene.points[0][axis],id+' live rectangle reference');
   if(type==='arc'&&!finished){assert.equal(actual.guides.length,scene.guides.length,id+' construction guide count at '+scene.time);for(let i=0;i<scene.guides.length;i++)for(let j=0;j<2;j++)for(const axis of ['x','y'])close(actual.guides[i][j][axis],scene.guides[i][j][axis],id+' guide at '+scene.time);if(first)for(let i=0;i<(second?2:1);i++)for(const axis of ['x','y'])close(actual.points[i][axis],scene.points[i][axis],id+' confirmed point '+(i+1))}
   if(scene.click)for(const axis of ['x','y'])close(scene.clickAt[axis],scene.cursor[axis],id+' click must occur beneath the pointer');
   if(scene.time>=.95){const bbox=await page.evaluate(()=>{const b=selected.getBBox();return {x:b.x,y:b.y,width:b.width,height:b.height}});assert.ok(bbox.x+130>=5&&bbox.x+bbox.width+130<=250&&bbox.y+90>=5&&bbox.y+bbox.height+90<=150,id+' completed illustration must fit above its caption')}
  }
  assert.equal(finished,true,id);assert.equal(await page.evaluate(()=>ChipDrawingJson.record(selected).reference),id);await page.locator('#undo').click();assert.equal(await page.evaluate(()=>layers.groups().reduce((n,g)=>n+g.children.length,0)),0,id+' rollback');
  results.push({type,id,label,stages:scenes.length,checks:['point order','cursor and click position','live preview and final geometry',...(type==='arc'?['live guide geometry']:['live reference point']),'commit timing','visible bounds']});console.log('PASS '+type+' '+id+' ('+scenes.length+' replay stages)');
 }
 assert.deepEqual(errors,[]);await writeFile(path.join(output,'results.json'),JSON.stringify({ok:true,results},null,2));
 const escape=text=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
 const html='<!doctype html><meta charset="utf-8"><title>矩形與圓弧動畫全方式核對</title><style>body{margin:24px;background:#0b1220;color:#e7edf7;font:16px sans-serif}section{margin:0 0 20px}h2{font-size:16px;margin:10px 0}.frames{display:flex;gap:8px}figure{margin:0;background:#172438}img{display:block;width:260px}figcaption{padding:8px;font-size:13px}</style><h1>矩形與圓弧：十九種方式逐階段核對通過</h1><p>每種方式以動畫游標位置在實際畫布重播十六個階段，比對點位、點擊、預覽、完成圖形，以及圓弧輔助線。</p>'+results.map(({type,id,label})=>'<section data-type="'+type+'"><h2>✓ '+escape(label)+' ('+id+')</h2><div class="frames">'+[.12,.25,.5,.95].map((time,i)=>'<figure><img src="'+id+'-'+time+'.png"><figcaption>'+['① 固定第一點','② 移動第二點','移動成形','點擊完成並停留'][i]+'</figcaption></figure>').join('')+'</div></section>').join('');
 await writeFile(path.join(output,'index.html'),html);const review=await browser.newPage({viewport:{width:1120,height:1000}});await review.goto(new URL('file:///'+path.join(output,'index.html').replaceAll('\\','/')).href);await review.locator('img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
 for(const type of ['rect','arc']){await review.locator('section:not([data-type="'+type+'"])').evaluateAll(nodes=>nodes.forEach(n=>n.hidden=true));await review.screenshot({path:path.join(output,type+'-overview.png'),fullPage:true});await review.locator('section').evaluateAll(nodes=>nodes.forEach(n=>n.hidden=false))}
 console.log(JSON.stringify({ok:true,methods:results.length,replayedStages:results.length*progress.length,report:path.join(output,'index.html')}));
}finally{await browser.close()}
