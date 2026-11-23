/* ChipDraw rectangle transactions. Points use the public drawing model's world coordinates. */
(function(root) {
'use strict';
function create({append}) {
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
    function place(point) {
        if (!draft) return false;
        const data = preview(point);
        if (!data) {
            if (draft.points.length < root.ChipDrawingModel.rectConstruction[draft.method] - 1 &&
                draft.points.some(p => p[0] !== point[0] || p[1] !== point[1])) draft.points.push(point.slice());
            return false;
        }
        append(data);
        draft = null;
        return true;
    }
    return {begin, preview, place, cancel: () => { draft = null; },
        draft: () => draft, resume: value => { draft = value; }};
}
root.ChipRectangleEditor = {create};
})(globalThis);
