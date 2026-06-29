/* Shared registry of all Primary-4 lessons.
   Used by the hub (index.html) to build cards and by lesson.js for prev/next nav.
   regions: any of "CN" (China 人教版), "HK" (Hong Kong EDB), "SG" (Singapore MOE).
   A region in `core` is a primary-syllabus topic; `extra` means region-specific emphasis. */
window.LESSONS = [
  { n: 1,  slug: "01-large-numbers",   icon: "🔢",
    en: "Large Numbers & Place Value", zh: "大數與位值",
    regions: ["CN", "HK", "SG"],
    blurbEn: "Read, write and build big numbers using place value, up to millions.",
    blurbZh: "用位值讀、寫和組成大數，最大到百萬以上。" },

  { n: 2,  slug: "02-operation-laws",  icon: "➕",
    en: "Operations & Their Laws", zh: "四則運算與運算定律",
    regions: ["CN", "HK", "SG"],
    blurbEn: "Order of operations and the commutative, associative & distributive laws.",
    blurbZh: "運算順序，以及交換律、結合律與分配律。" },

  { n: 3,  slug: "03-multiplication",  icon: "✖️",
    en: "Multi-digit Multiplication", zh: "多位數乘法",
    regions: ["CN", "HK", "SG"],
    blurbEn: "Multiply 3-digit by 2-digit numbers with the area (grid) model.",
    blurbZh: "用面積（格子）模型計算三位數乘兩位數。" },

  { n: 4,  slug: "04-division",        icon: "➗",
    en: "Division (2-digit divisors)", zh: "除法（兩位數除數）",
    regions: ["CN", "HK", "SG"],
    blurbEn: "Long division step by step, and sharing into equal groups.",
    blurbZh: "逐步進行長除法，並把物品平均分組。" },

  { n: 5,  slug: "05-factors-multiples", icon: "🧩",
    en: "Factors & Multiples", zh: "因數與倍數",
    regions: ["SG", "HK"],
    blurbEn: "Find factors by building rectangles; spot multiples on a hundred chart.",
    blurbZh: "用長方形找因數；在百數表上找出倍數。" },

  { n: 6,  slug: "06-fractions",       icon: "🍰",
    en: "Fractions", zh: "分數",
    regions: ["CN", "HK", "SG"],
    blurbEn: "Equivalent fractions and adding & subtracting with bars and pies.",
    blurbZh: "用分數條和圓形理解等值分數與加減。" },

  { n: 7,  slug: "07-decimals",        icon: "🔟",
    en: "Decimals", zh: "小數",
    regions: ["CN", "HK", "SG"],
    blurbEn: "Decimal place value with 10×10 squares, a number line and rounding.",
    blurbZh: "用百格圖、數線理解小數位值與四捨五入。" },

  { n: 8,  slug: "08-angles",          icon: "📐",
    en: "Angles & Directions", zh: "角與方向",
    regions: ["CN", "HK", "SG"],
    blurbEn: "Measure with a protractor; classify angles; use the 8-point compass.",
    blurbZh: "用量角器量度、分類角；認識八方位。" },

  { n: 9,  slug: "09-lines",           icon: "📏",
    en: "Perpendicular & Parallel Lines", zh: "垂直與平行線",
    regions: ["CN", "HK", "SG"],
    blurbEn: "Drag lines to discover when they are parallel or perpendicular.",
    blurbZh: "拖動直線，發現何時平行、何時垂直。" },

  { n: 10, slug: "10-triangles",       icon: "🔺",
    en: "Triangles", zh: "三角形",
    regions: ["CN", "HK"],
    blurbEn: "Classify triangles by sides and angles; angles always sum to 180°.",
    blurbZh: "按邊和角分類三角形；內角和永遠是 180°。" },

  { n: 11, slug: "11-quadrilaterals",  icon: "⬜",
    en: "Quadrilaterals", zh: "四邊形",
    regions: ["CN", "HK", "SG"],
    blurbEn: "Morph between square, rectangle, parallelogram and trapezoid.",
    blurbZh: "在正方形、長方形、平行四邊形與梯形之間變形。" },

  { n: 12, slug: "12-area-perimeter",  icon: "🟦",
    en: "Area & Perimeter", zh: "面積與周長",
    regions: ["CN", "HK", "SG"],
    blurbEn: "Build shapes on a grid and watch area & perimeter update live.",
    blurbZh: "在方格上拼圖形，即時計算面積與周長。" },

  { n: 13, slug: "13-symmetry",        icon: "🦋",
    en: "Symmetry", zh: "對稱",
    regions: ["SG", "CN", "HK"],
    blurbEn: "Fold shapes to find lines of symmetry and draw mirror images.",
    blurbZh: "摺疊圖形找對稱軸，並畫出鏡像。" },

  { n: 14, slug: "14-graphs",          icon: "📊",
    en: "Bar & Line Graphs", zh: "條形圖與折線圖",
    regions: ["CN", "HK", "SG"],
    blurbEn: "Enter data and watch bar and line graphs build themselves.",
    blurbZh: "輸入數據，看條形圖與折線圖自動繪成。" },

  { n: 15, slug: "15-time",            icon: "🕐",
    en: "Time", zh: "時間",
    regions: ["HK", "SG"],
    blurbEn: "Read 12- and 24-hour clocks and work out how much time has passed.",
    blurbZh: "讀 12 與 24 小時制時鐘，計算經過的時間。" }
];
