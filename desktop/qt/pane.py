"""Native frame, title handle and action buttons for ChipDraw panes."""
import os
import sys

from PySide6.QtCore import QEvent, QPoint, QRect, QRectF, QSize, Qt, QTimer
from PySide6.QtGui import QFont, QIcon, QPainter, QPainterPath, QPixmap, QRegion
from PySide6.QtSvg import QSvgRenderer
from PySide6.QtWidgets import QFrame, QHBoxLayout, QLabel, QToolButton, QVBoxLayout, QWidget

# Owned desktop panels use desktop coordinates for release-to-attach.
# Prefer XWayland on a mixed Linux desktop, respecting an explicit Qt backend.
def configure_native_display():
    if sys.platform.startswith('linux') and os.environ.get('WAYLAND_DISPLAY') and os.environ.get('DISPLAY'):
        from ctypes import CDLL
        from pathlib import Path
        from PySide6.QtCore import QLibraryInfo
        plugins = QLibraryInfo.path(QLibraryInfo.LibraryPath.PluginsPath)
        try:
            CDLL(str(Path(plugins) / 'platforms/libqxcb.so'))
        except OSError:
            pass  # Qt can still use the compositor's Wayland backend.
        else:
            os.environ.setdefault('QT_QPA_PLATFORM', 'xcb')


EDGE = Qt.Edge


def icon(path, size=24):
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}"><path d="{path}" fill="none" stroke="#e3efff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    return svg_icon(svg)


def svg_icon(svg):
    renderer = QSvgRenderer(svg.replace("currentColor", "#e3efff").encode())
    if not renderer.isValid():
        return QIcon()
    pixmap = QPixmap(48, 48)
    pixmap.fill(Qt.GlobalColor.transparent)
    painter = QPainter(pixmap)
    renderer.render(painter)
    painter.end()
    return QIcon(pixmap)


def action_button(action, parent):
    button = QToolButton(parent)
    button.setDefaultAction(action)
    if action.icon().isNull():
        button.setToolButtonStyle(Qt.ToolButtonStyle.ToolButtonTextOnly)
    button.setAccessibleName(action.text())
    button.setIconSize(QSize(20, 20))
    return button


class Pane(QFrame):
    margin = 6
    corner_radius = 6

    def __init__(self, title, parent=None, *, overlay_title=False):
        flags = (Qt.WindowType.Window if parent is None else Qt.WindowType.Tool) | Qt.WindowType.FramelessWindowHint
        super().__init__(parent, flags)
        self.setObjectName('chipPane')
        self.setProperty('squareCorners', False)
        self.setWindowTitle(title)
        self.setMouseTracking(True)
        self.setStyleSheet("""
            QFrame#chipPane { background: #111d30; border: 1px solid #536e92; border-radius: RADIUSpx; }
            QFrame#chipPane[squareCorners="true"] { border-radius: 0; }
            QLabel { color: #d9e9fb; padding: 2px; }
            QToolButton { color: #d9e9fb; background: transparent; border: 1px solid transparent;
                          border-radius: 4px; padding: 4px; }
            QToolButton:hover, QToolButton:focus { background: #263b56; border-color: #6889ac; }
            QToolButton:checked { background: #2e5072; border-color: #70baff; }
        """.replace("RADIUS", str(self.corner_radius)))
        self.body = QVBoxLayout(self)
        self.body.setContentsMargins(*([0 if overlay_title else self.margin] * 4))
        self.body.setSpacing(2)
        self.strip = QHBoxLayout()
        self.strip.setSpacing(2)
        if overlay_title:
            self.title_chip = QFrame(self)
            self.title_chip.setObjectName('titleChip')
            self.title_chip.setStyleSheet(
                "QFrame#titleChip {background:#152238; border:1px solid #536e92;"
                f"border-top-left-radius:{self.corner_radius}px; border-bottom-right-radius:{self.corner_radius}px}}"
            )
            self.title_chip.setLayout(self.strip)
            self.strip.setContentsMargins(3, 2, 0, 2)
            self.title_chip.move(0, 0)
        else:
            self.body.addLayout(self.strip)
        self.handle = QLabel(title, self)
        title_font = self.handle.font()
        title_font.setWeight(QFont.Weight.Bold)
        self.handle.setFont(title_font)
        self.handle.setAccessibleName('拖動窗格')
        self.handle.installEventFilter(self)
        self.strip.addWidget(self.handle, 1)
        self.gesture = None
        self.resize_grips = {}
        shapes = Qt.CursorShape
        for edges, cursor in (
            (EDGE.LeftEdge, shapes.SizeHorCursor), (EDGE.RightEdge, shapes.SizeHorCursor),
            (EDGE.TopEdge, shapes.SizeVerCursor), (EDGE.BottomEdge, shapes.SizeVerCursor),
            (EDGE.LeftEdge | EDGE.TopEdge, shapes.SizeFDiagCursor),
            (EDGE.RightEdge | EDGE.BottomEdge, shapes.SizeFDiagCursor),
            (EDGE.RightEdge | EDGE.TopEdge, shapes.SizeBDiagCursor),
            (EDGE.LeftEdge | EDGE.BottomEdge, shapes.SizeBDiagCursor),
        ):
            grip = QWidget(self)
            self.resize_grips[grip] = edges
            grip.setCursor(cursor)
            grip.installEventFilter(self)
        self.board = parent
        self.board_offset = QPoint(12,12) if parent else None
        self.tracking_system_move = False
        self.layout_timer = QTimer(self)
        self.layout_timer.setSingleShot(True)
        self.layout_timer.timeout.connect(self.follow_board)
        if parent:
            parent.installEventFilter(self)
            parent.window().installEventFilter(self)

    def button(self, label, svg, callback, shortcut=None, checkable=False):
        from PySide6.QtGui import QAction
        action = QAction(icon(svg), label, self)
        action.setCheckable(checkable)
        if shortcut:
            action.setShortcut(shortcut)
        action.triggered.connect(callback)
        self.addAction(action)
        button = action_button(action,self)
        self.strip.addWidget(button)
        return button

    def board_rect(self):
        return QRect(self.board.mapToGlobal(QPoint()), self.board.size())

    def follow_board(self):
        if self.board is None or self.board_offset is None or self.gesture or self.tracking_system_move:
            return
        board = self.board_rect()
        if self.width() > board.width() or self.height() > board.height():
            self.board_offset = None
            return
        limit = QPoint(board.width()-self.width(), board.height()-self.height())
        self.board_offset = QPoint(max(0,min(self.board_offset.x(),limit.x())), max(0,min(self.board_offset.y(),limit.y())))
        self.move(board.topLeft() + self.board_offset)

    def finish_placement(self):
        if self.board is not None:
            board = self.board_rect()
            self.board_offset = self.pos()-board.topLeft() if board.contains(self.frameGeometry()) else None

    def end_system_move(self):
        from PySide6.QtWidgets import QApplication
        if QApplication.mouseButtons() & Qt.MouseButton.LeftButton:
            QTimer.singleShot(35, self.end_system_move)
            return
        self.tracking_system_move = False
        self.finish_placement()

    def layout_resize_grips(self):
        corner = 12
        for grip, edges in self.resize_grips.items():
            horizontal = edges & (EDGE.LeftEdge | EDGE.RightEdge)
            vertical = edges & (EDGE.TopEdge | EDGE.BottomEdge)
            if horizontal and vertical:
                width = height = corner
            elif horizontal:
                width, height = self.margin, self.height()-2*corner
            else:
                width, height = self.width()-2*corner, self.margin
            x = self.width()-width if edges & EDGE.RightEdge else (0 if horizontal else corner)
            y = self.height()-height if edges & EDGE.BottomEdge else (0 if vertical else corner)
            grip.setGeometry(x,y,width,height)
            grip.setVisible(not self.isFullScreen())
            grip.raise_()

    def update_outline(self):
        self.layout_resize_grips()
        square = self.isFullScreen()
        if self.property('squareCorners') != square:
            self.setProperty('squareCorners', square)
            self.style().unpolish(self)
            self.style().polish(self)
        if square:
            self.clearMask()
        else:
            path = QPainterPath()
            path.addRoundedRect(QRectF(self.rect()), self.corner_radius, self.corner_radius)
            self.setMask(QRegion(path.toFillPolygon().toPolygon()))

    def resizeEvent(self, event):
        super().resizeEvent(event)
        self.update_outline()

    def changeEvent(self, event):
        super().changeEvent(event)
        if event.type() == QEvent.Type.WindowStateChange:
            self.update_outline()

    def showEvent(self, event):
        super().showEvent(event)
        self.update_outline()
        self.follow_board()

    def begin_drag(self, event, edges, cursor):
        if self.isFullScreen() or event.button() != Qt.MouseButton.LeftButton:
            return False
        if self.board is not None:
            self.board_offset = None
        # Wayland delegates top-level positioning to the compositor.
        from PySide6.QtGui import QGuiApplication
        if self.board is None or QGuiApplication.platformName().startswith('wayland'):
            handle = self.windowHandle()
            if handle and (handle.startSystemResize(edges) if edges else handle.startSystemMove()):
                if self.board is not None:
                    self.tracking_system_move = True
                    QTimer.singleShot(35, self.end_system_move)
                return True
        self.gesture = (event.globalPosition().toPoint(), self.geometry(), edges)
        self.grabMouse(cursor)
        return True

    def update_drag(self, event):
        start, box, edges = self.gesture
        delta = event.globalPosition().toPoint() - start
        dx, dy = delta.x(), delta.y()
        if not edges:
            self.move(box.topLeft()+delta)
            return
        result = QRect(box)
        if edges & EDGE.LeftEdge:
            x = min(box.right()-self.minimumWidth()+1, box.left()+dx)
            result.setLeft(x)
        if edges & EDGE.RightEdge:
            x = max(box.left()+self.minimumWidth()-1, box.right()+dx)
            result.setRight(x)
        if edges & EDGE.TopEdge:
            y = min(box.bottom()-self.minimumHeight()+1, box.top()+dy)
            result.setTop(y)
        if edges & EDGE.BottomEdge:
            y = max(box.top()+self.minimumHeight()-1, box.bottom()+dy)
            result.setBottom(y)
        self.setGeometry(result)

    def eventFilter(self, watched, event):
        if event.type() in (QEvent.Type.Move,QEvent.Type.Resize) and self.board is not None and watched is not self.handle:
            self.layout_timer.start(0)
        if event.type() == QEvent.Type.MouseButtonPress and watched in self.resize_grips:
            return self.begin_drag(event, self.resize_grips[watched], watched.cursor())
        if watched is self.handle and event.type() == QEvent.Type.MouseButtonPress:
            return self.begin_drag(event, EDGE(0), watched.cursor())
        return super().eventFilter(watched, event)

    def end_drag(self):
        self.gesture = None
        if QWidget.mouseGrabber() is self:
            self.releaseMouse()
        self.finish_placement()

    def event(self, event):
        if event.type() in (QEvent.Type.UngrabMouse, QEvent.Type.WindowDeactivate, QEvent.Type.Hide,
                            QEvent.Type.WindowStateChange) and getattr(self, 'gesture', None):
            self.end_drag()
        return super().event(event)

    def mouseMoveEvent(self, event):
        if self.gesture:
            self.update_drag(event)
        else:
            super().mouseMoveEvent(event)

    def mouseReleaseEvent(self, event):
        if self.gesture and event.button() == Qt.MouseButton.LeftButton:
            self.end_drag()
        else:
            super().mouseReleaseEvent(event)
