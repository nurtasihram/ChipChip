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
