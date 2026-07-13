# 分帳計算器

輕鬆計算聚餐、旅遊的花費，自動算出誰該給誰多少錢。

## 功能

- 預設三位成員，可自訂名字、新增或移除成員
- 新增多筆花費項目（名稱、金額、付款人）
- 預設所有人均分，可點選調整分攤對象
- 自動計算每人應收/應付，並產生最少轉帳建議
- 深色風格主題

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
