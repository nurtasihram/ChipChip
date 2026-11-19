/* ChipDraw rectangle transactions. Points use the public drawing model's world coordinates. */
(function(root) {
'use strict';
function create({capture, restore, append, past, future}) {
    let draft = null;
    function begin(method, point, rotation = 0) {
        if (!Object.hasOwn(root.ChipDrawingModel.rectConstruction, method)) throw Error('未知矩形繪製方式');
        draft = {method, points:[point.slice()], cursor:point.slice(), rotation};
    }
    function preview(point) {
        if (!draft) return null;
        if (point) draft.cursor = point.slice();
        const data = root.ChipDrawingModel.rectangleDefinition(draft.method, draft.points, draft.cursor, draft.rotation);
        if (!data) return null;
        try { root.ChipDrawingModel.solve(data); } catch { return null; }
        return data;
    }
    function record(before) {
        const stack = past();
        stack.push(before);
        if (stack.length > 60) stack.shift();
        future().length = 0;
    }
    function place(point) {
        if (!draft) return false;
        const data = preview(point);
        if (!data) {
            if (draft.points.length < root.ChipDrawingModel.rectConstruction[draft.method] - 1 &&
                draft.points.some(p => p[0] !== point[0] || p[1] !== point[1])) draft.points.push(point.slice());
            return false;
        }
        const before = capture();
        append(data);
        record(before);
        draft = null;
        return true;
    }
    function step(from, to) {
        draft = null;
        if (!from.length) return false;
        const before = capture();
        restore(from[from.length - 1]);
        from.pop();
        to.push(before);
        return true;
    }
    return {begin, preview, place, record, cancel: () => { draft = null; },
        draft: () => draft, resume: value => { draft = value; },
        undo: () => step(past(), future()), redo: () => step(future(), past())};
}
root.ChipRectangleEditor = {create};
})(globalThis);
