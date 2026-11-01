import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
export async function build(){
 const base=new URL('../',import.meta.url);
 const files=['shared/viewport-core.js','shared/bubbles.js','shared/workspace-ui.js','shared/workspace-ui.css'];
 const sources=await Promise.all(files.map(file=>readFile(new URL(file,base),'utf8')));
 const version=createHash('sha256').update(sources.join('\n')).digest('hex').slice(0,12),outputs=[];
 for(const [name,source]of [['ChipChip','src/chipchip/index.html'],['ChipDraw','src/chipdraw/index.html']]){
  let html=await readFile(new URL(source,base),'utf8');
  for(let i=0;i<files.length;i++){
   const file=files[i],css=file.endsWith('.css'),marker=css?'<link rel="stylesheet" href="../../'+file+'">':'<script src="../../'+file+'"></script>';
   if(html.split(marker).length!==2)throw Error(source+': expected exactly one reference to '+file);
   html=html.replace(marker,()=>css?'<style>\n'+sources[i]+'\n</style>':'<script>\n'+sources[i]+'\n</script>');
  }
  html=html.replace('<!doctype html>','<!doctype html>\n<!-- GENERATED from '+source+'; shared workspace '+version+'. Edit src/ and shared/, then rebuild. -->');
  const output=new URL(name+'.html',base);await writeFile(output,html,'utf8');outputs.push({name,path:fileURLToPath(output),sharedVersion:version});
 }
 return outputs;
}
export const outputs=await build();
