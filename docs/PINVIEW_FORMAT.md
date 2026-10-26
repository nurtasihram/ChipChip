# PinView JSON 格式草案

本文件記錄目前討論過的資料格式設計方向，**不是已凍結的正式標準**。實際讀寫支援以 `index.html` 的編解碼器為準。

| 欄位 | 說明 |
|---|---|
| `title` | 顯示標題，字串 |
| `description` | 描述、註文，字串 |
| `author` | 製作者資訊，可包含名稱、公司、聯絡方式、時間等 |
| `package_name` | 封裝名稱，例如 FCBGA、LQFP、QFN |
| `pins` | 正整數管腳數 |
| `measure_units` | 字串長度單位，或包含 `length`、`angle` 的映射 |
| `measure_types` | 可選、未來擴充，預設 `orth`，可規劃 `polar` |
| `pad_samples` | 命名焊盤樣本映射，或樣本陣列 |
| `pinouts` | 管腳映射，包含位置、焊盤類型、功能、參數及註解 |

預設座標系為**笛卡兒座標、mm、角度制**。`position` 一般為二維數組；特殊座標可為 map，依 `measure_types` 判斷。`pad_samples` 支援圓、矩形等基本形狀及 SVG 擴充。`pad_type` 指向樣本名稱或索引；只有一種焊盤時可省略，預設索引 0。`func_name` 可為字串、`null`、字串陣列或結構化映射。`desc` 可為字串或依語言代碼映射的描述。`para` 留作後續功能參數。

注意：現存範例可能使用較早的欄位名稱或相容格式，請勿把草案視為已全面實作的保證。
