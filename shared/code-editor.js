/* Monaco is isolated from application form styles and canvas shortcuts. */
(function(root){
'use strict';
let sequence=0,configured=false;const workerUrls=new Map(),schemas=new Map();
function environment(){
 const runtime=root.ChipMonacoRuntime,assets=root.ChipMonacoAssets;
 if(!runtime?.monaco||!assets)throw Error('JSON 編輯器資源未載入');
 if(!configured){
  root.MonacoEnvironment={...root.MonacoEnvironment,getWorker(_module,label){const name=label==='json'?'json':'editor';let url=workerUrls.get(name);if(!url){url=URL.createObjectURL(new Blob([assets[name]],{type:'text/javascript'}));workerUrls.set(name,url)}return new Worker(url,{name:'chipchip-'+name})}};
  runtime.monaco.editor.defineTheme('chipchip-json',{base:'vs-dark',inherit:true,rules:[],colors:{'editor.background':'#101d30','editor.foreground':'#eaf1ff','editorGutter.background':'#101d30','editorLineNumber.foreground':'#70839d','editorLineNumber.activeForeground':'#b7d4fc','editor.selectionBackground':'#315b8d','editor.inactiveSelectionBackground':'#283c58','editorIndentGuide.background1':'#2c405a','editorWidget.background':'#17263c','editorWidget.border':'#40536e'}});
  configured=true;
 }
 return runtime;
}
function mount({id,label='JSON 模型',value='',schema=null}){
 const runtime=environment(),monaco=runtime.monaco,element=document.createElement('div');element.id=id;element.className='json-code-editor';element.dataset.codeEditor='monaco';element.setAttribute('data-copyable','true');element.setAttribute('aria-label',label);
 const shadow=element.attachShadow?element.attachShadow({mode:'open'}):element,style=document.createElement('style');style.textContent=root.ChipMonacoAssets.styles+'\n:host{display:block} .editor-surface{width:100%;height:100%}';shadow.append(style);
 const surface=document.createElement('div');surface.className='editor-surface';shadow.append(surface);
 const uri=monaco.Uri.parse('inmemory://chipchip/'+(++sequence)+'/model.json'),model=monaco.editor.createModel(value,'json',uri);
 model.updateOptions?.({tabSize:2,insertSpaces:true});
 if(schema)schemas.set(uri.toString(),{uri:'inmemory://chipchip/schema/'+sequence,fileMatch:[uri.toString()],schema});
 runtime.json.jsonDefaults.setDiagnosticsOptions({validate:true,allowComments:false,comments:'error',trailingCommas:'error',enableSchemaRequest:false,schemas:[...schemas.values()]});
 const editor=monaco.editor.create(surface,{model,theme:'chipchip-json',ariaLabel:label,automaticLayout:true,fontFamily:'"Cascadia Code", Consolas, monospace',fontSize:12,lineHeight:19,tabSize:2,insertSpaces:true,minimap:{enabled:false},stickyScroll:{enabled:false},lineNumbers:'on',lineNumbersMinChars:3,glyphMargin:false,folding:true,bracketPairColorization:{enabled:true},guides:{bracketPairs:true},scrollBeyondLastLine:false,wordWrap:'off',padding:{top:8,bottom:8},scrollbar:{verticalScrollbarSize:8,horizontalScrollbarSize:8,useShadows:false},formatOnPaste:false,formatOnType:false,renderLineHighlight:'line',overviewRulerBorder:false,fixedOverflowWidgets:true});
 // A value interface keeps the surrounding model controller independent of
 // Monaco's DOM and lets other consumers treat this as a normal value control.
 Object.defineProperty(element,'value',{get:()=>model.getValue(),set:text=>{if(model.getValue()!==String(text))model.setValue(String(text))}});
 element.focus=()=>{editor.layout();editor.focus()};element.codeEditor=editor;
 for(const type of ['keydown','keyup','contextmenu'])element.addEventListener(type,event=>event.stopPropagation());
 return {element,editor,model,layout:()=>editor.layout(),dispose(){schemas.delete(uri.toString());editor.dispose();model.dispose()}};
}
root.ChipCodeEditor={mount};
})(globalThis);
