(function(root){
'use strict';
function mount({read,load,validate=null,host=null,subject='目前圖稿',hintText=null,refreshOnOpen=false,contextKey=()=>null,problems=()=>[],schema=null}){
 const trigger=document.createElement('button');trigger.id='jsonTestToggle';trigger.type='button';
 if(host){trigger.className='json-test-disclosure';trigger.innerHTML='<svg class="json-test-chevron" viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg><svg class="json-test-code-icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M7 3H5v5l-2 2 2 2v5h2M13 3h2v5l2 2-2 2v5h-2" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg><span>JSON 模型</span>'}
 else trigger.textContent='JSON 模型';
 trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls','jsonTestPanel');(host||document.querySelector('header')).append(trigger);
 let panel=null,field,message,apply,controller,busy=false,lastOutput=null,lastContext=null;
 function button(host,id,text,action){const n=document.createElement('button');n.id=id;n.type='button';n.textContent=text;n.addEventListener('click',action);host.append(n);return n}
 function report(text,error=false){message.textContent=text;message.dataset.error=String(error);message.hidden=host&&!text;apply.dataset.error=String(error);apply.title=error?text:'保存';apply.setAttribute('aria-invalid',String(error))}
 function check(){if(busy||!validate)return;try{validate(ChipJson.parse(field.value));report('')}catch(error){report(error.message,true)}}
 function reportProblems(prefix){const issues=problems();report(issues.length?(prefix?prefix+'；':'')+issues.slice(0,3).map(issue=>issue.message).join('；'):prefix,issues.some(issue=>issue.severity==='error'))}
 function sameContext(a,b){return Array.isArray(a)&&Array.isArray(b)?a.length===b.length&&a.every((v,i)=>v===b[i]):a===b}
 function update(onlyChanged=false){
  try{const text=ChipJson.stringify(read()),context=contextKey();if(!onlyChanged||text!==lastOutput||!sameContext(context,lastContext)){field.value=text;lastOutput=text;lastContext=context;if(host)check();else reportProblems('已輸出'+subject+' JSON')}else if(host)check();return true}
  catch(error){field.value='';lastOutput=null;lastContext=null;report(error.message,true);return false}
 }
 function hide(){if(busy)return;panel.hidden=true;trigger.setAttribute('aria-expanded','false');trigger.focus()}
 function create(){
  panel=document.createElement('section');panel.id='jsonTestPanel';panel.className='chip-ui json-test-content '+(host?'json-test-inline':'json-test-panel');panel.setAttribute('aria-label','JSON 模型');
  const heading=document.createElement('div');heading.className='ui-panel-heading';const title=document.createElement('strong');title.textContent='JSON 模型';heading.append(title);
  if(!host){const close=button(heading,'jsonTestClose','×',hide);close.setAttribute('aria-label','關閉 JSON 模型');panel.append(heading)}
  const body=document.createElement('div');body.className='json-test-body';if(!host||hintText){const hint=document.createElement('p');hint.textContent=hintText||'編輯目前圖稿 JSON 後載入；此處不寫入檔案。';body.append(hint)}
  const code=ChipCodeEditor.mount({id:'jsonTestText',label:subject+' JSON 模型',schema});field=code.element;code.model.onDidChangeContent?.(()=>check());body.append(field);
  const actions=document.createElement('div');actions.className='json-test-actions';
  if(!host)button(actions,'jsonTestOutput','輸出'+subject,()=>update());
  apply=button(actions,'jsonTestLoad',host?'保存':'載入 JSON',async()=>{
   if(busy)return;busy=true;apply.disabled=true;
   try{const value=ChipJson.parse(field.value);await load(value);if(host){update();reportProblems('');}else report('JSON 載入完成')}
   catch(error){report((host?'保存失敗：':'載入失敗：')+error.message,true)}
   finally{busy=false;apply.disabled=false}
  });
  if(host){apply.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M5 3h12l4 4v14H3V3Z"/><path d="M7 3v6h10V3M7 21v-8h10v8"/></svg>';apply.title='保存'}
  apply.setAttribute('aria-label',host?'保存 JSON 模型':'載入 JSON');body.append(actions);
  message=document.createElement('output');message.id='jsonTestMessage';message.setAttribute('role','status');body.append(message);panel.append(body);(host||document.body).append(panel);
  if(!host)controller=ChipUI.floatingPanel(panel,{icon:'json',heading,body,minWidth:280,minHeight:220});
  panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();hide()}});
 }
 trigger.addEventListener('click',()=>{if(!panel){create();update()}else if(!panel.hidden){hide();return}else if(refreshOnOpen)update();panel.hidden=false;trigger.setAttribute('aria-expanded','true');controller?.clamp();field.focus()});
 return {output(){if(!panel)create();update()},sync(){if(panel&&!panel.hidden&&!busy)update(true)}};
}
root.ChipJsonTest={mount};
})(globalThis);
