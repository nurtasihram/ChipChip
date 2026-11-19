"""Run native ChipChip or the shared WebEngine compatibility baseline."""
import argparse
import json
import sys
import platform
import subprocess
from pathlib import Path
from shiboken6 import delete

from PySide6.QtCore import QTimer, QUrl
from PySide6.QtWidgets import QApplication, QFileDialog, QMainWindow



ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / '.qt-test-output' / platform.system().lower()


def make_page(profile, view):
    from PySide6.QtWebEngineCore import QWebEnginePage

    class Page(QWebEnginePage):
        def __init__(self, profile, parent):
            super().__init__(profile, parent)
            self.errors = []
    
        def javaScriptConsoleMessage(self, level, message, line, source):
            if level == QWebEnginePage.JavaScriptConsoleMessageLevel.ErrorMessageLevel:
                self.errors.append(f"{source}:{line}: {message}")
                print(self.errors[-1], file=sys.stderr)
    return Page(profile, view)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--app', choices=['chipchip', 'chipdraw', 'pinview'], default='chipchip')
    parser.add_argument('--smoke-test', action='store_true')
    parser.add_argument('--web-baseline', action='store_true')
    parser.add_argument('--file', type=Path)
    parser.add_argument('--native-rectangle', action='store_true', help='Open the native ChipDraw rectangle editor')
    args = parser.parse_args()
    if args.app == 'chipchip':
        args.app = 'chipdraw'
    if args.file and args.app != 'pinview':
        parser.error('--file opens a PinView document with --app pinview')
    if args.native_rectangle and (args.app != 'chipdraw' or args.web_baseline):
        parser.error('--native-rectangle requires native ChipDraw')
    if args.app == 'chipdraw' and not (args.web_baseline or args.smoke_test):
        from chipdraw import run
        return run()
    if args.app == 'chipdraw' and args.smoke_test:
        subprocess.run([sys.executable, str(Path(__file__).with_name('test_native_entry.py'))], check=True)
        subprocess.run([sys.executable, str(Path(__file__).with_name('test_rectangle.py'))], check=True)
    if args.app == 'pinview' and not args.web_baseline and not args.smoke_test:
        from pinview import run
        return run(ROOT, args.file)
    if args.app == 'pinview' and args.smoke_test:
        subprocess.run([sys.executable, str(Path(__file__).with_name('test_pinview.py'))], check=True)
    from PySide6.QtWebEngineCore import QWebEngineProfile, QWebEngineSettings
    from PySide6.QtWebEngineWidgets import QWebEngineView
    entry = ROOT / ('PinView.html' if args.app == 'pinview' else 'ChipChip.html')
    if not entry.is_file():
        parser.error('Run node tools/build.mjs first')
    from pane import Pane
    app = QApplication([sys.argv[0]])
    app.setApplicationName('ChipChip Qt Test')
    app.setOrganizationName('ChipChip')
    window = Pane('ChipDraw' if args.app == 'chipdraw' else 'PinView')
    window.button('關閉窗格','m5 5 14 14M19 5 5 19',window.close)
    window.setWindowTitle('ChipChip · ChipDraw' if args.app == 'chipdraw' else 'ChipChip · PinView')
    window.resize(1280, 860)
    view = QWebEngineView(window)
    # A private profile isolates regression runs from persisted desktop settings.
    profile = QWebEngineProfile(view) if args.smoke_test else QWebEngineProfile('chipchip-qt', view)
    page = make_page(profile, view)
    view.setPage(page)
    page.settings().setAttribute(QWebEngineSettings.WebAttribute.FullScreenSupportEnabled, True)

    def fullscreen(request):
        request.accept()
        window.showFullScreen() if request.toggleOn() else window.showNormal()

    def download(request):
        destination, _ = QFileDialog.getSaveFileName(
            window, 'Save / 保存', str(Path(request.downloadDirectory()) / request.downloadFileName()))
        if not destination:
            request.cancel()
            return
        target = Path(destination)
        request.setDownloadDirectory(str(target.parent))
        request.setDownloadFileName(target.name)
        request.accept()

    page.fullScreenRequested.connect(fullscreen)
    profile.downloadRequested.connect(download)
    window.body.addWidget(view)
    finished = False

    def finish(code, result):
        nonlocal finished
        if finished:
            return
        finished = True
        result['platform'] = platform.platform()
        output = OUTPUT
        output.mkdir(parents=True, exist_ok=True)
        (output / f'{args.app}.json').write_text(
            json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
        # ASCII escapes keep Windows terminals with legacy encodings readable.
        print(json.dumps(result), flush=True)
        app.exit(code)

    def verify():
        page.runJavaScript("""JSON.stringify((() => {
          try {
            if (!window.ChipUI || !window.ChipQuantity || !window.ChipViewport)
              throw Error('Shared modules missing');
            const before = JSON.stringify(ChipUI.measurements.read());
            const stored = JSON.stringify(Object.entries(localStorage).sort());
            const quantity = {value: 0.5, unit: 'mm', rational: {numerator: 1, denominator: 2}};
            const archive = JSON.stringify(ChipUI.measurements.archiveQuantity(quantity));
            const languages = ['en', 'zh-Hant'].map(language => {
              ChipUI.setLanguage(language);
              return {language, actual: document.documentElement.lang,
                label: document.getElementById('languageLabel').textContent,
                unchanged: JSON.stringify(ChipUI.measurements.read()) === before};
            });
            const storageUnchanged = JSON.stringify(Object.entries(localStorage).sort()) === stored;
            const localized = document.getElementById('localizedUnitNames');
            localized.checked = true;
            localized.dispatchEvent(new Event('change', {bubbles: true}));
            const units = ['en', 'zh-Hant'].map(language => {
              ChipUI.setLanguage(language);
              return {language, label: ChipUI.measurements.unitLabel('mm'),
                factor: ChipUI.measurements.unitFactor('mm'),
                unchanged: JSON.stringify(ChipUI.measurements.archiveQuantity(quantity)) === archive
                  && JSON.stringify(ChipUI.measurements.read()) === before};
            });
            localized.checked = false;
            localized.dispatchEvent(new Event('change', {bubbles: true}));
            return {ok: languages.every(x => x.language === x.actual && x.unchanged)
              && languages[0].label === 'Language' && languages[1].label === '語言'
              && storageUnchanged && units.every(x => x.unchanged)
              && units[0].factor === units[1].factor && units[0].label !== units[1].label,
              languages, units, title: document.title};
          } catch (error) { return {ok: false, error: String(error)}; }
        })())""", checked)

    def checked(result):
        if isinstance(result, str):
            try:
                result = json.loads(result)
            except ValueError:
                result = None
        result = result if isinstance(result, dict) else {'ok': False, 'error': 'No JavaScript result'}
        result['consoleErrors'] = page.errors
        result['app'] = args.app
        output = OUTPUT
        output.mkdir(parents=True, exist_ok=True)
        screenshot = output / f'{args.app}.png'
        saved = view.grab().save(str(screenshot))
        result['screenshotSaved'] = saved
        finish(0 if result.get('ok') and not page.errors and saved else 1, result)

    def loaded(ok):
        if args.smoke_test:
            if not ok:
                finish(1, {'ok': False, 'error': 'Page load failed'})
            else:
                QTimer.singleShot(1500, verify)

    view.loadFinished.connect(loaded)
    if args.smoke_test:
        QTimer.singleShot(30000, lambda: finish(1, {'ok': False, 'error': 'Timeout'}))
    view.load(QUrl.fromLocalFile(str(entry)))
    window.show()
    code = app.exec()
    # Destroy the page before its profile (Qt WebEngine ownership requirement).
    delete(page)
    return code


if __name__ == '__main__':
    sys.exit(main())
