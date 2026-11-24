// Application integration double. Real Monaco is verified by browser tests.
export function createMonacoFixture(){
 const editor={
  defineTheme(){},
  createModel(initial,language,uri){
   let value=initial;
   return {uri,getValue:()=>value,setValue:next=>{value=next},getLanguageId:()=>language,dispose(){}};
  },
  create(surface,{model}){
   return {getModel:()=>model,layout(){},focus(){surface.focus()},dispose(){}};
  }
 };
 return {runtime:{monaco:{Uri:{parse:value=>({toString:()=>value})},editor},json:{jsonDefaults:{setDiagnosticsOptions(){}}}},assets:{styles:'',editor:'',json:''}};
}
