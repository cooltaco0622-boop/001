# 分帳計算器

輕鬆計算聚餐、旅遊的花費，自動算出誰該給誰多少錢。

## 功能

- 依人員區塊填寫代付項目，自動計算平攤結果
- **分享連結**：可複製連結給他人查看與編輯
- 一鍵清除、深色風格主題

## 分享與協作

- **首次開啟**：每人都是全新的分帳頁面
- **點「分享連結」**：複製目前內容的連結
- **對方開啟連結**：可看到相同資料並一起修改

### 模式說明

| 模式 | 說明 |
|------|------|
| 快照模式（預設） | 不需額外設定，連結包含目前資料，對方可編輯 |
| 即時協作（Firebase） | 設定 Firebase 後，多人編輯會即時同步 |

### 啟用即時協作（選填）

1. 至 [Firebase Console](https://console.firebase.google.com/) 建立專案
2. 建立 **Realtime Database**（測試模式即可）
3. 複製專案設定到 `.env`（參考 `.env.example`）
4. 在 GitHub 倉庫 Settings → Secrets 新增相同變數，供部署使用

Realtime Database 規則範例（僅供分帳協作測試）：

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

## 開發

```bash
npm install
npm run dev
```

本地開發請開啟 http://localhost:5173/

開發時會自動使用 `index.template.html` 作為入口檔。

## 建置

```bash
npm run build
npm run preview
```

## 線上部署（GitHub Pages）

此專案透過 GitHub Actions 自動建置並部署。請在 GitHub 倉庫設定中，將 Pages 來源改為 **GitHub Actions**（Settings → Pages → Build and deployment → Source: GitHub Actions）。

網址：https://cooltaco0622-boop.github.io/001/
