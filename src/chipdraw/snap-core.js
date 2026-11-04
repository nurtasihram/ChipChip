/* Pure candidate geometry and distance resolution for the ChipDraw snap prototype. */
(function(root){
'use strict';
const finite=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
function nearestPoint(p,a,b){const x=b.x-a.x,y=b.y-a.y,length=x*x+y*y,t=length?Math.max(0,Math.min(1,((p.x-a.x)*x+(p.y-a.y)*y)/length)):0;return {x:a.x+t*x,y:a.y+t*y}}
function intersection(a,b,c,d){const rx=b.x-a.x,ry=b.y-a.y,sx=d.x-c.x,sy=d.y-c.y,den=rx*sy-ry*sx;if(Math.abs(den)<1e-12)return null;const qx=c.x-a.x,qy=c.y-a.y,t=(qx*sy-qy*sx)/den,u=(qx*ry-qy*rx)/den;if(t<0||t>1||u<0||u>1)return null;return {x:a.x+t*rx,y:a.y+t*ry}}
function resolve({point,candidates,enabledTypes,priority,tolerance=10,previous=null,screen=p=>p}){
 if(!finite(point)||!Number.isFinite(tolerance)||tolerance<=0)return null;
 const allowed=new Set(enabledTypes||priority||[]),cursor=screen(point);let best=null,held=null;
 for(const candidate of candidates){if(!finite(candidate.point)||!allowed.has(candidate.type))continue;const q=screen(candidate.point),distance=Math.hypot(q.x-cursor.x,q.y-cursor.y);if(!Number.isFinite(distance))continue;const hit={...candidate,distance};if(candidate.id===previous&&distance<=tolerance)held=hit;if(distance<=tolerance&&(!best||distance<best.distance))best=hit}
 // Preserve the previous target only in a narrow screen-space tie band.
 const tieBand=Math.min(2,tolerance*.2);
 return held&&(!best||held.distance<=best.distance+tieBand)?held:best;
}
function nearby({point,candidates,enabledTypes,priority,tolerance=10,screen=p=>p}){
 if(!finite(point)||!Number.isFinite(tolerance)||tolerance<=0)return [];
 const allowed=new Set(enabledTypes||priority||[]),cursor=screen(point);
 return candidates.filter(c=>finite(c.point)&&allowed.has(c.type)).map(c=>({...c,distance:Math.hypot(screen(c.point).x-cursor.x,screen(c.point).y-cursor.y)})).filter(c=>Number.isFinite(c.distance)&&c.distance<=tolerance).sort((a,b)=>a.distance-b.distance);
}
root.ChipSnap={nearestPoint,intersection,resolve,nearby};
})(globalThis);
