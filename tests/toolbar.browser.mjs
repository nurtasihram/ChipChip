import assert from 'node:assert/strict';
const {chromium}=await import(process.env.CHIPDRAW_PLAYWRIGHT||'playwright');
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-gpu','--disable-software-rasterizer'],...(process.env.CHIPDRAW_BROWSER?{executablePath:process.env.CHIPDRAW_BROWSER}:{})});
try{
 const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];page.on('pageerror',error=>errors.push(error.message));await page.goto(new URL('../ChipDraw.html',import.meta.url).href);await page.waitForFunction(()=>document.getElementById('advanced').style.height);
 const ids=['tools','advanced','panel','layersPanel'];
 const close=(a,b)=>Math.abs(a-b)<2;
 async function dragHandle(id,edge,expire=false){
  const shell=page.locator('#'+id),grip=shell.locator('.ui-toolbar-handle'),r=await shell.boundingBox(),h=await grip.boundingBox();
  const b=await shell.evaluate(node=>{const tray=node.querySelector('.ui-toolbar-items');return tray.chipToolbar.bounds()});
  const x=edge==='left'?b.left:edge==='right'?b.right-r.width:r.x,y=edge==='top'?b.top:edge==='bottom'?b.bottom-r.height:r.y;
  await page.mouse.move(h.x+h.width/2,h.y+h.height/2);await page.mouse.down();await page.mouse.move(h.x+h.width/2+x-r.x,h.y+h.height/2+y-r.y);
  assert.equal(await page.locator('#dockPreview').evaluate(node=>node.classList.contains('visible')),true,id+' shows the same edge preview');assert.equal(await page.locator('#dockPreview').getAttribute('data-edge'),edge);
  const preview=await page.locator('#dockPreview').boundingBox(),before=await shell.getAttribute('aria-orientation');
  if(expire){await page.waitForTimeout(550);assert.equal(await page.locator('#dockPreview').evaluate(node=>node.classList.contains('visible')),false)}
  await page.mouse.up();
  if(expire){assert.equal(await shell.getAttribute('aria-orientation'),before);return}
  const result=await shell.boundingBox();for(const key of ['x','y','width','height'])assert.ok(close(result[key],preview[key]),id+' actual dock matches its preview '+key);
 }
 for(const id of ids){
  await page.evaluate(({ids,id})=>{for(const key of ids)document.getElementById(key).style.visibility=key===id?'visible':'hidden';if(id!=='tools'){const node=document.getElementById(id);if(id==='advanced')node.open=true;if(id==='panel')node.classList.add('show');node.chipFloatingPanel.setCollapsed(true)}const node=document.getElementById(id);node.classList.remove('vertical');node.setAttribute('aria-orientation','horizontal');node.querySelector('.ui-toolbar-items').chipToolbar.place(650,300)},{ids,id});
  await dragHandle(id,'left');await dragHandle(id,'top');await dragHandle(id,'right');await dragHandle(id,'bottom');
  await page.locator('#'+id).evaluate(node=>{node.classList.remove('vertical');node.setAttribute('aria-orientation','horizontal');node.querySelector('.ui-toolbar-items').chipToolbar.place(650,300)});await dragHandle(id,'left',true);
  if(id!=='tools'){await page.locator('#'+id+' .ui-panel-mini button').click();assert.equal(await page.locator('#'+id+' .ui-floating-body').isVisible(),true,'action button still expands its own panel')}
 }
 // Moving the original node retains both the common option model and its click behavior.
 await page.reload();await page.waitForFunction(()=>document.getElementById('advanced').style.height);await page.evaluate(()=>{for(const id of ['advanced','panel','layersPanel'])document.getElementById(id).style.visibility='hidden';globalThis.originalLine=document.querySelector('[data-tool=line]');globalThis.originalOrder=drawingToolOptions.order()});
 async function tear(selector,x,y){const r=await page.locator(selector).boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.mouse.move(x,y,{steps:6});await page.mouse.up()}
 await tear('#toolsButtons [data-tool=line]',650,350);assert.equal(await page.locator('[data-toolbar-detached=true]').count(),1);assert.equal(await page.evaluate(()=>document.querySelector('[data-toolbar-detached=true] [data-tool=line]')===originalLine),true);assert.deepEqual(await page.evaluate(()=>drawingToolOptions.order()),await page.evaluate(()=>originalOrder));
 await page.locator('[data-toolbar-detached=true] [data-tool=line]').click();assert.equal(await page.evaluate(()=>tool),'line');await page.locator('#toolsButtons [data-tool=rect]').click();assert.equal(await page.locator('[data-toolbar-detached=true] [data-tool=line]').getAttribute('aria-pressed'),'false');
 const home=await page.locator('#toolsButtons').boundingBox();await tear('[data-toolbar-detached=true] .ui-toolbar-handle',home.x+home.width/2,home.y+home.height/2);assert.equal(await page.locator('[data-toolbar-detached=true]').count(),0);assert.equal(await page.evaluate(()=>document.querySelector('#toolsButtons [data-tool=line]')===originalLine),true);assert.deepEqual(await page.evaluate(()=>drawingToolOptions.order()),await page.evaluate(()=>originalOrder));
 await tear('#toolsButtons [data-tool=point]',650,350);const detached=page.locator('[data-toolbar-detached=true]'),initial=await detached.boundingBox(),currentTool=await page.evaluate(()=>tool);await tear('[data-toolbar-detached=true] [data-tool=point]',initial.x+100,initial.y+100);const moved=await detached.boundingBox();assert.ok(moved.x>initial.x+20&&moved.y>initial.y+20);assert.equal(await page.evaluate(()=>tool),currentTool,'dragging a detached button does not trigger it');
 const h=await page.locator('#toolsButtons [data-tool=line]').boundingBox();await page.mouse.move(h.x+h.width/2,h.y+h.height/2);await page.mouse.down();await page.mouse.move(700,450);await page.keyboard.press('Escape');await page.mouse.up();assert.equal(await page.locator('#toolsButtons [data-tool=line]').count(),1,'Escape cancels tear off');assert.equal(await page.locator('[data-toolbar-detached=true]').count(),1);
 // A native action that opens subtools keeps the same handler after tear off.
 await page.evaluate(()=>{const shell=document.createElement('div'),handle=document.createElement('div'),tray=document.createElement('div');shell.id='actionToolbar';handle.tabIndex=0;for(const name of ['子工具','第二工具']){const button=document.createElement('button');button.textContent=name;button.setAttribute('aria-label',name);button.onclick=()=>{document.body.dataset.lastAction=name};tray.append(button)}shell.append(handle,tray);document.body.append(shell);ChipUI.floatingPanel(shell,{toolbar:true,handle,items:tray}).place(900,400)});
 await tear('#actionToolbar button:first-child',1000,650);await page.getByRole('button',{name:'子工具',exact:true}).click();assert.equal(await page.evaluate(()=>document.body.dataset.lastAction),'子工具');
 assert.deepEqual(errors,[]);console.log('PASS: identical four-edge docking previews, orientation and expiry; original buttons tear off, share selection, move, return, cancel and retain native actions');
}finally{await browser.close()}
