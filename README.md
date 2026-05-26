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

已內建 `.github/workflows/deploy-pages.yml`。**一次性設定**：

1. 進入 repo 的 **Settings → Pages**
2. **Build and deployment → Source** 選擇 **GitHub Actions**
3. 推送到 `main`（或 `claude/epic-gauss-dScNu`）即會自動部署，網址顯示於 Actions 的 deploy 步驟

## 雙軌排行榜架構

- **本機個人紀錄（IndexedDB）**：不限筆數、永久保存，離線可用。無條件運作。
- **全球雲端排行（GitHub 託管 JSON）**：
  - `data/top_100_leaderboard.json`：最多 100 筆，前端直接 `fetch` 秒載渲染（**讀取永遠可用**）。
  - `data/all_history_current.json`：Append-only 全網紀錄，超過 5MB 由 `scripts/process_score.mjs` 自動分檔歸檔為 `all_history_partN.json`。

### 關於雲端「寫入」

純前端網站無法安全保存寫入用的 Token，因此 **雲端分數上傳預設關閉**（`js/config.js` 的 `leaderboard.submit.enabled = false`），遊戲完全以本機模式正常運作。

若要啟用上傳：開啟 `submit.enabled` 並於執行期提供 Token，前端會透過 `repository_dispatch` 觸發 `.github/workflows/submit-score.yml`，由 Action 驗證簽章、寫回 JSON 並自動 commit。**請勿將任何 Token commit 進倉庫。** 此簽章僅為輕量防竄改，非伺服器級驗證。

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
