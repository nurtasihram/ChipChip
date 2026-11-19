// QJSEngine owns the PinView interaction state. Geometry is transferred once per file.
function openPinView(doc) {
    const samples = doc.pad_samples;
    if (!samples || !doc.pinouts) throw Error("需要包含 pad_samples 和 pinouts 的 PinView 文件");
    const keys = Object.keys(samples);
    const units = doc.measure_units || "mm";
    const length = typeof units === "string" ? units : units.length || "mm";
    if (!["mm", "mil"].includes(length)) throw Error("不支援的長度單位");
    const factor = length === "mil" ? .0254 : 1;
    const byId = new Map();
    const state = doc.view_state || {};
    const modes = new Map(Object.entries((state.groups || {}).modes || {}));
    const colors = (state.groups || {}).colors || {};
    for (const [id, record] of Object.entries(doc.pinouts)) {
        const key = record.pad_type === undefined ?
            (keys.length === 1 ? keys[0] : record.type_name) : record.pad_type;
        if (!Object.prototype.hasOwnProperty.call(samples, key)) throw Error("無效焊盤 " + id);
        const pad = samples[key], pos = record.position;
        let x, y;
        if (Array.isArray(pos) && pos.length === 2 && (doc.measure_types || "orth") === "orth") [x, y] = pos;
        else if (pos && pos.type === "orth") ({x, y} = pos);
        else if (pos && pos.type === "polar") {
            const unit = units.angle || "deg";
            if (!["deg", "rad"].includes(unit)) throw Error("不支援的角度單位");
            const a = pos.angle * (unit === "deg" ? Math.PI / 180 : 1);
            x = pos.radius * Math.cos(a); y = pos.radius * Math.sin(a);
        }
        if (!Number.isFinite(x) || !Number.isFinite(y)) throw Error("無效座標 " + id);
        const f = record.func_name;
        let names = [];
        if (typeof f === "string") names = [f];
        else if (Array.isArray(f)) names = f;
        else if (f) {
            names = [f.default].concat((f.alternatives || []).map(v =>
                typeof v === "string" ? v : v.name + (v.mode ? " (" + v.mode + ")" : "")));
        }
        names = Array.from(new Set(names.filter(v => typeof v === "string" && v.trim())));
        const para = record.para || {}, group = para.group || "Other";
        const w = pad.shape === "circle" ? 2 * pad.radius : pad.width;
        const h = pad.shape === "circle" ? w : pad.height;
        if (!(w > 0 && h > 0) || !["circle","rectangle"].includes(pad.shape))
            throw Error("不支援的焊盤 " + id);
        byId.set(id, {id, name:names[0] || "NC", names, group, x:x*factor, y:y*factor,
            w:w*factor, h:h*factor, circle:pad.shape === "circle", rotation:para.pad_rotation_deg || 0,
            color:colors[group] || "#60a5fa", hidden:modes.get(group) === "hidden"});
    }
    if (!byId.size || (doc.pins !== undefined && doc.pins !== byId.size)) throw Error("管腳數量不符");
    let selected = byId.has(state.selectedBall) ? state.selectedBall : null;
    return {
        geometry: () => Array.from(byId.values()),
        current: () => byId.get(selected) || null,
        select(id, reveal) {
            const p = byId.get(id);
            if (!p) throw Error("未知管腳 " + id);
            if (reveal) modes.set(p.group, "default");
            selected = id;
            return p;
        },
        search(query, ball, name, exact, ignoreCase, regex) {
            query = query.trim();
            if (!query) return [];
            if (!ball && !name) throw Error("至少勾選一種搜尋欄位");
            const re = regex ? new RegExp(exact ? "^(?:" + query + ")$" : query, ignoreCase ? "i" : "") : null;
            const normalize = v => ignoreCase ? v.toLowerCase() : v;
            const needle = normalize(query);
            const match = v => re ? re.test(v) : exact ? normalize(v) === needle : normalize(v).includes(needle);
            return Array.from(byId.values()).filter(p => (ball && match(p.id)) || (name && match(p.name)))
                .map(p => [p.id, p.name]);
        },
        selectionState: () => ({selectedBall:selected, modes:Array.from(modes.entries())})
    };
}
