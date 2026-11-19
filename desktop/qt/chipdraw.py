"""Main native ChipDraw workspace and tool panels."""
from PySide6.QtCore import QElapsedTimer, QEvent, QLocale, QPoint, QSize, Signal, Qt, QTimer
from PySide6.QtGui import QAction, QActionGroup, QHelpEvent, QKeySequence
from PySide6.QtSvgWidgets import QSvgWidget
from PySide6.QtWidgets import QApplication, QFrame, QHBoxLayout, QLabel, QToolButton, QVBoxLayout

from pane import Pane, svg_icon
from rectangle import Canvas


class InputButton(QToolButton):
    interacted = Signal(str, str)

    def __init__(self, action, parent, session):
        super().__init__(parent)
        self.session = session
        self.key = action.data()
        self.device = None
        self.touch_id = None
        self.block_menu = False
        self.pen_hint = QTimer(self)
        self.pen_hint.setSingleShot(True)
        self.pen_hint.setInterval(450)
        self.pen_hint.timeout.connect(self.show_pen_hint)
        self.pen_position = None
        self.hold = QTimer(self)
        self.hold.setSingleShot(True)
        self.hold.setInterval(session.call('holdMs'))
        self.hold.timeout.connect(lambda: self.update_input('hold', self.device))
        self.setAttribute(Qt.WidgetAttribute.WA_AcceptTouchEvents)
        self.setAttribute(Qt.WidgetAttribute.WA_TabletTracking)
        self.setMouseTracking(True)
        self.setDefaultAction(action)
        self.setAccessibleName(action.text())
        self.setIconSize(QSize(20, 20))
        if action.icon().isNull():
            self.setToolButtonStyle(Qt.ToolButtonStyle.ToolButtonTextOnly)

    def show_pen_hint(self):
        if self.pen_position is not None and self.isVisible():
            point = self.pen_position
            QApplication.sendEvent(self, QHelpEvent(QEvent.Type.ToolTip, point, self.mapToGlobal(point)))

    def update_input(self, kind, device, point=None):
        x, y = (point.x(), point.y()) if point is not None else (0, 0)
        result = self.session.call('buttonGesture', self.key, kind, device, x, y)
        if result:
            if result in ('secondary', 'drag'):
                self.hold.stop()
                self.setDown(False)
            if result == 'secondary':
                self.block_menu = True
            self.interacted.emit(result, device)
        return result

    def pointer(self, phase, device, point):
        if phase == 'down':
            self.pen_hint.stop()
            self.pen_position = None
            self.device = device
            self.block_menu = False
            self.setDown(True)
            if device in ('touch', 'pen'):
                self.hold.start()
        result = self.update_input(phase, device, point)
        if phase in ('up', 'cancel'):
            self.hold.stop()
            self.device = None
            self.setDown(False)
            if result == 'primary' and self.rect().contains(point.toPoint()):
                self.click()

    def event(self, event):
        t = event.type()
        E = QEvent.Type
        if not hasattr(self, 'hold'):
            return super().event(event)
        if t in (E.TouchBegin, E.TouchUpdate, E.TouchEnd):
            points = event.points()
            if t == E.TouchBegin:
                self.touch_id = points[0].id()
            point = next((p for p in points if p.id() == self.touch_id), None)
            if point and (t == E.TouchBegin or self.device == 'touch'):
                phase = {E.TouchBegin:'down', E.TouchUpdate:'move', E.TouchEnd:'up'}[t]
                self.pointer(phase, 'touch', point.position())
            event.accept()
            return True
        if t == E.TouchCancel or t in (E.Hide, E.UngrabMouse) and self.device:
            self.pointer('cancel', self.device, None)
        if t in (E.Leave, E.Hide):
            self.pen_hint.stop()
            self.pen_position = None
        if t in (E.TabletPress, E.TabletMove, E.TabletRelease):
            if t == E.TabletMove and self.device is None:
                point = event.position().toPoint()
                if self.pen_position is None or (point-self.pen_position).manhattanLength() > 5:
                    self.pen_position = point
                    self.pen_hint.start()
                self.update_input('hover', 'pen')
            else:
                self.pointer({E.TabletPress:'down', E.TabletMove:'move', E.TabletRelease:'up'}[t],
                             'pen', event.position())
            event.accept()
            return True
        if t == E.Enter:
            self.update_input('hover', 'mouse')
        if t == E.FocusIn and event.reason() in (Qt.FocusReason.TabFocusReason,
                                                 Qt.FocusReason.BacktabFocusReason,
                                                 Qt.FocusReason.ShortcutFocusReason):
            self.update_input('focus', 'keyboard')
        if t == E.ContextMenu:
            if not self.block_menu:
                keyboard = event.reason() == event.Reason.Keyboard
                self.update_input('menu' if keyboard else 'secondary', 'keyboard' if keyboard else 'mouse')
            self.block_menu = False
            event.accept()
            return True
        if t == E.KeyPress:
            if event.key() == Qt.Key.Key_Menu or (event.key() == Qt.Key.Key_F10 and
                                                  event.modifiers() & Qt.KeyboardModifier.ShiftModifier):
                if not event.isAutoRepeat():
                    self.update_input('menu', 'keyboard')
                return True
            if event.key() in (Qt.Key.Key_Return, Qt.Key.Key_Enter, Qt.Key.Key_Space):
                if not event.isAutoRepeat():
                    self.update_input('activate', 'keyboard')
                    self.click()
                return True
        if t == E.MouseButtonPress and event.button() == Qt.MouseButton.RightButton:
            self.block_menu = False
            self.update_input('secondary', 'mouse')
            return True
        if t in (E.MouseButtonPress, E.MouseButtonRelease) and event.button() == Qt.MouseButton.LeftButton:
            self.pointer('down' if t == E.MouseButtonPress else 'up', 'mouse', event.position())
            return True
        if t == E.MouseMove and self.device == 'mouse':
            self.pointer('move', 'mouse', event.position())
            return True
        return super().event(event)


class VisualHint(QFrame):
    """Draw the shared rectangle demonstration below the localized hint."""
    def __init__(self, button, definition, session, language):
        super().__init__(button, Qt.WindowType.ToolTip)
        self.button = button
        self.definition = definition
        self.session = session
        self.language = language
        self.setAttribute(Qt.WidgetAttribute.WA_TransparentForMouseEvents)
        self.setStyleSheet('QFrame {background:#172438;color:#e3efff;border-radius:5px}')
        layout = QVBoxLayout(self)
        label = QLabel(button.toolTip())
        label.setWordWrap(True)
        layout.addWidget(label)
        self.graphic = QSvgWidget()
        self.graphic.setFixedSize(250, 175)
        layout.addWidget(self.graphic)
        self.clock = QElapsedTimer()
        self.timer = QTimer(self)
        self.timer.setInterval(40)
        self.timer.timeout.connect(self.paint_frame)
        button.installEventFilter(self)

    def paint_frame(self):
        visual = self.definition['visual']
        if visual['kind'] == 'animation':
            progress = (self.clock.elapsed() % 4200) / 4200
            svg = self.session.call('helpFrame', visual['id'], self.language, progress)
        else:
            svg = visual['svg']
        self.graphic.load(svg.encode())

    def eventFilter(self, owner, event):
        kind = event.type()
        if kind in (QEvent.Type.ToolTip, QEvent.Type.FocusIn):
            if not self.isVisible():
                self.clock.start()
                self.paint_frame()
                self.adjustSize()
                where = owner.mapToGlobal(QPoint(0, owner.height()+4))
                screen = owner.screen().availableGeometry()
                where.setX(max(screen.left(), min(where.x(), screen.right()-self.width()+1)))
                if where.y()+self.height() > screen.bottom()+1:
                    where.setY(max(screen.top(), owner.mapToGlobal(QPoint()).y()-self.height()-4))
                self.move(where)
                self.show()
                if self.definition['visual']['kind'] == 'animation':
                    self.timer.start()
            return kind == QEvent.Type.ToolTip
        if kind in (QEvent.Type.Leave, QEvent.Type.FocusOut, QEvent.Type.Hide,
                    QEvent.Type.MouseButtonPress, QEvent.Type.KeyPress):
            self.hide()
        return False

    def hideEvent(self, event):
        self.timer.stop()
        super().hideEvent(event)


class Window(Pane):
    def __init__(self, language=None):
        super().__init__('ChipDraw', overlay_title=True)
        self.setMinimumSize(350, 220)
        self.resize(960, 680)
        self.canvas = Canvas()
        self.body.addWidget(self.canvas, 1)
        self.language = language or QLocale().bcp47Name()
        session = self.canvas.session
        def action_button(action, parent):
            return InputButton(action, parent, session)

        def text(key):
            return session.call('text', key, self.language)

        def make_action(definition, owner):
            action = QAction(svg_icon(definition.get('svg', '')), definition['alt'], owner)
            action.setData(definition['action'])
            hint = definition.get('hint')
            action.setToolTip(' → '.join(hint) if isinstance(hint, list) else hint or definition['alt'])
            return action

        def action_for(key, owner):
            return make_action(session.call('button', key, self.language), owner)

        self.handle.setAccessibleName(text('pane.drag'))
        close = action_for('pane.close', self)
        close.triggered.connect(self.close)
        self.close_button = action_button(close, self.title_chip)
        self.strip.insertWidget(0, self.close_button)
        # The trailing space belongs to the same draggable label as the title.
        self.handle.setContentsMargins(3, 0, 36, 0)
        self.title_chip.adjustSize()
        self.title_chip.raise_()

        self.methods = Pane(text('rect.title'), self.canvas.viewport())
        self.methods.handle.setAccessibleName(text('pane.drag'))
        self.methods.setMinimumSize(180, 84)
        self.methods.resize(220, 88)
        self.methods.hide()
        self.canvas.setContextMenuPolicy(Qt.ContextMenuPolicy.CustomContextMenu)
        self.canvas.customContextMenuRequested.connect(self.open_methods)
        self.canvas.setAccessibleDescription(text('canvas.help'))
        cancel = QAction(text('canvas.cancel'), self)
        cancel.setShortcut(QKeySequence('Esc'))
        cancel.triggered.connect(lambda: self.canvas.command('cancel'))
        self.addAction(cancel)

        self.pan = action_for('canvas.pan', self.methods)
        self.pan.setCheckable(True)
        self.pan.triggered.connect(self.canvas.set_pan)
        self.methods.strip.addWidget(action_button(self.pan, self.methods))
        close_panel = action_for('panel.close', self.methods)
        close_panel.triggered.connect(self.methods.hide)
        self.methods.strip.addWidget(action_button(close_panel, self.methods))
        row = QHBoxLayout()
        self.methods.body.addLayout(row)
        group = QActionGroup(self.methods)
        self.method_buttons = {}
        for definition in session.call('methods', self.language):
            key = definition['action']
            action = make_action(definition, group)
            action.setCheckable(True)
            action.setChecked(key == self.canvas.method)
            action.triggered.connect(lambda checked=False, method=key: self.choose_method(method))
            button = action_button(action, self.methods)
            if definition.get('visual'):
                button.visual_hint = VisualHint(button, definition, session, self.language)
            row.addWidget(button)
            self.method_buttons[key] = button


    def open_methods(self, point):
        if self.methods.board_offset is not None:
            self.methods.board_offset = point
        self.methods.show()
        self.methods.raise_()

    def choose_method(self, method):
        self.pan.setChecked(False)
        self.canvas.set_pan(False)
        self.canvas.set_method(method)

def run():
    app = QApplication.instance() or QApplication(['ChipDraw'])
    app.setApplicationName('ChipDraw')
    app.setOrganizationName('ChipChip')
    window = Window()
    window.show()
    return app.exec()

