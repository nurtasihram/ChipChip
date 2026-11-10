(function(root){
'use strict';
const C=ChipConstruction;
const definitions={
 point:[{id:'click',gesture:'click',label:'連續點選',help:'點擊放點，可連續點選。',returnToSelect:false},{id:'drag',gesture:'drag',label:'拖曳定位・單次',help:'拖到位置後放開；返回預設工具。',returnToSelect:true}],
 line:[{id:'click',gesture:'click',label:'兩次點擊・連續',help:'起點 → 終點，點擊完成。',returnToSelect:false},{id:'drag',gesture:'drag',label:'拖曳・單次',help:'拖出線段後放開；返回預設工具。',returnToSelect:true}],
 circle:[{id:'click',gesture:'click',label:'圓心／半徑・兩次點擊',help:'點圓心 → 移動決定半徑 → 點擊完成。',returnToSelect:false},{id:'drag',gesture:'drag',label:'圓心／半徑・拖曳',help:'從圓心拖出半徑；放開完成。',returnToSelect:true}],
 ellipse:[{id:'click',gesture:'click',label:'中心／半軸・兩次點擊',help:'點中心 → 移動調整形狀 → 點擊完成。',returnToSelect:false},{id:'drag',gesture:'drag',label:'中心／半軸・拖曳',help:'從中心拖出橢圓；放開完成。',returnToSelect:true}],
 polyline:[{id:'vertices',gesture:'click',label:'逐點追加',help:'逐點放置頂點，雙擊結束。',returnToSelect:false}],
 bezier:[{id:'click-relative',gesture:'click',referenceMode:'relative',label:'首次單擊・相對模式',help:'交替點選錨點與控制點；雙擊結束。',returnToSelect:false},{id:'drag-absolute',gesture:'drag',referenceMode:'absolute',label:'首次拖曳・絕對模式',help:'拖出控制柄，逐點成形；雙擊結束。',returnToSelect:false}]
};
function fixture(type,mode){
 const a=type==='circle'||type==='ellipse'?{x:130,y:85}:{x:55,y:105},b=type==='circle'?{x:185,y:85}:type==='ellipse'?{x:200,y:120}:{x:195,y:70};
 const at=(time,p)=>({time,p}),event=(time,kind,p,key)=>({time,kind,p,key});
 if(type==='polyline'){const p=[{x:45,y:110},{x:125,y:45},{x:210,y:110}];return {path:[at(0,p[0]),at(.16,p[0]),at(.35,p[1]),at(.44,p[1]),at(.65,p[2]),at(1,p[2])],events:[event(.1,'down',p[0]),event(.12,'up',p[0]),event(.38,'down',p[1]),event(.4,'up',p[1]),event(.68,'down',p[2]),event(.7,'up',p[2]),event(.82,'double',p[2])]}}
 if(type==='bezier'){
  const p0={x:55,y:105},h0={x:85,y:65},p1={x:185,y:85},h1={x:215,y:55};
  if(mode.gesture==='click')return {path:[at(0,p0),at(.16,p0),at(.28,h0),at(.36,h0),at(.5,p1),at(.58,p1),at(.7,h1),at(.8,p1),at(1,p1)],events:[event(.1,'down',p0),event(.12,'up',p0),event(.3,'down',h0),event(.32,'up',h0),event(.52,'down',p1),event(.54,'up',p1),event(.72,'down',h1),event(.74,'up',h1),event(.86,'double',p1)]};
  return {path:[at(0,p0),at(.12,p0),at(.28,h0),at(.34,h0),at(.54,p1),at(.58,p1),at(.7,h1),at(.8,p1),at(1,p1)],events:[event(.1,'down',p0),event(.3,'up',h0),event(.56,'down',p1),event(.72,'up',h1),event(.86,'double',p1)]};
 }
 return {path:[at(0,a),at(.16,a),at(.65,b),at(1,b)],events:mode.gesture==='drag'?[event(.1,'down',a),event(.72,'up',b)]:[event(.1,'down',a),event(.12,'up',a),event(.7,'down',b),event(.72,'up',b)]};
}
function position(path,time){for(let i=1;i<path.length;i++)if(time<=path[i].time){const a=path[i-1],b=path[i],t=(time-a.time)/(b.time-a.time);return {x:a.p.x+(b.p.x-a.p.x)*t,y:a.p.y+(b.p.y-a.p.y)*t}}return {...path.at(-1).p}}
// Declarative input samples use the same geometry and Bezier gesture transitions as the canvas.
function sample(type,mode,time){
 const script=fixture(type,mode),s={cursor:{...script.path[0].p},down:false,first:null,confirmed:false,finished:false,outputs:[],points:[],polyCursor:null,draft:null,handle:null,events:script.events.filter(e=>e.time<=time)};
 function move(p){if(p.x===s.cursor.x&&p.y===s.cursor.y)return;s.cursor={...p};if(type==='bezier'&&s.draft){if(s.handle)C.moveBezier(s.draft,s.handle,p,Math.hypot(p.x-s.press.x,p.y-s.press.y)>3);else s.draft.cursor={...p}}else if(type==='polyline'&&s.points.length)s.polyCursor={...p}}
 for(const e of s.events){move(e.p);s.down=e.kind==='down'?true:e.kind==='up'?false:s.down;
  if(type==='bezier'){
   if(e.kind==='down'){const result=C.beginBezier(s.draft,e.p);s.draft=result.draft;s.handle=result.handle;s.press={...e.p}}
   if(e.kind==='up') {C.endBezier(s.draft,s.handle);s.handle=null}
   if(e.kind==='key'||e.kind==='double'){s.finished=true;s.outputs=[C.bezierPath(s.draft.anchors)]}
  }else if(type==='polyline'){
   if(e.kind==='down'){s.points.push({...e.p});s.polyCursor=null}if(e.kind==='key'||e.kind==='double'){s.finished=true;s.outputs=[s.points]}
  }else if(type==='point'){
   if(e.kind==='down')s.first??={...e.p};if(e.kind==='up'){s.outputs.push({...e.p});if(mode.gesture==='drag'||s.outputs.length===2)s.finished=true}
  }else{
   if(e.kind==='down')s.first??={...e.p};if(e.kind==='up'){if(mode.gesture==='drag'||s.confirmed){s.finished=true;s.outputs=[C.primitive(type,s.first,e.p)]}else s.confirmed=true}
  }
 }
 if(!s.finished)move(position(script.path,time));
 return s;
}
function animation(type,only=null){
 const modes=ChipUI.objectTypes.find(item=>item.id===type).interactions.filter(item=>!only||item.id===only),label=ChipUI.objectTypes.find(item=>item.id===type).label,scene=ChipUI.interactionHelp({id:type,label:label+'：繪圖手勢與模式',duration:4600}),{svg,node,set}=scene;svg.dataset.toolAnimation=type;
 const heading=node('text',{x:10,y:18,fill:'#9acbff','font-size':11,'data-demo-mode-label':''}),shape=node(type==='bezier'?'path':type==='polyline'?'polyline':C.primitive(type,{x:0,y:0},{x:0,y:0}).tag,{fill:'none',stroke:'#69b8ff','stroke-width':type==='point'?5:2.6,'stroke-linecap':'round','data-demo-shape':'',visibility:'hidden'}),extraPoint=node('circle',{r:2.5,fill:'#69b8ff',visibility:'hidden','data-demo-placed-point':''});
 const guides=Array.from({length:5},()=>node('path',{fill:'none',stroke:'#e7a45d','stroke-width':1.1,'stroke-dasharray':'3 3',visibility:'hidden','data-demo-guide':''})),arrows=Array.from({length:4},()=>node('path',{fill:'none',stroke:'#c896ff','stroke-width':1.1,'stroke-linecap':'round','stroke-linejoin':'round',visibility:'hidden','data-demo-reference-arrow':''})),markers=Array.from({length:4},(_,i)=>{const dot=node('circle',{r:3.2,stroke:'#ffd166','stroke-width':1,'data-demo-point':i+1}),text=node('text',{fill:'#e7edf7','font-size':11});return {dot,text}}),handles=Array.from({length:4},()=>node('circle',{r:2.5,fill:'#c896ff',visibility:'hidden','data-demo-control':''})),foci=[0,1].map(()=>node('circle',{r:2,fill:'#c896ff',visibility:'hidden','data-demo-focus':''})),ring=node('circle',{fill:'none',stroke:'#ffd166','stroke-width':1.5,visibility:'hidden'}),pointer=node('path',{d:'M0 0v15l4-4 4 7 4-2-4-7 6-1Z',stroke:'#172438','stroke-width':1,'data-demo-pointer':''}),caption=node('text',{x:10,y:165,fill:'#e7edf7','font-size':11,'data-demo-caption':''});
 function render(time,mode){const s=sample(type,mode,time);let message='';svg.dataset.pointerDown=String(s.down);svg.dataset.demoStage=s.finished?'complete':'drawing';svg.dataset.referenceMode=s.draft?.referenceMode||'';if(heading.textContent!==mode.label)heading.textContent=mode.label;set(shape,{visibility:'hidden'});set(extraPoint,{visibility:'hidden'});for(const e of [...guides,...arrows,...handles,...foci])set(e,{visibility:'hidden'});const dots=[];let lines=0,controls=0;
  const guide=(a,b,color='#e7a45d')=>{if(lines<guides.length)set(guides[lines++],{d:'M '+a.x+' '+a.y+' L '+b.x+' '+b.y,stroke:color,visibility:'visible'})},dot=(p,label,confirmed=true,color='#ffd166')=>dots.push({p,label,confirmed,color});
  if(type==='bezier'){
   if(s.draft){const {display,markers:anchors}=s.finished?{display:s.draft.anchors,markers:s.draft.anchors}:C.bezierDisplay(s.draft);if(display.length>1)set(shape,{d:C.bezierPath(display),visibility:'visible'});for(const [i,a]of anchors.entries()){dot(a.point,String(i+1));if(Math.hypot(a.offset.x,a.offset.y)>1e-10)for(const incoming of a.symmetric&&i>0?[false,true]:[false]){const p=C.bezierControl(a,incoming);guide(a.point,p,'#c896ff');const arrow=ChipUI.referenceArrow(a.point,p,{mode:s.draft.referenceMode});if(arrow)set(arrows[controls],{d:arrow,visibility:'visible'});set(handles[controls++],{cx:p.x,cy:p.y,visibility:'visible'})}}}else dot(s.cursor,'1',false);
   message=s.finished?'✓ 已完成':mode.gesture==='click'?(s.draft?.awaitingControl?'點選控制點（相對於錨點）':'點選下一個錨點'):(s.down?'按住拖出對稱控制柄，放開確認':'移動放置下一個錨點');
  }else if(type==='polyline'){
   const display=s.polyCursor&&!s.finished?[...s.points,s.polyCursor]:s.points;if(display.length>1)set(shape,{points:display.map(p=>p.x+','+p.y).join(' '),visibility:'visible'});s.points.forEach((p,i)=>dot(p,String(i+1)));if(!s.points.length)dot(s.cursor,'1',false);else if(s.polyCursor&&!s.finished&&Math.hypot(s.cursor.x-s.points.at(-1).x,s.cursor.y-s.points.at(-1).y)>2)dot(s.cursor,String(s.points.length+1),false);message=s.finished?'✓ 已完成':'逐點追加頂點';
  }else if(type==='point'){
   if(s.outputs.length){const p=s.outputs.at(-1);set(shape,{...C.primitive(type,p,p).attributes,visibility:'visible'});if(s.outputs.length>1)set(extraPoint,{cx:s.outputs[0].x,cy:s.outputs[0].y,visibility:'visible'})}else if(s.down&&s.first&&Math.hypot(s.cursor.x-s.first.x,s.cursor.y-s.first.y)>0)set(shape,{...C.primitive(type,s.cursor,s.cursor).attributes,visibility:'visible'});
   if(mode.gesture==='click'){s.outputs.forEach((p,i)=>dot(p,String(i+1)));if(!s.finished&&(!s.outputs.length||Math.hypot(s.cursor.x-s.outputs[0].x,s.cursor.y-s.outputs[0].y)>2))dot(s.cursor,String(s.outputs.length+1),false)}else{dot(s.cursor,'1',s.finished);if(s.first)guide(s.first,s.cursor)}message=s.finished?(mode.returnToSelect?'✓ 放開建立點；返回預設工具':'✓ 可繼續點選；保留點工具'):mode.gesture==='drag'?'按住拖到目標位置，放開建立點':'點一下放置點，可繼續點選';
  }else{
   if(s.first){set(shape,{...C.primitive(type,s.first,s.cursor).attributes,visibility:'visible'});guide(s.first,s.cursor);dot(s.first,'1',mode.gesture==='drag'||s.confirmed);if(s.finished||Math.hypot(s.cursor.x-s.first.x,s.cursor.y-s.first.y)>2)dot(s.cursor,'2',s.finished);if(type==='ellipse'){const rx=Math.abs(s.cursor.x-s.first.x),ry=Math.abs(s.cursor.y-s.first.y),distance=Math.sqrt(Math.abs(rx*rx-ry*ry));for(const [i,sign]of [-1,1].entries())set(foci[i],{cx:s.first.x+(rx>=ry?distance*sign:0),cy:s.first.y+(rx<ry?distance*sign:0),visibility:'visible'})}}else dot(s.cursor,'1',false);
   message=s.finished?(mode.returnToSelect?'✓ 放開完成；返回預設工具':'✓ 點擊完成；保留目前工具'):s.first?(mode.gesture==='drag'?'按住拖曳決定形狀，放開完成':'移動決定形狀，再點擊完成'):(type==='line'?'先放置起點':'先放置中心');
  }
  markers.forEach(({dot,text},i)=>{const item=dots[i];set(dot,{visibility:item?'visible':'hidden'});set(text,{visibility:item?'visible':'hidden'});if(item){set(dot,{cx:item.p.x,cy:item.p.y,fill:item.confirmed?item.color:'#172438',stroke:item.color,'data-demo-confirmed':String(item.confirmed)});set(text,{x:item.p.x+7,y:item.p.y-7});if(text.textContent!==item.label)text.textContent=item.label}});
  if(caption.textContent!==message)caption.textContent=message;
  scene.input(time,fixture(type,mode).events);
  const recent=s.events.filter(e=>e.kind==='down'||e.kind==='up').at(-1),pulse=recent?(time-recent.time)/.05:2;if(pulse>=0&&pulse<1)set(ring,{cx:recent.p.x,cy:recent.p.y,r:4+pulse*8,opacity:1-pulse,visibility:'visible'});else set(ring,{visibility:'hidden'});set(ring,{visibility:'hidden'});set(pointer,{transform:'translate('+s.cursor.x+' '+s.cursor.y+')',fill:s.down?'#ffd166':'#e7edf7'});
 }
 return scene.bind(render,modes);
}
for(const [type,items]of Object.entries(definitions))ChipUI.registerObjectInteractions(type,items.map(item=>({...item,helpVisual:()=>animation(type,item.id)})));
root.ChipToolHelp={animation,sample,fixture,position,types:Object.keys(definitions)};
})(globalThis);
