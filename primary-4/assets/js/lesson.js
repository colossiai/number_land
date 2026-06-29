/* Shared lesson chrome. A lesson page only provides its <main> content and a
   lesson-specific <script>; this file builds the top bar, the lesson header
   (title + region badges), the prev/next/home navigation, mounts the mascot,
   and runs the language toggle.

   A lesson declares its number on the body:  <body data-lesson="1">
   and (optionally) an element  <div data-mascot></div>  where Kazu should live
   (exposed afterwards as window.mascot). */
(function () {
  var REGION_FLAG = { CN: "🇨🇳", HK: "🇭🇰", SG: "🇸🇬" };

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function lessonByNumber(n) {
    for (var i = 0; i < window.LESSONS.length; i++) {
      if (window.LESSONS[i].n === n) return { lesson: window.LESSONS[i], index: i };
    }
    return null;
  }

  function build() {
    var n = parseInt(document.body.getAttribute("data-lesson"), 10);
    var found = lessonByNumber(n);
    if (!found) return;
    var lesson = found.lesson, idx = found.index;
    var prev = window.LESSONS[idx - 1], next = window.LESSONS[idx + 1];

    document.title = I18N.pick(lesson.en, lesson.zh) + " · " + I18N.t("site.title");

    // ---- top bar -------------------------------------------------------
    var bar = el("header", "topbar");
    var brand = el("a", "brand",
      '🌟 <span data-i18n="site.title"></span>');
    brand.href = "../../index.html";
    var langBtn = el("button", "lang-btn", "");
    langBtn.setAttribute("data-i18n", "ui.lang");
    langBtn.addEventListener("click", function () { I18N.toggle(); });
    bar.appendChild(brand);
    bar.appendChild(langBtn);
    document.body.insertBefore(bar, document.body.firstChild);

    // ---- lesson header -------------------------------------------------
    var head = el("div", "lesson-head");
    var crumb = el("div", "crumbs");
    var homeLink = el("a", null, "");
    homeLink.href = "../../index.html";
    homeLink.setAttribute("data-i18n", "ui.home");
    crumb.appendChild(homeLink);
    var sep = el("span", "crumb-sep", " · ");
    var num = el("span", null, "");
    function renderNum() {
      num.textContent = (I18N.lang === "zh")
        ? (I18N.t("ui.lesson") + " " + lesson.n + I18N.t("ui.lessonSuffix"))
        : (I18N.t("ui.lesson") + " " + lesson.n);
    }
    crumb.appendChild(sep); crumb.appendChild(num);

    var h1 = el("h1", "lesson-title");
    var title = el("span", null, "");
    function renderTitle() { title.textContent = I18N.pick(lesson.en, lesson.zh); }
    h1.innerHTML = '<span class="lesson-icon">' + lesson.icon + "</span> ";
    h1.appendChild(title);

    var badges = el("div", "badges");
    lesson.regions.forEach(function (r) {
      var b = el("span", "badge badge-" + r,
        REGION_FLAG[r] + ' <span data-i18n="ui.region.' + r + '"></span>');
      badges.appendChild(b);
    });

    head.appendChild(crumb);
    head.appendChild(h1);
    head.appendChild(badges);

    var main = document.querySelector("main");
    document.body.insertBefore(head, main);

    // ---- footer nav ----------------------------------------------------
    var nav = el("nav", "lesson-nav");
    function navLink(lessonObj, key, cls) {
      if (!lessonObj) { var spacer = el("span", "navlink spacer"); return spacer; }
      var a = el("a", "navlink " + cls, "");
      a.href = "../" + lessonObj.slug + "/index.html";
      var label = el("span", "navlink-label", "");
      label.setAttribute("data-i18n", key);
      var name = el("span", "navlink-name", "");
      name.textContent = lessonObj.icon + " " + I18N.pick(lessonObj.en, lessonObj.zh);
      a.appendChild(label); a.appendChild(name);
      a.addEventListener("nameupdate", function(){});
      a._lesson = lessonObj; a._name = name;
      return a;
    }
    var prevA = navLink(prev, "ui.prev", "nav-prev");
    var home = el("a", "navlink nav-home", "");
    home.href = "../../index.html";
    home.innerHTML = '🏠 <span data-i18n="ui.home"></span>';
    var nextA = navLink(next, "ui.next", "nav-next");
    nav.appendChild(prevA); nav.appendChild(home); nav.appendChild(nextA);
    document.body.appendChild(nav);

    // ---- mascot --------------------------------------------------------
    var host = document.querySelector("[data-mascot]");
    if (host) {
      window.mascot = Mascot.create(host, { side: host.getAttribute("data-mascot") || "left" });
    }

    // ---- language wiring ----------------------------------------------
    function refreshDynamic() {
      renderNum(); renderTitle();
      [prevA, nextA].forEach(function (a) {
        if (a._lesson) a._name.textContent = a._lesson.icon + " " + I18N.pick(a._lesson.en, a._lesson.zh);
      });
      document.title = I18N.pick(lesson.en, lesson.zh) + " · " + I18N.t("site.title");
    }
    document.addEventListener("langchange", refreshDynamic);

    I18N.apply();
    refreshDynamic();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", build);
  } else {
    build();
  }
})();
