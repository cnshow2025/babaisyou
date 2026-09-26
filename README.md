# Baba Is You 網頁版

致敬《Baba Is You》（Arvi Teikari／Hempuli）的網頁版規則解謎遊戲，共 20 關。
純 HTML + CSS + JavaScript，不需要安裝或建置，所有圖像皆以 Canvas 程式繪製。

## 開始遊玩

直接用瀏覽器開啟 `index.html` 即可，也可以放到 GitHub Pages 上遊玩。

| 按鍵 | 功能 |
|------|------|
| 方向鍵／WASD | 移動 |
| 空白鍵 | 等待一回合 |
| Z | 復原（可以無限次） |
| R | 重新開始這一關 |
| Esc | 回到關卡選單 |
| Enter | 過關後進入下一關 |

手機上可以用畫面下方的方向鍵，或直接在棋盤上滑動。過關進度會儲存在瀏覽器中。

## 規則

文字方塊由左到右或由上到下排成句子時，規則就會生效：

- **名詞**：BABA、KEKE、FLAG、WALL、ROCK、WATER、SKULL、LAVA、KEY、DOOR、GRASS、TEXT
- **連接詞**：IS、AND、NOT、HAS、ON、NEAR、FACING
- **屬性**：YOU、WIN、STOP、PUSH、PULL、DEFEAT、SINK、HOT、MELT、OPEN、SHUT、MOVE、FLOAT、WEAK、TELE、SHIFT

進階語法範例：

- `ROCK IS FLAG`：物體變形；`BABA IS BABA` 可防止被變形
- `BABA AND KEKE IS YOU`、`FLAG IS WIN AND PUSH`
- `WALL IS NOT STOP`：NOT 會推翻相反的規則
- `ROCK HAS KEY`：石頭被摧毀時會留下鑰匙
- `ROCK ON GRASS IS FLAG`、`ROCK NEAR SKULL IS KEY`、`BABA FACING FLAG IS WIN`：條件式規則

## 關卡

| 關卡 | 主題 |
|------|------|
| 1–4 | YOU、WIN、PUSH、STOP，拆掉規則與組成規則 |
| 5–8 | 更換 YOU、`BABA IS WIN`、SINK、DEFEAT |
| 9–12 | HOT／MELT、OPEN／SHUT、物體變形、AND |
| 13–17 | NOT、HAS、MOVE、PULL、TELE 與 FLOAT |
| 18–20 | 條件式規則 ON、FACING、NEAR，以及 SHIFT 綜合關卡 |

## 專案結構

```
index.html        頁面、關卡選單與規則說明
style.css         樣式
js/engine.js      遊戲引擎：規則解析、移動、互動判定（不依賴 DOM）
js/levels.js      20 個關卡的地圖資料
js/render.js      Canvas 繪圖與移動動畫
js/main.js        輸入、復原、過關流程與進度儲存
tools/verify.js   關卡驗證工具
tools/solutions.json  每一關的參考解法（有雷！）
```

## 驗證關卡

每一關都有一組參考解法，可以用 Node.js 讓引擎實際跑一遍，確認每一關都能過關：

```bash
node tools/verify.js          # 驗證全部關卡
node tools/verify.js 7 -v     # 逐步印出第 7 關的盤面與規則
```

## 新增關卡

在 `js/levels.js` 的 `LEVELS` 陣列中加入新的地圖。每個字元代表一格：

- 物體（小寫）：`b` baba、`k` keke、`f` flag、`w` wall、`r` rock、`~` water、`s` skull、`l` lava、`y` key、`d` door、`g` grass
- 名詞文字：`B` `K` `F` `W` `R` `A`(WATER) `S` `L` `Y`(KEY) `D` `G` `T`(TEXT)
- 連接詞：`=` IS、`&` AND、`!` NOT、`H` HAS、`O` ON、`N` NEAR、`C` FACING
- 屬性：`U` YOU、`V` WIN、`X` STOP、`P` PUSH、`Q` PULL、`E` DEFEAT、`I` SINK、`1` HOT、`2` MELT、`3` OPEN、`4` SHUT、`M` MOVE、`5` FLOAT、`6` WEAK、`7` TELE、`8` SHIFT

新增關卡後，記得在 `tools/solutions.json` 補上解法（`U` `D` `L` `R` 移動、`W` 等待），並執行驗證工具。
