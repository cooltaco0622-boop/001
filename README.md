# 夾層之家支出記帳本

輕鬆計算聚餐、旅遊的花費，自動算出誰該給誰多少錢。

## 功能

- 依人員區塊填寫代付項目，自動計算平攤結果
- **分享連結**：可複製連結給他人查看與編輯
- **存檔管理**：自動以日期時間命名，可載入或刪除存檔
- 一鍵清除、深色風格主題

## 分享連結

- **首次開啟**：每人都是全新的分帳頁面
- **點「分享連結」**：建立專屬連結並複製，傳給其他人
- **對方開啟連結**：可查看與修改同一份分帳
- **看最新內容**：重新整理頁面（或點「重新整理」按鈕）即可載入他人修改後的結果

> 分享功能需設定 Firebase Realtime Database 儲存資料（見下方說明）

### 設定 Firebase（分享／存檔必要）

1. 至 [Firebase Console](https://console.firebase.google.com/) 建立專案
2. 建立 **Realtime Database**
3. 在 **Realtime Database → 規則** 貼上本專案的 `database.rules.json` 內容並發布
4. 複製專案網頁設定到程式（或設為 GitHub Secrets）

正式規則只允許存取 `rooms`（分享）與 `archives`（存檔），其他路徑一律拒絕。

Realtime Database 正式規則內容見倉庫根目錄 `database.rules.json`。

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
