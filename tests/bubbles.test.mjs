import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {createDOM} from './dom-fixture.mjs';
const base=new URL('../',import.meta.url);
export async function runBubbles(){const reports=[],rendered=[];
 for(const app of ['chipchip','chipdraw']){
  const source=await readFile(new URL('src/'+app+'/index.html',base),'utf8');assert.ok(source.includes('data-ui-bubbles'));assert.ok(!source.includes('id="scaleLegend"'));assert.ok(!source.includes('id="axisCompass"'));assert.ok(!source.includes('compassHideTimer'));assert.ok(!source.includes('scaleHideTimer'));assert.ok(!source.includes('overlayTimer'));
  const {document,Element,event}=createDOM(source);document.createElementNS=(_,tag)=>new Element(tag);let time=0,next=1;const timers=new Map(),setTimeout=(fn,delay)=>{const id=next++;timers.set(id,{fn,at:time+delay});return id},clearTimeout=id=>timers.delete(id),advance=ms=>{time+=ms;for(let i=0;i<20;i++){const due=[...timers].filter(([,t])=>t.at<=time);if(!due.length)return;for(const [id,t]of due){timers.delete(id);t.fn()}}throw Error('Unexpected recurring timer')};
  const context=vm.createContext({document,window:{addEventListener(){},dispatchEvent(){}},innerWidth:1000,innerHeight:800,matchMedia:()=>({matches:true}),ResizeObserver:class{observe(){}},Event:class{constructor(type,options={}){Object.assign(this,{type,...options})}},setTimeout,clearTimeout});
  for(const file of ['shared/viewport-core.js','shared/bubbles.js','shared/workspace-ui.js'])vm.runInContext(await readFile(new URL(file,base),'utf8'),context);context.ChipUI.mount();
  const $=id=>document.getElementById(id),manager=context.ChipBubbles,viewport=$('scaleLegend').parentNode;let width=600,height=400;viewport.getBoundingClientRect=()=>({left:50,top:70,width,height,right:50+width,bottom:70+height});
  const bubble=manager.get('scaleLegend'),node=bubble.element;node.getBoundingClientRect=()=>({left:50+(parseFloat(node.style.left)||0),top:70+(parseFloat(node.style.top)||0),width:160,height:70});
  manager.update(new context.ChipViewport.Camera({x:300,y:200,scale:2,angle:.4,mirror:true}),{status:'100% · test',active:true});assert.equal($('scaleText').textContent,'50.00 mm');assert.ok($('axisCompassGeometry').children.length>0);rendered.push(JSON.stringify({scale:$('scaleText').textContent,ratio:$('pixelScaleText').textContent,angle:$('orientationText').textContent,geometry:$('axisCompassGeometry').innerHTML}));
  advance(1500);assert.equal(node.style.opacity,'0');bubble.refresh(true);assert.equal(node.style.opacity,'1');const pin=$('pinScaleLegend');pin.dispatchEvent(event('click',pin));assert.equal(bubble.pinned,true);advance(10000);assert.equal(node.style.opacity,'1');pin.dispatchEvent(event('click',pin));assert.equal(bubble.pinned,false);
  node.dispatchEvent({...event('pointerdown',node),pointerId:1,button:0,isPrimary:true,clientX:60,clientY:100});node.dispatchEvent({...event('pointermove',node),pointerId:1,clientX:9000,clientY:9000});assert.equal(node.style.left,'432px');assert.equal(node.style.top,'322px');node.dispatchEvent({...event('pointercancel',node),pointerId:1});assert.equal(bubble.drag,null);width=300;height=200;bubble.clamp();assert.equal(node.style.left,'132px');assert.equal(node.style.top,'122px');
  const close=$('closeScaleLegend');close.dispatchEvent(event('click',close));assert.equal($('showScale').checked,false);assert.equal(node.hidden,true);$('showScale').checked=true;bubble.refresh(true);assert.equal(node.hidden,false);
  node.dispatchEvent({...event('pointerdown',node),pointerId:2,button:0,isPrimary:false,clientX:60,clientY:100});assert.equal(bubble.drag,null,'second touch must not start dragging');
  if(app==='chipchip'){assert.ok(manager.get('info') instanceof context.ChipBubbles.Bubble);$('info').classList.add('show');manager.refresh();assert.equal($('info').hidden,false);$('closeInfoBubble').dispatchEvent(event('click',$('closeInfoBubble')));assert.equal($('info').classList.contains('show'),false)}
  reports.push(app+': common bubble templates, timed fade, pin, close/reopen, drag cancellation and viewport bounds');
 }
 assert.equal(rendered[0],rendered[1]);reports.push('identical scale and compass output for identical camera/settings');return reports;
}
export const results=await runBubbles();
