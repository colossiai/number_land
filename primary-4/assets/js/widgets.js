/* Small shared widgets & helpers used by lessons.
   NL.fmt(n)        -> "123,456"  (thousands separators)
   NL.rand(a,b)     -> random integer in [a,b]
   NL.quiz(host, questions)  -> renders a multiple-choice quiz.
       questions: [{ prompt:{en,zh}, options:[{en,zh}|string], answer: <index>,
                     explain?:{en,zh} }]
   Re-renders text on language change and cheers the mascot on a correct pick. */
(function () {
  function fmt(n) { return Number(n).toLocaleString("en-US"); }
  function rand(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }

  function optText(o) { return (typeof o === "string") ? o : I18N.pick(o.en, o.zh); }

  function quiz(host, questions) {
    host.innerHTML = "";
    host.classList.add("quiz");
    var renderers = [];

    questions.forEach(function (q, qi) {
      var card = document.createElement("div");
      card.className = "q";
      var prompt = document.createElement("div");
      prompt.className = "prompt";
      var opts = document.createElement("div");
      opts.className = "options";
      var fb = document.createElement("div");
      fb.className = "feedback";
      var solved = false;

      var btns = q.options.map(function (o, oi) {
        var b = document.createElement("button");
        b.className = "opt";
        b.addEventListener("click", function () {
          if (solved) return;
          if (oi === q.answer) {
            solved = true;
            b.classList.add("right");
            fb.className = "feedback good";
            fb.textContent = I18N.t("ui.correct") +
              (q.explain ? "  " + I18N.pick(q.explain.en, q.explain.zh) : "");
            if (window.mascot) { window.mascot.setMood("celebrate");
              window.mascot.say("Great job!", "做得好！");
              setTimeout(function(){ if(window.mascot) window.mascot.setMood("happy"); }, 1600); }
          } else {
            b.classList.add("wrong");
            fb.className = "feedback bad";
            fb.textContent = I18N.t("ui.tryAgain");
          }
        });
        opts.appendChild(b);
        return b;
      });

      function render() {
        prompt.textContent = (qi + 1) + ". " + I18N.pick(q.prompt.en, q.prompt.zh);
        btns.forEach(function (b, oi) { b.textContent = optText(q.options[oi]); });
        if (solved && q.explain) {
          fb.textContent = I18N.t("ui.correct") + "  " + I18N.pick(q.explain.en, q.explain.zh);
        } else if (fb.classList.contains("good")) {
          fb.textContent = I18N.t("ui.correct");
        } else if (fb.classList.contains("bad")) {
          fb.textContent = I18N.t("ui.tryAgain");
        }
      }
      renderers.push(render);
      card.appendChild(prompt); card.appendChild(opts); card.appendChild(fb);
      host.appendChild(card);
    });

    function renderAll() { renderers.forEach(function (r) { r(); }); }
    document.addEventListener("langchange", renderAll);
    renderAll();
  }

  window.NL = { fmt: fmt, rand: rand, quiz: quiz };
})();
