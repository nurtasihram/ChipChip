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

function annotationGeometry(session){const g=session.guides(),radius=session.length/2,angle=session.baseAngle+session.delta,end={x:g.center.x+radius*Math.cos(angle),y:g.center.y+radius*Math.sin(angle)},steps=Math.max(1,Math.min(1440,Math.ceil(Math.abs(session.delta)*32)));let arc='';for(let i=0;i<=steps;i++){const a=session.baseAngle+session.delta*i/steps;arc+=(i?' L ':'M ')+(g.center.x+radius*Math.cos(a))+' '+(g.center.y+radius*Math.sin(a))}const mid=session.baseAngle+session.delta/2;return {from:g.d,to:end,arc,scaleLabel:{x:(g.d.x+end.x)/2,y:(g.d.y+end.y)/2+19},angleLabel:{x:g.center.x+(radius+19)*Math.cos(mid),y:g.center.y+(radius+19)*Math.sin(mid)+4}}}

function arcDecorations(session,{step,cycles=1,equal=false,labelSpacing=54,clock=false,clockPrecision='second'}={}){
 const g=session.guides(),radius=session.length/2,sweep=session.delta,sign=sweep<0?-1:1,endAngle=session.baseAngle+sweep,tip={x:g.center.x+radius*Math.cos(endAngle),y:g.center.y+radius*Math.sin(endAngle)},size=Math.min(8,radius*.3,Math.abs(sweep)*radius*.55),tangent={x:-Math.sin(endAngle)*sign,y:Math.cos(endAngle)*sign};
 const arrow=size>=1?[tip,{x:tip.x-tangent.x*size-tangent.y*size*.45,y:tip.y-tangent.y*size+tangent.x*size*.45},{x:tip.x-tangent.x*size+tangent.y*size*.45,y:tip.y-tangent.y*size-tangent.x*size*.45}]:null;
 const ticks=[];
 if(clock){
  // Time graduations stay on the swept arc and never read polar grid settings.
  const secondsPerTurn=12*3600,minSeconds=({hour:3600,minute:60,second:1,millisecond:.001,microsecond:.000001,nanosecond:.000000001})[clockPrecision]||1;
  const choices=[1e-9,2e-9,5e-9,1e-8,2e-8,5e-8,1e-7,2e-7,5e-7,1e-6,2e-6,5e-6,1e-5,2e-5,5e-5,.0001,.0002,.0005,.001,.002,.005,.01,.02,.05,.1,.2,.5,1,2,5,10,15,30,60,120,300,600,900,1800,3600,7200,10800,21600,43200];
  const choose=minimum=>choices.find(value=>value>=minimum-1e-12)||43200,minorSeconds=choose(Math.max(minSeconds,4/Math.max(1,radius)*secondsPerTurn/(Math.PI*2))),majorSeconds=choose(Math.max(minorSeconds,labelSpacing/Math.max(1,radius)*secondsPerTurn/(Math.PI*2))),minorStep=minorSeconds/secondsPerTurn*Math.PI*2,span=Math.min(Math.abs(sweep),Math.PI*2),count=Math.floor((span+1e-9)/minorStep);
  for(let index=0;index<=count;index++){const seconds=index*minorSeconds;if(seconds>=secondsPerTurn-1e-8&&index)continue;const offset=seconds/secondsPerTurn*Math.PI*2,angle=session.baseAngle+sign*offset,major=Math.abs(seconds/majorSeconds-Math.round(seconds/majorSeconds))<1e-7,length=major?8:4,point=r=>({x:g.center.x+r*Math.cos(angle),y:g.center.y+r*Math.sin(angle)});ticks.push({a:point(Math.max(0,radius-length/2)),b:point(radius+length/2),value:sign*offset,label:major&&radius>=24?point(Math.max(8,radius-17)):null})}
  return {arrow,ticks};
 }
 if(!(Number.isFinite(step)&&step>0&&step<=Math.PI*2))return {arrow,ticks};
 const divides=Math.abs(Math.PI*2/step-Math.round(Math.PI*2/step))<1e-8,turns=equal||divides?1:Math.max(1,Math.min(360,cycles||1)),span=Math.min(Math.abs(sweep),turns*Math.PI*2),count=Math.floor((span+1e-9)/step),stride=Math.max(1,Math.ceil(count/720),Math.ceil(4/Math.max(1e-9,radius*step))),labelStride=Math.max(1,Math.ceil(labelSpacing/Math.max(1e-9,radius*step*stride))),seen=new Set();
 for(let index=0;index<=count;index+=stride){const offset=index*step,key=Math.round((offset%(Math.PI*2))*1e8);if(seen.has(key))continue;seen.add(key);const angle=session.baseAngle+sign*offset,major=(index/stride)%labelStride===0,length=major?8:4,point=r=>({x:g.center.x+r*Math.cos(angle),y:g.center.y+r*Math.sin(angle)});ticks.push({a:point(Math.max(0,radius-length/2)),b:point(radius+length/2),value:sign*offset,label:major&&radius>=24?point(Math.max(8,radius-15)):null})}
 return {arrow,ticks};
}
function mount({surface,viewport=surface.parentNode,getCamera,applyCamera,onTouchStart=()=>{},onTouchEnd=()=>{},onStart=()=>{},onFinish=()=>{},limits={}}){
 const ns='http://www.w3.org/2000/svg',guide=document.createElementNS(ns,'svg');guide.setAttribute('class','ring-guides');guide.setAttribute('aria-hidden','true');guide.hidden=true;guide.setAttribute('hidden','');guide.style.display='none';
 const create=(tag,attrs)=>{const n=document.createElementNS(ns,tag);for(const [key,value]of Object.entries(attrs))n.setAttribute(key,value);guide.append(n);return n};
 const colors=ChipViewport.colors;
 const reference=create('line',{'data-ring-reference':'',stroke:colors.rho,'stroke-dasharray':'6 4'}),following=create('line',{'data-ring-following':'',stroke:colors.theta}),extension=create('line',{'data-ring-extension':'',stroke:colors.scale}),arc=create('path',{'data-ring-angle-arc':'',stroke:colors.theta,fill:'none'}),ticks=create('path',{'data-ring-ticks':'',stroke:colors.theta,fill:'none'}),tickLabels=create('g',{'data-ring-tick-labels':''}),arrow=create('polygon',{'data-ring-direction-arrow':'',fill:colors.theta}),scaleLabel=create('text',{'data-ring-scale-label':'',fill:colors.scale,'text-anchor':'middle'}),angleLabel=create('text',{'data-ring-angle-label':'',fill:colors.theta,'text-anchor':'middle'}),center=create('circle',{'data-ring-center':'',r:4,fill:'#0b1220',stroke:'#ffffff'});viewport.append(guide);
 let stage='idle',start=null,session=null,mouseId=null,touches=new Map(),swallowUp=null,suppressClick=false;
 const point=e=>{const r=surface.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top}};
 const consume=e=>{e.preventDefault();e.stopImmediatePropagation()};
 function line(n,a,b){for(const [key,value]of Object.entries({x1:a.x,y1:a.y,x2:b.x,y2:b.y}))n.setAttribute(key,value)}
 function showGuide(visible){guide.hidden=!visible;if(visible){guide.removeAttribute('hidden');guide.style.display='block'}else{guide.setAttribute('hidden','');guide.style.display='none';scaleLabel.textContent='';angleLabel.textContent='';arc.setAttribute('d','');ticks.setAttribute('d','');tickLabels.replaceChildren();arrow.setAttribute('points','');for(const n of [reference,following,extension])line(n,{x:0,y:0},{x:0,y:0})}}
 function paint(g,second=true){const r=surface.getBoundingClientRect(),v=viewport.getBoundingClientRect();guide.setAttribute('viewBox','0 0 '+r.width+' '+r.height);guide.style.left=r.left-v.left+'px';guide.style.top=r.top-v.top+'px';guide.style.width=r.width+'px';guide.style.height=r.height+'px';line(reference,g.a,g.b);line(following,g.c||g.a,g.d||g.b);following.style.display=second?'':'none';for(const n of [extension,arc,ticks,tickLabels,arrow,scaleLabel,angleLabel])n.style.display=second?'':'none';center.setAttribute('cx',g.center.x);center.setAttribute('cy',g.center.y);if(second&&session){const a=annotationGeometry(session);line(extension,a.from,a.to);arc.setAttribute('d',a.arc);scaleLabel.setAttribute('x',Math.max(20,Math.min(r.width-20,a.scaleLabel.x)));scaleLabel.setAttribute('y',Math.max(16,Math.min(r.height-8,a.scaleLabel.y)));angleLabel.setAttribute('x',Math.max(20,Math.min(r.width-20,a.angleLabel.x)));angleLabel.setAttribute('y',Math.max(16,Math.min(r.height-8,a.angleLabel.y)));const precision=document.getElementById('lengthPrecision'),digits=Math.max(0,Math.min(9,Number(precision?.value??2)));scaleLabel.textContent='×'+session.ratio.toFixed(digits);const mode=document.getElementById('angleMode').value,precisionValue=document.getElementById('anglePrecision').value;angleLabel.textContent=ChipUI.angle.format(session.delta*180/Math.PI,mode,precisionValue);const decoration=arcDecorations(session,{step:mode==='clock'?undefined:ChipUI.angle.thetaDegrees()*Math.PI/180,cycles:Number(document.getElementById('polarCycles').value)||1,equal:document.getElementById('polarStepMode').value==='equal',clock:mode==='clock',clockPrecision:precisionValue,labelSpacing:Math.max(54,angleLabel.textContent.length*6+12)});arrow.setAttribute('points',decoration.arrow?decoration.arrow.map(p=>p.x+','+p.y).join(' '):'');let marks='';tickLabels.replaceChildren();for(const tick of decoration.ticks){marks+='M '+tick.a.x+' '+tick.a.y+' L '+tick.b.x+' '+tick.b.y+' ';if(tick.label){const text=document.createElementNS(ns,'text');text.setAttribute('x',tick.label.x);text.setAttribute('y',tick.label.y+3);text.setAttribute('fill',colors.theta);text.setAttribute('text-anchor','middle');text.setAttribute('class','ring-tick-label');text.textContent=ChipUI.angle.format(tick.value*180/Math.PI,mode,precisionValue);tickLabels.append(text)}}ticks.setAttribute('d',marks)}showGuide(true)}
 function finish(commit){const result=commit&&session?session.result():null;stage='idle';session=null;start=null;showGuide(false);if(result)applyCamera(result);onFinish(!!result)}
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
root.ChipRing={Session,annotationGeometry,arcDecorations,mount};
})(globalThis);
