import assert from 'node:assert/strict';
import '../shared/ui-definitions.js';
import '../src/chipdraw/ui-definitions.js';
const analysisButtons=globalThis.ChipUIButtonModel.create({
    buttons:{measure:{action:'measure',alt:'name',hint:'instructions',svg:'<svg/>',visual:{id:'sample'}}},
    packs:{fr:{name:'Mesurer',instructions:'Choisir un échantillon'}},
    locale:()=> 'fr'
});
assert.equal(analysisButtons.button('measure','fr').hint,'Choisir un échantillon');
assert.throws(()=>analysisButtons.button('rect.diagonal','fr'),/Unknown UI button/);
const ui = globalThis.ChipUIDefinitions;
for (const device of ['pen','touch']) {
    const input = ui.createButtonGesture();
    assert.equal(input('hover',device),device==='pen'?'hover':null);
    input('down',device,10,10);
    assert.equal(input('move',device,12,10),null);
    assert.equal(input('hold',device),'secondary');
    assert.equal(input('move',device,40,10),null);
    assert.equal(input('up',device),null);
    input('down',device,10,10);
    assert.equal(input('move',device,40,10),'drag');
    assert.equal(input('hold',device),null);
    assert.equal(input('up',device),null);
    input('down',device,10,10);
    assert.equal(input('up',device),'primary');
}
assert.equal(ui.interaction('keyboard','move'),null);
assert.equal(ui.interaction('keyboard','menu'),'secondary');
assert.equal(ui.interaction('mouse','secondary'),'secondary');
for (const language of ['en-GB','zh-HK']) {
    for (const button of ui.rectangleButtons(language)) {
        assert.ok(button.alt && button.hint.length && button.svg && button.visual);
        assert.equal(button.action,button.visual.id);
    }
}
