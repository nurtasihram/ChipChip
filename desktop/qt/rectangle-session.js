/* Native document adapter. History snapshots reference immutable sequences of public objects. */
function nativeRectangleSession() {
    const past = [], future = [], ids = ChipDrawingModel.createIds();
    const gestures = new Map();
    let head = null;
    const editor = ChipRectangleEditor.create({
        past: () => past, future: () => future,
        capture: () => head, restore: snapshot => { head = snapshot; },
        append(geometry) {
            const item = {id:ids.next(), name:'矩形', ...geometry,
                stroke:{type:'solid',color:'#69b8ff',width:2,offset:0,linecap:'round',linejoin:'round'},
                fill:{type:'none'}};
            head = {item, previous:head};
        }
    });
    function update(command, point) {
        const before = head;
        editor[command](point);
        if (before === head) return null;
        if (before && before.previous === head) return {remove:before.item.id};
        return {add:head.item.id, geometry:ChipDrawingModel.solve(head.item)};
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
            return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 250 175">'+nodes.map(n=>
                '<'+n.tag+' '+Object.keys(n.attrs).map(key=>key+'="'+escape(n.attrs[key])+'"').join(' ')+'>'+escape(n.textContent||'')+'</'+n.tag+'>').join('')+'</svg>';
        },
        confirm: () => editor.draft() ? update('place',editor.draft().cursor) : null,
        begin: editor.begin, cancel: editor.cancel,
        place: point => update('place', point), undo: () => update('undo'), redo: () => update('redo'),
        active: () => !!editor.draft(),
        preview(point) {const data=editor.preview(point);return data && ChipDrawingModel.solve(data);},
        document() {
            const items = [];
            for (let node=head;node;node=node.previous) items.push(node.item);
            return {units_system:{...ChipDrawingModel.defaultUnits},items:items.reverse()};
        }
    };
}
