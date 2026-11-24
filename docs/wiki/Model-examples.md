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

這是目前已實作的模型包。其他幾何、圖層、身份、樣式繼承與錯誤處理規則見[繪圖 JSON 模型規範](https://github.com/nurtasihram/ChipChip/blob/main/docs/reference/JSON_STORAGE.md)。面板的拖動位置、停靠及收起目前屬於各平台的執行狀態，尚無共用的窗格歸檔格式。

按鈕、語言包及交互映射可對照[共用 UI 定義](https://github.com/nurtasihram/ChipChip/blob/main/shared/ui-definitions.js)。
