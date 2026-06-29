# Number Land · Primary 4 Maths (數字樂園 · 小四數學)

Interactive, bilingual (English + 繁體中文) Primary-4 mathematics lessons covering the
**China (人教版)**, **Hong Kong (EDB)**, and **Singapore (MOE)** syllabi. Each lesson teaches
one concept through the mascot **Kazu / 數寶** and a hands-on animated diagram you can drag,
click, and play with.

No build step, no dependencies — it's plain HTML, CSS, and vanilla JavaScript.

## Run it

Open `index.html` directly in a browser, or serve the folder (recommended, so relative paths
behave consistently):

```bash
cd primary-4
python3 -m http.server 8000
# then visit http://localhost:8000
```

Use the **中文 / EN** button (top-right) to switch language — the choice is remembered.
On the home page, filter topics by region (🇨🇳 / 🇭🇰 / 🇸🇬).

## Topics

| # | Topic | Regions |
|---|-------|---------|
| 01 | Large Numbers & Place Value · 大數與位值 | CN HK SG |
| 02 | Operations & Their Laws · 四則運算與運算定律 | CN HK SG |
| 03 | Multi-digit Multiplication · 多位數乘法 | CN HK SG |
| 04 | Division (2-digit divisors) · 除法（兩位數除數）| CN HK SG |
| 05 | Factors & Multiples · 因數與倍數 | SG HK |
| 06 | Fractions · 分數 | CN HK SG |
| 07 | Decimals · 小數 | CN HK SG |
| 08 | Angles & Directions · 角與方向 | CN HK SG |
| 09 | Perpendicular & Parallel Lines · 垂直與平行線 | CN HK SG |
| 10 | Triangles · 三角形 | CN HK |
| 11 | Quadrilaterals · 四邊形 | CN HK SG |
| 12 | Area & Perimeter · 面積與周長 | CN HK SG |
| 13 | Symmetry · 對稱 | SG CN HK |
| 14 | Bar & Line Graphs · 條形圖與折線圖 | CN HK SG |
| 15 | Time · 時間 | HK SG |

## Project structure

```
primary-4/
├── index.html                 # Home hub: topic grid, region filter, language toggle
├── assets/
│   ├── css/style.css          # Shared theme, layout, widgets, mascot animations
│   └── js/
│       ├── lessons-data.js    # The list of all lessons (titles, regions, blurbs)
│       ├── i18n.js            # EN / 繁中 strings + toggle (localStorage), data-i18n binding
│       ├── widgets.js         # NL.fmt, NL.rand, NL.quiz (shared quiz builder)
│       ├── mascot.js          # Kazu the mascot (inline SVG, expressions, speech)
│       └── lesson.js          # Auto-builds each lesson's top bar, header, badges, nav, mascot
└── lessons/
    └── NN-slug/index.html     # One self-contained lesson per topic
```

## How a lesson works

A lesson page only supplies its `<main>` content and one inline `<script>`. The shared scripts
(loaded in this order: `lessons-data.js`, `i18n.js`, `widgets.js`, `mascot.js`, `lesson.js`)
build everything else automatically from `data-lesson="N"` on the `<body>`.

Each lesson has four panels: **The idea** (with the mascot), **Explore** (the interactive
animation), **Worked example** (stepped through), and **Try it yourself** (a quiz).

## Add a new lesson

1. Add an entry to `assets/js/lessons-data.js` (`n`, `slug`, `icon`, `en`, `zh`, `regions`, `blurbEn`, `blurbZh`).
2. Copy `lessons/01-large-numbers/index.html` to `lessons/<slug>/index.html` and set `data-lesson="N"`.
3. Replace the four panels' content and the inline `<script>` with your concept, animation, and quiz.
4. Register lesson-specific strings via `I18N.register({...})` and keep both `en` and `zh` for every string.
