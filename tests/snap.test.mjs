import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const context=vm.createContext({});vm.runInContext(await readFile(new URL('../src/chipdraw/snap-core.js',import.meta.url),'utf8'),context);
const core=context.ChipSnap,plain=x=>JSON.parse(JSON.stringify(x));
assert.deepEqual(plain(core.nearestPoint({x:5,y:3},{x:0,y:0},{x:10,y:0})),{x:5,y:0});
assert.deepEqual(plain(core.nearestPoint({x:-5,y:3},{x:0,y:0},{x:10,y:0})),{x:0,y:0});
assert.deepEqual(plain(core.intersection({x:0,y:0},{x:10,y:10},{x:0,y:10},{x:10,y:0})),{x:5,y:5});
assert.equal(core.intersection({x:0,y:0},{x:10,y:0},{x:0,y:1},{x:10,y:1}),null);
const candidates=[{id:'node',type:'node',point:{x:8,y:0}},{id:'grid',type:'grid',point:{x:1,y:0}}],point={x:0,y:0};
assert.equal(core.resolve({point,candidates,enabledTypes:['node','grid'],tolerance:10}).id,'grid');
assert.equal(core.resolve({point,candidates,enabledTypes:['grid','node'],tolerance:10}).id,'grid');
assert.equal(core.resolve({point,candidates,enabledTypes:['node'],tolerance:5}),null);
assert.equal(core.resolve({point,candidates,enabledTypes:['node'],tolerance:5,screen:p=>({x:-p.y,y:p.x*.5})}).id,'node');
assert.equal(core.resolve({point,candidates:[{id:'old',type:'node',point:{x:12,y:0}},{id:'new',type:'node',point:{x:2,y:0}}],enabledTypes:['node'],tolerance:10,previous:'old'}).id,'new');
assert.equal(core.resolve({point,candidates:[{id:'old',type:'grid',point:{x:12,y:0}},{id:'new',type:'node',point:{x:2,y:0}}],enabledTypes:['node','grid'],tolerance:10,previous:'old'}).id,'new');
assert.equal(core.resolve({point:{x:NaN,y:0},candidates,enabledTypes:['node'],tolerance:10}),null);
export const results=['snap prototype: geometry, segment intersections, enabled types and distance selection, screen-space tolerance and hysteresis'];

assert.equal(core.nearby({point,candidates,enabledTypes:['node','grid'],mode:'all'})[0].id,'grid');
assert.equal(core.nearby({point,candidates,enabledTypes:['node','grid'],mode:'all',tolerance:5}).length,1,'all mode includes enabled types regardless of priority');
assert.deepEqual(plain(core.nearby({point,candidates,enabledTypes:['grid','node']})).map(c=>c.id),['grid','node']);
assert.equal(core.nearby({point,candidates,enabledTypes:['node'],tolerance:5,screen:p=>({x:p.x/2,y:p.y})}).length,1);

const gridCandidates=[{id:'left',type:'grid',point:{x:0,y:0}},{id:'right',type:'grid',point:{x:40,y:0}}];
assert.equal(core.resolve({point:{x:39,y:0},candidates:gridCandidates,enabledTypes:['grid'],tolerance:200,previous:'left'}).id,'right','large lock radius must not retain a far grid point');
assert.equal(core.resolve({point:{x:20.5,y:0},candidates:gridCandidates,enabledTypes:['grid'],tolerance:200,previous:'left'}).id,'left','near-equal distances retain previous point to avoid flicker');
assert.equal(core.resolve({point:{x:22,y:0},candidates:gridCandidates,enabledTypes:['grid'],tolerance:200,previous:'left'}).id,'right','crossing the small tie band switches to the closer point');
assert.equal(core.resolve({point:{x:39,y:0},candidates:gridCandidates,enabledTypes:['grid'],tolerance:200,previous:'left',screen:p=>({x:p.x*.1,y:p.y*.1})}).id,'right','tie band is measured in screen pixels after zoom');

for(const step of [10,1,.000001]){
 const point={x:23.4,y:-17.8},candidates=core.nearestGrid({point,spacing:{x:step,y:step}});
 assert.ok(candidates.length<=4);
 const best=core.resolve({point,candidates,enabledTypes:['grid'],tolerance:100});
 assert.ok(Math.abs(best.point.x-Math.round(point.x/step)*step)<1e-9);
 assert.ok(Math.abs(best.point.y-Math.round(point.y/step)*step)<1e-9);
}
for(const angle of [.3,.7,Math.PI/2,7])for(let i=0;i<80;i++){
 const point={x:12*Math.cos(i*.19),y:12*Math.sin(i*.19)},spacing={r:1.7};
 const direct=core.nearestGrid({point,spacing,angle});assert.ok(direct.length<=9);
 const brute=[];for(let ring=0;ring<12;ring++)for(let a=0;a<Math.ceil(2*Math.PI/angle);a++)brute.push({type:'grid',id:ring+':'+a,point:{x:ring*spacing.r*Math.cos(a*angle),y:-ring*spacing.r*Math.sin(a*angle)}});
 const resolve=candidates=>core.resolve({point,candidates,enabledTypes:['grid'],tolerance:100});
 assert.ok(Math.abs(resolve(direct).distance-resolve(brute).distance)<1e-9);
}
assert.ok(core.nearestGrid({point:{x:39,y:0},spacing:{x:40,y:40},retain:['grid:0:0']}).some(c=>c.id==='grid:0:0'));
assert.ok(core.nearestGrid({point:{x:100,y:40},spacing:{r:1e-9},angle:1e-9}).length<=9);

// Indexed queries must match exhaustive distances while stopping before distant objects.
{
 const items=Array.from({length:20000},(_,i)=>({type:'node',id:String(i),point:{x:i*10,y:0}})),index=core.spatialIndex(items),stats={};
 const hits=index.search({point:{x:.25,y:0},radius:1e9,stats});
 assert.equal(hits[0].id,'0');assert.ok(stats.evaluated<=2,'nearest query must stop without scanning distant candidates');
 assert.equal(index.search({point:{x:5,y:100},radius:1}).length,0);
 const filtered=index.search({point:{x:0,y:0},radius:100,accept:c=>c.id!=='0'});assert.equal(filtered[0].id,'1');
 const seeds=[{id:'grid',type:'grid',point:{x:.25,y:0}}],seedStats={};
 assert.equal(index.search({point:{x:.25,y:0},radius:1e9,seeds,stats:seedStats})[0].id,'grid');assert.equal(seedStats.evaluated,0);
}
{
 const items=Array.from({length:300},(_,i)=>({type:'node',id:String(i),point:{x:Math.sin(i*3.17)*200,y:Math.cos(i*1.31)*200}}));
 items.push({...items[40],id:'overlap'});const index=core.spatialIndex(items);
 for(let i=0;i<100;i++){
  const point={x:Math.cos(i*.31)*150,y:Math.sin(i*.57)*150},hits=index.search({point,radius:1000}),brute=core.resolve({point,candidates:items,enabledTypes:['node'],tolerance:1000});
  assert.ok(Math.abs(Math.hypot(hits[0].point.x-point.x,hits[0].point.y-point.y)-brute.distance)<1e-9);
 }
 assert.equal(index.search({point:items[40].point,radius:1}).length,2,'coincident candidates remain selectable');
 const segments=Array.from({length:100},(_,i)=>({id:'s'+i,a:{x:i*4,y:-5},b:{x:i*4+20,y:20}})),tree=core.spatialIndex(segments);
 for(let i=0;i<30;i++){
  const point={x:i*8.31,y:i-10},hits=tree.search({point,radius:1000,evaluate:s=>[{id:s.id,point:core.nearestPoint(point,s.a,s.b)}]}),distance=Math.min(...segments.map(s=>{const p=core.nearestPoint(point,s.a,s.b);return Math.hypot(p.x-point.x,p.y-point.y)}));
  assert.ok(Math.abs(Math.hypot(hits[0].point.x-point.x,hits[0].point.y-point.y)-distance)<1e-9);
 }
}

// Count-limited queries preserve exact nearest candidates without enumerating dense grids.
for(const spacing of [{x:1,y:1},{x:.001,y:10},{x:7,y:.03}]){const point={x:.0023,y:.017},count=20,found=core.gridCandidates({point,spacing,radius:100,count}),brute=[];const cx=Math.round(point.x/spacing.x),cy=Math.round(point.y/spacing.y);for(let x=cx-25;x<=cx+25;x++)for(let y=cy-25;y<=cy+25;y++)brute.push(Math.hypot(x*spacing.x-point.x,y*spacing.y-point.y));brute.sort((a,b)=>a-b);const distances=found.map(c=>Math.hypot(c.point.x-point.x,c.point.y-point.y)).sort((a,b)=>a-b);assert.equal(distances.length,count);for(let i=0;i<count;i++)assert.ok(Math.abs(distances[i]-brute[i])<1e-9)}
const many=Array.from({length:2000},(_,i)=>({id:String(i),point:{x:Math.sin(i)*i,y:Math.cos(i)*i}})),probe={x:20,y:-10},stats={},bounded=core.spatialIndex(many).search({point:probe,radius:5000,count:12,stats}),expected=many.sort((a,b)=>Math.hypot(a.point.x-probe.x,a.point.y-probe.y)-Math.hypot(b.point.x-probe.x,b.point.y-probe.y)).slice(0,12);assert.deepEqual(plain(bounded.map(c=>c.id)),expected.map(c=>c.id));assert.ok(stats.evaluated<100);
