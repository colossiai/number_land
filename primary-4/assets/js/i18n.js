/* Tiny bilingual (English / Traditional Chinese) helper.
   - Current language is stored in localStorage ("nl-lang"), default "en".
   - Any element with data-i18n="key" gets its textContent set from the string table.
   - Any element with data-i18n-html="key" gets innerHTML set (use sparingly).
   - Lessons add their own strings with I18N.register({ key: {en, zh} }).
   - On change, a "langchange" event fires on document so canvases can redraw labels. */
(function () {
  var STORE_KEY = "nl-lang";

  // Shared UI strings used across the hub and every lesson.
  var strings = {
    "site.title":      { en: "Number Land · Primary 4 Maths", zh: "數字樂園 · 小四數學" },
    "site.tagline":    { en: "Interactive maths for China · Hong Kong · Singapore",
                         zh: "互動數學 · 中國 · 香港 · 新加坡" },
    "ui.home":         { en: "Home", zh: "首頁" },
    "ui.prev":         { en: "‹ Previous", zh: "‹ 上一課" },
    "ui.next":         { en: "Next ›", zh: "下一課 ›" },
    "ui.lang":         { en: "中文", zh: "EN" }, // label shows the language you switch TO
    "ui.allRegions":   { en: "All regions", zh: "全部地區" },
    "ui.lesson":       { en: "Lesson", zh: "第" },
    "ui.lessonSuffix": { en: "", zh: " 課" },
    "ui.tryIt":        { en: "Try it yourself", zh: "親自試試" },
    "ui.concept":      { en: "The idea", zh: "概念" },
    "ui.example":      { en: "Worked example", zh: "例題講解" },
    "ui.explore":      { en: "Explore", zh: "動手探索" },
    "ui.check":        { en: "Check", zh: "核對" },
    "ui.correct":      { en: "Correct! 🎉", zh: "答對了！🎉" },
    "ui.tryAgain":     { en: "Not quite — try again.", zh: "還差一點，再試一次。" },
    "ui.reset":        { en: "Reset", zh: "重設" },
    "ui.region.CN":    { en: "China", zh: "中國" },
    "ui.region.HK":    { en: "Hong Kong", zh: "香港" },
    "ui.region.SG":    { en: "Singapore", zh: "新加坡" },
    "ui.next.label":   { en: "Next", zh: "下一步" },
    "ui.play":         { en: "Play ▶", zh: "播放 ▶" }
  };

  var lang = (function () {
    try { return localStorage.getItem(STORE_KEY) || "en"; }
    catch (e) { return "en"; }
  })();

  function register(obj) {
    for (var k in obj) { if (obj.hasOwnProperty(k)) strings[k] = obj[k]; }
  }

  function t(key) {
    var s = strings[key];
    if (!s) return key;
    return (s[lang] != null ? s[lang] : s.en);
  }

  function apply(root) {
    root = root || document;
    var nodes = root.querySelectorAll("[data-i18n]");
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].textContent = t(nodes[i].getAttribute("data-i18n"));
    }
    var html = root.querySelectorAll("[data-i18n-html]");
    for (var j = 0; j < html.length; j++) {
      html[j].innerHTML = t(html[j].getAttribute("data-i18n-html"));
    }
    document.documentElement.lang = (lang === "zh" ? "zh-Hant" : "en");
  }

  function setLang(newLang) {
    lang = (newLang === "zh" ? "zh" : "en");
    try { localStorage.setItem(STORE_KEY, lang); } catch (e) {}
    apply();
    document.dispatchEvent(new CustomEvent("langchange", { detail: { lang: lang } }));
  }

  function toggle() { setLang(lang === "en" ? "zh" : "en"); }

  // Pick the right value from a {en, zh} pair or two args.
  function pick(en, zh) {
    if (typeof en === "object" && en) return (en[lang] != null ? en[lang] : en.en);
    return (lang === "zh" && zh != null) ? zh : en;
  }

  window.I18N = {
    get lang() { return lang; },
    register: register,
    t: t,
    apply: apply,
    setLang: setLang,
    toggle: toggle,
    pick: pick
  };
})();
