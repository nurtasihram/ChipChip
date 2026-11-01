# ChipChip / ChipDraw 共用工作區

兩個工具在同一個 Git 專案與 main 分支維護，共用一份底層視圖及格線引擎。

## 原始碼與產物

- shared/viewport-core.js：唯一的視圖與格線核心。
- shared/workspace-ui.js：共用標題欄、檔案選單、設定面板模板與選項控制器。
- shared/workspace-ui.css：共用 UI 樣式與面板釘選／調整大小。
- src/chipchip/index.html：ChipChip 介面、管腳資料與適配層。
- src/chipdraw/index.html：ChipDraw 介面、SVG 編輯工具與適配層。
- tools/build.mjs：由同一份核心產生 ChipChip.html 與 ChipDraw.html。
- tests/run.mjs：執行核心、共用 UI 行為與完整應用啟動檢查。
- 根目錄的兩個 HTML 為可離線開啟的產物，請勿直接修改。

開發時亦可直接開啟 src/ 中的 index.html，兩者以相對路徑載入同一份共用庫；不需伺服器或第三方依賴。修改後使用 Node.js 執行 npm run build；驗證使用 npm test。

## 目前共用的邏輯

Camera 負責世界／畫面座標互換、可視範圍、平移、指定位置縮放／旋轉，以及 SVG 轉換矩陣。世界座標統一為 Y 向上，長度使用 mm，角度使用弧度。

gridGeometry 統一產生正交／極座標、線／點、方向／虛線、螺旋、有限範圍／鋪滿及密度限制；drawGrid 是兩個工具共用的 Canvas 格線與原點繪製器。snap 與 units 提供共用吸附和單位定義。

ChipChip 的既有 Canvas 直接使用 Camera；ChipDraw 使用共用 Canvas 格線背景與 SVG 內容層，其舊文件 Y 向下的座標由適配層轉換，不改動原始物件資料。ChipDraw 的平移與雙指縮放亦改用 Camera，避免旋轉後拖動方向不正確。

兩邊的視圖／格線面板、標題欄、檔案選單與基礎 UI 樣式均由 shared/workspace-ui.js 和 shared/workspace-ui.css 提供。面板選項以同一個 bindViewGrid 控制器處理；應用只提供 read/write、角度／鏡像、重繪等適配方法。

單位換算、間距連動、角度輸入、格線方向三態、面板釘選及調整大小、選單開合／鍵盤操作、全螢幕及共用語言切換只實作一次。自動隱藏時長設定也由共用庫管理，不再覆寫全域 setTimeout。

各工具的文件資料與文件操作仍由應用處理；ChipChip 的焊盤／分組面板及多文件列表、ChipDraw 的繪圖動作，透過具名插槽擴充共用介面。原始碼內不再保留獨立的視圖／格線 HTML 或樣式。繪圖核心仍不讀取 DOM。

## 驗證

已驗證座標往返、鏡像、縮放／旋轉錨點、旋轉後可視範圍、格線裁切／密度、四種格線模式、吸附、兩邊適配層投影一致與兩個離線產物的語法。另以 DOM 測試替身執行兩個應用的完整初始化，確認旋轉只觸發一次，以及 ChipDraw 的兩次單點與拖動繪圖。共用 UI 測試會對兩個應用施加同一組操作，比較最終設定結果，並檢查掛載後的面板內容一致與 ID 無重複。

實際瀏覽器視覺與手機觸控回歸尚未完成。先前瀏覽器自動操作因工具無法確認網址而停止。

## ChipDraw 操作

直線／矩形／橢圓支援拖動或兩次單點繪製；Esc 取消。折線以 Enter／雙擊完成，Delete 刪除選取物件。工具欄支援貼邊轉向，移動會重置 0.5 秒貼靠期限，高亮預覽對應工具欄實際大小。

## 來源與授權

ChipChip 來源：https://github.com/nurtasihram/ChipChip 。本次接入以 2026-11-01 桌面 ChipChip/index.html 為基線；保留其既有介面與專案資料讀寫。MIT 授權全文位於 LICENSE.ChipChip。

revision-review/ 與 ChipChip_view_revision_ready.zip 為既有未追蹤參考資料，未改動，亦非正式原始碼來源。
