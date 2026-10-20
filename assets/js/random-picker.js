/* ============================================================
   随机抽签 & 决策转盘 - 工具页逻辑
   模式：决策转盘 / 列表抽签 / 随机数 / 骰子 / 抛硬币
   全部本地计算；真随机用 Web Crypto，种子模式用 mulberry32
   ============================================================ */
(function () {
  "use strict";

  /* ---------------- 通用：提示与复制 ---------------- */
  var toastEl = document.getElementById("toast");
  var toastTimer = null;
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 2000);
  }
  function copyText(text, msg) {
    function done() { showToast(msg); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
    } else {
      fallbackCopy(text);
      done();
    }
  }
  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) { /* ignore */ }
    document.body.removeChild(ta);
  }

  /* ---------------- 随机数源 ---------------- */
  // 默认真随机：crypto.getRandomValues
  function cryptoFloat() {
    var a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] / 4294967296; // [0,1)
  }
  // 种子模式：mulberry32 伪随机
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashSeed(str) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }

  var seedMode = false;
  var seedStr = "";
  var floatRng = cryptoFloat; // 返回 [0,1)

  // 无偏整数：seed 模式用伪随机，否则 crypto 拒绝采样
  function randInt(n) {
    if (n <= 1) return 0;
    if (seedMode) return Math.floor(floatRng() * n);
    var limit = Math.floor(4294967296 / n) * n; // 2^32 向下取 n 的倍数
    if (limit === 0) return 0;
    var buf = new Uint32Array(1);
    var x;
    do { crypto.getRandomValues(buf); x = buf[0]; } while (x >= limit);
    return x % n;
  }
  function randFloat() {
    return seedMode ? floatRng() : cryptoFloat();
  }

  /* ---------------- 模式切换 tab ---------------- */
  var modeTabs = document.getElementById("modeTabs");
  Array.prototype.forEach.call(modeTabs.querySelectorAll("button"), function (btn) {
    btn.addEventListener("click", function () {
      Array.prototype.forEach.call(modeTabs.querySelectorAll("button"), function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      var mode = btn.getAttribute("data-mode");
      ["wheel", "list", "number", "dice", "coin"].forEach(function (m) {
        document.getElementById("panel-" + m).classList.toggle("active", m === mode);
      });
    });
  });

  /* ================= 决策转盘 ================= */
  var canvas = document.getElementById("wheelCanvas");
  var wheelItemsEl = document.getElementById("wheelItems");
  var wheelResult = document.getElementById("wheelResult");
  var wheelHistory = document.getElementById("wheelHistory");
  var removeAfterWin = document.getElementById("removeAfterWin");
  var btnSpin = document.getElementById("btnSpin");

  var palette = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16"];
  var items = [];
  var currentRot = 0;
  var spinning = false;
  var winHistory = [];

  function defaultItems() {
    items = [];
    for (var i = 1; i <= 6; i++) {
      items.push({ text: "选项" + i, color: palette[(i - 1) % palette.length] });
    }
  }

  function renderItems() {
    wheelItemsEl.innerHTML = "";
    items.forEach(function (it, idx) {
      var row = document.createElement("div");
      row.className = "wheel-item-row";
      var sw = document.createElement("span");
      sw.className = "swatch";
      sw.style.background = it.color;
      var inp = document.createElement("input");
      inp.type = "text";
      inp.value = it.text;
      inp.addEventListener("input", function () { it.text = inp.value; drawWheel(currentRot); });
      var del = document.createElement("button");
      del.className = "del";
      del.type = "button";
      del.textContent = "×";
      del.setAttribute("aria-label", t("删除条目"));
      del.addEventListener("click", function () {
        if (items.length <= 2) { showToast(t("请至少保留 2 个条目")); return; }
        items.splice(idx, 1);
        renderItems();
        drawWheel(currentRot);
      });
      row.appendChild(sw);
      row.appendChild(inp);
      row.appendChild(del);
      wheelItemsEl.appendChild(row);
    });
  }

  function truncate(s, n) {
    return s.length > n ? s.slice(0, n - 1) + "…" : s;
  }

  function drawWheel(rot) {
    var ctx = canvas.getContext("2d");
    var w = canvas.width, h = canvas.height, cx = w / 2, cy = h / 2, r = Math.min(cx, cy) - 6;
    ctx.clearRect(0, 0, w, h);
    var N = items.length;
    if (N === 0) return;
    var seg = (2 * Math.PI) / N;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    for (var i = 0; i < N; i++) {
      var start = i * seg, end = (i + 1) * seg;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, start, end);
      ctx.closePath();
      ctx.fillStyle = items[i].color;
      ctx.fill();
      ctx.save();
      ctx.rotate((i + 0.5) * seg);
      ctx.fillStyle = "#fff";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(truncate(items[i].text || ("选项" + (i + 1)), 12), r - 12, 0);
      ctx.restore();
    }
    ctx.restore();
    // 中心轴
    ctx.beginPath();
    ctx.arc(cx, cy, 9, 0, 2 * Math.PI);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#cbd5e1";
    ctx.stroke();
  }

  function renderHistory() {
    wheelHistory.innerHTML = "";
    if (winHistory.length === 0) return;
    winHistory.forEach(function (txt, i) {
      var s = document.createElement("span");
      s.textContent = (i + 1) + ". " + txt;
      wheelHistory.appendChild(s);
    });
  }

  function spin() {
    if (spinning) return;
    if (items.length < 2) { showToast(t("请至少保留 2 个条目")); return; }
    spinning = true;
    btnSpin.disabled = true;
    var idx = randInt(items.length);
    var N = items.length, seg = (2 * Math.PI) / N;
    var ptrTop = -Math.PI / 2; // 指针在顶部
    var base = ptrTop - (idx + 0.5) * seg;
    var turns = 5;
    var k = Math.ceil((currentRot - base) / (2 * Math.PI)) + turns;
    var target = base + k * 2 * Math.PI;
    var startRot = currentRot;
    var duration = 4000;
    var startTime = null;
    function frame(ts) {
      if (startTime === null) startTime = ts;
      var p = Math.min((ts - startTime) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      currentRot = startRot + (target - startRot) * eased;
      drawWheel(currentRot);
      if (p < 1) {
        requestAnimationFrame(frame);
      } else {
        spinning = false;
        btnSpin.disabled = false;
        var won = items[idx];
        var label = won.text || ("选项" + (idx + 1));
        wheelResult.textContent = t("🎉 结果：{n}", { n: label });
        winHistory.unshift(label);
        if (winHistory.length > 20) winHistory.pop();
        renderHistory();
        if (removeAfterWin.checked) {
          items.splice(idx, 1);
          renderItems();
          drawWheel(currentRot);
        }
      }
    }
    requestAnimationFrame(frame);
  }

  document.getElementById("btnAddItem").addEventListener("click", function () {
    items.push({ text: "选项" + (items.length + 1), color: palette[items.length % palette.length] });
    renderItems();
    drawWheel(currentRot);
  });
  document.getElementById("btnImport").addEventListener("click", function () {
    var txt = window.prompt(t("请输入条目，每行一项："), items.map(function (it) { return it.text; }).join("\n"));
    if (txt === null) return;
    var lines = txt.split("\n").map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 0; });
    if (lines.length === 0) { showToast(t("未检测到有效条目")); return; }
    items = lines.map(function (s, i) { return { text: s, color: palette[i % palette.length] }; });
    renderItems();
    drawWheel(currentRot);
    showToast(t("已导入 {n} 个条目", { n: items.length }));
  });
  btnSpin.addEventListener("click", spin);
  document.getElementById("btnWheelReset").addEventListener("click", function () {
    defaultItems();
    winHistory = [];
    renderItems();
    drawWheel(currentRot);
    renderHistory();
    wheelResult.textContent = t("点击「开始旋转」抽取结果");
  });

  /* ================= 列表抽签 ================= */
  var listInput = document.getElementById("listInput");
  var listNoRepeat = document.getElementById("listNoRepeat");
  var listResult = document.getElementById("listResult");
  var listRemain = document.getElementById("listRemain");
  var listDrawn = document.getElementById("listDrawn");
  var shuffleList = document.getElementById("shuffleList");
  var listPool = [];
  var drawnCount = 0;

  function getListItems() {
    return listInput.value.split("\n").map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 0; });
  }
  function updateListStat() {
    var total = getListItems().length;
    var remain = listNoRepeat.checked ? listPool.length : total;
    listRemain.textContent = t("剩余 {n} 项", { n: remain });
    listDrawn.textContent = t("已抽 {n} 项", { n: drawnCount });
  }
  function rebuildPool() {
    listPool = getListItems();
    drawnCount = 0;
    listResult.hidden = true;
    shuffleList.textContent = "";
    updateListStat();
  }
  listInput.addEventListener("input", rebuildPool);
  listNoRepeat.addEventListener("change", rebuildPool);

  document.getElementById("btnDrawOne").addEventListener("click", function () {
    var arr = getListItems();
    if (arr.length === 0) { showToast(t("请输入候选项")); return; }
    if (!listNoRepeat.checked) {
      var j = randInt(arr.length);
      listResult.hidden = false;
      listResult.textContent = arr[j];
      drawnCount++;
      updateListStat();
      return;
    }
    if (listPool.length === 0) { showToast(t("候选已抽完，请点击重置")); return; }
    var i = randInt(listPool.length);
    var picked = listPool.splice(i, 1)[0];
    listResult.hidden = false;
    listResult.textContent = picked;
    drawnCount++;
    updateListStat();
  });
  document.getElementById("btnShuffle").addEventListener("click", function () {
    var arr = getListItems();
    if (arr.length === 0) { showToast(t("请输入候选项")); return; }
    for (var k = arr.length - 1; k > 0; k--) {
      var m = randInt(k + 1);
      var tmp = arr[k]; arr[k] = arr[m]; arr[m] = tmp;
    }
    shuffleList.textContent = arr.join("  ·  ");
  });
  document.getElementById("btnListReset").addEventListener("click", rebuildPool);
  document.getElementById("btnCopyList").addEventListener("click", function () {
    if (listResult.hidden || !listResult.textContent) { showToast(t("暂无可复制的结果")); return; }
    copyText(listResult.textContent, t("已复制结果"));
  });

  /* ================= 随机数 ================= */
  var rngMin = document.getElementById("rngMin");
  var rngMax = document.getElementById("rngMax");
  var rngCount = document.getElementById("rngCount");
  var rngUnique = document.getElementById("rngUnique");
  var rngDecimal = document.getElementById("rngDecimal");
  var rngDigits = document.getElementById("rngDigits");
  var rngDigitsWrap = document.getElementById("rngDigitsWrap");
  var rngOutput = document.getElementById("rngOutput");

  rngDecimal.addEventListener("change", function () {
    rngDigitsWrap.style.display = rngDecimal.checked ? "" : "none";
  });

  document.getElementById("btnRngGen").addEventListener("click", function () {
    var min = parseFloat(rngMin.value);
    var max = parseFloat(rngMax.value);
    var count = parseInt(rngCount.value, 10);
    if (isNaN(min) || isNaN(max) || min > max) { showToast(t("请输入有效数字范围")); return; }
    if (isNaN(count) || count < 1) { showToast(t("请至少生成 1 个数字")); return; }
    if (count > 1000) count = 1000;
    var out = [];
    if (rngDecimal.checked) {
      var digits = parseInt(rngDigits.value, 10) || 2;
      if (digits < 1) digits = 1; if (digits > 8) digits = 8;
      var f = Math.pow(10, digits);
      for (var i = 0; i < count; i++) {
        var v = min + randFloat() * (max - min);
        out.push((Math.round(v * f) / f).toFixed(digits));
      }
    } else {
      var lo = Math.ceil(min), hi = Math.floor(max);
      if (lo > hi) { showToast(t("整数范围内无可生成数字")); return; }
      var span = hi - lo + 1;
      if (rngUnique.checked) {
        if (count > span) { showToast(t("去重数量超过可选范围")); return; }
        var pool = [];
        for (var p = 0; p < span; p++) pool.push(lo + p);
        for (var q = 0; q < count; q++) {
          var ri = randInt(pool.length);
          out.push(String(pool.splice(ri, 1)[0]));
        }
      } else {
        for (var w = 0; w < count; w++) out.push(String(lo + randInt(span)));
      }
    }
    rngOutput.textContent = out.join("  ");
  });
  document.getElementById("btnRngCopy").addEventListener("click", function () {
    if (!rngOutput.textContent) { showToast(t("暂无可复制的结果")); return; }
    copyText(rngOutput.textContent, t("已复制结果"));
  });
  document.getElementById("btnRngClear").addEventListener("click", function () {
    rngOutput.textContent = "";
  });

  /* ================= 骰子 ================= */
  var diceCount = document.getElementById("diceCount");
  var diceArea = document.getElementById("diceArea");
  var diceTotal = document.getElementById("diceTotal");
  var diceHistory = document.getElementById("diceHistory");
  var dieChars = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
  var diceRollHistory = [];

  function buildDice(n) {
    diceArea.innerHTML = "";
    for (var i = 0; i < n; i++) {
      var d = document.createElement("div");
      d.className = "die";
      d.textContent = dieChars[1];
      diceArea.appendChild(d);
    }
  }
  document.getElementById("btnRoll").addEventListener("click", function () {
    var n = parseInt(diceCount.value, 10);
    if (isNaN(n) || n < 1 || n > 6) { showToast(t("骰子数量需在 1-6 之间")); return; }
    buildDice(n);
    var els = diceArea.querySelectorAll(".die");
    Array.prototype.forEach.call(els, function (el) { el.classList.add("rolling"); });
    var end = Date.now() + 800;
    function tick() {
      if (Date.now() < end) {
        Array.prototype.forEach.call(els, function (el) { el.textContent = dieChars[1 + randInt(6)]; });
        setTimeout(tick, 60);
      } else {
        var faces = [];
        var sum = 0;
        Array.prototype.forEach.call(els, function (el) {
          var fv = 1 + randInt(6);
          faces.push(fv);
          sum += fv;
          el.textContent = dieChars[fv];
          el.classList.remove("rolling");
        });
        diceTotal.textContent = t("点数总和：{n}", { n: sum });
        diceRollHistory.unshift(faces.join("+") + "=" + sum);
        if (diceRollHistory.length > 12) diceRollHistory.pop();
        diceHistory.innerHTML = "";
        diceRollHistory.forEach(function (s) {
          var sp = document.createElement("span");
          sp.textContent = s + "　";
          diceHistory.appendChild(sp);
        });
      }
    }
    tick();
  });
  document.getElementById("btnDiceReset").addEventListener("click", function () {
    diceArea.innerHTML = "";
    diceTotal.textContent = "";
    diceHistory.innerHTML = "";
    diceRollHistory = [];
  });

  /* ================= 抛硬币 ================= */
  var coin = document.getElementById("coin");
  var coinResult = document.getElementById("coinResult");
  var coinStat = document.getElementById("coinStat");
  var flipping = false;
  var headCount = 0, tailCount = 0;
  function updateCoinStat() {
    var total = headCount + tailCount;
    var ratio = total === 0 ? 0 : Math.round((headCount / total) * 100);
    coinStat.textContent = t("正面 {a} 次 · 反面 {b} 次 · 正面比例 {c}%", { a: headCount, b: tailCount, c: ratio });
  }
  document.getElementById("btnFlip").addEventListener("click", function () {
    if (flipping) return;
    flipping = true;
    coin.classList.remove("flipping");
    void coin.offsetWidth; // 重置动画
    coin.classList.add("flipping");
    var isHead = randInt(2) === 0;
    setTimeout(function () {
      coin.classList.remove("flipping");
      coin.textContent = isHead ? t("正") : t("反");
      headCount += isHead ? 1 : 0;
      tailCount += isHead ? 0 : 1;
      coinResult.textContent = isHead ? t("结果：正面") : t("结果：反面");
      updateCoinStat();
      flipping = false;
    }, 1000);
  });

  /* ================= 公平种子模式 ================= */
  var seedModeCb = document.getElementById("seedMode");
  var seedInput = document.getElementById("seedInput");
  seedModeCb.addEventListener("change", function () {
    seedMode = seedModeCb.checked;
    seedInput.disabled = !seedMode;
    if (seedMode) {
      seedStr = seedInput.value || "demo";
      floatRng = mulberry32(hashSeed(seedStr));
      showToast(t("已启用公平种子模式"));
    } else {
      floatRng = cryptoFloat;
      showToast(t("已切换为真随机"));
    }
  });
  seedInput.addEventListener("input", function () {
    if (!seedMode) return;
    seedStr = seedInput.value;
    floatRng = mulberry32(hashSeed(seedStr));
  });

  /* ---------------- 初始化 ---------------- */
  defaultItems();
  renderItems();
  drawWheel(currentRot);
  buildDice(parseInt(diceCount.value, 10) || 2);
  updateCoinStat();
  updateListStat();
})();
