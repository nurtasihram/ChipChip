// Put the floating panes away before replaying gestures at drawing coordinates.
export async function clearDrawingCanvas(page) {
 await page.evaluate(() => {
  ChipUI.panel.setOpen(false);
  objectPanel.setCollapsed(true, {focus:false});
  $('layersPanel').chipFloatingPanel.setCollapsed(true, {focus:false});
 });
}
