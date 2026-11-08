(function(root){
'use strict';
const definitions=[
 {key:'linecap',label:'端頭',help:'開放線條的端頭形狀；閉合圖形沒有端頭。獨立點保留圓頭。',items:[['butt','平頭'],['round','圓頭'],['square','外伸方頭']]},
 {key:'linejoin',label:'接角',help:'相鄰線段的接角形狀；圓角接角不改變圖形本身的幾何圓角。',items:[['miter','尖角'],['round','圓角'],['bevel','削角']]}
];
function icon(key,value){
 const cap=key==='linecap',d=cap?'M-8 12H15':'M-4 30 12 10 28 30';
 // Zoom into the end / apex: distant segment ends would only shrink the
 // distinction at the option model's shared 22 px icon size.
 const shape='<path d="'+d+'" stroke="currentColor" stroke-width="'+(cap?12:10)+'" stroke-linecap="'+(cap?value:'butt')+'" stroke-linejoin="'+(cap?'miter':value)+'"/>';
 const axis='<path d="'+d+'" stroke="#101d30" stroke-width="1.2"/>';
 const reference=cap?'<path d="M15 2V5M15 19V22" stroke="#ffc66d" stroke-width="1.5"/><circle cx="15" cy="12" r="1.4" fill="#101d30"/>':'<circle cx="12" cy="10" r="1.3" fill="#101d30"/>';
 return '<svg class="tool-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" overflow="hidden">'+shape+axis+reference+'</svg>';
}
// Decode native SVG number lists, not localized measurement input. Values are
// already in the drawing's canonical mm coordinate system.
function inherited(node,key){for(let n=node;n;n=n.parentNode){const value=n.getAttribute?.(key);if(value!==null&&value!==undefined)return value}return null}
function readDash(node){
 const text=(inherited(node,'stroke-dasharray')||'none').trim(),tokens=text.trim().split(/[\s,]+/),values=tokens.map(Number),supported=text==='none'||tokens.every(v=>v!==''&&Number.isFinite(Number(v))&&Number(v)>=0);
 const pattern=text==='none'?null:supported?values:null,offsetText=inherited(node,'stroke-dashoffset')||'0',offset=Number(offsetText);
 return {pattern,supported,solid:text==='none'||supported&&values.every(v=>v===0),length:pattern?.[0]??4,gap:pattern?.[1]??pattern?.[0]??2,offset:Number.isFinite(offset)?offset:null};
}
function dashStyle(data){return {'stroke-dasharray':data.pattern?data.pattern.join(' '):'none','stroke-dashoffset':data.offset}}
function mountDash({host,targets,defaults,locked,isPoint,beforeChange,changed}){
 let visible=true,canEdit=true;const controls=new Map(),settings=defaults.dash;
 const section=document.createElement('div');section.id='objectStrokeDashSection';section.className='ui-parameter-section';section.setAttribute('role','group');section.setAttribute('aria-label','線型參數');host.append(section);
 const row=document.createElement('div');row.className='stroke-shape-row';const caption=document.createElement('span');caption.textContent='線型';const choices=document.createElement('div');choices.id='objectStrokeDash';choices.setAttribute('aria-label','描邊線型');row.append(caption,choices);section.append(row);const widthRow=document.getElementById('objectStrokeWidthRow');if(widthRow)section.append(widthRow);
 function state(){const nodes=targets();return nodes.length?nodes.map(readDash):[{...settings,supported:true,solid:!settings.pattern}]}
 function editable(){const nodes=targets();return visible&&canEdit&&!nodes.some(locked)&&(!nodes.length||nodes.some(n=>!isPoint(n)))}
 function commit(key,value){
  if(!editable()){refresh();return}
  const nodes=targets().filter(n=>!isPoint(n)),values=state();
  if(['length','gap'].includes(key)&&values.some(s=>value+(key==='length'?s.gap:s.length)===0)){error.textContent='實長與空長不可同時為 0。';error.hidden=false;refresh();return}
  error.textContent='';error.hidden=true;
  if(nodes.length){beforeChange();for(const node of nodes){const data=readDash(node);if(key==='offset')node.setAttribute('stroke-dashoffset',value);else if(key==='mode')node.setAttribute('stroke-dasharray',value==='solid'?'none':data.supported&&!data.solid?data.pattern.join(' '):[settings.length,settings.gap].join(' '));else{data[key]=value;node.setAttribute('stroke-dasharray',[data.length,data.gap].join(' '))}}}
  else if(key==='offset')settings.offset=value;
  else if(key==='mode')settings.pattern=value==='solid'?null:[settings.length,settings.gap];
  else{settings[key]=value;settings.pattern=[settings.length,settings.gap]}
  changed();
 }
 const model=ChipUI.optionModel(choices,{mode:'single',selected:['solid'],items:[['solid','實線',''],['dashed','虛線','stroke-dasharray="6 4"']].map(([id,label,dash])=>({id,label,icon:'<svg class="tool-icon" viewBox="0 0 32 28" aria-hidden="true"><path d="M2 14H30" fill="none" stroke="currentColor" stroke-width="3" '+dash+'/></svg>'})),onChange:values=>{if(values[0])commit('mode',values[0])}});
 const details=document.createElement('div');details.id='objectStrokeDashDetails';section.append(details);
 for(const [key,id,label]of [['length','objectStrokeDashLength','實長'],['gap','objectStrokeDashGap','空長'],['offset','objectStrokeDashOffset','偏移']]){
  const row=document.createElement('div');row.className='stroke-dash-field';const caption=document.createElement('label');caption.textContent=label;caption.htmlFor=id;const field=document.createElement('span');field.setAttribute('aria-label',label);row.append(caption,field);details.append(row);
  const control=ChipUI.physicalQuantityComponent(field,{id,value:settings[key],min:key==='offset'?null:0,onChange:q=>commit(key,q.value)});controls.set(key,control);
 }
 const hint=document.createElement('span');hint.id='objectStrokeDashHint';details.append(hint);const error=document.createElement('output');error.id='objectStrokeDashError';error.hidden=true;error.setAttribute('role','status');details.append(error);
 function refresh(nextVisible=visible,nextCanEdit=canEdit){
  visible=nextVisible;canEdit=nextCanEdit;section.hidden=!visible;const values=state(),disabled=!editable(),same=key=>values.every(s=>s[key]===values[0][key]),modes=values.map(s=>s.solid?'solid':'dashed');model.setSelected(modes.every(v=>v===modes[0])?[modes[0]]:[]);choices.dataset.mixed=String(!modes.every(v=>v===modes[0]));details.hidden=values.some(s=>s.solid);
  for(const button of choices.querySelectorAll('button'))button.disabled=disabled;
  for(const [key,control]of controls){const mixed=!same(key)||values.some(s=>key==='offset'?s.offset===null:!s.supported);control.refresh(values[0][key]??0);control.setDisabled(disabled||values.every(s=>s.solid)||key!=='offset'&&values.some(s=>!s.supported));control.input.title=mixed?'多種值或外部 SVG 長度格式；修改將套用至選取物件':'';if(key!=='offset'&&values.some(s=>s.pattern&&s.pattern.length>2))control.input.title='多段虛線：顯示首組長度；修改長度會改為重複單組。';control.input.placeholder=mixed?'多種值':'';if(mixed){control.input.value='';delete control.input.dataset.rawValue;delete control.input.dataset.formattedValue}}
  hint.hidden=!values.some(s=>!s.supported);
  hint.textContent=values.some(s=>!s.supported)?'外部 SVG 樣式保留原值；選擇「虛線」可改用可編輯的長度。':values.some(s=>s.pattern&&s.pattern.length>2)?'多段虛線：顯示首組長度；修改長度會改為重複單組。':'長度以路徑中心線計算，圓頭／方頭會外伸。實長與空長不可同時為 0；偏移可為負數。';
 }
 for(const type of ['measurementdisplaychange','languagechange'])window.addEventListener(type,()=>refresh());
 return {refresh};
}
function mount({host,targets,defaults,read,locked,isPoint,isClosed,beforeChange,changed}){
 const controls=[];let lastVisible=true,lastCanEdit=true;
 const dash=mountDash({host,targets,defaults,locked,isPoint,beforeChange,changed});
 for(const definition of definitions){const row=document.createElement('div');row.className='stroke-shape-row';row.id='objectStroke'+(definition.key==='linecap'?'Cap':'Join')+'Row';const caption=document.createElement('span');caption.textContent=definition.label;caption.title=definition.help;const options=document.createElement('div');options.id=definition.key==='linecap'?'objectStrokeCap':'objectStrokeJoin';options.setAttribute('aria-label','描邊'+definition.label);row.append(caption,options);host.append(row);
  const model=ChipUI.optionModel(options,{mode:'single',selected:[defaults[definition.key]],items:definition.items.map(([id,label])=>({id,label:definition.label+'：'+label,icon:icon(definition.key,id)})),onChange:values=>{const value=values[0],nodes=targets();if(!value||!lastVisible||!lastCanEdit||nodes.some(locked)){refresh();return}const editable=nodes.filter(n=>!isPoint(n));if(nodes.length&&!editable.length){refresh();return}if(nodes.length){beforeChange();for(const node of editable)node.setAttribute('stroke-'+definition.key,value)}else defaults[definition.key]=value;changed()}});
  controls.push({definition,row,options,model});
 }
 function refresh(visible=lastVisible,canEdit=lastCanEdit){lastVisible=visible;lastCanEdit=canEdit;dash.refresh(visible,canEdit);const nodes=targets();for(const {definition,row,options,model}of controls){row.hidden=!visible;const values=nodes.map(n=>read(n,'stroke-'+definition.key)|| (definition.key==='linecap'?'butt':'miter')),unique=[...new Set(values)];model.setSelected(nodes.length?unique.length===1?unique:[]:[defaults[definition.key]]);options.dataset.mixed=String(unique.length>1);options.title=unique.length>1?'多種值；選擇後統一套用':definition.help;const disabled=!canEdit||nodes.some(locked)||nodes.length>0&&nodes.every(n=>isPoint(n)||definition.key==='linecap'&&isClosed(n));for(const button of options.querySelectorAll('button'))button.disabled=disabled}}
 return {refresh};
}
root.ChipStrokeProperties={mount,readDash,dashStyle};
})(globalThis);
