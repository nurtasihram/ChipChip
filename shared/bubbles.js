/* Shared bubble component: all overlay presentation and interaction lives here. */
(function(root){
'use strict';
const $=id=>document.getElementById(id),instances=new Map(),surfacePointers=new Set();
const pinIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 3 6 6-4 1-3 4v4l-2 2-4-4-5 5 5-5-4-4 2-2h4l4-3Z"/></svg>';
const closeIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>';
function actions(pin,close){return '<div class="bubble-actions">'+(pin?'<button type="button" id="'+pin+'" data-bubble-pin aria-pressed="false" aria-label="釘選氣泡">'+pinIcon+'</button>':'')+'<button type="button" id="'+close+'" data-bubble-close aria-label="關閉氣泡">'+closeIcon+'</button></div>'}
const markup='<div id="scaleLegend" class="ui-bubble bubble-scale" role="group" aria-label="比例尺" tabindex="0">'+actions('pinScaleLegend','closeScaleLegend')+'<div class="bubble-content"><span id="scaleText"></span><div id="scaleBar"></div><div class="bubble-meta"><span id="pixelScaleText"></span><span id="orientationText"></span></div></div></div><div id="axisCompass" class="ui-bubble bubble-compass" role="group" aria-label="座標方向指示器" tabindex="0">'+actions('pinCompass','closeCompass')+'<div class="bubble-content"><svg viewBox="0 0 124 124" aria-hidden="true"><g id="axisCompassGeometry"></g></svg></div></div>';
class Bubble{
 constructor(element,{viewport,placement='top-left',visible=()=>true,autoHide=()=>false,duration=()=>1500,opacity=()=>.73,onClose=()=>{},actions=true,maxWidth=Infinity,hideActionsOnPin=false,wakeOnOutsidePointer=false,margin=0}={}){
  this.element=element;this.options={viewport,placement,visible,autoHide,duration,opacity,onClose,actions,maxWidth,hideActionsOnPin,wakeOnOutsidePointer,margin};this.pinned=false;this.desired=null;this.drag=null;this.hideTimer=null;this.actionTimer=null;this.visible=false;this.suppressClick=false;
  element.classList.add('ui-bubble');if(!element.getAttribute('tabindex'))element.setAttribute('tabindex','0');
  const pin=element.querySelector('[data-bubble-pin]'),close=element.querySelector('[data-bubble-close]');
  pin?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();this.pinned=!this.pinned;if(this.pinned&&this.options.hideActionsOnPin){clearTimeout(this.actionTimer);element.classList.remove('bubble-actions-open')}this.refresh(true)});
  close?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();this.pinned=false;this.options.onClose();this.refresh(false);element.dispatchEvent(new Event('bubbleclose'))});
  element.addEventListener('pointerdown',e=>{if(surfacePointers.size||e.isPrimary===false||(e.button!==undefined&&e.button!==0)||e.target.closest('button,input,select,textarea,a,.muxList'))return;const r=element.getBoundingClientRect(),v=viewport.getBoundingClientRect();this.drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:r.left-v.left,top:r.top-v.top,moved:false};element.setPointerCapture(e.pointerId);this.refresh(true);e.stopPropagation()});
  element.addEventListener('pointermove',e=>{if(!this.drag||this.drag.id!==e.pointerId)return;const dx=e.clientX-this.drag.x,dy=e.clientY-this.drag.y;if(Math.hypot(dx,dy)>4)this.drag.moved=true;if(this.drag.moved){this.desired={x:this.drag.left+dx,y:this.drag.top+dy};element.classList.add('bubble-dragging');this.clamp();e.preventDefault()}this.refresh(true);e.stopPropagation()});
  const end=e=>{if(!this.drag||this.drag.id!==e.pointerId)return;const moved=this.drag.moved,tap=e.type==='pointerup'&&!moved;this.drag=null;element.classList.remove('bubble-dragging');if(element.hasPointerCapture(e.pointerId))element.releasePointerCapture(e.pointerId);if(moved){this.suppressClick=true;setTimeout(()=>this.suppressClick=false,0)}if(tap)this.revealActions();this.refresh(true);e.stopPropagation()};
  for(const type of ['pointerup','pointercancel','lostpointercapture'])element.addEventListener(type,end);
  element.addEventListener('click',e=>{if(this.suppressClick){e.preventDefault();e.stopImmediatePropagation();this.suppressClick=false}else if(!e.target.closest('button'))this.revealActions()},true);
  element.addEventListener('focusin',()=>this.revealActions());
  for(const type of ['wheel','dblclick'])element.addEventListener(type,e=>e.stopPropagation());
  document.addEventListener('pointerdown',e=>{if(!element.contains(e.target)){element.classList.remove('bubble-actions-open');if(this.options.wakeOnOutsidePointer)this.refresh(true)}});
  new ResizeObserver(()=>this.clamp()).observe(element);new ResizeObserver(()=>this.clamp()).observe(viewport);window.addEventListener('resize',()=>this.clamp());window.addEventListener('pinview-overlay-layout',()=>this.clamp());this.refresh(true);
 }
 clamp(){const e=this.element,v=this.options.viewport.getBoundingClientRect(),r=e.getBoundingClientRect(),gap=this.options.margin;if(!v.width||!v.height)return;e.style.maxWidth=Math.max(0,Math.min(this.options.maxWidth,v.width-Math.max(8,gap*2)))+'px';e.style.maxHeight=Math.max(0,v.height-gap*2)+'px';let desired=this.desired;if(!desired){const bottom=this.options.placement.startsWith('bottom'),right=this.options.placement.endsWith('right');desired={x:right?v.width-r.width-12:12,y:bottom?v.height-r.height-8:12}}const x=Math.max(gap,Math.min(desired.x,Math.max(gap,v.width-r.width-gap))),y=Math.max(gap,Math.min(desired.y,Math.max(gap,v.height-r.height-gap)));e.style.left=x+'px';e.style.top=y+'px';e.style.right='auto';e.style.bottom='auto'}
 revealActions(){if(!this.options.actions)return;clearTimeout(this.actionTimer);this.element.classList.add('bubble-actions-open');this.refresh(true);this.actionTimer=setTimeout(()=>{if(!this.drag){this.element.classList.remove('bubble-actions-open');this.refresh(true)}},1800)}
 refresh(active=false){const e=this.element,visible=!!this.options.visible(),appeared=visible&&!this.visible;this.visible=visible;e.hidden=!visible;e.style.setProperty('--bubble-opacity',String(Math.max(0,Math.min(1,this.options.opacity()))));const pin=e.querySelector('[data-bubble-pin]');if(pin){pin.setAttribute('aria-pressed',String(this.pinned));pin.title=this.pinned?'取消釘選':'釘選氣泡'}if(!visible){clearTimeout(this.hideTimer);e.style.opacity='0';return}if(active||appeared||this.pinned||!this.options.autoHide()){clearTimeout(this.hideTimer);e.style.opacity='1';e.classList.remove('bubble-faded');if(this.options.autoHide()&&!this.pinned&&!this.drag&&!e.classList.contains('bubble-actions-open'))this.hideTimer=setTimeout(()=>{if(!this.drag&&!this.pinned){e.style.opacity='0';e.classList.add('bubble-faded')}},Math.max(0,this.options.duration()))}this.clamp()}
}
let viewport=null,lastCamera=null;
function mount(){const host=document.querySelector('[data-ui-bubbles]');if(!host)return;viewport=host.parentNode;host.outerHTML=markup;viewport.addEventListener('pointerdown',e=>{if(!e.target.closest('.ui-bubble'))surfacePointers.add(e.pointerId)},true);for(const type of ['pointerup','pointercancel','lostpointercapture'])document.addEventListener(type,e=>surfacePointers.delete(e.pointerId),true);window.addEventListener('blur',()=>surfacePointers.clear());
 const controlled=(id,show,hide,placement,opacity,localClose=false)=>{let closed=false;const bubble=new Bubble($(id),{viewport,placement,visible:()=>$(show).checked&&!closed,autoHide:()=>$(hide).checked,duration:()=>ChipUI.duration(hide),opacity:opacity||(()=>0),hideActionsOnPin:true,wakeOnOutsidePointer:id==='axisCompass',onClose:()=>{if(localClose)closed=true;else{$(show).checked=false;$(show).dispatchEvent(new Event('input',{bubbles:true}));ChipUI.sync()}}});for(const type of ['input','change'])$(show).addEventListener(type,()=>{if($(show).checked)closed=false;bubble.refresh(true)});for(const type of ['input','change'])$(hide).addEventListener(type,()=>bubble.refresh(true));return bubble};
 instances.set('scaleLegend',controlled('scaleLegend','showScale','autoHideScale','bottom-right',()=>Number($('scaleOpacity').value)/100));instances.set('axisCompass',controlled('axisCompass','showCompass','autoHideCompass','top-left',()=>0,true));
 const info=$('info');if(info){info.classList.add('bubble-info');$('infoContent').classList.add('bubble-content');info.insertAdjacentHTML('afterbegin',actions(null,'closeInfoBubble'));const close=$('closeInfo');if(close)close.remove();instances.set('info',new Bubble(info,{viewport,placement:'bottom-left',margin:8,maxWidth:360,visible:()=>info.classList.contains('show'),onClose:()=>info.classList.remove('show')}))}
 $('scaleOpacity').addEventListener('input',()=>instances.get('scaleLegend').refresh(false));

}
function refresh(active=false){for(const bubble of instances.values())bubble.refresh(active)}
function update(camera,{active=false}={}){lastCamera=camera;const unit=$('unitSelect').value,unitMM=ChipViewport.units[unit]||1,n=ChipUI.measurements.precision(unit),width=viewport.getBoundingClientRect().width,maxMM=Math.max(.02,Math.min(140,Math.min(width*.31,180)/camera.scale)),maxUnits=maxMM/unitMM,power=Math.pow(10,Math.floor(Math.log10(maxUnits)));let nice=power;for(const factor of [1,2,5,10])if(factor*power<=maxUnits)nice=factor*power;$('scaleText').textContent=nice.toFixed(n)+' '+unit;$('scaleBar').style.width=nice*unitMM*camera.scale+'px';$('pixelScaleText').textContent=(1/camera.scale/unitMM).toFixed(n)+' '+unit+'/px';$('orientationText').textContent='旋轉 '+ChipUI.angle.format(camera.angle*180/Math.PI,$('angleMode').value,$('anglePrecision').value)+(camera.mirror?'（翻轉）':'');renderCompass(camera,$('coordinateMode').value);refresh(false);if(active)instances.get('scaleLegend').refresh(true)}
function renderCompass(camera,coordinate){
 const polar=coordinate==='polar';
 const mirror=camera.mirror?-1:1;
 const c=Math.cos(camera.angle),sn=Math.sin(camera.angle);
 const vector=(x,y)=>{const a=x*mirror,b=-y;return [a*c-b*sn,a*sn+b*c]};
 const norm=v=>{const d=Math.hypot(...v)||1;return [v[0]/d,v[1]/d]};
 const xaxis=norm(vector(1,0)),yaxis=norm(vector(0,1));
 const g=document.getElementById('axisCompassGeometry');
 const NS='http://www.w3.org/2000/svg';
 g.replaceChildren();
 const add=(tag,attrs)=>{const e=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));g.appendChild(e);return e};
 const O=[62,62],L=31;
 const arrow=(point,tangent,color,size=7)=>{
  const back=[point[0]-tangent[0]*size,point[1]-tangent[1]*size];
  const perp=[-tangent[1]*size*.43,tangent[0]*size*.43];
  add('polygon',{points:`${point.join(',')} ${back[0]+perp[0]},${back[1]+perp[1]} ${back[0]-perp[0]},${back[1]-perp[1]}`,fill:color});
 };
 const line=(v,color,label,withArrow=true)=>{
  const end=[O[0]+v[0]*L,O[1]+v[1]*L];
  add('line',{x1:O[0],y1:O[1],x2:end[0]-(withArrow?v[0]*7:0),y2:end[1]-(withArrow?v[1]*7:0),stroke:color,'stroke-width':3,'stroke-linecap':'round'});
  if(withArrow)arrow(end,v,color);
  if(label)add('text',{x:end[0]+v[0]*11,y:end[1]+v[1]*11+4}).textContent=label;
 };
 // Positive polar angles increase counterclockwise in drawing-plane coordinates.
 // Mirroring reverses that direction on screen.
 const positive=mirror===1?-1:1;
 const angleOf=v=>Math.atan2(v[1],v[0]);
 const curvedArrow=(startAngle,endAngle,r,color)=>{
  const n=Math.max(8,Math.ceil(Math.abs(endAngle-startAngle)/.045));
  let d='';for(let i=0;i<=n;i++){
   const t=startAngle+(endAngle-startAngle)*i/n;
   d+=(i?' L ':'M ')+(O[0]+r*Math.cos(t)).toFixed(3)+' '+(O[1]+r*Math.sin(t)).toFixed(3);
  }
  // Stop the arc at the base of the arrowhead, not its tip.
  const shortened=endAngle-positive*7/r;
  const pathSteps=Math.max(8,Math.ceil(Math.abs(shortened-startAngle)/.045));
  d='';for(let i=0;i<=pathSteps;i++){const t=startAngle+(shortened-startAngle)*i/pathSteps;d+=(i?' L ':'M ')+(O[0]+r*Math.cos(t)).toFixed(3)+' '+(O[1]+r*Math.sin(t)).toFixed(3)}
  add('path',{d,fill:'none',stroke:color,'stroke-width':2.3,'stroke-linecap':'round'});
  const e=[O[0]+r*Math.cos(endAngle),O[1]+r*Math.sin(endAngle)];
  const t=positive===1?[-Math.sin(endAngle),Math.cos(endAngle)]:[Math.sin(endAngle),-Math.cos(endAngle)];
  arrow(e,t,color,7);
  return e;
 };
 if(!polar){line(xaxis,'#ff5969','x');line(yaxis,ChipViewport.colors.rho,'y')}
 else{
  // ρ is the drawing plane's rotated X direction; θ is an angular annotation,
  // never a perpendicular linear coordinate axis.
  line(xaxis,ChipViewport.colors.rho,'ρ');
  const rotated=Math.abs(Math.atan2(Math.sin(camera.angle),Math.cos(camera.angle)))>0.001;
  if(rotated){
   const reference=[mirror,0]; // unrotated X direction, not an independent θ axis
   const delta=Math.atan2(reference[0]*xaxis[1]-reference[1]*xaxis[0],reference[0]*xaxis[0]+reference[1]*xaxis[1]);
   // Display θ reference as a thin ray, with no arrowhead.
   line(reference,ChipViewport.colors.theta,'',false);
   if(Math.abs(delta)>.025){
    let sweep=delta;
    if(positive===1&&sweep<0)sweep+=Math.PI*2;
    if(positive===-1&&sweep>0)sweep-=Math.PI*2;
    // Large rotations remain within the compass bounds.
    curvedArrow(angleOf(reference),angleOf(reference)+sweep,18,ChipViewport.colors.theta);
   }
   add('text',{x:O[0]+Math.cos(angleOf(reference)+positive*.45)*28,y:O[1]+Math.sin(angleOf(reference)+positive*.45)*28+4}).textContent='θ';
  }else{
   // No θ ray at zero rotation: only a curved direction marker beyond ρ.
   const base=angleOf(xaxis),start=base+positive*.15,end=base+positive*.9;
   curvedArrow(start,end,47,ChipViewport.colors.theta);
   add('text',{x:O[0]+Math.cos(end)*58,y:O[1]+Math.sin(end)*58+4}).textContent='θ';
  }
 }
 add('circle',{cx:O[0],cy:O[1],r:3.2,fill:'#e8f1ff'});
 document.getElementById('axisCompass').setAttribute('aria-label',polar?'極座標方向：ρ 徑向，θ 為極角及其遞增方向':'正交座標方向：X 軸與 Y 軸');
}

let transientNotice=null,transientTimer=null,transientRemoval=null;
function transient({x,y,text,duration=1000}){clearTimeout(transientTimer);clearTimeout(transientRemoval);transientNotice?.remove();const node=document.createElement('div');node.className='ui-transient-bubble';node.setAttribute('role','status');node.setAttribute('aria-live','polite');node.textContent=text;document.body.append(node);transientNotice=node;const r=node.getBoundingClientRect();node.style.left=Math.max(8,Math.min(innerWidth-r.width-8,x+12))+'px';node.style.top=Math.max(8,Math.min(innerHeight-r.height-8,y+12))+'px';transientTimer=setTimeout(()=>{node.style.opacity='0';transientRemoval=setTimeout(()=>{node.remove();if(transientNotice===node)transientNotice=null},240)},duration);return node}

let selectionNoticeNode=null,selectionNoticeBubble=null,noticeVisible=false,noticeHover=false,noticeDuration=1000,noticeDisable=null;
function selectionNotice({x,y,total,added,removed,details=[],duration=1000,onDisable}){const host=viewport||document.body;if(!selectionNoticeNode){const node=document.createElement('div');node.className='ui-selection-notice';node.setAttribute('role','status');node.setAttribute('aria-live','polite');node.innerHTML=actions('pinSelectionNotice','closeSelectionNotice')+'<div class="selection-notice-content"></div>';host.append(node);node.querySelector('[data-bubble-close]').setAttribute('aria-label','關閉選取提示自動顯示');selectionNoticeNode=node;selectionNoticeBubble=new Bubble(node,{viewport:host,maxWidth:340,margin:8,visible:()=>noticeVisible,autoHide:()=>!noticeHover,duration:()=>noticeDuration,opacity:()=>1,hideActionsOnPin:true,onClose:()=>{noticeVisible=false;noticeDisable?.()}});node.addEventListener('pointerenter',()=>{noticeHover=true;selectionNoticeBubble.refresh(true)});node.addEventListener('pointerleave',()=>{noticeHover=false;selectionNoticeBubble.refresh(true)});node.addEventListener('click',e=>{if(e.target.closest('button'))return;const detail=node.querySelector('.selection-notice-detail');detail.hidden=!detail.hidden;node.classList.toggle('notice-details-open',!detail.hidden);selectionNoticeBubble.refresh(true)});node.addEventListener('wheel',()=>selectionNoticeBubble.refresh(true))}const node=selectionNoticeNode,content=node.querySelector('.selection-notice-content');content.replaceChildren();noticeVisible=true;noticeDuration=duration;noticeDisable=onDisable;noticeHover=false;const summary=document.createElement('div');if(total){summary.textContent='選中'+total+'個物件';if(added){const gain=document.createElement('span');gain.className='selection-gain';gain.textContent=' +'+added+'個新增';summary.append(gain)}}else summary.textContent='選空';if(removed){const row=document.createElement('div');row.textContent='消選'+removed+'個物件';summary.append(row)}content.append(summary);const detail=document.createElement('div');detail.className='selection-notice-detail';detail.hidden=true;for(const text of details){const row=document.createElement('div');row.textContent=text;detail.append(row)}content.append(detail);node.classList.remove('notice-details-open');if(!selectionNoticeBubble.pinned){node.classList.remove('bubble-actions-open');const rect=host.getBoundingClientRect();selectionNoticeBubble.desired={x:x-rect.left+12,y:y-rect.top+12}}selectionNoticeBubble.refresh(true);return node}

root.ChipBubbles={selectionNotice,transient,Bubble,mount,update,refresh,show:id=>instances.get(id)?.refresh(true),get:id=>instances.get(id)};
})(globalThis);
