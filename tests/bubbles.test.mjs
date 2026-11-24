import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {createDOM} from './fixtures/dom-fixture.mjs';
const base=new URL('../',import.meta.url);
export async function runBubbles(){const reports=[];
 const app='chipdraw';
  const source=await readFile(new URL('src/'+app+'/index.html',base),'utf8');assert.ok(source.includes('data-ui-bubbles'));assert.ok(!source.includes('id="scaleLegend"'));assert.ok(!source.includes('id="axisCompass"'));assert.ok(!source.includes('compassHideTimer'));assert.ok(!source.includes('scaleHideTimer'));assert.ok(!source.includes('overlayTimer'));
  const {document,Element,event}=createDOM(source);document.createElementNS=(_,tag)=>new Element(tag);let time=0,next=1;const timers=new Map(),setTimeout=(fn,delay)=>{const id=next++;timers.set(id,{fn,at:time+delay});return id},clearTimeout=id=>timers.delete(id),advance=ms=>{time+=ms;for(let i=0;i<20;i++){const due=[...timers].filter(([,t])=>t.at<=time);if(!due.length)return;for(const [id,t]of due){timers.delete(id);t.fn()}}throw Error('Unexpected recurring timer')};
  const context=vm.createContext({document,window:{addEventListener(){},dispatchEvent(){}},innerWidth:1000,innerHeight:800,matchMedia:()=>({matches:true}),ResizeObserver:class{observe(){}},Event:class{constructor(type,options={}){Object.assign(this,{type,...options})}},setTimeout,clearTimeout});
  for(const file of ['shared/viewport-core.js','shared/bubbles.js','shared/ui-definitions.js','shared/quantity-editor.js','shared/json-store.js','shared/json-test-ui.js','shared/workspace-ui.js'])vm.runInContext(await readFile(new URL(file,base),'utf8'),context);context.ChipUI.mount();
  const $=id=>document.getElementById(id),manager=context.ChipBubbles,viewport=$('scaleLegend').parentNode;let width=600,height=400;viewport.getBoundingClientRect=()=>({left:50,top:70,width,height,right:50+width,bottom:70+height});
  const bubble=manager.get('scaleLegend'),node=bubble.element;node.getBoundingClientRect=()=>({left:50+(parseFloat(node.style.left)||0),top:70+(parseFloat(node.style.top)||0),width:160,height:70});
  assert.equal(manager.get('scaleLegend').options.placement,'bottom-right');assert.equal(manager.get('axisCompass').options.placement,'top-left');assert.equal($('statusBubble'),null);assert.equal($('coordinateReadout'),null);manager.update(new context.ChipViewport.Camera({x:300,y:200,scale:2,angle:.4,mirror:true}),{status:'100% · test',active:true});assert.equal($('scaleText').textContent,'50.00 mm');assert.ok($('axisCompassGeometry').children.length>0);
  advance(1500);assert.equal(node.style.opacity,'0');viewport.dispatchEvent({...event('pointermove',viewport),clientX:100,clientY:100});assert.equal(node.style.opacity,'0','ordinary pointer motion must not wake the scale');bubble.refresh(true);assert.equal(node.style.opacity,'1');const pin=$('pinScaleLegend');pin.dispatchEvent(event('click',pin));assert.equal(bubble.pinned,true);advance(10000);assert.equal(node.style.opacity,'1');pin.dispatchEvent(event('click',pin));assert.equal(bubble.pinned,false);
  node.dispatchEvent({...event('pointerdown',node),pointerId:1,button:0,isPrimary:true,clientX:60,clientY:100});node.dispatchEvent({...event('pointermove',node),pointerId:1,clientX:9000,clientY:9000});assert.equal(node.style.left,'440px');assert.equal(node.style.top,'330px');node.dispatchEvent({...event('pointercancel',node),pointerId:1});assert.equal(bubble.drag,null);advance(0);width=300;height=200;bubble.clamp();assert.equal(node.style.left,'140px');assert.equal(node.style.top,'130px');
  const compassClose=$('closeCompass');compassClose.dispatchEvent(event('click',compassClose));assert.equal($('showCompass').checked,true,'ChipChip compass close must not change its setting');assert.equal($('axisCompass').hidden,true);$('showCompass').dispatchEvent(event('input',$('showCompass')));assert.equal($('axisCompass').hidden,false);const close=$('closeScaleLegend');close.dispatchEvent(event('click',close));assert.equal($('showScale').checked,false);assert.equal(node.hidden,true);$('showScale').checked=true;bubble.refresh(true);assert.equal(node.hidden,false);
  node.dispatchEvent({...event('pointerdown',node),pointerId:2,button:0,isPrimary:false,clientX:60,clientY:100});assert.equal(bubble.drag,null,'second touch must not start dragging');

  for(const [unit,system,expected] of [['mm','metric',[100,100,50,2]],['inch','british',[5,5,2,.1]],['um','metric',[100000,100000,50000,2000]]]){
   const settings=context.ChipUI.measurements.settings,data=settings.read();data.length=system;data.length_approx=unit;settings.apply(data);
   width=900;
   for(const [i,zoom] of [.2,1,2,37].entries())for(const coordinate of ['cart','polar']){
    $('coordinateMode').value=coordinate;
    manager.update(new context.ChipViewport.Camera({scale:zoom,angle:.7,mirror:true}));
    const label=context.ChipUI.measurements.unitLabel(unit),factor=context.ChipViewport.units[unit];
    assert.equal($('scaleText').textContent,expected[i].toFixed(2)+' '+label);
    assert.equal(parseFloat($('scaleBar').style.width),expected[i]*factor*zoom);
    assert.equal($('pixelScaleText').textContent,(1/zoom/factor).toFixed(2)+' '+label+'/px');
    assert.equal($('axisCompass').getAttribute('aria-label').startsWith(coordinate==='polar'?'極座標':'正交座標'),true);
   }
  }
  let disabled=false;const notice=manager.selectionNotice({x:20,y:30,total:3,added:2,removed:1,details:['選中 · line'],duration:1000,onDisable:()=>disabled=true});assert.ok(notice.querySelector('[data-bubble-pin]'));assert.equal(notice.classList.contains('bubble-actions-open'),false);assert.ok(notice.textContent.includes('選中3個物件'));assert.equal(notice.querySelector('.selection-gain').textContent,' +2個新增');assert.ok(notice.textContent.includes('消選1個物件'));notice.dispatchEvent(event('pointerenter',notice));advance(1200);assert.notEqual(notice.style.opacity,'0');notice.dispatchEvent(event('click',notice));assert.equal(notice.querySelector('.selection-notice-detail').hidden,false);const noticePin=notice.querySelector('[data-bubble-pin]');noticePin.dispatchEvent(event('click',noticePin));notice.dispatchEvent(event('pointerleave',notice));advance(4000);assert.equal(notice.style.opacity,'1');noticePin.dispatchEvent(event('click',noticePin));const noticeClose=notice.querySelector('[data-bubble-close]');noticeClose.dispatchEvent(event('click',noticeClose));assert.equal(disabled,true);assert.equal(notice.hidden,true);
  reports.push(app+': common bubble templates, timed fade, pin, close/reopen, drag cancellation and viewport bounds');
 return reports;
}
export const results=await runBubbles();
