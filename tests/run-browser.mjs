import {spawnSync} from 'node:child_process';
import {readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const root = new URL('../', import.meta.url);
const directory = new URL('./browser/', import.meta.url);
const suites = readdirSync(directory).filter(name => name.endsWith('.browser.mjs')).sort();
const failed = [];
for (const name of suites) {
 console.log('\n' + name);
 const result = spawnSync(process.execPath, [fileURLToPath(new URL(name, directory))], {
  cwd: fileURLToPath(root), stdio: 'inherit', windowsHide: true
 });
 if (result.error) console.error(result.error.message);
 if (result.status !== 0) failed.push(name);
}
console.log('\n' + (suites.length - failed.length) + '/' + suites.length + ' browser suites passed');
if (failed.length) {
 console.error('Failed suites\n' + failed.join('\n'));
 process.exitCode = 1;
}
