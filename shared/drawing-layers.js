/* SVG layer groups shared by vector drawing surfaces. */
(function(root){
'use strict';
function create({art,beforeChange=()=>{},changed=()=>{}}){
 const groups=()=>[...art.children].filter(n=>n.getAttribute('data-drawing-layer')!==null);
 function normalize(){let all=groups();if(!all.length){const g=document.createElementNS('http://www.w3.org/2000/svg','g');g.setAttribute('data-drawing-layer','layer-1');g.setAttribute('data-name','圖層 1');for(const n of [...art.children])g.append(n);art.append(g);all=[g]}for(const n of [...art.children])if(!all.includes(n))all[0].append(n);const current=all.find(n=>n.getAttribute('data-active')==='true')||all[0];for(const n of all)n.setAttribute('data-active',String(n===current));return current}
 function active(){return groups().find(n=>n.getAttribute('data-active')==='true')||normalize()}
 function owner(node){while(node&&node.parentNode!==art)node=node.parentNode;return groups().includes(node)?node:null}
 function editable(group=active()){return !!group&&group.getAttribute('display')!=='none'&&group.getAttribute('data-locked')!=='true'}
 function activate(group){if(!groups().includes(group))return;for(const n of groups())n.setAttribute('data-active',String(n===group));changed()}
 function add({type='vector',role='',name=''}={}){if(!['artwork','pcb','vector'].includes(type))return null;if(type==='pcb'&&!role)return null;if(type==='pcb'&&!['drill','mill'].includes(role)&&groups().some(n=>n.getAttribute('data-layer-type')==='pcb'&&n.getAttribute('data-pcb-role')===role))return null;beforeChange();let index=1;const ids=groups().map(n=>n.getAttribute('data-drawing-layer'));while(ids.includes('layer-'+index))index++;const g=document.createElementNS('http://www.w3.org/2000/svg','g');g.setAttribute('data-drawing-layer','layer-'+index);g.setAttribute('data-name',name||(type==='artwork'?'美工圖層 ':type==='vector'?'矢線層 ':'印刷電路層 ')+index);g.setAttribute('data-layer-type',type);if(role)g.setAttribute('data-pcb-role',role);art.append(g);activate(g);return g}
 function rename(name,group=active()){if(!name||!name.trim())return;beforeChange();group.setAttribute('data-name',name.trim());changed()}
 function selectable(group){return editable(group)&&group.getAttribute('data-filtered')!=='true'}
 function toggle(group,kind){if(!groups().includes(group))return;beforeChange();if(kind==='visible')group.setAttribute('display',group.getAttribute('display')==='none'?'inline':'none');else{const attr=kind==='filtered'?'data-filtered':'data-locked';group.setAttribute(attr,String(group.getAttribute(attr)!=='true'));group.setAttribute('pointer-events',group.getAttribute('data-locked')==='true'||group.getAttribute('data-filtered')==='true'?'none':'auto')}changed()}
 function state(kind){const values=groups().map(g=>kind==='visible'?g.getAttribute('display')!=='none':g.getAttribute(kind==='filtered'?'data-filtered':'data-locked')==='true');return values.every(Boolean)?'true':values.every(v=>!v)?'false':'mixed'}
 function setAll(kind,value){if(state(kind)===String(value))return;beforeChange();for(const group of groups())if(kind==='visible')group.setAttribute('display',value?'inline':'none');else{group.setAttribute(kind==='filtered'?'data-filtered':'data-locked',String(value));group.setAttribute('pointer-events',group.getAttribute('data-locked')==='true'||group.getAttribute('data-filtered')==='true'?'none':'auto')}changed()}
 function reorder(direction){const all=groups(),g=active(),i=all.indexOf(g),j=i+direction;if(j<0||j>=all.length)return;beforeChange();[all[i],all[j]]=[all[j],all[i]];for(const n of all)art.append(n);changed()}
 function reorderTo(group,index){const all=groups(),old=all.indexOf(group);if(old<0||index<0||index>=all.length||old===index)return;beforeChange();all.splice(old,1);all.splice(index,0,group);for(const n of all)art.append(n);changed()}
 function remove(group=active()){if(groups().length<2||!groups().includes(group))return false;beforeChange();group.remove();normalize();changed();return true}
 function move(node,id){const destination=groups().find(n=>n.getAttribute('data-drawing-layer')===id);if(!node||!owner(node)||!destination||!editable(destination)||!editable(owner(node))||node.parentNode===destination)return false;beforeChange();destination.append(node);activate(destination);return true}
 normalize();return {groups,active,owner,editable,selectable,normalize,activate,add,rename,toggle,state,setAll,reorder,reorderTo,remove,move};
}
function createSelection({candidates,allowed,bounds}){
 let items=[];
 function replace(nodes){items=[...new Set(nodes)].filter(n=>allowed(n));return items}
 function prune(){return replace(items)}
 function pick(node,additive=false){prune();if(!node){if(!additive)items=[];return items}if(!allowed(node))return items;if(additive){items=items.includes(node)?items.filter(n=>n!==node):[...items,node]}else if(!items.includes(node))items=[node];return items}
 function box(rect,additive=false){const found=candidates().filter(n=>{if(!allowed(n))return false;const b=bounds(n);return b.left>=rect.left&&b.right<=rect.right&&b.top>=rect.top&&b.bottom<=rect.bottom});return replace(additive?[...items,...found]:found)}
 return {replace,prune,pick,box,clear:()=>{items=[]},get items(){return [...items]},get primary(){return items.at(-1)||null}};
}
function selectionGeometry(node,{overflow=3}={}){
 const points=[];
 function collect(n){if(n.children?.length){for(const child of n.children)collect(child);return}try{const m=n.getScreenCTM(),style=getComputedStyle(n),width=style.stroke==='none'?0:parseFloat(style.strokeWidth)||0,screenStroke=style.vectorEffect==='non-scaling-stroke',rx=width/2*(screenStroke?1:Math.hypot(m.a,m.c))+overflow,ry=width/2*(screenStroke?1:Math.hypot(m.b,m.d))+overflow,length=n.getTotalLength(),count=Math.max(2,Math.min(512,Math.ceil(length/4)));for(let i=0;i<=count;i++){const p=n.getPointAtLength(length*i/count),x=m.a*p.x+m.c*p.y+m.e,y=m.b*p.x+m.d*p.y+m.f;for(let j=0;j<16;j++){const a=j*Math.PI/8;points.push({x:x+rx*Math.cos(a),y:y+ry*Math.sin(a)})}}}catch{const b=n.getBoundingClientRect();points.push({x:b.left-overflow,y:b.top-overflow},{x:b.right+overflow,y:b.top-overflow},{x:b.right+overflow,y:b.bottom+overflow},{x:b.left-overflow,y:b.bottom+overflow})}}
 collect(node);points.sort((a,b)=>a.x-b.x||a.y-b.y);const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x),half=values=>{const h=[];for(const p of values){while(h.length>1&&cross(h.at(-2),h.at(-1),p)<=0)h.pop();h.push(p)}return h},lower=half(points),upper=half([...points].reverse()),hull=lower.slice(0,-1).concat(upper.slice(0,-1));return {points:hull,left:points.reduce((v,p)=>Math.min(v,p.x),Infinity),top:points.reduce((v,p)=>Math.min(v,p.y),Infinity),right:points.reduce((v,p)=>Math.max(v,p.x),-Infinity),bottom:points.reduce((v,p)=>Math.max(v,p.y),-Infinity)};
}
function roundedOutline(points){if(points.length<3)return '';const toward=(p,q)=>{const distance=Math.hypot(q.x-p.x,q.y-p.y),t=Math.min(.5,6/Math.max(distance,1e-9));return {x:p.x+(q.x-p.x)*t,y:p.y+(q.y-p.y)*t}};let path='';for(let i=0;i<points.length;i++){const p=points[i],a=toward(p,points[(i+points.length-1)%points.length]),b=toward(p,points[(i+1)%points.length]);path+=(i?' L ':'M ')+a.x+' '+a.y+' Q '+p.x+' '+p.y+' '+b.x+' '+b.y}return path+' Z'}
root.ChipDrawingLayers={create,createSelection,selectionGeometry,roundedOutline};
})(globalThis);
