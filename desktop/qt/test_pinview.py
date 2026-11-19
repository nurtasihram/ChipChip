"""Exercise file actions, keyboard search, canvas picking and PinView round trips."""
import json
import sys
import tempfile
from pathlib import Path
from unittest.mock import patch

from PySide6.QtCore import Qt
from PySide6.QtTest import QTest
from PySide6.QtWidgets import QApplication, QFileDialog

from pinview import Window


def verify(root):
    app = QApplication.instance() or QApplication([])
    win = Window()
    win.show()
    app.processEvents()
    with tempfile.TemporaryDirectory() as folder:
        for path, query, count in [
            (root/'examples/STM32F103C8Tx_LQFP48_PinView.json', 'pc13', 48),
            (root/'examples/PinView_Draft_0_2_E38xx_demo.json', 'A3', 1170),
        ]:
            original = json.loads(path.read_text(encoding='utf-8-sig'))
            ball = '2' if count == 48 else 'A3'
            group = original['pinouts'][ball]['para']['group']
            original.setdefault('view_state', {}).setdefault('groups', {}).setdefault('modes', {})[group] = 'hidden'
            source = Path(folder)/'輸入.json'
            source.write_text(json.dumps(original), encoding='utf-8')
            with patch.object(QFileDialog, 'getOpenFileName', return_value=(str(source), '')):
                win.open_dialog()
            assert len(win.items) == count and not win.items[ball].isVisible()
            win.options[2].setChecked(True)
            win.query.setText(query)
            QTest.keyClick(win.query, Qt.Key.Key_Return)
            assert win.results.count() == 1 and win.selected == ball and win.items[ball].isVisible()
            if count == 48:
                assert 'TAMPER-RTC' in win.info.text()
                point = win.canvas.mapFromScene(win.items['3'].pos())
                QTest.mouseClick(win.canvas.viewport(), Qt.MouseButton.LeftButton, pos=point)
                assert win.selected == '3'
                win.locate_result(win.results.item(0))
            output = Path(folder)/'另存.json'
            with patch.object(QFileDialog, 'getSaveFileName', return_value=(str(output), '')):
                win.save_as()
            win.save()
            win.load(output)
            saved = json.loads(output.read_text(encoding='utf-8'))
            assert win.selected == ball and win.items[ball].isVisible()
            assert saved['view_state']['groups']['modes'][group] == 'default'
            assert {k:v for k,v in saved.items() if k != 'view_state'} == {
                k:v for k,v in original.items() if k != 'view_state'}
            print(f'PASS {count} pins: open, locate, inspect, save, reopen', flush=True)
    win.close()


if __name__ == '__main__':
    verify(Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[2])

