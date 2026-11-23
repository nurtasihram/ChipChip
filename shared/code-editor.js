/* Monaco is isolated from application form styles and canvas shortcuts. */
(function(root){
'use strict';
let sequence=0,configured=false;const workerUrls=new Map(),schemas=new Map();
function environment(){
 const runtime=root.ChipMonacoRuntime,assets=root.ChipMonacoAssets;
 if(!runtime?.monaco||!assets)throw Error('Monaco 編輯器資源未載入');
 if(!configured){
  root.MonacoEnvironment={...root.MonacoEnvironment,getWorker(_module,label){const name=label==='json'?'json':'editor';let url=workerUrls.get(name);if(!url){url=URL.createObjectURL(new Blob([assets[name]],{type:'text/javascript'}));workerUrls.set(name,url)}return new Worker(url,{name:'chipchip-'+name})}};
  runtime.monaco.editor.defineTheme('chipchip-json',{base:'vs-dark',inherit:true,rules:[],colors:{'editor.background':'#101d30','editor.foreground':'#eaf1ff','editorGutter.background':'#101d30','editorLineNumber.foreground':'#70839d','editorLineNumber.activeForeground':'#b7d4fc','editor.selectionBackground':'#315b8d','editor.inactiveSelectionBackground':'#283c58','editorIndentGuide.background1':'#2c405a','editorWidget.background':'#17263c','editorWidget.border':'#40536e'}});
  configured=true;
 }
 return runtime;
}
function syncSchemas(runtime){
 runtime.json.jsonDefaults.setDiagnosticsOptions({validate:true,allowComments:false,comments:'error',trailingCommas:'error',enableSchemaRequest:false,schemas:[...schemas.values()]});
}
// formatter(source, language) returns formatted text or a promise of text.
function mount({id,language='json',label=language==='json'?'JSON 模型':language,value='',schema=null,formatter=null}){
 if(schema && language!=='json')throw Error('JSON Schema 僅適用於 JSON 模型');
 if(formatter!==null && typeof formatter!=='function')throw TypeError('formatter must be a function');
 const runtime=environment(),monaco=runtime.monaco,element=document.createElement('div');const definition=monaco.languages.getLanguages().find(entry=>entry.id===language);
 if(!definition)throw Error('未載入代碼格式：'+language);
 element.id=id;element.className='json-code-editor';element.dataset.codeEditor='monaco';element.setAttribute('data-copyable','true');element.setAttribute('aria-label',label);
 const shadow=element.attachShadow?element.attachShadow({mode:'open'}):element,style=document.createElement('style');style.textContent=root.ChipMonacoAssets.styles+'\n:host{display:block} .editor-surface{width:100%;height:100%} .chip-code-highlight{background:rgba(255,193,7,.28)}';shadow.append(style);
 const surface=document.createElement('div');surface.className='editor-surface';shadow.append(surface);
 const uri=monaco.Uri.parse('inmemory://chipchip/'+(++sequence)+'/model'+(definition.extensions?.[0]||'')),model=monaco.editor.createModel(value,language,uri);
 model.updateOptions?.({tabSize:2,insertSpaces:true});
 if(schema)schemas.set(uri.toString(),{uri:'inmemory://chipchip/schema/'+sequence,fileMatch:[uri.toString()],schema});
 if(language==='json')syncSchemas(runtime);
 const editor=monaco.editor.create(surface,{model,theme:'chipchip-json',ariaLabel:label,automaticLayout:true,fontFamily:'"Cascadia Code", Consolas, monospace',fontSize:12,lineHeight:19,tabSize:2,insertSpaces:true,minimap:{enabled:false},stickyScroll:{enabled:false},lineNumbers:'on',lineNumbersMinChars:3,glyphMargin:false,folding:true,bracketPairColorization:{enabled:true},guides:{bracketPairs:true},scrollBeyondLastLine:false,wordWrap:'off',padding:{top:8,bottom:8},scrollbar:{verticalScrollbarSize:8,horizontalScrollbarSize:8,useShadows:false},occurrencesHighlight:'off',selectionHighlight:false,formatOnPaste:false,formatOnType:false,renderLineHighlight:'line',overviewRulerBorder:false,fixedOverflowWidgets:true});
 // A value interface keeps the surrounding model controller independent of
 // Monaco's DOM and lets other consumers treat this as a normal value control.
 Object.defineProperty(element,'value',{get:()=>model.getValue(),set:text=>{if(model.getValue()!==String(text))model.setValue(String(text))}});
 element.focus=()=>{editor.layout();editor.focus()};element.codeEditor=editor;
 for(const type of ['keydown','keyup','contextmenu'])element.addEventListener(type,event=>event.stopPropagation());
 let highlights=null, formatRequest=0;
 function setHighlights(ranges){
  if(!highlights)highlights=editor.createDecorationsCollection();
  highlights.set(ranges.map(range=>({range,options:{inlineClassName:'chip-code-highlight'}})));
 }
 function bindFormatter(next){
  if(next!==null && typeof next!=='function')throw TypeError('formatter must be a function');
  formatRequest++;
  formatter=next;
 }
 async function format(){
  if(!formatter)return false;
  const request=++formatRequest,version=model.getVersionId(),source=model.getValue();
  const result=await formatter(source,language);
  if(request!==formatRequest || model.getVersionId()!==version)return false;
  if(typeof result!=='string')throw TypeError('formatter must return text');
  if(result!==source){
   editor.pushUndoStop();
   editor.executeEdits('chip.format',[{range:model.getFullModelRange(),text:result}]);
   editor.pushUndoStop();
  }
  return true;
 }
 function dispose(){
  bindFormatter(null);
  highlights?.clear();
  if(schemas.delete(uri.toString()))syncSchemas(runtime);
  editor.dispose();
  model.dispose();
 }
 return {element,editor,model,layout:()=>editor.layout(),setHighlights,clearHighlights:()=>highlights?.clear(),bindFormatter,format,dispose};
}
root.ChipCodeEditor={mount};
})(globalThis);
