# Open Forum

一個適合部署在 GitHub Pages 的開源專案雷達站骨架，包含三件事：

- 推薦專案：首頁與專案詳情頁可展示 curated repository 清單
- 追蹤熱度：GitHub Actions 定時抓取 repo 指標，產出熱度榜
- 可以討論：預留 GitHub Discussions + giscus 留言區

## 架構

- `Astro`：純靜態頁面，最適合 GitHub Pages
- `scripts/sync-github.mjs`：從 GitHub API 取回 repo 指標，輸出 `src/data/projects.generated.json`
- `.github/workflows/sync-data.yml`：每天同步資料並提交快照
- `.github/workflows/deploy.yml`：將靜態站部署到 GitHub Pages
- `.github/ISSUE_TEMPLATE/recommend-project.yml`：收集使用者推薦專案

## 本機開發

```bash
npm install
npm run sync:data
npm run dev
```

如果你只是先看版型，`projects.generated.json` 也已經有初始資料，可以直接：

```bash
npm run dev
```

## 上線到 GitHub Pages

1. 建立 GitHub repo，將本專案推上去。
2. 在 repo 設定中開啟 GitHub Pages，Source 選 `GitHub Actions`。
3. 確認預設分支是 `main`，workflow 會自動部署。
4. 若 repo 不是 `<user>.github.io`，不需要手動調整 base path，workflow 會自動帶入。

如果你要從這個資料夾直接推上 GitHub，最短路徑是：

```bash
git init -b main
git add .
git commit -m "feat: launch open forum"
git remote add origin git@github.com:<you>/<repo>.git
git push -u origin main
```

如果你用 GitHub CLI，也可以直接：

```bash
gh repo create <repo> --public --source=. --remote=origin --push
```

## 啟用討論

在 repo 開啟 GitHub Discussions，接著安裝 giscus App，然後設定下列變數：

```bash
PUBLIC_SITE_REPO=https://github.com/<you>/<repo>
PUBLIC_DISCUSSIONS_URL=https://github.com/<you>/<repo>/discussions
PUBLIC_GISCUS_REPO=<you>/<repo>
PUBLIC_GISCUS_REPO_ID=
PUBLIC_GISCUS_CATEGORY=General
PUBLIC_GISCUS_CATEGORY_ID=
```

你可以把它們放在本機 `.env`，也可以放進 GitHub Actions repository variables。

如果你已經建立好 GitHub repo，這個專案也附了一個 helper script，可以自動幫你抓 `repo id` 和 `discussion category id`：

```bash
GITHUB_TOKEN=<your-token> npm run setup:giscus -- <owner>/<repo> General --write
```

它會查 GitHub GraphQL API，然後把 `PUBLIC_GISCUS_*` 寫進 `.env.local`。前提是：

1. repo 已經存在
2. GitHub Discussions 已開啟
3. 你已經安裝 giscus App

如果你不想直接寫檔，也可以拿掉 `--write`，先只看輸出結果。

## 驗證與部署 workflow

- `.github/workflows/ci.yml`：每次 push / PR 會跑 `check` 和 `build`
- `.github/workflows/sync-data.yml`：每天同步 GitHub repo 指標
- `.github/workflows/deploy.yml`：把靜態頁面部署到 GitHub Pages

## 調整推薦清單

編輯 [src/data/project-seeds.json](/Users/phil/Documents/open-forum/src/data/project-seeds.json) 即可增加或替換要追蹤的 repo。
