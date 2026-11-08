/* SVG projection adapter for the issue #54 data model. SVG attributes never form the public JSON model. */
(function(root){
'use strict';
const M=()=>root.ChipDrawingModel,ns='http://www.w3.org/2000/svg',ids=()=>identity||(identity=M().createIds());let identity=null;
const owners=new Map(),bound=new WeakMap();let bridge={};
function configure(options){bridge=options}
function attr(node,key){return node.getAttribute(key)}
function record(node){const text=attr(node,'data-model-record');if(!text)return null;try{return M().copy(JSON.parse(decodeURIComponent(text)))}catch{throw Error('物件模型資料損壞')}}
function storedView(node){try{return JSON.parse(decodeURIComponent(attr(node,'data-model-view')||''))}catch{return null}}
const nativeFields=['x','y','width','height','rx','ry','cx','cy','r','x1','y1','x2','y2','points','d','transform','stroke','fill','stroke-width','stroke-linecap','stroke-linejoin','stroke-dasharray','stroke-dashoffset','stroke-opacity','fill-opacity','stroke-miterlimit','display'];
function view(node){const m=matrix(node),result={tag:node.localName,_matrix:{a:m.a,b:m.b,c:m.c,d:m.d,e:m.e,f:m.f}};for(const key of nativeFields){const value=attr(node,key);if(value!==null)result[key]=value}return result}
function stash(node,data){node.setAttribute('data-model-record',encodeURIComponent(root.ChipJson.stringify(data)));node.setAttribute('data-model-view',encodeURIComponent(JSON.stringify(view(node))))}
function type(node){if(attr(node,'data-object-type')==='point')return 'point';if(node.localName==='path')return root.ChipArc.read(node)?'arc':'bezier';return node.localName}
function initialize(node){
 if(bound.has(node))return bound.get(node);const raw=record(node);let id=attr(node,'data-model-id')||raw?.id;
 if(id){const previous=owners.get(id);if(previous&&previous!==node&&previous.parentNode&&bridge.contains?.(previous))throw Error('偵測到重複物件 ID，需明確修復');ids().reserve(id)}else id=ids().next();
 owners.set(id,node);bound.set(node,id);node.setAttribute('data-model-id',id);
 if(!raw&&!attr(node,'data-model-name'))node.setAttribute('data-model-name',root.ChipUI.objectTypes.find(item=>item.id===type(node))?.label||'物件');return id;
}
function layer(node){
 const group=bridge.owner?.(node);if(!group)return null;initialize(group);const native=attr(group,'data-layer-type'),result={...JSON.parse(decodeURIComponent(attr(group,'data-model-layer')||'%7B%7D')),id:attr(group,'data-model-id'),name:attr(group,'data-name')||'',type:{artwork:'art',vector:'vect',pcb:'pcb'}[native]||'art'};
 delete result.items;delete result.hiden;
 if(attr(group,'display')==='none'||group.style?.display==='none')result.hiden=true;
 for(const kind of ['stroke','fill']){const color=native==='pcb'?bridge.pcbColor?.(group):attr(group,'data-default-'+kind);if(color)result[kind]={...result[kind],color}}
 return result;
}
function scalar(value){return root.ChipQuantity.scalar(value)}
function quantity(value){return root.ChipUI.measurements.archiveQuantity({value:scalar(value),unit:'mm'}).value}
function numeric(node,key,fallback=0){const value=attr(node,key);return quantity(value===null?fallback:Number(value))}
function matrix(node){return bridge.matrix?.(node)||{a:1,b:0,c:0,d:1,e:0,f:0}}
function world(point,m){return [quantity(m.a*point[0]+m.c*point[1]+m.e),quantity(-(m.b*point[0]+m.d*point[1]+m.f))]}
function frame(node){const m=matrix(node),x=Math.hypot(m.a,m.b),y=Math.hypot(m.c,m.d),dot=m.a*m.c+m.b*m.d;if(Math.abs(x-1)>1e-9||Math.abs(y-1)>1e-9||Math.abs(dot)>1e-9)throw Error('此物件含縮放或斜切，模型轉換尚未接入；原圖形保持不變');return m}
function geometry(node,previous){
 const t=previous?.type==='polyline'&&node.localName==='polygon'?'polyline':type(node),m=frame(node);let result={type:t};
 if(t==='point')result.point=world([numeric(node,'x1'),numeric(node,'y1')],m);
 else if(t==='line')result.points=[[numeric(node,'x1'),numeric(node,'y1')],[numeric(node,'x2'),numeric(node,'y2')]].map(p=>world(p,m));
 else if(t==='polyline'||t==='polygon'){
  const tokens=(attr(node,'points')||'').trim().split(/[\s,]+/).map(Number);if(tokens.length%2||!tokens.every(Number.isFinite))throw Error('物件點簇損壞');result.points=[];for(let i=0;i<tokens.length;i+=2)result.points.push(world([tokens[i],tokens[i+1]],m));
  if(t==='polyline'&&result.points.length>2&&result.points[0].every((v,i)=>v===result.points.at(-1)[i])){result.closed=true;result.points.pop()}
 }
 else if(t==='rect'){
  if(m.a*m.d-m.b*m.c<0)throw Error('鏡像矩形的參考方式尚未接入；不改寫參考語義');if(numeric(node,'rx')||numeric(node,'ry'))throw Error('幾何圓角矩形欄位尚待定義，原圖形保持不變');
  const topLeft=world([numeric(node,'x'),numeric(node,'y')],m),width=numeric(node,'width'),height=numeric(node,'height'),rotation=-Math.atan2(m.b,m.a)*180/Math.PI,reference=previous?.reference||'top-left';
  result={type:t,reference,rotation};const factor=M().rectRefs[reference];
  if(factor){const offset=M().rotate([width*factor[0],height*factor[1]],rotation);result.point=[topLeft[0]+offset[0],topLeft[1]+offset[1]];result.width=width;result.height=height}
  else if(['top-left-bottom-right','top-right-bottom-left'].includes(reference)){const right=M().rotate([width,0],rotation),bottom=M().rotate([0,-height],rotation);result.points=reference==='top-left-bottom-right'?[topLeft,[topLeft[0]+right[0]+bottom[0],topLeft[1]+right[1]+bottom[1]]]:[[topLeft[0]+right[0],topLeft[1]+right[1]],[topLeft[0]+bottom[0],topLeft[1]+bottom[1]]]}
  else throw Error('矩形參考方式尚未接入');
 }
 else if(t==='arc'){
  const arc=root.ChipArc.read(node);if(!arc)throw Error('圓弧投影與模型不符');
  const old=storedView(node),before=old?._matrix||{a:1,b:0,c:0,d:1,e:0,f:0},det=before.a*before.d-before.b*before.c;
  const local=p=>{const x=p[0]-before.e,y=-p[1]-before.f;return [(before.d*x-before.c*y)/det,(-before.b*x+before.a*y)/det]},change=p=>world(local(p),m),direction=degrees=>{const p=local([before.e+Math.cos(degrees*Math.PI/180),-before.f+Math.sin(degrees*Math.PI/180)]),x=m.a*p[0]+m.c*p[1],y=m.b*p[0]+m.d*p[1];return Math.atan2(-y,x)*180/Math.PI},reflected=(m.a*m.d-m.b*m.c)/det<0;
  if(previous){if(old.d!==attr(node,'d'))throw Error('圓弧定義請透過共用模型修改');result=M().copy(previous);if(result.point)result.point=change(result.point);if(result.points)result.points=result.points.map(change);if(result.angle!==undefined)result.angle=direction(result.angle);if(result.angles)result.angles=result.angles.map(direction);if(reflected){if(result.sweep!==undefined)result.sweep=-result.sweep;if(result.sagitta!==undefined)result.sagitta=-result.sagitta;if(result.side!==undefined)result.side=-result.side;if(['center-start-end','two-tangents'].includes(result.reference))result.direction=result.direction==='cw'?'ccw':'cw'}return result}
  const reflectedNative=m.a*m.d-m.b*m.c<0,start=world([arc.center.x+arc.radius.value*Math.cos(arc.start.value*Math.PI/180),arc.center.y-arc.radius.value*Math.sin(arc.start.value*Math.PI/180)],m),center=world([arc.center.x,arc.center.y],m);result={type:'arc',reference:'center-radius-start-sweep',point:center,radius:arc.radius.value,angle:M().arcAngle(start,center),sweep:(arc.direction==='cw'?-1:1)*(reflectedNative?-1:1)*root.ChipArc.span(arc)};if(arc.closed&&arc.closed!=='none')result.closed=arc.closed;
 }
 else if(t==='circle'){
  const reference=previous?.reference||'center-radius';if(['three-points','center-point'].includes(reference)){const before=storedView(node)?._matrix,solved=M().solve(previous);if(!before||Math.abs(numeric(node,'r')-solved.radius)>1e-9*Math.max(1,solved.radius))throw Error('此參考方式須修改定義點，不能直接改半徑');const determinant=before.a*before.d-before.b*before.c;result={type:t,reference,points:previous.points.map(p=>{const x=p[0]-before.e,y=-p[1]-before.f;return world([(before.d*x-before.c*y)/determinant,(-before.b*x+before.a*y)/determinant],m)})}}else{if(!['center-radius','center-diameter'].includes(reference))throw Error('此參考方式的幾何修改尚未接入');result={type:t,reference,point:world([numeric(node,'cx'),numeric(node,'cy')],m)};result[reference==='center-radius'?'radius':'diameter']=numeric(node,'r')*(reference==='center-radius'?1:2)}
 }else throw Error(t==='bezier'?'目前繪圖的三階貝塞爾不能直接充當 issue #54 的二階模型；尚未轉換，原圖形保持不變':'此物件類型的模型轉換尚未接入，原圖形保持不變');
 if(previous?.point_ref==='start'&&result.points?.length){const first=result.points[0];result.points=result.points.map((p,i)=>i?[p[0]-first[0],p[1]-first[1]]:p);result.point_ref='start'}else if(previous?.point_ref)result.point_ref=previous.point_ref;
 return result;
}
function paint(node,kind){
 const result={},value=attr(node,kind);if(value!==null){if(value==='none')result.type='none';else{result.type='solid';if(value!=='currentColor'){const color=bridge.color?.(value)||value;if(!/^#[\da-f]{6}(?:[\da-f]{2})?$/i.test(color))throw Error('此色彩需要上下文轉換');result.color=color}}}
 const mapping=kind==='stroke'?{width:'stroke-width',linecap:'stroke-linecap',linejoin:'stroke-linejoin',opacity:'stroke-opacity',offset:'stroke-dashoffset',miterlimit:'stroke-miterlimit'}:{opacity:'fill-opacity'};
 for(const [key,name]of Object.entries(mapping)){const raw=attr(node,name);if(raw!==null)result[key]=['linecap','linejoin'].includes(key)?raw:scalar(Number(raw))}
 if(kind==='stroke'){const pattern=attr(node,'stroke-dasharray');if(pattern&&pattern!=='none'){const list=pattern.trim().split(/[\s,]+/).map(Number);if(!list.every(Number.isFinite))throw Error('虛線長度需要上下文轉換');result.pattern=list;if(value!=='none')result.type='dashed'}}
 return result;
}
function encodeObject(node){
 initialize(node);const previous=record(node),oldView=storedView(node),current=view(node);
 if(previous&&JSON.stringify(oldView)===JSON.stringify(current))return previous;
 if(previous&&attr(node,'data-model-unresolved')==='true')return previous;
 const data=previous?M().copy(previous):{id:attr(node,'data-model-id'),name:attr(node,'data-model-name'),...geometry(node)};
 const geometricFields=['x','y','width','height','cx','cy','r','x1','y1','x2','y2','points','d','transform','rx','ry'];
 if(previous&&geometricFields.some(key=>current[key]!==oldView?.[key])){
  const next=geometry(node,previous);if(previous.type==='bezier'&&!previous.control_points)next.type='bezier';for(const key of ['point','points','width','height','radius','diameter','rotation','angle','angles','sweep','sagitta','side','large','direction'])delete data[key];Object.assign(data,next);
 }
 for(const kind of ['stroke','fill']){
  const next=paint(node,kind);
  if(!previous){if(Object.keys(next).length)data[kind]=next;continue}
  const fields=kind==='stroke'?['stroke','stroke-width','stroke-linecap','stroke-linejoin','stroke-dasharray','stroke-dashoffset','stroke-opacity','stroke-miterlimit']:['fill','fill-opacity'];
  if(fields.some(key=>current[key]!==oldView?.[key])){
   const modelKeys=kind==='stroke'?{stroke:['type','color'],'stroke-width':['width'],'stroke-linecap':['linecap'],'stroke-linejoin':['linejoin'],'stroke-dasharray':['type','pattern'],'stroke-dashoffset':['offset'],'stroke-opacity':['opacity'],'stroke-miterlimit':['miterlimit']}:{fill:['type','color'],'fill-opacity':['opacity']};
   const target=data[kind]&&typeof data[kind]==='object'?data[kind]:{};for(const key of fields)if(current[key]!==oldView?.[key])for(const modelKey of modelKeys[key]){if(Object.hasOwn(next,modelKey))target[modelKey]=next[modelKey];else delete target[modelKey]}data[kind]=target;
  }
 }
 if(!previous&&attr(node,'display')==='none'||previous&&current.display!==oldView?.display)data.hiden=attr(node,'display')==='none';
 stash(node,data);return M().copy(data);
}
function encode(nodes){return {units_system:{...M().defaultUnits},items:[...nodes].map(encodeObject)}}
function validate(input){return M().selection(input)}
function set(node,key,value){if(value!==undefined)node.setAttribute(key,value)}
function errorNode(data,issues){
 const node=document.createElementNS(ns,'g');set(node,'data-model-unresolved','true');const p=Array.isArray(data.point)?data.point:data.points?.find(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite));
 if(p&&p.length===2&&p.every(Number.isFinite)){const marker=document.createElementNS(ns,'text');set(marker,'x',p[0]);set(marker,'y',-p[1]);set(marker,'fill','#ff7979');set(marker,'font-size',6);set(marker,'text-anchor','middle');set(marker,'dominant-baseline','central');marker.textContent='×';node.append(marker)}
 set(node,'aria-label',issues.map(item=>item.message).join('；'));return node;
}
function geometryNode(g){let node;
  node=document.createElementNS(ns,g.type==='point'?'line':g.type==='polyline'&&g.closed?'polygon':g.type);
  if(g.type==='point'){set(node,'x1',g.point[0]);set(node,'y1',-g.point[1]);set(node,'x2',g.point[0]);set(node,'y2',-g.point[1]);set(node,'data-object-type','point')}
  else if(['line','polyline','polygon'].includes(g.type)){if(g.type==='line')for(const [i,p]of g.points.entries()){set(node,'x'+(i+1),p[0]);set(node,'y'+(i+1),-p[1])}else set(node,'points',g.points.map(p=>p[0]+','+(-p[1])).join(' '))}
  else if(g.type==='rect'){const relative=M().rotate([g.point[0]-g.pivot[0],g.point[1]-g.pivot[1]],-g.rotation),local=[g.pivot[0]+relative[0],g.pivot[1]+relative[1]];set(node,'x',local[0]);set(node,'y',-local[1]);set(node,'width',g.width);set(node,'height',g.height);if(g.rotation)set(node,'transform','rotate('+(-g.rotation)+' '+g.pivot[0]+' '+(-g.pivot[1])+')')}
  else if(g.type==='arc'){node=document.createElementNS(ns,'path');root.ChipArc.write(node,root.ChipArc.model({x:g.point[0],y:-g.point[1]},g.radius,g.start,g.start+g.sweep,{direction:g.sweep<0?'cw':'ccw',closed:g.closed}))}
  else if(g.type==='circle'){set(node,'cx',g.point[0]);set(node,'cy',-g.point[1]);set(node,'r',g.radius)}
 return node;
}
function project(input){return geometryNode(M().solve(input))}
function create(input,group,appearance={}){const data={id:ids().next(),name:root.ChipUI.objectTypes.find(item=>item.id===input.type)?.label||'物件',...M().copy(input)},source={getAttribute:key=>Object.hasOwn(appearance,key)?String(appearance[key]):null};M().solve(data);for(const kind of ['stroke','fill']){const authored=paint(source,kind);if(Object.keys(authored).length)data[kind]=authored}return decodeObject(data,null,layer(group))}
function decodeObject(data,target,context=layer(target)){
 const inspected=M().inspect(data,{layer:context}),g=inspected.geometry;let node;
 if(!g||inspected.issues.some(issue=>issue.required&&issue.severity==='error'))node=errorNode(data,inspected.issues);
 else{
  node=geometryNode(g);
  for(const kind of ['stroke','fill']){const p=inspected.paint[kind];set(node,kind,p.type==='none'?'none':p.color);set(node,kind+'-opacity',p.opacity)}
  const p=inspected.paint.stroke;for(const [key,name]of Object.entries({width:'stroke-width',linecap:'stroke-linecap',linejoin:'stroke-linejoin',miterlimit:'stroke-miterlimit',offset:'stroke-dashoffset'}))set(node,name,p[key]);set(node,'stroke-dasharray',p.type==='dashed'?p.pattern.join(' '):'none');
  if(g.type==='point'){set(node,'stroke-linecap','round');set(node,'stroke-dasharray','none');set(node,'stroke-dashoffset',0)}
  if(['line','polyline'].includes(g.type)&&!g.closed)set(node,'fill','none');
 }
 if(data.hiden===true)set(node,'display','none');
 set(node,'data-model-id',data.id||ids().next());if(data.name)set(node,'data-model-name',data.name);
 for(const key of ['data-locked','data-node-locks','data-focus-locks','data-reference-mode']){const value=target&&attr(target,key);if(value!==null&&value!==undefined)set(node,key,value)}
 stash(node,inspected.data);return node;
}
function update(node,data){
 const next=decodeObject(data,node);if(next.localName!==node.localName){if(bridge.replace)bridge.replace(node,next);else{node.parentNode.insertBefore(next,node);node.remove()}initialize(next);return next}
 for(const key of [...nativeFields,'data-arc','data-object-type']){const value=attr(next,key);if(value===null)node.removeAttribute(key);else node.setAttribute(key,value)}stash(node,M().inspect(data,{layer:layer(node)}).data);return node;
}
function arcVector(node){
 const data=encodeObject(node),g=M().solve(data),m=matrix(node),det=m.a*m.d-m.b*m.c,local=p=>{const x=p[0]-m.e,y=-p[1]-m.f;return {x:(m.d*x-m.c*y)/det,y:(-m.b*x+m.a*y)/det}},on=angle=>[g.point[0]+g.radius*Math.cos(angle*Math.PI/180),g.point[1]+g.radius*Math.sin(angle*Math.PI/180)],centered=(data.reference||'center-start-end').startsWith('center'),anchors=data.reference==='three-points'?data.points.map(local):[local(on(g.start)),local(on(g.start+g.sweep))];if(centered)anchors.push({...local(g.point),reference:'center'});
 return {anchors,set(index,p){const raw=encodeObject(node),current=M().solve(raw),target=world([p.x,p.y],matrix(node)),ref=raw.reference||'center-start-end',delta=[target[0]-current.point[0],target[1]-current.point[1]];
  if(centered&&index===2){if(raw.point)raw.point=target;if(raw.points)raw.points=raw.points.map(p=>[p[0]+delta[0],p[1]+delta[1]])}
  else if(ref==='three-points')raw.points[index]=target;
  else if(ref==='center-start-end'){const length=Math.hypot(...delta);if(!length)return;raw.points[index+1]=[current.point[0]+delta[0]*current.radius/length,current.point[1]+delta[1]*current.radius/length]}
  else if(ref==='center-start-sweep'){if(index===0)raw.points[1]=target;else raw.sweep=(current.sweep<0?-1:1)*(M().turn(current.sweep<0?current.start-M().arcAngle(target,current.point):M().arcAngle(target,current.point)-current.start)||360)}
  else if(ref==='center-radius-start-sweep'){if(index===0){raw.radius=Math.hypot(...delta);raw.angle=M().arcAngle(target,current.point)}else raw.sweep=(current.sweep<0?-1:1)*(M().turn(current.sweep<0?current.start-M().arcAngle(target,current.point):M().arcAngle(target,current.point)-current.start)||360)}
  else raw.points[index]=target;
  update(node,raw);
 }};
}
function check(input,targets){const bundle=validate(input);const extraContext=Object.keys(bundle.units_system).filter(key=>!Object.hasOwn(M().defaultUnits,key));if(extraContext.length)throw Error('屬性頁暫不修改全局上下文：'+extraContext.join('、'));if(bundle.items.length!==targets.length)throw Error('JSON 物件數量須與目前選取相同');const replacing=new Set(targets);for(const [i,item]of bundle.items.entries()){if(item.id){const owner=owners.get(item.id);if(owner&&bridge.contains?.(owner)&&!replacing.has(owner))throw Error('此 ID 已屬於其他物件，不能覆蓋其身份')}M().inspect(item,{layer:layer(targets[i])})}return bundle}
function decode(input,targets){return check(input,targets).items.map((item,i)=>decodeObject(item,targets[i]))}
function encodeLayer(group){return {...layer(group),items:[...group.children].map(encodeObject)}}
function checkLayer(input,group){
 const data=M().copy(input);if(!data||Array.isArray(data)||typeof data!=='object')throw Error('圖層需要 JSON 物件');
 if(!['art','vect','pcb'].includes(data.type))throw Error('尚未支援此圖層類型');if(data.type==='pcb'&&attr(group,'data-layer-type')!=='pcb')throw Error('請先在圖層面板建立具有用途的印刷電路層');
 if(data.name!==undefined&&typeof data.name!=='string')throw Error('圖層名稱需要字串');if(data.units_system!==undefined)throw Error('圖層不能覆寫文件計量上下文');
 const items=validate({items:data.items||[]}).items,all=[data,...items],replacing=new Set([group,...group.querySelectorAll('*')]),seen=new Set();
 for(const item of all)if(item.id!==undefined){if(typeof item.id!=='string'||!item.id||seen.has(item.id))throw Error('圖層或物件 ID 無效或重複');seen.add(item.id);const owner=owners.get(item.id);if(owner&&bridge.contains?.(owner)&&!replacing.has(owner))throw Error('此 ID 已屬於其他物件，不能覆蓋其身份')}
 M().inspectLayer(data);for(const kind of ['stroke','fill'])if(data[kind]){const inspected=M().inspect({type:'point',point:[0,0],[kind]:data[kind]});if(inspected.issues.some(issue=>issue.severity==='error'))throw Error(inspected.issues.map(issue=>issue.message).join('；'))}
 return {...data,items};
}
function decodeLayer(input,group){
 const data=checkLayer(input,group),next=group.cloneNode(false);next.setAttribute('data-layer-type',{art:'artwork',vect:'vector',pcb:'pcb'}[data.type]);next.setAttribute('data-model-id',data.id||attr(group,'data-model-id')||ids().next());next.setAttribute('data-name',data.name||'');next.setAttribute('display',data.hiden?'none':'inline');next.style?.removeProperty?.('display');
 next.setAttribute('data-model-layer',encodeURIComponent(root.ChipJson.stringify(data)));
 for(const kind of ['stroke','fill']){next.removeAttribute('data-default-'+kind);if(data[kind]?.color)next.setAttribute('data-default-'+kind,data[kind].color)}if(data.type==='pcb'&&data.stroke?.color)next.setAttribute('color',data.stroke.color);
 for(const [i,item]of data.items.entries())next.append(decodeObject(item,group.children[i],data));return next;
}
function adopt(tree){for(const node of tree.querySelectorAll('g,line,rect,circle,ellipse,polyline,polygon,path'))initialize(node)}
function capture(nodes){for(const node of nodes){const data=record(node);if(data)stash(node,data);initialize(node)}}
function diagnostics(nodes){return [...nodes].flatMap((node,index)=>M().inspect(encodeObject(node),{layer:layer(node)}).issues.map(issue=>({...issue,index})))}
function encodeLayers(groups){return {units_system:{...M().defaultUnits},layers:[...groups].map(encodeLayer)}}
function sceneSignature(nodes){function shape(node){return {...view(node),children:[...node.children].map(shape)}}return JSON.stringify([...nodes].map(shape))}
function dimensions(node,width,height){const raw=record(node);if(raw?.type!=='rect')return;if(M().rectRefs[raw.reference||'top-left'])stash(node,{...raw,width:quantity(width),height:quantity(height)});else if(raw.points&&M().rectAnchors[raw.reference]){const first=raw.points[0],offset=M().rotate([raw.reference==='top-right-bottom-left'?-width:width,-height],raw.rotation||0);stash(node,{...raw,points:[first,[first[0]+offset[0],first[1]+offset[1]]]})}}
function circle(node,center,radius){const raw=record(node);if(raw?.type==='circle'&&['center-radius','center-diameter'].includes(raw.reference||'center-radius')){raw.point=[quantity(center.x),quantity(-center.y)];raw[raw.reference==='center-diameter'?'diameter':'radius']=quantity(radius)*(raw.reference==='center-diameter'?2:1);stash(node,raw)}}
function describe(node){const raw=record(node);return raw?{...M().inspect(raw,{layer:layer(node)}),layer:layer(node)}:null}
root.ChipDrawingJson={configure,initialize,record,encode,validate,check,decode,project,create,update,arcVector,encodeLayer,checkLayer,decodeLayer,adopt,capture,diagnostics,describe,dimensions,circle,encodeLayers,sceneSignature};
})(globalThis);
