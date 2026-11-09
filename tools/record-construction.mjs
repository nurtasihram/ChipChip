// Record real browser interactions and SVG help, using Chrome's screen capture.
import assert from 'node:assert/strict';
import {mkdir,writeFile,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const {chromium}=await import(process.env.CHIPDRAW_PLAYWRIGHT||'playwright');
const output=path.resolve(process.argv[2]||'.codex-attachments/test-recordings/2026-11-08/canvas-drawing.mp4');
const directory=await mkdtemp(path.join(tmpdir(),'chipchip-capture-'));
await mkdir(path.dirname(output),{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.CHIPDRAW_BROWSER?{executablePath:process.env.CHIPDRAW_BROWSER}:{})});
try{
 const page=await browser.newPage({viewport:{width:1400,height:900},deviceScaleFactor:1}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(new URL('../ChipDraw.html',import.meta.url).href);await page.waitForFunction(()=>constructionTools);
 await page.evaluate(()=>{
  $('advanced').open=false;$('panel').classList.remove('show');$('layersPanel').hidden=true;$('snapEnabled').checked=false;scale=4;view();
  const caption=document.createElement('div');caption.id='recordingCaption';caption.style.cssText='position:fixed;left:24px;bottom:24px;z-index:999999;padding:12px 18px;background:#172438;color:#e7edf7;border:1px solid #59779c;border-radius:6px;font:18px sans-serif;pointer-events:none';document.body.append(caption);
  const cursor=document.createElement('div');cursor.id='recordingPointer';cursor.style.cssText='position:fixed;left:0;top:0;width:20px;height:26px;z-index:1000000;pointer-events:none';cursor.innerHTML='<svg viewBox="0 0 20 26"><path d="M1 1v20l5-5 5 9 4-2-5-9 8-1Z" fill="white" stroke="#172438"/></svg>';document.body.append(cursor);document.addEventListener('pointermove',e=>{cursor.style.left=e.clientX+'px';cursor.style.top=e.clientY+'px'});document.addEventListener('pointerdown',()=>cursor.animate([{filter:'drop-shadow(0 0 5px #69b8ff)'},{filter:'none'}],{duration:400}));
 });
 const client=await page.context().newCDPSession(page),frames=[],pending=[];let frameId=0;
 client.on('Page.screencastFrame',event=>{const index=frameId++,file=path.join(directory,String(index).padStart(6,'0')+'.jpg');frames.push({index,file,time:event.metadata.timestamp});pending.push(writeFile(file,Buffer.from(event.data,'base64')).then(()=>client.send('Page.screencastFrameAck',{sessionId:event.sessionId})).catch(error=>errors.push(error.message)))});
 await client.send('Page.startScreencast',{format:'jpeg',quality:85,maxWidth:1400,maxHeight:900,everyNthFrame:1});
 const pause=ms=>page.waitForTimeout(ms),caption=text=>page.evaluate(text=>document.getElementById('recordingCaption').textContent=text,text);
 const position=p=>page.evaluate(p=>transformPoint(p,$('world').getScreenCTM()),p);
 async function move(p,duration=1000){const end=await position(p),start=await page.evaluate(()=>({x:parseFloat(document.getElementById('recordingPointer').style.left)||0,y:parseFloat(document.getElementById('recordingPointer').style.top)||0}));const count=30;for(let i=1;i<=count;i++){await page.mouse.move(start.x+(end.x-start.x)*i/count,start.y+(end.y-start.y)*i/count);await pause(duration/count)}}
 async function click(p){await move(p,500);await page.mouse.click(...Object.values(await position(p)));await pause(500)}
 async function choose(type,id,text){await caption(text);await page.locator('#toolsButtons [data-tool='+type+']').click();const button=page.locator('#'+type+'ConstructionTools [data-option-id="'+id+'"]');await button.hover();await pause(3500);await button.click();assert.equal(await page.evaluate(()=>$('panel').classList.contains('show')),false)}
 if(process.argv.includes('--help-only')){const examples=process.argv.includes('--all-methods')?await page.evaluate(()=>['rect','arc'].flatMap(type=>ChipUI.objectTypes.find(item=>item.id===type).methods.map(item=>[type,item.id,item.label]))):[['rect','top-right','矩形：右上角與寬高'],['arc','center-start-sweep','圓弧：圓心、起點與掃角']];for(const [type,id,label]of examples){await caption((type==='rect'?'矩形':'圓弧')+' · '+label+' · 操作次序核對');await page.locator('#toolsButtons [data-tool='+type+']').click();await page.locator('#'+type+'ConstructionTools [data-option-id="'+id+'"]').hover();await pause(7200);console.log('Recorded '+type+' '+id)}}else{
 await choose('rect','center','矩形：SVG 動畫提示 → 固定中心 → 畫布拖曳完成');
 const a=await position({x:-20,y:5});await page.mouse.move(a.x,a.y);await page.mouse.down();await move({x:30,y:35},1700);await page.mouse.up();await pause(1400);assert.equal(await page.evaluate(()=>ChipDrawingJson.record(selected).reference),'center');await page.locator('#undo').click();assert.equal(await page.evaluate(()=>layers.groups().reduce((sum,g)=>sum+g.children.length,0)),0,'each demonstration returns to an empty canvas');
 const examples=[
  ['center-start-end','圓心與兩點',[[-20,15],[20,15],[-20,-25]]],
  ['center-start-sweep','圓心、起點與掃角',[[-20,15],[20,15],[-20,-25]]],
  ['three-points','三點圓弧',[[-30,20],[0,-15],[30,20]]],
  ['endpoints-radius','兩端點與半徑',[[-30,20],[30,20],[0,-5]]],
  ['endpoints-sagitta','兩端點與弓高',[[-30,20],[30,20],[0,-10]]],
  ['start-tangent-end','起點、切向與終點',[[-30,20],[-30,-10],[30,-10]]],
  ['two-tangents','雙切點與連動切向',[[-30,20],[20,-20],[-30,-20]]],
  ['center-radius-start-sweep','圓心、半徑、起始角與掃角',[[-20,15],[20,15],[-20,-25]]]
 ];
 for(const [id,label,points]of examples){await choose('arc',id,label+'：全部在畫布內動態完成');await click({x:points[0][0],y:points[0][1]});await click({x:points[1][0],y:points[1][1]});await move({x:points[2][0],y:points[2][1]},1800);assert.equal(await page.locator('[data-arc-preview]').count(),1);await pause(1300);const target=await position({x:points[2][0],y:points[2][1]});await page.mouse.click(target.x,target.y);assert.equal(await page.evaluate(()=>ChipDrawingJson.record(selected).reference),id);assert.equal(await page.evaluate(()=>$('panel').classList.contains('show')),false);await pause(1400);await page.locator('#undo').click();assert.equal(await page.evaluate(()=>layers.groups().reduce((sum,g)=>sum+g.children.length,0)),0,'each demonstration returns to an empty canvas');await pause(300)}
 await caption('驗證完成：矩形與八種圓弧均於畫布內完成，未切換物件屬性面板');await pause(2000);
 }
 await client.send('Page.stopScreencast');await Promise.all(pending);assert.deepEqual(errors,[]);assert.ok(frames.length>100);
 frames.sort((a,b)=>a.index-b.index);const concat=frames.map((frame,index)=>"file '"+path.basename(frame.file)+"'\nduration "+Math.max(.016,(frames[index+1]?.time??frame.time+.1)-frame.time)).join('\n')+"\nfile '"+path.basename(frames.at(-1).file)+"'\n";
 const list=path.join(directory,'frames.txt');await writeFile(list,concat);await browser.close();
 await promisify(execFile)(process.env.CHIPDRAW_FFMPEG||'ffmpeg',['-y','-hide_banner','-loglevel','error','-f','concat','-safe','0','-i',list,'-vf','fps=30','-c:v','libx264','-preset','fast','-crf','21','-pix_fmt','yuv420p','-movflags','+faststart',output],{windowsHide:true,maxBuffer:2e6});
 console.log(JSON.stringify({ok:true,video:output,frames:frames.length,checks:process.argv.includes('--help-only')?['continuous rectangle and arc SVG help','no browser errors']:['canvas-only rectangle and eight arc methods','animated SVG help','live previews','no forced property panel','no browser errors']}));
}finally{await browser.close()}
