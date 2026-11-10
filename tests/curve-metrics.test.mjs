import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const context=vm.createContext({assert});
vm.runInContext(await readFile(new URL('../shared/curve-metrics.js',import.meta.url),'utf8'),context);
vm.runInContext(`
const G=ChipCurveMetrics,near=(a,b,eps=1e-7)=>assert.ok(Math.abs(a-b)<eps,a+' != '+b),p=(x,y)=>({x,y});
const line=G.metric(G.bezier([p(0,0),p(100,0)]));near(line.total,100);near(line.divide(.1,.9,3,4).x,70);near(line.divide(.9,.1,3,4).x,30);near(line.at(-20,{extend:true}).x,-20);near(line.at(120,{extend:true}).x,120);assert.equal(line.at(120),null);assert.throws(()=>line.divide(0,1,1,0));assert.throws(()=>line.divide(0,1,3,2));
// Nonuniform parameterization: t=1/2 is NOT the arc-length midpoint.
for(const degree of [2,3,4]){const points=Array.from({length:degree+1},(_,i)=>p(i===degree?100:0,0)),m=G.metric(G.bezier(points));near(m.total,100);near(m.divide(0,1,1,2).x,50);near(m.parameter(50),Math.pow(.5,1/degree));near(m.at(-10,{extend:true}).x,degree%2?-10:10);}
const quadratic=G.metric(G.bezier([p(0,0),p(.5,0),p(1,1)]));near(quadratic.total,Math.sqrt(5)/2+Math.asinh(2)/4);const half=quadratic.parameter(quadratic.total/2);near(quadratic.length(0,half),quadratic.length(half,1));assert.ok(Math.abs(half-.5)>.05);
const folded=G.metric(G.bezier([p(0,0),p(10,0),p(0,0)]));near(folded.total,10);near(folded.at(2.5).x,2.5);near(folded.at(7.5).x,2.5);
const circle=G.metric(G.ellipse(3,4,10,10));near(circle.total,20*Math.PI);near(circle.at(circle.total/4).x,3);near(circle.at(circle.total/4).y,14);
for(const sweep of [0,1]){const arc=G.arc(p(10,0),[10,10,0,0,sweep,0,10]),m=G.metric(arc);near(arc.point(0).x,10);near(arc.point(1).x,0);near(arc.point(1).y,10);near(m.total,5*Math.PI);}
const cmds=[{type:'M',values:[0,0]},{type:'C',values:[0,10,10,10,10,0]},{type:'S',values:[20,-10,20,0]},{type:'Q',values:[25,10,30,0]},{type:'T',values:[40,0]},{type:'M',values:[100,100]},{type:'L',values:[101,100]}],segments=G.commands(cmds);assert.equal(segments.length,5);near(segments[1].derivative(0).x,0);near(segments[1].derivative(0).y,-30);near(segments[3].derivative(0).y,-20);near(G.metric(segments[4]).total,1);
const ellipse=G.metric(G.transform(G.ellipse(0,0,10,10),{a:3,b:0,c:0,d:1,e:8,f:-2}));const t=ellipse.parameter(ellipse.total*.2);near(ellipse.length(0,t),ellipse.total*.2);assert.ok(Math.abs(t-.2)>.005);
const curve=G.bezier([p(0,0),p(0,120),p(100,-40),p(100,0)]),hit=G.nearest(curve,curve.point(.73));near(hit.t,.73,1e-6);near(hit.distance,0,1e-5);
// Extend the original polynomial in both directions, including a stationary endpoint.
for(const points of [[p(0,0),p(50,0),p(100,100)],[p(0,0),p(0,0),p(70,50),p(100,0)],[p(0,0),p(20,-40),p(60,80),p(90,-30),p(100,10)]]){
 const c=G.bezier(points),m=G.metric(c);for(const t of [-.65,1.75]){const s=m.length(0,t),actual=m.at(s,{extend:true}),expected=c.point(t);near(m.parameter(s,{extend:true}),t,1e-7);near(actual.x,expected.x,1e-5);near(actual.y,expected.y,1e-5);assert.equal(m.at(s),null);}
}
const extended=quadratic.at(quadratic.length(0,2),{extend:true});near(extended.x,2);near(extended.y,4);assert.ok(Math.abs(extended.y-(1+2*(extended.x-1)))>.5,'extension must leave the endpoint tangent');
for(const t of [-3.37,4.61]){const s=ellipse.length(0,t),actual=ellipse.at(s,{extend:true}),expected=ellipse.curve.point(t);near(ellipse.parameter(s,{extend:true}),t,1e-7);near(actual.x,expected.x,1e-5);near(actual.y,expected.y,1e-5);}
const constant=G.metric(G.bezier([p(2,3),p(2,3),p(2,3)]));assert.equal(constant.at(1,{extend:true}),null);assert.equal(line.at(Infinity,{extend:true}),null);
for(const c of [quadratic.curve,curve,ellipse.curve,G.bezier([p(0,0),p(0,0),p(0,0),p(40,80)])])for(const t of [0,.4,1]){
 const f=G.frame(c,t);near(Math.hypot(f.tangent.x,f.tangent.y),1);near(f.tangent.x*f.normal.x+f.tangent.y*f.normal.y,0);
 for(const normal of [false,true])for(const direction of [-1,1]){const line=G.lineAt(c,t,{normal,length:37.123456,direction}),dx=line.end.x-line.start.x,dy=line.end.y-line.start.y;near(Math.hypot(dx,dy),37.123456);const u=normal?f.normal:f.tangent;near(dx*u.x+dy*u.y,37.123456*direction);}
}
assert.equal(G.frame(constant.curve,0),null);assert.equal(G.lineAt(curve,.5,{length:0}),null);assert.equal(G.lineAt(curve,.5,{length:-1}),null);
`,context);
export const results=['curve arc-length division and inversion for line, quadratic/cubic/quartic Bézier, cusps, arcs and affine ellipses; nearest-point projection and original-parameter extension'];
