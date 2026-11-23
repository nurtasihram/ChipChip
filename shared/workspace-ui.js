/* Reusable controls. Applications supply their own workspace and commands. */
(function(root){
'use strict';
const $=id=>document.getElementById(id);
let options={},mounted=false;
function paneBounds(){
 if(options.bounds)return options.bounds();
 const v=window.visualViewport,x=v?.offsetLeft||0,y=v?.offsetTop||0;
 return {left:x+8,top:y+8,right:x+(v?.width||innerWidth)-8,bottom:y+(v?.height||innerHeight)-8};
}
const icons={pin:'m15 3 6 6-4 1-3 4v4l-2 2-4-4-5 5 5-5-4-4 2-2h4l4-3Z',collapse:'m7 14 5-5 5 5',grip:'M8 6h.01M16 6h.01M8 12h.01M16 12h.01M8 18h.01M16 18h.01'};
function buttonIcon(key){
 if(options.buttonIcon)return options.buttonIcon(key);
 return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor"><path d="'+(icons[key]||'')+'"/></svg>';
}
function iconButton(button,key,label){
 if(options.iconButton)return options.iconButton(button,key,label);
 button.type='button';button.classList.add('ui-icon-button');button.innerHTML=buttonIcon(key);
 button.setAttribute('aria-label',label);button.dataset.tooltip=label;return button;
}
function panelMotion(panel,{bounds}={}){let state=null,frame=0;function paint(){frame=0;if(state)panel.style.setProperty('translate',(state.left-state.rect.left)+'px '+(state.top-state.rect.top)+'px','important')}return {begin(rect=panel.getBoundingClientRect()){if(state)this.end();const viewport=window.visualViewport,b=typeof bounds==='function'?bounds():{left:(viewport?.offsetLeft||0)+8,top:Math.max((viewport?.offsetTop||0)+8,(options.headerFloor?.()||0)+8),right:(viewport?.offsetLeft||0)+(viewport?.width||innerWidth)-8,bottom:(viewport?.offsetTop||0)+(viewport?.height||innerHeight)-8};state={rect,bounds:b,left:rect.left,top:rect.top,translate:panel.style.getPropertyValue?.('translate')||panel.style.translate||'',priority:panel.style.getPropertyPriority?.('translate')||''};panel.classList.add('ui-panel-moving')},move(x,y){if(!state)return;const b=state.bounds,r=state.rect;state.left=Math.max(b.left,Math.min(x,b.right-r.width));state.top=Math.max(b.top,Math.min(y,b.bottom-r.height));if(!frame)frame=requestAnimationFrame(paint)},end(){if(!state)return null;if(frame)cancelAnimationFrame(frame);frame=0;const current=state;state=null;panel.style.setProperty('left',current.left+'px','important');panel.style.setProperty('top',current.top+'px','important');panel.style.setProperty('right','auto','important');panel.style.setProperty('bottom','auto','important');if(current.translate)panel.style.setProperty('translate',current.translate,current.priority);else panel.style.removeProperty('translate');panel.classList.remove('ui-panel-moving');return {x:current.left,y:current.top}}}}
function observePaneSize(node,update){
 if(typeof ResizeObserver==='undefined')return null;
 let scheduled=false;
 const observer=new ResizeObserver(()=>{
  if(scheduled)return;
  scheduled=true;
  requestAnimationFrame(()=>{scheduled=false;update()});
 });
 observer.observe(node);
 const board=options.surface?.();
 if(board&&board!==node)observer.observe(board);
 return observer;
}
function placePopup(node,x,y){
 const b=paneBounds();
 node.style.boxSizing='border-box';
 node.style.maxWidth=Math.max(0,b.right-b.left)+'px';
 node.style.maxHeight=Math.max(0,b.bottom-b.top)+'px';
 const r=node.getBoundingClientRect();
 node.style.left=Math.max(b.left,Math.min(x,b.right-r.width))+'px';
 node.style.top=Math.max(b.top,Math.min(y,b.bottom-r.height))+'px';
}
function floatingPanel(panel,{heading,body,minWidth=240,minHeight=160,visible=()=>panel.localName==='details'?panel.open:!panel.hidden,canDrag=()=>true,icon='mixed',toolbar=false,handle=null,items:toolbarItems=null,home=null,perpendicularTo=null,collapseOnHandle=false,toolbarGroup=null}={}){
 if(panel.chipFloatingPanel)return panel.chipFloatingPanel;
 if(toolbar){panel.classList.add('ui-floating-toolbar');panel.dataset.panelType='floating';const controller=toolbarController(panel,handle,toolbarItems,()=>true);controller.setOrientationParent(perpendicularTo);return panel.chipFloatingPanel=controller}
 heading=heading||panel.querySelector('.ui-panel-heading,.ui-floating-heading');body=body||panel.querySelector('.ui-floating-body');panel.classList.add('ui-floating-panel');panel.dataset.panelType='floating';heading.classList.add('ui-floating-heading');if(!body){body=document.createElement('div');for(const child of [...panel.children])if(child!==heading&&!child.classList.contains('ui-panel-edge'))body.append(child);panel.append(body)}body.classList.add('ui-floating-body');heading.setAttribute('tabindex','0');heading.setAttribute('aria-label','拖動窗格');let drag=null,collapsed=false,savedSize=null,pinned=true;
 const title=()=>heading.querySelector('strong,b')?.textContent||panel.getAttribute('aria-label')||'面板';
 const collapseButton=document.createElement('button');collapseButton.className='ui-panel-collapse ui-icon-button';collapseButton.type='button';collapseButton.setAttribute('aria-label','收縮'+title());collapseButton.setAttribute('data-tooltip','收縮'+title());collapseButton.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m10 7-5 5 5 5m9-10-5 5 5 5"/></svg>';heading.insertBefore(collapseButton,[...heading.children].at(-1));
 const pin=heading.querySelector('#pinSettings')||document.createElement('button');if(!pin.parentNode)heading.insertBefore(pin,collapseButton);pin.setAttribute('data-panel-pin','true');iconButton(pin,'pin','取消釘選'+title());
 function updatePin(on){pinned=!!on;panel.dataset.pinned=String(pinned);pin.setAttribute('aria-pressed',String(pinned));pin.setAttribute('aria-label',(pinned?'取消釘選':'釘選')+title());pin.setAttribute('data-tooltip',(pinned?'取消釘選':'釘選')+title())}
 function setPinned(on){updatePin(on);setCollapsed(!pinned)}
 updatePin(true);pin.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();setPinned(!pinned)});
 function owns(node){const seen=new Set();for(let target=node;target&&!seen.has(target);target=target.chipOwner||target.parentNode||target.host){if(panel.contains(target))return true;seen.add(target)}return false}
 function autoCollapse(){if(!pinned&&!collapsed&&visible())setCollapsed(true,{focus:false})}
 document.addEventListener('pointerdown',e=>{if(!owns(e.target))autoCollapse()},true);
 document.addEventListener('focusin',e=>{if(!owns(e.target))autoCollapse()},true);
 panel.addEventListener('focusout',e=>{if(owns(e.relatedTarget))return;Promise.resolve().then(()=>{if(!owns(document.activeElement))autoCollapse()})});
 window.addEventListener('blur',autoCollapse);
 const mini=document.createElement('div');mini.className='ui-panel-mini';mini.hidden=true;
 const grip=document.createElement('div');grip.className='ui-toolbar-handle';grip.tabIndex=0;grip.setAttribute('role','button');grip.setAttribute('aria-label','移動'+title());
 const items=document.createElement('div');items.className='ui-toolbar-items';const restore=document.createElement('button');restore.className='ui-toolbar-button ui-icon-button';restore.type='button';restore.setAttribute('aria-label','展開'+title());restore.setAttribute('data-tooltip','展開'+title());iconButton(restore,icon,'展開'+title());panel.dataset.panelIcon=icon;const iconCopy=document.createElement('span');iconCopy.innerHTML=restore.innerHTML;heading.insertBefore(iconCopy.children[0],heading.children[0]);items.append(restore);mini.append(grip,items);panel.append(mini);
 function setCollapsed(on,{focus=true}={}){
  on=!!on;if(on===collapsed)return;motion.end();drag=null;collapsed=on;if(on)updatePin(false);
  if(on){savedSize={};for(const key of ['width','height','min-width','min-height']){savedSize[key]=[panel.style.getPropertyValue?.(key)||panel.style[key]||'',panel.style.getPropertyPriority?.(key)||''];style(key,key==='width'?'max-content':key==='height'?'auto':'0px')}}
  else{for(const [key,[value,priority]]of Object.entries(savedSize||{})){if(value)panel.style.setProperty(key,value,priority);else panel.style.removeProperty(key)}savedSize=null}
  panel.classList.toggle('ui-panel-collapsed',on);panel.classList.toggle('ui-floating-toolbar',on);panel.dataset.collapsed=String(on);mini.hidden=!on;heading.inert=on;body.inert=on;collapseButton.setAttribute('aria-expanded',String(!on));restore.setAttribute('aria-label','展開'+title());restore.setAttribute('data-tooltip','展開'+title());clamp();if(on)for(const popup of document.querySelectorAll('[data-panel-popup]'))if(owns(popup))popup.chipClose?.();if(focus)(on?restore:collapseButton).focus();panel.dispatchEvent(new Event('panelstatechange'));
 }
 collapseButton.setAttribute('aria-expanded','true');collapseButton.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();setCollapsed(true)});restore.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();setCollapsed(false)});
 function bounds(){return paneBounds()}
 const motion=panelMotion(panel,{bounds});function style(key,value){if(panel.style.getPropertyValue?.(key)!==value&&panel.style[key]!==value)panel.style.setProperty(key,value,'important')}
 function place(x,y){const b=bounds();style('max-width',Math.max(0,b.right-b.left)+'px');style('max-height',Math.max(0,b.bottom-b.top)+'px');const r=panel.getBoundingClientRect();style('left',Math.max(b.left,Math.min(x,b.right-r.width))+'px');style('top',Math.max(b.top,Math.min(y,b.bottom-r.height))+'px');style('right','auto');style('bottom','auto')}
 function clamp(){if(collapsed){toolbarWindow.clamp();return}if(drag||!visible())return;const r=panel.getBoundingClientRect();place(r.left,r.top)}
 function dragSurface(surface){surface.addEventListener('pointerdown',e=>{if(e.button!==0||e.isPrimary===false||!canDrag(e)||e.target.closest('button,input,select'))return;const r=panel.getBoundingClientRect();drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:r.left,top:r.top};motion.begin(r);surface.setPointerCapture(e.pointerId);e.preventDefault();e.stopPropagation()});surface.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;motion.move(drag.left+e.clientX-drag.x,drag.top+e.clientY-drag.y);e.preventDefault();e.stopPropagation()});function end(e){if(!drag||drag.id!==e.pointerId)return;drag=null;const position=motion.end();if(position)place(position.x,position.y);if(surface.hasPointerCapture(e.pointerId))surface.releasePointerCapture(e.pointerId);e.stopPropagation()}for(const type of ['pointerup','pointercancel','lostpointercapture'])surface.addEventListener(type,end);surface.addEventListener('keydown',e=>{if(e.target!==surface)return;const d={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(!d)return;e.preventDefault();const r=panel.getBoundingClientRect(),step=e.shiftKey?25:10;place(r.left+d[0]*step,r.top+d[1]*step)});}dragSurface(heading);const toolbarWindow=toolbarController(panel,grip,items,()=>collapsed);
 function toolbarController(shell,grip,tray,enabled){
  let preview=document.getElementById('dockPreview');
  if(!preview){preview=document.createElement('div');preview.id='dockPreview';preview.hidden=true;preview.setAttribute('aria-hidden','true');document.body.append(preview)}
  grip.classList.add('ui-toolbar-handle');grip.innerHTML=buttonIcon(collapseOnHandle?'collapse':'grip');tray.classList.add('ui-toolbar-items');
  for(const button of tray.querySelectorAll('button'))button.classList.add('ui-toolbar-button');
  shell.setAttribute('aria-orientation','horizontal');
  let moving=null,docked=null,previewEdge=null,deadline=0,timer=null,ignoreClick=false,orientationParent=null,orientationObserver=null,orientationIndependent=false,popupAnchor=null,popupGap=4,handleAtEnd=false,handleAutomatic=true,touchClick=null,collapseAnchor=null,groupPreview=false;const handleLabel=grip.getAttribute('aria-label')||'移動工具列';
  const cleanups=[];
  function listen(target,type,fn,options){target.addEventListener(type,fn,options);cleanups.push(()=>target.removeEventListener?.(type,fn,options))}
  function bounds(){return paneBounds()}
  function vertical(on,{preview=false}={}){if(orientationParent&&!orientationIndependent&&!preview)on=!orientationParent.classList.contains('vertical');shell.classList.toggle('vertical',on);shell.setAttribute('aria-orientation',on?'vertical':'horizontal');tray.chipOptionModel?.syncLayout?.();syncHandle()}
  function syncHandle(){const on=shell.classList.contains('vertical'),edge=on?(handleAtEnd?'底邊':'頂邊'):(handleAtEnd?'右邊':'左邊'),next=on?(handleAtEnd?'頂邊':'底邊'):(handleAtEnd?'左邊':'右邊');grip.setAttribute('role','button');if(collapseOnHandle){const target=collapseAnchor||popupAnchor,r=shell.getBoundingClientRect(),a=target?.getBoundingClientRect(),dx=a?a.left+a.width/2-r.left-r.width/2:0,dy=a?a.top+a.height/2-r.top-r.height/2:-1,direction=Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down'),label={up:'上',down:'下',left:'左',right:'右'}[direction],angle={up:0,right:90,down:180,left:-90}[direction];shell.dataset.collapseDirection=direction;const svg=grip.querySelector('svg');if(svg)svg.style.transform='rotate('+angle+'deg)';grip.removeAttribute('aria-pressed');grip.setAttribute('aria-expanded',String(!shell.hidden));grip.setAttribute('aria-label','向'+label+'收起工具列；拖動可移動');grip.setAttribute('data-tooltip','單擊向'+label+'收起工具列；拖動移動工具列');return;}grip.setAttribute('aria-pressed',String(handleAtEnd));grip.setAttribute('aria-label',handleLabel+'；把手位於'+edge+'，單擊移到'+next);grip.setAttribute('data-tooltip','拖動移動工具列；單擊把手切換至'+next);}
  function activateHandle(){if(collapseOnHandle){shell.hidden=true;collapseAnchor?.setAttribute('aria-expanded','false');syncHandle();grip.dispatchEvent(new Event('interactionhelpdismiss',{bubbles:true}));}else setHandleEnd(!handleAtEnd);}
  function applyHandleEnd(on){handleAtEnd=!!on;shell.dataset.handleEnd=String(handleAtEnd);grip.style.order=handleAtEnd?'1':'-1';syncHandle();}
  function setHandleEnd(on){handleAutomatic=false;applyHandleEnd(on);clamp();}
  function place(x,y){const b=bounds();shell.style.setProperty('max-width',Math.max(0,b.right-b.left)+'px','important');shell.style.setProperty('max-height',Math.max(0,b.bottom-b.top)+'px','important');tray.style.maxHeight=Math.max(0,b.bottom-b.top-(2+(shell.classList.contains('vertical')&&!grip.hidden?grip.getBoundingClientRect().height:0)))+'px';const r=shell.getBoundingClientRect();shell.style.setProperty('left',Math.max(b.left,Math.min(x,b.right-r.width))+'px','important');shell.style.setProperty('top',Math.max(b.top,Math.min(y,b.bottom-r.height))+'px','important');if(collapseOnHandle)syncHandle()}
  function alignPopup(){if(!popupAnchor?.isConnected||shell.hidden)return false;const first=[...tray.children].find(node=>node.localName==='button');if(!first)return false;const anchor=popupAnchor.getBoundingClientRect(),parent=(popupAnchor.closest('.ui-floating-toolbar')||popupAnchor).getBoundingClientRect(),r=shell.getBoundingClientRect(),button=first.getBoundingClientRect(),b=bounds(),on=shell.classList.contains('vertical');let x=on?anchor.left+anchor.width/2-(button.left+button.width/2-r.left):parent.right+popupGap,y=on?parent.bottom+popupGap:anchor.top+anchor.height/2-(button.top+button.height/2-r.top);if(on&&y+r.height>b.bottom&&parent.top-popupGap-r.height>=b.top)y=parent.top-popupGap-r.height;if(!on&&x+r.width>b.right&&parent.left-popupGap-r.width>=b.left)x=parent.left-popupGap-r.width;if(handleAutomatic)applyHandleEnd(on?y>=parent.bottom:x>=parent.right);place(x,y);return true;}
  function clamp(){if(!enabled()||shell.hidden)return;if(!moving&&!orientationIndependent&&alignPopup())return;const b=bounds(),r=shell.getBoundingClientRect();place(docked==='left'?b.left:docked==='right'?b.right-r.width:r.left,docked==='top'?b.top:docked==='bottom'?b.bottom-r.height:r.top)}
  function candidate(){const b=bounds(),r=shell.getBoundingClientRect(),edges=orientationParent?[['top',Math.abs(r.top-b.top)],['bottom',Math.abs(b.bottom-r.bottom)],['left',Math.abs(r.left-b.left)],['right',Math.abs(b.right-r.right)]]:shell.classList.contains('vertical')?[['top',Math.abs(r.top-b.top)],['bottom',Math.abs(b.bottom-r.bottom)]]:[['left',Math.abs(r.left-b.left)],['right',Math.abs(b.right-r.right)]];edges.sort((a,b)=>a[1]-b[1]);return edges[0][1]<=20?edges[0][0]:null}
  function hidePreview(){preview.classList.remove('visible')}
  function resetPreview(){clearTimeout(timer);timer=null;previewEdge=null;deadline=0;hidePreview()}
  function showPreview(changed=false){
   const edge=candidate();if(!edge){resetPreview();return}
   if(edge!==previewEdge||changed){resetPreview();previewEdge=edge;deadline=performance.now()+500;timer=setTimeout(hidePreview,500)}
   if(performance.now()>=deadline){hidePreview();return}
   const b=bounds(),before=shell.getBoundingClientRect(),wasVertical=shell.classList.contains('vertical'),oldHeight=tray.style.maxHeight;let target;
   try{const on=edge==='left'||edge==='right';vertical(on,{preview:true});tray.style.maxHeight=Math.max(0,b.bottom-b.top-(2+(on&&!grip.hidden?grip.getBoundingClientRect().height:0)))+'px';target=shell.getBoundingClientRect()}finally{vertical(wasVertical,{preview:true});tray.style.maxHeight=oldHeight}
   const x=edge==='left'?b.left:edge==='right'?b.right-target.width:before.left,y=edge==='top'?b.top:edge==='bottom'?b.bottom-target.height:before.top;
   Object.assign(preview.style,{left:Math.max(b.left,Math.min(x,b.right-target.width))+'px',top:Math.max(b.top,Math.min(y,b.bottom-target.height))+'px',width:target.width+'px',height:target.height+'px',borderRadius:getComputedStyle(shell).borderRadius});preview.dataset.edge=edge;preview.hidden=false;void preview.offsetWidth;preview.classList.add('visible');
  }
  function dock(){const edge=candidate();if(!edge||moving&&(edge!==previewEdge||performance.now()>=deadline))return;docked=edge;if(orientationParent){orientationIndependent=true;shell.dataset.orientationMode='manual';}vertical(edge==='left'||edge==='right');clamp()}
  function attach(button){button.chipToolbarReturn?.()}
  function groupTarget(x,y){
   if(!toolbarGroup)return null;
   const stack=document.elementsFromPoint(x,y).map(node=>node.closest('.ui-floating-toolbar'));
   const candidates=[...toolbarGroup.members].filter(member=>member.shell!==shell&&!member.shell.hidden);
   const direct=stack.map(target=>candidates.find(member=>member.shell===target)).find(Boolean);
   const single=member=>member.items.querySelectorAll('button').length===1;
   let nearest=null,distance=Infinity;
   for(const member of direct?[direct]:candidates){
    if(!single(member)){if(direct)return {member};continue;}
    const r=member.shell.getBoundingClientRect();
    if(!r.width||!r.height)continue;
    const gap=Math.hypot(Math.max(r.left-x,0,x-r.right),Math.max(r.top-y,0,y-r.bottom));
    if(gap>20||gap>=distance)continue;
    const dx=(x-r.left-r.width/2)/r.width,dy=(y-r.top-r.height/2)/r.height;
    nearest={member,edge:Math.abs(dx)>=Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'top':'bottom')};distance=gap;
   }
   return nearest;
  }
  function clearGroupPreview(){
   if(!groupPreview)return;
   groupPreview=false;resetPreview();delete preview.dataset.toolbarGroupDrop;
  }
  function previewGroup(x,y){
   const drop=groupTarget(x,y);
   if(!drop){clearGroupPreview();return false;}
   const r=drop.member.shell.getBoundingClientRect(),edge=drop.edge,b=bounds(),vertical=edge==='top'||edge==='bottom';
   const w=edge&&!vertical?5:r.width,h=edge&&vertical?5:r.height;
   const left=edge==='left'?r.left-w:edge==='right'?r.right:r.left,top=edge==='top'?r.top-h:edge==='bottom'?r.bottom:r.top;
   if(!groupPreview)resetPreview();
   groupPreview=true;preview.dataset.toolbarGroupDrop=edge||'merge';
   Object.assign(preview.style,{left:Math.max(b.left,Math.min(left,b.right-w))+'px',top:Math.max(b.top,Math.min(top,b.bottom-h))+'px',width:w+'px',height:h+'px',borderRadius:getComputedStyle(drop.member.shell).borderRadius});
   preview.hidden=false;preview.classList.add('visible');return true;
  }
  function transferTools(buttons,drop,x,y){
   if(toolbarGroup.path&&buttons.some(button=>button.dataset.toolPath?.split('.').slice(0,-1).join('.')!==toolbarGroup.path))return;
   let target=drop?.member;
   if(!target){
    const child=document.createElement('div'),handle=document.createElement('div'),contents=document.createElement('div');
    handle.tabIndex=0;handle.setAttribute('aria-label','移動'+toolbarGroup.label);
    child.dataset.toolbarDetached='true';child.setAttribute('aria-label',toolbarGroup.label);
    child.append(handle,contents);document.body.append(child);
    optionModel(contents,{items:[],selected:[],adopt:true,mode:'single',resortable:true,role:'toolbar',defaultSlot:true,
     onOrderChange:()=>toolbarGroup.changed?.('order',contents)});
    target=floatingPanel(child,{toolbar:true,handle,items:contents,toolbarGroup});
   }
   const reference=drop?.edge?target.items.querySelector('button'):null,referenceBounds=reference?.getBoundingClientRect();
   const insertBefore=drop?.edge==='left'||drop?.edge==='top'?reference:null;
   for(const button of buttons){
    let slot=toolbarGroup.slots.get(button);
    if(!slot){
     slot=document.createElement('span');slot.hidden=true;slot.chipToolbarButton=button;
     tray.insertBefore(slot,button);toolbarGroup.slots.set(button,slot);
    }
    if(target.shell.dataset.toolbarDetached==='true')target.items.insertBefore(button,insertBefore);
    else{
     slot.replaceWith(button);toolbarGroup.slots.delete(button);
     if(reference)target.items.insertBefore(button,insertBefore);
    }
   }
   tray.chipOptionModel?.syncLayout();target.items.chipOptionModel?.syncLayout();
   if(shell.dataset.toolbarDetached==='true'&&!tray.querySelector('button')){
    tray.chipOptionModel?.destroy();controller.destroy();shell.remove();
   }
   if(reference)target.alignGroup(drop.edge,reference,referenceBounds);
   else if(!drop)target.place(x-45,y-25);
   toolbarGroup.changed?.(reference?'side-layout':'layout',target.items);target.clamp();
   return target;
  }
  function detach(button,x,y){
   if(button.parentNode!==tray)return;
   if(toolbarGroup)return transferTools([button],groupTarget(x,y),x,y);
   const slot=document.createElement('span');slot.hidden=true;slot.chipToolbarButton=button;tray.insertBefore(slot,button);
   const child=document.createElement('div'),handle=document.createElement('div'),contents=document.createElement('div');handle.tabIndex=0;handle.setAttribute('role','button');handle.setAttribute('aria-label','移動'+(button.getAttribute('aria-label')||'工具'));contents.append(button);child.append(handle,contents);child.dataset.toolbarDetached='true';document.body.append(child);
   const controller=floatingPanel(child,{toolbar:true,handle,items:contents,home:{contains(px,py){const r=tray.getBoundingClientRect();return px>=r.left-12&&px<=r.right+12&&py>=r.top-12&&py<=r.bottom+12},attach(){attach(button)}}});
   button.chipToolbarReturn=()=>{delete button.chipToolbarReturn;tray.insertBefore(button,slot);slot.remove();controller.destroy();child.remove();tray.chipOptionModel?.refreshOrder();clamp()};controller.place(x-45,y-25);return controller;
  }
  function begin(e,surface){
   if(!enabled()||moving||!canDrag(e)||e.isPrimary===false||e.button!==0)return;
   const button=surface===tray?e.target.closest('button'):null;
   if(surface===tray&&(!button||tray.dataset.resortable==='true'&&tray.querySelectorAll('button').length>1))return;
   const r=shell.getBoundingClientRect();moving={id:e.pointerId,surface,button,fanout:!!button&&tray.querySelectorAll('button').length>1,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,left:r.left,top:r.top,vertical:shell.classList.contains('vertical'),docked,moved:false};docked=null;if(surface===grip)surface.setPointerCapture(e.pointerId);if(!button)e.preventDefault();e.stopPropagation();shell.classList.add('dragging');if(!moving.fanout)showPreview();
  }
  function move(e){if(!moving||moving.id!==e.pointerId)return;const changed=e.clientX!==moving.lastX||e.clientY!==moving.lastY;moving.lastX=e.clientX;moving.lastY=e.clientY;moving.moved||=Math.hypot(e.clientX-moving.x,e.clientY-moving.y)>=6;if(moving.moved&&!moving.surface.hasPointerCapture?.(moving.id))moving.surface.setPointerCapture(moving.id);if(moving.moved&&!moving.fanout){place(moving.left+e.clientX-moving.x,moving.top+e.clientY-moving.y);if(!(shell.dataset.toolbarDetached==='true'&&previewGroup(e.clientX,e.clientY)))showPreview(changed)}else if(moving.moved&&moving.fanout)previewGroup(e.clientX,e.clientY);e.preventDefault();e.stopPropagation()}
  function finish(e,cancel=false){
   if(!moving||moving.id!==e.pointerId)return;const state=moving,returnHome=!cancel&&state.moved&&!state.fanout&&home?.contains(e.clientX,e.clientY),merge=!cancel&&state.moved&&!state.fanout&&shell.dataset.toolbarDetached==='true'&&groupTarget(e.clientX,e.clientY);
   if(cancel){docked=state.docked;vertical(state.vertical);place(state.left,state.top)}else if(state.moved&&!state.fanout&&!returnHome&&!merge)dock();
   if(!cancel&&state.moved&&!state.fanout)popupAnchor=null;moving=null;shell.classList.remove('dragging');clearGroupPreview();resetPreview();if(state.surface.hasPointerCapture?.(state.id))state.surface.releasePointerCapture(state.id);
   ignoreClick=state.moved;if(ignoreClick)setTimeout(()=>{ignoreClick=false},0);
   if(!cancel&&state.moved&&state.fanout){const r=tray.getBoundingClientRect();if(e.clientX<r.left-20||e.clientX>r.right+20||e.clientY<r.top-20||e.clientY>r.bottom+20)detach(state.button,e.clientX,e.clientY)}
   if(merge){transferTools([...tray.querySelectorAll('button')],merge,e.clientX,e.clientY);e.stopPropagation?.();return;}
   if(!cancel&&!state.moved&&state.surface===grip)activateHandle();if(returnHome)home.attach();else clamp();if(!cancel&&!state.moved&&state.button&&e.pointerType==='touch'){touchClick={button:state.button,until:performance.now()+700};state.button.click();}e.stopPropagation?.();
  }
  for(const surface of [grip,tray]){listen(surface,'pointerdown',e=>begin(e,surface));listen(surface,'pointercancel',e=>finish(e,true));listen(surface,'lostpointercapture',e=>{if(e.target===surface)finish(e,true)})}
  listen(document,'pointermove',move,true);listen(document,'pointerup',e=>finish(e),true);
  listen(tray,'click',e=>{if(touchClick&&e.isTrusted&&(e.pointerType==='touch'||e.sourceCapabilities?.firesTouchEvents)&&performance.now()<touchClick.until&&touchClick.button.contains(e.target)){touchClick=null;e.preventDefault();e.stopImmediatePropagation();return;}if(ignoreClick){e.preventDefault();e.stopImmediatePropagation();ignoreClick=false}},true);
  for(const type of ['pointerdown','pointermove','pointerup','pointercancel','wheel','dblclick'])listen(shell,type,e=>e.stopPropagation());
  listen(grip,'keydown',e=>{if(!enabled())return;if(e.key==='Enter'||e.key===' '){e.preventDefault();activateHandle();return;}const d={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(!d)return;e.preventDefault();const r=shell.getBoundingClientRect(),step=e.shiftKey?25:10;docked=null;place(r.left+d[0]*step,r.top+d[1]*step);dock()});
  listen(document,'keydown',e=>{if(e.key==='Escape'&&moving){finish({pointerId:moving.id},true);e.preventDefault();e.stopImmediatePropagation()}},true);
  listen(window,'blur',()=>{if(moving)finish({pointerId:moving.id},true)});listen(window,'resize',clamp);
  if(window.visualViewport){listen(window.visualViewport,'resize',clamp);listen(window.visualViewport,'scroll',clamp)}
  const observer=observePaneSize(shell,clamp);const syncCompact=()=>{const single=tray.querySelectorAll('button').length<=1;grip.hidden=single;shell.dataset.singleTool=String(single);clamp();};const compactObserver=typeof MutationObserver!=='undefined'?new MutationObserver(syncCompact):null;compactObserver?.observe(tray,{childList:true});syncCompact();
  const controller={shell,alignGroup(edge,reference,before){
   docked=null;vertical(edge==='top'||edge==='bottom');syncCompact();
   const r=shell.getBoundingClientRect(),after=reference.getBoundingClientRect();place(r.left+before.left-after.left,r.top+before.top-after.top);
  },setCollapseAnchor(anchor){collapseAnchor=anchor;if(anchor){anchor.setAttribute('aria-expanded',String(!shell.hidden));if(shell.id)anchor.setAttribute('aria-controls',shell.id);}syncHandle();},setOrientationParent(parent){if(parent===orientationParent)return;orientationObserver?.disconnect();orientationParent=parent||null;if(orientationParent){const sync=()=>{if(orientationIndependent)return;shell.dataset.orientationMode='perpendicular';vertical(false);clamp()};orientationObserver=new MutationObserver(sync);orientationObserver.observe(orientationParent,{attributes:true,attributeFilter:['class','aria-orientation','data-handle-end','style']});sync();}},get orientationIndependent(){return orientationIndependent},placeFromButton(anchor,{gap=4}={}){docked=null;popupAnchor=anchor;popupGap=gap;handleAutomatic=true;alignPopup();},place(x,y){popupAnchor=null;docked=null;place(x,y)},clamp,bounds,handle:grip,items:tray,detach,previewGroup,clearGroupPreview,destroy(){toolbarGroup?.members.delete(controller);resetPreview();orientationObserver?.disconnect();observer?.disconnect();compactObserver?.disconnect();for(const cleanup of cleanups)cleanup();delete tray.chipToolbar}};tray.chipToolbar=controller;toolbarGroup?.members.add(controller);if(toolbarGroup?.path)shell.dataset.toolPath=toolbarGroup.path;syncHandle();clamp();return controller;
 }

 resizePanel(panel,{minWidth,minHeight,enabled:()=>!collapsed});window.addEventListener('resize',clamp);if(window.visualViewport){window.visualViewport.addEventListener('resize',clamp);window.visualViewport.addEventListener('scroll',clamp)}observePaneSize(panel,clamp);if(panel.localName==='details')panel.addEventListener('toggle',clamp);const controller={clamp,place,heading,body,setCollapsed,setPinned,get pinned(){return pinned},get collapsed(){return collapsed}};panel.chipFloatingPanel=controller;return controller;
}

function resizePanel(panel,{minWidth=190,minHeight=120,enabled=()=>true}={}){let drag=null;function bounds(){return paneBounds()}function apply(r){panel.style.setProperty('--ui-panel-height',r.height+'px');const heading=panel.querySelector('.ui-panel-heading,.ui-floating-heading');panel.style.setProperty('--ui-panel-heading-height',(heading?.getBoundingClientRect().height||36)+'px');for(const [key,value]of Object.entries({left:r.left,top:r.top,width:r.width,height:r.height}))panel.style.setProperty(key,value+'px','important');panel.style.setProperty('right','auto','important');panel.style.setProperty('bottom','auto','important');panel.classList.add('ui-panel-resized')}
for(const edge of ['n','e','s','w','ne','nw','se','sw']){const handle=document.createElement('span');handle.className='ui-panel-edge edge-'+edge;handle.setAttribute('data-resize-edge',edge);handle.setAttribute('aria-hidden','true');panel.append(handle);handle.addEventListener('pointerdown',e=>{if(e.button!==0||!enabled())return;const r=panel.getBoundingClientRect();drag={id:e.pointerId,x:e.clientX,y:e.clientY,r:{left:r.left,top:r.top,width:r.width,height:r.height}};handle.setPointerCapture(e.pointerId);e.preventDefault();e.stopPropagation()});handle.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const b=bounds(),r=drag.r,dx=e.clientX-drag.x,dy=e.clientY-drag.y;let l=r.left,t=r.top,right=r.left+r.width,bottom=r.top+r.height;if(edge.includes('w'))l=Math.max(b.left,Math.min(right-Math.min(minWidth,b.right-b.left),l+dx));if(edge.includes('e'))right=Math.min(b.right,Math.max(l+Math.min(minWidth,b.right-b.left),right+dx));if(edge.includes('n'))t=Math.max(b.top,Math.min(bottom-Math.min(minHeight,b.bottom-b.top),t+dy));if(edge.includes('s'))bottom=Math.min(b.bottom,Math.max(t+Math.min(minHeight,b.bottom-b.top),bottom+dy));apply({left:l,top:t,width:right-l,height:bottom-t});e.preventDefault();e.stopPropagation()});function end(e){if(!drag||drag.id!==e.pointerId)return;drag=null;if(handle.hasPointerCapture(e.pointerId))handle.releasePointerCapture(e.pointerId);e.stopPropagation()}for(const type of ['pointerup','pointercancel','lostpointercapture'])handle.addEventListener(type,end)}window.addEventListener('resize',()=>{if(!panel.classList.contains('ui-panel-resized')||!enabled())return;const b=bounds(),r=panel.getBoundingClientRect(),width=Math.min(r.width,b.right-b.left),height=Math.min(r.height,b.bottom-b.top);apply({left:Math.max(b.left,Math.min(r.left,b.right-width)),top:Math.max(b.top,Math.min(r.top,b.bottom-height)),width,height})});}

const inputHelp={
 normalize:mode=>['mouse','touch','pen','keyboard'].includes(mode)?mode:'mouse',
 text(text,mode){const words=mode==='touch'?{'雙擊':'連點兩下','單擊':'輕觸','點擊':'輕觸','點選':'輕觸選取','拖曳':'按住拖動','游標':'觸點'}:mode==='pen'?{'雙擊':'筆尖連點兩下','單擊':'筆尖點選','點擊':'筆尖點選','點選':'筆尖點選','拖曳':'按筆拖動','放開':'提筆','游標':'筆尖'}:{};return String(text||'').replace(/雙擊|單擊|點擊|點選|拖曳|放開|游標/g,word=>words[word]||word);},
 keyboard(type){return options.keyboardHelp?.(type)||'Enter／空白啟用。';},
 pointer(mode){return mode==='touch'?'M-5 0a5 5 0 1 0 10 0a5 5 0 1 0-10 0 M0 0v12m0-7 5 2 3 9H-3l-4-8 3-2 4 4':mode==='pen'?'M0 0 3-10 8-5Z M3-10l10-10 5 5L8-5':'M0 0v15l4-4 4 7 4-2-4-7 6-1Z';},
 keyboardVisual(type){const scene=interactionHelp({id:'keyboard-input',label:'鍵盤操作',duration:4000}),keys=[['Tab',25],['Enter',100],['空白',175]],rects=keys.map(([label,x])=>{const rect=scene.node('rect',{x,y:55,width:60,height:42,rx:5,stroke:'#7fa2ca'});const text=scene.node('text',{x:x+30,y:81,'text-anchor':'middle',fill:'#e7edf7','font-size':12});text.textContent=label;return rect;});const caption=scene.node('text',{x:12,y:135,fill:'#e7edf7','font-size':11});caption.textContent='移動焦點 → 啟用工具';return scene.bind(time=>rects.forEach((rect,i)=>scene.set(rect,{fill:Math.floor(time*3)===i?'#315b8d':'#172438'})));}
};
function attachIconTooltips(){const tip=document.createElement('div');tip.id='chipIconTooltip';tip.className='chip-icon-tooltip';tip.setAttribute('role','tooltip');tip.hidden=true;document.body.append(tip);let hovered=null,focused=null,owner=null,touchOwner=null,input='mouse',paintedInput=null;
 for(const button of document.querySelectorAll('button'))if(button.querySelector('svg')&&button.getAttribute('title')){if(!button.getAttribute('data-tooltip'))button.setAttribute('data-tooltip',button.getAttribute('title'));button.removeAttribute('title')}
 function candidate(target){const button=target?.closest?.('button,[data-tooltip]');if(!button)return null;const title=button.getAttribute('title');if(title&&!button.getAttribute('data-tooltip'))button.setAttribute('data-tooltip',title);if(!button.getAttribute('data-tooltip')&&!button.getAttribute('aria-label'))return null;button.setAttribute('title','');return button}
 function hidden(node){for(let current=node;current;current=current.parentNode)if(current.hidden)return true;return false;}
 function paint(){const previous=owner;if(owner){const ids=(owner.getAttribute('aria-describedby')||'').split(' ').filter(id=>id&&id!==tip.id);if(ids.length)owner.setAttribute('aria-describedby',ids.join(' '));else owner.removeAttribute('aria-describedby')}owner=touchOwner||hovered||focused;if(owner&&(!document.body.contains(owner)||hidden(owner))){hovered=null;focused=null;touchOwner=null;owner=null}if(!owner){tip.querySelector('svg')?.chipHelpStop?.();tip.hidden=true;return}if(previous!==owner||tip.hidden||paintedInput!==input){tip.querySelector('svg')?.chipHelpStop?.();const raw=owner.getAttribute('data-tooltip')||owner.getAttribute('aria-label'),text=input==='keyboard'?(typeof owner.chipKeyboardHelp==='function'?owner.chipKeyboardHelp():owner.chipKeyboardHelp||inputHelp.keyboard(owner.chipHelpTool)):inputHelp.text(raw,input);tip.textContent=(input==='touch'?'觸控：':input==='pen'?'數位筆：':'')+text;if(typeof owner.chipHelpVisual==='function'){const visual=input==='keyboard'?inputHelp.keyboardVisual(owner.chipHelpTool):owner.chipHelpVisual();if(visual){visual.chipHelpInput?.(input);tip.append(visual)}}paintedInput=input;}tip.dataset.inputMode=input;tip.hidden=false;tip.querySelector('svg')?.chipHelpPlay?.();owner.setAttribute('aria-describedby',((owner.getAttribute('aria-describedby')||'')+' '+tip.id).trim());const r=owner.getBoundingClientRect(),t=tip.getBoundingClientRect();tip.style.left=Math.max(8,Math.min(innerWidth-t.width-8,r.left+(r.width-t.width)/2))+'px';tip.style.top=(r.bottom+t.height+14<innerHeight?r.bottom+7:Math.max(8,r.top-t.height-7))+'px'}
 function clear(){hovered=null;focused=null;touchOwner=null;paint()}
 document.addEventListener('visibilitychange',()=>{if(document.hidden)clear()});document.addEventListener('pointerover',e=>{if(touchOwner&&e.pointerType==='touch')return;input=inputHelp.normalize(e.pointerType);if(input!=='touch')touchOwner=null;hovered=candidate(e.target);paint()});document.addEventListener('pointerout',e=>{if(touchOwner&&e.pointerType==='touch')return;hovered=candidate(e.relatedTarget);if(focused&&!focused.contains(e.relatedTarget))focused=null;paint()},true);document.addEventListener('pointermove',e=>{const next=candidate(e.target),mode=inputHelp.normalize(e.pointerType);if(mode==='touch'&&touchOwner)return;if(next!==hovered||mode!==input||focused&&!focused.contains(e.target)){input=mode;touchOwner=null;hovered=next;if(focused&&!focused.contains(e.target))focused=null;paint()}},true);document.documentElement.addEventListener('pointerleave',()=>{if(!touchOwner)clear()});document.addEventListener('focusin',e=>{focused=candidate(e.target);paint()});document.addEventListener('focusout',e=>{focused=candidate(e.relatedTarget);paint()});document.addEventListener('pointerdown',e=>{input=inputHelp.normalize(e.pointerType);const next=candidate(e.target);touchOwner=input==='touch'?next:null;hovered=input==='touch'||input==='pen'?next:null;if(focused&&!focused.contains(e.target))focused=null;paint()},true);document.addEventListener('keydown',e=>{if(e.key==='Escape'){clear();return;}if(['Tab','Enter',' ','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){input='keyboard';touchOwner=null;hovered=null;focused=candidate(e.target)||candidate(document.activeElement);paint()}},true);window.addEventListener('blur',clear);window.addEventListener('resize',clear);document.addEventListener('scroll',clear,true);document.addEventListener('interactionhelpdismiss',clear);
}

function attachTextInteractionPolicy(){const permitted=target=>!!target?.closest?.('input,textarea,[contenteditable="true"],[data-copyable="true"]');for(const type of ['contextmenu','selectstart','copy','cut'])document.addEventListener(type,e=>{if(!permitted(e.target))e.preventDefault()},true)}
function interactionHelp({label,id,duration=4200}){
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),node=(tag,attrs={},parent=svg)=>{const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [key,value]of Object.entries(attrs))n.setAttribute(key,value);parent.append(n);return n},set=(n,attrs)=>{for(const [key,value]of Object.entries(attrs))if(n.getAttribute(key)!==String(value))n.setAttribute(key,value)};
 set(svg,{viewBox:'0 0 260 178',width:260,height:178,role:'img','aria-label':label,'data-demo-duration':duration});svg.dataset.interactionHelp=id;svg.style.cssText='display:block;max-width:100%;height:auto;margin-top:8px;background:#172438;border-radius:4px';
 const feedback=node('g',{'data-demo-input-feedback':'',visibility:'hidden','pointer-events':'none'}),device=node('path',{fill:'#172438',stroke:'#e7edf7','stroke-width':1.3,transform:'translate(0 -65)'},feedback),button=node('path',{'data-demo-button':'',fill:'#ffd166',stroke:'#ffd166','stroke-width':1,transform:'translate(0 -65)'},feedback),actionLabel=node('text',{x:8,y:151,fill:'#ffd166','font-size':10,'data-demo-action':''},feedback),pulse=node('circle',{'data-demo-input-pulse':'',fill:'none',stroke:'#ffd166','stroke-width':1.8,visibility:'hidden'},feedback);
 let frame=0,start=0,paint=()=>{},input='mouse',variants=[{id:'default'}],action=null;const texts=new WeakMap();
 function inputEvents(progress,events){const list=events.flatMap(e=>e.kind==='double'?[{...e,time:e.time-.09,kind:'down',count:2},{...e,time:e.time-.06,kind:'up',count:2},{...e,time:e.time-.03,kind:'down',count:2},{...e,kind:'up',count:2}]:[e]).filter(e=>e.kind==='down'||e.kind==='up'),recent=list.filter(e=>e.time<=progress).at(-1);if(!recent)return;const down=recent.kind==='down',next=list.find(e=>e.time>progress),hold=down&&(!next||next.time-recent.time>.09)||!down&&recent.time-(list.filter(e=>e.time<recent.time&&e.kind==='down').at(-1)?.time??recent.time)>.09,press=list.filter(e=>e.time<=recent.time&&e.kind==='down').at(-1),age=(progress-(press?.time??recent.time))*duration;action={button:recent.button??0,down,hold,count:recent.count||1,p:recent.p,active:down||(progress-recent.time)*duration<240,age};}
 function adapt(){svg.dataset.inputMode=input;set(svg,{'aria-label':inputHelp.text(label,input)});for(const pointer of svg.querySelectorAll('[data-demo-pointer]')){pointer.chipMousePath??=pointer.getAttribute('d');set(pointer,{d:input==='mouse'?pointer.chipMousePath:inputHelp.pointer(input),'data-input-pointer':input});}for(const text of svg.querySelectorAll('text')){if(text.hasAttribute('data-demo-action'))continue;let saved=texts.get(text);if(!saved||text.textContent!==saved.shown)saved={base:text.textContent};saved.shown=inputHelp.text(saved.base,input);text.textContent=saved.shown;texts.set(text,saved);}}
 function showInput(){let state=action;const legacy=svg.querySelector('[data-demo-click][visibility="visible"]');if(!state&&legacy)state={button:0,down:true,hold:false,count:1,active:true,age:0,p:{x:Number(legacy.getAttribute('cx')),y:Number(legacy.getAttribute('cy'))}};if(!state&&svg.dataset.pointerDown==='true')state={button:0,down:true,hold:true,count:1,active:true,age:0};const visible=!!state?.active&&input!=='keyboard';set(feedback,{visibility:visible?'visible':'hidden'});set(pulse,{visibility:'hidden'});svg.dataset.demoButton=visible?['primary','middle','secondary'][state.button]||'primary':'';svg.dataset.demoClickCount=visible?state.count:0;svg.dataset.demoPressed=String(visible&&state.down);if(!visible)return;
  const key=state.button===2?'次鍵':state.button===1?'滾輪鍵':'主鍵',verb=state.hold?(state.down?'按住拖動':'放開'):state.count===2?'雙擊':'單擊';const actionText=input==='touch'?(state.hold?(state.down?'按住拖動':'放開'):state.count===2?'連點兩下':'輕觸一次'):input==='pen'?(state.button===0?'筆尖／主鍵':key)+'・'+verb:key+'・'+verb;if(actionLabel.textContent!==actionText)actionLabel.textContent=actionText;
  const mouse='M212 106v-7a12 12 0 0 1 24 0v7a12 12 0 0 1-24 0Z M224 87v13',pen='M213 112l3-9 16-17 6 6-17 17Z M216 103l5 6 M225 94l6 6',touch='M222 106a7 7 0 1 0 0-14a7 7 0 1 0 0 14 M222 99v18';set(device,{d:input==='touch'?touch:input==='pen'?pen:mouse});set(button,{d:input==='touch'?'M219 96h6v6h-6Z':input==='pen'?(state.button===0?'M213 112l3-9 5 6Z':state.button===2?'M225 94l4-4 3 3-4 4Z':'M221 99l3-3 3 3-3 3Z'):state.button===2?'M226 89a10 10 0 0 1 8 10h-8Z':state.button===1?'M222 91h4v8h-4Z':'M214 99a10 10 0 0 1 8-10v10Z',opacity:state.down?1:.35});if(state.p){set(pulse,{cx:state.p.x,cy:state.p.y,r:4+Math.min(1,state.age/240)*9,opacity:Math.max(.25,1-state.age/300),visibility:state.hold||state.age>300?'hidden':'visible'});}if(svg.lastChild!==feedback)svg.append(feedback);
 }
 svg.chipHelpInput=mode=>{input=inputHelp.normalize(mode);showInput();adapt();};const render=(progress,variant)=>{action=null;svg.dataset.interactionMode=variant.id;paint(progress,variant);showInput();adapt()};
 function tick(now){frame=0;if(!svg.isConnected||svg.closest('[hidden]')||document.hidden)return;const time=(Math.max(0,now-start)/duration)%variants.length,index=Math.floor(time);render(time-index,variants[index]);frame=requestAnimationFrame(tick)}
 svg.chipHelpStop=()=>{cancelAnimationFrame(frame);frame=0};svg.chipHelpPlay=()=>{if(frame)return;start=performance.now();frame=requestAnimationFrame(tick)};svg.chipHelpSeek=progress=>{svg.chipHelpStop();render(progress,variants[0])};svg.chipHelpMode=(id,progress)=>{const variant=variants.find(item=>item.id===id);if(!variant)throw Error('未知交互示範模式');svg.chipHelpStop();render(progress,variant)};
 return {svg,node,set,input:inputEvents,lerp:(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t}),bind(renderer,items=variants){paint=renderer;variants=items;render(0,variants[0]);return svg}};
}
function attachChoiceMenus(){let state=null;
 document.addEventListener('wheel',e=>{if(!e.deltaY)return;if(!state){const trigger=e.target.closest?.('select.ui-choice,[aria-haspopup=listbox]'),select=trigger?.matches('select.ui-choice')?trigger:trigger?.id?[...document.querySelectorAll('select[data-choice-anchor]')].find(n=>n.dataset.choiceAnchor===trigger.id):null;if(!select||select.disabled)return;e.preventDefault();e.stopImmediatePropagation();moveClosed(select,e.deltaY>0?1:-1);return}const {popup,trigger}=state;if(!popup.contains(e.target)&&!trigger.contains(e.target)){close();return;}e.preventDefault();e.stopImmediatePropagation();highlight(state.index+(e.deltaY>0?1:-1),true)},{capture:true,passive:false});
 function close(focus=false){if(!state)return;const old=state;state=null;old.popup.remove();old.trigger.setAttribute('aria-expanded','false');old.trigger.removeAttribute('aria-activedescendant');if(focus)old.trigger.focus()}
 function highlight(index,selectNow=false){if(!state||!state.items.length)return;state.index=(index+state.items.length)%state.items.length;state.items.forEach((item,i)=>{item.classList.toggle('focused',i===state.index);if(i===state.index){state.trigger.setAttribute('aria-activedescendant',item.id);item.scrollIntoView?.({block:'nearest'})}});if(selectNow)apply(state.index)}
 function updateValue(select,value){if(value===undefined||select.value===value)return;select.value=value;select.dispatchEvent(new Event('input',{bubbles:true}));select.dispatchEvent(new Event('change',{bubbles:true}))}
 function moveClosed(select,move){const options=[...select.options].filter(n=>!n.disabled&&!n.hidden);if(!options.length)return;const index=Math.max(0,options.findIndex(n=>n.value===select.value)),next=move==='first'?0:move==='last'?options.length-1:(index+move%options.length+options.length)%options.length;updateValue(select,options[next].value)}
 function apply(index){if(!state)return;const current=state,select=current.select,value=current.items[index]?.dataset.value;if(value===undefined)return;current.items.forEach((item,i)=>item.setAttribute('aria-selected',String(i===index)));updateValue(select,value)}
 function commit(index){if(!state)return;apply(index);close(true)}
 function open(select){if(select.disabled)return;if(state?.select===select){close(true);return}close();const popup=document.createElement('div');popup.className='ui-choice-popup';popup.chipOwner=select;popup.setAttribute('data-panel-popup','true');popup.chipClose=()=>close(false);popup.id='uiChoicePopup';popup.setAttribute('role','listbox');popup.setAttribute('popover','manual');popup.setAttribute('aria-label',select.getAttribute('aria-label')||select.closest('label')?.textContent?.trim()||'選擇');document.body.append(popup);popup.showPopover?.();const items=[];for(const option of [...select.options]){if(option.disabled||option.hidden)continue;const item=document.createElement('button');item.type='button';item.id='uiChoiceOption'+items.length;item.setAttribute('role','option');item.setAttribute('aria-selected',String(option.value===select.value));item.dataset.value=option.value;item.textContent=option.textContent;const index=items.length;const shortcut='1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ'[index];if(shortcut){item.dataset.shortcut=shortcut;item.setAttribute('aria-keyshortcuts',shortcut)}item.addEventListener('pointerdown',e=>e.preventDefault());item.addEventListener('pointermove',()=>highlight(index));item.addEventListener('click',()=>commit(index));popup.append(item);items.push(item)}const trigger=select.dataset.choiceAnchor?$(select.dataset.choiceAnchor):select,r=trigger.getBoundingClientRect(),b=paneBounds(),spaceBelow=b.bottom-r.bottom,spaceAbove=r.top-b.top,height=Math.min(320,Math.max(spaceBelow,spaceAbove));popup.style.maxHeight=height+'px';popup.style.width='max-content';popup.style.maxWidth=Math.min(b.right-b.left,innerWidth-16)+'px';placePopup(popup,r.left,spaceBelow>=Math.min(height,popup.scrollHeight)?r.bottom+4:r.top-popup.getBoundingClientRect().height-4);popup.style.maxHeight=height+'px';state={select,trigger,popup,items,anchorRect:{left:r.left,top:r.top},viewportWidth:innerWidth,viewportHeight:innerHeight,index:Math.max(0,items.findIndex(n=>n.dataset.value===select.value))};trigger.setAttribute('aria-controls',popup.id);trigger.setAttribute('aria-expanded','true');trigger.focus();highlight(state.index)}
 function enhance(select){if(select.dataset.uiChoice)return;select.dataset.uiChoice='true';const trigger=select.dataset.choiceAnchor?$(select.dataset.choiceAnchor):select;select.classList.add('ui-choice');select.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-expanded','false');const cycle=select.dataset.cycleUnit==='true',existing=select.dataset.cycleUnit==='existing';
 if(cycle||existing)trigger.addEventListener('contextmenu',e=>{e.preventDefault();e.stopPropagation();open(select)});
 trigger.addEventListener('pointerdown',e=>{if(e.button!==undefined&&e.button!==0)return;e.preventDefault();if(cycle||existing)trigger.focus();else open(select)});trigger.addEventListener('mousedown',e=>e.preventDefault());trigger.addEventListener('click',e=>{e.preventDefault();if(cycle){close();moveClosed(select,1);$(select.id)?.focus({preventScroll:true});e.stopPropagation()}else if(!existing&&e.detail===0)open(select)});trigger.addEventListener('keydown',e=>{if(state?.select===select&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&!e.isComposing){
 const index=state.items.findIndex(item=>item.dataset.shortcut===e.key.toUpperCase());
 if(index>=0){e.preventDefault();e.stopPropagation();if(!e.repeat)commit(index);return;}
 }if(existing&&!state){if(e.key==='F4'||e.key==='ContextMenu'||(e.shiftKey&&e.key==='F10')){e.preventDefault();trigger.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true}));}return;}if(e.key==='Escape'&&!state)return;if(['ArrowDown','ArrowUp','Home','End','Enter',' ','Escape','Tab','F4','PageDown','PageUp'].includes(e.key)){if(e.key==='Tab'){close();return}e.preventDefault();e.stopPropagation();if(e.key==='Escape'){close(true);return}if(!state||state.select!==select){if(cycle&&['Enter',' '].includes(e.key))moveClosed(select,1);else if(['Enter',' ','F4'].includes(e.key))open(select);else moveClosed(select,e.key==='Home'?'first':e.key==='End'?'last':e.key==='PageUp'?-5:e.key==='PageDown'?5:e.key==='ArrowUp'?-1:1);return}if(e.key==='Enter'||e.key===' '||e.key==='F4')commit(state.index);else highlight(e.key==='Home'?0:e.key==='End'?state.items.length-1:state.index+(e.key==='PageUp'?-5:e.key==='PageDown'?5:e.key==='ArrowUp'?-1:1),true)}else if(e.key.length===1){e.preventDefault();if(!state||state.select!==select){const option=[...select.options].find(n=>!n.disabled&&!n.hidden&&n.textContent.toLowerCase().startsWith(e.key.toLowerCase()));if(option)updateValue(select,option.value);return}const index=state.items.findIndex(n=>n.textContent.toLowerCase().startsWith(e.key.toLowerCase()));if(index>=0)highlight(index,true)}})}
 function scan(){for(const select of document.querySelectorAll('select'))enhance(select)}scan();if(typeof MutationObserver!=='undefined')new MutationObserver(records=>{if(state&&(!state.select.isConnected||!state.trigger.isConnected))close();if(records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&(n.matches?.('select')||n.querySelector?.('select')))))scan()}).observe(document.body,{childList:true,subtree:true});document.addEventListener('pointerdown',e=>{if(state&&!state.popup.contains(e.target)&&e.target!==state.trigger&&!state.trigger.contains(e.target))close()},true);document.addEventListener('change',e=>{if(state&&e.target!==state.select)close()});root.ChipUI.choiceMenus={enhance,closeFor(owner){if(state&&owner.contains(state.select))close()},containsFor(owner,target){return !!state&&owner.contains(state.select)&&state.popup.contains(target)}};window.addEventListener('resize',()=>{if(state&&(state.viewportWidth!==innerWidth||state.viewportHeight!==innerHeight))close()});window.addEventListener('blur',()=>close());document.addEventListener('scroll',e=>{if(state&&!state.popup.contains(e.target)){const r=state.trigger.getBoundingClientRect();if(Math.abs(r.left-state.anchorRect.left)>.5||Math.abs(r.top-state.anchorRect.top)>.5)close()}},true);
}
function bindButtonInput(button,definition){
 const update=ChipUIDefinitions.createButtonGesture();
 let pointer=null,timer=null,blocked=false,blockMenu=false;
 const emit=(kind,event)=>{
  if(kind && typeof CustomEvent==='function')button.dispatchEvent(new CustomEvent('chipbuttoninteraction',{bubbles:true,
   detail:{action:definition.action,kind,device:event.pointerType||'keyboard'}}));
 };
 const stop=()=>{clearTimeout(timer);timer=null};
 button.addEventListener('pointerenter',e=>emit(ChipUIDefinitions.interaction(e.pointerType,'hover'),e));
 button.addEventListener('focusin',e=>{if(button.matches?.(':focus-visible'))emit(ChipUIDefinitions.interaction('keyboard','focus'),e)});
 button.addEventListener('pointerdown',e=>{
  if(e.button===2)blockMenu=false;
  if(pointer!==null || e.button!==0)return;
  pointer=e.pointerId;blocked=false;blockMenu=false;button.chipHeld=false;
  if(e.pointerType==='touch'||e.pointerType==='pen')button.setPointerCapture?.(pointer);
  update('down',e.pointerType,e.clientX,e.clientY);
  if(ChipUIDefinitions.interaction(e.pointerType,'hold'))timer=setTimeout(()=>{
   const kind=update('hold',e.pointerType);
   if(kind){blocked=true;blockMenu=true;button.chipHeld=true;emit(kind,e)}
  },ChipUIDefinitions.holdMs);
 });
 button.addEventListener('pointermove',e=>{
  if(e.pointerId!==pointer)return;
  const kind=update('move',e.pointerType,e.clientX,e.clientY);
  if(kind){stop();blocked=true;emit(kind,e)}
 });
 const finish=e=>{
  if(pointer!==e.pointerId)return;
  stop();pointer=null;
  update(e.type==='pointerup'?'up':'cancel',e.pointerType);
 };
 for(const type of ['pointerup','pointercancel','lostpointercapture','pointerleave'])button.addEventListener(type,finish);
 button.addEventListener('keydown',e=>{
  if(e.key==='ContextMenu'||e.key==='F10'&&e.shiftKey){
   e.preventDefault();blockMenu=true;if(!e.repeat)emit(update('menu','keyboard'),e);
  }else if(e.key==='Enter'||e.key===' ')blocked=false;
 });
 button.addEventListener('contextmenu',e=>{
  e.preventDefault();
  if(blocked&&!button.chipHeld)return;
  if(blockMenu){blockMenu=false;return;}
  const device=e.pointerType||'mouse';
  if(device==='touch'||device==='pen'){
   const kind=update('hold',device);stop();
   if(kind){blocked=true;button.chipHeld=true;emit(kind,e)}
  }else emit(update('secondary',device),{pointerType:device});
 });
 button.addEventListener('click',e=>{
  if(blocked&&(e.detail!==0||e.pointerType)){e.preventDefault();e.stopImmediatePropagation();return;}
  const device=e.pointerType||(e.detail?'mouse':'keyboard');
  emit(ChipUIDefinitions.interaction(device,device==='keyboard'?'activate':'tap'),{pointerType:device});
 },true);
}
function optionModel(host,{items,selected=null,mode='multiple',adopt=false,role='group',priority=false,resortable=priority,detail_type='auto_collapse',defaultSlot=false,onChange=()=>{},onOrderChange=null}){selected=selected||(mode==='single'?items.slice(0,1).map(n=>n.id):items.map(n=>n.id));host.classList.add('ui-option-model');host.setAttribute('role',role);host.dataset.selectionMode=mode;host.dataset.resortable=String(resortable);host.dataset.priority=String(resortable);let gesture=null,ignoreClick=false;const buttons=()=>[...host.children].flatMap(n=>n.chipToolbarButton?[n.chipToolbarButton]:n.getAttribute('data-option-id')!==null?[n]:[]),values=()=>buttons().filter(n=>n.getAttribute('aria-pressed')==='true').map(n=>n.dataset.optionId),notify=(ordering=false)=>{syncDivider();syncDetail();if(ordering&&onOrderChange)onOrderChange(buttons().map(n=>n.dataset.optionId));else onChange(values(),buttons().map(n=>n.dataset.optionId))};if(!adopt)host.replaceChildren();for(const item of items){const button=adopt?host.querySelector('[data-tool="'+item.id+'"]'):document.createElement('button');if(!button)continue;if(adopt)button.onclick=null;if(item.buttonDefinition)bindButtonInput(button,item.buttonDefinition);button.type='button';button.setAttribute('data-option-id',item.id);button.dataset.optionGroup=item.group||'';if(item.toolPath)button.dataset.toolPath=item.toolPath;button.setAttribute('aria-label',item.label);button.setAttribute('title',item.help||item.label);button.setAttribute('data-tooltip',item.help||item.label);button.chipHelpVisual=item.helpVisual;button.chipHelpTool=item.toolType||button.dataset.tool;button.chipKeyboardHelp=item.keyboardHelp;button.setAttribute('aria-pressed',String(selected.includes(item.id)));if(mode==='single')button.classList.toggle('active',selected.includes(item.id));if(item.text){button.dataset.optionText='true';button.textContent=item.label;}else if(item.buttonDefinition){
 button.innerHTML=item.icon||'';
 if(!button.querySelector('svg') || !document.createElementNS){
  button.dataset.optionText='true';
  button.textContent=item.label;
 }
}else if(item.icon)button.innerHTML=item.icon;else if(!adopt||!button.querySelector('svg'))button.textContent=item.label;button.addEventListener('click',event=>{if(ignoreClick && event.detail!==0){ignoreClick=false;return}if(mode==='single'){for(const n of buttons()){const active=n===button;n.setAttribute('aria-pressed',String(active));n.classList.toggle('active',active)}}else button.setAttribute('aria-pressed',String(button.getAttribute('aria-pressed')!=='true'));notify()});if(!adopt)host.append(button)}
 const divider=defaultSlot?document.createElement('span'):null;
 function syncDivider(){if(!divider)return;const all=defaultSlot==='visible'?buttons().filter(button=>button.parentNode===host):buttons(),first=all[0];if(all.length<2||first?.parentNode!==host){divider.remove();return;}divider.className='ui-option-default-separator';divider.setAttribute('role','separator');divider.setAttribute('aria-label','預設欄位分隔');divider.setAttribute('aria-orientation',getComputedStyle(host).flexDirection==='column'?'horizontal':'vertical');if(divider.parentNode!==host||divider.previousSibling!==first)host.insertBefore(divider,first.nextSibling);}
 let detailOpen=false;
 function setDetailOpen(open){
  detailOpen=open;
  if(open)host.setAttribute('data-choice-open','true');else host.removeAttribute('data-choice-open');
 }
 function syncDetail(){
  if(mode!=='single' || !host.getBoundingClientRect)return;
  const all=buttons().filter(button=>button.parentNode===host && !button.hidden);
  const representative=all.find(button=>button.getAttribute('aria-pressed')==='true')||all[0];
  for(const button of all){
   if(button===representative)button.setAttribute('data-choice-current','');else button.removeAttribute('data-choice-current');
  }
  let collapsed=detail_type==='collapse';
  if(detail_type==='auto_collapse' && all.length>1 && host.clientWidth){
   // Measure the expanded row, including the default-slot divider and the actual gaps.
   host.removeAttribute('data-choice-collapsed');
   const style=getComputedStyle(host),vertical=style.flexDirection==='column';
   const widths=all.map(b=>Math.max(b.offsetWidth||0,b.scrollWidth||0));
   if(divider?.parentNode===host)widths.push(divider.offsetWidth||0);
   const gap=parseFloat(style.columnGap)||0;
   const required=vertical?Math.max(...widths):widths.reduce((sum,w)=>sum+w,0)+gap*(widths.length-1);
   const available=host.clientWidth-(parseFloat(style.paddingLeft)||0)-(parseFloat(style.paddingRight)||0);
   collapsed=required>available+0.5;
  }
  if(collapsed && all.length>1)host.setAttribute('data-choice-collapsed','true');
  else{host.removeAttribute('data-choice-collapsed');setDetailOpen(false);}
 }
 function setDetailType(value){
  if(!['auto_collapse','collapse','expand'].includes(value))throw new TypeError('Invalid detail_type: '+value);
  detail_type=value;host.dataset.detailType=value;setDetailOpen(false);syncDetail();
 }
 const cleanups=[];
 function listen(target,type,listener,options){target.addEventListener(type,listener,options);cleanups.push(()=>target.removeEventListener(type,listener,options))}
 if(mode==='single'){
  setDetailType(detail_type);
  listen(host,'click',e=>{
   if(!host.getAttribute('data-choice-collapsed')||ignoreClick)return;
   const button=e.target.closest?.('[data-option-id]');
   if(!button||button.parentNode!==host)return;
   if(!detailOpen && button.hasAttribute('data-choice-current')){
    e.preventDefault();e.stopImmediatePropagation();setDetailOpen(true);
   }else if(detailOpen)setDetailOpen(false);
  },true);
  listen(document,'pointerdown',e=>{if(detailOpen&&!host.contains(e.target))setDetailOpen(false);},true);
  listen(host,'focusout',e=>{if(detailOpen && !host.contains(e.relatedTarget))setDetailOpen(false);});
  listen(host,'keydown',e=>{if(detailOpen && e.key==='Escape'){setDetailOpen(false);host.querySelector('[data-choice-current]')?.focus();e.stopPropagation();}});
  if(typeof ResizeObserver!=='undefined'){
   const observer=new ResizeObserver(syncDetail);observer.observe(host);
   if(host.parentNode)observer.observe(host.parentNode);
   cleanups.push(()=>observer.disconnect?.());
  }
  function step(direction,focus){
   const all=buttons().filter(button=>button.parentNode===host && !button.disabled && !button.hidden);
   if(all.length<2 || gesture?.moved)return;
   const index=all.findIndex(button=>button.getAttribute('aria-pressed')==='true');
   const next=index<0?(direction>0?0:all.length-1):(index+direction+all.length)%all.length;
   all[next].click();
   if(focus)all[next].focus();
  }
  listen(host,'wheel',e=>{
   if(!e.deltaY||e.ctrlKey||e.defaultPrevented)return;
   e.preventDefault();e.stopPropagation();step(Math.sign(e.deltaY),false);
  },{passive:false});
  listen(host,'keydown',e=>{
   if(e.altKey||e.ctrlKey||e.metaKey||e.shiftKey||e.defaultPrevented||!['ArrowUp','ArrowDown'].includes(e.key))return;
   e.preventDefault();e.stopPropagation();step(e.key==='ArrowDown'?1:-1,true);
  });
 }
 if(resortable){
  function dragVisuals(e){const state=gesture;if(!state)return;
   if(!state.ghost){const rect=state.button.getBoundingClientRect(),style=getComputedStyle(state.button),ghost=state.button.cloneNode(true),marker=document.createElement('div');for(const node of [ghost,...ghost.querySelectorAll('[id]')])node.removeAttribute('id');ghost.removeAttribute('data-option-id');ghost.removeAttribute('data-tool');ghost.removeAttribute('data-tooltip');ghost.classList.add('ui-option-drag-ghost');ghost.setAttribute('aria-hidden','true');ghost.tabIndex=-1;ghost.inert=true;for(const key of ['box-sizing','display','align-items','justify-content','gap','padding','border','border-radius','background-color','color','font','box-shadow'])ghost.style.setProperty(key,style.getPropertyValue(key));ghost.style.setProperty('width',rect.width+'px','important');ghost.style.setProperty('height',rect.height+'px','important');marker.className='ui-option-drop-marker';marker.setAttribute('aria-hidden','true');document.body.append(ghost,marker);state.ghost=ghost;state.marker=marker;state.offset={x:state.x-rect.left,y:state.y-rect.top};state.button.classList.add('ui-option-drag-source');host.dataset.optionDragging='true';}
   state.ghost.style.left=(e.clientX-state.offset.x)+'px';state.ghost.style.top=(e.clientY-state.offset.y)+'px';const bounds=host.getBoundingClientRect(),inside=e.clientX>=bounds.left&&e.clientX<=bounds.right&&e.clientY>=bounds.top&&e.clientY<=bounds.bottom;state.marker.hidden=!inside;if(inside){const r=state.button.getBoundingClientRect(),vertical=getComputedStyle(host).flexDirection==='column';Object.assign(state.marker.style,{left:(vertical?r.left:r.left-3)+'px',top:(vertical?r.top-3:r.top)+'px',width:(vertical?r.width:3)+'px',height:(vertical?3:r.height)+'px'});state.marker.dataset.optionDropIndex=String(buttons().indexOf(state.button));}
  }
  function clearDragVisuals(state){state.ghost?.remove();state.marker?.remove();state.button.classList.remove('ui-option-drag-source');delete host.dataset.optionDragging;}
  listen(host,'pointerdown',e=>{const button=e.target.closest('[data-option-id]');if(!button||e.button!==0||gesture||host.chipToolbar&&buttons().filter(n=>n.parentNode===host).length<=1)return;gesture={button,id:e.pointerId,x:e.clientX,y:e.clientY,moved:false,order:buttons().filter(n=>n.parentNode===host)}});
  listen(document,'pointermove',e=>{if(!gesture||gesture.id!==e.pointerId||gesture.button.chipHeld)return;if(!gesture.moved&&Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)<6)return;if(!gesture.moved){gesture.moved=true;host.setPointerCapture?.(gesture.id)}e.preventDefault();dragVisuals(e);host.chipToolbar?.previewGroup(e.clientX,e.clientY);const bounds=host.getBoundingClientRect();if(e.clientX<bounds.left||e.clientX>bounds.right||e.clientY<bounds.top||e.clientY>bounds.bottom)return;const target=buttons().find(n=>{if(n.parentNode!==host)return false;const r=n.getBoundingClientRect();return n!==gesture.button&&e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom});if(target){const r=target.getBoundingClientRect(),vertical=getComputedStyle(host).flexDirection==='column';host.insertBefore(gesture.button,(vertical?e.clientY<r.top+r.height/2:e.clientX<r.left+r.width/2)?target:target.nextSibling)}syncDivider();dragVisuals(e);},true);
  const finish=(cancel,event)=>{if(!gesture||event?.pointerId!==undefined&&event.pointerId!==gesture.id)return;const state=gesture;gesture=null;clearDragVisuals(state);host.chipToolbar?.clearGroupPreview();if(cancel)for(const n of state.order)host.append(n);syncDivider();ignoreClick=state.moved&&!cancel;if(ignoreClick)setTimeout(()=>{ignoreClick=false},0);if(host.hasPointerCapture?.(state.id))host.releasePointerCapture(state.id);if(state.moved&&!cancel){if(event&&host.chipToolbar){const r=host.getBoundingClientRect();if(event.clientX<r.left-20||event.clientX>r.right+20||event.clientY<r.top-20||event.clientY>r.bottom+20)host.chipToolbar.detach(state.button,event.clientX,event.clientY)}notify(true)}};
  listen(document,'keydown',e=>{if(e.key==='Escape'&&gesture?.moved){finish(true);e.preventDefault();e.stopImmediatePropagation()}},true);listen(window,'blur',()=>finish(true));listen(document,'pointerup',e=>finish(false,e),true);listen(host,'pointercancel',e=>finish(true,e));listen(host,'lostpointercapture',e=>{if(e.target===host)finish(true,e)});listen(host,'keydown',e=>{if(e.key==='Escape'){finish(true);return}if(!e.altKey||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;const button=e.target.closest('[data-option-id]'),all=buttons().filter(n=>n.parentNode===host),i=all.indexOf(button),next=i+(['ArrowLeft','ArrowUp'].includes(e.key)?-1:1);if(i<0||next<0||next>=all.length)return;e.preventDefault();host.insertBefore(button,next<i?all[next]:all[next].nextSibling);button.focus();notify(true)})
 }
 syncDivider();syncDetail();const model={values,setDetailType,destroy(){for(const cleanup of cleanups)cleanup();divider?.remove();host.removeAttribute('data-choice-collapsed');setDetailOpen(false);delete host.chipOptionModel},syncLayout(){syncDivider();syncDetail()},button:id=>buttons().find(n=>n.dataset.optionId===id),refreshOrder:()=>notify(true),setSelected(ids){for(const button of buttons()){const active=ids.includes(button.dataset.optionId);button.setAttribute('aria-pressed',String(active));if(mode==='single')button.classList.toggle('active',active)}syncDetail()},order:()=>buttons().map(n=>n.dataset.optionId)};host.chipOptionModel=model;return model;
}
function twoStateButton(host,{states,value,onChange=()=>{}}){if(states.length!==2)throw Error('Two states required');host.replaceChildren();host.classList.add('ui-option-model');const button=document.createElement('button');button.type='button';button.dataset.twoState='true';host.append(button);let current=states.some(s=>s.id===value)?value:states[0].id;function sync(){const index=states.findIndex(s=>s.id===current),state=states[index];button.innerHTML=state.icon;button.dataset.state=state.id;button.setAttribute('aria-pressed',String(index===1));button.setAttribute('aria-label',state.label);button.setAttribute('title',state.help||state.label);button.dataset.tooltip=state.help||state.label}button.addEventListener('click',()=>{current=states[current===states[0].id?1:0].id;sync();onChange(current)});sync();return {values:()=>[current],setSelected(ids){current=states.find(s=>ids.includes(s.id))?.id||states[0].id;sync()}}}
function boundPhysicalQuantity(host,{id,dimension,object,key,min=null,storageUnit=null,onError=()=>{},read=(obj,k)=>obj[k],write=(obj,k,q)=>{obj[k]=q;},onChange=()=>{},settings=()=>({}),unitLabel=String,archiveQuantity=q=>q,fieldId=(i,part)=>i?id+'-'+part:id,unitId=id+'Unit'}){
 let owner,property,unit=null,active=null,disabled=false,menu=null;
 const model=ChipPhysical;
 function render(keepMenu=false){
  if(owner==null){active=null;menu=null;host.replaceChildren();return;}
  const record=read(owner,property),spec=model.layout(dimension,settings(),unit,record);
  const initial=model.display(record,spec),row=document.createElement('span');
  row.className='conversion-control';if(spec.mode==='ratio'&&!spec.units)row.setAttribute('data-conversion-component','physical');row.setAttribute('role','group');
  const fields=[],binding=owner,fieldKey=property;
  function commit(targetUnit){
   if(row!==active || disabled)return false;
   const values=fields.map(input=>input.value);
   const edited=values.some((value,i)=>value!==initial[i]);
   if(!edited && !targetUnit)return true;
   try{
    if(edited || (targetUnit && dimension==='pixel_phy')){
     let parsed=edited?model.parse(values,spec):read(binding,fieldKey);
     if(targetUnit && dimension==='pixel_phy')parsed=model.convertPixel(parsed,targetUnit);
     const q=spec.mode==='ratio'?parsed:archiveQuantity(storageUnit?model.inUnit(dimension,parsed,storageUnit):parsed);
     if(min!==null && q.value<min)throw Error('量值低於下限');
     write(binding,fieldKey,q);onChange(q,binding);
    }
    if(owner===binding && property===fieldKey){
     if(targetUnit)unit=targetUnit;
     if(row===active || targetUnit)render(!!targetUnit && row===active);
    }
    return true;
   }catch(error){onError(error);fields[0].setCustomValidity?.(error.message);fields[0].reportValidity?.();return false;}
  }
  spec.parts.forEach((part,i)=>{
   const input=document.createElement('input');
   input.id=fieldId(i,part);input.type='text';input.value=initial[i];input.disabled=disabled;
   input.chipCommitQuantity=()=>commit();
   input.setAttribute('data-scalar','physical');
   const label=part==='numerator'?'分子':part==='denominator'?'分母':unitLabel(part);
   input.setAttribute('aria-label',(host.getAttribute('aria-label')||id)+' '+label);
   input.addEventListener('input',()=>fields[0].setCustomValidity(''));
   input.addEventListener('keydown',e=>{
    if(e.isComposing)return;
    if(e.key==='Enter'){e.preventDefault();e.stopPropagation();commit();}
    if(e.key==='Escape' && active===row){e.preventDefault();e.stopPropagation();render();$(input.id)?.focus({preventScroll:true});}
   });
   fields.push(input);row.append(input);
   if(spec.mode==='clock'){const suffix=document.createElement('span');suffix.textContent=label;row.append(suffix);}
   if(spec.mode==='ratio'){
    const code=i===0?spec.ratioUnits.numeratorUnit:spec.ratioUnits.denominatorUnit;
    if(code&&!(spec.units&&i===1)){const suffix=document.createElement('span');suffix.textContent=unitLabel(code);row.append(suffix);}
    if(i===0){const separator=document.createElement('span');separator.textContent=' : ';row.append(separator);}
   }
   if(spec.mode==='fraction' && i===0)row.append(document.createTextNode(settings().fraction_style==='ratio'?' : ':' / '));
  });
  if(spec.mode==='ratio'&&!spec.units){
   if(spec.ratioUnits.unit)row.append(document.createTextNode(unitLabel(spec.ratioUnits.unit)));
   menu=null;host.replaceChildren(row);
  }else if(keepMenu){
   active.replaceWith(row);
  }else{
   const select=document.createElement('select');
   select.id=unitId;select.disabled=disabled;select.setAttribute('aria-label','單位');
   for(const code of spec.units){const item=document.createElement('option');item.value=code;item.textContent=unitLabel(code);select.append(item);}
   select.value=spec.unit;menu=select;select.dataset.cycleUnit='true';
   select.addEventListener('change',()=>{if(menu!==select || !active)return;if(!active.chipCommit(select.value))select.value=active.dataset.unit;});
   const group=document.createElement('span');group.className='physical-input-group';group.setAttribute('data-conversion-component','physical');
   group.append(row,select);host.replaceChildren(group);ChipUI.choiceMenus?.enhance(select);
  }
  row.dataset.unit=spec.unit||'';row.chipCommit=commit;active=row;

 }
 function refresh(){unit=null;render();}
 function bind(obj,k){owner=obj;property=k;refresh();}
 bind(object,key);
 window.addEventListener('measurementdisplaychange',refresh);
 return {bind,refresh,get input(){return active?.querySelector('input');},commit(){return active?.chipCommit()??false;},
  setDisabled(value){disabled=value;if(menu)menu.disabled=value;for(const el of active?.querySelectorAll('input')||[])el.disabled=value;},
  dispose(){window.removeEventListener('measurementdisplaychange',refresh);active=null;host.replaceChildren();}};
}


function conversionComponent(input,output,unit,{step=0,manageUnitLabel=()=>{},attachWidthUnitMenu=()=>{},
 formatInput=()=>input.value,unitLabel=()=>unit?.textContent||'',writeValue=value=>{input.value=String(value)},fractionHint='分數（例如 1/4）'}={}){if(output)input.dataset.sliderDivisions=String(step);manageUnitLabel(unit);const group=document.createElement('span');group.className=output?'conversion-slider':'conversion-control';group.setAttribute('data-conversion-component',output?'slider':'number');input.parentNode.insertBefore(group,input);group.append(input);if(output)group.append(output);if(unit)group.append(unit);if(!output){attachWidthUnitMenu(group,unit);return;}output.setAttribute('tabindex','0');output.setAttribute('role','button');output.setAttribute('aria-label','點擊輸入具體數值');output.classList.add('quantity-value');let editing=false;function edit(){if(editing)return;editing=true;const popup=document.createElement('div'),editor=document.createElement('input');popup.className='quantity-popup quantity-precise';popup.chipOwner=output;popup.setAttribute('data-panel-popup','true');popup.chipClose=()=>finish(false,false);popup.setAttribute('role','dialog');popup.setAttribute('aria-label','輸入具體數值');editor.type=input.dataset.quantityFraction==='true'?'text':'number';editor.className='conversion-editor';editor.dataset.quantitySource=input.id;editor.value=formatInput();editor.min=input.min;editor.max=input.max;editor.step=input.step||'any';editor.setAttribute('aria-label','數值');popup.append(editor);const suffix=document.createElement('span');suffix.textContent=input.dataset.quantityFraction==='true'?(input.dataset.quantityFractionHint||fractionHint):unitLabel();manageUnitLabel(suffix);popup.append(suffix);const ok=document.createElement('button');ok.type='button';ok.textContent='確定';popup.append(ok);document.body.append(popup);const r=output.getBoundingClientRect();placePopup(popup,r.left,r.bottom+5);let done=false;function finish(commit,focus=true){if(done)return;if(commit){const scaled=input.dataset.quantityFraction==='true'?editor.value.trim().match(/^([+]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+))\s*([%‰‱])$/):null,fraction=input.dataset.quantityFraction==='true'?editor.value.trim().match(/^([+]?[0-9]+)\s*[/:]\s*([0-9]+)$/):null,n=fraction?Number(fraction[1]):0,d=fraction?Number(fraction[2]):1,value=fraction&&Number.isSafeInteger(n)&&Number.isSafeInteger(d)&&d>0?n/d:scaled?Number(scaled[1])/({'%':100,'‰':1000,'‱':10000}[scaled[2]]):Number(editor.value);if(!editor.value.trim()||!Number.isFinite(value)||editor.min!==''&&value<Number(editor.min)||editor.max!==''&&value>Number(editor.max)){editor.setCustomValidity('請輸入範圍內的數值');editor.reportValidity?.();return}writeValue(value);input.value=String(Number(input.value));delete input.dataset.fractionValue;if(fraction){input.dataset.fractionNumerator=String(n);input.dataset.fractionDenominator=String(d);input.dataset.fractionValue=input.value}input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}))}done=true;popup.remove();document.removeEventListener('pointerdown',outside,true);editing=false;if(focus)output.focus()}function outside(e){if(!popup.contains(e.target)&&!output.contains(e.target)&&!e.target.closest('.quantity-popup'))finish(true)}document.addEventListener('pointerdown',outside,true);ok.onclick=()=>finish(true);editor.addEventListener('input',()=>editor.setCustomValidity(''));editor.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter'){e.preventDefault();finish(true)}else if(e.key==='Escape'){e.preventDefault();finish(false)}});editor.focus();editor.select()}output.addEventListener('click',edit);output.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();edit()}})}

function sliderWheel(event){
 if(event.defaultPrevented||event.ctrlKey||event.metaKey||!event.deltaY)return;
 const target=event.target;
 const range=target.closest?.('input[type="range"]')||target.closest?.('.conversion-slider')?.querySelector('input[type="range"]');
 stepSlider(range,event,event.deltaY<0?1:-1);
}
function sliderArrow(event){
 if(event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return;
 if(event.key!=='ArrowLeft'&&event.key!=='ArrowRight')return;
 if(event.target.matches?.('input[type="range"]'))stepSlider(event.target,event,event.key==='ArrowRight'?1:-1);
}
function stepSlider(range,event,direction){
 if(!range||range.matches(':disabled'))return;
 const min=range.min===''?0:Number(range.min),max=range.max===''?100:Number(range.max);
 const divisions=Number(range.dataset.sliderDivisions);
 const count=divisions>1?divisions:Math.round(range.getBoundingClientRect().width);
 if(count<1||max<=min)return;
 const before=range.valueAsNumber,increment=(max-min)/count;
 event.preventDefault();event.stopPropagation();
 // Discrete fields accept only values on their HTML step grid.
 if(range.step==='any')range.valueAsNumber=Math.max(min,Math.min(max,before+direction*increment));
 else{
  const ticks=Math.max(1,Math.round(increment/(Number(range.step)||1)));
  if(direction>0)range.stepUp(ticks);else range.stepDown(ticks);
 }
 if(range.valueAsNumber===before)return;
 range.dispatchEvent(new Event('input',{bubbles:true}));
 range.dispatchEvent(new Event('change',{bubbles:true}));
}
function mount(configuration={}){
 if(mounted)return;
 options=configuration;
 document.addEventListener('keydown',sliderArrow,true);document.addEventListener('wheel',sliderWheel,{passive:false,capture:true});
 attachIconTooltips();attachTextInteractionPolicy();attachChoiceMenus();mounted=true;
}
root.ChipUI={mount,get measurements(){return options.measurements},language:()=>options.language?.()||document.documentElement.lang||'en',buttonModel:root.ChipUIButtonModel.create,bindButtonInput,optionModel,twoStateButton,interactionHelp,inputHelp,
 conversionComponent,physicalQuantityComponent:boundPhysicalQuantity,panelMotion,placePopup,floatingPanel,resizePanel};
})(globalThis);
