(function(root){
'use strict';
function rectDefinition(id,points,cursor,rotation=0){
 const world=p=>[p.x,-p.y];
 return ChipDrawingModel.rectangleDefinition(id,points.map(world),world(cursor),rotation);
}
function rectGuides(id,points,cursor,data){
 const [a,b]=points;
 if(!b)return [[a,cursor]];
 if(id==='edge'){
  const dx=b.x-a.x,dy=b.y-a.y,t=((cursor.x-a.x)*dx+(cursor.y-a.y)*dy)/(dx*dx+dy*dy);
  return [[a,b],[{x:a.x+dx*t,y:a.y+dy*t},cursor]];
 }
 const c=data?.points?.[2];
 return c?[[a,b],[a,{x:c[0],y:-c[1]}],[b,{x:c[0],y:-c[1]}]]:[[a,b]];
}
function rectConstraint(id,points){
 if(id!=='right-triangle'||points.length!==2)return null;
 const [a,b]=points;
 return {cx:(a.x+b.x)/2,cy:(a.y+b.y)/2,r:Math.hypot(b.x-a.x,b.y-a.y)/2};
}
function drawHelp(id,label,steps,complete,scene){
 const {svg,node,set,lerp}=scene;
 svg.dataset.constructionAnimation=id;
 const a=id==='edge-midpoint'?{x:130,y:45}:{x:52,y:45},b=id==='edge'?{x:170,y:63}:{x:190,y:118};
 const final=id==='edge'?{x:150,y:117}:id==='right-triangle'?{x:178,y:41}:b;
 const shape=node('path',{fill:'none',stroke:'#69b8ff','stroke-width':2.4,'data-demo-shape':''});
 const guides=[0,1,2].map(()=>node('path',{fill:'none',stroke:'#e7a45d','stroke-dasharray':'4 3','data-demo-guide':''}));
 const circle=node('circle',{fill:'none',stroke:'#e7a45d',opacity:'.5','stroke-dasharray':'4 3'});
 const dots=[0,1,2].map(i=>node('circle',{r:3.5,stroke:'#ffd166','data-demo-point':i+1}));
 const pointer=node('path',{d:'M0 0v15l4-4 4 7 4-2-4-7 6-1Z',fill:'#e7edf7','data-demo-pointer':''});
 const click=node('circle',{r:6,fill:'none',stroke:'#ffd166','data-demo-click':''});
 const caption=node('text',{x:10,y:165,fill:'#e7edf7','font-size':11});
 const path=(a,b)=>'M '+a.x+' '+a.y+' L '+b.x+' '+b.y;
 return scene.bind(progress=>{
  const three=steps.length===3,startFinal=three?.47:.17,stage=progress<.17?0:three&&progress<.43?1:steps.length-1,done=progress>=.81;
  const cursor=stage===0?a:three&&stage===1?lerp(a,b,Math.min(1,(progress-.17)/.23)):lerp(three?b:a,final,Math.min(1,Math.max(0,(progress-startFinal)/(.75-startFinal))));
  const anchors=stage===0?[]:three&&stage===2?[a,b]:[a];
  let data=anchors.length?rectDefinition(id,anchors,cursor):null,geometry;
  try{if(data)geometry=ChipDrawingModel.solve(data)}catch{data=null}
  let d='';
  if(geometry){
   const {width,height,rotation,point}=geometry;
   const corners=[[0,0],[width,0],[width,-height],[0,-height]].map(offset=>{const [x,y]=ChipDrawingModel.rotate(offset,rotation);return [point[0]+x,-point[1]-y]});
   d='M '+corners.map(p=>p.join(' ')).join(' L ')+' Z';
  }
  set(shape,{d,visibility:d?'visible':'hidden'});
  const segments=anchors.length?rectGuides(id,anchors,cursor,data):[];
  guides.forEach((guide,i)=>set(guide,{d:segments[i]?path(...segments[i]):'',visibility:segments[i]?'visible':'hidden'}));
  const constraint=rectConstraint(id,anchors);
  set(circle,constraint?{...constraint,visibility:'visible'}:{visibility:'hidden'});
  const target=data?.reference==='right-triangle'&&data.points.length===3?{x:data.points[2][0],y:-data.points[2][1]}:cursor;
  for(const [i,dot]of dots.entries()){
   const p=anchors[i]||target,confirmed=i<anchors.length||done||i===0&&progress>=.12||three&&i===1&&progress>=.43;
   set(dot,{cx:p.x,cy:p.y,fill:confirmed?'#ffd166':'#172438',visibility:i<=stage?'visible':'hidden','data-demo-confirmed':String(confirmed)});
  }
  set(pointer,{transform:'translate('+cursor.x+' '+cursor.y+')'});
  const pressing=progress>=.10&&progress<=.12||three&&progress>=.40&&progress<=.43||progress>=.78&&progress<=.81;
  set(click,{cx:cursor.x,cy:cursor.y,visibility:pressing?'visible':'hidden'});
  svg.dataset.demoStage=done?'complete':String(stage+1);
  caption.textContent=done?complete:steps[stage];
  scene.input(progress,[{time:.10,kind:'down',p:a},{time:.12,kind:'up',p:a},...(three?[{time:.40,kind:'down',p:b},{time:.43,kind:'up',p:b}]:[]),{time:.78,kind:'down',p:final},{time:.81,kind:'up',p:final}]);
 });
}
root.ChipRectangleHelp={rectDefinition,rectGuides,rectConstraint,drawHelp};
})(globalThis);
