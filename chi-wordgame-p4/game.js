/* ============================================================
 *  識字樂園 — 遊戲邏輯
 * ============================================================ */

const ROUND_SIZE = 10;      // 每局題目數
const START_LIVES = 3;      // 生命值
const RECENT_MEMORY = 12;   // 避免最近出現過的字重複

const QUESTION_TYPES = ["char2pinyin", "pinyin2char", "fillblank", "distinguish", "sentence"];

const LS_BEST = "shizi_best";
const LS_WRONG = "shizi_wrongbook";

/* ---------- 小工具 ---------- */
const $ = (sel) => document.querySelector(sel);
const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const byChar = (c) => CHAR_DB.find((x) => x.char === c);

/* ---------- 讀音 (Web Speech API) ---------- */
let zhVoice = null;
function loadVoice() {
  const voices = speechSynthesis.getVoices();
  zhVoice =
    voices.find((v) => /zh-TW|zh-HK|yue/i.test(v.lang)) ||
    voices.find((v) => /zh/i.test(v.lang)) ||
    null;
}
if ("speechSynthesis" in window) {
  loadVoice();
  speechSynthesis.onvoiceschanged = loadVoice;
}
function speak(text) {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = zhVoice ? zhVoice.lang : "zh-TW";
  if (zhVoice) u.voice = zhVoice;
  u.rate = 0.8;
  u.pitch = 1.05;
  speechSynthesis.speak(u);
}

/* ---------- 錯題本 / 最高分 ---------- */
function getWrongbook() {
  try { return JSON.parse(localStorage.getItem(LS_WRONG)) || []; }
  catch { return []; }
}
function addWrong(char) {
  const wb = getWrongbook();
  if (!wb.includes(char)) { wb.push(char); localStorage.setItem(LS_WRONG, JSON.stringify(wb)); }
}
function removeWrong(char) {
  const wb = getWrongbook().filter((c) => c !== char);
  localStorage.setItem(LS_WRONG, JSON.stringify(wb));
}
function getBest() { return parseInt(localStorage.getItem(LS_BEST) || "0", 10); }
function setBest(s) { if (s > getBest()) localStorage.setItem(LS_BEST, String(s)); }

/* ---------- 隨機抽字（避免近期重複）---------- */
let recentChars = [];
function drawChars(n, pool) {
  const source = pool || CHAR_DB;
  const available = source.filter((c) => !recentChars.includes(c.char));
  const bag = shuffle(available.length >= n ? available : source);
  const chosen = bag.slice(0, n);
  chosen.forEach((c) => {
    recentChars.push(c.char);
    if (recentChars.length > RECENT_MEMORY) recentChars.shift();
  });
  return chosen;
}

/* ---------- 干擾項生成 ---------- */
// 選拼音干擾：優先相同聲母或近形字的拼音，避免與正解相同
function pinyinDistractors(entry, n) {
  const correct = entry.pinyin;
  const confPinyins = entry.conf.map(byChar).filter(Boolean).map((e) => e.pinyin);
  const others = CHAR_DB.map((e) => e.pinyin);
  const candidates = [...new Set([...confPinyins, ...shuffle(others)])]
    .filter((p) => p !== correct);
  return candidates.slice(0, n);
}
// 選字干擾：優先近形字，其次隨機
function charDistractors(entry, n) {
  const confChars = shuffle(entry.conf);
  const others = shuffle(CHAR_DB.map((e) => e.char));
  const candidates = [...new Set([...confChars, ...others])]
    .filter((c) => c !== entry.char);
  return candidates.slice(0, n);
}

/* ============================================================
 *  題目建構
 * ============================================================ */
function buildQuestion(entry, type) {
  switch (type) {
    case "char2pinyin": {
      const opts = shuffle([entry.pinyin, ...pinyinDistractors(entry, 3)]);
      return {
        type, entry, correct: entry.pinyin, options: opts,
        prompt: "這個字讀甚麼？",
        render: (area) => {
          area.innerHTML = `
            <p class="q-prompt">🔤 看字選音</p>
            <div class="q-char-box"><div class="q-char">${entry.char}</div>
              <div class="q-hint">部首「${entry.radical}」· ${entry.strokes}畫</div></div>`;
          renderOptions(area, opts, entry.pinyin);
        },
        speakOnLoad: () => {},
      };
    }
    case "pinyin2char": {
      const opts = shuffle([entry.char, ...charDistractors(entry, 3)]);
      return {
        type, entry, correct: entry.char, options: opts,
        prompt: "聽讀音，選出正確的字",
        render: (area) => {
          area.innerHTML = `
            <p class="q-prompt">🔊 聽音選字</p>
            <div style="text-align:center">
              <button class="q-audio-btn" id="replay">🔊 再聽一次</button>
              <div class="q-pinyin-big">${entry.pinyin}</div>
            </div>`;
          $("#replay").onclick = () => speak(entry.char);
          renderOptions(area, opts, entry.char, true);
        },
        speakOnLoad: () => speak(entry.char),
      };
    }
    case "fillblank": {
      const word = pick(entry.words);
      const idx = word.indexOf(entry.char);
      const display = word.split("").map((ch, i) =>
        i === idx ? `<span class="q-blank" id="blank">＿</span>` : ch).join("");
      const opts = shuffle([entry.char, ...charDistractors(entry, 3)]);
      return {
        type, entry, correct: entry.char, options: opts, word,
        prompt: "把缺少的字填進詞語",
        render: (area) => {
          area.innerHTML = `
            <p class="q-prompt">✏️ 詞語填空</p>
            <div class="q-char-box">
              <div class="q-sentence">${display}</div>
              <div class="q-hint">讀音：${entry.pinyin}</div>
            </div>`;
          renderOptions(area, opts, entry.char);
        },
        speakOnLoad: () => speak(word),
      };
    }
    case "distinguish": {
      // 近形字辨識：從相似字中選出正確的
      let confChars = entry.conf.filter((c) => c && c !== entry.char);
      confChars = shuffle(confChars).slice(0, 3);
      while (confChars.length < 3) {
        const r = pick(CHAR_DB).char;
        if (r !== entry.char && !confChars.includes(r)) confChars.push(r);
      }
      const word = pick(entry.words);
      const blanked = word.replace(entry.char, "◯");
      const opts = shuffle([entry.char, ...confChars]);
      return {
        type, entry, correct: entry.char, options: opts,
        prompt: "哪一個字才對？",
        render: (area) => {
          area.innerHTML = `
            <p class="q-prompt">🔍 辨形高手</p>
            <div class="q-char-box">
              <div class="q-sentence">${blanked}</div>
              <div class="q-hint">讀音：${entry.pinyin}　（小心相似的字！）</div>
            </div>`;
          renderOptions(area, opts, entry.char);
        },
        speakOnLoad: () => speak(word),
      };
    }
    case "sentence": {
      // 句子情境識字：把目標字從完整句子中挖空
      const s = entry.sentence;
      const idx = s.indexOf(entry.char);
      const display = s.substring(0, idx) +
        `<span class="q-blank">＿</span>` + s.substring(idx + 1);
      const opts = shuffle([entry.char, ...charDistractors(entry, 3)]);
      return {
        type, entry, correct: entry.char, options: opts,
        prompt: "把句子裏缺少的字選出來",
        render: (area) => {
          area.innerHTML = `
            <p class="q-prompt">📖 句子填空</p>
            <div class="q-char-box">
              <div class="q-sentence">${display}</div>
              <button class="q-audio-btn" id="replay" style="margin-top:16px">🔊 聽整句</button>
              <div class="q-hint">讀音：${entry.pinyin}</div>
            </div>`;
          const r = area.querySelector("#replay");
          if (r) r.onclick = () => speak(s);
          renderOptions(area, opts, entry.char);
        },
        speakOnLoad: () => speak(s),
      };
    }
  }
}

function renderOptions(area, options, correct, showPinyin) {
  const wrap = document.createElement("div");
  wrap.className = "options";
  options.forEach((opt) => {
    const b = document.createElement("button");
    b.className = "option";
    if (showPinyin) {
      const e = byChar(opt);
      b.innerHTML = `${opt}${e ? `<span class="opt-sub">${e.pinyin}</span>` : ""}`;
    } else {
      b.textContent = opt;
    }
    b.onclick = () => G.answer(opt, correct, b);
    wrap.appendChild(b);
  });
  area.appendChild(wrap);
}

/* ============================================================
 *  遊戲狀態機
 * ============================================================ */
const G = {
  mode: "mixed",
  gradeFilter: 0, // 0 = 全部年級，1-6 = 指定年級
  questions: [],
  index: 0,
  score: 0,
  combo: 0,
  lives: START_LIVES,
  correctCount: 0,
  wrongList: [],
  answered: false,

  start(mode) {
    this.mode = mode;
    this.index = 0; this.score = 0; this.combo = 0;
    this.lives = START_LIVES; this.correctCount = 0;
    this.wrongList = []; this.answered = false;

    let pool = CHAR_DB;
    if (mode === "wrongbook") {
      const wb = getWrongbook();
      if (wb.length === 0) { alert("太棒了！目前沒有錯題，先去挑戰其他模式吧 😊"); return; }
      pool = wb.map(byChar).filter(Boolean);
    } else if (this.gradeFilter) {
      pool = CHAR_DB.filter((c) => c.grade === this.gradeFilter);
    }

    // wrongbook 模式：從錯字池直接抽（可能少於 ROUND_SIZE）；其他模式從（已按年級篩選的）字池隨機抽且避免近期重複
    const finalEntries = mode === "wrongbook"
      ? shuffle(pool).slice(0, ROUND_SIZE)
      : drawChars(ROUND_SIZE, pool);

    this.questions = finalEntries.map((entry) => {
      let type;
      if (mode === "mixed" || mode === "wrongbook") type = pick(QUESTION_TYPES);
      else type = mode;
      return buildQuestion(entry, type);
    });

    showScreen("game");
    this.renderQuestion();
  },

  renderQuestion() {
    this.answered = false;
    const q = this.questions[this.index];
    $("#hud-score").textContent = this.score;
    $("#hud-lives").textContent = "❤️".repeat(this.lives) + "🖤".repeat(START_LIVES - this.lives);
    $("#hud-combo").textContent = this.combo >= 2 ? `🔥 連對 ${this.combo}` : "";
    $("#question-count").textContent = `第 ${this.index + 1} / ${this.questions.length} 題`;
    $("#progress-fill").style.width = `${(this.index / this.questions.length) * 100}%`;
    $("#feedback").innerHTML = "";

    const area = $("#question-area");
    area.innerHTML = "";
    q.render(area);
    setTimeout(() => q.speakOnLoad && q.speakOnLoad(), 250);
  },

  answer(chosen, correct, btn) {
    if (this.answered) return;
    this.answered = true;
    const q = this.questions[this.index];
    const buttons = document.querySelectorAll(".option");
    buttons.forEach((b) => (b.disabled = true));

    const isRight = chosen === correct;
    if (isRight) {
      btn.classList.add("correct");
      this.combo += 1;
      this.correctCount += 1;
      const gain = 100 + (this.combo - 1) * 20;
      this.score += gain;
      if (this.mode === "wrongbook") removeWrong(q.entry.char);
      this.showFeedback(true, q, gain);
    } else {
      btn.classList.add("wrong");
      buttons.forEach((b) => {
        const val = b.querySelector(".opt-sub") ? b.childNodes[0].textContent : b.textContent;
        if (val === correct) b.classList.add("correct");
      });
      this.combo = 0;
      this.lives -= 1;
      this.wrongList.push(q.entry);
      addWrong(q.entry.char);
      speak(q.entry.char);
      this.showFeedback(false, q, 0);
    }

    $("#hud-score").textContent = this.score;
    $("#hud-lives").textContent = "❤️".repeat(Math.max(0, this.lives)) + "🖤".repeat(START_LIVES - Math.max(0, this.lives));
    $("#hud-combo").textContent = this.combo >= 2 ? `🔥 連對 ${this.combo}` : "";

    const delay = isRight ? 1100 : 2400;
    setTimeout(() => {
      if (this.lives <= 0) return this.finish();
      this.index += 1;
      if (this.index >= this.questions.length) return this.finish();
      this.renderQuestion();
    }, delay);
  },

  showFeedback(ok, q, gain) {
    const e = q.entry;
    const fb = $("#feedback");
    if (ok) {
      fb.innerHTML = `
        <div class="feedback-card ok">
          <div class="feedback-title">✅ 答對了！ +${gain}</div>
          <div class="feedback-info"><b>${e.char}</b>（${e.pinyin}）· 組詞：${e.words.join("、")}</div>
        </div>`;
    } else {
      fb.innerHTML = `
        <div class="feedback-card no">
          <div class="feedback-title">❌ 正確答案：${q.correct}</div>
          <div class="feedback-info"><b>${e.char}</b>（${e.pinyin}）部首「${e.radical}」<br>
            📖 ${e.sentence}</div>
        </div>`;
    }
  },

  finish() {
    setBest(this.score);
    const total = this.questions.length;
    const acc = total ? Math.round((this.correctCount / total) * 100) : 0;
    let stars = 1;
    if (acc >= 90) stars = 3; else if (acc >= 60) stars = 2;
    const titles = { 3: "太厲害了！識字小達人 🏆", 2: "做得不錯，繼續加油！💪", 1: "多多練習會更好喔 🌱" };

    $("#result-stars").textContent = "⭐".repeat(stars) + "☆".repeat(3 - stars);
    $("#result-title").textContent = titles[stars];
    $("#result-score").textContent = `${this.score} 分`;
    $("#result-detail").textContent = `答對 ${this.correctCount} / ${total} 題 · 正確率 ${acc}% · 最高分 ${getBest()}`;

    const wrongBox = $("#result-wrong");
    if (this.wrongList.length) {
      const uniq = [...new Map(this.wrongList.map((e) => [e.char, e])).values()];
      wrongBox.innerHTML = `<p style="margin-bottom:8px;color:var(--ink-soft)">要複習的字：</p>` +
        uniq.map((e) => `
          <div class="result-wrong-item">
            <span class="rw-char">${e.char}</span>${e.pinyin} · ${e.words.join("、")}
          </div>`).join("");
    } else {
      wrongBox.innerHTML = `<p style="text-align:center;color:var(--correct);font-weight:700">全部答對，零錯題！🎉</p>`;
    }
    showScreen("result");
  },
};

/* ============================================================
 *  畫面控制 & 事件綁定
 * ============================================================ */
function showScreen(name) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  $(`#screen-${name}`).classList.add("active");
  if (name === "start") refreshStart();
}

function refreshStart() {
  const best = getBest();
  $("#best-score-line").textContent = best ? `🏆 最高分：${best}` : "開始你的第一場挑戰吧！";
  const wb = getWrongbook().length;
  $("#wrongbook-count").textContent = wb ? `目前有 ${wb} 個錯字待複習` : "暫時沒有錯題 🎉";
}

document.querySelectorAll(".grade-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".grade-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    G.gradeFilter = parseInt(btn.dataset.grade, 10);
    recentChars = []; // 切換年級後重置防重複隊列
  });
});

document.querySelectorAll(".mode-card").forEach((card) => {
  card.addEventListener("click", () => G.start(card.dataset.mode));
});
$("#btn-quit").addEventListener("click", () => { speechSynthesis.cancel(); showScreen("start"); });
$("#btn-again").addEventListener("click", () => G.start(G.mode));
$("#btn-home").addEventListener("click", () => showScreen("start"));

refreshStart();
