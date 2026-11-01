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
root.ChipDrawingLayers={create};
})(globalThis);
