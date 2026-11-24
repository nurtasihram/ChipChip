# ChipDraw 桌面版

從專案根目錄啟動桌面版。預設入口及 `run chipdraw` 都開啟原生矩形編輯器。完整的選取、吸附、計量單位、圖層與物件窗格可在 [離線畫板](../../ChipDraw.html) 使用。

| 平台 | 首次建立桌面環境 | 啟動原生編輯器 | 執行桌面回歸 |
| --- | --- | --- | --- |
| Windows | `.\tools\qt.ps1 setup` | `.\tools\qt.ps1 run` | `.\tools\qt.ps1 test` |
| Linux／WSL | `bash tools/qt.sh setup` | `bash tools/qt.sh run` | `bash tools/qt.sh test` |

桌面入口現有依賴列於 [requirements.txt](requirements.txt)。Windows 與 Linux 各自使用獨立的環境。Linux 需要可用的圖形桌面，WSL 使用 WSLg。兩種顯示後端皆可用時預設採用 XWayland，以便在桌面定位浮動窗格。

## 原生矩形編輯

在畫布按右鍵開啟工具窗格。選擇對角線、指定邊、直三角板或邊中點，再按畫布預覽的提示放置點位。對角線畫法也可直接拖曳。按 Esc 取消預覽。拖動窗格標題可移動，拖動邊框可調整大小。工具窗格可移到畫板外，整個窗格放回畫板後會再次跟隨畫板。

原生版與 HTML 版執行同一份矩形狀態機與圖稿模型，分別由 Qt Graphics View 與 SVG 顯示預覽。修改共用模型後，在根目錄執行 `node tools/build-qt-model.mjs` 及 `node tools/build.mjs`。用 `node tools/build-qt-model.mjs --check` 可比對桌面內嵌版本。[矩形狀態機](../../shared/rectangle-editor.js) · [JSON 儲存規格](../../docs/reference/JSON_STORAGE.md)

## 相容性驗證

桌面測試會檢查原生矩形操作，並在 Qt WebEngine 中載入根目錄的離線畫板，比對語言切換、計量設定及 JSON。各平台的桌面測試報告分別輸出至 `.qt-test-output/windows/` 或 `.qt-test-output/linux/`。要單獨檢查 HTML 版的窗格行為，請使用 [專案首頁的瀏覽器測試命令](../../README.md#建置與驗證)。
