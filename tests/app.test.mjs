import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {createDOM} from './dom-fixture.mjs';
const base=new URL('../',import.meta.url);
export async function runApps(){const reports=[];
 for(const app of ['chipchip','chipdraw']){
  const source=await readFile(new URL('src/'+app+'/index.html',base),'utf8'),dom=createDOM(source),E=dom.Element;
  const ctx=new Proxy({measureText:text=>({width:String(text).length*7})},{get:(o,key)=>key in o?o[key]:(()=>{}),set:(o,key,v)=>{o[key]=v;return true}});
  E.prototype.getContext=()=>ctx;E.prototype.getBBox=()=>({x:0,y:0,width:100,height:100});E.prototype.insertBefore=function(node,before){node.remove();const index=this.children.indexOf(before);if(index<0)this.append(node);else{this.children.splice(index,0,node);node.parentNode=this}};
  for(const [key,value]of Object.entries({clientWidth:900,clientHeight:600,offsetWidth:100,offsetHeight:80}))Object.defineProperty(E.prototype,key,{get(){return value}});
  dom.document.createElementNS=(_,tag)=>new E(tag);dom.document.createTreeWalker=()=>({nextNode:()=>false});
  const win={devicePixelRatio:1,addEventListener(){},dispatchEvent(){},visualViewport:null},context=vm.createContext({document:dom.document,window:win,innerWidth:1000,innerHeight:800,devicePixelRatio:1,matchMedia:()=>({matches:true}),Event:class{constructor(type){this.type=type}},ResizeObserver:class{observe(){}},MutationObserver:class{observe(){}},setTimeout:()=>1,clearTimeout(){},requestAnimationFrame:()=>1,performance:{now:()=>0},getComputedStyle:()=>({borderRadius:'16px',getPropertyValue:()=>''}),alert(){},prompt(){},localStorage:{getItem:()=>null,setItem(){}},NodeFilter:{SHOW_TEXT:4}});
  for(const file of ['shared/viewport-core.js','shared/bubbles.js','shared/workspace-ui.js'])vm.runInContext(await readFile(new URL(file,base),'utf8'),context);
  for(const script of source.matchAll(/<script>([\s\S]*?)<\/script>/g))vm.runInContext(script[1],context,{timeout:10000});
  const $=id=>dom.document.getElementById(id);if(app==='chipchip')vm.runInContext('resize();draw()',context);
  const right=$('right');right.dispatchEvent(dom.event('click',right));const degrees=vm.runInContext(app==='chipchip'?'angle*180/Math.PI':'viewAngle',context);assert.ok(Math.abs(degrees-90)<1e-7,'one click must rotate exactly once');
  if(app==='chipdraw'){
   vm.runInContext("setTool('rect')",context);const svg=$('svg'),fire=(type,x,y)=>svg.dispatchEvent({...dom.event(type,svg),pointerId:1,isPrimary:true,button:0,clientX:x,clientY:y});
   fire('pointerdown',200,200);fire('pointerup',200,200);fire('pointermove',300,280);fire('pointerdown',300,280);fire('pointerup',300,280);assert.equal($('art').children.length,1);
   vm.runInContext("setTool('ellipse')",context);fire('pointerdown',350,300);fire('pointermove',450,380);fire('pointerup',450,380);assert.equal($('art').children.length,2);
  }
  reports.push(app+': full startup and exactly one rotation per click'+(app==='chipdraw'?', two-click and drag drawing':''));
 }
 return reports;
}
export const results=await runApps();
