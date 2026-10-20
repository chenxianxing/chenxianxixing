/* ============================================================
   密码生成器 - 工具页逻辑
   使用 crypto.getRandomValues + 拒绝采样法 生成无偏安全随机密码
   ============================================================ */
(function () {
  "use strict";

  var LOWER = "abcdefghijklmnopqrstuvwxyz";
  var UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  var DIGIT = "0123456789";
  var SYMBOL = "!@#$%^&*()-_=+[]{};:,.<>?/|~";
  var AMBIGUOUS = "0O1lI|`'\"\\;:";

  var lengthSlider = document.getElementById("pgLength");
  var lengthNum = document.getElementById("pgLengthNum");
  var cLower = document.getElementById("cLower");
  var cUpper = document.getElementById("cUpper");
  var cDigit = document.getElementById("cDigit");
  var cSymbol = document.getElementById("cSymbol");
  var cExclude = document.getElementById("cExclude");
  var countInput = document.getElementById("pgCount");
  var resultsEl = document.getElementById("pgResults");
  var actionsEl = document.getElementById("pgActions");
  var emptyEl = document.getElementById("pgEmpty");
  var poolBadge = document.getElementById("pgPoolBadge");

  var currentPasswords = [];

  /* ---------- 字符集 ---------- */
  function buildCharset() {
    var cs = "";
    if (cLower.checked) cs += LOWER;
    if (cUpper.checked) cs += UPPER;
    if (cDigit.checked) cs += DIGIT;
    if (cSymbol.checked) cs += SYMBOL;
    if (cExclude.checked) {
      var filtered = "";
      for (var i = 0; i < cs.length; i++) {
        if (AMBIGUOUS.indexOf(cs[i]) === -1) filtered += cs[i];
      }
      cs = filtered;
    }
    return cs;
  }

  function updatePoolBadge() {
    var cs = buildCharset();
    poolBadge.textContent = cs ? "字符池：" + cs.length : "字符池：未选择";
  }

  /* ---------- 安全随机取字符（拒绝采样，避免取模偏差） ---------- */
  function randomChar(charset) {
    var n = charset.length;
    var max = Math.floor(0xFFFFFFFF / n) * n; // <= 2^32 的最大 n 的倍数
    var buf = new Uint32Array(1);
    var x;
    do {
      crypto.getRandomValues(buf);
      x = buf[0];
    } while (x >= max);
    return charset.charAt(x % n);
  }

  function generateOne(charset, len) {
    var out = "";
    for (var i = 0; i < len; i++) out += randomChar(charset, len);
    return out;
  }

  /* ---------- 强度 / 熵估算 ---------- */
  function entropyBits(poolSize, len) {
    if (poolSize <= 1) return 0;
    return len * (Math.log(poolSize) / Math.log(2));
  }

  function strengthLevel(bits) {
    if (bits < 28) return { idx: 0, name: "很弱", color: "#dc2626" };
    if (bits < 36) return { idx: 1, name: "弱", color: "#ea580c" };
    if (bits < 60) return { idx: 2, name: "中", color: "#d97706" };
    if (bits < 128) return { idx: 3, name: "强", color: "#059669" };
    return { idx: 4, name: "极强", color: "#047857" };
  }

  function render() {
    resultsEl.innerHTML = "";
    currentPasswords.forEach(function (pw) {
      var pool = buildCharset().length;
      var bits = entropyBits(pool, pw.length);
      var lv = strengthLevel(bits);
      var pct = Math.min(100, Math.round((bits / 128) * 100));

      var item = document.createElement("div");
      item.className = "pg-item";

      var text = document.createElement("div");
      text.className = "pw-text";
      text.textContent = pw;

      var meta = document.createElement("div");
      meta.className = "pw-meta";

      var bar = document.createElement("div");
      bar.className = "pg-bar";
      var barSpan = document.createElement("span");
      barSpan.style.width = pct + "%";
      barSpan.style.background = lv.color;
      bar.appendChild(barSpan);

      var ent = document.createElement("div");
      ent.className = "pg-entropy";
      ent.textContent = lv.name + " · " + bits.toFixed(1) + " bit";

      var copyBtn = document.createElement("button");
      copyBtn.className = "btn";
      copyBtn.type = "button";
      copyBtn.textContent = "复制";
      copyBtn.addEventListener("click", function () {
        copyText(pw, "已复制密码");
      });

      meta.appendChild(bar);
      meta.appendChild(ent);
      meta.appendChild(copyBtn);

      item.appendChild(text);
      item.appendChild(meta);
      resultsEl.appendChild(item);
    });
  }

  function generate() {
    var len = parseInt(lengthSlider.value, 10);
    var count = parseInt(countInput.value, 10);
    if (isNaN(count) || count < 1) count = 1;
    if (count > 100) count = 100;
    countInput.value = count;

    var cs = buildCharset();
    if (!cs) {
      showToast("请至少选择一种字符类型");
      return;
    }

    currentPasswords = [];
    for (var i = 0; i < count; i++) {
      currentPasswords.push(generateOne(cs, len));
    }
    render();
    resultsEl.hidden = false;
    actionsEl.hidden = false;
    emptyEl.hidden = true;
  }

  /* ---------- 事件绑定 ---------- */
  lengthSlider.addEventListener("input", function () {
    lengthNum.value = lengthSlider.value;
  });
  lengthNum.addEventListener("input", function () {
    var v = parseInt(lengthNum.value, 10);
    if (isNaN(v)) return;
    if (v < 4) v = 4;
    if (v > 64) v = 64;
    lengthSlider.value = v;
  });
  lengthNum.addEventListener("change", function () {
    var v = parseInt(lengthNum.value, 10);
    if (isNaN(v)) v = 16;
    if (v < 4) v = 4;
    if (v > 64) v = 64;
    lengthNum.value = v;
    lengthSlider.value = v;
  });

  [cLower, cUpper, cDigit, cSymbol, cExclude].forEach(function (el) {
    el.addEventListener("change", updatePoolBadge);
  });

  document.getElementById("btnGenerate").addEventListener("click", generate);
  document.getElementById("btnRegenerate").addEventListener("click", generate);

  document.getElementById("btnCopyAll").addEventListener("click", function () {
    if (!currentPasswords.length) return;
    copyText(currentPasswords.join("\n"), "已复制全部 " + currentPasswords.length + " 个密码");
  });

  document.getElementById("btnDownload").addEventListener("click", function () {
    if (!currentPasswords.length) return;
    var content = currentPasswords.join("\n") + "\n";
    var blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "passwords-" + currentPasswords.length + ".txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("已下载密码文件");
  });

  /* ---------- 复制工具（带降级） ---------- */
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

  /* ---------- 轻提示 ---------- */
  var toastEl = document.getElementById("toast");
  var toastTimer = null;
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove("show");
    }, 2000);
  }

  updatePoolBadge();
})();
