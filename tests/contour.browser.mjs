import assert from 'node:assert/strict';
const {chromium}=await import(process.env.CHIPDRAW_PLAYWRIGHT||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.CHIPDRAW_BROWSER?{executablePath:process.env.CHIPDRAW_BROWSER}:{})});
try{
 const page=await browser.newPage({viewport:{width:1200,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(new URL('../ChipDraw.html',import.meta.url).href);
 for(const mirror of [false,true])for(const zoom of [4,20])for(const join of ['round','miter']){
  const result=await page.evaluate(({mirror,zoom,join})=>{
   art.innerHTML='';selection.clear();selected=null;layers.normalize();renderLayers();scale=zoom;viewAngle=37;viewMirrored=mirror;view();const rect=el('rect',{x:0,y:0,width:101,height:53,stroke:'#69b8ff','stroke-width':10,'stroke-linejoin':join,fill:'none',transform:'rotate(17)'});selection.replace([rect]);selected=rect;$('selectionOutlineMode').value='contour';$('selectionOverflowUnit').setAttribute('data-unit','px');ChipUI.measurements.setValue('selectionOverflow',3,'px');paintSelection();
   const contour=$('selectionOverlay').querySelector('[data-selection-kind=first]'),m=rect.getScreenCTM(),inverse=contour.getScreenCTM().inverse(),corners=[{x:0,y:0,sx:-1,sy:-1},{x:101,y:0,sx:1,sy:-1},{x:101,y:53,sx:1,sy:1},{x:0,y:53,sx:-1,sy:1}],outside=[];
   for(const c of corners)for(let i=0;i<=16;i++){const angle=i*Math.PI/32,p=join==='miter'?{x:c.x+c.sx*5,y:c.y+c.sy*5}:{x:c.x+c.sx*5*Math.cos(angle),y:c.y+c.sy*5*Math.sin(angle)},local=transformPoint(transformPoint(p,m),inverse);if(!contour.isPointInFill(new DOMPoint(local.x,local.y)))outside.push(p)}
   return {outside,path:contour.getAttribute('d')};
  },{mirror,zoom,join});assert.deepEqual(result.outside,[],`contour must enclose all ${join} corners at zoom ${zoom}, mirror ${mirror}`);assert.ok(!result.path.includes(' Q '),'expanded boundary must not be cut inward');
 }
 assert.deepEqual(errors,[]);console.log('PASS: fan contour encloses exact round and miter rectangle corners through rotation, mirror and high zoom');
}finally{await browser.close()}
