"""Native input and rendering for the shared ChipDraw rectangle editor."""
import json
from pathlib import Path

from PySide6.QtCore import QEvent, QPointF, Qt
from PySide6.QtGui import QColor, QPainter, QPen, QPolygonF, QTransform
from PySide6.QtQml import QJSEngine
from PySide6.QtWidgets import QGraphicsScene, QGraphicsView, QFrame

from pane import configure_native_display

configure_native_display()


class Session:
    def __init__(self):
        self.engine = QJSEngine()
        script = Path(__file__).with_name('chipdraw-model.generated.js')
        self.check(self.engine.evaluate(script.read_text(encoding='utf8'), str(script)))
        self.controller = self.check(self.engine.evaluate('nativeRectangleSession()'))

    @staticmethod
    def check(value):
        if value.isError():
            raise RuntimeError(f"{value.toString()} (line {value.property('lineNumber').toInt()})")
        return value

    def call(self, command, *args):
        parser = self.engine.globalObject().property('JSON').property('parse')
        values = [parser.call([self.engine.toScriptValue(json.dumps(arg, allow_nan=False))]) for arg in args]
        method = self.controller.property(command)
        return self.check(method.callWithInstance(self.controller, values)).toVariant()


class Canvas(QGraphicsView):
    def __init__(self):
        super().__init__()
        self.session = Session()
        self.setScene(QGraphicsScene(self))
        self.scene().setSceneRect(-10000, -10000, 20000, 20000)
        self.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        self.setVerticalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        self.setFrameShape(QFrame.Shape.NoFrame)
        self.setResizeAnchor(QGraphicsView.ViewportAnchor.AnchorViewCenter)
        self.panning = False
        self.centerOn(0, 0)
        self.setBackgroundBrush(QColor('#101a2b'))
        self.setRenderHint(QPainter.RenderHint.Antialiasing)
        self.setMouseTracking(True)
        self.setFocusPolicy(Qt.FocusPolicy.StrongFocus)
        self.method = 'diagonal'
        self.press = None
        self.first = False
        self.ghost = None
        self.items_by_id = {}

    def set_pan(self, enabled):
        self.command('cancel')
        self.panning = enabled
        mode = QGraphicsView.DragMode
        self.setDragMode(mode.ScrollHandDrag if enabled else mode.NoDrag)

    def wheelEvent(self, event):
        event.accept()

    def keyPressEvent(self, event):
        if event.key() in (Qt.Key.Key_Left, Qt.Key.Key_Right, Qt.Key.Key_Up, Qt.Key.Key_Down,
                            Qt.Key.Key_PageUp, Qt.Key.Key_PageDown, Qt.Key.Key_Home, Qt.Key.Key_End):
            event.accept()
        else:
            super().keyPressEvent(event)

    def confirm(self):
        change = self.session.call('confirm')
        if change:
            self.press = None
            self.clear_preview()
            self.apply_change(change)

    def point(self, event):
        point = self.mapToScene(event.position().toPoint())
        return [point.x(), -point.y()]

    def polygon(self, geometry, preview=False):
        x, y = geometry['point']
        width, height = geometry['width'], geometry['height']
        # The solved point is the world-space upper left corner.
        rotation = QTransform().rotate(-geometry['rotation'])
        outline = QPolygonF([QPointF(x, -y) + rotation.map(QPointF(dx, dy))
                             for dx, dy in ((0, 0), (width, 0), (width, height), (0, height))])
        pen = QPen(QColor('#ffd166' if preview else '#69b8ff'), 2)
        if preview:
            pen.setStyle(Qt.PenStyle.DashLine)
        return self.scene().addPolygon(outline, pen)

    def clear_preview(self):
        if self.ghost is not None:
            self.scene().removeItem(self.ghost)
            self.ghost = None

    def preview(self, point):
        self.clear_preview()
        geometry = self.session.call('preview', point)
        if geometry:
            self.ghost = self.polygon(geometry, True)

    def mousePressEvent(self, event):
        if self.panning or event.button() != Qt.MouseButton.LeftButton:
            return super().mousePressEvent(event)
        self.press = event.position()
        self.first = not self.session.call('active')
        if self.first:
            self.session.call('begin', self.method, self.point(event), 0)
        self.preview(self.point(event))
        event.accept()

    def mouseMoveEvent(self, event):
        if self.session.call('active'):
            self.preview(self.point(event))
        else:
            super().mouseMoveEvent(event)

    def mouseReleaseEvent(self, event):
        if event.button() != Qt.MouseButton.LeftButton or self.press is None:
            return super().mouseReleaseEvent(event)
        delta = event.position() - self.press
        moved = delta.x() ** 2 + delta.y() ** 2 > 16
        self.press = None
        point = self.point(event)
        change = self.session.call('place', point) if not self.first or moved else None
        if change:
            self.clear_preview()
            self.apply_change(change)
        else:
            self.preview(point)
        event.accept()

    def apply_change(self, change):
        if not change:
            return
        if 'remove' in change:
            self.scene().removeItem(self.items_by_id.pop(change['remove']))
        else:
            self.items_by_id[change['add']] = self.polygon(change['geometry'])

    def command(self, name):
        self.press = None
        self.clear_preview()
        self.apply_change(self.session.call(name))

    def set_method(self, method):
        self.command('cancel')
        self.method = method

    def event(self, event):
        if event.type() == QEvent.Type.WindowDeactivate and getattr(self, 'press', None) is not None:
            self.command('cancel')
        return super().event(event)
