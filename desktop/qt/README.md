# ChipChip 原生 Qt 與相容性測試

直接執行 `./tools/qt.ps1` 或 `bash tools/qt.sh` 會直接開啟原生 ChipDraw 繪圖面板。`run chipchip` 與 `run chipdraw` 也使用同一入口。

## ChipDraw 原生主面板

原生主面板目前已接入矩形工具。後續繪圖工具接入同一個主視窗、工具欄與畫布。`--native-rectangle` 保留為舊指令的相容選項。點兩個對角或拖曳繪製，Esc 取消。在畫布按右鍵開啟浮動面板，可點選對角線、指定邊、直三角板或邊中點。平移可在浮動面板切換。左上短標題欄最左是關閉鍵，標題右側的空白可拖動主窗格。拖標題把手移動窗格，拖邊框或角落調整大小。Qt 工具面板可拖到畫板外；放手時只要邊框還有部分在外，就保留桌面位置。整個面板放回畫板內並放手，才恢復跟隨畫板。HTML 工具面板的拖曳與縮放限於畫板可見範圍。Linux 同時提供 Wayland 與 X11 時，預設使用 Qt xcb（XWayland）取得桌面座標；可透過 QT_QPA_PLATFORM 指定後端。純 Wayland 的視窗定位由合成器控制。完整 HTML 版可開啟 ChipDraw.html；桌面相容性對照可指定 `--web-baseline`。

HTML 與原生 Qt 共同執行 `shared/rectangle-editor.js` 和現有的 `ChipDrawingModel`。狀態機接受世界座標，管理草稿、預覽、確認、取消及歷史轉移。HTML 使用既有圖層與 SVG 視圖；Qt 用 Graphics View 繪製，新增與撤銷只更新受影響的物件。兩個適配層各自持有可還原的歷史快照，快照不跨平台交換。

Qt 的相容版本由現有 esbuild 從原始 JS 產生。修改圖形、計量、JSON 或矩形編輯模組後執行 `node tools/build-qt-model.mjs` 及 `node tools/build.mjs`。`node tools/build-qt-model.mjs --check` 會比對相容版本與原始碼。原生程式啟動只需要已產生的相容版本。

`desktop/qt/test_rectangle.py` 在同一平台重播 HTML 和原生 Qt 的滑鼠操作，逐步比較預覽邊界、單位、物件幾何、外觀及歷史；跨會話僅對應新建 ID，重做須還原原 ID。此測試也隨 Qt 測試入口執行。

執行 `./tools/qt.ps1 run pinview` 或 `bash tools/qt.sh run pinview` 會開啟原生管腳檢視器。使用文件選單開啟 PinView JSON，按 Enter 搜尋，點結果定位，點焊盤查看編號、名稱、分組與復用功能。拖動畫布可平移，滾輪可縮放。保存與另存使用 Qt 的安全檔案寫入，保留原始 PinView 欄位及單位，並保存選取與定位後的分組狀態。啟動展示檔首次保存會詢問位置。

管腳規則在 `pinview.js` 內，由 QJSEngine 本機執行。Qt Graphics View 維護場景索引、命中查詢和圖形繪製。原生入口目前支援單份 PinView、圓形與矩形焊盤；網頁完整功能可用 `main.py --app pinview --web-baseline`。ChipDraw 維持原入口。`qt.ps1 test` 和 `qt.sh test` 會先驗證兩個管腳示例的原生文件流程，再執行原有的 WebEngine 測試。

## 原有 WebEngine 基線

此階段用 PySide6 + Qt WebEngine 載入根目錄的離線 HTML，建立桌面相容性基線；尚未將業務介面改寫為 Qt Widgets／QML。計量、單位、選單、物件選項及浮動窗格均沿用既有共用模塊。

## 原生版方向與退出 WebEngine 的路線

本地版的目標是原生 Qt 應用。WebEngine 只作過渡相容性基線，現有測試通過代表 HTML 在 Qt 容器內可運作，不代表完成原生移植。後續功能的架構須能逐步移除 WebEngine，不能持續以網頁殼作為本地版的最終交付方式。

移植順序：

1. **固定資料與行為契約。** 以既有文件格式、撤銷／重做、計量標準代碼、精確分數、換算及修約規則建立共用驗證案例。語言資源與顯示文字逐步集中管理；網頁與原生介面共用穩定訊息 ID，翻譯不參與數值及歸檔語義。
2. **分離核心與介面依賴。** 接續 `shared/drawing-model.js`、`shared/json-store.js` 與 `shared/viewport-core.js` 已有的分層，整理文件、計量、幾何、吸附及命令介面；將 DOM、Canvas、SVG、localStorage 等依賴留在適配層。計量設定應由模型提供，不能讓核心透過 DOM 讀取設定。核心實作語言與橋接方式另行驗證，避免先鎖死成全部重寫。
3. **建立原生 Qt 的最小完整操作鏈。** 從 ChipDraw 的文件開啟／保存、原生畫布、平移／縮放、選取與一種基本圖形編輯開始，接上同一份文件模型與撤銷命令。這條操作鏈須能在不載入 HTML、不建立 WebEngine 視圖的情況下完成。
4. **逐項遷移共用介面與繪圖交互。** 為既有計量、座標、應用內選單、物件選項與窗格元件契約擴充原生後端，保留同一套規則與交互驗收案例，不新增獨立窗格類型或功能專用的計量規則。繪製步驟繼續在畫布完成；再遷移圖層、吸附、其餘圖形、ChipChip 與編輯器功能。
5. **移除 WebEngine。** 全部必要操作通過原生驗收後，移除生產啟動路徑、依賴與打包配置中的 WebEngine；網頁版可保留作為獨立產品及相容性比對基線。

每一步均須在 Windows 與 WSL2 Ubuntu 驗證。原生里程碑的通過條件包含：不載入網頁的完整操作鏈、文件往返一致、幾何與計量結果一致、共用窗格交互一致，以及實際桌面的鍵盤、指標、字型與縮放檢查。現有 `qt.ps1 test`／`qt.sh test` 屬於過渡 WebEngine 測試，不可用來代替原生里程碑驗收。

## Windows 啟動

需要 Python 3.10+（含 `py` launcher）；首次安裝需要網絡下載 Qt。

```powershell
./tools/qt.ps1 setup
./tools/qt.ps1 run chipdraw
./tools/qt.ps1 run chipchip
./tools/qt.ps1 test
```

依賴版本鎖定在 `requirements.txt`，環境位於 `.venv-qt`，不提交 Git。一般啟動使用具名 Qt WebEngine profile 儲存設定，與瀏覽器設定分開。測試使用不落盤的獨立 profile。

修改 `src/` 或 `shared/` 後先執行 `node tools/build.mjs`。Python 主程式按自身位置尋找專案，啟動不依賴目前工作目錄。

## WSL2 Ubuntu 啟動

在 WSL2 Ubuntu（啟用 WSLg）內進入專案：

```bash
cd /mnt/c/Users/mylit/Documents/ChatGPT/ChipChip
bash tools/qt.sh setup
bash tools/qt.sh test
bash tools/qt.sh run chipdraw
```

Linux 環境獨立存於 `.venv-qt-wsl`，不與 Windows 虛擬環境混用。需要 Python 3.10+、venv、Qt 所需的 Linux 顯示函式庫與中文字型。測試使用 WSLg 顯示實際視窗，不自動停用 Chromium sandbox。

Ubuntu 若缺少 X11 游標依賴，可安裝 `sudo apt-get install libxcb-cursor0`。若尚未安裝 Python venv 或中文字型，另安裝 `python3-venv`、`fonts-noto-cjk`。

Windows／Linux 截圖與報告分別放在 `.qt-test-output/windows/` 與 `.qt-test-output/linux/`，避免互相覆寫。

2026-11-08 已在 Windows 與 WSL2 Ubuntu 26.04.1（Python 3.14.4、Qt/PySide6 6.10.1、WSLg）實測，兩個應用的啟動及以下自動檢查均通過，並確認截圖可正常顯示中文字、畫布與共用窗格。Ubuntu 啟動仍有 EGL／Mesa 裝置初始化警告；本次測試與畫面成功，GPU 加速效能尚未驗證。

## 自動驗證範圍

`test` 依序在真正的 Qt WebEngine 載入兩個應用，檢查共用模塊、JavaScript console 錯誤、英文／繁體切換、計量設定與 localStorage 在語言切換前後不變；另開啟本地化量詞，驗證 `1/2 mm` 的標準代碼、精確分數歸檔及換算因子不變。失敗或逾時傳回非零退出碼。測試截圖與 UTF-8 JSON 報告輸出至 `.qt-test-output/`。這不是完整的幾何與歸檔格式回歸；原有驗證仍使用 `node tests/run.mjs`。

## 後續手動測試

- 兩應用的繪圖／管腳操作、滑鼠／觸控、縮放、旋轉及吸附。
- 共用窗格拖曳、縮放、四邊貼靠、取消及窄視窗；應用內選單鍵盤與焦點。
- 公英制、px、角度、精確分數、修約與本地化量詞；設定改動後同步顯示。
- 打開、保存、另存、新檔、下載路徑、Unicode 檔名及重啟後設定保留。
- Monaco 工作執行緒、剪貼簿及全螢幕相容性。

Qt 殼已接入下載另存對話框與全螢幕請求；開檔沿用 WebEngine 的檔案輸入支援。這些流程仍需以上手動測試。目前尚未提供原生文件系統橋接、安裝包或發行配置。先記錄 Qt 與瀏覽器行為差異，再決定需擴充的共用能力，避免在 Qt 殼內另建計量或窗格實作。

官方參考：[Qt for Python](https://www.qt.io/development/qt-framework/python-bindings)、[QWebEngineView](https://doc.qt.io/qtforpython-6/PySide6/QtWebEngineWidgets/QWebEngineView.html)。

