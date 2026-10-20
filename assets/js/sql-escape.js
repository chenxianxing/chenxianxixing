/* ============================================================
   SQL转义 - 工具页逻辑
   字符串转义 / 还原 + IN 列表生成
   ============================================================ */
(function () {
  "use strict";

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
    } else { fallbackCopy(text); done(); }
  }
  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch (e) { /* ignore */ }
    document.body.removeChild(ta);
  }

  /* ---------- 模式切换 ---------- */
  var modeRow = document.getElementById("modeRow");
  var panelEscape = document.getElementById("panelEscape");
  var panelInlist = document.getElementById("panelInlist");
  function syncRadio(row) {
    Array.prototype.forEach.call(row.querySelectorAll("label"), function (l) {
      l.classList.toggle("checked", !!l.querySelector("input:checked"));
    });
  }
  Array.prototype.forEach.call(modeRow.querySelectorAll("label"), function (l) {
    l.addEventListener("click", function () {
      syncRadio(modeRow);
      var m = modeRow.querySelector("input:checked").value;
      panelEscape.hidden = m !== "escape";
      panelInlist.hidden = m !== "inlist";
    });
  });

  /* ---------- 字符串转义 ---------- */
  var dirRow = document.getElementById("dirRow");
  var wrapQuote = document.getElementById("wrapQuote");
  var escInput = document.getElementById("escInput");
  var escOutput = document.getElementById("escOutput");

  function escapeSQL(s) {
    return s
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "''")
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/\t/g, "\\t")
      .replace(/\u0000/g, "\\0");
  }
  function unescapeSQL(s) {
    s = s.replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r")
      .replace(/\\t/g, "\t")
      .replace(/\\0/g, "\u0000")
      .replace(/''/g, "'")
      .replace(/\\\\/g, "\\");
    return s;
  }

  function convertEsc() {
    var text = escInput.value;
    if (!text) { escOutput.value = ""; return; }
    var dir = dirRow.querySelector("input:checked").value;
    var res = (dir === "escape") ? escapeSQL(text) : unescapeSQL(text);
    if (wrapQuote.checked) res = "'" + res + "'";
    escOutput.value = res;
  }

  Array.prototype.forEach.call(dirRow.querySelectorAll("label"), function (l) {
    l.addEventListener("click", function () { syncRadio(dirRow); convertEsc(); });
  });
  wrapQuote.addEventListener("change", convertEsc);
  escInput.addEventListener("input", convertEsc);
  document.getElementById("btnConvert").addEventListener("click", convertEsc);
  document.getElementById("btnCopy").addEventListener("click", function () {
    if (!escOutput.value) { showToast("结果为空"); return; }
    copyText(escOutput.value, "已复制结果");
  });
  document.getElementById("btnClear").addEventListener("click", function () {
    escInput.value = ""; escOutput.value = "";
  });

  /* ---------- IN 列表生成 ---------- */
  var inInput = document.getElementById("inInput");
  var inOutput = document.getElementById("inOutput");
  var inParen = document.getElementById("inParen");

  function genIn() {
    var lines = inInput.value.split(/\r?\n/);
    var items = [];
    lines.forEach(function (ln) {
      var v = ln.trim();
      if (v) items.push("'" + v.replace(/'/g, "''") + "'");
    });
    var joined = items.join(",");
    if (inParen.checked) joined = "(" + joined + ")";
    inOutput.value = joined;
  }

  inParen.addEventListener("change", genIn);
  inInput.addEventListener("input", genIn);
  document.getElementById("btnGenIn").addEventListener("click", genIn);
  document.getElementById("btnCopyIn").addEventListener("click", function () {
    if (!inOutput.value) { showToast("结果为空"); return; }
    copyText(inOutput.value, "已复制 IN 列表");
  });
  document.getElementById("btnClearIn").addEventListener("click", function () {
    inInput.value = ""; inOutput.value = "";
  });

  if (!escInput.value) {
    escInput.value = "O'Brien\n第一行\n第二行\t制表";
    convertEsc();
  }
  if (!inInput.value) {
    inInput.value = "apple\nbanana\ncherry\n";
    genIn();
  }
})();
