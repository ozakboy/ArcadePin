# ArcadePin — 霓虹彈珠台

一款以 **HTML5 Canvas + ES6 模組** 打造的復古街機風格網頁彈珠台。
純前端、免伺服器（Serverless）、開源，採用「雲端 GitHub JSON + 本地 IndexedDB」雙軌排行榜架構。

依據《ArcadePin 專案開發計畫書 V6》實作，涵蓋四個階段：

| 階段 | 內容 | 實作位置 |
| --- | --- | --- |
| Phase 1 原型驗證 | Canvas、固定步長 Game Loop、重力、彈片（Flipper）、剛體反彈 | `js/game.js` `js/physics.js` `js/entities.js` |
| Phase 2 本地儲存 | 圓形彈撞器（Bumper）、連擊 Combo 計分、匿名代號、IndexedDB 永久個人紀錄 | `js/table.js` `js/storage.js` |
| Phase 3 雲端排行 | 霓虹發光特效、Web Audio 音效、全網排行榜 UI、GitHub 雙軌 JSON 讀寫與自動分檔 | `js/leaderboard.js` `js/audio.js` `js/ui.js` `scripts/process_score.mjs` |
| Phase 4 安全開源 | 時間戳記、防作弊雜湊（FNV-1a 簽章）、GitHub Pages 部署 | `js/utils.js` `.github/workflows/` |

## 遊戲特色

- **600×1000 大檯面**，配置 **12 個彈簧點（Bumper）** 與 **2 個黑洞**。
- **黑洞**：球被吸入後短暫停留，再朝上半隨機方向**強力彈射**出來（`js/physics.js` 的 black-hole 系列函式）。
- **出生點單向閘門**：球離開發射軌後無法再彈回發射軌（`table.js` 的 `oneWay` 線段）。
- **高難度物理**：重力 2200、球速上限 2500、短彈片造成中央真實落球縫。

## 操作方式

- **← / Z**：左彈片　**→ / M / `/`**：右彈片
- **空白鍵（按住蓄力，放開發射）**：彈簧發射球
- **P / ESC**：暫停
- 觸控裝置：畫面左右半邊分別控制左右彈片，右下角「PULL」鈕發射

## 本機執行

需以 HTTP 伺服器開啟（ES 模組與 `fetch` 不支援 `file://`）：

```bash
python3 -m http.server 8080
# 開啟 http://localhost:8080
```

## 部署到 GitHub Pages

本專案是放在 repo 根目錄的純靜態網站（`index.html`、`js/`、`data/`），
最穩定的方式是 **直接從 `main` 分支發佈**（不需 Actions、不需任何權限設定）：

1. 進入 **Settings → Pages**
2. **Build and deployment → Source** 選 **Deploy from a branch**
3. **Branch** 選 `main`、資料夾選 `/ (root)`，按 **Save**
4. 等約 1 分鐘，網址即上線

部署後網址：`https://ozakboy.github.io/ArcadePin/`

> 已加入 `.nojekyll`，讓 Pages 原樣輸出 `js/` 與 `data/`，不經 Jekyll 處理。

## 雙軌排行榜架構

- **本機個人紀錄（IndexedDB）**：不限筆數、永久保存，離線可用。無條件運作。
- **全球雲端排行（GitHub 託管 JSON）**：
  - `data/top_100_leaderboard.json`：最多 100 筆，前端直接 `fetch` 秒載渲染（**讀取永遠可用**）。
  - `data/all_history_current.json`：Append-only 全網紀錄，超過 5MB 由 `scripts/process_score.mjs` 自動分檔歸檔為 `all_history_partN.json`。

### 啟用全球排行榜上傳（Serverless 代理）

> **完整逐步操作手冊（含網頁儀表板/CLI 兩種做法、測試與排錯）：[`serverless/README.md`](serverless/README.md)**

純前端網站無法安全保存寫入用的 Token，因此採 **Serverless 代理** 架構：前端把分數
POST 給代理（保管 Token），代理再觸發 `repository_dispatch`，由
`.github/workflows/submit-score.yml` 執行 `scripts/process_score.mjs` 驗證簽章、
寫入 `all_history_current.json`（超過 5MB 自動分檔）並更新 `top_100_leaderboard.json`，
最後自動 commit 回 `main`，Pages 隨即更新。

**部署步驟（以 Cloudflare Workers 為例，免費）：**

1. 建立一個 **GitHub 細粒度 PAT**：僅授權此 repo 的 **Contents: Read and write**。
2. 部署 `serverless/arcadepin-proxy.js`：
   ```bash
   cd serverless
   npx wrangler deploy
   npx wrangler secret put GH_TOKEN      # 貼上步驟 1 的 PAT
   ```
   （`wrangler.toml` 內的 `GH_OWNER`/`GH_REPO`/`ALLOWED_ORIGIN` 已預設好，可自行調整。）
3. 取得 Worker 網址後，填入 `js/config.js`：
   ```js
   submit: { enabled: true, proxyUrl: 'https://arcadepin-proxy.<你>.workers.dev' }
   ```
4. 確認 repo **Settings → Actions → General → Workflow permissions = Read and write**
   （Action 才能 commit 回 JSON）。

完成後，遊戲結束即會自動上傳並同步更新全球前 100 名。Token 只存在代理端、不外洩；
簽章為輕量防竄改，非伺服器級驗證。未設定代理時遊戲仍以本機紀錄正常運作。

## 資料格式

```json
{
  "playerId": "uuid-v4-generated-locally",
  "playerName": "CY_TSAI",
  "score": 128500,
  "maxCombo": 42,
  "playTimeSeconds": 145,
  "timestamp": 1779854220000
}
```

## 授權

MIT License。
