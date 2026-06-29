/* Kazu (數寶) — the Number Land mascot.
   A cute anime-style star sprite drawn as inline SVG so it scales crisply and
   can be animated (blink, bob) and change expression. Each instance owns a
   speech bubble that re-renders when the language changes.

   Usage:
     var m = Mascot.create(containerEl);
     m.say("Hello!", "你好！");
     m.setMood("celebrate");            // idle | happy | thinking | celebrate
*/
(function () {
  var MOUTHS = {
    idle:      "M -14 14 Q 0 22 14 14",
    happy:     "M -16 12 Q 0 28 16 12",
    thinking:  "M -8 18 Q 0 14 8 18",
    celebrate: "M -16 10 Q 0 34 16 10 Q 0 22 -16 10 Z"
  };

  function svg() {
    return (
      '<svg class="kazu" viewBox="-70 -80 140 170" width="120" height="146" aria-hidden="true">' +
        // little legs
        '<ellipse cx="-16" cy="74" rx="11" ry="7" fill="#3a7bd5"/>' +
        '<ellipse cx="16" cy="74" rx="11" ry="7" fill="#3a7bd5"/>' +
        // body: a rounded star
        '<path class="kazu-body" d="' +
          'M0 -64 L17 -20 L64 -16 L28 14 L40 60 L0 36 L-40 60 L-28 14 L-64 -16 L-17 -20 Z" ' +
          'fill="#5b9bf3" stroke="#3a6fd0" stroke-width="4" stroke-linejoin="round"/>' +
        // face plate
        '<circle cx="0" cy="2" r="34" fill="#eef5ff"/>' +
        // cheeks
        '<circle cx="-20" cy="12" r="7" fill="#ffb3c7" opacity="0.8"/>' +
        '<circle cx="20" cy="12" r="7" fill="#ffb3c7" opacity="0.8"/>' +
        // eyes (scaleY animated for blink)
        '<g class="kazu-eyes">' +
          '<ellipse class="kazu-eye" cx="-12" cy="-4" rx="6" ry="8" fill="#22324a"/>' +
          '<ellipse class="kazu-eye" cx="12" cy="-4" rx="6" ry="8" fill="#22324a"/>' +
          '<circle cx="-10" cy="-7" r="2" fill="#fff"/>' +
          '<circle cx="14" cy="-7" r="2" fill="#fff"/>' +
        '</g>' +
        // mouth
        '<path class="kazu-mouth" d="' + MOUTHS.happy + '" fill="none" ' +
          'stroke="#22324a" stroke-width="3" stroke-linecap="round" transform="translate(0 6)"/>' +
        // antenna with number badge
        '<line x1="0" y1="-64" x2="0" y2="-78" stroke="#3a6fd0" stroke-width="3"/>' +
        '<circle cx="0" cy="-82" r="9" fill="#ffd54a" stroke="#e0a800" stroke-width="2"/>' +
        '<text x="0" y="-78" text-anchor="middle" font-size="11" font-weight="700" fill="#7a5a00">4</text>' +
      '</svg>'
    );
  }

  function create(container, opts) {
    opts = opts || {};
    var wrap = document.createElement("div");
    wrap.className = "mascot" + (opts.side === "right" ? " mascot-right" : "");
    wrap.innerHTML =
      '<div class="mascot-figure">' + svg() + '</div>' +
      '<div class="speech" hidden><div class="speech-text"></div></div>';
    container.appendChild(wrap);

    var mouth = wrap.querySelector(".kazu-mouth");
    var eyes  = wrap.querySelector(".kazu-eyes");
    var bubble = wrap.querySelector(".speech");
    var bubbleText = wrap.querySelector(".speech-text");
    var last = null; // {en, zh}

    // Blink on a relaxed, slightly irregular cadence.
    var blinkTimer;
    function scheduleBlink() {
      var delay = 2200 + (eyes.childElementCount * 137) % 900 + bubble.scrollTop;
      blinkTimer = setTimeout(function () {
        eyes.classList.add("blink");
        setTimeout(function () { eyes.classList.remove("blink"); scheduleBlink(); }, 150);
      }, 2600 + Math.abs((bubbleText.textContent.length * 53) % 1500));
    }
    scheduleBlink();

    function setMood(mood) {
      mouth.setAttribute("d", MOUTHS[mood] || MOUTHS.happy);
      wrap.classList.toggle("celebrate", mood === "celebrate");
    }

    function render() {
      if (!last) return;
      bubbleText.textContent = I18N.pick(last.en, last.zh);
    }

    function say(en, zh) {
      last = { en: en, zh: zh };
      bubble.hidden = false;
      render();
      // restart the pop animation
      bubble.classList.remove("pop"); void bubble.offsetWidth; bubble.classList.add("pop");
    }

    document.addEventListener("langchange", render);

    setMood(opts.mood || "happy");
    return { el: wrap, say: say, setMood: setMood, render: render };
  }

  window.Mascot = { create: create };
})();
