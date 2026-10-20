/* ============================================================
   JSON/YAML/TOML 转换 - 工具页逻辑
   六种方向互转 + 自动识别 + 错误行号提示
   ============================================================ */
(function () {
  "use strict";

  var input = document.getElementById("ioInput");
  var output = document.getElementById("ioOutput");
  var errorBox = document.getElementById("ioError");
  var detectBox = document.getElementById("ioDetect");
  var detectText = document.getElementById("ioDetectText");
  var metaLine = document.getElementById("ioMeta");
  var autoConvert = document.getElementById("autoConvert");
  var prettyOut = document.getElementById("prettyOut");
  var tabRow = document.getElementById("ioTabs");

  var PLACEHOLDERS = {
    json: t('Paste JSON content here, e.g. an object with key-value pairs'),
    yaml: t('Paste YAML content here, e.g. key: value pairs'),
    toml: t('Paste TOML content here, e.g. key = value pairs')
  };
  var FORMAT_NAMES = { json: "JSON", yaml: "YAML", toml: "TOML" };
  var EXT = { json: "json", yaml: "yaml", toml: "toml" };
  var SAMPLES = {
    json: "{\n  \"title\": \"demo\",\n  \"count\": 3,\n  \"enabled\": true,\n  \"tags\": [\"a\", \"b\"],\n  \"owner\": {\n    \"name\": \"Tom\",\n    \"age\": 30\n  }\n}",
    yaml: "title: demo\ncount: 3\nenabled: true\ntags:\n  - a\n  - b\nowner:\n  name: Tom\n  age: 30\n",
    toml: "title = \"demo\"\ncount = 3\nenabled = true\ntags = [\"a\", \"b\"]\n\n[owner]\nname = \"Tom\"\nage = 30\n"
  };

  /* ---------- 方向与格式 ---------- */

  function getDirection() {
    var checked = tabRow.querySelector("input:checked");
    return checked ? checked.value : "json-yaml";
  }
  function srcFmt() { return getDirection().split("-")[0]; }
  function dstFmt() { return getDirection().split("-")[1]; }

  function syncTabs() {
    Array.prototype.forEach.call(tabRow.querySelectorAll("label"), function (l) {
      l.classList.remove("checked");
    });
    var checked = tabRow.querySelector("input:checked");
    if (checked && checked.parentNode) checked.parentNode.classList.add("checked");
  }

  /* ---------- 格式自动识别 ---------- */

  function detectFormat(text) {
    var s = text.trim();
    if (!s) return null;
    var first = s.charAt(0);
    if (first === "{" || first === "[") {
      try { JSON.parse(s); return "json"; } catch (e) { /* 继续判断 */ }
      if (/^\s*\[{1,2}[A-Za-z0-9_."'\-][A-Za-z0-9_."'\- ]*\]{1,2}\s*(#.*)?$/m.test(s)) return "toml";
      if (first === "{") return null;
    }
    if (/^[^=\n:]+\s*=\s*[^=]/m.test(s)) return "toml";
    if (/^[^:\n]+\s*:\s/m.test(s) || /^\s*-\s/m.test(s)) return "yaml";
    try { JSON.parse(s); return "json"; } catch (e) { /* ignore */ }
    return null;
  }

  /* ---------- 错误信息（带行号） ---------- */

  function withLine(e, text) {
    var msg = e && e.message ? e.message : String(e);
    var m = /position (\d+)/.exec(msg);
    if (m) {
      var before = text.slice(0, parseInt(m[1], 10));
      var ln = before.split("\n").length;
      msg += t(" (around line {n})", { n: ln });
    }
    return msg;
  }

  function showError(msg) {
    errorBox.hidden = false;
    errorBox.textContent = msg;
  }

  /* ---------- 转换 ---------- */

  function updateMeta() {
    if (!output.value) { metaLine.textContent = ""; return; }
    metaLine.textContent = t("{n} lines, {m} characters", {
      n: output.value.split("\n").length,
      m: output.value.length
    });
  }

  function convert() {
    errorBox.hidden = true;
    var text = input.value;
    if (!text.trim()) {
      output.value = "";
      updateMeta();
      return;
    }
    var src = srcFmt();
    var dst = dstFmt();
    var obj;
    try {
      if (src === "json") obj = JSON.parse(text);
      else if (src === "yaml") obj = window.jsyaml.load(text);
      else obj = window.TOMLLite.parse(text);
    } catch (e) {
      output.value = "";
      updateMeta();
      showError(t("Parse failed: ") + withLine(e, text));
      return;
    }
    if (obj === undefined) obj = null;
    try {
      var out;
      if (dst === "json") {
        out = prettyOut.checked ? JSON.stringify(obj, null, 2) : JSON.stringify(obj);
      } else if (dst === "yaml") {
        out = window.jsyaml.dump(obj, { indent: 2, lineWidth: -1 });
      } else {
        out = window.TOMLLite.stringify(obj);
      }
      output.value = out;
      updateMeta();
    } catch (e) {
      output.value = "";
      updateMeta();
      showError(t("Generation failed: ") + withLine(e, text));
    }
  }

  function refreshInput() {
    var fmt = detectFormat(input.value);
    if (fmt) {
      detectText.textContent = t("Detected input format: {fmt}", { fmt: FORMAT_NAMES[fmt] });
      detectBox.hidden = false;
    } else {
      detectBox.hidden = true;
    }
    if (autoConvert.checked) convert();
  }

  /* ---------- 事件绑定 ---------- */

  input.addEventListener("input", refreshInput);

  Array.prototype.forEach.call(tabRow.querySelectorAll("input"), function (radio) {
    radio.addEventListener("change", function () {
      syncTabs();
      input.placeholder = PLACEHOLDERS[srcFmt()];
      convert();
    });
  });

  prettyOut.addEventListener("change", function () {
    if (output.value) convert();
  });

  document.getElementById("btnConvert").addEventListener("click", convert);

  document.getElementById("btnCopy").addEventListener("click", function () {
    if (!output.value) {
      showToast(t("The conversion result is empty"));
      return;
    }
    copyText(output.value, t("Conversion result copied"));
  });

  document.getElementById("btnDownload").addEventListener("click", function () {
    if (!output.value) {
      showToast(t("The conversion result is empty"));
      return;
    }
    var dst = dstFmt();
    var blob = new Blob([output.value], { type: "text/plain;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "converted." + EXT[dst];
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    showToast(t("File downloaded"));
  });

  document.getElementById("btnSample").addEventListener("click", function () {
    input.value = SAMPLES[srcFmt()];
    refreshInput();
    showToast(t("Sample loaded"));
  });

  document.getElementById("btnClear").addEventListener("click", function () {
    input.value = "";
    output.value = "";
    errorBox.hidden = true;
    detectBox.hidden = true;
    updateMeta();
    input.focus();
  });

  /* 初始占位符与 tab 状态 */
  syncTabs();
  input.placeholder = PLACEHOLDERS[srcFmt()];

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
})();
