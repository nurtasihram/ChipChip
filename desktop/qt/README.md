# ChipDraw 桌面版

登入 GitHub，開啟最近一次成功的 Windows 建置，在 Artifacts 下載 **ChipDraw-Windows-x64**。完整解壓縮後，雙擊 `ChipDraw.exe` 即可啟動。套件隨附 Qt 程式庫及平台外掛。[Windows 建置與下載](https://github.com/nurtasihram/ChipChip/actions/workflows/windows-qt.yml)

桌面版使用 C++、Qt Widgets 和 QJSEngine。矩形幾何、互動狀態、物件格式、按鈕定義及提示動畫沿用 HTML 版的 JavaScript 模型。ChipChip 系列嚴禁使用 Python，範圍涵蓋執行、開發工具、建置、測試及打包。

## 原生矩形編輯

在畫布按右鍵開啟工具窗格，可選對角線、指定邊、直三角板或邊中點，再於畫布選點。對角線畫法也可拖曳建立矩形。按 Esc 取消預覽。工具窗格可拖出畫板，拖回畫板範圍後再次跟隨主視窗。完整的圖層、選取、吸附、計量單位和物件窗格見[離線畫板](../../ChipDraw.html)。

## 開發與驗證

建置需要 C++17 編譯器、CMake 3.21 以上和對應編譯器的 Qt 6.5 以上開發套件（Widgets、Qml、SvgWidgets，測試另需 Test）。在已設定 Qt 及編譯器的開發環境，從專案根目錄執行：

```sh
cmake -S desktop/qt -B output/native -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build output/native
ctest --test-dir output/native --output-on-failure
```

若 CMake 無法定位 Qt，設定 `CMAKE_PREFIX_PATH` 指向該架構的 Qt 安裝目錄。Windows 發佈時，將 Release 的 `ChipDraw.exe` 複製到空白套件目錄，使用同一 Qt 安裝提供的 `windeployqt --release --compiler-runtime ChipDraw.exe` 收集相依檔。

原生測試以滑鼠事件操作畫布，檢查取消、點選、拖曳、復原及重做。Web 端回歸使用 `node tests/run.mjs`。變更共用模型後，使用 `node tools/build-qt-model.mjs` 重建桌面資源，使用 `node tools/build.mjs` 更新離線畫板。
