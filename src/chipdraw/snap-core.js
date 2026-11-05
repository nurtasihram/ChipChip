/* Pure candidate geometry and distance resolution for the ChipDraw snap prototype. */
(function(root){
'use strict';
const finite=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
function nearestPoint(p,a,b){const x=b.x-a.x,y=b.y-a.y,length=x*x+y*y,t=length?Math.max(0,Math.min(1,((p.x-a.x)*x+(p.y-a.y)*y)/length)):0;return {x:a.x+t*x,y:a.y+t*y}}
function intersection(a,b,c,d){const rx=b.x-a.x,ry=b.y-a.y,sx=d.x-c.x,sy=d.y-c.y,den=rx*sy-ry*sx;if(Math.abs(den)<1e-12)return null;const qx=c.x-a.x,qy=c.y-a.y,t=(qx*sy-qy*sx)/den,u=(qx*ry-qy*rx)/den;if(t<0||t>1||u<0||u>1)return null;return {x:a.x+t*rx,y:a.y+t*ry}}
// Nearest grid queries are bounded independently of density and search diameter.
// The drawing camera uses uniform zoom, rotation and reflection.
function nearestGrid({point,spacing,angle=null,retain=[]}){
 const result=new Map(),add=(id,x,y)=>result.set(id,{type:'grid',id,point:{x,y},source:'格線',label:x===0&&y===0?'原點':'格點'});
 if(angle===null){
  if(!(spacing.x>0&&spacing.y>0))return [];
  const x=point.x/spacing.x,y=point.y/spacing.y;
  for(const i of new Set([Math.floor(x),Math.ceil(x)]))for(const j of new Set([Math.floor(y),Math.ceil(y)]))add('grid:'+i+':'+j,i*spacing.x,j*spacing.y);
 }else{
  if(!(spacing.r>0&&angle>0))return [];
  const count=Math.ceil(2*Math.PI/angle),theta=(Math.atan2(-point.y,point.x)+2*Math.PI)%(2*Math.PI),index=theta/angle;
  add('polar:0:0',0,0);
  for(const i of new Set([0,count-1,Math.min(count-1,Math.floor(index)),Math.min(count-1,Math.ceil(index))])){
   const c=Math.cos(i*angle),s=-Math.sin(i*angle),r=Math.max(0,(point.x*c+point.y*s)/spacing.r);
   for(const ring of new Set([Math.floor(r),Math.ceil(r)]))if(ring>0)add('polar:'+ring+':'+i,ring*spacing.r*c,ring*spacing.r*s);
  }
 }
 // Preserve explicit previous targets for lock hysteresis and overlap selection.
 for(const id of retain){if(typeof id!=='string')continue;const [kind,a,b]=id.split(':'),i=Number(a),j=Number(b);if(!Number.isFinite(i)||!Number.isFinite(j))continue;
  if(angle===null&&kind==='grid')add(id,i*spacing.x,j*spacing.y);
  else if(angle!==null&&kind==='polar'&&i>=0&&j>=0&&j<Math.ceil(2*Math.PI/angle))add(id,i*spacing.r*Math.cos(j*angle),-i*spacing.r*Math.sin(j*angle));
 }
 return [...result.values()];
}
// Enumerate only the requested nearest lattice points, independent of search area.
function gridCandidates({point,spacing,radius,count,retain=[]}){
 const heap=[],seen=new Set(),result=[];if(!(spacing.x>0&&spacing.y>0&&radius>0&&count>0))return result;
 function push(x,y){const id='grid:'+x+':'+y;if(seen.has(id))return;seen.add(id);const p={x:x*spacing.x,y:y*spacing.y},entry={id,point:p,d:Math.hypot(p.x-point.x,p.y-point.y)};if(entry.d>radius)return;let i=heap.length;heap.push(entry);while(i){const parent=(i-1)>>1;if(heap[parent].d<=entry.d)break;heap[i]=heap[parent];i=parent}heap[i]=entry}
 function pop(){const first=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let child=i*2+1;if(child+1<heap.length&&heap[child+1].d<heap[child].d)child++;if(heap[child].d>=last.d)break;heap[i]=heap[child];i=child}heap[i]=last}return first}
 push(Math.round(point.x/spacing.x),Math.round(point.y/spacing.y));while(heap.length&&result.length<count){const p=pop();result.push({type:'grid',id:p.id,point:p.point,source:'格線',label:p.point.x===0&&p.point.y===0?'原點':'格點'});const [,x,y]=p.id.split(':');push(+x-1,+y);push(+x+1,+y);push(+x,+y-1);push(+x,+y+1)}
 for(const c of nearestGrid({point,spacing,retain}))if(retain.includes(c.id)&&!result.some(r=>r.id===c.id))result.push(c);return result;
}
// Reusable world-space BVH. Queries expand from the cursor in lower-bound
// distance order; once the next region cannot beat the hit, traversal stops.
function spatialIndex(items){
 const bounds=item=>item.point?{minX:item.point.x,maxX:item.point.x,minY:item.point.y,maxY:item.point.y}:{minX:Math.min(item.a.x,item.b.x),maxX:Math.max(item.a.x,item.b.x),minY:Math.min(item.a.y,item.b.y),maxY:Math.max(item.a.y,item.b.y)};
 function build(entries){if(!entries.length)return null;const box={minX:Infinity,minY:Infinity,maxX:-Infinity,maxY:-Infinity};for(const e of entries){box.minX=Math.min(box.minX,e.box.minX);box.minY=Math.min(box.minY,e.box.minY);box.maxX=Math.max(box.maxX,e.box.maxX);box.maxY=Math.max(box.maxY,e.box.maxY)}if(entries.length===1)return {...box,item:entries[0].item};const axis=box.maxX-box.minX>=box.maxY-box.minY?'X':'Y';entries.sort((a,b)=>(a.box['min'+axis]+a.box['max'+axis])-(b.box['min'+axis]+b.box['max'+axis]));const mid=entries.length>>1;return {...box,left:build(entries.slice(0,mid)),right:build(entries.slice(mid))}}
 const root=build(items.filter(item=>item.point?finite(item.point):finite(item.a)&&finite(item.b)).map(item=>({item,box:bounds(item)})));
 function range(box,visit){const stack=root?[root]:[];while(stack.length){const n=stack.pop(),b=typeof box==='function'?box():box;if(n.maxX<b.minX||n.minX>b.maxX||n.maxY<b.minY||n.minY>b.maxY)continue;if(n.item)visit(n.item);else stack.push(n.left,n.right)}}
 function search({point,radius,seeds=[],accept=()=>true,evaluate=item=>[item],overlap=0,stats={},count=1}){
  let best=radius,hits=[];stats.visited=0;stats.evaluated=0;if(!finite(point)||!Number.isFinite(radius)||radius<=0)return [];
  const offer=c=>{if(!finite(c?.point))return;const d=Math.hypot(c.point.x-point.x,c.point.y-point.y);if(d>radius||d>best+overlap)return;if(count===1){if(d<best){best=d;hits=hits.filter(h=>Math.hypot(h.point.x-point.x,h.point.y-point.y)<=best+overlap)}hits.push(c)}else{if(hits.some(h=>h.id===c.id))return;hits.push(c);hits.sort((a,b)=>Math.hypot(a.point.x-point.x,a.point.y-point.y)-Math.hypot(b.point.x-point.x,b.point.y-point.y));if(hits.length>=count){best=Math.hypot(hits[count-1].point.x-point.x,hits[count-1].point.y-point.y);hits=hits.filter(h=>Math.hypot(h.point.x-point.x,h.point.y-point.y)<=best+overlap)}}};
  seeds.forEach(offer);const heap=[];
  const distance=n=>Math.hypot(Math.max(n.minX-point.x,0,point.x-n.maxX),Math.max(n.minY-point.y,0,point.y-n.maxY));
  function push(n){if(!n)return;const entry={node:n,d:distance(n)};if(entry.d>Math.min(radius,best+overlap))return;let i=heap.length;heap.push(entry);while(i){const parent=(i-1)>>1;if(heap[parent].d<=entry.d)break;heap[i]=heap[parent];i=parent}heap[i]=entry}
  function pop(){const first=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let child=i*2+1;if(child+1<heap.length&&heap[child+1].d<heap[child].d)child++;if(heap[child].d>=last.d)break;heap[i]=heap[child];i=child}heap[i]=last}return first}
  push(root);while(heap.length){const {node:n,d}=pop();if(d>Math.min(radius,best+overlap))break;stats.visited++;if(n.item){if(!accept(n.item))continue;stats.evaluated++;for(const c of evaluate(n.item,()=>Math.min(radius,best+overlap),offer)||[])offer(c)}else{push(n.left);push(n.right)}}
  stats.distance=hits.length?best:null;return [...new Map(hits.map(c=>[c.id,c])).values()];
 }
 return {range,search};
}
function resolve({point,candidates,enabledTypes,priority,tolerance=10,previous=null,screen=p=>p}){
 if(!finite(point)||!Number.isFinite(tolerance)||tolerance<=0)return null;
 const allowed=new Set(enabledTypes||priority||[]),cursor=screen(point);let best=null,held=null;
 for(const candidate of candidates){if(!finite(candidate.point)||!allowed.has(candidate.type))continue;const q=screen(candidate.point),distance=Math.hypot(q.x-cursor.x,q.y-cursor.y);if(!Number.isFinite(distance))continue;const hit={...candidate,distance};if(candidate.id===previous&&distance<=tolerance)held=hit;if(distance<=tolerance&&(!best||distance<best.distance))best=hit}
 // Preserve the previous target only in a narrow screen-space tie band.
 const tieBand=Math.min(2,tolerance*.2);
 return held&&(!best||held.distance<=best.distance+tieBand)?held:best;
}
function nearby({point,candidates,enabledTypes,priority,tolerance=10,screen=p=>p,sort=true}){
 if(!finite(point)||!Number.isFinite(tolerance)||tolerance<=0)return [];
 const allowed=new Set(enabledTypes||priority||[]),cursor=screen(point);
 const hits=candidates.filter(c=>finite(c.point)&&allowed.has(c.type)).map(c=>{const q=screen(c.point);return {...c,distance:Math.hypot(q.x-cursor.x,q.y-cursor.y)}}).filter(c=>Number.isFinite(c.distance)&&c.distance<=tolerance);
 return sort?hits.sort((a,b)=>a.distance-b.distance):hits;
}
root.ChipSnap={nearestPoint,nearestGrid,gridCandidates,spatialIndex,intersection,resolve,nearby};
})(globalThis);
