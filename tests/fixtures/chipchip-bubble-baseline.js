/* Frozen ChipChip baseline from Git 3ab6cab; MIT, see LICENSE.ChipChip. */
function updateScaleLegend(){const pxUnit=mmPerUnit()/1;document.getElementById("pixelScaleText").textContent=`${fmtNumber(1/Math.max(scale,1e-12)/pxUnit)} ${document.getElementById("unitSelect").value}/px`;const degrees=((angle*180/Math.PI)%360+360)%360;const shown=Math.abs(degrees-360)<0.05||degrees<0.05?0:Number(degrees.toFixed(1));document.getElementById('orientationText').textContent=`旋轉 ${formatViewAngle(angle)}${mirrorX.checked?'（翻轉）':''}`;const unit=document.getElementById('unitSelect').value;const maxMM=Math.max(.02,Math.min(140,Math.min(w*.31,180)/scale));const unitMM=mmPerUnit();const maxUnits=maxMM/unitMM;const power=Math.pow(10,Math.floor(Math.log10(maxUnits)));let nice=power;for(const factor of [1,2,5,10]){if(factor*power<=maxUnits)nice=factor*power}document.getElementById('scaleText').textContent=`${fmtNumber(nice)} ${unit}`;document.getElementById('scaleBar').style.width=(nice*unitMM*scale)+'px'}
function updateAxisCompass(){
 const polar=document.getElementById('coordinateMode').value==='polar';
 const mirror=mirrorX.checked?-1:1;
 const c=Math.cos(angle),sn=Math.sin(angle);
 const vector=(x,y)=>{const a=x*mirror,b=-y;return [a*c-b*sn,a*sn+b*c]};
 const norm=v=>{const d=Math.hypot(...v)||1;return [v[0]/d,v[1]/d]};
 const xaxis=norm(vector(1,0)),yaxis=norm(vector(0,1));
 const g=document.getElementById('axisCompassGeometry');
 const NS='http://www.w3.org/2000/svg';
 g.replaceChildren();
 const add=(tag,attrs)=>{const e=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));g.appendChild(e);return e};
 const O=[62,62],L=31;
 const arrow=(point,tangent,color,size=7)=>{
  const back=[point[0]-tangent[0]*size,point[1]-tangent[1]*size];
  const perp=[-tangent[1]*size*.43,tangent[0]*size*.43];
  add('polygon',{points:`${point.join(',')} ${back[0]+perp[0]},${back[1]+perp[1]} ${back[0]-perp[0]},${back[1]-perp[1]}`,fill:color});
 };
 const line=(v,color,label,withArrow=true)=>{
  const end=[O[0]+v[0]*L,O[1]+v[1]*L];
  add('line',{x1:O[0],y1:O[1],x2:end[0]-(withArrow?v[0]*7:0),y2:end[1]-(withArrow?v[1]*7:0),stroke:color,'stroke-width':3,'stroke-linecap':'round'});
  if(withArrow)arrow(end,v,color);
  if(label)add('text',{x:end[0]+v[0]*11,y:end[1]+v[1]*11+4}).textContent=label;
 };
 // Positive polar angles increase counterclockwise in drawing-plane coordinates.
 // Mirroring reverses that direction on screen.
 const positive=mirror===1?-1:1;
 const angleOf=v=>Math.atan2(v[1],v[0]);
 const curvedArrow=(startAngle,endAngle,r,color)=>{
  const n=Math.max(8,Math.ceil(Math.abs(endAngle-startAngle)/.045));
  let d='';for(let i=0;i<=n;i++){
   const t=startAngle+(endAngle-startAngle)*i/n;
   d+=(i?' L ':'M ')+(O[0]+r*Math.cos(t)).toFixed(3)+' '+(O[1]+r*Math.sin(t)).toFixed(3);
  }
  // Stop the arc at the base of the arrowhead, not its tip.
  const shortened=endAngle-positive*7/r;
  const pathSteps=Math.max(8,Math.ceil(Math.abs(shortened-startAngle)/.045));
  d='';for(let i=0;i<=pathSteps;i++){const t=startAngle+(shortened-startAngle)*i/pathSteps;d+=(i?' L ':'M ')+(O[0]+r*Math.cos(t)).toFixed(3)+' '+(O[1]+r*Math.sin(t)).toFixed(3)}
  add('path',{d,fill:'none',stroke:color,'stroke-width':2.3,'stroke-linecap':'round'});
  const e=[O[0]+r*Math.cos(endAngle),O[1]+r*Math.sin(endAngle)];
  const t=positive===1?[-Math.sin(endAngle),Math.cos(endAngle)]:[Math.sin(endAngle),-Math.cos(endAngle)];
  arrow(e,t,color,7);
  return e;
 };
 if(!polar){line(xaxis,'#ff5969','x');line(yaxis,'#60a5fa','y')}
 else{
  // ρ is the drawing plane's rotated X direction; θ is an angular annotation,
  // never a perpendicular linear coordinate axis.
  line(xaxis,'#60a5fa','ρ');
  const rotated=Math.abs(Math.atan2(Math.sin(angle),Math.cos(angle)))>0.001;
  if(rotated){
   const reference=[mirror,0]; // unrotated X direction, not an independent θ axis
   const delta=Math.atan2(reference[0]*xaxis[1]-reference[1]*xaxis[0],reference[0]*xaxis[0]+reference[1]*xaxis[1]);
   // Display θ reference as a thin ray, with no arrowhead.
   line(reference,'#42d98c','',false);
   if(Math.abs(delta)>.025){
    let sweep=delta;
    if(positive===1&&sweep<0)sweep+=Math.PI*2;
    if(positive===-1&&sweep>0)sweep-=Math.PI*2;
    // Large rotations remain within the compass bounds.
    curvedArrow(angleOf(reference),angleOf(reference)+sweep,18,'#42d98c');
   }
   add('text',{x:O[0]+Math.cos(angleOf(reference)+positive*.45)*28,y:O[1]+Math.sin(angleOf(reference)+positive*.45)*28+4}).textContent='θ';
  }else{
   // No θ ray at zero rotation: only a curved direction marker beyond ρ.
   const base=angleOf(xaxis),start=base+positive*.15,end=base+positive*.9;
   curvedArrow(start,end,47,'#42d98c');
   add('text',{x:O[0]+Math.cos(end)*58,y:O[1]+Math.sin(end)*58+4}).textContent='θ';
  }
 }
 add('circle',{cx:O[0],cy:O[1],r:3.2,fill:'#e8f1ff'});
 document.getElementById('axisCompass').setAttribute('aria-label',polar?'極座標方向：ρ 徑向，θ 為極角及其遞增方向':'正交座標方向：X 軸與 Y 軸');
}
