"""Native ChipChip canvas and local file adapter for the JS PinView controller."""
import json
from pathlib import Path

from PySide6.QtCore import QIODevice, QPointF, QRectF, QSaveFile, Qt
from PySide6.QtGui import QBrush, QColor, QKeySequence, QPainter, QPen
from PySide6.QtQml import QJSEngine, QJSValue
from PySide6.QtWidgets import (
    QApplication, QCheckBox, QFileDialog, QGraphicsScene, QGraphicsView,
    QLabel, QLineEdit, QListWidget, QListWidgetItem, QMainWindow, QMessageBox,
    QFrame, QVBoxLayout, QWidget,
)


class Model:
    def __init__(self, path):
        self.source = json.loads(path.read_text(encoding='utf-8-sig'))
        self.engine = QJSEngine()
        script = Path(__file__).with_name('pinview.js')
        self.check(self.engine.evaluate(script.read_text(encoding='utf-8-sig'), str(script)))
        factory = self.engine.globalObject().property('openPinView')
        # Use JSON.parse to retain JavaScript object/array types across Qt bindings.
        parser = self.engine.globalObject().property('JSON').property('parse')
        doc = self.check(parser.call([QJSValue(json.dumps(self.source, ensure_ascii=False, allow_nan=False))]))
        self.controller = self.check(factory.call([doc]))

    @staticmethod
    def check(result):
        if result.isError():
            raise ValueError(result.toString())
        return result

    def call(self, method, *args):
        func = self.controller.property(method)
        return self.check(func.callWithInstance(self.controller, [QJSValue(arg) for arg in args])).toVariant()

    def save(self, path):
        state = self.call('selectionState')
        # Keep original fields, units, pad references and unknown metadata intact.
        archive = dict(self.source)
        view = dict(archive.get('view_state') or {})
        view['selectedBall'] = state['selectedBall']
        groups = dict(view.get('groups') or {})
        groups['modes'] = dict(state['modes'])
        view['groups'] = groups
        archive['view_state'] = view
        payload = json.dumps(archive, ensure_ascii=False, indent=2, allow_nan=False).encode('utf-8')
        target = QSaveFile(str(path))
        if not target.open(QIODevice.OpenModeFlag.WriteOnly):
            raise OSError(target.errorString())
        if target.write(payload) != len(payload) or not target.commit():
            raise OSError(target.errorString())


class Canvas(QGraphicsView):
    def __init__(self, select):
        super().__init__()
        self.select_pin = select
        self.setRenderHint(QPainter.RenderHint.Antialiasing)
        self.setBackgroundBrush(QColor('#101a2b'))
        self.setDragMode(QGraphicsView.DragMode.ScrollHandDrag)
        self.setTransformationAnchor(QGraphicsView.ViewportAnchor.AnchorUnderMouse)
        self.start = None

    def mousePressEvent(self, event):
        self.start = event.position() if event.button() == Qt.MouseButton.LeftButton else None
        super().mousePressEvent(event)

    def mouseReleaseEvent(self, event):
        super().mouseReleaseEvent(event)
        if self.start is not None and (event.position() - self.start).manhattanLength() < 9:
            pos = event.position().toPoint()
            radius = max(15, self.transform().m11() * .34)
            rect = QRectF(event.position() - QPointF(radius, radius), event.position() + QPointF(radius, radius))
            candidates = self.items(rect.toAlignedRect())
            if candidates:
                def distance(item):
                    delta = self.mapFromScene(item.pos()) - pos
                    return delta.x() ** 2 + delta.y() ** 2
                item = min(candidates, key=distance)
                delta = self.mapFromScene(item.pos()) - pos
                if delta.x() ** 2 + delta.y() ** 2 < radius ** 2:
                    self.select_pin(item.data(0), False)
        self.start = None

    def wheelEvent(self, event):
        change = 1.2 ** (event.angleDelta().y() / 120)
        if 1 <= self.transform().m11() * change <= 1000:
            self.scale(change, change)
        event.accept()


from pane import Pane, configure_native_display

configure_native_display()


class Window(Pane):
    def __init__(self):
        super().__init__('ChipChip')
        self.resize(1100, 740)
        self.model = self.path = self.selected = None
        self.canvas = Canvas(self.select)
        self.query = QLineEdit()
        self.query.setPlaceholderText('輸入管腳編號或名稱，按 Enter 搜尋')
        self.query.returnPressed.connect(self.search)
        self.body.addWidget(self.canvas)
        self.canvas.setFrameShape(QFrame.Shape.NoFrame)
        self.canvas.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        self.canvas.setVerticalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        self.search_pane = Pane('搜尋與管腳資訊', self.canvas.viewport())
        self.search_pane.setMinimumSize(225, 240)
        self.search_pane.resize(280, 390)
        panel = QWidget(self.search_pane)
        self.search_pane.body.addWidget(panel)
        layout = QVBoxLayout(panel)
        layout.addWidget(self.query)
        self.options = []
        for label, on in [('編號', True), ('名稱', True), ('完全匹配', False),
                          ('忽略大小寫', True), ('正規表示式', False)]:
            box = QCheckBox(label)
            box.setChecked(on)
            layout.addWidget(box)
            self.options.append(box)
        self.results = QListWidget()
        self.results.itemActivated.connect(self.locate_result)
        self.results.itemClicked.connect(self.locate_result)
        layout.addWidget(self.results)
        self.info = QLabel()
        self.info.setTextFormat(Qt.TextFormat.PlainText)
        self.info.setWordWrap(True)
        layout.addWidget(self.info)
        self.status = QLabel()
        self.status.setWordWrap(True)
        layout.addWidget(self.status)
        self.button('開啟','M3 8h7l2 2h9l-3 10H3zM3 8V5h7l2 2h7v3',self.open_dialog,QKeySequence.StandardKey.Open)
        self.button('保存','M4 3h13l3 3v15H4zM8 3v6h8V3M8 20v-7h8v7',self.save,QKeySequence.StandardKey.Save)
        self.button('另存','M3 3h13l3 3v5M7 3v6h7V3M3 3v17h7m2-4 6-6 3 3-6 6-4 1z',self.save_as,QKeySequence.StandardKey.SaveAs)
        search_icon='M16 10a6 6 0 1 1-12 0 6 6 0 0 1 12 0m-1 5 6 6'
        self.search_button=self.button('搜尋與管腳資訊',search_icon,self.search_pane.setVisible,checkable=True)
        self.search_pane.button('搜尋',search_icon,self.search)
        self.search_pane.button('收起面板','m5 5 14 14M19 5 5 19',self.search_button.click)
        self.button('關閉窗格','m5 5 14 14M19 5 5 19',self.close)
        self.search_button.setChecked(True)

    def showEvent(self,event):
        super().showEvent(event)
        self.search_pane.setVisible(self.search_button.isChecked())

    def open_dialog(self):
        name, _ = QFileDialog.getOpenFileName(self, '開啟 PinView', '', 'PinView (*.json)')
        if name:
            try:
                self.load(Path(name))
            except (ValueError, OSError) as exc:
                QMessageBox.warning(self, '開啟失敗', str(exc))

    def load(self, path):
        model = Model(path)
        scene = QGraphicsScene(self.canvas)
        items, groups = {}, {}
        for pin in model.call('geometry'):
            w, h = pin['w'], pin['h']
            draw = scene.addEllipse if pin['circle'] else scene.addRect
            item = draw(-w/2, -h/2, w, h, QPen(Qt.PenStyle.NoPen), QBrush(QColor(pin['color'])))
            item.setPos(pin['x'], -pin['y'])
            item.setRotation(-pin['rotation'])
            item.setData(0, pin['id'])
            item.setVisible(not pin['hidden'])
            items[pin['id']] = item
            groups.setdefault(pin['group'], []).append(item)
        bounds = scene.itemsBoundingRect().adjusted(-1, -1, 1, 1)
        scene.setSceneRect(bounds.adjusted(-bounds.width(), -bounds.height(), bounds.width(), bounds.height()))
        old = self.canvas.scene()
        self.canvas.setScene(scene)
        if old:
            old.deleteLater()
        self.items, self.groups = items, groups
        self.model, self.path, self.selected = model, path, None
        self.canvas.fitInView(bounds, Qt.AspectRatioMode.KeepAspectRatio)
        self.results.clear()
        self.query.clear()
        self.info.clear()
        self.status.clear()
        self.setWindowTitle(f'{path.name} — ChipChip')
        current = model.call('current')
        if current:
            self.select(current['id'], False)
            self.canvas.centerOn(self.items[current['id']])

    def search(self):
        self.results.clear()
        try:
            rows = self.model.call('search', self.query.text(), *(b.isChecked() for b in self.options))
        except ValueError as exc:
            self.status.setText(str(exc))
            return
        for ball, name in rows:
            row = QListWidgetItem(f'{ball} · {name}', self.results)
            row.setData(Qt.ItemDataRole.UserRole, ball)
        self.status.setText(f'找到 {len(rows)} 個管腳')
        if len(rows) == 1:
            self.select(rows[0][0], True)

    def locate_result(self, row):
        self.select(row.data(Qt.ItemDataRole.UserRole), True)

    def select(self, ball, reveal):
        pin = self.model.call('select', ball, reveal)
        if self.selected is not None:
            self.items[self.selected].setPen(QPen(Qt.PenStyle.NoPen))
        self.selected = ball
        item = self.items[ball]
        if reveal:
            for member in self.groups[pin['group']]:
                member.show()
            scale = self.canvas.transform().m11()
            if scale < 32:
                self.canvas.scale(32/scale, 32/scale)
            self.canvas.centerOn(item)
        pen = QPen(QColor('#ffcd50'), 2)
        pen.setCosmetic(True)
        item.setPen(pen)
        self.search_button.setChecked(True)
        self.search_pane.show()
        self.info.setText(f"{ball} · {pin['name']}\n分組：{pin['group']}\n" + '\n'.join(pin['names']))

    def write(self, path):
        try:
            self.model.save(path)
        except (OSError, ValueError) as exc:
            QMessageBox.warning(self, '保存失敗', str(exc))
            return
        self.path = path
        self.setWindowTitle(f'{path.name} — ChipChip')
        self.status.setText('已保存 ' + path.name)

    def save(self):
        if self.path is None:
            self.save_as()
        else:
            self.write(self.path)

    def save_as(self):
        name, _ = QFileDialog.getSaveFileName(self, '另存 PinView', str(self.path or 'PinView.json'), 'PinView (*.json)')
        if name:
            self.write(Path(name))


def run(root, filename=None):
    app = QApplication.instance() or QApplication(['ChipChip'])
    window = Window()
    window.show()
    window.load(Path(filename) if filename else root / 'examples/PinView_Draft_0_2_E38xx_demo.json')
    if not filename:
        window.path = None
    return app.exec()


