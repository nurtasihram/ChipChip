import assert from 'node:assert/strict';
import '../shared/scalar-input.js';
import {createDOM} from './dom-fixture.mjs';

const {document}=createDOM('<body></body>');
globalThis.document=document;
try {
 for(const [type,original,draft,expected,invalid] of [
  ['integer',7,'-42',-42,'2.5'],['decimal',0,'.125',0.125,'1x'],
  ['char','A','𠮷','𠮷','AB'],['string','A','001','001',null]
 ]){
  const a={value:original},b={value:original};
  const control=ChipScalar.create({type,label:type});
  const old=control.bind(a,'value');
  // The fixture has no browser replaceWith implementation.
  old.input.replaceWith=()=>{};
  old.input.value=draft;
  const next=control.bind(b,'value');
  assert.equal(old.commit(),false);
  assert.equal(a.value,original);assert.equal(b.value,original);
  assert.equal(next.input.value,String(original));
  next.input.value=draft;assert.equal(next.commit(),true);assert.equal(b.value,expected);
  if(invalid!==null){
   next.input.value=invalid;assert.equal(next.commit(),false);assert.equal(b.value,expected);
   next.cancel();assert.equal(next.input.value,String(expected));
  }
  control.dispose();assert.equal(next.commit(),false);
 }
 assert.throws(()=>ChipScalar.parse('integer','9007199254740992'));
 assert.throws(()=>ChipScalar.parse('decimal','Infinity'));
 assert.throws(()=>ChipScalar.parse('char','\ud800'));
 assert.equal(ChipScalar.parse('string',''),'');
}finally{delete globalThis.document;}
