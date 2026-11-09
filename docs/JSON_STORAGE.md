# JSON 物件模型：issue #54 第一階段

實作依據：[GitHub #54](https://github.com/nurtasihram/ChipChip/issues/54)。本階段開始使用獨立於 SVG 的物件資料；不是整體檔案格式定案，也沒有啟用檔案保存或讀檔。

## 共用核心與介面

- `shared/drawing-model.js`：不依賴 DOM 的身份生成、資料檢查、幾何求解、部分隱式繼承、來源查詢、圖層模型及問題分類。
- `src/chipdraw/drawing-json.js`：模型與目前 SVG 畫布的投影適配層。SVG 只是顯示及既有編輯器的載體，公開 JSON 不包含 tag／attributes／data-* 包裝。
- `shared/json-store.js`：共用 JSON 資料邊界，拒絕循環引用、非有限數字等不能可靠保存的值；文件管理器仍只在記憶體操作。
- 物件屬性面板底下的「JSON 模型」按需展開，之後隨屬性與選取變更同步；只提供「保存」，按選取順序一對一替換，保留其他物件、圖層與圖稿標題，支援撤銷。

## 本階段的模型包

整體檔案版本尚未定義，共用核心暫以一次選取的模型包交換資料。下例包含核心上下文；物件屬性頁在單選時直接展示物件，多選時才以 items 陣列列出。保存支援這兩種形式並沿用文件上下文，不在編輯框重複列出 units_system：

```json
{
  "units_system": {
    "coordinate": "orth",
    "length": "metric",
    "length_approx": "mm",
    "angle": "deg",
    "color": "hex",
    "fraction_style": "float"
  },
  "items": [
    {
      "id": "example-rectangle",
      "name": "矩形",
      "type": "rect",
      "reference": "center",
      "point": [10, 4],
      "width": 8,
      "height": 8,
      "rotation": 0,
      "stroke": {
        "type": "dashed",
        "color": "#69b8ff",
        "width": 2,
        "pattern": [4, 2],
        "offset": 0,
        "linecap": "round",
        "linejoin": "round"
      },
      "fill": {"type": "none"}
    }
  ]
}
```

這是開發中的第一個可執行設定，不宣稱 issue 中所有候選枚舉已定案。座標 Y 向上，長度為文件統一的 mm，角度為 deg。物件不逐項帶單位。介面顯示單位與精度變更不改寫此儲存上下文；其他座標、色彩、計量與模式分數上下文暫要求經後續轉換流程處理，不能在這個屬性區靜默重新解讀。

## 已接入的幾何

- `point`：單一 `point: [x, y]`。
- `line`：`points` 恰為兩點。
- `polyline`：點簇，`closed` 可省略或為 false；true 時隱式閉合，不需重複起點。
- `polygon`：沿用共用類型代碼，天然閉合。
- `rect`：`reference` 可為 top-left／top-right／bottom-left／bottom-right／center／top／bottom／left／right，保存 point、width、height；亦可為 top-left-bottom-right／top-right-bottom-left，以兩個對角點保存。rotation 使用文件角度，當前設定以該參考點為旋轉基準。尺寸編輯固定參考點。
- `circle`：center-radius／center-diameter 使用 point 與 radius／diameter；center-point／three-points 使用 points。三點共線等無解情形保留原參數。由定義點推導的半徑不偽裝成可任意編輯的獨立參數；移動時定義點一起移動。
- 線與點簇預設 absolute；line／polyline／polygon 的 point_ref=start 表示第一點絕對，其餘點相對於第一點。

現有三階貝塞爾、一般 SVG path、橢圓、巢狀群組、幾何圓角矩形、非等距仿射變換等尚未全部接入。請求模型輸出時明確報告，不用 SVG 原文冒充新模型，也不靜默逼近或改變原圖形。貝塞爾結構檢查已區分 points／control_points；缺少控制點的模型可按折線降級顯示並保留 bezier 類型，完整二階逐段連接及其他圓弧選解仍待定義。

## 身份、繼承與來源

新物件分配隨機字串 ID，分配時用已使用集合檢查碰撞；即使隨機來源重複也會生成不重複結果。一般使用透過已綁定身份，不在每次讀取重新掃描文件。匯入／替換時檢查重複 ID 及與未選物件的身份衝突。撤銷與重新投影保留原身份。

新物件有名稱；既有模型缺少 id／name 不會在讀取時自動補寫。資料檢查回報缺省狀態；未提供、undefined、null 的物件欄位按缺省處理，歸檔優先省略。

stroke／fill 的部分缺省按「物件 → 圖層 → 軟件預設」解析。0 和 false 均保留。解析結果與儲存資料分開，不將繼承結果扇出到物件。來源可由共用 resolve／inspect 查詢；屬性控件亦提供來源提示。specialize 僅在明確指定欄位時實作該欄位，不另存繼承開關。

圖層 type 支援 art／vect／pcb／pcb_*，items 可缺省或為空，hiden 上層 true 不能由下層 false 抵消。PCB／矢線色彩強制採圖層來源，物件自身色彩保留並標為不生效。完整圖層染色可用性、跨圖層相容性轉換、互動修復選擇及來源面板仍需後續接入。encodeLayers 可產生圖層模型；物件屬性頁未選取物件時，直接顯示目前圖層模型（包含其 items）；保存可修改該圖層與物件，並以一次復原還原。圖層鎖定、身份衝突及未完成操作會阻止套用；不在此修改文件計量上下文或建立未指定用途的 PCB 圖層。

## 無解及錯誤資料

資料檢查與幾何求解分離。無解模型保留原始定義參數，畫布有座標時顯示 × 錯誤標記；沒有座標時只列在「模型問題」列表。點選列表可回到 JSON 模型修正。錯誤標記不偽裝成原圖形的線段或吸附幾何。

未知物件／染色欄位保留並提示。不能解析的 JSON、重複身份、不相容上下文及物件數量不匹配會在替換前拒絕；不影響目前圖稿。缺少控制點的降級、缺省身份、不可用染色與無解幾何各有不同問題代碼。

## 精度與後續範圍

所有新模型數值檢查與計量歸檔沿用共用介面，不套用顯示修約。已知參考點及尺寸的屬性操作直接更新作者模型，避免從 SVG 投影反求時改寫原值。原有 SVG 引擎的浮點投影限制仍存在；瀏覽器測試對投影採容差，但對作者模型中的已知中心使用精確相等檢查。

[Issue #55](https://github.com/nurtasihram/ChipChip/issues/55) 的模式分數、提示／儲存／轉換模式分離、精度污染標註與完整 units_system 尚未完成，不能把目前純量設定當作那個系統的完整實作。

## 驗證

- `node tests/drawing-model.test.mjs`：碰撞身份、參考幾何、隱式繼承及來源、零／缺省、明確特化、圖層及無解資料。
- `node tests/app.test.mjs`：選中物件模型、單一保存、屬性同步、局部替換、身份往返、繼承不扇出、中心尺寸約束、無解保留與撤銷。
- `node tests/drawing-model.browser.mjs`：Chromium 真實 SVG 矩陣下的旋轉矩形、定義點、部分繼承、無解標記及無座標問題列表。可用 CHIPDRAW_BROWSER 指定 Chromium 執行檔。
- `node tests/run.mjs`：完整自動測試。
- `node tools/build.mjs`：重建離線 HTML。

## Monaco JSON 編輯器

屬性頁與 PinView JSON 視窗使用 VS Code 同源的 Monaco Editor 0.57.0，提供語法高亮、行號、括號配對、摺疊、搜尋、撤銷／重做與 JSON 診斷。共用 ChipCodeEditor 將編輯器放在 Shadow DOM，隔離應用表單樣式及畫布快捷鍵；外層讀寫透過元件 value 介面。

JSON 模型數值欄位維持 JSON number，座標、尺寸、角度與描邊量值不以字串預設呈現。JSON Schema 提供數值類型診斷，null 仍依 issue #54 視作缺省；幾何正確性與無解資料保留仍由共用繪圖模型判定。

Monaco 的 ESM 執行程式、CSS、字型及 editor／JSON worker 均封裝在 vendor/monaco，再內嵌進離線 HTML。worker 使用本頁建立的 Blob，不請求 CDN、遠端 schema 或相對檔案；單一 HTML 複製到其他資料夾後仍可離線使用。授權與版本見 vendor/monaco。

node tests/json-editor.browser.mjs 以 CHIPDRAW_PLAYWRIGHT／CHIPDRAW_BROWSER 指定瀏覽器測試環境，驗證離線工作執行緒、數值類型、鍵盤隔離、保存、屬性同步與窄窗縮放。

物件屬性頁的 JSON 模型不顯示操作說明與正常同步／保存提示。保存採 SVG 圖示按鈕，編輯時即時檢查；無法套用時按鈕變紅並顯示原因，修正後恢復正常。

## 繪製方式與 JSON（2026-11-08）

矩形工具的 SVG 方式按鈕沿用共用物件登錄表及 optionModel。九種參考點方式保留 point、width、height；兩種對角方式只保存按名稱順序排列的 points，不額外扇出推導出的寬高。rotation 為模型角度，繪製時沿用目前畫面橫軸方向，鏡像視圖仍投影為非鏡像的幾何模型；後續尺寸修改固定指定參考點。

圓弧模型 type=arc，點為 Y 向上、mm 的數值陣列，角度為 deg 數值，不保存 SVG 屬性：

| reference | 原始定義 |
|---|---|
| center-start-end | points=[圓心,起點,終點]；direction=ccw/cw。繪製時終點方向點先投影到圓上再保存；JSON 中不等半徑的端點會保留並報錯 |
| center-start-sweep | points=[圓心,起點]，sweep（有正負號） |
| three-points | points=[起點,途經點,終點] |
| endpoints-radius | points=[起點,終點]，radius，side=1/-1，large=false/true |
| endpoints-sagitta | points=[起點,終點]，sagitta（帶符號） |
| start-tangent-end | points=[起點,終點]，angle（起始切線角） |
| two-tangents | points=[切點1,切點2]，angles=[切線角1,切線角2]，direction=ccw/cw |
| center-radius-start-sweep | point=圓心，radius，angle=起始角，sweep |

side 指沿起點到終點方向的圓心側：圖稿正交座標中左為 1、右為 -1；large 控制大／小弧。弓高正值在有向弦左側，負值在右側。掃角逆時針為正、順時針為負，允許非零且絕對值不超過一周；一周用兩段 SVG A 指令投影。closed 為 none（可省略）、chord 或 sector，不接受布林值。

所有方式共用求解、SVG 投影、計量輸入、窗格與 JSON 模型。無解的 JSON 仍保留原定義並顯示錯誤標記；無解的互動草稿不建立假圖形、不增加復原記錄。繪製完全在畫布內完成：圓心模式依序放置圓心及半徑起點，再移動決定終點或掃角；兩端點／半徑模式的第三個弧上點動態決定半徑及大小弧；弓高由第三點在弦法線上的投影決定；雙切點的第三點決定第一點切向，第二點切向由同一圓弧連動求出並保存。禁止以物件屬性面板指派動態繪製參數。矩形與圓弧的方式提示以共用提示組件在文字下方呈現 SVG 步驟動畫。沿兩段貝塞爾滑動求解或以兩物件及半徑求相切弧尚未接入。原有 SVG 檔案讀寫流程不在這一階段擴充，幾何 reference 的往返驗證使用屬性頁 JSON 模型。

驗證：node tests/construction.test.mjs、node tests/construction.browser.mjs、node tests/arc.browser.mjs。
