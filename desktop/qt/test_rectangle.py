"""Replay one input trace against the offline HTML and native Qt canvas."""
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

from PySide6.QtCore import QEvent, QEventLoop, QPoint, QPointF, Qt, QTimer, QUrl
from PySide6.QtGui import QMouseEvent
from PySide6.QtTest import QTest
from PySide6.QtWebEngineWidgets import QWebEngineView
from PySide6.QtWidgets import QApplication, QMenuBar

from chipdraw import Window

ROOT = Path(__file__).resolve().parents[2]
TRACE = [('click', (0,0)), ('move',(40,30)), ('cancel',None),
         ('click',(0,0)), ('move',(40,30)), ('click',(40,30)),
         ('undo',None), ('redo',None), ('undo',None),
         ('drag',((-30,10),(10,-20))), ('redo',None)]


def wait_for(start):
    loop = QEventLoop()
    result = []
    def done(value):
        result.append(value)
        loop.quit()
    timer = QTimer()
    timer.setSingleShot(True)
    timer.timeout.connect(loop.quit)
    timer.start(30000)
    start(done)
    if not result:
        loop.exec()
    assert result, 'Qt operation timed out'
    return result[0]


def replay(widget, pixel, command, state, hover=None):
    states = []
    for action, point in TRACE:
        if action == 'drag':
            start, end = map(pixel, point)
            QTest.mousePress(widget, Qt.MouseButton.LeftButton, pos=start)
            QTest.mouseMove(widget, end)
            QTest.mouseRelease(widget, Qt.MouseButton.LeftButton, pos=end)
        elif action == 'click':
            QTest.mouseClick(widget, Qt.MouseButton.LeftButton, pos=pixel(point))
        elif action == 'move':
            target = pixel(point)
            event = QMouseEvent(QEvent.Type.MouseMove, QPointF(target), QPointF(widget.mapToGlobal(target)),
                                Qt.MouseButton.NoButton, Qt.MouseButton.NoButton, Qt.KeyboardModifier.NoModifier)
            if hover:
                hover(target)
            else:
                QApplication.sendEvent(widget, event)
        else:
            command(action)
        QTest.qWait(100)
        states.append(state())
    return states


def browser_states():
    web = QWebEngineView()
    web.resize(960,680)
    web.show()
    def load(done):
        web.loadFinished.connect(done)
        web.load(QUrl.fromLocalFile(str(ROOT/'ChipDraw.html')))
    assert wait_for(load)
    def js(code):
        raw = wait_for(lambda done: web.page().runJavaScript('JSON.stringify('+code+')', done))
        assert raw, code
        return json.loads(raw)
    for width, height in [(390, 700), (960, 680)]:
        web.resize(width, height)
        QTest.qWait(100)
        assert js("""(() => {
            const header=document.querySelector('header'),title=document.getElementById('projectTitle');
            const box=header.getBoundingClientRect(),label=title.getBoundingClientRect(),style=getComputedStyle(header);
            const surface=svg.getBoundingClientRect();
            const hit=document.elementFromPoint(box.right+24,2);
            const clear=surface.top<=1 && surface.right>=innerWidth-1 && svg.contains(hit);
            const historyAbsent=!document.querySelector('#undo,#redo');
            const noHeaderButtons=[...header.querySelectorAll('button')].every(b=>!b.getClientRects().length);
            title.click();const menuOpen=!document.getElementById('fileMenu').hidden;title.click();
            return clear && historyAbsent && noHeaderButtons && menuOpen &&
                title.textContent==='ChipDraw' && box.width<=label.width+2 && box.left===0 && box.top===0 &&
                style.backgroundColor!=='rgba(0, 0, 0, 0)' && parseFloat(style.borderBottomRightRadius)>0 &&
                [style.borderTopLeftRadius,style.borderTopRightRadius,style.borderBottomLeftRadius].every(v=>parseFloat(v)===0);
        })()"""), 'ChipDraw title or canvas hit area did not match the compact layout'
    edges = js("""(() => {
        const el=document.getElementById('panel'), board=svg.getBoundingClientRect();
        const open=el.classList.contains('show'), css=el.style.cssText;
        el.classList.add('show');
        objectPanel.place(-10000,-10000);
        const a=el.getBoundingClientRect();
        objectPanel.place(10000,10000);
        const b=el.getBoundingClientRect();
        el.classList.toggle('show',open);el.style.cssText=css;
        return [a.left-board.left,a.top-board.top,board.right-b.right,board.bottom-b.bottom];
    })()""")
    assert min(edges) >= -1, edges
    js("""(() => {setTool('rect');
        for(const id of ['advanced','layersPanel','panel']){
            document.getElementById(id).chipFloatingPanel?.setCollapsed(true,{focus:false});
        }
        scale=1;viewAngle=0;viewMirrored=false;
        const r=svg.getBoundingClientRect();
        for(let y=r.top+100;y<r.bottom-70;y+=35){
          for(let x=r.left+80;x<r.right-80;x+=35){
            if([[0,0],[40,-30],[-30,-10],[10,20]].every(([dx,dy])=>svg.contains(document.elementFromPoint(x+dx,y+dy)))){
              ox=x-r.left-r.width/2;oy=y-r.top-r.height/2;view();return true;
            }
          }
        }
        throw Error('Test needs an unobstructed part of the drawing surface')})()""")
    def web_pixel(point):
        x,y = point
        a,b = js(f"(() => {{const r=svg.getBoundingClientRect(),p=drawCamera().toScreen({{x:{x},y:{y}}});return [r.left+p.x,r.top+p.y]}})()")
        return QPoint(round(a),round(b))
    def web_command(action):
        if action == 'cancel':
            QTest.keyClick(web.focusProxy(), Qt.Key.Key_Escape)
        else:
            js(f"(() => {{return rectangleEditor().{action}()}})()")
    def web_state():
        return js("({preview:(()=>{const n=preview.querySelector('[data-rect-preview]');if(!n)return null;const b=n.getBBox();return [b.x,b.y,b.width,b.height]})(),document:ChipDrawingJson.encode([...layers.active().children])})")
    def hover(target):
        js(f"svg.dispatchEvent(new PointerEvent('pointermove',{{pointerId:1,pointerType:'mouse',isPrimary:true,bubbles:true,clientX:{target.x()},clientY:{target.y()}}}))")
    browser = replay(web.focusProxy(), web_pixel, web_command, web_state, hover)
    web.close()
    return browser


def verify():
    app = QApplication.instance() or QApplication([])
    if sys.platform.startswith('linux') and os.environ.get('WAYLAND_DISPLAY') and app.platformName() == 'xcb':
        # WSLg runs Chromium on Wayland and native detachable windows on XWayland.
        with tempfile.TemporaryDirectory() as folder:
            output = Path(folder)/'browser.json'
            subprocess.run([sys.executable,__file__,'--browser',str(output)], check=True,
                           env={**os.environ,'QT_QPA_PLATFORM':'wayland'})
            browser = json.loads(output.read_text(encoding='utf8'))
    else:
        browser = browser_states()
    verify_native(browser)


def verify_native(browser):
    window = Window()
    window.show()
    QTest.qWait(150)
    canvas = window.canvas
    assert not window.findChildren(QMenuBar) and window.windowFlags() & Qt.WindowType.FramelessWindowHint
    window.resize(720, 510)
    QTest.qWait(50)
    assert not canvas.verticalScrollBar().isVisible() and not canvas.horizontalScrollBar().isVisible()
    assert not window.mask().contains(QPoint(0,0)) and window.mask().contains(window.rect().center())
    title = window.title_chip
    assert title.pos() == QPoint(0,0)
    assert canvas.geometry().top() <= 1
    assert title.width() < window.width()/2
    assert window.close_button.geometry().right() < window.handle.geometry().left()
    assert window.handle.contentsMargins().right() >= 32
    top = title.geometry().center().y()
    assert window.childAt(title.geometry().right()+20, top) is canvas.viewport()
    canvas.customContextMenuRequested.emit(QPoint(18, 45))
    panel = window.methods
    assert panel.isVisible() and not panel.mask().isEmpty() and not panel.mask().contains(QPoint(0,0))
    for key, button in window.method_buttons.items():
        button.click()
        assert canvas.method == key and button.isChecked()
    window.method_buttons['diagonal'].click()
    for widget in (window, panel):
        for grip in widget.resize_grips:
            center = grip.rect().center()
            assert widget.childAt(grip.mapTo(widget,center)) is grip
    # The border owns its hover cursor; the tool below keeps its own cursor.
    panel.setCursor(Qt.CursorShape.CrossCursor)
    for grip, edges in panel.resize_grips.items():
        if edges in (Qt.Edge.LeftEdge,Qt.Edge.RightEdge,Qt.Edge.TopEdge,Qt.Edge.BottomEdge):
            QTest.mouseMove(grip,grip.rect().center())
            QTest.mousePress(grip,Qt.MouseButton.LeftButton,pos=grip.rect().center())
            QApplication.sendEvent(panel,QEvent(QEvent.Type.WindowDeactivate))
            assert panel.gesture is None and panel.mouseGrabber() is not panel
            QTest.mouseRelease(grip,Qt.MouseButton.LeftButton,pos=grip.rect().center())
            assert panel.handle.cursor().shape() == Qt.CursorShape.CrossCursor
            continue
        before = panel.geometry()
        dx = -9 if edges & Qt.Edge.LeftEdge else 9
        dy = -7 if edges & Qt.Edge.TopEdge else 7
        start = grip.rect().center()
        end = panel.mapFromGlobal(grip.mapToGlobal(start)) + QPoint(dx,dy)
        QTest.mousePress(grip, Qt.MouseButton.LeftButton, pos=start)
        QTest.mouseMove(panel,end)
        QTest.mouseRelease(panel,Qt.MouseButton.LeftButton,pos=end)
        assert panel.handle.cursor().shape() == Qt.CursorShape.CrossCursor
        after = panel.geometry()
        assert after.width() == before.width()+9 and after.height() == before.height()+7
        assert (after.right()==before.right()) if dx<0 else (after.left()==before.left())
        assert (after.bottom()==before.bottom()) if dy<0 else (after.top()==before.top())
    assert panel.isWindow() and panel.windowFlags() & Qt.WindowType.FramelessWindowHint
    board = panel.board_rect()
    inside = panel.pos()
    def drag_panel(to):
        start = panel.handle.rect().center()
        destination = to - panel.pos() + panel.handle.mapTo(panel,start)
        QTest.mousePress(panel.handle, Qt.MouseButton.LeftButton, pos=start)
        QTest.mouseMove(panel,destination)
        QTest.mouseRelease(panel,Qt.MouseButton.LeftButton,pos=panel.mapFromGlobal(to)+start)
        QApplication.processEvents()
    drag_panel(QPoint(board.right()-10,board.top()+10))
    assert panel.board_offset is None
    detached = panel.pos()
    window.move(window.pos()+QPoint(20,10))
    QApplication.processEvents()
    QTest.qWait(120)
    assert panel.pos() == detached
    drag_panel(panel.board_rect().topLeft()+QPoint(14,14))
    assert panel.board_offset is not None
    attached = panel.pos()
    window.move(window.pos()+QPoint(10,8))
    QApplication.processEvents()
    for _ in range(40):
        QTest.qWait(50)
        if panel.pos() != attached:
            break
    assert panel.pos() != attached, (panel.pos(), attached, panel.board_rect(), panel.board_offset, window.pos())
    panel.hide()
    assert not panel.isVisible()
    window.pan.trigger()
    assert canvas.panning
    window.pan.trigger()
    assert not canvas.panning
    def native_state():
        bounds = None
        if canvas.ghost is not None:
            box = canvas.ghost.polygon().boundingRect()
            bounds = [box.x(), box.y(), box.width(), box.height()]
        return {'preview':bounds,'document':canvas.session.call('document')}
    native = replay(canvas.viewport(), lambda p: canvas.mapFromScene(QPointF(p[0],-p[1])),
                    canvas.command, native_state)
    expected = [0,0,0,0,0,1,0,1,0,1,1]
    for states in [browser,native]:
        assert [len(s['document']['items']) for s in states] == expected, states
        assert [s['preview'] for s in states] == [None,[0,-30,40,30],None,None,[0,-30,40,30],None,None,None,None,None,None], states
        assert states[5]['document'] == states[7]['document']
        assert states[9]['document'] == states[10]['document']
        identities = {}
        for s in states:
            for item in s['document']['items']:
                uid = item.pop('id')
                assert uid
                item['id'] = identities.setdefault(uid,len(identities))
    for i,(left,right) in enumerate(zip(browser,native)):
        assert left == right, (TRACE[i],left,right)
    print('PASS HTML board bounds, Qt border resize, detachable panel, toolbar commands and 11 matching drawing steps')
    window.showFullScreen()
    QTest.qWait(80)
    assert window.mask().isEmpty()
    window.showNormal()
    QTest.qWait(80)
    assert not window.mask().isEmpty()
    window.close()


if __name__ == '__main__':
    if len(sys.argv) == 3 and sys.argv[1] == '--browser':
        app = QApplication([])
        Path(sys.argv[2]).write_text(json.dumps(browser_states()),encoding='utf8')
    elif len(sys.argv) == 3 and sys.argv[1] == '--native-reference':
        app = QApplication([])
        verify_native(json.loads(Path(sys.argv[2]).read_text(encoding='utf8')))
    else:
        verify()
