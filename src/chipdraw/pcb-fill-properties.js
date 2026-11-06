/* PCB pour properties and schematic preview. Geometry generation is separate. */
(function(root){
'use strict';
const enums={style:['solid','hatched'],hatch:['cross90','cross45','horizontal','vertical'],};
const quantities={islandArea:[1.613,'mm2'],arcApprox:[.013,'mm'],neckWidth:[.2,'mm'],trackWidth:[.203,'mm'],gridX:[.508,'mm'],gridY:[.508,'mm'],minPrimitive:[.076,'mm']};
const flags=['removeIslands','removeNecks','obeyRules','obeyCutout','removeDeadCopper','optimalVoidRotation'];
function read(node,attribute='data-pcb-fill'){
 let saved={};try{saved=JSON.parse(node?.getAttribute(attribute)||'{}')||{}}catch{}
 const data={version:2};for(const [key,values]of Object.entries(enums))data[key]=values.includes(saved[key])?saved[key]:values[0];for(const key of flags)data[key]=saved[key]===true;
 for(const [key,[value,unit]]of Object.entries(quantities)){const q=saved[key]||(['gridX','gridY'].includes(key)?saved.gridSize:null);data[key]=q&&q.unit===unit&&Number.isFinite(q.value)&&q.value>=0?ChipUI.measurements.archiveQuantity(q):{value,unit}}
 data.gridLinked=saved.gridLinked!==false;const legacy={cross90:['horizontal','vertical'],cross45:['diagonalUp','diagonalDown'],horizontal:['horizontal'],vertical:['vertical']}[data.hatch];data.directions=Object.fromEntries(['horizontal','vertical','diagonalUp','diagonalDown'].map(key=>[key,saved.directions? saved.directions[key]===true:legacy.includes(key)]));delete data.hatch;return data;
}
function gridIcon(data){const directions=data.directions||read(null).directions,active=Object.keys(directions).filter(key=>directions[key]);let lines='';const add=(a,b)=>{const clipped=ChipViewport.clipLine(a,b,{x:4,y:4,right:20,bottom:20});if(clipped)lines+='<path d="M '+clipped[0].x+' '+clipped[0].y+' L '+clipped[1].x+' '+clipped[1].y+'"/>'};for(let n=4;n<=20;n+=4){if(directions.horizontal)add({x:4,y:n},{x:20,y:n});if(directions.vertical)add({x:n,y:4},{x:n,y:20})}for(let n=-12;n<=36;n+=6){if(directions.diagonalUp)add({x:4,y:n},{x:20,y:n-16});if(directions.diagonalDown)add({x:4,y:n},{x:20,y:n+16})}return '<svg class="tool-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="1"/><g data-grid-directions="'+active.join(' ')+'">'+lines+'</g></svg>'}
function mount({host,targets,beforeChange,changed}){
 const section=document.createElement('section');section.id='pcbFillProperties';section.hidden=true;host.append(section);
 section.innerHTML='<div id="pcbFillSpecific"></div><div class="pcb-fill-common"><label class="pcb-fill-check"><input type="checkbox" id="pcbFillRemoveDeadCopper">移除死銅</label><label class="pcb-fill-check"><input type="checkbox" id="pcbFillOptimalVoidRotation">最佳化避空旋轉</label></div>';
 const find=id=>section.querySelector('#'+id),specific=find('pcbFillSpecific'),controls=new Map(),checks=new Map(),rows=new Map();let enabled=false;
 function state(){const target=targets()[0];return read(target?.node,target?.attribute)}
 function commit(patch){if(!enabled)return;const all=targets();if(!all.length||all.some(t=>t.locked))return;beforeChange();for(const t of all)t.node.setAttribute(t.attribute,JSON.stringify({...read(t.node,t.attribute),...patch}));changed();refresh(true)}
 function checkbox(key,label,parent=specific){const row=document.createElement('label');row.className='pcb-fill-check';const input=document.createElement('input');input.type='checkbox';input.id='pcbFill'+key[0].toUpperCase()+key.slice(1);const caption=document.createElement('span');caption.textContent=label;row.append(input,caption);parent.append(row);input.addEventListener('change',()=>commit({[key]:input.checked}));checks.set(key,input);return row}
 function quantity(key,label,{check=null}={}){const row=document.createElement('div');row.className='pcb-fill-row';const caption=document.createElement('label');caption.textContent=label;caption.htmlFor='pcbFill'+key;row.append(caption);if(check){const toggle=document.createElement('input');toggle.type='checkbox';toggle.id='pcbFill'+check;toggle.setAttribute('aria-label',label);caption.htmlFor=toggle.id;caption.insertBefore(toggle,caption.firstChild);checks.set(check,toggle);toggle.addEventListener('change',()=>commit({[check]:toggle.checked}))}const field=document.createElement('span');field.setAttribute('aria-label',label);row.append(field);specific.append(row);const component=ChipUI.physicalQuantityComponent(field,{id:'pcbFill'+key,dimension:quantities[key][1]==='mm2'?'area':'length',value:quantities[key][0],onChange:q=>commit({[key]:q})});controls.set(key,{...component,check});rows.set(key,row);return row}
 quantity('islandArea','移除小面積孤島',{check:'removeIslands'});
 quantity('arcApprox','圓弧近似誤差');
 quantity('neckWidth','移除狹頸',{check:'removeNecks'});
 rows.set('obeyRules',checkbox('obeyRules','遵循規則'));
 quantity('trackWidth','線寬');
 const hatchRow=document.createElement('div');hatchRow.className='pcb-fill-hatch';hatchRow.innerHTML='<span>格綫</span><div id="pcbFillHatch" aria-label="格綫"></div>';specific.append(hatchRow);rows.set('hatch',hatchRow);
 const gridRow=document.createElement('div');gridRow.className='pcb-fill-grid';gridRow.innerHTML='<span>間距</span><div id="pcbFillGridAxes" class="pcb-fill-grid-axes" aria-label="X、Y 間距與連動"></div>';specific.append(gridRow);rows.set('grid',gridRow);
 const linkedGrid=ChipUI.linkedPhysicalQuantityComponent(find('pcbFillGridAxes'),{id:'pcbFillGrid',xId:'pcbFillgridX',yId:'pcbFillgridY',x:.508,y:.508,onChange:(axis,q)=>commit(state().gridLinked?{gridX:q,gridY:q}:{[axis==='x'?'gridX':'gridY']:q}),onToggle:()=>{const data=state();commit({gridLinked:!data.gridLinked,...(!data.gridLinked?{gridY:data.gridX}:{})})}});controls.set('gridX',linkedGrid.fields.x);controls.set('gridY',linkedGrid.fields.y);
 quantity('minPrimitive','最小圖元長度');rows.set('obeyCutout',checkbox('obeyCutout','遵循鋪銅挖空'));
 for(const key of ['removeDeadCopper','optimalVoidRotation']){const input=find('pcbFill'+key[0].toUpperCase()+key.slice(1));checks.set(key,input);input.addEventListener('change',()=>commit({[key]:input.checked}))}

 const icon=body=>'<svg class="tool-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">'+body+'</svg>';
 const directions=[['horizontal','水平','M3 12H21'],['vertical','垂直','M12 3V21'],['diagonalUp','斜向上','M4 20L20 4'],['diagonalDown','斜向下','M4 4L20 20']];
 const hatchOptions=ChipUI.optionModel(find('pcbFillHatch'),{mode:'multiple',items:directions.map(([id,label,d])=>({id,label,icon:icon('<path d="'+d+'"/>')})),selected:['horizontal','vertical'],onChange:values=>commit({directions:Object.fromEntries(directions.map(([key])=>[key,values.includes(key)]))})});
 function refresh(visible){enabled=visible;section.hidden=!visible;if(!visible)return;const all=targets(),data=state(),locked=all.some(t=>t.locked),mixed=key=>all.some(t=>JSON.stringify(read(t.node,t.attribute)[key])!==JSON.stringify(data[key]));hatchOptions.setSelected(Object.entries(data.directions).filter(([,on])=>on).map(([key])=>key));linkedGrid.sync({linked:data.gridLinked,disabled:locked});
  for(const [key,row]of rows){const solid=['islandArea','arcApprox','neckWidth','obeyRules'].includes(key),hatch=['grid','hatch'].includes(key);row.hidden=solid?data.style!=='solid':hatch?data.style!=='hatched':data.style==='solid'}
  for(const [key,input]of checks){input.checked=data[key];input.indeterminate=mixed(key);input.disabled=locked}
  for(const [key,field]of controls){field.refresh(data[key].value);field.setDisabled(locked||field.check&&!data[field.check]);field.input.title=mixed(key)?'多種值；修改將套用至選取物件':''}

  for(const button of section.querySelectorAll('[data-option-id]'))button.disabled=locked;
 }
 for(const type of ['measurementdisplaychange','languagechange'])window.addEventListener(type,()=>refresh(enabled));document.addEventListener('change',e=>{if(['unitSelect','unitSystem','lengthPrecision','pixelPrecision','localizedUnitNames'].includes(e.target.id))refresh(enabled)});
 return {refresh,read:state};
}
root.ChipPcbFill={mount,read,gridIcon};
})(globalThis);
