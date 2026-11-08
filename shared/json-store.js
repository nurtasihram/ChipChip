/* Shared JSON boundary and document sessions. No display formatting belongs here. */
(function(root){
'use strict';
function copy(value,path='$',seen=new Set()){
 if(value===null||typeof value==='string'||typeof value==='boolean')return value;
 if(typeof value==='number'){if(!Number.isFinite(value))throw Error(path+': 需要有限數值');return value}
 if(typeof value!=='object')throw Error(path+': 不是 JSON 資料');
 if(seen.has(value))throw Error(path+': 循環引用');
 const proto=Object.getPrototypeOf(value);
 if(!Array.isArray(value)&&proto!==Object.prototype&&proto!==null)throw Error(path+': 需要普通物件');
 seen.add(value);let result;
 if(Array.isArray(value)){result=[];for(let i=0;i<value.length;i++)result.push(copy(value[i],path+'['+i+']',seen))}
 else{result={};for(const key of Object.keys(value))Object.defineProperty(result,key,{value:copy(value[key],path+'.'+key,seen),enumerable:true,writable:true,configurable:true})}
 seen.delete(value);return result;
}
function parse(text){if(typeof text!=='string')throw Error('需要 JSON 文字');return copy(JSON.parse(text.replace(/^\uFEFF/,'')))}
function stringify(value){return JSON.stringify(copy(value),null,2)}
// Key order is irrelevant to dirty state; arrays keep their document order.
function fingerprint(value){if(Array.isArray(value))return '['+value.map(fingerprint).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+fingerprint(value[k])).join(',')+'}';return JSON.stringify(value)}
function createRegistry(){
 const codecs=new Map();
 function register(type,codec){if(typeof type!=='string'||!type||codecs.has(type)||!Number.isSafeInteger(codec.version)||codec.version<1||typeof codec.validate!=='function')throw Error('無效或重複文件類型');codecs.set(type,{...codec});return api}
 function validate(input){const record=copy(input);if(!record||Array.isArray(record)||record.format!=='chip-workspace'||!codecs.has(record.type))throw Error('未知文件格式或類型');const codec=codecs.get(record.type);if(!Number.isSafeInteger(record.version)||record.version<1||record.version>codec.version)throw Error('不支援的文件版本');while(record.version<codec.version){const migrate=codec.migrations?.[record.version];if(typeof migrate!=='function')throw Error('缺少文件版本遷移');record.data=copy(migrate(copy(record.data)));record.version++}if(typeof record.title!=='string')throw Error('缺少文件標題');if(codec.validate(record.data)===false)throw Error('無效文件資料');return record}
 const api={register,validate,create(type,data,title=''){const codec=codecs.get(type);if(!codec)throw Error('未知文件類型');return validate({format:'chip-workspace',type,version:codec.version,title,data})},read:text=>validate(parse(text)),write:record=>stringify(validate(record))};return api;
}
function createManager({validate=copy}={}){
 const records=new Map();let activeId=null,sequence=0;
 const checked=value=>copy(validate(copy(value)));
 function entry(id){const item=records.get(id);if(!item)throw Error('文件不存在');return item}
 function view(item){return {id:item.id,filename:item.filename,data:copy(item.data),dirty:fingerprint(item.data)!==item.saved}}
 return {
  open(data,{filename='',saved=true}={}){const clean=checked(data),item={id:'document-'+(++sequence),filename,data:clean,saved:saved?fingerprint(clean):null};records.set(item.id,item);activeId=item.id;return view(item)},
  list:()=>[...records.values()].map(view),get:id=>view(entry(id)),active:()=>activeId===null?null:view(entry(activeId)),
  activate(id){const item=entry(id);activeId=id;return view(item)},
  update(id,data){const item=entry(id),clean=checked(data);item.data=clean;return view(item)},
  rename(id,filename){const item=entry(id);item.filename=filename;return view(item)},
  // Pass the exported snapshot so edits made while saving remain dirty.
  markSaved(id,data){const item=entry(id);item.saved=fingerprint(checked(data===undefined?item.data:data));return view(item)},
  close(id,{discard=false}={}){const item=entry(id);if(view(item).dirty&&!discard)throw Error('文件尚未儲存');const ids=[...records.keys()],index=ids.indexOf(id);records.delete(id);if(activeId===id)activeId=ids[index+1]||ids[index-1]||null;return activeId},

 };
}
root.ChipJson={copy,parse,stringify,createRegistry,createManager};
})(globalThis);
