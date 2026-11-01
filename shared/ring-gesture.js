/* Shared ring rotate/zoom gesture. Guides preview a similarity transform; release commits it. */
(function(root){
'use strict';
const middle=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
class Session{
 constructor(camera,a,b,{min=.000001,max=1e9}={}){this.camera=camera;this.a={...a};this.b={...b};this.origin=middle(a,b);this.center={...this.origin};this.length=Math.hypot(b.x-a.x,b.y-a.y);this.baseAngle=Math.atan2(b.y-a.y,b.x-a.x);this.previousAngle=this.baseAngle;this.delta=0;this.ratio=1;this.currentA={...a};this.currentB={...b};this.min=min;this.max=max;this.valid=this.length>=8}
 setSegment(a,b){this.center=middle(a,b);this.currentA={...a};this.currentB={...b};const length=Math.hypot(b.x-a.x,b.y-a.y);if(length>=2){const angle=Math.atan2(b.y-a.y,b.x-a.x);let difference=angle-this.previousAngle;while(difference>Math.PI)difference-=Math.PI*2;while(difference< -Math.PI)difference+=Math.PI*2;this.delta+=difference;this.previousAngle=angle}this.ratio=length/Math.max(this.length,1e-12);this.valid=this.length>=8&&length>=2;return this}
 setControl(point){return this.setSegment({x:2*this.origin.x-point.x,y:2*this.origin.y-point.y},point)}
 guides(){const dx=this.center.x-this.origin.x,dy=this.center.y-this.origin.y;return {a:{x:this.a.x+dx,y:this.a.y+dy},b:{x:this.b.x+dx,y:this.b.y+dy},c:this.currentA,d:this.currentB,center:this.center}}
 result(){if(!this.valid)return null;return this.camera.zoomAt(this.ratio,this.origin,this.min,this.max).rotateAt(this.delta,this.origin).pan(this.center.x-this.origin.x,this.center.y-this.origin.y)}
}
function mount({surface,viewport=surface.parentNode,getCamera,applyCamera,onTouchStart=()=>{},onTouchEnd=()=>{},onStart=()=>{},onFinish=()=>{},limits={}}){
 const ns='http://www.w3.org/2000/svg',guide=document.createElementNS(ns,'svg');guide.setAttribute('class','ring-guides');guide.setAttribute('aria-hidden','true');guide.hidden=true;
 const create=(tag,attrs)=>{const n=document.createElementNS(ns,tag);for(const [key,value]of Object.entries(attrs))n.setAttribute(key,value);guide.append(n);return n};
 const reference=create('line',{'data-ring-reference':'',stroke:'#80bfff','stroke-dasharray':'6 4'}),following=create('line',{'data-ring-following':'',stroke:'#ffd18a'}),center=create('circle',{'data-ring-center':'',r:4,fill:'#0b1220',stroke:'#ffffff'});viewport.append(guide);
 let stage='idle',start=null,session=null,mouseId=null,touches=new Map(),swallowUp=null,suppressClick=false;
 const point=e=>{const r=surface.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top}};
 const consume=e=>{e.preventDefault();e.stopImmediatePropagation()};
 function line(n,a,b){for(const [key,value]of Object.entries({x1:a.x,y1:a.y,x2:b.x,y2:b.y}))n.setAttribute(key,value)}
 function paint(g,second=true){const r=surface.getBoundingClientRect(),v=viewport.getBoundingClientRect();guide.setAttribute('viewBox','0 0 '+r.width+' '+r.height);guide.style.left=r.left-v.left+'px';guide.style.top=r.top-v.top+'px';guide.style.width=r.width+'px';guide.style.height=r.height+'px';line(reference,g.a,g.b);line(following,g.c||g.a,g.d||g.b);following.style.display=second?'':'none';center.setAttribute('cx',g.center.x);center.setAttribute('cy',g.center.y);guide.hidden=false}
 function finish(commit){const result=commit&&session?session.result():null;stage='idle';session=null;start=null;guide.hidden=true;if(result)applyCamera(result);onFinish(!!result)}
 function cancel(){const active=stage!=='idle';if(active)finish(false);stage=touches.size?'draining':'idle'}
 function updateTouches(){if(stage!=='touch-adjust'||touches.size!==2)return;const [a,b]=[...touches.values()];session.setSegment(a,b);paint(session.guides())}
 function down(e){
  if(e.pointerType==='touch'){
   if(stage==='mouse-baseline'||stage==='mouse-adjust'){consume(e);return}
   if(stage==='draining'){touches.set(e.pointerId,point(e));consume(e);return}
   touches.set(e.pointerId,point(e));if(touches.size===1&&stage==='idle'){onTouchStart();return}
   if(touches.size===2&&stage==='idle'){onStart('touch');const [a,b]=[...touches.values()];session=new Session(getCamera(),a,b,limits);if(!session.valid){finish(false);stage='draining';consume(e);return}stage='touch-adjust';surface.setPointerCapture(e.pointerId);paint(session.guides());consume(e);return}
   if(touches.size>2){cancel();consume(e);return}consume(e);return;
  }
  if(stage==='mouse-adjust'&&e.button===0){session.setControl(point(e));swallowUp=e.pointerId;suppressClick=true;finish(true);consume(e);return}
  if(stage==='mouse-adjust'&&e.button===2){cancel();consume(e);return}
  if(e.button===1&&stage==='idle'&&!touches.size){onStart('mouse');stage='mouse-baseline';mouseId=e.pointerId;start=point(e);surface.setPointerCapture(e.pointerId);paint({a:start,b:start,center:start},false);consume(e);return}
  if(stage!=='idle')consume(e);
 }
 function move(e){
  if(e.pointerType==='touch'){if(!touches.has(e.pointerId))return;touches.set(e.pointerId,point(e));if(stage==='touch-adjust'){updateTouches();consume(e)}else if(stage!=='idle')consume(e);return}
  if(stage==='mouse-baseline'){const end=point(e);paint({a:start,b:end,center:middle(start,end)},false);consume(e)}else if(stage==='mouse-adjust'){session.setControl(point(e));paint(session.guides());consume(e)}
 }
 function up(e){
  if(e.pointerType==='touch'){if(!touches.has(e.pointerId))return;const handled=stage!=='idle';if(stage==='touch-adjust'){touches.set(e.pointerId,point(e));updateTouches();stage='touch-release'}touches.delete(e.pointerId);if(!touches.size){if(stage==='touch-release')finish(true);else if(stage==='draining')stage='idle';onTouchEnd()}if(handled)consume(e);return}
  if(swallowUp===e.pointerId){swallowUp=null;consume(e);return}
  if(stage==='mouse-baseline'&&e.pointerId===mouseId){const end=point(e);session=new Session(getCamera(),start,end,limits);if(session.valid){stage='mouse-adjust';paint(session.guides())}else finish(false);if(surface.hasPointerCapture(e.pointerId))surface.releasePointerCapture(e.pointerId);consume(e)}
 }
 surface.addEventListener('pointerdown',down,true);surface.addEventListener('pointermove',move,true);surface.addEventListener('pointerup',up,true);
 surface.addEventListener('pointercancel',e=>{const active=stage!=='idle';touches.delete(e.pointerId);if(active)cancel();if(!touches.size)onTouchEnd();if(active)consume(e)},true);
 surface.addEventListener('lostpointercapture',e=>{if(stage==='mouse-baseline'||touches.has(e.pointerId)&&stage==='touch-adjust'){touches.delete(e.pointerId);cancel()}},true);
 surface.addEventListener('auxclick',e=>{if(e.button===1)consume(e)},true);surface.addEventListener('click',e=>{if(suppressClick){suppressClick=false;consume(e)}},true);surface.addEventListener('contextmenu',e=>{if(stage!=='idle'){cancel();consume(e)}},true);
 surface.addEventListener('wheel',e=>{if(stage!=='idle')consume(e)},true);document.addEventListener('pointerdown',e=>{if((stage==='mouse-baseline'||stage==='mouse-adjust')&&!surface.contains(e.target))cancel()},true);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&stage!=='idle'){cancel();consume(e)}},true);window.addEventListener('blur',()=>{cancel();touches.clear();stage='idle';onTouchEnd()});window.addEventListener('resize',()=>{if(stage!=='idle')cancel()});
 return {cancel,get stage(){return stage},get session(){return session},guide};
}
root.ChipRing={Session,mount};
})(globalThis);
