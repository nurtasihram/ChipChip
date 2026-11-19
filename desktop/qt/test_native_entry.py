"""Exercise the ordinary zero-argument desktop launch with WebEngine unavailable."""
import sys
import traceback
from unittest.mock import patch

from PySide6.QtCore import QPoint, Qt, QTimer
from PySide6.QtTest import QTest
from PySide6.QtWidgets import QApplication, QGraphicsView

import main
from pane import configure_native_display


class BlockWebEngine:
    def find_spec(self, fullname, path=None, target=None):
        if fullname.startswith("PySide6.QtWebEngine"):
            raise AssertionError(f"Native startup imported {fullname}")
        return None


if __name__ == '__main__':
    sys.meta_path.insert(0, BlockWebEngine())
    configure_native_display()
    app = QApplication([])
    passed = []

    def inspect():
        try:
            window, = [w for w in app.topLevelWidgets() if w.isVisible() and w.windowTitle() == 'ChipDraw']
            canvas = window.canvas
            assert isinstance(canvas, QGraphicsView)
            center = canvas.viewport().rect().center()
            for point in (center, center + QPoint(40, 25)):
                QTest.mouseClick(canvas.viewport(), Qt.MouseButton.LeftButton, pos=point)
            assert len(canvas.session.call('document')['items']) == 1
            assert not any(name.startswith('PySide6.QtWebEngine') for name in sys.modules)
            passed.append(True)
        except Exception:
            traceback.print_exc()
        finally:
            app.quit()

    QTimer.singleShot(100, inspect)
    with patch.object(sys, 'argv', [main.__file__]):
        assert main.main() == 0
    assert passed, 'Default entry did not provide the native drawing workspace'
    print('PASS default native ChipDraw entry, rectangle drawn with WebEngine blocked')
