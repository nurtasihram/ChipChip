/* Ordinary scalar values shared by the HTML and native Qt controls. */
(function(root){
'use strict';
function parse(type,text){
 if(type==='string')return text;
 if(type==='char'){
  if(!/^(?:[^\uD800-\uDFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF])$/.test(text) || text.length>2)throw Error('請輸入一個 Unicode 字元');
  return text;
 }
 const value=Number(text);
 if(type==='integer'){
  if(!/^[+-]?\d+$/.test(text) || !Number.isSafeInteger(value))throw Error('請輸入安全範圍內的整數');
 }else if(type==='decimal'){
  if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text) || !Number.isFinite(value))throw Error('請輸入有限小數');
 }else throw Error('未知純量型別：'+type);
 return value;
}
// Each binding owns a distinct input, including any pending browser/IME events.
function create({type,label,read= (object,key)=>object[key],write=(object,key,value)=>{object[key]=value;},
                 onCommit=()=>{},onCancel=()=>{},commitOnBlur=false}){
 let current=null;
 function bind(object,key){
  const input=document.createElement('input');
  input.type='text';
  input.inputMode=type==='integer'?'numeric':type==='decimal'?'decimal':'text';
  input.setAttribute('aria-label',label);
  input.setAttribute('data-scalar',type);
  const field={input,commit,cancel,refresh};
  function refresh(){input.value=String(read(object,key));input.setCustomValidity?.('');}
  refresh();
  function commit(){
   if(current!==field)return false;
   let value;
   try{value=parse(type,input.value);}catch(error){
    input.setCustomValidity?.(error.message);input.reportValidity?.();return false;
   }
   if(!Object.is(value,read(object,key)))write(object,key,value);
   if(current===field){refresh();onCommit(object);}
   return true;
  }
  function cancel(){if(current===field){refresh();onCancel(object);}}
  input.addEventListener('input',()=>input.setCustomValidity?.(''));
  input.addEventListener('keydown',event=>{
   if(event.isComposing || event.keyCode===229)return;
   if(event.key==='Enter' || event.key==='Escape'){
    event.preventDefault();event.stopPropagation();
    if(event.key==='Enter')commit();else cancel();
   }
  });
  if(commitOnBlur)input.addEventListener('blur',()=>{if(!input.scalarMenuOpen && input.isConnected!==false)commit();});
  const old=current;
  current=field;
  if(old){old.input.closeScalarMenu?.();old.input.replaceWith(input);}
  return field;
 }
 function dispose(){const old=current;current=null;old?.input.closeScalarMenu?.();old?.input.remove();}
 return {bind,dispose};
}
root.ChipScalar={parse,create};
})(typeof globalThis==='undefined'?this:globalThis);
