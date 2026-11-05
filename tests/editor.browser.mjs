import assert from 'node:assert/strict';
const {chromium}=await import(process.env.CHIPDRAW_PLAYWRIGHT||'playwright');
const browser=await chromium.launch({headless:true,ignoreDefaultArgs:['--hide-scrollbars'],...(process.env.CHIPDRAW_BROWSER?{executablePath:process.env.CHIPDRAW_BROWSER}:{})});
try{
 const page=await browser.newPage({viewport:{width:1200,height:850}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(new URL('../ChipDraw.html',import.meta.url).href);
 await page.evaluate(()=>{$('selectionFirstIndependent').checked=true;$('selectionFirstIndependent').dispatchEvent(new Event('change',{bubbles:true}))});
 await page.evaluate(()=>{selected=el('line',{x1:0,y1:0,x2:80,y2:40,stroke:'#69b8ff','stroke-width':2,fill:'none',transform:'translate(15 20) rotate(20)'});detailedAnchorTarget=selected;(detailedAnchorTarget=selected,renderSelection());$('panel').classList.add('show');scale=2;viewAngle=35;viewMirrored=true;view()});
 const start=await page.evaluate(()=>{const p=transformPoint({x:0,y:0},selected.getScreenCTM());return {...p,history:history.length}});
 await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(start.x+35,start.y+20);await page.mouse.up();
 const moved=await page.evaluate(()=>({x:+selected.getAttribute('x1'),y:+selected.getAttribute('y1'),history:history.length,html:art.innerHTML,screen:transformPoint({x:+selected.getAttribute('x1'),y:+selected.getAttribute('y1')},selected.getScreenCTM())}));
 assert.equal(moved.history,start.history+1);assert.ok(Math.abs(moved.screen.x-start.x-35)<.01);assert.ok(Math.abs(moved.screen.y-start.y-20)<.01);
 await page.evaluate(()=>$('undo').click());assert.equal(await page.evaluate(()=>+art.querySelector('line').getAttribute('x1')),0);
 await page.evaluate(()=>$('redo').click());assert.equal(await page.evaluate(()=>+art.querySelector('line').getAttribute('x1')),moved.x);
 await page.evaluate(()=>{selected=art.querySelector('line');(detailedAnchorTarget=selected,renderSelection())});
 const a=await page.evaluate(()=>transformPoint({x:+selected.getAttribute('x1'),y:+selected.getAttribute('y1')},selected.getScreenCTM()));
 const beforeCancel=await page.evaluate(()=>({html:art.innerHTML.replace(/class="[^"]*"/g,''),h:history.length,f:future.length}));
 await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(a.x+15,a.y+10);await page.keyboard.press('Escape');await page.mouse.up();
 assert.deepEqual(await page.evaluate(()=>({html:art.innerHTML.replace(/class="[^"]*"/g,''),h:history.length,f:future.length})),beforeCancel);
 await page.evaluate(()=>{selected=art.querySelector('line');detailedAnchorTarget=selected;(detailedAnchorTarget=selected,renderSelection());$('objectVertex0x').value='50';$('objectVertex0x').dispatchEvent(new Event('change'))});
 assert.ok(Math.abs(await page.evaluate(()=>lineEndpoints(selected)[0].x)-50)<1e-4);
 assert.equal(await page.locator('#objectWidthRow').isVisible(),false);
 assert.equal(await page.locator('#objectHeightRow').isVisible(),false);
 assert.equal(await page.locator('#objectDimensions #sw').count(),1);assert.equal(await page.locator('#objectArtwork #sw').count(),0);
 await page.evaluate(()=>{$('objectLength').value='120';$('objectLength').dispatchEvent(new Event('change'))});
 assert.ok(Math.abs(await page.evaluate(()=>{const p=lineEndpoints(selected);return Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y)})-120)<1e-4);
 const rotationStart=await page.evaluate(()=>lineEndpoints(selected)[0]);
 await page.evaluate(()=>{$('objectRotation').value='60';$('objectRotation').dispatchEvent(new Event('change'))});
 assert.ok(Math.abs(await page.evaluate(()=>objectRotation(selected))-60)<1e-4);
 await page.evaluate(()=>{$('angleMode').value='rad';refreshObjectProperties();$('objectRotation').value=String(Math.PI/2);$('objectRotation').dispatchEvent(new Event('change'))});
 assert.ok(Math.abs(await page.evaluate(()=>objectRotation(selected))-90)<1e-4);
 const rotationEnd=await page.evaluate(()=>lineEndpoints(selected)[0]);assert.ok(Math.hypot(rotationStart.x-rotationEnd.x,rotationStart.y-rotationEnd.y)<1e-4,'rotation must keep the specified start fixed under existing transforms');
 await page.evaluate(()=>{$('angleMode').value='deg'});
 const fill=await page.evaluate(()=>selected.getAttribute('fill'));
 await page.evaluate(()=>{$('stroke').value='#ff0000';$('stroke').dispatchEvent(new Event('change'))});assert.equal(await page.evaluate(()=>selected.getAttribute('fill')),fill);
 await page.evaluate(()=>{const n=selected;layers.add({type:'vector'});selected=n;detailedAnchorTarget=selected;(detailedAnchorTarget=selected,renderSelection());$('objectLayer').value=layers.active().getAttribute('data-drawing-layer');$('objectLayer').dispatchEvent(new Event('change'))});
 assert.equal(await page.evaluate(()=>layers.owner(selected)===layers.active()),true);
 await page.evaluate(()=>{selected=el('path',{d:'m0 0 c10 10 20 20 30 10 l20 10',stroke:'#ff0000',fill:'none'});(detailedAnchorTarget=selected,renderSelection())});
 assert.equal(await page.locator('#anchorHandles > [data-anchor]').count(),5);
 const first=await page.evaluate(()=>transformPoint({x:0,y:0},selected.getScreenCTM()));
 await page.mouse.move(first.x,first.y);await page.mouse.down();await page.mouse.move(first.x+10,first.y+10);await page.mouse.up();
 assert.equal(await page.evaluate(()=>pathModel(selected.getAttribute('d')).anchors.at(-1).x),50,'relative successor stays fixed during actual drag');
 if(process.env.CHIPDRAW_SCREENSHOT)await page.screenshot({path:process.env.CHIPDRAW_SCREENSHOT});

 await page.evaluate(()=>{layers.toggle(layers.owner(selected),'locked')});
 assert.equal(await page.locator('#anchorHandles > *').count(),0);assert.equal(await page.evaluate(()=>selection.items.length),0);

 await page.evaluate(()=>{layers.toggle(layers.active(),'locked');selected=el('rect',{x:0,y:0,width:94.67,height:246,stroke:'#69b8ff',fill:'none'});detailedAnchorTarget=selected;(detailedAnchorTarget=selected,renderSelection());$('panel').classList.add('show')});
 for(const width of [270,650]){
  await page.evaluate(width=>{$('panel').style.width=width+'px'},width);
  const controls=await page.evaluate(()=>[...$('panelBody').querySelectorAll('input[type=number]')].filter(input=>input.getClientRects().length).map(input=>{const group=input.closest('[data-conversion-component]'),unit=input.nextElementSibling,r=input.getBoundingClientRect(),u=unit?.getBoundingClientRect(),row=input.closest('label').getBoundingClientRect();return {id:input.id,group:!!group,unit:unit?.textContent,gap:u?u.left-r.right:null,width:r.width,needed:parseFloat(input.style.getPropertyValue('--coordinate-value-width'))||0,coordinate:!!input.closest('[data-coordinate-editor]'),labelGap:group?group.getBoundingClientRect().left-row.left:null}}));
  for(const control of controls){assert.ok(control.group,control.id+' must use the shared combined control');assert.ok(control.unit,control.id+' must have an adjacent unit');assert.ok(control.gap>=0&&control.gap<=6,control.id+' unit must stay attached');assert.ok(control.width>=(control.coordinate?control.needed:90),control.id+' input must remain readable');assert.ok(control.labelGap<85,control.id+' label must stay near its control')}
 }
 await page.evaluate(()=>{$('unitSelect').value='cm';$('unitSelect').dispatchEvent(new Event('change'));$('angleMode').value='rad';$('angleMode').dispatchEvent(new Event('change'))});
 for(const id of ['objectX','objectY','objectWidth','objectHeight','sw'])assert.equal(await page.evaluate(id=>document.getElementById(id).nextElementSibling.textContent,id),'cm');
 assert.equal(await page.locator('#objectRotation + span').textContent(),'rad');
 assert.equal(await page.locator('#objectUnits').count(),0);
 await page.evaluate(()=>{$('panel').style.width='270px'});
 if(process.env.CHIPDRAW_SCREENSHOT)await page.screenshot({path:process.env.CHIPDRAW_SCREENSHOT});

 assert.equal(await page.locator('#measurementProperties > :first-child #coordinateMode').count(),1);
 assert.equal(await page.locator('#coordinateMode').evaluate(n=>!!n.closest('details')),true); // outer floating panel only
 assert.equal(await page.locator('#measurementCoordinates').evaluate(n=>!!n.closest('.settingGroup,.ui-control-group')),false);
 assert.equal((await page.locator('label[for=showCompass]').textContent()).trim(),'座標系指示器');
 assert.equal(await page.locator('#uiViewTab').textContent(),'視圖');
 await page.evaluate(()=>{selected=el('polyline',{points:'0,0 30,-40 60,-80 90,-120',stroke:'#69b8ff',fill:'none'});(detailedAnchorTarget=selected,renderSelection())});
 assert.equal(await page.locator('#objectVertices > .vertex-row').count(),4);
 await page.evaluate(()=>{$('advanced').open=true;$('uiMeasurementTab').click()});
 await page.selectOption('#coordinateMode','polar');
 assert.equal(await page.locator('#objectVertex1radius + span').textContent(),'cm');
 assert.ok(Math.abs(Number(await page.locator('#objectVertex1radius').inputValue())-5)<1e-6);
 await page.selectOption('#angleMode','clock');await page.selectOption('#anglePrecision','second');
 assert.equal(await page.locator('#objectRotationFields input').count(),3);
 assert.equal(await page.locator('#objectVertex1ThetaFields input').count(),3);
 const polyRotationStart=await page.evaluate(()=>layerVertices(selected)[0]);
 await page.evaluate(()=>{$('objectRotation').value='1';$('objectRotationPart1').value='30';$('objectRotationPart2').value='0';$('objectRotationPart1').dispatchEvent(new Event('change'))});
 assert.ok(Math.abs(await page.evaluate(()=>objectRotation(selected))-45)<1e-4);
 await page.evaluate(()=>{$('objectRotation').value='-0';$('objectRotationPart1').value='30';$('objectRotationPart2').value='0';$('objectRotationPart1').dispatchEvent(new Event('change'))});
 assert.ok(Math.abs(await page.evaluate(()=>objectRotation(selected))+15)<1e-4);
 const polyRotationEnd=await page.evaluate(()=>layerVertices(selected)[0]);assert.ok(Math.hypot(polyRotationStart.x-polyRotationEnd.x,polyRotationStart.y-polyRotationEnd.y)<1e-4,'clock rotations must preserve the first polyline point');
 await page.selectOption('#angleMode','deg');await page.selectOption('#anglePrecision','3');
 await page.evaluate(()=>{$('objectVertex1radius').value='10';$('objectVertex1radius').dispatchEvent(new Event('change'))});
 assert.ok(Math.abs(await page.evaluate(()=>{const p=layerVertices(selected)[1];return Math.hypot(p.x,p.y)})-100)<1e-4);
 await page.selectOption('#coordinateMode','cart');await page.selectOption('#unitSelect','mm');
 assert.equal(await page.locator('#objectVertex1x + span').textContent(),'mm');
 const originalY=await page.evaluate(()=>layerVertices(selected)[1].y);
 assert.ok(Math.abs(Number(await page.locator('#objectVertex1y').inputValue())+originalY)<.01);
 await page.locator('#objectVertex1y').fill('75');await page.locator('#objectVertex1y').dispatchEvent('change');
 assert.ok(Math.abs(await page.evaluate(()=>layerVertices(selected)[1].y)+75)<1e-4);
 await page.locator('#lengthPrecision').fill('4');await page.locator('#lengthPrecision').dispatchEvent('change');
 assert.match(await page.locator('#objectVertex1x').inputValue(),/\.\d{4}$/);
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 assert.equal(await page.evaluate(()=>{const p=$('panel').getBoundingClientRect(),h=document.querySelector('header').getBoundingClientRect();return p.top>=h.bottom&&p.bottom<=innerHeight}),true);
 if(process.env.CHIPDRAW_SCREENSHOT)await page.screenshot({path:process.env.CHIPDRAW_SCREENSHOT});

 await page.evaluate(()=>{$('advanced').open=false;const a=el('rect',{x:0,y:0,width:60,height:40,...style()}),b=el('rect',{x:10,y:10,width:60,height:40,...style()});selection.replace([a,b]);selected=selection.primary;(detailedAnchorTarget=selected,renderSelection())});
 assert.equal(await page.locator('#panelTitle').textContent(),'物件');
 const palette=await page.evaluate(()=>({draw:$('stroke').value,normal:$('selectionOutlineColor').value,first:$('selectionFirstColor').value}));
 assert.notEqual(palette.draw,palette.normal);assert.notEqual(palette.draw,palette.first);
 assert.equal(await page.locator('#selectionOverlay [data-selection-kind=first]').count(),1);
 assert.equal(await page.locator('#selectionOverlay [data-selection-kind=selection]').count(),1);
 assert.equal(await page.locator('#selectionOverlay > :last-child').getAttribute('data-selection-kind'),'first');
 await page.evaluate(()=>{$('selectionFirstColor').value='#ff00ff';$('selectionFirstFill').value='#aa00aa';$('selectionFirstOpacity').value='31';$('selectionFirstWidth').value='4';$('selectionFirstDash').value='dashed';$('selectionFirstColor').dispatchEvent(new Event('change'));});
 const firstStyle=await page.locator('#selectionOverlay [data-selection-kind=first]').evaluate(n=>({stroke:n.getAttribute('stroke'),fill:n.getAttribute('fill'),opacity:n.getAttribute('fill-opacity'),width:n.getAttribute('stroke-width'),dash:n.getAttribute('stroke-dasharray')}));
 assert.equal(firstStyle.stroke,'#ff00ff');assert.equal(firstStyle.fill,'#aa00aa');assert.equal(firstStyle.opacity,'0.31');assert.notEqual(firstStyle.dash,'none');
 assert.equal(await page.locator('#selectionOverlay [data-selection-kind=selection]').getAttribute('stroke'),palette.normal);
 await page.evaluate(()=>{const first=selection.items[0];selection.pick(first,true);selected=selection.primary;(detailedAnchorTarget=selected,renderSelection())});
 assert.equal(await page.locator('#selectionOverlay [data-selection-kind=first]').count(),1);
 assert.equal(await page.locator('#selectionOverlay [data-selection-kind=selection]').count(),0);
 if(process.env.CHIPDRAW_SCREENSHOT){await page.evaluate(()=>{$('advanced').open=true;$('uiViewTab').click()});await page.locator('#selectionFirstColor').scrollIntoViewIfNeeded();await page.screenshot({path:process.env.CHIPDRAW_SCREENSHOT})}

 assert.equal(await page.locator('#duplicate').count(),0);assert.equal(await page.locator('#editAnchors').count(),0);assert.equal(await page.locator('#snap').count(),0);
 assert.equal(await page.locator('.selection-first-settings').evaluate(n=>n.tagName),'FIELDSET');
 assert.equal(await page.locator('#objectCoordinates #objectLayer').count(),1);
 for(const id of ['stroke','fill','noFill','sw'])assert.equal(await page.locator('#objectArtwork #'+id).count(),1);
 await page.evaluate(()=>{$('advanced').open=false;selected=el('rect',{'data-name':'live-preview',x:0,y:0,width:60,height:40,...style()});detailedAnchorTarget=selected;(detailedAnchorTarget=selected,renderSelection());$('panel').style.width='420px'});
 const historyBeforePreview=await page.evaluate(()=>history.length);
 await page.locator('#objectX').fill('5');
 assert.ok(Math.abs(await page.evaluate(()=>objectBounds(selected).x)-5)<1e-4,'coordinates must preview before blur');
 await page.locator('#objectX').fill('50');
 assert.ok(Math.abs(await page.evaluate(()=>objectBounds(selected).x)-50)<1e-4);
 assert.equal(await page.evaluate(()=>history.length),historyBeforePreview+1,'typing belongs to one undo entry');
 await page.locator('#objectX').blur();await page.evaluate(()=>$('undo').click());
 assert.ok(Math.abs(await page.evaluate(()=>objectBounds(art.querySelector('[data-name="live-preview"]')).x))<1e-4);
 await page.evaluate(()=>{$('redo').click();selected=art.querySelector('[data-name="live-preview"]');(detailedAnchorTarget=selected,renderSelection())});
 await page.locator('#objectWidth').fill('100');
 assert.ok(Math.abs(await page.evaluate(()=>objectBounds(selected).width)-100)<1e-4,'size previews immediately');
 await page.locator('#objectWidth').blur();
 await page.evaluate(()=>{$('stroke').value='#123456';$('stroke').dispatchEvent(new Event('input',{bubbles:true}))});
 assert.equal(await page.evaluate(()=>selected.getAttribute('stroke')),'#123456','artwork previews immediately');
 function pairOnOneLine(host){return host.evaluate(n=>{const labels=[...n.children].filter(n=>n.tagName==='LABEL'),rects=labels.map(n=>n.getBoundingClientRect());return labels.length===2&&Math.abs(rects[0].top-rects[1].top)<1})}
 assert.equal(await pairOnOneLine(page.locator('#objectPosition')),true);
 assert.equal(await page.locator('#objectPosition').evaluate(n=>n.scrollWidth<=n.clientWidth+1),true,'coordinate editor must fit without horizontal scrolling');
 await page.evaluate(()=>{$('coordinateMode').value='polar';$('coordinateMode').dispatchEvent(new Event('change',{bubbles:true}));$('angleMode').value='clock';$('angleMode').dispatchEvent(new Event('change',{bubbles:true}));$('anglePrecision').value='second';$('anglePrecision').dispatchEvent(new Event('change',{bubbles:true}))});
 assert.equal(await page.locator('#objectPosition > label').count(),2);
 assert.equal(await page.locator('#objectPosition').evaluate(n=>n.scrollWidth<=n.clientWidth+1),true,'coordinate editor must fit without horizontal scrolling');
 assert.equal(await page.locator('#objectPosition > label').count(),2);
 assert.equal(await page.locator('#objectThetaFields input').count(),3);
 if(process.env.CHIPDRAW_SCREENSHOT)await page.screenshot({path:process.env.CHIPDRAW_SCREENSHOT});

 for(const viewportWidth of [320,375,430]){
  await page.setViewportSize({width:viewportWidth,height:820});
  await page.evaluate(()=>{$('coordinateMode').value='cart';$('coordinateMode').dispatchEvent(new Event('change',{bubbles:true}));selected=el('line',{x1:-270.1234,y1:321.85,x2:-92.22,y2:38.88,...style()});detailedAnchorTarget=selected;(detailedAnchorTarget=selected,renderSelection());$('panel').style.width=Math.min(270,innerWidth-16)+'px';clampPanel()});
  for(const editor of await page.locator('#objectVertices [data-coordinate-editor]').all()){
   // Wrapping depends on the displayed values, not a fixed field width.
   const metrics=await editor.evaluate(n=>({overflow:n.scrollWidth>n.clientWidth+1,widths:[...n.querySelectorAll('input')].map(n=>({actual:n.getBoundingClientRect().width,needed:parseFloat(n.style.getPropertyValue('--coordinate-value-width'))||0}))}));
   assert.equal(metrics.overflow,false);assert.ok(metrics.widths.every(w=>w.actual+1>=w.needed),'mobile numeric fields must stay readable');
  }
  await page.evaluate(()=>{$('coordinateMode').value='polar';$('coordinateMode').dispatchEvent(new Event('change',{bubbles:true}))});
  for(const editor of await page.locator('#objectVertices [data-coordinate-editor]').all())assert.equal(await editor.evaluate(n=>n.scrollWidth<=n.clientWidth+1),true);
 }
 if(process.env.CHIPDRAW_SCREENSHOT)await page.screenshot({path:process.env.CHIPDRAW_SCREENSHOT});

 await page.setViewportSize({width:900,height:850});
 await page.evaluate(()=>{$('coordinateMode').value='cart';$('coordinateMode').dispatchEvent(new Event('change',{bubbles:true}));$('lengthPrecision').value='2';$('lengthPrecision').dispatchEvent(new Event('change',{bubbles:true}));selected=el('line',{x1:-504.07,y1:-215.18,x2:-306.30,y2:4.08,...style()});detailedAnchorTarget=selected;(detailedAnchorTarget=selected,renderSelection());$('panel').style.width='420px';clampPanel()});
 for(const editor of await page.locator('#objectVertices [data-coordinate-editor]').all())assert.equal(await pairOnOneLine(editor),true,'short coordinate values must stay on one row');
 await page.evaluate(()=>{$('lengthPrecision').value='9';$('lengthPrecision').dispatchEvent(new Event('change',{bubbles:true}));$('panel').style.width='270px';clampPanel()});
 for(const editor of await page.locator('#objectVertices [data-coordinate-editor]').all()){assert.equal(await pairOnOneLine(editor),false,'wrap only when full displayed values cannot fit');assert.equal(await editor.evaluate(n=>n.scrollWidth<=n.clientWidth+1),true)}

 await page.setViewportSize({width:1000,height:850});
 await page.evaluate(()=>{setTool('select');$('panel').classList.remove('show');$('advanced').open=false;layers.normalize()});
 async function beginPolyline(){await page.evaluate(()=>setTool('poly'));await page.mouse.click(70,350);await page.mouse.click(120,380);await page.mouse.click(170,340)}
 const polyCount=await page.locator('#art polyline').count(),undoStart=await page.evaluate(()=>history.length);
 await beginPolyline();await page.mouse.down({button:'right'});
 assert.equal(await page.evaluate(()=>tool),'select');assert.equal(await page.locator('#art polyline').count(),polyCount+1,'secondary click finishes, rather than discards, the polyline');await page.mouse.up({button:'right'});
 assert.equal(await page.evaluate(()=>history.length),undoStart+1);
 await page.evaluate(()=>$('undo').click());assert.equal(await page.locator('#art polyline').count(),polyCount);
 await page.evaluate(()=>$('redo').click());assert.equal(await page.locator('#art polyline').count(),polyCount+1);
 await beginPolyline();await page.locator('[data-tool=line]').click();
 assert.equal(await page.evaluate(()=>tool),'line');assert.equal(await page.locator('#art polyline').count(),polyCount+2,'switching tools finishes the pending polyline');
 const escState=await page.evaluate(()=>({h:history.length,f:future.length,html:art.innerHTML.replace(/class="[^"]*"/g,'')}));
 await beginPolyline();await page.keyboard.press('Escape');
 assert.deepEqual(await page.evaluate(()=>({h:history.length,f:future.length,html:art.innerHTML.replace(/class="[^"]*"/g,'')})),escState,'Escape cancels only the unfinished polyline and its temporary undo entry');
 await page.locator('[data-tool=select]').click();

 const fillCases=[['line',{x1:0,y1:0,x2:20,y2:20},false],['polyline',{points:'0,0 20,0 20,20'},false],['polyline',{points:'0,0 20,0 20,20 0,0'},true],['path',{d:'M0 0 L20 0 L20 20'},false],['path',{d:'M0 0 L20 0 L20 20 Z'},true],['path',{d:'M0 0 L20 0 L20 20 Z M30 0 L40 10'},false],['path',{d:'M0 0 L20 0 L20 20 L0 0'},true],['rect',{x:0,y:0,width:20,height:20},true]];
 for(const [tag,attributes,closed]of fillCases){
  await page.evaluate(({tag,attributes})=>{setTool('select');selected=el(tag,{...attributes,stroke:'#69b8ff',fill:'#aa00aa'});detailedAnchorTarget=selected;(detailedAnchorTarget=selected,renderSelection());$('panel').classList.add('show')},{tag,attributes});
  assert.equal(await page.locator('#objectFillRow').isVisible(),closed,tag+' fill availability');assert.equal(await page.locator('#objectNoFillRow').isVisible(),closed);
  if(!closed){assert.equal(await page.evaluate(()=>selected.getAttribute('fill')),'none');await page.evaluate(()=>{$('noFill').checked=false;$('fill').dispatchEvent(new Event('change'))});assert.equal(await page.evaluate(()=>selected.getAttribute('fill')),'none','hidden fill controls must never fill open geometry')}
 }
 await page.evaluate(()=>{const line=el('line',{x1:0,y1:0,x2:10,y2:10,fill:'none'});selection.replace([selected,line]);selected=selection.primary;(detailedAnchorTarget=selected,renderSelection())});
 assert.equal(await page.locator('#objectFillRow').isVisible(),false,'mixed open/closed selection has no fill control');

 await page.setViewportSize({width:1100,height:850});
 await page.evaluate(()=>{setTool('select');$('coordinateMode').value='cart';$('lengthPrecision').value='2';selected=el('polyline',{points:'149.26,-432.96 -59.63,208.52 -287.04,-60.36 -268.52,-303.33 414.44,55.93',stroke:'#69b8ff',fill:'none'});detailedAnchorTarget=selected;(detailedAnchorTarget=selected,renderSelection());$('panel').classList.add('show');$('panel').style.width='650px';clampPanel()});
 const columns=await page.locator('#objectVertices [data-coordinate-editor]').evaluateAll(nodes=>nodes.map(n=>[...n.querySelectorAll('input')].map(n=>({left:n.getBoundingClientRect().left,width:n.getBoundingClientRect().width}))));
 for(let axis=0;axis<2;axis++){assert.ok(Math.max(...columns.map(n=>n[axis].left))-Math.min(...columns.map(n=>n[axis].left))<1,'node coordinate columns must align');assert.ok(Math.max(...columns.map(n=>n[axis].width))-Math.min(...columns.map(n=>n[axis].width))<1)}
 await page.evaluate(()=>{$('panel').classList.remove('show');setTool('poly')});
 const previewArtCount=await page.locator('#art polyline').count();await page.mouse.click(70,300);
 const previewUndo=await page.evaluate(()=>history.length);await page.mouse.move(130,370);
 const previewState=await page.evaluate(()=>({count:points.length,h:history.length,visible:$('preview').querySelector('[data-poly-preview]')?.getAttribute('points'),expected:pos({clientX:130,clientY:370})}));
 assert.equal(previewState.count,1);assert.equal(previewState.h,previewUndo);assert.ok(previewState.visible);
 const visiblePoints=previewState.visible.split(' ').map(p=>p.split(',').map(Number));assert.equal(visiblePoints.length,2);assert.ok(Math.hypot(visiblePoints[1][0]-previewState.expected.x,visiblePoints[1][1]-previewState.expected.y)<1e-6,'rubber-band segment must track the cursor');
 await page.mouse.click(130,370);await page.mouse.move(160,330);assert.equal(await page.evaluate(()=>points.length),2);assert.equal((await page.locator('#preview [data-poly-preview]').getAttribute('points')).split(' ').length,3);
 await page.keyboard.press('Escape');assert.equal(await page.locator('#preview > *').count(),0);assert.equal(await page.locator('#art polyline').count(),previewArtCount);

 await page.evaluate(()=>{setTool('select');selected=el('polyline',{'data-name':'node-actions',points:'0,0 10,20 30,40 50,60 70,80',stroke:'#69b8ff',fill:'none'});detailedAnchorTarget=selected;(detailedAnchorTarget=selected,renderSelection());$('panel').classList.add('show');$('panel').style.width='650px';clampPanel()});
 assert.equal(await page.locator('#objectVertices fieldset').count(),0,'node rows must not use nested groups');
 assert.deepEqual(await page.locator('#objectVertices .vertex-number').allTextContents(),['起點','錨點 1','錨點 2','錨點 3','終點']);
 assert.equal(await page.locator('#objectVertices .vertex-lock').first().getAttribute('aria-label'),'鎖定起點');assert.equal(await page.locator('#objectVertices .vertex-delete').first().getAttribute('aria-label'),'刪除起點');
 await page.locator('#objectVertices .vertex-row').nth(1).locator('.vertex-lock').click();
 assert.equal(await page.locator('#objectVertex1x').isDisabled(),true);assert.equal(await page.locator('#objectVertices .vertex-row').nth(1).locator('.vertex-delete').isDisabled(),true);
 const lockedPoint=await page.evaluate(()=>layerVertices(selected)[1]);await page.evaluate(()=>setLayerVertex(selected,1,{x:999,y:999}));
 assert.deepEqual(await page.evaluate(()=>layerVertices(selected)[1]),lockedPoint,'locked nodes reject geometry edits');
 await page.locator('#objectVertices .vertex-row').nth(0).locator('.vertex-delete').click();
 assert.equal(await page.evaluate(()=>layerVertices(selected).length),4);assert.deepEqual(await page.evaluate(()=>nodeLocks(selected)),[0]);assert.equal(await page.locator('#objectVertex0x').isDisabled(),true);
 assert.deepEqual(await page.locator('#objectVertices .vertex-number').allTextContents(),['起點','錨點 1','錨點 2','終點']);
 await page.evaluate(()=>{$('undo').click();selected=art.querySelector('[data-name="node-actions"]');(detailedAnchorTarget=selected,renderSelection())});assert.equal(await page.evaluate(()=>layerVertices(selected).length),5);assert.deepEqual(await page.evaluate(()=>nodeLocks(selected)),[1]);
 await page.evaluate(()=>{$('redo').click();selected=art.querySelector('[data-name="node-actions"]');(detailedAnchorTarget=selected,renderSelection())});assert.equal(await page.evaluate(()=>layerVertices(selected).length),4);assert.deepEqual(await page.evaluate(()=>nodeLocks(selected)),[0]);
 await page.locator('#objectVertices .vertex-row').nth(0).locator('.vertex-lock').click();assert.equal(await page.locator('#objectVertex0x').isDisabled(),false);
 await page.evaluate(()=>{selected=el('path',{d:'M0 0 C3 4 7 8 10 10 L20 20',stroke:'#69b8ff',fill:'none'});(detailedAnchorTarget=selected,renderSelection())});
 await page.locator('#objectVertices .vertex-row').nth(0).locator('.vertex-delete').click();
 assert.equal(await page.evaluate(()=>selected.localName),'line');assert.deepEqual(await page.evaluate(()=>vectorModel(selected).anchors),[{x:10,y:10},{x:20,y:20}]);
 assert.equal(await page.locator('#objectVertices .vertex-row').count(),2);assert.equal(await page.locator('#objectVertices .vertex-delete:disabled').count(),0,'two endpoints can be reduced to a point');
 if(process.env.CHIPDRAW_SCREENSHOT)await page.screenshot({path:process.env.CHIPDRAW_SCREENSHOT});

 await page.evaluate(()=>{selected=el('path',{d:'M -59.19 26.5',stroke:'#69b8ff',fill:'none'});(detailedAnchorTarget=selected,renderSelection())});
 assert.equal(await page.locator('#objectVertices .vertex-row').count(),0,'a single point uses no list');
 assert.equal(await page.locator('#objectPosition').isVisible(),true);
 assert.equal(await page.locator('#objectPosition input').count(),2);
 assert.equal(await page.locator('#objectX').inputValue(),'-59.19');
 assert.equal(await page.locator('#objectSummary').textContent(),'1 個物件 · 點');assert.equal(await page.locator('#objectRotationRow').isVisible(),false);
 const pointTransform=await page.evaluate(()=>selected.getAttribute('transform'));await page.evaluate(()=>rotateObject(45));assert.equal(await page.evaluate(()=>selected.getAttribute('transform')),pointTransform);
 await page.evaluate(()=>{selected=el('rect',{x:10,y:20,width:40,height:30,stroke:'#69b8ff',fill:'none'});(detailedAnchorTarget=selected,renderSelection())});
 assert.equal(await page.locator('#objectVertices .vertex-row').count(),0);assert.equal(await page.locator('#objectPosition').isVisible(),true);assert.equal(await page.locator('#objectRotationRow').isVisible(),true);

 await page.evaluate(()=>{$('panel').classList.remove('show');$('advanced').open=false});
 for(const drawingTool of ['line','rect','ellipse']){
  await page.evaluate(t=>setTool(t),drawingTool);const before=await page.evaluate(()=>history.length);await page.mouse.move(70,300);await page.mouse.down();await page.mouse.move(150,370);await page.mouse.up();assert.equal(await page.evaluate(()=>tool),'select',drawingTool+' drag returns to select');assert.equal(await page.evaluate(()=>history.length),before+1,'automatic tool return must not create another undo entry');assert.equal(await page.evaluate(()=>!!selection.primary),true);
 }
 await page.evaluate(()=>setTool('rect'));await page.mouse.click(70,300);await page.mouse.move(150,370);await page.mouse.click(150,370);assert.equal(await page.evaluate(()=>tool),'rect','two-click mode remains available for repeated placement');

 await page.evaluate(()=>{setTool('select');selected=el('polyline',{'data-name':'type-conversion',points:'10,20 60,80',stroke:'#2468ac','stroke-width':3,fill:'none',transform:'translate(15 25) rotate(30)'});detailedAnchorTarget=selected;(detailedAnchorTarget=selected,renderSelection());$('panel').classList.add('show')});
 assert.equal(await page.evaluate(()=>selected.localName),'line');assert.equal(await page.locator('#objectSummary').textContent(),'1 個物件 · 直綫');
 const originalEnd=await page.evaluate(()=>({point:lineEndpoints(selected)[1],layer:layers.owner(selected).getAttribute('data-drawing-layer'),transform:selected.getAttribute('transform')}));
 await page.locator('#objectVertices .vertex-row').nth(0).locator('.vertex-delete').click();
 assert.equal(await page.locator('#objectSummary').textContent(),'1 個物件 · 點');assert.equal(await page.locator('#objectVertices .vertex-row').count(),0);assert.equal(await page.locator('#objectRotationRow').isVisible(),false);
 const convertedPoint=await page.evaluate(()=>({point:objectOrigin(selected),layer:layers.owner(selected).getAttribute('data-drawing-layer'),transform:selected.getAttribute('transform'),stroke:selected.getAttribute('stroke')}));
 assert.ok(Math.hypot(convertedPoint.point.x-originalEnd.point.x,convertedPoint.point.y-originalEnd.point.y)<1e-4);assert.equal(convertedPoint.layer,originalEnd.layer);assert.equal(convertedPoint.transform,originalEnd.transform);assert.equal(convertedPoint.stroke,'#2468ac');
 await page.evaluate(()=>{$('undo').click();selected=art.querySelector('[data-name="type-conversion"]');(detailedAnchorTarget=selected,renderSelection())});assert.equal(await page.evaluate(()=>isPointObject(selected)),false);assert.equal(await page.evaluate(()=>vectorModel(selected).anchors.length),2);
 await page.evaluate(()=>{$('redo').click();selected=art.querySelector('[data-name="type-conversion"]');(detailedAnchorTarget=selected,renderSelection())});assert.equal(await page.evaluate(()=>isPointObject(selected)),true);
 await page.evaluate(()=>{$('languageSelect').value='en';$('languageSelect').dispatchEvent(new Event('change'))});assert.match(await page.locator('#objectSummary').textContent(),/Point$/);
 await page.evaluate(()=>{$('languageSelect').value='zh-Hant';$('languageSelect').dispatchEvent(new Event('change'));selected=el('line',{x1:12,y1:34,x2:56,y2:78,stroke:'#69b8ff',fill:'none'});(detailedAnchorTarget=selected,renderSelection())});
 await page.locator('#objectVertices .vertex-row').nth(1).locator('.vertex-delete').click();assert.deepEqual(await page.evaluate(()=>objectOrigin(selected)),{x:12,y:34});
 for(const [d,type]of [['M0 0 L10 0 L20 10','折綫'],['M0 0 A10 10 0 0 1 20 20','圓弧'],['M0 0 C5 0 10 5 20 20','貝塞爾綫']]){await page.evaluate(d=>{selected=el('path',{d,stroke:'#69b8ff',fill:'none'});(detailedAnchorTarget=selected,renderSelection())},d);assert.equal(await page.locator('#objectSummary').textContent(),'1 個物件 · '+type)}
 await page.evaluate(()=>{selected=el('polyline',{points:'0,0 10,10 20,20',stroke:'#69b8ff',fill:'none'});(detailedAnchorTarget=selected,renderSelection())});await page.locator('#objectVertices .vertex-row').nth(1).locator('.vertex-delete').click();assert.equal(await page.evaluate(()=>selected.localName),'line');

 assert.deepEqual(await page.locator('#toolsButtons > [data-tool]').evaluateAll(nodes=>nodes.map(n=>n.dataset.tool)),['select','pan','point','line','poly','bezier','rect','circle','ellipse']);
 await page.evaluate(()=>{$('panel').classList.remove('show');setTool('select')});
 const moveButton=page.locator('#toolsButtons [data-tool=pan]'),selectButton=page.locator('#toolsButtons [data-tool=select]'),moveRect=await moveButton.boundingBox(),selectRect=await selectButton.boundingBox();
 await page.mouse.move(moveRect.x+moveRect.width/2,moveRect.y+moveRect.height/2);await page.mouse.down();await page.mouse.move(selectRect.x+2,selectRect.y+selectRect.height/2,{steps:8});await page.mouse.up();
 assert.equal(await page.evaluate(()=>defaultTool()),'pan');assert.equal(await page.evaluate(()=>tool),'select','reordering must not activate the dragged tool');
 assert.equal(await page.locator('#toolsButtons > :first-child').getAttribute('data-default-tool'),'true');
 assert.equal(await page.locator('#toolsButtons > :first-child').evaluate(n=>getComputedStyle(n,'::after').borderRightWidth),'1px');
 await page.evaluate(()=>setTool('rect'));await page.mouse.move(70,300);await page.mouse.down();await page.mouse.move(140,360);await page.mouse.up();assert.equal(await page.evaluate(()=>tool),'pan','drag completion uses reordered default');
 await page.evaluate(()=>setTool('poly'));await page.mouse.click(70,300);await page.mouse.click(140,360);await page.mouse.down({button:'right'});await page.mouse.up({button:'right'});assert.equal(await page.evaluate(()=>tool),'pan','secondary click uses reordered default');
 await page.evaluate(()=>setTool('point'));await page.mouse.click(90,320);assert.equal(await page.evaluate(()=>isPointObject(selected)),true);assert.equal(await page.locator('#objectRotationRow').isVisible(),false);
 await page.evaluate(()=>setTool('circle'));const expectedRadius=await page.evaluate(()=>{const a=pos({clientX:100,clientY:350}),b=pos({clientX:130,clientY:390});return Math.hypot(b.x-a.x,b.y-a.y)});await page.mouse.move(100,350);await page.mouse.down();await page.mouse.move(130,390);await page.mouse.up();assert.equal(await page.evaluate(()=>selected.localName),'circle');assert.ok(Math.abs(await page.evaluate(()=>+selected.getAttribute('r'))-expectedRadius)<1e-4);assert.equal(await page.evaluate(()=>tool),'pan');
 await page.reload();assert.equal(await page.evaluate(()=>defaultTool()),'pan');assert.equal(await page.evaluate(()=>tool),'pan','saved default initializes the next session');
 // Restore the standard order through keyboard reordering, then test wrapped layout dragging.
 await page.locator('#toolsButtons [data-tool=select]').focus();await page.keyboard.press('Alt+ArrowLeft');assert.equal(await page.evaluate(()=>defaultTool()),'select');
 await page.setViewportSize({width:375,height:820});
 const pointButton=page.locator('#toolsButtons [data-tool=point]'),pointRect=await pointButton.boundingBox(),firstRect=await page.locator('#toolsButtons > :first-child').boundingBox();await page.mouse.move(pointRect.x+pointRect.width/2,pointRect.y+pointRect.height/2);await page.mouse.down();await page.mouse.move(firstRect.x+2,firstRect.y+firstRect.height/2,{steps:8});await page.mouse.up();assert.equal(await page.evaluate(()=>defaultTool()),'point','wrapped toolbar supports reordering');
 await page.setViewportSize({width:1000,height:850});await page.evaluate(()=>{$('tools').classList.add('vertical');$('tools').style.maxHeight='700px';clampTools()});
 const lineButton=page.locator('#toolsButtons [data-tool=line]'),lineRect=await lineButton.boundingBox(),verticalFirst=await page.locator('#toolsButtons > :first-child').boundingBox();await page.mouse.move(lineRect.x+lineRect.width/2,lineRect.y+lineRect.height/2);await page.mouse.down();await page.mouse.move(verticalFirst.x+verticalFirst.width/2,verticalFirst.y+2,{steps:8});await page.mouse.up();assert.equal(await page.evaluate(()=>defaultTool()),'line','vertical toolbar supports reordering');
 const beforeSortCancel=await page.locator('#toolsButtons > [data-tool]').evaluateAll(nodes=>nodes.map(n=>n.dataset.tool));const rectangleRect=await page.locator('#toolsButtons [data-tool=rect]').boundingBox(),topRect=await page.locator('#toolsButtons > :first-child').boundingBox();await page.mouse.move(rectangleRect.x+rectangleRect.width/2,rectangleRect.y+rectangleRect.height/2);await page.mouse.down();await page.mouse.move(topRect.x+topRect.width/2,topRect.y+2,{steps:8});await page.keyboard.press('Escape');await page.mouse.up();assert.deepEqual(await page.locator('#toolsButtons > [data-tool]').evaluateAll(nodes=>nodes.map(n=>n.dataset.tool)),beforeSortCancel,'Escape cancels a reorder without changing the saved default');
 if(process.env.CHIPDRAW_SCREENSHOT)await page.screenshot({path:process.env.CHIPDRAW_SCREENSHOT});

 await page.evaluate(()=>{$('tools').classList.remove('vertical');setTool('select');selected=el('polyline',{points:'0,0 20,10 40,30',stroke:'#69b8ff',fill:'none'});detailedAnchorTarget=selected;(detailedAnchorTarget=selected,renderSelection());$('advanced').open=true;$('uiViewTab').click()});
 assert.equal(await page.locator('#anchorProperties #anchorSettings').count(),1);assert.equal(await page.locator('#anchorShape option').allTextContents().then(x=>x.join(',')),'圓形,矩形,綫條');
 assert.equal(await page.locator('#anchorSettings .anchor-first-settings').evaluate(n=>n.tagName),'FIELDSET');
 assert.equal(await page.locator('#anchorHandles [data-anchor-kind=first]').count(),1);
 await page.evaluate(()=>{$('anchorFirstColor').value='#ff00ff';$('anchorFirstFill').value='#ffaa00';$('anchorFirstOpacity').value='60';$('anchorOutlineColor').value='#00ffaa';$('anchorOverflow').value='9';$('anchorFirstOverflow').value='9';$('anchorShape').value='rect';$('anchorFirstShape').value='rect';$('anchorShape').dispatchEvent(new Event('change'))});
 assert.equal(await page.locator('#anchorHandles > rect').count(),3);assert.equal(await page.locator('#anchorHandles [data-anchor-kind=first]').getAttribute('stroke'),'#ff00ff');assert.equal(await page.locator('#anchorHandles [data-anchor-kind=first]').getAttribute('fill'),'#ffaa00');assert.equal(await page.locator('#anchorHandles [data-anchor-kind=first]').getAttribute('fill-opacity'),'0.6');assert.equal(await page.locator('#anchorHandles [data-anchor="1"]').getAttribute('stroke'),'#00ffaa');
 assert.equal(await page.locator('#anchorHandles [data-anchor-kind=first]').getAttribute('width'),'18','overflow is rendered around the actual point');
 await page.evaluate(()=>{$('anchorShape').value='line';$('anchorFirstShape').value='line';$('anchorShape').dispatchEvent(new Event('change'))});
 assert.equal(await page.locator('.anchorFillRow').isVisible(),false);assert.equal(await page.locator('.anchorFirstFillRow').isVisible(),false);assert.equal(await page.locator('#anchorDirections').isVisible(),true);assert.equal(await page.locator('#anchorHandles > line').count(),6);
 const direction=page.locator('#anchorDirections [data-anchor-direction=horizontal]');await direction.click();assert.equal(await direction.getAttribute('data-state'),'dashed');assert.notEqual(await page.locator('#anchorHandles > line[data-anchor="1"]').first().getAttribute('stroke-dasharray'),'none');
 await page.evaluate(()=>{$('anchorShape').value='circle';$('anchorFirstShape').value='circle';$('anchorShape').dispatchEvent(new Event('change'))});
 assert.equal(await page.locator('.anchorFillRow').isVisible(),true);assert.equal(await page.locator('.anchorFirstFillRow').isVisible(),true);
 await page.evaluate(()=>{const n=el('rect',{x:60,y:20,width:40,height:30,stroke:'#69b8ff',fill:'none'});selection.replace([selected,n]);selected=selection.primary;(detailedAnchorTarget=selected,renderSelection())});
 assert.equal(await page.locator('#anchorHandles [data-anchor-kind=first]').count(),2,'each selected object has its own first coordinate anchor');
 await page.evaluate(()=>{selected=selection.primary;selection.replace([selected]);detailedAnchorTarget=selected;(detailedAnchorTarget=selected,renderSelection());$('advanced').open=false});
 const originBeforeAnchor=await page.evaluate(()=>objectOrigin(selected)),genericAnchor=await page.evaluate(()=>{const h=$('anchorHandles').querySelector('[data-anchor-kind=first]'),r=h.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}});
 await page.mouse.move(genericAnchor.x,genericAnchor.y);await page.mouse.down();await page.mouse.move(genericAnchor.x+20,genericAnchor.y+15);await page.mouse.up();
 const originAfterAnchor=await page.evaluate(()=>objectOrigin(selected));assert.ok(Math.hypot(originAfterAnchor.x-originBeforeAnchor.x,originAfterAnchor.y-originBeforeAnchor.y)>1,'the first coordinate anchor of a shape is editable');
 if(process.env.CHIPDRAW_SCREENSHOT){await page.evaluate(()=>{$('advanced').open=true;$('uiViewTab').click()});await page.locator('#anchorShape').scrollIntoViewIfNeeded();await page.screenshot({path:process.env.CHIPDRAW_SCREENSHOT})}

 await page.evaluate(()=>{setTool('select');selected=el('polyline',{points:'0,0 20,10 40,30',stroke:'#69b8ff',fill:'none'});detailedAnchorTarget=selected;(detailedAnchorTarget=selected,renderSelection());$('anchorShape').value='circle';$('anchorFirstShape').value='rect';$('anchorFirstShape').dispatchEvent(new Event('change'));$('advanced').open=true;$('uiViewTab').click()});
 assert.equal(await page.locator('#anchorHandles [data-anchor-kind=first]').evaluate(n=>n.localName),'rect');assert.equal(await page.locator('#anchorHandles circle[data-anchor-kind=coordinate]').count(),2);
 assert.equal(await page.locator('.anchorFillRow').isVisible(),true);assert.equal(await page.locator('.anchorFirstFillRow').isVisible(),true);
 await page.evaluate(()=>{$('anchorFirstShape').value='line';$('anchorFirstShape').dispatchEvent(new Event('change'))});
 assert.equal(await page.locator('.anchorFillRow').isVisible(),true);assert.equal(await page.locator('.anchorFirstFillRow').isVisible(),false);
 await page.evaluate(()=>{$('anchorShape').value='line';$('anchorFirstShape').value='circle';$('anchorShape').dispatchEvent(new Event('change'))});
 assert.equal(await page.locator('.anchorFillRow').isVisible(),false);assert.equal(await page.locator('.anchorFirstFillRow').isVisible(),true);assert.equal(await page.locator('#anchorHandles [data-anchor-kind=first]').evaluate(n=>n.localName),'circle');
 const layerOrder=await page.evaluate(()=>({selection:Number(getComputedStyle($('selectionOverlay')).zIndex),anchors:Number(getComputedStyle($('anchorOverlay')).zIndex),art:Number(getComputedStyle($('svg')).zIndex),selectionHit:getComputedStyle($('selectionOverlay')).pointerEvents,anchorParent:$('anchorHandles').parentElement.id}));
 assert.ok(layerOrder.selection>layerOrder.anchors&&layerOrder.anchors>layerOrder.art,'selection must paint above the dedicated anchor layer');assert.equal(layerOrder.selectionHit,'none');assert.equal(layerOrder.anchorParent,'anchorOverlay');

 await page.evaluate(()=>{$('anchorShape').value='circle';$('anchorFirstShape').value='rect';$('anchorOverflow').value='7';$('anchorFirstOverflow').value='12';$('anchorFirstOverflow').dispatchEvent(new Event('input'))});
 assert.equal(await page.locator('#anchorHandles [data-anchor-kind=first]').getAttribute('width'),'24');assert.equal(await page.locator('#anchorHandles [data-anchor="1"]').getAttribute('r'),'7');
 assert.equal(await page.locator('#anchorFirstOverflow').evaluate(n=>n.closest('[data-conversion-component]')?.getAttribute('data-conversion-component')),'slider');

 await page.locator('#anchorFirstOverflowUnit').click();assert.equal(await page.locator('#anchorFirstOverflowUnit').textContent(),'%');assert.equal(await page.evaluate(()=>ChipUI.measurements.value('anchorOverflow')),7);assert.ok(Math.abs(Number(await page.locator('#anchorHandles [data-anchor-kind=first]').getAttribute('width'))-24)<1e-4);
 await page.locator('#anchorFirstOverflowUnit').click();await page.evaluate(()=>{$('unitSelect').value='cm';$('unitSelect').dispatchEvent(new Event('change',{bubbles:true}));detailedAnchorTarget=selected;paintAnchors()});assert.equal(await page.locator('#anchorFirstOverflowUnit').textContent(),'cm');assert.ok(Math.abs(Number(await page.locator('#anchorHandles [data-anchor-kind=first]').getAttribute('width'))-24)<1e-4);assert.equal(await page.locator('#anchorHandles [data-anchor="1"]').getAttribute('r'),'7');
 assert.equal(await page.locator('#anchorProperties').isVisible(),true);assert.equal(await page.locator('#viewProperties').isVisible(),true);assert.equal(await page.locator('#propertyPageTitle').textContent(),'視圖');assert.equal(await page.locator('#viewProperties #anchorShape').count(),1);assert.equal(await page.locator('#uiAnchorTab').count(),0);assert.equal(await page.locator('#anchorProperties').evaluate(n=>n.previousElementSibling.querySelector('summary')?.textContent),'選取');

 for(const [normal,first]of [['circle','line'],['line','rect'],['rect','circle'],['line','line']]){
  await page.evaluate(({normal,first})=>{$('anchorShape').value=normal;$('anchorFirstShape').value=first;$('anchorShape').dispatchEvent(new Event('change'))},{normal,first});
  assert.equal(await page.locator('#anchorDirections').isVisible(),normal==='line');assert.equal(await page.locator('#anchorFirstDirections').isVisible(),first==='line');
 }
 const firstDirection=page.locator('#anchorFirstDirections [data-anchor-direction=horizontal]'),normalDirection=page.locator('#anchorDirections [data-anchor-direction=horizontal]'),normalState=await normalDirection.getAttribute('data-state');
 await firstDirection.click();await firstDirection.click();assert.equal(await firstDirection.getAttribute('data-state'),'off');assert.equal(await normalDirection.getAttribute('data-state'),normalState,'first-anchor directions must be independent');
 assert.equal(await page.locator('#anchorHandles line[data-anchor-kind=first]').count(),1,'the first anchor uses its own direction settings');

 await page.setViewportSize({width:1100,height:850});
 await page.evaluate(()=>{$('panel').classList.remove('show');$('advanced').open=true;$('uiViewTab').click();const probe=document.createElement('div');probe.id='scrollbar-probe';probe.style.width='1000px';probe.style.height='1px';$('advancedBody').append(probe);$('advancedBody').scrollTop=0;$('advancedBody').scrollLeft=0});
 const scrollbarGeometry=await page.evaluate(()=>{const body=$('advancedBody'),r=body.getBoundingClientRect(),edge=$('advanced').querySelector('[data-resize-edge=e]').getBoundingClientRect(),bottom=$('advanced').querySelector('[data-resize-edge=s]').getBoundingClientRect();return {x:r.right-4,y:r.top+20,hx:r.left+20,hy:r.bottom-4,right:r.right,bottom:r.bottom,edge:edge.left,bottomEdge:bottom.top}});
 assert.ok(scrollbarGeometry.right<=scrollbarGeometry.edge,'vertical scrollbar must be inside the resize rail');assert.ok(scrollbarGeometry.bottom<=scrollbarGeometry.bottomEdge,'horizontal scrollbar must be above the resize rail');
 const panelWidthBeforeScroll=await page.locator('#advanced').evaluate(n=>n.getBoundingClientRect().width);
 await page.mouse.move(scrollbarGeometry.x,scrollbarGeometry.y);await page.mouse.down();await page.mouse.move(scrollbarGeometry.x,scrollbarGeometry.y+70,{steps:5});await page.mouse.up();
 assert.ok(await page.locator('#advancedBody').evaluate(n=>n.scrollTop)>0,'vertical thumb must actually drag');assert.equal(await page.locator('#advanced').evaluate(n=>n.getBoundingClientRect().width),panelWidthBeforeScroll);
 await page.mouse.move(scrollbarGeometry.hx,scrollbarGeometry.hy);await page.mouse.down();await page.mouse.move(scrollbarGeometry.hx+60,scrollbarGeometry.hy,{steps:5});await page.mouse.up();assert.ok(await page.locator('#advancedBody').evaluate(n=>n.scrollLeft)>0,'horizontal thumb must actually drag');
 const resizeRect=await page.locator('#advanced [data-resize-edge=e]').boundingBox();await page.mouse.move(resizeRect.x+resizeRect.width/2,resizeRect.y+resizeRect.height/2);await page.mouse.down();await page.mouse.move(resizeRect.x+resizeRect.width/2+40,resizeRect.y+resizeRect.height/2,{steps:5});await page.mouse.up();assert.ok(await page.locator('#advanced').evaluate(n=>n.getBoundingClientRect().width)>panelWidthBeforeScroll,'outer resize rail must still work');
 await page.locator('#scrollbar-probe').evaluate(n=>n.remove());

 // Merge only secondary selection displays; primary geometry and style remain independent.
 await page.setViewportSize({width:1200,height:1000});await page.evaluate(()=>{setTool('select');art.innerHTML='';layers.normalize();renderLayers();scale=2;viewAngle=0;viewMirrored=false;view();const a=el('rect',{x:-60,y:0,width:10,height:10,stroke:'#fff'}),b=el('rect',{x:0,y:0,width:10,height:10,stroke:'#fff'}),c=el('rect',{x:30,y:20,width:10,height:10,stroke:'#fff'});selection.replace([a,b,c]);selected=selection.primary;detailedAnchorTarget=selected;(detailedAnchorTarget=selected,renderSelection());$('advanced').open=true;$('uiViewTab').click();$('selectionOutlineColor').value='#22cc88';$('selectionOutlineFill').value='#118855';$('selectionOutlineOpacity').value='35';$('selectionFirstColor').value='#ee3377';$('selectionFirstFill').value='#661144';$('selectionFirstOpacity').value='70';$('selectionOutlineMode').value='rect';window.dispatchEvent(new Event('selectionstylechange'))});
 const mergeFirstBefore=await page.locator('[data-selection-kind=first]').evaluate(n=>n.outerHTML),mergeArtBefore=await page.evaluate(()=>({html:art.innerHTML,history:history.length}));assert.equal(await page.locator('#selectionMerge').getAttribute('aria-pressed'),'false');assert.equal(await page.locator('#selectionMerge svg rect').count(),2);assert.equal(await page.locator('#selectionOverlay [data-selection-kind]').count(),3);await page.locator('#selectionMerge').click();await page.locator('#uiChoicePopup [data-value=all-simple]').click();assert.equal(await page.locator('#selectionMerge').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('#selectionMerge svg rect').count(),1);assert.equal(await page.locator('#selectionMerge svg').getAttribute('stroke'),'#22cc88');assert.equal(await page.locator('#selectionMerge svg').getAttribute('fill'),'#118855');assert.equal(await page.locator('#selectionMerge svg').getAttribute('fill-opacity'),'0.35');assert.equal(await page.locator('#selectionOverlay [data-selection-kind]').count(),2);assert.equal(await page.locator('[data-selection-kind=merged]').count(),1);assert.equal(await page.locator('[data-selection-kind=first]').evaluate(n=>n.outerHTML),mergeFirstBefore,'first selection remains identical when other displays merge');assert.deepEqual(await page.evaluate(()=>({html:art.innerHTML,history:history.length})),mergeArtBefore,'display merge does not merge objects or add history');
 await page.selectOption('#selectionOutlineMode','contour');assert.equal(await page.locator('path[data-selection-kind=merged]').count(),1,'fan outline supports the combined secondary selection');await page.locator('#selectionMerge').click();await page.locator('#uiChoicePopup [data-value=independent]').click();assert.equal(await page.locator('#selectionOverlay [data-selection-kind]').count(),3);assert.equal(await page.locator('#selectionMerge svg rect').count(),2);
 await page.setViewportSize({width:375,height:900});await page.locator('#selectionMerge').scrollIntoViewIfNeeded();assert.equal(await page.locator('.selection-shape-row').evaluate(n=>n.scrollWidth<=n.clientWidth+1),true,'merge control stays within the compact row');const mergeRowBounds=await page.locator('.selection-shape-row').boundingBox(),mergeButtonBounds=await page.locator('#selectionMerge').boundingBox();assert.ok(mergeButtonBounds.x>=mergeRowBounds.x&&mergeButtonBounds.x+mergeButtonBounds.width<=mergeRowBounds.x+mergeRowBounds.width+1);await page.locator('#selectionMerge').click();await page.locator('#uiChoicePopup [data-value=all-simple]').click();if(process.env.CHIPDRAW_MERGE_SCREENSHOT)await page.screenshot({path:process.env.CHIPDRAW_MERGE_SCREENSHOT});await page.reload();await page.locator('#viewMenuButton').click();assert.equal(await page.locator('#selectionMerge').getAttribute('aria-pressed'),'true','merge preference persists');
 // Display topology: all regions vs adjacent groups, simplified hull vs true union.
 await page.setViewportSize({width:1200,height:1000});await page.evaluate(()=>{art.innerHTML='';layers.normalize();renderLayers();scale=1;view();const nodes=[[-50,50,10,10],[0,0,20,10],[10,5,20,10],[70,0,10,10]].map(([x,y,width,height])=>el('rect',{x,y,width,height,fill:'#fff',stroke:'none'}));selection.replace(nodes);selected=selection.primary;detailedAnchorTarget=selected;(detailedAnchorTarget=selected,renderSelection());$('advanced').open=true;$('uiViewTab').click();$('selectionOutlineMode').value='rect';$('selectionOverflowUnit').setAttribute('data-unit','px');ChipUI.measurements.setValue('selectionOverflow',0,'px');window.dispatchEvent(new Event('selectionstylechange'))});
 async function chooseDisplay(mode){await page.locator('#selectionMerge').click();await page.locator('#uiChoicePopup [data-value='+mode+']').click()}
 await chooseDisplay('independent');assert.equal(await page.locator('#selectionMerge').getAttribute('aria-label'),'選區展示方式');assert.ok((await page.locator('#selectionMerge').getAttribute('data-tooltip')).includes('獨立展示'));assert.equal(await page.locator('#selectionOverlay > *').count(),4);const topologyFirst=await page.locator('[data-selection-kind=first]').evaluate(n=>n.outerHTML),topologyArt=await page.evaluate(()=>({html:art.innerHTML,history:history.length}));await chooseDisplay('all-simple');assert.equal(await page.locator('#selectionOverlay > *').count(),2);await chooseDisplay('adjacent-simple');assert.equal(await page.locator('#selectionOverlay > *').count(),3,'adjacent display does not bridge the distant object');await chooseDisplay('adjacent-union');assert.equal(await page.locator('path[data-selection-kind=merged]').count(),2);assert.equal(await page.evaluate(()=>{const node=[...$('selectionOverlay').querySelectorAll('[data-selection-kind=merged]')].find(n=>n.getBBox().width>20),r=svg.getBoundingClientRect(),p=transformPoint({x:5,y:12},$('world').getScreenCTM());const local=transformPoint(p,node.getScreenCTM().inverse());return node.isPointInFill(new DOMPoint(local.x,local.y))}),false,'true union preserves the concavity instead of filling its bounding box');assert.equal(await page.locator('[data-selection-kind=first]').evaluate(n=>n.outerHTML),topologyFirst);assert.deepEqual(await page.evaluate(()=>({html:art.innerHTML,history:history.length})),topologyArt,'display modes leave objects and history unchanged');await chooseDisplay('independent');await page.reload();await page.locator('#viewMenuButton').click();assert.equal(await page.locator('#selectionDisplayMode').inputValue(),'independent');assert.ok((await page.locator('#selectionMerge').getAttribute('data-tooltip')).includes('獨立展示'));
 assert.deepEqual(errors,[]);
 console.log('PASS: browser startup, transformed/mirrored anchor drag, one-step undo/redo, Escape rollback, position/size/style/layer properties, curve handles, locked layer pruning compact number/unit components, typed geometry, polar/Cartesian editing, clock/radian/degree angles shared settings layout and independent first-selection rendering');
}finally{await browser.close()}
