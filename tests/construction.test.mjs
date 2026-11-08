import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const context=vm.createContext({assert});
for(const file of ['shared/viewport-core.js','shared/quantity-editor.js','shared/json-store.js','shared/drawing-model.js'])vm.runInContext(await readFile(new URL('../'+file,import.meta.url),'utf8'),context);
vm.runInContext(`
const M=ChipDrawingModel,close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8, a+' != '+b),point=(g,angle)=>[g.point[0]+g.radius*Math.cos(angle*Math.PI/180),g.point[1]+g.radius*Math.sin(angle*Math.PI/180)];
for(const reference of Object.keys(M.rectAnchors)){
 const first=[123.456789,-78.123456],d=M.rotate([8,-6],37),second=[first[0]+d[0],first[1]+d[1]],raw=M.rectangleFromPoints(reference,first,second,{rotation:37}),g=M.solve(raw);
 assert.equal(raw.reference,reference);assert.equal(raw.rotation,37);assert.ok(g.width>0&&g.height>0);
 if(M.rectRefs[reference]){assert.deepEqual(raw.point,first);assert.equal(Object.hasOwn(raw,'points'),false);assert.deepEqual(g.pivot,first)}else{assert.equal(raw.points.length,2);assert.equal(Object.hasOwn(raw,'point'),false);assert.equal(Object.hasOwn(raw,'width'),false);assert.equal(Object.hasOwn(raw,'height'),false);close(g.width,8);close(g.height,6)}
 assert.deepEqual(M.inspect(raw).data,raw);
}
assert.throws(()=>M.rectangleFromPoints('center',[0,0],[0,1]));
const examples=[
 {type:'arc',reference:'center-start-end',points:[[0,0],[10,0],[0,10]]},
 {type:'arc',reference:'center-start-sweep',points:[[0,0],[10,0]],sweep:-270},
 {type:'arc',reference:'three-points',points:[[10,0],[0,10],[-10,0]]},
 {type:'arc',reference:'endpoints-sagitta',points:[[-10,0],[10,0]],sagitta:5},
 {type:'arc',reference:'start-tangent-end',points:[[0,0],[10,10]],angle:90},
 {type:'arc',reference:'two-tangents',points:[[-10,0],[0,10]],angles:[90,0],direction:'cw'},
 {type:'arc',reference:'center-radius-start-sweep',point:[2,3],radius:10,angle:30,sweep:360,closed:'sector'}
];
for(const raw of examples){const result=M.inspect(raw);assert.ok(result.geometry,JSON.stringify(result.issues));assert.deepEqual(result.data,raw);assert.ok(M.arcPath(result.geometry).includes(' A '));assert.ok(!M.arcPath(result.geometry).includes('NaN'))}
close(M.solve(examples[0]).sweep,90);close(M.solve(examples[1]).sweep,-270);close(M.solve(examples[2]).sweep,180);const sagitta=M.solve(examples[3]);close(sagitta.radius,12.5);close(point(sagitta,sagitta.start+sagitta.sweep/2)[1],5);close(M.solve(examples[4]).point[0],10);close(M.solve(examples[5]).radius,10);
assert.equal(M.arcPath(M.solve(examples[6])).match(/ A /g).length,2);assert.ok(M.arcPath(M.solve(examples[6])).endsWith(' Z'));
for(const side of [1,-1])for(const large of [false,true]){const raw={type:'arc',reference:'endpoints-radius',points:[[-10,0],[10,0]],radius:12,side,large},g=M.solve(raw),a=point(g,g.start),b=point(g,g.start+g.sweep);close(a[0],-10);close(a[1],0);close(b[0],10);close(b[1],0);assert.equal(Math.abs(g.sweep)>180,large);assert.deepEqual(M.inspect(raw).data,raw)}
for(const raw of [
 {type:'arc',reference:'three-points',points:[[0,0],[1,0],[2,0]]},
 {type:'arc',reference:'endpoints-radius',points:[[0,0],[10,0]],radius:4},
 {type:'arc',reference:'center-start-end',points:[[0,0],[1,0],[0,2]]},
 {type:'arc',reference:'two-tangents',points:[[0,0],[2,1]],angles:[0,90]},
 {type:'arc',reference:'center-start-sweep',points:[[0,0],[1,0]],sweep:0},
 {...examples[0],closed:false}
]){const result=M.inspect(raw);assert.equal(result.geometry,null);assert.deepEqual(result.data,raw);assert.ok(result.issues.some(issue=>issue.code==='geometry'))}
`,context);
export const results=['11 rectangle drawing references preserve their declared parameters and rotation','arc construction solves signed sweep, three-point, radius selections, sagitta, tangent and double-tangent definitions','invalid arc geometry retains its original JSON and has no false SVG projection'];
