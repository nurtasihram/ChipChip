import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {Worker as NodeWorker} from 'node:worker_threads';
let terminated=0;
class WorkerBridge{constructor(source){this.worker=new NodeWorker("const {parentPort}=require('node:worker_threads');global.postMessage=x=>parentPort.postMessage(x);"+source+";parentPort.on('message',data=>onmessage({data}));",{eval:true});this.worker.on('message',data=>this.onmessage?.({data}));this.worker.on('error',e=>this.onerror?.(e))}postMessage(data){this.worker.postMessage(data)}terminate(){terminated++;this.worker.terminate()}}
const context=vm.createContext({Worker:WorkerBridge,Blob:class{constructor(parts){this.text=parts.join('')}},URL:{createObjectURL:blob=>blob.text,revokeObjectURL(){}},setTimeout,clearTimeout});
vm.runInContext(await readFile(new URL('../shared/quantity-editor.js',import.meta.url),'utf8'),context);
const api=context.ChipQuantity;
assert.equal(api.calculate('2 + 3 * 4'),14);assert.equal(api.calculate('2 ** 3 ** 2'),512);assert.equal(api.calculate('Math.max(value, 7) + Math.sqrt(9)',5),10);assert.equal(api.calculate('Math.sin(Math.PI/2)'),1);
for(const expression of ['globalThis','fetch(1)','while(true){}','Math.constructor(1)','1/0','value=2','Math.random()'])assert.throws(()=>api.calculate(expression));
assert.equal(await api.run('value * 2 + Math.sqrt(16)',5),14);await assert.rejects(api.run('Math.constructor(1)',1));assert.equal(terminated,2);
export const results=['restricted JS arithmetic grammar accepts Math operations and rejects ambient access','expressions run in an independent worker and workers terminate after success or error'];
