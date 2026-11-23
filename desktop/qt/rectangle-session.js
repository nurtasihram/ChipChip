/* Native rectangle document and active construction. */
function nativeRectangleSession() {
    const items = [], ids = ChipDrawingModel.createIds();
    const gestures = new Map();
    const editor = ChipRectangleEditor.create({
        append(geometry) {
            const item = {id:ids.next(), name:'矩形', ...geometry,
                stroke:{type:'solid',color:'#69b8ff',width:2,offset:0,linecap:'round',linejoin:'round'},
                fill:{type:'none'}};
            items.push(item);
        }
    });
    function place(point) {
        if (!editor.place(point)) return null;
        const item = items[items.length - 1];
        return {geometry:ChipDrawingModel.solve(item)};
    }
    return {
        holdMs: () => ChipUIDefinitions.holdMs,
        buttonGesture(key,type,device,x,y) {
            if(!gestures.has(key))gestures.set(key,ChipUIDefinitions.createButtonGesture());
            return gestures.get(key)(type,device,x,y);
        },
        methods: language => ChipUIDefinitions.rectangleButtons(language),
        button: ChipUIDefinitions.button, text: ChipUIDefinitions.text,
        helpFrame(id,language,progress) {
            const workspace = id.includes('.');
            const nodes=[];
            const scene={svg:{dataset:{}},node(tag,attrs){const n={tag,attrs};nodes.push(n);return n;},
                set(n,attrs){Object.assign(n.attrs,attrs);},input(){},
                lerp:(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t}),bind:paint=>paint(progress)};
            if (workspace) ChipUIDefinitions.workspaceButtonHelp(id,scene);
            else {
                const {alt,hint}=ChipUIDefinitions.button('rect.'+id,language);
                ChipRectangleHelp.drawHelp(id,alt,hint,ChipUIDefinitions.text('done',language),scene);
            }
            const escape=value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
            return '<svg xmlns="http://www.w3.org/2000/svg" width="260" height="178" viewBox="0 0 260 178">'+nodes.map(n=>
                '<'+n.tag+' '+Object.keys(n.attrs).map(key=>key+'="'+escape(n.attrs[key])+'"').join(' ')+'>'+escape(n.textContent||'')+'</'+n.tag+'>').join('')+'</svg>';
        },
        confirm: () => editor.draft() ? place(editor.draft().cursor) : null,
        begin: editor.begin, cancel: editor.cancel,
        place,
        active: () => !!editor.draft(),
        preview(point) {const data=editor.preview(point);return data && ChipDrawingModel.solve(data);},
        construction(point) {
            const data=editor.preview(point),draft=editor.draft();
            if(!draft)return null;
            const scene=p=>({x:p[0],y:-p[1]});
            const anchors=draft.points.map(scene);
            return {outline:data&&ChipDrawingModel.solve(data),anchors,
                lines:ChipRectangleHelp.rectGuides(draft.method,anchors,scene(point),data),
                constraint:ChipRectangleHelp.rectConstraint(draft.method,anchors),
                candidate:data?.reference==='right-triangle'?scene(data.points[2]):null};
        },
        document() {
            return {units_system:{...ChipDrawingModel.defaultUnits},items:items.slice()};
        }
    };
}
