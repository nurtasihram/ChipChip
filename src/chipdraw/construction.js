(function(root){
'use strict';
const rectLabels={'top-left':'左上角與寬高','top-right':'右上角與寬高','bottom-left':'左下角與寬高','bottom-right':'右下角與寬高',center:'中心與寬高',top:'上邊中心與寬高',bottom:'下邊中心與寬高',left:'左邊中心與寬高',right:'右邊中心與寬高','top-left-bottom-right':'左上與右下對角點','top-right-bottom-left':'右上與左下對角點'};
function rectIcon(id){const factor=ChipDrawingModel.rectAnchors[id],point=(x,y)=>'<circle cx="'+x+'" cy="'+y+'" r="2.4" fill="#ffd166" stroke="#172438" stroke-width=".8"/>';return '<svg class="tool-icon" viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="5" y="8" width="22" height="16"/>'+(id.includes('-bottom-')?'<path d="'+(id==='top-left-bottom-right'?'M5 8 27 24':'M27 8 5 24')+'" stroke-dasharray="2 2"/>'+point(id==='top-left-bottom-right'?27:5,24):'')+point(5+22*factor[0],8-16*factor[1])+'</svg>'}
ChipUI.registerObjectMethods('rect',Object.keys(rectLabels).map(id=>({id,label:rectLabels[id],help:rectLabels[id]+'：'+(id.includes('-bottom-')?'點選兩個對角點。':'選參考點 → 移動調整 → 點擊完成。'),icon:rectIcon(id),helpVisual:()=>helpAnimation('rect',id)})));
const arcMethods=[['center-start-end','圓心與兩點'],['center-start-sweep','圓心、起點與掃角'],['three-points','三點圓弧'],['endpoints-radius','兩端點與半徑'],['endpoints-sagitta','兩端點與弓高'],['start-tangent-end','起點、切向與終點'],['two-tangents','雙切點與兩個切線角'],['center-radius-start-sweep','圓心、半徑、起始角與掃角']];
function arcIcon(id){const dots=points=>points.map(([x,y])=>'<circle cx="'+x+'" cy="'+y+'" r="2" fill="#172438" stroke="currentColor"/>').join('');const center=id.startsWith('center'),path=center?'M5 24A19 19 0 0 1 24 5':id.includes('tangent')?'M6 26Q6 6 26 6':'M4 24A12 14 0 0 1 28 24';let guides=center?'<path d="M5 24H24V5" stroke-dasharray="2 2"/>':'<path d="M4 24H28" stroke-dasharray="2 2"/>';if(id==='center-start-sweep'||id==='center-radius-start-sweep')guides+='<path d="M15 24A9 9 0 0 1 24 15" stroke="#e7a45d"/>';if(id==='endpoints-radius')guides+='<path d="M16 29V10M4 24 16 29 28 24" stroke="#e7a45d"/>';if(id==='endpoints-sagitta')guides+='<path d="M16 24V10" stroke="#e7a45d"/>';if(id.includes('tangent'))guides='<path d="M6 28V3'+(id==='two-tangents'?'M24 6H30':'')+'" stroke="#e7a45d"/>';return '<svg class="tool-icon" viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.4">'+guides+'<path d="'+path+'" stroke="#69b8ff" stroke-width="2.3"/>'+dots(center?[[24,24],[5,24],[24,5]]:id==='three-points'?[[4,24],[16,10],[28,24]]:id.includes('tangent')?[[6,26],[26,6]]:[[4,24],[28,24]])+'</svg>'}
ChipUI.registerObjectMethods('arc',arcMethods.map(([id,label])=>({id,label,help:({'center-start-end':'圓心 → 起點 → 終點。','center-start-sweep':'圓心 → 起點 → 移動掃角 → 點擊完成。','three-points':'起點 → 弧上點 → 終點。','endpoints-radius':'兩端點 → 移動調整半徑 → 點擊完成。','endpoints-sagitta':'兩端點 → 移動調整弓高 → 點擊完成。','start-tangent-end':'起點 → 切向 → 終點。','two-tangents':'兩切點 → 移動調整切向 → 點擊完成。','center-radius-start-sweep':'圓心 → 半徑與起始方向 → 掃角 → 點擊完成。'}[id]),icon:arcIcon(id),helpVisual:()=>helpAnimation('arc',id)})));
const steps={
 'center-start-end':['放置圓心','放置起點','移動終點方向並點擊完成'],
 'center-start-sweep':['放置圓心','放置起點','繞圓心移動決定掃角並點擊完成'],
 'three-points':['放置起點','放置途經點','移動終點並點擊完成'],
 'endpoints-radius':['放置起點','放置終點','移動弧上點決定半徑與大小弧並點擊完成'],
 'endpoints-sagitta':['放置起點','放置終點','移動指標決定弓高並點擊完成'],
 'start-tangent-end':['放置起點','放置切向方向點','移動終點並點擊完成'],
 'two-tangents':['放置第一切點','放置第二切點','移動第一點切向，連動第二點切向並點擊完成'],
 'center-radius-start-sweep':['放置圓心','移動放置半徑與起始角','繞圓心移動決定掃角並點擊完成']
};
function arcDefinition(method,points,cursor,state={}){
 const p=points.map(p=>[p.x,-p.y]),q=cursor&&[cursor.x,-cursor.y];if(p.length<2||!q)return null;
 const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
 if(method.startsWith('center')){
  const [center,start]=p,radius=distance(start,center),theta=ChipDrawingModel.arcAngle(q,center),initial=ChipDrawingModel.arcAngle(start,center);
  if(!distance(q,center))return null;
  const previous=state.lastAngle??initial,delta=(theta-previous+540)%360-180;state.sweep=Math.max(-360,Math.min(360,(state.sweep||0)+delta));state.lastAngle=theta;const sweep=state.sweep;if(!sweep)return null;
  if(method==='center-start-end')return {type:'arc',reference:method,points:[center,start,[center[0]+radius*(q[0]-center[0])/distance(q,center),center[1]+radius*(q[1]-center[1])/distance(q,center)]],direction:sweep<0?'cw':'ccw'};
  if(method==='center-start-sweep')return {type:'arc',reference:method,points:[center,start],sweep};
  return {type:'arc',reference:method,point:center,radius,angle:initial,sweep};
 }
 if(method==='three-points')return {type:'arc',reference:method,points:[p[0],p[1],q]};
 if(method==='start-tangent-end')return {type:'arc',reference:method,points:[p[0],q],angle:ChipDrawingModel.arcAngle(p[1],p[0])};
 if(method==='endpoints-sagitta'){const [a,b]=p,d=distance(a,b);return {type:'arc',reference:method,points:p.slice(0,2),sagitta:((q[0]-(a[0]+b[0])/2)*(-(b[1]-a[1]))+(q[1]-(a[1]+b[1])/2)*(b[0]-a[0]))/d}}
 if(method==='endpoints-radius'){
  const points=p.slice(0,2),g=ChipDrawingModel.solveArc({type:'arc',reference:'three-points',points:[p[0],q,p[1]]}),d=[p[1][0]-p[0][0],p[1][1]-p[0][1]],side=d[0]*(g.point[1]-p[0][1])-d[1]*(g.point[0]-p[0][0]);
  return {type:'arc',reference:method,points,radius:g.radius,side:side===0?(g.sweep<0?-1:1):side<0?-1:1,large:Math.abs(g.sweep)>180};
 }
 if(method==='two-tangents'){
  if(!distance(q,p[0]))return null;const angle=ChipDrawingModel.arcAngle(q,p[0]),g=ChipDrawingModel.solveArc({type:'arc',reference:'start-tangent-end',points:p.slice(0,2),angle}),direction=g.sweep<0?'cw':'ccw';
  return {type:'arc',reference:method,points:p.slice(0,2),angles:[angle,g.start+g.sweep+(direction==='cw'?-90:90)],direction};
 }
 return null;
}
// The live canvas and instructional SVG use the same construction guides.
function arcGuides(method,points,cursor,g){
 if(!points.length)return [];if(points.length===1)return [[points[0],cursor]];
 const [a,b]=points,result=[[a,b]];if(method==='two-tangents')result.push([a,cursor]);if(method==='endpoints-sagitta')result.push([{x:(a.x+b.x)/2,y:(a.y+b.y)/2},cursor]);
 if(g){const center={x:g.point[0],y:-g.point[1]},endpoint=angle=>({x:center.x+g.radius*Math.cos(angle*Math.PI/180),y:center.y-g.radius*Math.sin(angle*Math.PI/180)});result.push([center,endpoint(g.start)],[center,endpoint(g.start+g.sweep)]);if(method==='two-tangents'){const theta=(g.start+g.sweep+(g.sweep<0?-90:90))*Math.PI/180;result.push([b,{x:b.x+Math.cos(theta)*g.radius/2,y:b.y-Math.sin(theta)*g.radius/2}])}}
 return result;
}
let helpSequence=0;
function helpAnimation(type,id){
 const scene=ChipUI.interactionHelp({id,label:(type==='rect'?rectLabels[id]:arcMethods.find(([key])=>key===id)[1])+'：畫布動態繪製示範'}),{svg,node,set,lerp}=scene;svg.dataset.constructionAnimation=id;
 const centered=id.startsWith('center'),a=type==='rect'?{x:100,y:70}:centered?{x:145,y:85}:{x:50,y:115},b=type==='rect'?{x:ChipDrawingModel.rectAnchors[id][0]===1?35:165,y:ChipDrawingModel.rectAnchors[id][1]===-1?25:115}:centered?{x:85,y:85}:id==='three-points'?{x:130,y:40}:id==='start-tangent-end'?{x:50,y:45}:{x:210,y:115};
 const clipId='drawing-help-clip-'+(++helpSequence),defs=node('defs',{}),clip=node('clipPath',{id:clipId},defs);node('rect',{x:6,y:6,width:248,height:140},clip);
 const guides=Array.from({length:5},()=>node('path',{fill:'none',stroke:'#e7a45d','stroke-width':1.2,'stroke-dasharray':'4 3',visibility:'hidden','data-demo-guide':''})),shape=node(type==='rect'?'rect':'path',{fill:'none',stroke:'#69b8ff','stroke-width':type==='rect'?2.4:3,'stroke-linecap':'round',visibility:'hidden','data-demo-shape':''}),centerDot=node('circle',{r:2,fill:'#e7a45d',visibility:'hidden'}),quantity=node('text',{fill:'#e7a45d','font-size':11,visibility:'hidden'}),markers=[0,1,2].map(index=>{const dot=node('circle',{r:3.5,fill:'#ffd166',stroke:'#172438','stroke-width':1,'data-demo-point':index+1}),text=node('text',{fill:'#e7edf7','font-size':11});text.textContent=index+1;return {dot,text}}),clickRing=node('circle',{fill:'none',stroke:'#ffd166','stroke-width':1.5,visibility:'hidden','data-demo-click':''}),pointer=node('path',{d:'M 0 0 v15 l4 -4 4 7 4 -2 -4 -7 6 -1 Z',fill:'#e7edf7',stroke:'#172438','stroke-width':1,'data-demo-pointer':''}),caption=node('text',{x:12,y:165,fill:'#e7edf7','font-size':11});
 function render(progress){
  const phase=progress<.16?0:type==='rect'||progress<.35?1:2,t=Math.min(1,Math.max(0,(progress-.35)/.47)),complete=progress>=(type==='rect'?.68:.82);svg.dataset.demoStage=complete?'complete':String(phase+1);let cursor=phase===0?a:lerp(a,b,Math.min(1,(progress-.16)/.14)),data=null,geometry=null;
  if(type==='rect'){cursor=lerp(a,b,Math.min(1,Math.max(0,(progress-.16)/.52)));if(phase>0)try{data=ChipDrawingModel.rectangleFromPoints(id,[a.x,-a.y],[cursor.x,-cursor.y])}catch{}}
  else if(phase===2){if(centered){const theta=Math.PI-Math.PI*1.45*t;cursor={x:a.x+60*Math.cos(theta),y:a.y-60*Math.sin(theta)}}else if(id==='start-tangent-end'||id==='three-points')cursor=lerp(b,{x:210,y:115},t);else if(id==='two-tangents')cursor=lerp(b,{x:50,y:50},t);else if(id==='endpoints-sagitta')cursor=t<.2?lerp(b,{x:130,y:115},t/.2):{x:130,y:115-80*(t-.2)/.8};else cursor=lerp(b,{x:130,y:35},t);try{data=arcDefinition(id,[a,b],cursor,centered?{lastAngle:180-261*t,sweep:-261*t}:{})}catch{}}
  let count=0;const guide=(a,b)=>{if(count<guides.length)set(guides[count++],{d:'M '+a.x+' '+a.y+' L '+b.x+' '+b.y,visibility:'visible'})};
  set(shape,{visibility:'hidden'});set(centerDot,{visibility:'hidden'});set(quantity,{visibility:'hidden'});
  if(type==='rect'&&phase>0)guide(a,cursor);else if(type==='arc'&&phase===1)for(const [from,to]of arcGuides(id,progress>=.30?[a,b]:[a],cursor))guide(from,to);
  if(data)try{const g=ChipDrawingModel.solve(data);geometry=g;if(type==='arc'){set(shape,{d:ChipDrawingModel.arcPath(g),visibility:'visible'});const center={x:g.point[0],y:-g.point[1]};if(centered||id==='endpoints-radius'){set(centerDot,{cx:center.x,cy:center.y,visibility:'visible'});set(quantity,{x:(center.x+(centered?b:a).x)/2+5,y:(center.y+(centered?b:a).y)/2,visibility:'visible'});quantity.textContent='R'}if(id==='endpoints-sagitta'){set(quantity,{x:cursor.x+7,y:(cursor.y+a.y)/2,visibility:'visible'});quantity.textContent='h'}}else set(shape,{x:g.point[0],y:-g.point[1],width:g.width,height:g.height,visibility:'visible'})}catch{}
  if(type==='arc'&&phase===2)for(const [from,to]of arcGuides(id,[a,b],cursor,geometry))guide(from,to);
  for(let i=count;i<guides.length;i++)set(guides[i],{visibility:'hidden'});
  for(const [index,{dot,text}]of markers.entries()){const p=index===0?a:index===2||type==='rect'||phase===1?cursor:b,visibility=index===2?(type==='arc'&&phase===2?'visible':'hidden'):index===1&&phase===0?'hidden':'visible';const confirmed=index===0?progress>=.10:index===1?(type==='rect'?complete:progress>=.30):complete;set(dot,{cx:p.x,cy:p.y,visibility,fill:confirmed?'#ffd166':'#172438',stroke:'#ffd166','data-demo-confirmed':String(confirmed)});set(text,{x:p.x+7,y:p.y-8,visibility})}
  const click=progress>=.10&&progress<.16?{at:a,t:(progress-.10)/.06}:type==='arc'&&progress>=.30&&progress<.35?{at:b,t:(progress-.30)/.05}:complete&&progress<(type==='rect'?.76:.90)?{at:cursor,t:(progress-(type==='rect'?.68:.82))/.08}:null;if(click)set(clickRing,{cx:click.at.x,cy:click.at.y,r:4+8*click.t,opacity:1-click.t,visibility:'visible'});else set(clickRing,{visibility:'hidden'});
  for(const element of [...guides,centerDot,quantity])if(!element.hasAttribute('clip-path'))element.setAttribute('clip-path','url(#'+clipId+')');
  set(pointer,{transform:'translate('+cursor.x+' '+cursor.y+')'});
  const message=complete?'✓ 點擊完成':type==='rect'?(phase===0?'① 點擊固定參考點':'② 移動決定寬高，點擊完成'):(phase===2?({'two-tangents':'③ 調整切向，另一切點連動','endpoints-radius':'③ 移動弧上點，決定半徑','endpoints-sagitta':'③ 移動決定弓高','center-start-sweep':'③ 繞圓心移動決定掃角','center-radius-start-sweep':'③ 繞圓心移動決定掃角'}[id]||'③ 移動終點，點擊完成'):steps[id][phase]);if(caption.textContent!==message)caption.textContent=message;
 }
 return scene.bind(render);
}
function primitive(type,a,b){
 if(type==='point')return {tag:'line',attributes:{x1:b.x,y1:b.y,x2:b.x,y2:b.y}};
 if(type==='line')return {tag:'line',attributes:{x1:a.x,y1:a.y,x2:b.x,y2:b.y}};
 if(type==='circle')return {tag:'circle',attributes:{cx:a.x,cy:a.y,r:Math.hypot(b.x-a.x,b.y-a.y)}};
 if(type==='ellipse')return {tag:'ellipse',attributes:{cx:a.x,cy:a.y,rx:Math.abs(b.x-a.x),ry:Math.abs(b.y-a.y)}};
 return {tag:'rect',attributes:{x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),width:Math.abs(b.x-a.x),height:Math.abs(b.y-a.y)}};
}
const interaction=(type,gesture)=>ChipUI.objectTypes.find(item=>item.id===(type==='poly'?'polyline':type))?.interactions.find(item=>item.gesture===gesture);
function bezierControl(anchor,incoming=false){const sign=incoming&&anchor.symmetric?-1:1;return {x:anchor.point.x+sign*anchor.offset.x,y:anchor.point.y+sign*anchor.offset.y}}
function bezierPath(anchors){if(!anchors.length)return '';let d='M '+anchors[0].point.x+' '+anchors[0].point.y;for(let i=1;i<anchors.length;i++){const a=bezierControl(anchors[i-1]),b=bezierControl(anchors[i],true);d+=' C '+a.x+' '+a.y+' '+b.x+' '+b.y+' '+anchors[i].point.x+' '+anchors[i].point.y}return d}
function beginBezier(draft,p,{sameAnchor=false}={}){draft??={anchors:[],cursor:null,awaitingControl:false,placementMode:null,referenceMode:'relative'};draft.cursor=null;const last=draft.anchors.at(-1),placingControl=draft.awaitingControl||sameAnchor,automatic=!placingControl&&draft.placementMode==='drag',wasAwaiting=draft.awaitingControl;if(!placingControl)draft.anchors.push({point:{...p},offset:automatic?{...last.offset}:{x:0,y:0},symmetric:automatic});const index=draft.anchors.length-1;if(placingControl&&!sameAnchor){const a=draft.anchors[index];a.offset={x:p.x-a.point.x,y:p.y-a.point.y}}return {draft,handle:{kind:'bezier-handle',index,placingControl,sameAnchor,automatic,wasAwaiting,moved:false}}}
function moveBezier(draft,handle,p,moved){handle.moved||=moved;if(handle.moved||handle.placingControl&&!handle.sameAnchor){const a=draft.anchors[handle.index];a.offset={x:p.x-a.point.x,y:p.y-a.point.y};if(handle.moved&&(!handle.placingControl||handle.sameAnchor)){a.symmetric=true;if(draft.placementMode===null){const mode=interaction('bezier','drag');draft.placementMode=mode?.gesture||'drag';draft.referenceMode=mode?.referenceMode||'absolute'}}}}
function endBezier(draft,handle){if(draft.placementMode===null){const mode=interaction('bezier',handle.moved?'drag':'click');draft.placementMode=mode?.gesture||(handle.moved?'drag':'click');draft.referenceMode=mode?.referenceMode||(handle.moved?'absolute':'relative')}draft.awaitingControl=handle.sameAnchor&&!handle.moved?false:draft.placementMode==='drag'?false:!handle.placingControl&&!handle.moved;draft.cursor=null}
function bezierDisplay(draft){const display=[...draft.anchors];if(draft.cursor){if(draft.awaitingControl&&display.length){const a=display.at(-1);display[display.length-1]={...a,offset:{x:draft.cursor.x-a.point.x,y:draft.cursor.y-a.point.y}}}else display.push({point:draft.cursor,offset:draft.placementMode==='drag'&&display.length?{...display.at(-1).offset}:{x:0,y:0},symmetric:draft.placementMode==='drag'})}return {display,markers:draft.awaitingControl?display:draft.anchors}}
function mount({changed=()=>{},rotation=()=>0,mirror=()=>false}){
 const windows=new Map(),selected=new Map(),orders=new Map(),storageKey='chipdraw.method-order.v1';let stored={};try{const value=JSON.parse(localStorage.getItem(storageKey)||'{}');if(value&&typeof value==='object'&&!Array.isArray(value))stored=value}catch{}
 function methodsFor(type){const methods=ChipUI.toolMethods(type),saved=Array.isArray(stored[type])?stored[type]:[],ids=[...new Set([...saved,...methods.map(m=>m.id)])];return ids.map(id=>methods.find(m=>m.id===id)).filter(Boolean)}
 function defaultMethod(type){return orders.get(type)?.[0]||methodsFor(type)[0]?.id}
 function current(type){return selected.get(type)||defaultMethod(type)}
 function activateDefault(type){const id=defaultMethod(type);if(id)selected.set(type,id);windows.get(type)?.options.setSelected(id?[id]:[]);}
 function markDefault(type,entry){const first=defaultMethod(type);for(const id of entry.options.order()){const button=entry.options.button(id),method=methodsFor(type).find(m=>m.id===id);button.dataset.defaultMethod=String(id===first);button.dataset.tooltip=(method.help||method.label)+(id===first?'（預設）':'');}}
 function open(type,anchor){const methods=methodsFor(type);if(!methods.length)return;let entry=windows.get(type);if(!entry){const shell=document.createElement('div'),handle=document.createElement('div'),tray=document.createElement('div');shell.id=type+'ConstructionTools';shell.setAttribute('role','toolbar');shell.setAttribute('aria-label',type==='rect'?'矩形繪製方式':type==='point'?'點繪製方式':type==='line'?'直線繪製方式':type==='trim'?'路徑裁減':'圓弧繪製方式');handle.tabIndex=0;handle.setAttribute('role','button');handle.setAttribute('aria-label','移動繪製方式工具列');shell.append(handle,tray);document.body.append(shell);const controller=ChipUI.floatingPanel(shell,{toolbar:true,handle,items:tray,collapseOnHandle:true,perpendicularTo:anchor.closest('.ui-floating-toolbar')});const options=ChipUI.optionModel(tray,{items:methods.map(method=>({...method,toolType:type})),mode:'single',priority:true,defaultSlot:true,selected:[current(type)],onChange:values=>{if(values.length){selected.set(type,values[0]);changed(type,values[0])}},onOrderChange:order=>{orders.set(type,order);stored[type]=order;try{localStorage.setItem(storageKey,JSON.stringify(stored))}catch{}markDefault(type,entry);controller.clamp();}});entry={shell,controller,options};orders.set(type,options.order());windows.set(type,entry);markDefault(type,entry)}entry.shell.hidden=false;entry.controller.setCollapseAnchor(anchor);entry.options.setSelected([current(type)]);entry.controller.setOrientationParent(anchor.closest('.ui-floating-toolbar'));if(entry.controller.orientationIndependent)entry.controller.clamp();else entry.controller.placeFromButton(anchor)}
 function toolChanged(type){/* Candidate toolbars stay open until their own handle is clicked. */}
 function rectangle(a,b){try{return ChipDrawingModel.rectangleFromPoints(current('rect'),[a.x,-a.y],[b.x,-b.y],{rotation:rotation(),mirror:mirror()})}catch{return null}}
 return {current,defaultMethod,activateDefault,open,toolChanged,rectangle,arc:(points,cursor,state)=>arcDefinition(current('arc'),points,cursor,state),step:count=>steps[current('arc')][Math.min(count,2)]};
}
root.ChipConstruction={mount,arcDefinition,arcGuides,primitive,interaction,bezierControl,bezierPath,beginBezier,moveBezier,endBezier,bezierDisplay,helpFor:(type,current)=>type==='trim'?()=>ChipPointConstruction.trimHelp(current()||'weld'):type==='line'?()=>ChipPointConstruction.lineHelp(current()||'free'):type==='point'?()=>ChipPointConstruction.help(current()||'free'):['rect','arc'].includes(type)?()=>helpAnimation(type,current()||(type==='rect'?'top-left-bottom-right':'center-start-end')):ChipUI.objectTypes.find(item=>item.id===(type==='poly'?'polyline':type))?.interactions.length?()=>ChipToolHelp.animation(type==='poly'?'polyline':type):undefined};
})(globalThis);
