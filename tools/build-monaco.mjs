// Pinned ESM build. The normal offline build consumes the committed output;
// run this only when updating Monaco itself.
import {build} from 'esbuild';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url),out=new URL('vendor/monaco/',root);
await mkdir(out,{recursive:true});
const options={absWorkingDir:fileURLToPath(root),bundle:true,minify:true,platform:'browser',target:'es2022',format:'iife',supported:{'template-literal':false},write:false,legalComments:'eof',loader:{'.ttf':'dataurl'},define:{'import.meta.url':JSON.stringify('file:///monaco/editor.js')}};
const runtime=await build({...options,stdin:{contents:"import 'monaco-editor/internal/common/workers.js';import 'monaco-editor/features/find/register.js';export * as monaco from 'monaco-editor/editor/editor.api.js';export * as json from 'monaco-editor/language/json/monaco.contribution.js';",resolveDir:fileURLToPath(root),sourcefile:'chipchip-monaco-entry.js'},globalName:'ChipMonacoRuntime',outfile:fileURLToPath(new URL('editor.js',out))});
let styles='';for(const file of runtime.outputFiles){const name=file.path.endsWith('.css')?'editor.css':'editor.js';await writeFile(new URL(name,out),file.contents);if(name==='editor.css')styles=file.text}
const workers={styles};
for(const [name,entry]of [['editor','node_modules/monaco-editor/esm/vs/editor/editor.worker.js'],['json','node_modules/monaco-editor/esm/vs/language/json/json.worker.js']]){
 const result=await build({...options,entryPoints:[entry],outfile:name+'.worker.js'});workers[name]=result.outputFiles.find(file=>file.path.endsWith('.js')).text;
}
await writeFile(new URL('workers.js',out),'/* Monaco workers and styles: embedded for file:// and offline use. */\nglobalThis.ChipMonacoAssets='+JSON.stringify(workers)+';\n');
for(const name of ['LICENSE','ThirdPartyNotices.txt']){const source=name==='LICENSE'?'LICENSE':name;await writeFile(new URL(name==='LICENSE'?'LICENSE.txt':name,out),await readFile(new URL('node_modules/monaco-editor/'+source,root)))}
const pkg=JSON.parse(await readFile(new URL('node_modules/monaco-editor/package.json',root),'utf8'));
await writeFile(new URL('manifest.json',out),JSON.stringify({name:pkg.name,version:pkg.version,source:pkg.homepage,license:pkg.license,features:['editor','json'],offline:true},null,2)+'\n');
console.log('Bundled Monaco '+pkg.version+' for offline editor and JSON workers');
