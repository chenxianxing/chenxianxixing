/* ============================================================
   番茄钟 - 工具页逻辑
   圆环进度 + Date.now 差值计时 + 阶段自动切换
   Web Audio 合成提示音 + 今日番茄统计 + 标题倒计时
   ============================================================ */
(function () {
  "use strict";

  /* ---------- DOM ---------- */
  var timeEl = document.getElementById("pomoTime");
  var phaseEl = document.getElementById("pomoPhase");
  var countEl = document.getElementById("pomoCount");
  var progEl = document.getElementById("pomoProg");
  var focusEl = document.getElementById("pomoFocus");
  var shortEl = document.getElementById("pomoShort");
  var longEl = document.getElementById("pomoLong");
  var cycleEl = document.getElementById("pomoCycle");
  var startBtn = document.getElementById("pomoStart");
  var resetBtn = document.getElementById("pomoReset");
  var skipBtn = document.getElementById("pomoSkip");
  var soundChk = document.getElementById("pomoSound");

  /* ---------- 提示 ---------- */
  var toastEl = document.getElementById("toast");
  var toastTimer = null;
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 2000);
  }

  /* ---------- 常量 / 状态 ---------- */
  var R = 116;
  var CIRC = 2 * Math.PI * R;
  var COLOR_FOCUS = null; /* 取 CSS 变量 --primary */
  var COLOR_BREAK = "#10b981";

  var PHASES = { focus: "专注", short: "短休息", long: "长休息" };

  var state = {
    phase: "focus",
    total: 25 * 60,     /* 当前阶段总秒数 */
    remaining: 25 * 60, /* 剩余秒数（暂停时保存） */
    running: false,
    endAt: 0,           /* 运行时的目标时间戳 */
    tick: null,
    focusCount: 0,      /* 本轮已完成的专注数（用于长休息判定） */
    tomatoes: 0         /* 今日累计番茄数 */
  };

  progEl.style.strokeDasharray = CIRC;
  progEl.style.strokeDashoffset = CIRC;

  function durationOf(phase) {
    var v;
    if (phase === "focus") v = parseInt(focusEl.value, 10);
    else if (phase === "short") v = parseInt(shortEl.value, 10);
    else v = parseInt(longEl.value, 10);
    if (!isFinite(v) || v < 1) v = 1;
    return v * 60;
  }

  function currentColor() {
    if (state.phase === "focus") {
      if (COLOR_FOCUS === null) {
        COLOR_FOCUS = getComputedStyle(document.documentElement)
          .getPropertyValue("--primary").trim() || "#2563eb";
      }
      return COLOR_FOCUS;
    }
    return COLOR_BREAK;
  }

  /* ---------- 渲染 ---------- */
  function fmt(sec) {
    sec = Math.max(0, Math.round(sec));
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return (m < 10 ? "0" + m : m) + ":" + (s < 10 ? "0" + s : s);
  }

  function render() {
    var label = PHASES[state.phase];
    timeEl.textContent = fmt(state.remaining);
    phaseEl.textContent = label;
    countEl.textContent = t("今日完成：{n} 个番茄", { n: String(state.tomatoes) });

    var frac = state.total > 0 ? state.remaining / state.total : 0;
    if (frac < 0) frac = 0;
    if (frac > 1) frac = 1;
    progEl.style.strokeDashoffset = CIRC * (1 - frac);
    progEl.style.stroke = currentColor();

    document.title = (state.running ? fmt(state.remaining) + " · " : "") + label + " - 番茄钟";

    startBtn.textContent = state.running ? t("暂停") : (state.remaining < state.total ? t("继续") : t("开始"));
  }

  /* ---------- 音频 ---------- */
  var audioCtx = null;
  function ensureAudio() {
    if (audioCtx) return;
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) audioCtx = new Ctx();
    } catch (e) { audioCtx = null; }
  }
  function playDing() {
    if (!soundChk.checked) return;
    ensureAudio();
    if (!audioCtx) return;
    if (audioCtx.state === "suspended") audioCtx.resume();
    var now = audioCtx.currentTime;
    [880, 1320].forEach(function (freq, i) {
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      var start = now + i * 0.18;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.4, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.32);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(start);
      osc.stop(start + 0.34);
    });
  }

  /* ---------- 计时 ---------- */
  function tick() {
    var left = (state.endAt - Date.now()) / 1000;
    if (left <= 0) {
      state.remaining = 0;
      render();
      completePhase();
      return;
    }
    state.remaining = left;
    render();
  }

  function startLoop() {
    stopLoop();
    state.tick = setInterval(tick, 250);
  }
  function stopLoop() {
    if (state.tick) { clearInterval(state.tick); state.tick = null; }
  }

  function start() {
    ensureAudio(); /* 用户点击后才创建 AudioContext */
    if (state.running) { /* 暂停 */
      state.running = false;
      stopLoop();
      render();
      return;
    }
    state.running = true;
    state.endAt = Date.now() + state.remaining * 1000;
    startLoop();
    render();
  }

  function reset() {
    state.running = false;
    stopLoop();
    state.phase = "focus";
    state.total = durationOf("focus");
    state.remaining = state.total;
    state.focusCount = 0;
    render();
  }

  function nextPhase() {
    if (state.phase === "focus") {
      state.tomatoes++;
      state.focusCount++;
      var cycle = parseInt(cycleEl.value, 10);
      if (!isFinite(cycle) || cycle < 2) cycle = 2;
      state.phase = (state.focusCount % cycle === 0) ? "long" : "short";
    } else {
      state.phase = "focus";
    }
    state.total = durationOf(state.phase);
    state.remaining = state.total;
  }

  function completePhase() {
    stopLoop();
    state.running = false;
    playDing();
    var finished = state.phase;
    nextPhase();
    showToast(t("{n}结束，进入{f}", { n: PHASES[finished], f: PHASES[state.phase] }));
    render();
  }

  function skip() {
    if (state.running) {
      stopLoop();
      state.running = false;
    }
    /* 跳过当前阶段：若跳过的是专注，也计入番茄数 */
    if (state.phase === "focus") {
      state.tomatoes++;
      state.focusCount++;
    }
    nextPhase();
    render();
    showToast(t("已跳过，进入{p}", { p: PHASES[state.phase] }));
  }

  /* ---------- 事件 ---------- */
  startBtn.addEventListener("click", start);
  resetBtn.addEventListener("click", function () {
    reset();
    showToast(t("已重置"));
  });
  skipBtn.addEventListener("click", skip);

  [focusEl, shortEl, longEl, cycleEl].forEach(function (el) {
    el.addEventListener("change", function () {
      if (!state.running) {
        /* 仅在未运行时刷新当前阶段时长 */
        state.phase = "focus";
        state.focusCount = 0;
        state.total = durationOf("focus");
        state.remaining = state.total;
        render();
      }
    });
  });

  /* 恢复页面时校正（基于真实时间差，无需额外处理） */
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && state.running) tick();
  });

  /* ---------- 初始化 ---------- */
  state.total = durationOf("focus");
  state.remaining = state.total;
  render();
})();
