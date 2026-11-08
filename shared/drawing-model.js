/* Issue #54: document data and geometry, independent of SVG and DOM. */
(function(root){
'use strict';
const present=value=>value!==null&&value!==undefined;
const own=(object,key)=>object&&Object.hasOwn(object,key)&&present(object[key]);
const number=value=>root.ChipQuantity.scalar(value);
function clean(value){
 if(Array.isArray(value))return value.map(item=>{if(item===undefined)throw Error('陣列不能包含 undefined');return clean(item)});
 if(value&&typeof value==='object'){const result={};for(const key of Object.keys(value))if(present(value[key]))Object.defineProperty(result,key,{value:clean(value[key]),enumerable:true,writable:true,configurable:true});return result}
 return value;
}
function copy(value){return root.ChipJson.copy(clean(value))}
function createIds(random=()=>root.crypto?.randomUUID?.()||Math.random().toString(36).slice(2)){
 const used=new Set();let suffix=0;
 return {reserve(id){if(typeof id!=='string'||!id)throw Error('無效 ID');if(used.has(id))return false;used.add(id);return true},next(){const seed=random();if(typeof seed!=='string'||!seed)throw Error('ID 生成器需要非空字串');let id=seed;while(used.has(id))id=seed+'_'+(++suffix).toString(36);used.add(id);return id}};
}
const defaultUnits=Object.freeze({coordinate:'orth',length:'metric',length_approx:'mm',angle:'deg',color:'hex',fraction_style:'float'});
const paintFields=new Set(['type','color','width','opacity','linecap','linejoin','pattern','offset','miterlimit']);
function property(object,path){let value=object;for(const key of path.split('.')){if(!own(value,key))return undefined;value=value[key]}return value}
function resolve(object,layer,software,path){
 const [paint,key]=path.split('.');if(!['stroke','fill'].includes(paint)||!paintFields.has(key))return {value:property(object,path),source:present(property(object,path))?'object':null};
 const forced=key==='color'&&(layer?.type==='vect'||layer?.type==='pcb'||layer?.type?.startsWith('pcb_'));
 for(const [source,data]of (forced?[['layer',layer],['software',software]]:[['object',object],['layer',layer],['software',software]])){const value=property(data,path);if(present(value))return {value:copy(value),source,sourceId:data?.id||null}}
 return {value:undefined,source:null};
}
function visibility(object,ancestors=[]){const sources=[...ancestors,object];const index=sources.findIndex(item=>item?.hiden===true);return {hiden:index>=0,source:index>=0?sources[index]:null}}
function units(input={}){const result={...defaultUnits,...copy(input)};if(result.coordinate!=='orth'||result.length_approx!=='mm'||result.angle!=='deg'||result.color!=='hex'||result.fraction_style!=='float')throw Error('此階段模型使用正交座標、mm、deg、hex 及純量；其他上下文需經轉換');return result}
function rotate(point,degrees){const r=number(degrees)*Math.PI/180,c=Math.cos(r),s=Math.sin(r);return [point[0]*c-point[1]*s,point[0]*s+point[1]*c]}
const rectRefs={
 'top-left':[0,0],'top-right':[1,0],'bottom-left':[0,-1],'bottom-right':[1,-1],
 center:[.5,-.5],top:[.5,0],bottom:[.5,-1],left:[0,-.5],right:[1,-.5]
};
const rectAnchors={...rectRefs,'top-left-bottom-right':[0,0],'top-right-bottom-left':[1,0]};
function rectangleFromPoints(reference,a,b,{rotation=0}={}){
 if(!Object.hasOwn(rectAnchors,reference))throw Error('未知矩形繪製方式');
 if(!Array.isArray(a)||a.length!==2||!Array.isArray(b)||b.length!==2)throw Error('矩形需要兩個二維點');a=a.map(number);b=b.map(number);rotation=number(rotation);
 const delta=rotate([b[0]-a[0],b[1]-a[1]],-rotation),world=p=>{const v=rotate(p,rotation);return [a[0]+v[0],a[1]+v[1]]};
 if(!delta[0]||!delta[1])throw Error('矩形寬高必須大於 0');
 if(!Object.hasOwn(rectRefs,reference)){
  const left=Math.min(0,delta[0]),right=Math.max(0,delta[0]),top=Math.max(0,delta[1]),bottom=Math.min(0,delta[1]);
  return {type:'rect',reference,points:reference==='top-left-bottom-right'?[world([left,top]),world([right,bottom])]:[world([right,top]),world([left,bottom])],rotation};
 }
 const factor=rectRefs[reference];return {type:'rect',reference,point:a,width:Math.abs(delta[0])*(factor[0]===.5?2:1),height:Math.abs(delta[1])*(factor[1]===-.5?2:1),rotation};
}
const turn=value=>(value%360+360)%360;
const arcAngle=(point,center)=>Math.atan2(point[1]-center[1],point[0]-center[0])*180/Math.PI;
function solveArc(data){
 const point=value=>{if(!Array.isArray(value)||value.length!==2)throw Error('座標需要兩個分量');return value.map(number)},list=count=>{if(!Array.isArray(data.points)||data.points.length!==count)throw Error('此圓弧需要 '+count+' 個定義點');return data.points.map(point)},angle=(a,b,cw=false)=>(cw?-1:1)*(turn(cw?a-b:b-a)||360),distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
 const closed=data.closed??'none';if(!['none','sector','chord'].includes(closed))throw Error('圓弧 closed 只能為 none、sector 或 chord');if(present(data.direction)&&!['ccw','cw'].includes(data.direction))throw Error('未知圓弧方向');
 const base=(center,radius,start,sweep)=>{radius=number(radius);start=number(start);sweep=number(sweep);if(radius<=0)throw Error('半徑必須大於 0');if(!sweep||Math.abs(sweep)>360)throw Error('掃角須非零且絕對值不大於一周');return {type:'arc',point:center,radius,start,sweep,closed,reference:data.reference}};
 const three=points=>{const circle=solve({type:'circle',reference:'three-points',points}),start=arcAngle(points[0],circle.point),via=turn(arcAngle(points[1],circle.point)-start),end=arcAngle(points[2],circle.point);return base(circle.point,circle.radius,start,angle(start,end,via>turn(end-start)))};
 const reference=data.reference||'center-start-end';
 if(reference==='center-start-end'){const [center,start,end]=list(3),radius=distance(start,center);if(Math.abs(distance(end,center)-radius)>1e-9*Math.max(radius,Number.MIN_VALUE))throw Error('兩端點到圓心的距離必須相同');return base(center,radius,arcAngle(start,center),angle(arcAngle(start,center),arcAngle(end,center),data.direction==='cw'))}
 if(reference==='center-start-sweep'){const [center,start]=list(2);return base(center,distance(start,center),arcAngle(start,center),data.sweep)}
 if(reference==='center-radius-start-sweep')return base(point(data.point),data.radius,data.angle,data.sweep);
 if(reference==='three-points')return three(list(3));
 if(reference==='endpoints-sagitta'){const [a,b]=list(2),length=distance(a,b),height=number(data.sagitta);if(!length||!height)throw Error('弦長與弓高必須非零');return three([a,[(a[0]+b[0])/2-(b[1]-a[1])*height/length,(a[1]+b[1])/2+(b[0]-a[0])*height/length],b])}
 if(reference==='endpoints-radius'){
  const [a,b]=list(2),radius=number(data.radius),length=distance(a,b),side=data.side??1,large=data.large??false;if(![1,-1].includes(side)||typeof large!=='boolean')throw Error('需以 side（1／-1）及 large 選擇圓弧解');if(!length||radius<length/2)throw Error('半徑不能小於弦長的一半，兩端點亦不能相同');
  const height=Math.sqrt(Math.max(0,radius*radius-length*length/4)),center=[(a[0]+b[0])/2-(b[1]-a[1])*height*side/length,(a[1]+b[1])/2+(b[0]-a[0])*height*side/length],start=arcAngle(a,center),end=arcAngle(b,center),ccw=turn(end-start);return base(center,radius,start,angle(start,end,height===0?side<0:large?ccw<180:ccw>180));
 }
 if(reference==='start-tangent-end'){
  const [a,b]=list(2),theta=number(data.angle)*Math.PI/180,n=[-Math.sin(theta),Math.cos(theta)],d=[b[0]-a[0],b[1]-a[1]],den=2*(d[0]*n[0]+d[1]*n[1]);if(Math.abs(den)<=1e-12*distance(a,b))throw Error('切向與弦平行，沒有有限半徑圓弧');const k=(d[0]*d[0]+d[1]*d[1])/den,center=[a[0]+k*n[0],a[1]+k*n[1]],start=arcAngle(a,center);return base(center,Math.abs(k),start,angle(start,arcAngle(b,center),k<0));
 }
 if(reference==='two-tangents'){
  const [a,b]=list(2);if(!Array.isArray(data.angles)||data.angles.length!==2)throw Error('雙切點需兩個對應的切線角度');const normals=data.angles.map(value=>{const t=number(value)*Math.PI/180;return [-Math.sin(t),Math.cos(t)]}),[n,m]=normals,d=[b[0]-a[0],b[1]-a[1]],cross=(u,v)=>u[0]*v[1]-u[1]*v[0],den=cross(n,m);let center;
  if(Math.abs(den)<1e-12){if(Math.abs(cross(d,n))>1e-9*distance(a,b))throw Error('切線法線平行，圓弧無解');center=[(a[0]+b[0])/2,(a[1]+b[1])/2]}else{const k=cross(d,m)/den;center=[a[0]+n[0]*k,a[1]+n[1]*k]}
  const radius=distance(a,center);if(Math.abs(distance(b,center)-radius)>1e-9*Math.max(radius,Number.MIN_VALUE))throw Error('雙切點的候選半徑不同，圓弧無解');const start=arcAngle(a,center);return base(center,radius,start,angle(start,arcAngle(b,center),data.direction==='cw'));
 }
 throw Error('尚未支援此圓弧 reference');
}
function arcPath(g){
 const point=angle=>{const t=angle*Math.PI/180;return [g.point[0]+g.radius*Math.cos(t),-(g.point[1]+g.radius*Math.sin(t))]},start=point(g.start),full=Math.abs(g.sweep)===360,end=full?start:point(g.start+g.sweep),command=(target,large)=>' A '+g.radius+' '+g.radius+' 0 '+(large?1:0)+' '+(g.sweep<0?1:0)+' '+target.join(' ');
 let path='M '+start.join(' ');path+=full?command(point(g.start+g.sweep/2),false)+command(end,false):command(end,Math.abs(g.sweep)>180);if(g.closed==='sector')path+=' L '+g.point[0]+' '+(-g.point[1])+' Z';else if(g.closed==='chord')path+=' Z';return path;
}
function solve(object){
 if(present(object.point_ref)&&!['absolute','start'].includes(object.point_ref))throw Error('尚未支援此 point_ref');if(object.point_ref==='start'&&!['line','polyline','polygon','bezier'].includes(object.type))throw Error('此類型的起點參考尚待定義');if(present(object.reference)&&['point','line','polyline','polygon','bezier'].includes(object.type))throw Error('此類型的 reference 尚待定義');
 const type=object.type,point=value=>{if(!Array.isArray(value)||value.length!==2)throw Error('座標需要兩個分量');return value.map(number)},points=()=>{if(!Array.isArray(object.points))throw Error('缺少 points');let result=object.points.map(point);if(object.point_ref==='start'&&result.length){const first=result[0];result=result.map((p,i)=>i?[p[0]+first[0],p[1]+first[1]]:p)}else if(present(object.point_ref)&&object.point_ref!=='absolute')throw Error('尚未支援此 point_ref');return result},positive=value=>{value=number(value);if(value<=0)throw Error('尺寸必須大於 0');return value};
 if(type==='arc')return solveArc(object);
 if(type==='point')return {type,point:point(object.point)};
 if(['line','polyline','polygon'].includes(type)){const list=points();if(type==='line'?list.length!==2:list.length<2)throw Error(type==='line'?'直線需要兩個點':'折線至少需要兩個點');if(present(object.closed)&&type!=='polyline')throw Error('此類型不接受 closed');if(present(object.closed)&&typeof object.closed!=='boolean')throw Error('closed 需要布林值');return {type,points:list,closed:type==='polygon'||object.closed===true}}
 if(type==='rect'){
  if(present(object.closed))throw Error('矩形天然閉合，不接受 closed');const reference=object.reference||'top-left',rotation=present(object.rotation)?number(object.rotation):0;let anchor,width,height,leftTop;
  if(reference==='top-left-bottom-right'||reference==='top-right-bottom-left'){
   const list=points();if(list.length!==2)throw Error('對角點矩形需要兩個點');anchor=list[0];const delta=rotate([list[1][0]-anchor[0],list[1][1]-anchor[1]],-rotation);width=positive(reference==='top-left-bottom-right'?delta[0]:-delta[0]);height=positive(-delta[1]);const offset=rotate(reference==='top-left-bottom-right'?[0,0]:[-width,0],rotation);leftTop=[anchor[0]+offset[0],anchor[1]+offset[1]];
  }else{if(!Object.hasOwn(rectRefs,reference))throw Error('尚未支援此矩形 reference');anchor=point(object.point);width=positive(object.width);height=positive(object.height);const factor=rectRefs[reference],offset=rotate([width*factor[0],height*factor[1]],rotation);leftTop=[anchor[0]-offset[0],anchor[1]-offset[1]]}
  return {type,point:leftTop,width,height,rotation,reference,pivot:anchor};
 }
 if(type==='circle'){
  if(present(object.closed))throw Error('圓形天然閉合，不接受 closed');const reference=object.reference||'center-radius';let center,radius;
  if(reference==='center-radius'||reference==='center-diameter'){center=point(object.point);radius=positive(reference==='center-radius'?object.radius:positive(object.diameter)/2)}
  else if(reference==='center-point'){const list=points();if(list.length!==2)throw Error('圓心與圓上點需要兩個點');center=list[0];radius=positive(Math.hypot(list[1][0]-center[0],list[1][1]-center[1]))}
  else if(reference==='three-points'){const list=points();if(list.length!==3)throw Error('三點圓需要三個點');const [a,b,c]=list,d=2*(a[0]*(b[1]-c[1])+b[0]*(c[1]-a[1])+c[0]*(a[1]-b[1]));if(d===0)throw Error('三點共線，圓形無解');const norms=list.map(p=>p[0]*p[0]+p[1]*p[1]);center=[(norms[0]*(b[1]-c[1])+norms[1]*(c[1]-a[1])+norms[2]*(a[1]-b[1]))/d,(norms[0]*(c[0]-b[0])+norms[1]*(a[0]-c[0])+norms[2]*(b[0]-a[0]))/d];radius=positive(Math.hypot(center[0]-a[0],center[1]-a[1]));center.forEach(number)}
  else throw Error('此圓形參考方式的選解規則尚未接入');return {type,point:center,radius,reference};
 }
 if(type==='bezier'){
  const list=points();if(list.length<2)throw Error('貝塞爾線至少需要兩個點');if(!present(object.control_points))return {type:'polyline',points:list,closed:object.closed===true,degraded:true};
  if(!Array.isArray(object.control_points)||object.control_points.length!==list.length)throw Error('points 與 control_points 長度必須相同');object.control_points.forEach(point);throw Error('二階貝塞爾的逐段連接規則尚待定義');
 }
 throw Error('此物件類型的幾何模型尚未接入');
}
const softwarePaint=Object.freeze({stroke:{type:'solid',color:'#69b8ff',width:2,linecap:'round',linejoin:'round',offset:0},fill:{type:'none',color:'#182b42'}});
function inspect(input,{layer=null,software=softwarePaint,units_system={}}={}){
 const data=copy(input),issues=[];if(!data||Array.isArray(data)||typeof data!=='object')throw Error('物件需要 JSON 物件');units(units_system);
 const add=(code,message,{severity='warning',required=false,path=''}={})=>issues.push({code,message,severity,required,path});
 for(const key of ['id','name','type'])if(!present(data[key]))add('missing-'+key,'缺少 '+key+'，保留缺省值',{required:key==='type',severity:key==='type'?'error':'warning',path:key});else if(typeof data[key]!=='string'||!data[key])add('invalid-'+key,key+' 需要非空字串',{required:true,severity:'error',path:key});
 if(present(data.hiden)&&typeof data.hiden!=='boolean')add('invalid-hiden','hiden 需要布林值',{required:true,severity:'error',path:'hiden'});
 if(present(data.units_system))add('object-context','物件不能自行覆寫文件計量上下文',{required:true,severity:'error',path:'units_system'});
 const paint={stroke:{},fill:{}},sources={};
 for(const kind of ['stroke','fill']){
  if(present(data[kind])&&(Array.isArray(data[kind])||typeof data[kind]!=='object')){add('invalid-paint',kind+' 需要物件',{required:true,severity:'error',path:kind});continue}
  for(const key of Object.keys(data[kind]||{}))if(!paintFields.has(key)||kind==='fill'&&!['type','color','opacity'].includes(key))add('unknown-paint-field','未識別 '+kind+'.'+key+'，原資料保留',{path:kind+'.'+key});
  for(const key of paintFields){if(kind==='fill'&&!['type','color','opacity'].includes(key))continue;const result=resolve(data,layer,software,kind+'.'+key);if(present(result.value)){paint[kind][key]=result.value;sources[kind+'.'+key]=result.source}}
  if(!['solid','none',...(kind==='stroke'?['dashed']:[])].includes(paint[kind].type))add('paint-type','尚未支援此 '+kind+' 類型',{required:true,severity:'error',path:kind+'.type'});
  if(present(paint[kind].color)&&!/^#[\da-f]{6}(?:[\da-f]{2})?$/i.test(paint[kind].color))add('paint-color','色彩與 hex 上下文不相容',{required:true,severity:'error',path:kind+'.color'});
  for(const key of ['width','offset','opacity','miterlimit'])if(present(paint[kind][key]))try{const value=number(paint[kind][key]);if(key==='opacity'&&(value<0||value>1)||['width','miterlimit'].includes(key)&&value<0)throw Error('超出有效範圍')}catch{add('paint-number',kind+'.'+key+' 不是有效量值',{required:true,severity:'error',path:kind+'.'+key})}
  if(kind==='stroke'){
   for(const [key,allowed]of [['linecap',['butt','round','square']],['linejoin',['miter','round','bevel']]])if(present(paint.stroke[key])&&!allowed.includes(paint.stroke[key]))add('paint-enum','無效 '+key,{required:true,severity:'error',path:'stroke.'+key});
   if(paint.stroke.type==='dashed'&&(!Array.isArray(paint.stroke.pattern)||!paint.stroke.pattern.length||!paint.stroke.pattern.every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0)||paint.stroke.pattern.every(v=>v===0)))add('paint-pattern','虛線 pattern 需要非負長度，不能全部為 0',{required:true,severity:'error',path:'stroke.pattern'});
  }
  if(own(data[kind],'color')&&['pcb','vect'].includes(layer?.type)||own(data[kind],'color')&&layer?.type?.startsWith('pcb_'))add('inactive-color','此圖層強制使用圖層色彩，物件色彩資料保留但不生效',{path:kind+'.color'});
 }
 const known=new Set(['id','name','type','hiden','stroke','fill','reference','point_ref','point','points','width','height','radius','diameter','rotation','closed','control_points','angle','angles','sweep','sagitta','side','large','direction']);for(const key of Object.keys(data))if(!known.has(key))add('unknown-field','未識別欄位 '+key+'，原資料保留',{path:key});
 let geometry=null;try{geometry=solve(data);if(geometry.degraded)add('missing-controls','缺少 control_points，以折線降級顯示，保留貝塞爾類型',{path:'control_points'})}catch(error){add('geometry',error.message,{severity:'error',path:'geometry'})}
 const hiden=visibility(data,layer?[layer]:[]);return {data,geometry,paint,sources,hiden:hiden.hiden,issues};
}
function specialize(input,paths,{layer=null,software=softwarePaint}={}){const data=copy(input);for(const path of paths){const [kind,key,...rest]=path.split('.');if(rest.length||!['stroke','fill'].includes(kind)||!paintFields.has(key))throw Error('此欄位沒有共同繼承語義');const result=resolve(data,layer,software,path);if(present(result.value)){if(!data[kind])data[kind]={};data[kind][key]=copy(result.value)}}return data}
function inspectLayer(input,{software=softwarePaint,units_system={}}={}){
 const data=copy(input);if(!data||Array.isArray(data)||typeof data!=='object')throw Error('圖層需要 JSON 物件');if(!['art','vect','pcb'].includes(data.type)&&!data.type?.startsWith('pcb_'))throw Error('未知圖層類型');if(present(data.items)&&!Array.isArray(data.items))throw Error('items 需要陣列');if(present(data.hiden)&&typeof data.hiden!=='boolean')throw Error('hiden 需要布林值');
 const items=(data.items||[]).map(item=>inspect(item,{layer:data,software,units_system}));return {data,items,issues:items.flatMap((item,index)=>item.issues.map(issue=>({...issue,index})))};
}
function selection(input){const data=copy(input);if(!data||!Array.isArray(data.items))throw Error('JSON 模型需要 items 陣列');data.units_system=units(data.units_system||{});const ids=new Set();for(const item of data.items){if(!item||Array.isArray(item)||typeof item!=='object')throw Error('items 必須包含物件');if(present(item.id)){if(typeof item.id!=='string'||!item.id)throw Error('無效物件 ID');if(ids.has(item.id))throw Error('物件 ID 重複');ids.add(item.id)}}return data}
const numericSchema={type:'number'},pointSchema={type:'array',items:numericSchema,minItems:2,maxItems:2};
const strokeSchema={type:'object',properties:{type:{type:'string'},color:{type:'string'},linecap:{type:'string'},linejoin:{type:'string'},width:numericSchema,opacity:numericSchema,offset:numericSchema,miterlimit:numericSchema,pattern:{type:'array',items:numericSchema}}};
const objectSchema={type:'object',properties:{id:{type:'string'},name:{type:'string'},type:{type:'string'},hiden:{type:'boolean'},reference:{type:'string'},point_ref:{type:'string'},point:pointSchema,points:{type:'array',items:pointSchema},width:numericSchema,height:numericSchema,radius:numericSchema,diameter:numericSchema,rotation:numericSchema,closed:{type:['boolean','string']},angle:numericSchema,angles:{type:'array',items:numericSchema},sweep:numericSchema,sagitta:numericSchema,side:numericSchema,large:{type:'boolean'},direction:{type:'string'},stroke:strokeSchema,fill:{type:'object',properties:{type:{type:'string'},color:{type:'string'},opacity:numericSchema}}}};
for(const key of Object.keys(objectSchema.properties)){const value=objectSchema.properties[key];objectSchema.properties[key]={...value,type:[...(Array.isArray(value.type)?value.type:[value.type]),'null']}}
for(const group of [strokeSchema,objectSchema.properties.fill])for(const key of Object.keys(group.properties)){const value=group.properties[key];group.properties[key]={...value,type:[value.type,'null']}}
const layerTypeSchema={enum:['art','vect','pcb']};
const layerSchema={type:'object',properties:{id:{type:'string'},name:{type:'string'},type:layerTypeSchema,hiden:{type:'boolean'},stroke:objectSchema.properties.stroke,fill:objectSchema.properties.fill,items:{type:'array',items:objectSchema}},required:['type']};
const jsonSchema={oneOf:[{...objectSchema,not:{anyOf:[{required:['items']},{required:['type'],properties:{type:layerTypeSchema}}]}},{type:'object',properties:{items:{type:'array',items:objectSchema}},required:['items'],not:{required:['type']}},layerSchema]};
root.ChipDrawingModel={copy,createIds,units,defaultUnits,softwarePaint,resolve,visibility,rotate,rectRefs,rectAnchors,rectangleFromPoints,solveArc,arcPath,arcAngle,turn,inspect,inspectLayer,specialize,selection,solve,jsonSchema};
})(globalThis);
