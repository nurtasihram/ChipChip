# ChipDraw 已定義的 JSON 模型

## 按鈕定義

以下是「對角線」按鈕在共用 UI 登錄表中的完整項目。HTML 與 Qt 以同一個鍵取得定義。

```json
{
  "rect.diagonal": {
    "action": "diagonal",
    "alt": "rect.diagonal",
    "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"tool-icon\" viewBox=\"0 0 32 32\" aria-hidden=\"true\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\"><rect x=\"6\" y=\"8\" width=\"20\" height=\"16\"/><path d=\"M6 8 26 24\" stroke-dasharray=\"2 2\"/><circle cx=\"6\" cy=\"8\" r=\"2.3\" fill=\"#ffd166\" stroke=\"#172438\" stroke-width=\".8\"/><circle cx=\"26\" cy=\"24\" r=\"2.3\" fill=\"#ffd166\" stroke=\"#172438\" stroke-width=\".8\"/></svg>",
    "hint": "rect.diagonal.steps",
    "visual": {
      "kind": "animation",
      "id": "diagonal"
    }
  }
}
```

| 欄位 | 約定 |
| --- | --- |
| `action` | 必填。關聯操作的穩定代碼。此處選用對角線畫法。 |
| `alt` | 必填。各支援語言都要提供的替代文字鍵。圖示不可用時，按鈕直接顯示該文字。 |
| `svg` | 選填。按鈕本身的 SVG 圖形。 |
| `hint` | 選填。操作提示的語言鍵；矩形畫法解析成有順序的步驟。 |
| `visual` | 選填。附在提示文字下方的圖形或動畫。本例以 `kind` 和 `id` 指向對角線示範。省略此欄位時，氣泡只顯示文字。 |

## 本地語言包

以下節錄同一按鈕用到的全部語言項目。切換語言會替換名稱和步驟；動作碼始終為 `diagonal`。

```json
{
  "zh-Hant": {
    "rect.diagonal": "對角線",
    "rect.diagonal.steps": [
      "指定起點",
      "指定對角點"
    ]
  },
  "en": {
    "rect.diagonal": "Diagonal",
    "rect.diagonal.steps": [
      "Place the first corner",
      "Place the opposite corner"
    ]
  }
}
```

## 輸入與交互

外層鍵是按鈕交互，每項將裝置對應到輸入訊號。數位筆可懸停，長按觸發次點。長按或拖動結束會消耗本次單點。鍵盤目前支援焦點、啟用和選單鍵。

```json
{
  "hover": {
    "mouse": "hover",
    "pen": "hover",
    "keyboard": "focus"
  },
  "primary": {
    "touch": "tap",
    "mouse": "tap",
    "pen": "tap",
    "keyboard": "activate"
  },
  "secondary": {
    "touch": "hold",
    "mouse": "secondary",
    "pen": "hold",
    "keyboard": "menu"
  },
  "drag": {
    "touch": "move",
    "mouse": "move",
    "pen": "move"
  }
}
```

## 圖稿物件的連接

ChipDraw 所有圖稿物件一律嚴禁使用外置獨立關聯表。此禁令涵蓋物件之間的關係及物件內部錨點的連結，在記憶體、JSON 文件和資料庫中均適用。每個物件必須由自身完整的公開模型獨立解讀，嚴禁以跨物件 ID 引用、隱藏欄位或附屬記錄補足連結語義。

打斷是獨立的 drawing.action。打斷與熔斷提交時移除來源物件，每個結果都是具備新 ID 的完整物件，即使只產生一件也一樣。物件內錨點的連結只由既有公開幾何（點序、控制點與類型的閉合規則）表達，嚴禁在記憶體、文件或資料庫中另建錨點連結模型或關聯表。

連節直接產生接合後的完整幾何；打斷直接產生分割後的完整物件。子線選取時使用的來源物件和子段索引只供當次編輯定位。

## 繪圖物件與計量上下文

下例由共用矩形狀態機依次放置世界座標 [0, 0] 和 [8, 4] 產生，物件 ID 換為固定示例值。圖稿用 `units_system` 描述計量上下文，用 `items` 保存完整物件。長度為 mm，角度為度，Y 軸朝上。

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
      "reference": "diagonal",
      "points": [
        [
          0,
          0
        ],
        [
          8,
          4
        ]
      ],
      "rotation": 0,
      "stroke": {
        "type": "solid",
        "color": "#69b8ff",
        "width": 2,
        "offset": 0,
        "linecap": "round",
        "linejoin": "round"
      },
      "fill": {
        "type": "none"
      }
    }
  ]
}
```

這是目前已實作的模型包。其他幾何、圖層、身份、樣式繼承與錯誤處理規則見[繪圖 JSON 模型規範](https://github.com/nurtasihram/ChipChip/blob/main/docs/JSON_STORAGE.md)。面板的拖動位置、停靠及收起目前屬於各平台的執行狀態，尚無共用的窗格歸檔格式。

按鈕、語言包及交互映射可對照[共用 UI 定義](https://github.com/nurtasihram/ChipChip/blob/main/shared/ui-definitions.js)。

## 使用指南

ChipChip 預設開啟 ChipDraw 繪圖板。HTML 版提供完整的網頁繪圖工具；原生 Qt 版目前已接入矩形編輯流程。

### 第一次畫矩形

1. **HTML**：在下載的專案中雙擊 `ChipDraw.html`，從浮動工具列選擇矩形。**Qt**：啟動原生主程式後，在畫板上按滑鼠次鍵，打開「矩形畫法」面板。
2. 選「對角線」。在畫板上點第一角，移動指標查看預覽，再點對角完成矩形。預覽期間可按 Esc 取消。
3. 其他畫法會改變指定點的次序。可依序指定一條邊的兩端與垂直尺寸、指定對角線兩端與直角頂點，或從邊中點決定半寬與高。把指標停在畫法按鈕上，可查看步驟與示範。

### 移動和收起面板

| 操作 | HTML | 原生 Qt |
| --- | --- | --- |
| 移動 | 拖面板標題或工具列把手，移動範圍限於畫板內。 | 拖標題移動窗格。主窗格的短標題右側留有拖動區。 |
| 調整大小 | 拖展開面板的四邊或四角。 | 拖窗格四邊或四個圓角。全螢幕時停用調整入口。 |
| 收起與恢復 | 一般面板收成小圖示，點圖示展開。畫法工具列點自己的把手收回，由來源工具按鈕重新展開。 | 矩形畫法面板點收起後隱藏。在畫板上按次鍵可再次叫出。 |
| 停靠或跟隨 | 浮動工具列靠近相應邊緣時會顯示停靠預覽。一般面板可釘選，未釘選的面板展開後，點到外面會自動收起。 | 子面板可拖到桌面。放手時只要還有部分在板外，就保留桌面位置；整個窗格回到板內並放手後，才恢復跟隨畫板。 |

### 按鈕和提示氣泡

矩形畫法按鈕在兩端共用動作碼、SVG 圖示、繁中與英文替代文字及操作提示。圖示無法顯示時，按鈕顯示替代文字。提示氣泡可以只有文字，也可以在文字下面加入圖形或示範動畫。

| 交互 | 滑鼠 | 觸控 | 數位筆 | 鍵盤 |
| --- | --- | --- | --- | --- |
| 懸停 | 移入 | — | 筆尖懸停 | 移入焦點 |
| 單點 | 主鍵點擊 | 輕點 | 點按 | Enter 或空白鍵 |
| 次點 | 次鍵點擊 | 長按 | 長按 | 選單鍵或 Shift+F10 |
| 拖動 | 按住移動 | 按住移動 | 按住移動 | — |

這是按鈕可辨識的輸入。各工具決定次點或拖動對應的動作。長按或拖動結束後會消耗該次單點。

### 兩端如何共用編輯行為

HTML 和 Qt 把畫布輸入換算為世界座標，交給同一份 JavaScript 矩形狀態機處理草稿、預覽、確認與取消。HTML 以 SVG 呈現圖稿，Qt 使用 QJSEngine 執行共用模型，並以原生 Graphics View 繪製。歷史狀態轉移保留在模型中；SQLite 版本控制與獨立歷史工具尚未提供。

完整啟動指令及相容性測試見 [Qt 說明](https://github.com/nurtasihram/ChipChip/blob/main/desktop/qt/README.md)。網頁繪圖工具的詳細操作見 [繪圖工具說明](https://github.com/nurtasihram/ChipChip/blob/main/docs/DRAWING_TOOL_INTERACTIONS.md)。
