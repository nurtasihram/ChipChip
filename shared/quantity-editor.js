/* Numeric JS-expression subset: parsed, never eval'd; browser execution lives in a disposable worker. */
(function(root){
'use strict';
function calculate(source,value=0){
 if(source.length>4096)throw Error('算式過長');
 const tokens=source.match(/(?:\d*\.\d+|\d+\.?\d*)(?:e[+-]?\d+)?|Math\.[A-Za-z]+|value|\*\*|[+\-*/%(),]/gi)||[];
 if(tokens.join('')!==source.replace(/\s/g,''))throw Error('只支援數字、value、Math 函式及算術運算');let i=0,depth=0;
 const functions=['abs','ceil','floor','round','trunc','sqrt','cbrt','sin','cos','tan','asin','acos','atan','atan2','log','log2','log10','exp','pow','min','max','hypot','sign'];
 function atom(){if(++depth>100)throw Error('算式巢狀過深');let token=tokens[i++],result;if(token==='+'||token==='-')result=(token==='-'?-1:1)*atom();else if(token==='('){result=expression();if(tokens[i++]!==')')throw Error('括號不匹配')}else if(token==='value')result=value;else if(token?.startsWith('Math.')){const key=token.slice(5);if(['PI','E','LN2','LN10','SQRT2'].includes(key))result=Math[key];else{if(!functions.includes(key)||tokens[i++]!=='(')throw Error('不支援的 Math 函式');const args=[];if(tokens[i]!==')'){do{args.push(expression())}while(tokens[i]===','&&++i)}if(tokens[i++]!==')')throw Error('括號不匹配');result=Math[key](...args)}}else{result=Number(token);if(token===undefined||!Number.isFinite(result))throw Error('需要數字')}depth--;return result}
 const rank={'+':1,'-':1,'*':2,'/':2,'%':2,'**':3};function expression(min=0){let left=atom();while(rank[tokens[i]]>=min){const op=tokens[i++],right=expression(rank[op]+(op==='**'?0:1));left=op==='+'?left+right:op==='-'?left-right:op==='*'?left*right:op==='/'?left/right:op==='%'?left%right:left**right}return left}
 const result=expression();if(i!==tokens.length||!Number.isFinite(result))throw Error('算式結果必須是有限數值');return result;
}
function run(source,value){return new Promise((resolve,reject)=>{if(typeof Worker==='undefined'){reject(Error('此環境不支援背景算式執行'));return}const url=URL.createObjectURL(new Blob(['const calculate='+calculate.toString()+';onmessage=e=>{try{postMessage({value:calculate(e.data.source,e.data.value)})}catch(error){postMessage({error:error.message})}}'],{type:'text/javascript'}));let worker;try{worker=new Worker(url)}catch(error){URL.revokeObjectURL(url);reject(error);return}const timer=setTimeout(()=>finish(Error('算式執行逾時')),2000);function finish(error,result){clearTimeout(timer);worker.terminate();URL.revokeObjectURL(url);error?reject(error):resolve(result)}worker.onmessage=e=>finish(e.data.error?Error(e.data.error):null,e.data.value);worker.onerror=()=>finish(Error('算式執行失敗'));worker.postMessage({source,value})})}
function decimalPair(text){const match=String(text).trim().match(/^([+-]?)(\d*)(?:\.(\d*))?(?:e([+-]?\d+))?$/i);if(!match||!(match[2]||match[3]))throw Error('無效數值');const exponent=Number(match[4]||0)-(match[3]||'').length;if(Math.abs(exponent)>100)throw Error('數值過大');let n=BigInt((match[1]||'')+(match[2]||'0')+(match[3]||'')),d=1n;if(exponent>=0)n*=10n**BigInt(exponent);else d=10n**BigInt(-exponent);return reducePair(n,d)}
function reducePair(n,d){let a=n<0n?-n:n,b=d;while(b){const r=a%b;a=b;b=r}return {numerator:n/(a||1n),denominator:d/(a||1n)}}
function convertPair(pair,from,to){const factors=root.ChipPhysical.lengthFactors;if(!factors[from]||!factors[to])throw Error('此欄位需要物理長度單位');const a=factors[from].map(BigInt),b=factors[to].map(BigInt);return reducePair(pair.numerator*a[0]*b[1],pair.denominator*a[1]*b[0])}

function scalar(value){if(typeof value!=='number'||!Number.isFinite(value))throw Error('需要有限數值');return value}
root.ChipQuantity={scalar,decimalPair,convertPair,calculate,run};
// The native adapter uses its own widgets and omits this DOM implementation.
browserUI: root.ChipQuantity.mount=function mount({unitFor,precision,valueOf,formatValue,formatUnit,allowedPhysicalUnits,lengthUnits=Object.fromEntries(Object.entries(root.ChipPhysical.lengthFactors).map(([code,[n,d]])=>[code,n/d])),setValue,setRational=()=>false}){
 let popup=null,epoch=0;function close(restore=true){epoch++;const owner=restore!==false&&popup?.contains(document.activeElement)?popup.chipOwner:null;if(popup?.chipOwner?.scalarMenuOpen){popup.chipOwner.scalarMenuOpen=false;delete popup.chipOwner.closeScalarMenu;}popup?.remove();popup=null;owner?.focus()}function dispatch(input,value){if(!Number.isFinite(value))throw Error('需要有限數值');const min=input.getAttribute('min'),max=input.getAttribute('max');if(min!==null)value=Math.max(Number(min),value);if(max!==null)value=Math.min(Number(max),value);setValue(input,value,unitFor(input));input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}))}
 function panel(input){close();popup=document.createElement('div');popup.className='quantity-popup';popup.chipOwner=input;popup.setAttribute('data-panel-popup','true');popup.chipClose=()=>close(false);popup.setAttribute('role','dialog');document.body.append(popup);const r=input.getBoundingClientRect();root.ChipUI.placePopup(popup,r.left,r.bottom+5);return popup}
 function button(host,label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;host.append(b);return b}
 function expression(input){const host=panel(input),requestEpoch=epoch,field=document.createElement('input'),error=document.createElement('output');host.classList.add('quantity-expression');const heading=document.createElement('strong');heading.textContent='算式';host.append(heading);field.type='text';field.value=String(valueOf(input));field.setAttribute('aria-label','算式');field.setAttribute('placeholder','例如 2 * Math.PI');error.className='quantity-error';error.setAttribute('role','alert');error.setAttribute('aria-live','assertive');error.hidden=true;host.append(field);const ok=button(host,'確定',async()=>{error.hidden=true;error.textContent='';field.removeAttribute('aria-invalid');ok.disabled=true;ok.setAttribute('aria-busy','true');const timer=setTimeout(()=>ok.classList.add('quantity-busy'),180);try{const result=await run(field.value,valueOf(input));if(requestEpoch!==epoch)return;dispatch(input,result);close()}catch(e){if(requestEpoch!==epoch)return;error.textContent='算式錯誤：'+e.message;error.hidden=false;field.setAttribute('aria-invalid','true');field.focus()}finally{clearTimeout(timer);ok.disabled=false;ok.classList.remove('quantity-busy');ok.removeAttribute('aria-busy')}});button(host,'取消',close);host.append(error);field.addEventListener('keydown',e=>{if(e.key==='Enter'&&!ok.disabled){e.preventDefault();ok.onclick()}});field.focus();field.select()}
 function convert(input){const host=panel(input),unit=unitFor(input),units=unit==='°'||unit==='rad'?{'°':Math.PI/180,rad:1}:['%','‰','‱'].includes(unit)?{'%':.01,'‰':.001,'‱':.0001}:root.ChipUI?.measurements?.unitCandidates('physical-area').includes(unit)?Object.fromEntries(root.ChipUI.measurements.unitCandidates('physical-area').map(code=>[code,root.ChipUI.measurements.unitFactor(code)])):lengthUnits;if(!(unit in units)){host.textContent='此欄位沒有可換算的單位';button(host,'關閉',close);return}const title=document.createElement('div');title.textContent='以其他單位輸入，確認後換回 '+formatUnit(unit);host.append(title);const field=document.createElement('input');field.type='number';field.value=formatValue(valueOf(input),unit);host.append(field);let from=unit,conversionValue=valueOf(input),exact=input.id==='pixelLength'?decimalPair(field.value):null;field.addEventListener('input',()=>{conversionValue=Number(field.value);if(exact)try{exact=decimalPair(field.value)}catch{exact=null}});for(const key of Object.keys(units)){if(units===lengthUnits&&unit!=='px'&&!allowedPhysicalUnits().includes(key))continue;if(input.id==='pixelLength'&&key==='px')continue;button(host,formatUnit(key),()=>{if(exact){exact=convertPair(exact,from,key);field.value=formatValue(Number(exact.numerator)/Number(exact.denominator),key)}else{conversionValue=conversionValue*units[from]/units[key];field.value=formatValue(conversionValue,key)}from=key;for(const b of host.querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.textContent===formatUnit(key)))})}const error=document.createElement('output');error.setAttribute('role','alert');button(host,'確定',()=>{try{if(exact&&setRational(input,convertPair(exact,from,unit))){close();return}dispatch(input,conversionValue*units[from]/units[unit]);close()}catch(e){error.textContent=e.message}});button(host,'取消',close);host.append(error)}

 function navigateMenu(host,keys){
  const items=[...host.querySelectorAll('button')];
  function move(direction){
   const enabled=items.filter(item=>!item.disabled);
   if(!enabled.length)return;
   const index=enabled.indexOf(document.activeElement);
   enabled[(index+direction+enabled.length)%enabled.length].focus();
  }
  items.forEach((item,index)=>{
   item.setAttribute('role','menuitem');item.tabIndex=-1;
   item.dataset.shortcut=keys[index];item.setAttribute('aria-keyshortcuts',keys[index]);
   item.addEventListener('pointermove',e=>{if(e.pointerType!=='touch'&&!item.disabled&&document.activeElement!==item)item.focus();});
  });
  host.addEventListener('wheel',e=>{
   if(!e.deltaY||e.ctrlKey||e.metaKey)return;
   e.preventDefault();e.stopPropagation();move(Math.sign(e.deltaY));
  },{passive:false});
  host.addEventListener('keydown',e=>{
   if(e.isComposing||e.ctrlKey||e.altKey||e.metaKey)return;
   const direction=e.key==='ArrowUp'?-1:e.key==='ArrowDown'?1:0;
   const match=items.find(item=>!item.disabled&&item.dataset.shortcut===e.key.toUpperCase());
   if(!direction&&!match)return;
   e.preventDefault();e.stopPropagation();
   if(direction)move(direction);else if(!e.repeat)match.click();
  });
  items.find(item=>!item.disabled)?.focus();
 }
 function menu(input,x,y){const host=panel(input);host.classList.add('quantity-menu');host.setAttribute('role','menu');host.setAttribute('aria-label','數值操作');for(const action of ['複製','剪切','算式','換算','重置'])button(host,action,async()=>{try{if(action==='算式')expression(input);else if(action==='換算')convert(input);else if(action==='重置'){dispatch(input,Number(input.getAttribute('value')??0));close()}else{await navigator.clipboard.writeText(input.getAttribute('data-quantity')==='true'?input.value:String(valueOf(input)));if(action==='剪切')dispatch(input,0);close()}}catch(e){host.setAttribute('aria-label',e.message);const error=document.createElement('output');error.textContent=e.message;host.append(error)}});host.querySelectorAll('button')[4].classList.add('quantity-reset');navigateMenu(host,['C','X','E','U','R']);root.ChipUI.placePopup(host,x,y)}
 function scalarMenu(input,x,y){
  const host=panel(input), start=input.selectionStart, end=input.selectionEnd, original=input.value;
  input.scalarMenuOpen=true;
  input.closeScalarMenu=()=>{if(popup===host)close(false);};
  host.classList.add('quantity-menu');host.setAttribute('role','menu');
  const english=root.ChipUI.language()==='en';
  const actions=[['cut','剪下','Cut'],['copy','複製','Copy'],['paste','貼上','Paste'],['all','全選','Select all']];
  if(input.chipCommitQuantity)actions.push(['commit','提交量值','Apply quantity']);
  for(const [action,zh,en] of actions){
   const item=button(host,english?en:zh,async()=>{
    try{
     let replacement='';
     if(action==='copy'||action==='cut')await navigator.clipboard.writeText(original.slice(start,end));
     if(action==='paste')replacement=await navigator.clipboard.readText();
     if(popup!==host || !input.isConnected || original!==input.value)return;
     close(false);input.focus();
     if(action==='all')input.select();
     if(action==='commit')input.chipCommitQuantity();
     if(action==='cut'||action==='paste'){
      input.setRangeText(replacement,start,end,'end');
      input.dispatchEvent(new Event('input',{bubbles:true}));
     }
    }catch(error){if(popup===host){const message=document.createElement('output');message.textContent=error.message;host.append(message);}}
   });
   item.setAttribute('role','menuitem');
   item.disabled=(action==='cut'||action==='copy') && start===end;

  }
  navigateMenu(host,['X','C','V','A','S']);root.ChipUI.placePopup(host,x,y);
 }
 function dismissMenuOutside(e){
  if(popup?.classList.contains('quantity-menu')&&!popup.contains(e.target))close(false);
 }
 document.addEventListener('wheel',dismissMenuOutside,{capture:true,passive:true});
 document.addEventListener('scroll',dismissMenuOutside,true);
 window.addEventListener('resize',()=>{if(popup?.classList.contains('quantity-menu'))close(false);});
 function openMenu(input,x,y){if(input.getAttribute('data-scalar')!==null)scalarMenu(input,x,y);else menu(input,x,y);}
 function target(e){if(e.target.closest?.('[data-cycle-unit]'))return null;const n=e.target.closest?.('input')||e.target.closest?.('[data-conversion-component]')?.querySelector('input');return n&&!n.closest('.quantity-popup')&&(n.getAttribute('data-scalar')!==null||['number','range'].includes(n.type)||n.getAttribute('data-quantity')==='true')?n:null}
 document.addEventListener('contextmenu',e=>{const input=target(e);if(!input)return;e.preventDefault();e.stopImmediatePropagation();openMenu(input,e.clientX,e.clientY)},true);
 let press=null;document.addEventListener('pointerdown',e=>{if(popup&&!popup.contains(e.target))close();const input=target(e);if(input&&e.pointerType==='touch'){press={x:e.clientX,y:e.clientY,timer:setTimeout(()=>{openMenu(input,e.clientX,e.clientY);press=null},500)}}},true);function clear(){if(press)clearTimeout(press.timer);press=null}document.addEventListener('pointermove',e=>{if(press&&Math.hypot(e.clientX-press.x,e.clientY-press.y)>8)clear()},true);for(const type of ['pointerup','pointercancel'])document.addEventListener(type,clear,true);document.addEventListener('keydown',e=>{if(e.key==='Escape'){close();clear()}},true);
};
})(globalThis);
/* Physical input model. Settings use the public units_system keys. */
(function(root){
'use strict';
const lengthFactors={km:[1000000,1],m:[1000,1],cm:[10,1],mm:[1,1],um:[1,1000],ft:[1524,5],inch:[127,5],mil:[127,5000]};
const times=['h','min','s','ms','µs','ns'];
const seconds=[[3600,1],[60,1],[1,1],[1,1000],[1,1000000],[1,1000000000]];
const timeCode=u=>u==='us'?'µs':u;
function safe(n){if(!Number.isSafeInteger(n))throw RangeError('超出可精確歸檔的整數範圍');return n;}
function gcd(a,b){a=Math.abs(a);while(b){const r=a%b;a=b;b=r;}return a||1;}
function pair(n,d){
 safe(n);safe(d);if(d<=0)throw RangeError('分母必須為正整數');
 const g=gcd(n,d);return [n/g,d/g];
}
function mul(a,b){
 const g=gcd(a[0],b[1]),h=gcd(b[0],a[1]);
 return pair((a[0]/g)*(b[0]/h),(a[1]/h)*(b[1]/g));
}
function add(a,b){
 const g=gcd(a[1],b[1]);
 return pair(safe(a[0]*(b[1]/g))+safe(b[0]*(a[1]/g)),a[1]*(b[1]/g));
}
function decimal(text){
 const m=/^([+-]?)(\d*)(?:\.(\d*))?(?:e([+-]?\d+))?$/i.exec(String(text).trim());
 if(!m||!(m[2]||m[3]))throw Error('請輸入數值');
 let digits=(m[2]+(m[3]||'')).replace(/^0+/,'');if(!digits)return [0,1];
 let exponent=Number(m[4]||0)-(m[3]||'').length;
 while(digits.endsWith('0')){digits=digits.slice(0,-1);exponent++;}
 const n=safe(Number(digits)*(m[1]==='-'?-1:1));
 return exponent>=0?pair(n*10**exponent,1):pair(n,10**(-exponent));
}
function factor(kind,unit){
 if(kind==='length'||kind==='area'){
  const code=kind==='area'&&unit.endsWith('2')?unit.slice(0,-1):unit;
  if(Object.prototype.hasOwnProperty.call(lengthFactors,code) && (kind==='length'||unit===code+'2'))
   return kind==='length'?lengthFactors[code]:mul(lengthFactors[code],lengthFactors[code]);
 }else if(kind==='time' && times.includes(unit))return seconds[times.indexOf(unit)];
 else if(kind==='angle' && ['°','rad'].includes(unit))return [1,1];
 throw Error('物理量與單位不符：'+unit);
}
// Ratio terms are independent data. Preserve their scale and unit ownership.
function ratioLayout(kind,record){
 const own=key=>Object.prototype.hasOwnProperty.call(record,key);
 if(!own('numerator')||!own('denominator'))throw Error('比例須同時包含分子與分母');
 const common=own('unit'),top=own('numeratorUnit'),bottom=own('denominatorUnit');
 if(top!==bottom || common && top)throw Error('請指定公共單位，或同時指定分子與分母的單位');
 if(kind==='dimensional-ratio'&&!common&&!top)throw Error('量綱比例必須指定單位');
 const units={};
 for(const key of ['unit','numeratorUnit','denominatorUnit']){
  if(!own(key))continue;
  if(typeof record[key]!=='string'||!record[key].trim())throw Error('比例單位須為非空代碼');
  units[key]=record[key];
 }
 return {kind,mode:'ratio',parts:['numerator','denominator'],ratioUnits:units};
}
function ratioValue(fields,spec){
 if(fields.length!==2)throw Error('比例須同時包含分子與分母');
 const terms=fields.map(text=>{
  const exact=decimal(text),value=Number(text);
  const stored=decimal(String(value));
  if(stored[0]!==exact[0]||stored[1]!==exact[1])throw Error('比例項超出可精確保存範圍');
  return value;
 });
 if(terms[1]===0)throw Error('比例分母不能為零');
 return {numerator:terms[0],denominator:terms[1],...spec.ratioUnits};
}
// Public calibration is [[pixel count, physical length], denominator unit].
function pixelLayout(record){
 if(!Array.isArray(record)||record.length!==2||!Array.isArray(record[0])||record[0].length!==2||
    !record[0].every(n=>Number.isSafeInteger(n)&&n>0)||!Object.prototype.hasOwnProperty.call(lengthFactors,record[1]))
  throw Error('pixel_phy 需要兩個正整數及物理長度單位');
 return {kind:'pixel_phy',mode:'ratio',parts:['numerator','denominator'],ratioUnits:{numeratorUnit:'px',denominatorUnit:record[1]},
  units:Object.keys(lengthFactors),unit:record[1]};
}
function convertPixel(record,to){
 const {unit}=pixelLayout(record);
 if(!Object.prototype.hasOwnProperty.call(lengthFactors,to))throw Error('無效長度單位');
 if(to===unit)return record;
 const [pixels,length]=record[0],a=lengthFactors[unit],b=lengthFactors[to];
 const top=[length,a[0],b[1]],bottom=[pixels,a[1],b[0]];
 for(let i=0;i<top.length;i++)for(let j=0;j<bottom.length;j++){
  const divisor=gcd(top[i],bottom[j]);top[i]/=divisor;bottom[j]/=divisor;
 }
 const product=terms=>terms.reduce((n,v)=>safe(n*v),1);
 return [[product(bottom),product(top)],to];
}
function layout(kind,s,chosen,record){
 if(kind==='pixel_phy')return pixelLayout(record);
 if(kind==='scalar-ratio'||kind==='dimensional-ratio')return ratioLayout(kind,record);
 let units,preferred;
 if(kind==='length'||kind==='area'){
  const system=s.length==='british'?'british':'metric';
  units=Object.keys(lengthFactors).filter(u=>['ft','inch','mil'].includes(u)===(system==='british')).map(u=>kind==='area'?u+'2':u);
  preferred=(s.length_approx||(system==='metric'?'mm':'inch'))+(kind==='area'?'2':'');
 }else if(kind==='angle'){units=['°','rad','clock'];preferred=({deg:'°',radius:'rad',clock:'clock'})[s.angle]||'°';}
 else if(kind==='time'){units=times.concat('clock');preferred=timeCode(s.time_approx||'s');}
 else throw Error('未知物理量：'+kind);
 const unit=units.includes(chosen)?chosen:preferred;
 if(!units.includes(unit))throw Error('計量設定的單位無效');
 const precision=s[kind==='area'?'length_precision':kind+'_precision']??2;
 if(!Number.isInteger(precision)||precision<0||precision>9)throw Error('計量精度無效');
 let parts=[unit],mode='single';
 if(unit==='clock'){
  const end=timeCode((kind==='angle' && s.angle_approx)||s.time_approx||'s');
  if(!times.includes(end))throw Error('時間近似單位無效');
  parts=times.slice(0,times.indexOf(end)+1);mode='clock';
 }else if((kind==='length'||kind==='area') && ['fraction','ratio'].includes(s.fraction_style)){
  parts=['numerator','denominator'];mode='fraction';
 }
 return {kind,unit,units,parts,mode,precision,reduce:s.fraction_approx!==false};
}
function ratioOf(record){
 if(!Number.isFinite(record.value))throw Error('無效量值');
 return record.rational?pair(record.rational.numerator,record.rational.denominator):decimal(String(record.value));
}
function convert(kind,p,from,to){
 const a=factor(kind,from),b=factor(kind,to);
 return mul(mul(p,a),[b[1],b[0]]);
}
function display(record,l){
 if(l.kind==='pixel_phy')return record[0].map(String);
 if(l.mode==='ratio'){
  if(!Number.isFinite(record.numerator)||!Number.isFinite(record.denominator)||record.denominator===0)throw Error('無效比例項');
  return [String(record.numerator),String(record.denominator)];
 }
 const source=timeCode(record.unit),clock=l.mode==='clock',unit=clock?(l.kind==='angle'?'°':'s'):l.unit;
 factor(l.kind,source);
 const angle=l.kind==='angle'&&unit!==source;
 const scale=factor(l.kind,source),target=factor(l.kind,unit);
 let number=record.value*(scale[0]/scale[1])/(target[0]/target[1]);
 if(angle)number*=source==='rad'?180/Math.PI:Math.PI/180;
 if(!Number.isFinite(number))throw Error('無效量值');
 if(l.mode==='fraction'){
  if(source===unit && !l.reduce && record.rational)return [record.rational.numerator,record.rational.denominator].map(String);
  return convert(l.kind,ratioOf(record),source,unit).map(String);
 }
 if(!clock)return [number.toFixed(l.precision)];
 // The workspace clock angle is a 12-hour revolution (30 degrees per hour).
 const last=seconds[l.parts.length-1],tick=last[0]/last[1];
 let ticks=safe(Math.round(Math.abs(number)*(l.kind==='angle'?120:1)/tick));
 return l.parts.map((u,i)=>{
  const size=Math.round((seconds[i][0]/seconds[i][1])/tick),n=Math.floor(ticks/size);
  ticks-=n*size;
  return (i===0&&number<0?'-':'')+String(n);
 });
}
function encode(p,unit){return {value:p[0]/p[1],unit,rational:{kind:'rational',numerator:p[0],denominator:p[1]}};}
function parse(fields,l){
 if(l.kind==='pixel_phy'){
  if(!fields.every(text=>/^\d+$/.test(text)))throw Error('像素數及物理長度必須為正整數');
  const record=[fields.map(Number),l.unit];pixelLayout(record);return record;
 }
 if(l.mode==='ratio')return ratioValue(fields,l);
 if(fields.length!==l.parts.length)throw Error('欄位不完整');
 if(l.mode==='single')return encode(decimal(fields[0]),l.unit);
 if(l.mode==='fraction'){
  if(!/^[+-]?\d+$/.test(fields[0])||!/^\d+$/.test(fields[1]))throw Error('分子及分母須為整數');
  return encode(pair(Number(fields[0]),Number(fields[1])),l.unit);
 }
 let p=[0,1];
 fields.forEach((text,i)=>{
  if(!(i===0?/^[+-]?\d+$/:/^\d+$/).test(text))throw Error('時鐘欄位須為整數');
  const n=Math.abs(Number(text));
  if(i && n>=(i<3?60:1000))throw Error('時鐘子欄位超出範圍');
  p=add(p,mul(pair(n,1),seconds[i]));
 });
 if(fields[0].startsWith('-'))p[0]=-p[0];
 return l.kind==='angle'?encode(mul(p,[1,120]),'°'):encode(p,'s');
}
function inUnit(kind,record,unit){
 if(record.unit===unit)return record;
 if(kind==='angle')throw Error('請保留輸入的角度單位以維持精確值');
 return encode(convert(kind,ratioOf(record),record.unit,unit),unit);
}
// Range limits stay in the binding's original unit when the display unit changes.
function sliderAmount(kind,record,unit){
 if(kind==='angle' && record.unit!==unit){
  factor(kind,record.unit);factor(kind,unit);
  return record.value*(unit==='rad'?Math.PI/180:180/Math.PI);
 }
 return inUnit(kind,record,unit).value;
}
function sliderRecord(kind,record,unit,min,max,count,ticks,absolute){
 const lower=decimal(min),upper=decimal(max);
 const span=add(upper,[-lower[0],lower[1]]);
 if(kind==='angle' && record.unit!==unit && !absolute){
  const value=Math.max(min,Math.min(max,sliderAmount(kind,record,unit)+(max-min)*ticks/count));
  return {unit,value};
 }
 const start=absolute?lower:ratioOf(inUnit(kind,record,unit));
 const next=add(start,mul(span,pair(ticks,count)));
 return encode(next[0]/next[1]<=min?lower:next[0]/next[1]>=max?upper:next,unit);
}
root.ChipPhysical={lengthFactors,convertPixel,layout,display,parse,inUnit,sliderAmount,sliderRecord};
})(globalThis);

