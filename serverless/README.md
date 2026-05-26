# ArcadePin 全球排行榜上傳 — Serverless 代理完整操作手冊

這份文件帶你一步步把「遊戲結束自動上傳分數 → 同步全球前 100 名」整條鏈路接通。
照著做即可，不需要自己寫任何程式。

---

## 0. 它是怎麼運作的（先看懂再動手）

```
玩家瀏覽器 (github.io)
   │  ① 遊戲結束，POST 分數 (含簽章 sig)
   ▼
Cloudflare Worker 代理   ← 這裡保管 GitHub Token（不外洩）
   │  ② 用 Token 呼叫 GitHub repository_dispatch API
   ▼
GitHub Actions：submit-score.yml
   │  ③ 執行 scripts/process_score.mjs
   │     - 驗證簽章
   │     - 追加到 data/all_history_current.json（超過 5MB 自動分檔）
   │     - 更新 data/top_100_leaderboard.json（取前 100 名）
   │  ④ git commit 回 main
   ▼
GitHub Pages 自動重建 → 玩家下次開排行榜看到最新資料
```

**為什麼需要代理？** 純前端網站的原始碼是公開的，沒辦法藏一把能寫入 repo 的 Token。
代理（Worker）跑在伺服器端，Token 只存在那裡，前端只負責把分數丟給它。

---

## 1. 建立 GitHub Token（細粒度 PAT）

1. 登入 GitHub → 右上角頭像 → **Settings**
2. 左側最下方 **Developer settings**
3. **Personal access tokens → Fine-grained tokens → Generate new token**
4. 填寫：
   - **Token name**：`arcadepin-proxy`
   - **Expiration**：自行決定（到期後需重新產生並更新 Worker secret）
   - **Resource owner**：選 `ozakboy`
   - **Repository access**：選 **Only select repositories** → 勾 **ArcadePin**
   - **Permissions → Repository permissions** 找到 **Contents** → 設為 **Read and write**
     （觸發 `repository_dispatch` 需要這個權限；其餘權限保持 No access）
5. 按 **Generate token**，**立刻複製** 那串 `github_pat_...`（只會顯示這一次）。

> 安全提醒：這把 Token 只給此 repo 的 Contents 寫入權，風險最小。**絕對不要**把它貼進
> `js/config.js` 或任何會 commit 進 repo 的檔案——它只該存在 Worker 的 secret 裡。

---

## 2. 部署 Cloudflare Worker（二選一）

> 沒有 Cloudflare 帳號就先到 https://dash.cloudflare.com 免費註冊。

### 做法 A：網頁儀表板（不用安裝任何東西，推薦新手）

1. 進 https://dash.cloudflare.com → 左側 **Workers & Pages** → **Create application** → **Create Worker**
2. 名稱輸入 `arcadepin-proxy` → **Deploy**（會先建立一個預設 Hello World）
3. 點 **Edit code**，把本 repo `serverless/arcadepin-proxy.js` 的**全部內容**貼上去覆蓋，
   按右上 **Deploy**
4. 回到該 Worker 的 **Settings → Variables and Secrets**，新增以下項目：

   | 類型 | 名稱 | 值 |
   | --- | --- | --- |
   | Variable（一般） | `GH_OWNER` | `ozakboy` |
   | Variable（一般） | `GH_REPO` | `ArcadePin` |
   | Variable（一般） | `EVENT_TYPE` | `arcadepin_score` |
   | Variable（一般） | `ALLOWED_ORIGIN` | `https://ozakboy.github.io` |
   | **Secret（加密）** | `GH_TOKEN` | 貼上步驟 1 的 PAT |

   存檔後 Worker 會自動重新部署。
5. 在 Worker 頁面記下它的網址，長得像：
   `https://arcadepin-proxy.<你的帳號子網域>.workers.dev`

### 做法 B：指令列 wrangler（需要本機有 Node.js）

```bash
cd serverless
npx wrangler login              # 開瀏覽器授權一次
npx wrangler deploy             # 讀 wrangler.toml 部署（GH_OWNER 等變數已內建）
npx wrangler secret put GH_TOKEN  # 貼上步驟 1 的 PAT（輸入時不會顯示）
```

部署完成後，終端機會印出 Worker 網址
`https://arcadepin-proxy.<你的帳號子網域>.workers.dev`。
`wrangler.toml` 裡的 `GH_OWNER` / `GH_REPO` / `ALLOWED_ORIGIN` 已預設好，要改自行調整。

---

## 3. 把網址填進前端

編輯 `js/config.js`，找到 `leaderboard.submit`，改成：

```js
submit: {
  enabled: true,
  proxyUrl: 'https://arcadepin-proxy.<你的帳號子網域>.workers.dev'
}
```

> `proxyUrl` 填 Worker 的**根網址**即可（不必加路徑）。

存檔後 commit 並 push 到 `main`：

```bash
git add js/config.js
git commit -m "chore: enable cloud leaderboard upload"
git push origin main
```

---

## 4. 開啟 Action 的寫入權限

GitHub Action 要能把更新後的 JSON commit 回 repo：

1. 進 repo **Settings → Actions → General**
2. 捲到 **Workflow permissions**
3. 選 **Read and write permissions** → **Save**

---

## 5. 測試

1. 開啟遊戲網址（記得 `Ctrl+Shift+R` 強制重新整理拿到新的 `config.js`）。
2. 玩一局到 **Game Over**。
3. 依序確認：
   - **Cloudflare**：Worker 頁面 → **Logs**（即時日誌）應出現一筆 `POST`，回傳 200。
   - **GitHub**：repo 的 **Actions** 分頁應出現一個 **Process Score Submission** 執行紀錄（綠勾）。
   - **資料**：該 Action 跑完後，`data/top_100_leaderboard.json` 會多一筆你的分數（看 commit 紀錄）。
   - **遊戲內**：等 Pages 重建（約 30–60 秒）後，重開遊戲的「全球排行」分頁就會看到。

---

## 6. 排錯對照表

| 症狀 | 原因 / 解法 |
| --- | --- |
| 瀏覽器 Console 出現 **CORS** 錯誤 | `ALLOWED_ORIGIN` 必須**完全等於** `https://ozakboy.github.io`（結尾不要加 `/`、不要加路徑） |
| Worker 回 **401 / 403** | `GH_TOKEN` 錯誤、過期、或沒有 **Contents: Read and write** 權限 |
| Worker 回 200 但 **Action 沒被觸發** | `EVENT_TYPE` 要等於 `arcadepin_score`，需與 `.github/workflows/submit-score.yml` 的 `types` 一致 |
| Action 跑了但 **沒有 commit** | repo Workflow permissions 還是 read-only → 改成 **Read and write**（步驟 4） |
| Action log 出現 **signature mismatch** | `js/config.js` 的 `integritySalt` 必須與 `scripts/process_score.mjs` 的 `SALT`（預設 `arcadepin-v6`）一致 |
| 分數上傳了但**遊戲內排行沒馬上更新** | Pages 重建要 30–60 秒；遊戲結束當下抓到的排名可能慢一局，稍後再開排行榜即是最新 |
| Worker 回 **502** | 代表 GitHub API 回非 204，回應 body 的 `detail` 欄位會說明原因（多半是 Token 權限） |

---

## 7. 成本與安全

- **成本**：Cloudflare Workers 免費方案每天 10 萬次請求，這個用途綽綽有餘。
- **安全**：
  - Token 只存在 Worker 的 secret，公開原始碼裡看不到。
  - `ALLOWED_ORIGIN` 只擋瀏覽器跨域，**不是**真正的存取控制（有人仍可直接 `curl` 你的 Worker）。
  - 分數帶有 FNV-1a 簽章供 Action 驗證，但 salt 是公開的，屬**輕量防竄改**，無法完全防偽造。
    若要更強的防作弊，需要真正的伺服器端驗證（超出本專案「免後端」範圍）。

---

完成 1–4 步後，遊戲結束就會自動上傳並同步全球前 100 名。任何一步卡住，把畫面或錯誤訊息貼給我即可。
