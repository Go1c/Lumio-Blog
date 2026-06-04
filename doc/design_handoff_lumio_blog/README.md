# Handoff: Lumio Game Tech Blog

## Overview
A game-development technical blog for **Lumio.games**. The design covers the full public reader experience — home, article list, article detail, tag pages, columns, about, search results — plus an admin console. The aesthetic is a soft, "voxel / pixel-game" tech style: rounded card shell, indigo→mint→amber palette, CSS 3D voxel cubes as article artwork, and a pixel-grid motif.

## About the Design Files
The files in this bundle are **design references created in static HTML/CSS/JS** — prototypes that show the intended look, layout, and interactions. They are **not** production code to ship as-is.

The task is to **recreate these designs inside the target codebase** (the repo at `github.com/Go1c/Lumio-Blog`) using its established stack, templating, and component patterns. Where the project already has a backend, the article/tag/search data shown here as inline JS arrays should be wired to the real API/templates. If a particular layer doesn't exist yet, choose the framework idiomatic to the repo.

Treat the inline `<script>` data (e.g. `ARTICLES`, `RESULTS`, `ITEMS`) as **placeholder fixtures** illustrating the shape of the data and the rendered markup — replace with server-rendered templates or client fetches.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, radii, shadows, and interactions are all defined. Recreate the UI pixel-faithfully using the codebase's own CSS/component conventions. All tokens are centralized in `gametech.css` `:root` (see Design Tokens).

---

## Architecture of the design

- **`gametech.css`** — the foundation: design tokens (`:root`), global resets, the page background, the rounded `.shell` container, the top `.nav`, the home hero, the **voxel cube system** (`.cube` + faces), card grid, subscribe band, and the sponsored ad slot. Loaded by **every** page.
- **`pages.css`** — the **sub-page system** layered on top of `gametech.css`: the `.page-head` banner, filter `.chips`, the two-column `.layout` (content + sidebar), list rows (`.arow`), sidebar cards (`.side-card` with ranked tags / recent / suggestions / tag-cloud), article-detail prose + code block + table-of-contents, breadcrumb, About author/stats, and search states. Loaded by all sub-pages (not the home page).
- **`admin.css`** — standalone styling for the admin console only.

Every public page shares the **same `.nav`** markup and the same `.shell` wrapper. Keep that consistent when porting — it is the structural anchor of the whole site.

> Implementation note: `.shell` uses `overflow: clip` (not `hidden`) specifically so the article-detail's `position: sticky` table-of-contents sticks to the viewport. Preserve this if you keep the single-shell structure.

---

## Screens / Views

### 1. Home — `Game Tech Blog.html`
- **Purpose:** Landing page; orient the reader and surface the latest articles.
- **Layout:** Inside `.shell`: full-width `.nav`, then `.body` is a 2-col CSS grid `380px 1fr` — left `.hero`, right `.content`.
  - **Hero** (`.hero`): gradient `linear-gradient(160deg,#DCE4FF,#E4ECFF 38%,#DFF7F0)`, faint pixel grid overlay, eyebrow "Lumio Dev Notes", title "Game / Tech Blog" (52px/800), subtitle chips (技术文章 · 游戏开发 · 实践分享), primary CTA "阅读最新文章" → `Post.html`, and a decorative **voxel scene** at the bottom (stacked CSS 3D cubes, floating cubes, a pixel heart, a coin).
  - **Content**: section head "最新文章" + "查看全部" (→ `Articles.html`); two rows of a 3-col card grid (`.grid`); a sponsored **ad slot** (`.ad`, replace placeholder with `<img class="ad__img">`); and a **subscribe** band.
- **Cards** (`.card`): 132px voxel thumbnail with category `.badge` top-left, body with title (16px/700), 2-line dek, and meta (date + read time). Hover: lift 4px + `--shadow-pop` + title turns indigo. Each card navigates to `Post.html`.

### 2. Article list — `Articles.html`
- **Purpose:** Browse/filter all articles.
- **Layout:** `.page-head` banner ("文章") then `.layout` = `1fr 300px` (list + sidebar).
  - **List bar:** filter `.chips` (全部/渲染/性能/图形学/架构/网络/工具, each with a count) on the left; a `.sortbox` toggle (最新发布 ⇄ 最多阅读) on the right.
  - **List** (`.alist`): vertical stack of **`.arow`** rows — `116px 1fr` grid: small voxel thumb + body (title + inline category tag, 1-line dek, meta: author · date · read time · views). Hover lifts.
  - **Sidebar:** `.side-card` "热门标签" (ranked list `.rank`, top-3 indices get gradient chips) + `.side-card` "最近更新" (`.recent`).
- **Behavior:** chips filter the list by category; sort toggle re-sorts by date or read count. Rows → `Post.html`.

### 3. Article detail — `Post.html`  *(headline page)*
- **Purpose:** Read a full article.
- **Layout:** `.page` → breadcrumb (`.crumb`: 首页 / 文章 / 渲染 / 渲染优化实战) → `.layout--post` = `1fr 268px`.
  - **Main column:** `.post-title` (34px/900) → `.post-tags` (category `.tag-inline` pills + a `.diff` difficulty badge "中级") → `.post-meta` (author avatar+name · date · read time · views, with bottom divider) → `.post-hero` (260px gradient banner with floating voxels) → `.prose`.
  - **Prose** (`.prose`): `h2` section headings with a 4px indigo accent bar, paragraphs (15px/1.85), `strong` emphasis, inline `code`, a **`.callout`** (amber tip box), and a **`.code`** block — dark (#20283F) with a window bar (traffic-light dots + a working **复制 / copy** button) and token syntax highlighting (`.k .s .c .f .n`).
  - **Sidebar:** sticky **`.toc`** "文章目录" (anchors to each `h2`, with scroll-spy highlighting the current section) + `.side-card` "相关文章" (`.related` mini rows: 44px thumb + title + date).
- **Behavior:** copy button copies the code & shows "已复制" for 1.6s; TOC links smooth-scroll and the active item highlights on scroll.

### 4. Search results — `Search.html`
- **Purpose:** Show matches for a query (demo query: "渲染优化").
- **Layout:** nav search field is in its **active** state (`.search--active`, indigo border, with a `.search__clear` ✕ button). `.page-head` shows "搜索结果：渲染优化" + result count. `.layout` = `1fr 300px`.
  - **Results** (`.alist` of `.arow`): same row component as Articles, but matched terms are wrapped in `<mark class="hl">` (amber highlight).
  - **Sidebar:** "搜索建议" (`.suggest` list) + "热门标签" (`.rank`).
- **Behavior:** clear button empties the field; Enter re-runs (demo reloads).

### 5. Tag detail — `Tags.html`
- **Purpose:** All content under one tag (demo: Unity).
- **Layout:** breadcrumb → `.tag-detail-head` ("标签：Unity" with the tag name in indigo + description + count) → underline `.tabs` (全部 / 文章 / 专栏) → `.layout` `1fr 300px`.
  - **Main:** `.alist` of `.arow` rows; columns get a 0-min-time variant (no read-time pill).
  - **Sidebar:** `.side-card` "标签云" — `.tagcloud` of `.tag-pill`s sized `is-big`/`is-mid`/default with colored count chips (`.s-mint .s-amber .s-violet .s-sky .s-rose`).
- **Behavior:** tabs filter by content kind (article vs column).

### 6. Columns — `Columns.html`
- **Purpose:** Browse multi-part series.
- **Layout:** `.page-head` ("技术专栏") → `.cols` 2-col grid of `.col-card` (132px cover + body: series name, dek, footer with article count + "订阅专栏" ghost button). Cards → `Post.html`.

### 7. About — `About.html`
- **Purpose:** Explain the blog and its author.
- **Layout:** `.page-head` ("关于 Lumio Games") → `.about-lead` intro → `.feat-row` of **4** `.feat` cards (技术分享 / 实战导向 / 社区交流 / 持续更新, each with a gradient icon tile) → `.about-grid` `1.15fr 1fr`:
  - **`.author-card`**: avatar tile "L" + name "Lumio" + role (独立开发者 · 技术博主) + bio + `.social` row (GitHub / blog / RSS / email icon buttons).
  - **`.stats`**: 2×2 grid — 128+ 文章 / 24+ 专栏 / 15k+ 读者 / 3年+ 持续创作, numbers in an indigo→mint gradient text.
  - Closes with a contact **subscribe** band.

### 8. Admin console — `Admin.html` (uses `admin.css`)
- **Purpose:** Internal CMS dashboard (separate visual system from the public site — dark-ish sidebar nav).
- **Layout:** fixed left `.adm-side` (brand, grouped nav: 概览/内容/运营, footer profile) + `.adm-main` (top bar with title + search + actions, then dashboard content: stat cards, recent tables, etc.). Not part of the public reference grid; include only if building the CMS.

---

## Interactions & Behavior
- **Navigation:** nav links route between pages; article cards/rows → `Post.html`; "查看全部" → `Articles.html`; nav search → `Search.html` on Enter; tag chips/pills → `Tags.html`.
- **Filtering (Articles):** clicking a `.chip` sets `is-active` and re-renders the list filtered by `data-cat`; the `.sortbox` toggles date vs read-count sort.
- **Tabs (Tags):** `.tab` toggles `is-active` and filters by content kind.
- **Article detail:** copy-code button (clipboard + transient "已复制"); TOC scroll-spy + smooth-scroll to `h2[id]`.
- **Hover states:** cards/rows lift `translateY(-3px/-4px)` with `--shadow-pop` and border `#D4DCF5`; titles shift to `--primary-d`; buttons lift `-2px`.
- **Transitions:** ~.15–.18s on color/transform/box-shadow/border.
- **Animations:** voxel cubes gently bob (`@keyframes bobcube`, 4s ease-in-out infinite) — decorative; safe to disable for reduced-motion.
- **Responsive:** `.body` and `.layout` collapse to 1 column ≤980px (TOC becomes static, grids reflow to 2-up then 1-up); full small-screen rules at ≤680px.

## State Management
Minimal, all client-side in the prototypes:
- **Articles:** `curCat` (active category) + `curSort` ('new' | 'hot') → re-render list.
- **Tags:** `curKind` ('全部' | '文章' | '专栏') → filter list.
- **Post:** active TOC section derived from scroll position; copy-button transient "done" flag.
- **Search:** the query string drives results + highlight regex.
In production these map to route params / query strings and server-side or API-fed data.

## Design Tokens
From `gametech.css :root`:

| Token | Value | Use |
|---|---|---|
| `--primary` | `#7C8CFF` | brand indigo |
| `--primary-d` | `#6171F0` | active/hover indigo, links |
| `--secondary` | `#5DE2C6` | mint accent |
| `--accent` | `#FFB86B` | amber accent |
| `--bg` | `#F7FAFF` | page background base |
| `--ink` | `#1E2A3A` | primary text |
| `--muted` | `#6B7894` | secondary text |
| `--faint` | `#9AA6BE` | tertiary text / meta |
| `--line` | `#E7ECF6` | borders / dividers |
| `--card` | `#FFFFFF` | surfaces |
| `--radius` | `18px` | cards |
| `--radius-sm` | `12px` | small elements |
| `--shadow-card` | `0 1px 2px rgba(30,42,58,.04), 0 10px 30px -12px rgba(53,68,120,.18)` | resting card |
| `--shadow-pop` | `0 18px 50px -16px rgba(53,68,120,.40)` | hover/lifted |

**Voxel category tones** (thumbnail backgrounds): `.t-blue .t-mint .t-amber .t-violet .t-sky .t-rose` (each a soft 150° gradient). Cube color variants: default indigo, `.c-mint`, `.c-amber`, `.c-pink` (each sets `--t/--l/--r` top/left/right face colors). The architecture/network cubes set custom face colors inline.

**Typography:**
- Latin/UI: **Inter** (`--font`), weights 400/500/600/700/800.
- Chinese: **Noto Sans SC** (`--font-zh`), weights 400/500/700/900.
- Both via Google Fonts (see each file's `<link>`). Scale: hero 52px/800 · page-head title 40px/800 · post title 34px/900 · section/`h2` 19–22px/700–800 · card title 16px/700 · body 13–15px · meta 12px.

**Spacing:** card/section gaps 18px; page padding `28–40px 34px`; nav padding `18px 28px`. Border radii per tokens (nav/icon buttons 11px, chips/sortbox 10px, code 12px).

## Assets
- **No raster images** are required by the design — all artwork is **pure CSS**: voxel cubes (`.cube` 3D transforms), the glowing shader **orb** (`.orb` radial gradient), the **pixel heart** and **coin** (CSS grids/gradients), and the brand mark (`.brand__mark` pixel grid). These can be reproduced as components or, if preferred, exported as SVG/PNG.
- **Icons** are inline SVG (search, clock, calendar, eye, mail, arrows, social, etc.) — swap for the codebase's icon set, matching stroke-width ~1.5–1.8 and `currentColor`.
- **Sponsored ad slot** (`.ad` on home) is the one intentional image placeholder — replace `.ad__ph` with `<img class="ad__img" src="…">` and set the link `href`.
- **Fonts:** Inter + Noto Sans SC (Google Fonts). Self-host in production if desired.

## Files
Public site (load `gametech.css`, sub-pages also load `pages.css`):
- `Game Tech Blog.html` — home (gametech.css only)
- `Articles.html` — article list
- `Post.html` — article detail
- `Search.html` — search results
- `Tags.html` — tag detail
- `Columns.html` — columns
- `About.html` — about
- `gametech.css` — tokens + shell/nav/hero/cards/voxels (foundation)
- `pages.css` — sub-page layout system

Admin (separate):
- `Admin.html` + `admin.css` — CMS dashboard

> The theme-toggle (sun icon) and avatar→Admin link are present in the nav but the light/dark theme switch is **not yet wired** — implement if dark mode is in scope.
