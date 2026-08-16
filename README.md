# 美股投資 Dashboard

追蹤美股持股的買賣進出，依產業分層自動計算現值佔比。React + Vite 前端，Supabase 做資料庫與登入驗證，部署到 GitHub Pages。

## 首次設定

### 1. 建立 Supabase 專案

1. 到 [supabase.com](https://supabase.com) 建立一個免費專案
2. 進 **SQL Editor**，貼上 [`supabase/schema.sql`](supabase/schema.sql) 的內容並執行，建立 `transactions` 資料表與權限規則
3. 進 **Authentication > Providers**，確認 Email provider 是開啟的
4. 進 **Authentication > URL Configuration**，如果要用 GitHub Pages 網址登入，把該網址加進 Redirect URLs
5. 進 **Project Settings > API**，複製 `Project URL` 和 `anon public` key

### 2. 本地開發

```bash
npm install
cp .env.example .env   # 貼上上一步複製的 URL 和 anon key
npm run dev
```

### 3. 部署到 GitHub Pages

1. 在 GitHub 建一個新 repo（例如 `investment`），把這個資料夾 push 上去
2. Repo 的 **Settings > Pages**，Source 選 "GitHub Actions"
3. Repo 的 **Settings > Secrets and variables > Actions**，新增兩個 secret：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. push 到 `main` branch 會自動觸發 [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) build 並部署

第一次上站要先點右上角「還沒有帳號？註冊」建立自己的登入帳號（Supabase Auth），之後就用這組帳密登入。

## 功能

- **交易紀錄**：輸入買進/賣出（股票代號、分類、股數、成交價、日期），存進 Supabase
- **Dashboard**：依交易紀錄算出目前持股，抓即時股價（Yahoo Finance，透過公開 CORS proxy），依分類加總算出現值佔比

## 已知限制

- 股價來源是免費、無金鑰的 Yahoo Finance 端點，透過公開 CORS proxy 轉發，非官方穩定 API，偶爾會抓取失敗（畫面會提示）
- 平均成本用加權平均法計算，不是逐筆 FIFO
