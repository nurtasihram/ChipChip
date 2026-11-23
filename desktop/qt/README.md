# ChipChip 原生 Qt

桌面程式由 CMake 建置，使用 C++17 與 Qt 6 Widgets、Qml、Svg 和 Test。ChipDraw 及 PinView 共用同一個原生執行檔。QJSEngine 執行隨程式嵌入的 JavaScript 模型，畫布、窗格、輸入和檔案操作由 Qt 提供。

## 建置與啟動

Windows 使用相符版本的 Qt 6 桌面開發套件與 C++ 編譯器。腳本可辨識安裝於 C:/Qt 的 MinGW 套件，也可用 QTDIR 指定 Qt 套件目錄。

```powershell
./tools/qt.ps1 setup
./tools/qt.ps1 run chipdraw
./tools/qt.ps1 run pinview -File examples/STM32F103C8Tx_LQFP48_PinView.json
./tools/qt.ps1 test
```

Ubuntu 需要 CMake、C++ 編譯器、qt6-base-dev、qt6-declarative-dev、libqt6svg6-dev。WSL 的桌面互動透過 WSLg。

```sh
bash tools/qt.sh setup
bash tools/qt.sh run chipdraw
bash tools/qt.sh run pinview --file examples/STM32F103C8Tx_LQFP48_PinView.json
bash tools/qt.sh test
```

## 操作與驗證

ChipDraw 在畫布上以點擊或拖曳繪製矩形。右鍵開啟工具面板，可切換平移與矩形繪製方式。Esc 取消，Enter 確認。PinView 可開啟 JSON、搜尋及定位管腳、平移縮放與另存選取狀態。未指定檔案時使用內建展示文件。

兩端的共用繪圖和計量模型由 `node tools/build-qt-model.mjs` 更新。`--check` 可檢查嵌入版本與原始碼是否一致。Windows 與 Linux 的編譯產物分別位於 `.qt-build/windows` 和 `.qt-build/linux`。

`test` 以離屏 Qt 平台執行原生測試，涵蓋綁定輸入、像素比例換算、矩形繪製及歷史、PinView 保存與重開。執行檔的 `--web-baseline` 選項會以系統瀏覽器開啟離線 HTML。網頁版也可透過 ChipDraw.html、PinView.html 開啟，執行 `node tests/run.mjs` 驗證共用模型。
