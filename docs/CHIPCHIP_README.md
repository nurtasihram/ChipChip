# ChipChip

**ChipChip** 是面向電子封裝與晶片管腳資料的互動視覺化專案。目前的主要介面是 **PinView**：可離線執行、手機及桌面可使用的單檔 HTML 管腳視圖工具。

> 狀態：開發原型（v23 後視圖修訂）。已發佈於 https://github.com/nurtasihram/ChipChip 。

## 立即使用

直接以瀏覽器開啟 [`index.html`](index.html)，不需要伺服器、安裝程序或網路。手機上可將 HTML 存到本機後用支援 JavaScript 的瀏覽器開啟。

## 目前功能

- **封裝圖**：內建 Intel Atom E38xx FCBGA1170 管腳分佈，支援載入 STM32F103C8Tx LQFP48 等 PinView JSON。
- **視圖操作**：平移、縮放、旋轉、翻轉、格線、原點、比例尺、顏色及線寬。
- **管腳資料**：搜尋、分組、顏色管理、管腳資訊與多功能管腳列表。
- **工作區**：可調大小的底部分組欄、設定面板、可拖動的資訊／比例尺氣泡。
- **多圖紙**：MDI 文件切換與文件狀態管理。
- **檔案**：JSON 打開、保存、另存及 PinView 格式匯出（具體能力依介面實作）。
- **語言**：漢文與 English。
- **全螢幕**：支援瀏覽器 Fullscreen API 的環境可切換。

## 專案結構

```text
ChipChip/
├── index.html                 # 最新 PinView 應用（含視圖系統修訂）
├── examples/                  # E38xx、STM32F103C8Tx JSON 示例
├── docs/PINVIEW_FORMAT.md     # PinView 格式草案
├── README.md                  # 本文
├── CHANGELOG.md               # 版本變更摘要
└── .git/                      # 本地 Git 提交歷史（v5–v23）
```

## 開發與版本管理

此倉庫的提交按**可取得的 HTML 快照**逐版建立，每個提交都將 `index.html` 更新到對應版本。查看版本：

```bash
git log --oneline
git show HEAD~1:index.html > previous.html
git diff HEAD~1 HEAD -- index.html
```

目前預設分支 `main` 包含 v23 後的視圖系統修訂，詳見 [`CHANGELOG.md`](CHANGELOG.md)。遠端倉庫為 https://github.com/nurtasihram/ChipChip 。

## 資料格式

參閱 [`docs/PINVIEW_FORMAT.md`](docs/PINVIEW_FORMAT.md)。草案涉及 `title`、`description`、`author`、`package_name`、`pins`、`measure_units`、`measure_types`、`pad_samples`、`pinouts` 等欄位。格式仍在演進，舊 JSON 的欄位可能與草案不同。

## 相容性與已知問題

- Android 的本機檔案 `content://` 及全螢幕權限可能受瀏覽器限制。
- 部分 Android GPU／Canvas 組合可能發生格線重繪殘影，已加入裁切與數量限制，但仍需實機測試。
- 分欄拖動、浮動氣泡邊界、MDI 切換、比例尺自動隱藏及 DPI 適配均應持續進行跨端測試。

## 來源與使用說明

E38xx 管腳資料參考 Intel E3800 Datasheet Rev. 4.3；STM32 範例是專案測試資料，正式電路設計前請對照原廠資料手冊核實。

本專案採用 MIT License；原有說明中的「尚未設定正式開源授權」已過時；若要公開散布或接受外部貢獻，應先確定程式碼與資料的授權條件。