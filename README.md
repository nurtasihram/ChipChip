# ChipChip / ChipDraw 共用工作區

兩個工具在同一個 Git 專案與 main 分支維護，共用一份底層視圖及格線引擎。

入口：[ChipChip](index.html) · [ChipDraw](ChipDraw.html)

原 ChipChip 專案說明保留於 [docs/CHIPCHIP_README.md](docs/CHIPCHIP_README.md)。

## 原始碼與產物

- shared/viewport-core.js：唯一的視圖與格線核心。
- shared/ring-gesture.js：共用環模式旋轉／縮放，兩條參考線與中心點。
- shared/bubbles.js：以 ChipChip 為基準的共用氣泡、比例尺／方向指示器模板及內容渲染。
- shared/workspace-ui.js：共用標題欄、檔案選單、設定面板模板與選項控制器。
- shared/workspace-ui.css：共用 UI 樣式與面板釘選／調整大小。
- src/chipchip/index.html：ChipChip 介面、管腳資料與適配層。
- src/chipdraw/index.html：ChipDraw 介面、SVG 編輯工具與適配層。
- tools/build.mjs：由同一份核心產生 ChipChip.html、ChipDraw.html 及 GitHub Pages 入口 index.html。
- tests/run.mjs：執行核心、共用 UI 行為與完整應用啟動檢查。
- 根目錄的兩個 HTML 為可離線開啟的產物，請勿直接修改。

開發時亦可直接開啟 src/ 中的 index.html，兩者以相對路徑載入同一份共用庫；不需伺服器或第三方依賴。修改後使用 Node.js 執行 npm run build；驗證使用 npm test。

## 目前共用的邏輯

Camera 負責世界／畫面座標互換、可視範圍、平移、指定位置縮放／旋轉，以及 SVG 轉換矩陣。世界座標統一為 Y 向上，長度使用 mm，角度使用弧度。

gridGeometry 統一產生正交／極座標、線／點、方向／虛線、螺旋、有限範圍／鋪滿及密度限制；drawGrid 是兩個工具共用的 Canvas 格線與原點繪製器。snap 與 units 提供共用吸附和單位定義。

ChipChip 的既有 Canvas 直接使用 Camera；ChipDraw 使用共用 Canvas 格線背景與 SVG 內容層，其舊文件 Y 向下的座標由適配層轉換，不改動原始物件資料。ChipDraw 的平移與雙指縮放亦改用 Camera，避免旋轉後拖動方向不正確。

兩邊的視圖／格線面板、標題欄、檔案選單與基礎 UI 樣式均由 shared/workspace-ui.js 和 shared/workspace-ui.css 提供。面板選項以同一個 bindViewGrid 控制器處理；應用只提供 read/write、角度／鏡像、重繪等適配方法。

單位換算、間距連動、角度輸入、格線方向三態、面板釘選及調整大小、選單開合／鍵盤操作、全螢幕及共用語言切換只實作一次。自動隱藏時長設定也由共用庫管理，不再覆寫全域 setTimeout。

比例尺與方向指示器由 ChipBubbles 掛載，保留 ChipChip 基線：比例尺右下、透明方向指示器左上。移除 ChipDraw 後加的公共狀態氣泡與滑鼠座標讀值；管腳資訊氣泡亦使用同一個 Bubble 類別。拖動、邊界限制、釘選、關閉、動作按鈕顯示及淡出計時由共用元件管理，應用提供 Camera 與其專屬內容。比例尺與正交／極座標方向圖形的計算也只保留一份。

各工具的文件資料與文件操作仍由應用處理；ChipChip 的焊盤／分組面板及多文件列表、ChipDraw 的繪圖動作，透過具名插槽擴充共用介面。原始碼內不再保留獨立的視圖／格線 HTML 或樣式。繪圖核心仍不讀取 DOM。

## 驗證

已驗證座標往返、鏡像、縮放／旋轉錨點、旋轉後可視範圍、格線裁切／密度、四種格線模式、吸附、兩邊適配層投影一致與兩個離線產物的語法。另以 DOM 測試替身執行兩個應用的完整初始化，確認旋轉只觸發一次，以及 ChipDraw 的兩次單點與拖動繪圖。共用 UI 測試會對兩個應用施加同一組操作，比較最終設定結果，並檢查掛載後的面板內容一致與 ID 無重複。

共用氣泡的行為以 ChipChip 為唯一基準，不從後來的 ChipDraw HUD 推導。tests/fixtures/chipchip-bubble-baseline.js 凍結 Git 3ab6cab 的 ChipChip 比例尺和方向圖形實作，用於跨單位、縮放及座標系的差異測試。

另有氣泡回歸檢查：兩邊內容一致、定時淡出、釘選、關閉／重開、拖動取消與視窗縮小後的邊界校正。

實際瀏覽器視覺與手機觸控回歸尚未完成。先前瀏覽器自動操作因工具無法確認網址而停止。

## ChipDraw 操作

直線／矩形／橢圓支援拖動或兩次單點繪製；Esc 取消。折線以 Enter／雙擊完成，Delete 刪除選取物件。工具欄支援貼邊轉向，移動會重置 0.5 秒貼靠期限，高亮預覽對應工具欄實際大小。

## 來源與授權

ChipChip 來源：https://github.com/nurtasihram/ChipChip 。本次接入以 2026-11-01 桌面 ChipChip/index.html 為基線；保留其既有介面與專案資料讀寫。MIT 授權全文位於 LICENSE.ChipChip。

revision-review/ 與 ChipChip_view_revision_ready.zip 為既有未追蹤參考資料，未改動，亦非正式原始碼來源。
## 環模式旋轉／縮放

兩個工具使用同一個 ChipRing 控制器。按住滑鼠中鍵拖出第一條基準線，放開中鍵後移動游標調整第二條對稱線，再點滑鼠主鍵確認。藍色基準線使用 ρ 軸配色，綠色調整線使用 θ 軸配色，白色中心點為環心；顏色統一定義於 ChipViewport.colors。

釋放基準線後顯示黃色延長線與縮放比。圓弧連接基準線端點及調整方向在基準半徑上的對應端點，按角度設定（角度／弧度／時分秒及精度）標示旋角。確認或取消會隱藏 SVG 提示層並清空標註，避免殘留。

雙指按下建立基準，移動雙指顯示調整線及中點位移；雙指全部釋放後才套用旋轉、縮放和平移。第一指釋放後凍結預覽，直到第二指釋放。Esc、指標取消或視窗失焦會取消預覽。

基準與調整線的夾角決定旋轉，長度比決定縮放；錨點在變換後保持於環心，觸控則跟隨雙指中點位移。預覽期間不變換畫布，也不修改圖形或增加繪圖撤銷紀錄。扇模式尚未實作。

圓弧末端的綠色切向箭頭表示實際旋轉方向。圓弧刻度讀取極座標 θ 間距、遞進／等分與周數設定，刻度標籤沿用角度單位及精度；密度過高時只顯示設定間距的整數倍刻度，避免文字重疊。箭頭、刻度及標籤隨操作完成或取消一併清除。

時分秒模式的圓弧改用錶盤刻度：每圈 12 個時刻大刻度、60 個小刻度，標籤從基準方向的 12 開始，按旋轉方向顯示 1、2…或 11、10…；僅繪製當前圓弧涵蓋部分。旋角主標註仍使用設定的時分秒精度。
