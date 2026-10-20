/* ============================================================
   JSON格式化 - 工具页逻辑
   美化 / 压缩 / 转义 / 去转义 / 校验 / 树形视图
   ============================================================ */
(function () {
  "use strict";

  var input = document.getElementById("jfInput");
  var output = document.getElementById("jfOutput");
  var errorBox = document.getElementById("jfError");
  var perfBox = document.getElementById("jfPerf");
  var treeBox = document.getElementById("jfTree");
  var infoBox = document.getElementById("jfInfo");
  var indentRow = document.getElementById("indentRow");
  var autoFmt = document.getElementById("autoFmt");

  var SAMPLE = '{\n  "name": "Alice",\n  "age": 18,\n  "active": true,\n  "roles": ["admin", "user"],\n  "profile": { "city": "New York", "tags": null },\n  "list": [1, 2, 3]\n}';

  function getIndent() {
    var v = (indentRow.querySelector("input:checked") || {}).value || "2";
    if (v === "tab") return "\t";
    return parseInt(v, 10) || 2;
  }

  /* radio 样式联动 */
  Array.prototype.forEach.call(indentRow.querySelectorAll("label"), function (label) {
    label.addEventListener("click", function () {
      Array.prototype.forEach.call(indentRow.querySelectorAll("label"), function (l) { l.classList.remove("checked"); });
      label.classList.add("checked");
      if (autoFmt.checked) format();
    });
  });

  function parseInput() {
    try {
      var val = JSON.parse(input.value);
      return { ok: true, value: val };
    } catch (e) {
      return { ok: false, error: e };
    }
  }

  function getLineCol(text, pos) {
    var line = 1, col = 1;
    var i = 0;
    for (; i < pos && i < text.length; i++) {
      if (text.charAt(i) === "\n") { line++; col = 1; } else { col++; }
    }
    return { line: line, col: col };
  }

  function describeError(e, text) {
    var msg = e && e.message ? e.message : String(e);
    var pos = null, m;
    if ((m = msg.match(/position (\d+)/))) pos = parseInt(m[1], 10);
    else if ((m = msg.match(/at position (\d+)/))) pos = parseInt(m[1], 10);
    if (pos === null && (m = msg.match(/line (\d+) column (\d+)/))) {
      return "Line " + m[1] + ", column " + m[2] + ": " + msg;
    }
    if (pos !== null) {
      var lc = getLineCol(text, pos);
      return "Line " + lc.line + ", column " + lc.col + " (char offset " + pos + "）：" + msg;
    }
    return msg;
  }

  function checkSize() {
    perfBox.hidden = input.value.length <= 1000000;
  }

  function format() {
    errorBox.hidden = true;
    checkSize();
    if (!input.value.trim()) { output.value = ""; treeBox.innerHTML = '<div class="empty-tip">The structure tree will be shown here after formatting or validating</div>'; return; }
    var r = parseInput();
    if (!r.ok) {
      output.value = "";
      errorBox.hidden = false;
      errorBox.textContent = "Unable to format: " + describeError(r.error, input.value);
      return;
    }
    try {
      output.value = JSON.stringify(r.value, null, getIndent());
    } catch (err) {
      output.value = "";
      errorBox.hidden = false;
      errorBox.textContent = "Serialization failed: " + (err && err.message ? err.message : String(err));
      return;
    }
    renderTree(r.value);
  }

  function minify() {
    errorBox.hidden = true;
    checkSize();
    if (!input.value.trim()) { output.value = ""; treeBox.innerHTML = '<div class="empty-tip">The structure tree will be shown here after formatting or validating</div>'; return; }
    var r = parseInput();
    if (!r.ok) {
      output.value = "";
      errorBox.hidden = false;
      errorBox.textContent = "Unable to minify: " + describeError(r.error, input.value);
      return;
    }
    output.value = JSON.stringify(r.value);
    renderTree(r.value);
  }

  function escapeJson() {
    errorBox.hidden = true;
    if (!input.value) { output.value = ""; return; }
    /* 转义：把整段文本变成合法的字符串字面量（外层引号 + 内部转义） */
    output.value = JSON.stringify(input.value);
    treeBox.innerHTML = '<div class="empty-tip">The escaped result is a string literal, so there is no structure tree</div>';
    showToast("Escaped to a string literal");
  }

  function unescapeJson() {
    errorBox.hidden = true;
    if (!input.value) { output.value = ""; return; }
    try {
      var inner = JSON.parse(input.value); /* 解析出内部文本 */
      if (typeof inner !== "string") { output.value = input.value; return; }
      try {
        var parsed = JSON.parse(inner); /* 内部文本若仍是 JSON 则美化 */
        output.value = JSON.stringify(parsed, null, getIndent());
        renderTree(parsed);
      } catch (e2) {
        output.value = inner;
        treeBox.innerHTML = '<div class="empty-tip">The unescaped result is plain text, so there is no structure tree</div>';
      }
      showToast("Unescaped");
    } catch (e) {
      errorBox.hidden = false;
      errorBox.textContent = "Unescaping failed: the input is not a valid string literal. Reason: " + (e && e.message ? e.message : String(e));
    }
  }

  function validate() {
    errorBox.hidden = true;
    checkSize();
    if (!input.value.trim()) {
      infoBox.innerHTML = '<div class="empty-tip">Please enter JSON before validating</div>';
      return;
    }
    var r = parseInput();
    if (!r.ok) {
      output.value = "";
      errorBox.hidden = false;
      errorBox.textContent = "Validation failed: " + describeError(r.error, input.value);
      infoBox.innerHTML = '<div class="info-note">Status: <b style="color:#dc2626">Invalid JSON</b><br>' + escapeHtml(describeError(r.error, input.value)) + '</div>';
      treeBox.innerHTML = '<div class="empty-tip">Validation failed, so the structure tree cannot be generated</div>';
      return;
    }
    var stats = analyze(r.value);
    infoBox.innerHTML =
      '<div class="info-note" style="margin-top:0;">Status: <b style="color:#059669">Valid JSON</b></div>' +
      '<div class="result-grid">' +
      statCard("Root Type", stats.rootType) +
      statCard("Keys / Elements", stats.size) +
      statCard("Max Depth", stats.depth) +
      statCard("Characters", input.value.length) +
      '</div>';
    output.value = JSON.stringify(r.value, null, getIndent());
    renderTree(r.value);
    showToast("Validation passed, the JSON is valid");
  }

  function statCard(label, num) {
    return '<div class="result-card"><div class="num">' + escapeHtml(String(num)) + '</div><div class="label">' + escapeHtml(label) + '</div></div>';
  }

  function analyze(val) {
    var res = { size: 0, depth: 0, rootType: "null" };
    res.rootType = typeName(val);
    walk(val, 1);
    function walk(v, d) {
      if (d > res.depth) res.depth = d;
      if (Array.isArray(v)) {
        res.size += v.length;
        v.forEach(function (item) { walk(item, d + 1); });
      } else if (v && typeof v === "object") {
        var ks = Object.keys(v);
        res.size += ks.length;
        ks.forEach(function (k) { walk(v[k], d + 1); });
      }
    }
    return res;
  }

  function typeName(v) {
    if (v === null) return "null";
    if (Array.isArray(v)) return "array";
    return typeof v;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  /* ---------- 树形视图 ---------- */
  function renderTree(val) {
    treeBox.innerHTML = '<div class="tree">' + node(val, null, true) + '</div>';
  }

  function node(val, key, isRoot) {
    var t = typeName(val);
    if (t === "object" || t === "array") {
      var keys = (t === "array") ? val.map(function (_, i) { return i; }) : Object.keys(val);
      var open = isRoot ? "open" : "";
      var summary = (key !== null) ? '<span class="t-key">' + escapeHtml(String(key)) + '</span>: ' : '';
      var count = (t === "array") ? keys.length + " items" : keys.length + " keys";
      var inner = keys.map(function (k) { return node(val[k], k, false); }).join("");
      return '<details ' + open + '><summary>' + summary +
        '<span style="color:#475569">' + (t === "array" ? "[" : "{") + '</span> ' +
        '<span class="t-count">' + count + '</span> ' +
        '<span style="color:#475569">' + (t === "array" ? "]" : "}") + '</span></summary>' +
        '<div class="t-children">' + inner + '</div></details>';
    }
    var cls = t === "string" ? "t-str" : t === "number" ? "t-num" : t === "boolean" ? "t-bool" : "t-null";
    var valText = (t === "string") ? '"' + escapeHtml(val) + '"' : String(val);
    var keyHtml = (key !== null) ? '<span class="t-key">' + escapeHtml(String(key)) + '</span>: ' : '';
    return '<div class="t-leaf">' + keyHtml +
      '<span class="' + cls + '">' + valText + '</span>' +
      '<span class="t-type">' + t + '</span></div>';
  }

  /* ---------- 事件绑定 ---------- */
  input.addEventListener("input", function () {
    checkSize();
    if (autoFmt.checked) format();
  });

  document.getElementById("btnFormat").addEventListener("click", format);
  document.getElementById("btnMinify").addEventListener("click", minify);
  document.getElementById("btnEscape").addEventListener("click", escapeJson);
  document.getElementById("btnUnescape").addEventListener("click", unescapeJson);
  document.getElementById("btnValidate").addEventListener("click", validate);

  document.getElementById("btnSample").addEventListener("click", function () {
    input.value = SAMPLE;
    if (autoFmt.checked) format(); else validate();
    input.focus();
  });

  document.getElementById("btnClear").addEventListener("click", function () {
    input.value = "";
    output.value = "";
    errorBox.hidden = true;
    perfBox.hidden = true;
    treeBox.innerHTML = '<div class="empty-tip">The structure tree will be shown here after formatting or validating</div>';
    infoBox.innerHTML = '<div class="empty-tip">Click Validate to view the structure and status</div>';
    input.focus();
  });

  document.getElementById("btnCopy").addEventListener("click", function () {
    if (!output.value) { showToast("The result is empty"); return; }
    copyText(output.value, "Result copied");
  });

  document.getElementById("btnDownload").addEventListener("click", function () {
    if (!output.value) { showToast("The result is empty"); return; }
    downloadText(output.value, "data-" + Date.now() + ".json", "application/json");
  });

  /* ---------- 通用工具 ---------- */
  function downloadText(text, filename, mime) {
    var blob = new Blob([text], { type: (mime || "text/plain") + ";charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    showToast("Downloaded" + filename);
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

  var toastEl = document.getElementById("toast");
  var toastTimer = null;
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 2000);
  }
})();
