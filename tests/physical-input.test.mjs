import assert from 'node:assert/strict';
import '../shared/quantity-editor.js';

const {layout,display,parse,inUnit}=globalThis.ChipPhysical;
const settings={length:'metric',length_approx:'mm',fraction_style:'fraction'};
for(const [kind,units] of [['scalar-ratio',{}],['dimensional-ratio',{unit:'mm'}],['dimensional-ratio',{numeratorUnit:'px',denominatorUnit:'mm'}]]){
 const record={numerator:6,denominator:8,...units},spec=layout(kind,{},null,record);
 assert.deepEqual(parse(display(record,spec),spec),record);
 assert.deepEqual(parse(['12','16'],spec),{...record,numerator:12,denominator:16});
 assert.throws(()=>parse(['1','0'],spec));
}
for(const units of [{},{numeratorUnit:'px'},{unit:'mm',denominatorUnit:'s'},{unit:''}]){
 assert.throws(()=>layout('dimensional-ratio',{},null,{numerator:2,denominator:3,...units}));
}
const third={value:1/3,unit:'mm',rational:{kind:'rational',numerator:1,denominator:3}};
assert.deepEqual(display(third,layout('length',settings,'cm')),['1','30']);
const area=layout('area',settings,'cm2');
assert.deepEqual(display({...third,unit:'mm2'},area),['1','300']);
assert.deepEqual(inUnit('area',parse(['1','300'],area),'mm2'),{...third,unit:'mm2'});
assert.throws(()=>parse(['2','0'],area));
assert.throws(()=>parse(['3x','2'],area));
const clock=layout('angle',{angle:'clock',time_approx:'ms'});
assert.deepEqual(display({value:-7.5,unit:'°'},clock),['-0','15','0','0']);
assert.equal(parse(['-0','15','0','0'],clock).value,-7.5);
assert.throws(()=>parse(['0','60','0','0'],clock));
const time=layout('time',{time_approx:'us'},'clock');
assert.deepEqual(display({unit:'ms',value:1234.567},time),['0','0','1','234','567']);
assert.equal(parse(['0','0','1','234','567'],time).value,1.234567);
const rad=parse(['0.125'],layout('angle',{angle:'radius'}));
assert.equal(rad.unit,'rad');
assert.equal(rad.rational.denominator,8);
assert.equal(display(rad,layout('angle',{angle:'deg',angle_precision:4}))[0],'7.1620');

const calibration=[[480,127],'mm'];
const inch=ChipPhysical.convertPixel(calibration,'inch');
assert.deepEqual(inch,[[96,1],'inch']);
assert.deepEqual(ChipPhysical.convertPixel(inch,'mm'),calibration);
assert.deepEqual(ChipPhysical.convertPixel([[960,254],'mm'],'mm'),[[960,254],'mm']);
assert.throws(()=>ChipPhysical.convertPixel([[1,Number.MAX_SAFE_INTEGER],'km'],'um'));
assert.throws(()=>ChipPhysical.convertPixel(calibration,'px'));
