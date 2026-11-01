import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
export async function build(){
 const base=new URL('../',import.meta.url),core=await readFile(new URL('shared/viewport-core.js',base),'utf8');
 const version=createHash('sha256').update(core).digest('hex').slice(0,12),outputs=[];
 for(const [name,source]of [['ChipChip','src/chipchip/index.html'],['ChipDraw','src/chipdraw/index.html']]){
  const template=await readFile(new URL(source,base),'utf8'),marker='<script src="../../shared/viewport-core.js"></script>';
  if(template.split(marker).length!==2)throw Error(source+': expected one shared core reference');
  const html=template.replace(marker,()=>'<script>\n'+core+'\n</script>').replace('<!doctype html>','<!doctype html>\n<!-- GENERATED from '+source+'; shared viewport '+version+'. Edit src/ and shared/, then rebuild. -->');
  const output=new URL(name+'.html',base);await writeFile(output,html,'utf8');outputs.push({name,path:fileURLToPath(output),coreVersion:version});
 }
 return outputs;
}
export const outputs=await build();
