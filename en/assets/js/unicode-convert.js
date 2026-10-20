/* ============================================================
   Unicode 编码转换 - 工具页逻辑
   编码 / 解码与逐字符明细表
   ============================================================ */
(function () {
  "use strict";

  /* ---------- DOM ---------- */
  var input = document.getElementById("uniInput");
  var output = document.getElementById("uniOutput");
  var tbody = document.getElementById("uniTbody");
  var trunc = document.getElementById("uniTrunc");
  var modeRow = document.getElementById("uniModeRow");
  var fmtWrap = document.getElementById("uniFmtWrap");
  var btnSample = document.getElementById("uniBtnSample");
  var btnCopy = document.getElementById("uniBtnCopy");
  var btnDownload = document.getElementById("uniBtnDownload");
  var btnClear = document.getElementById("uniBtnClear");

  var toastEl = document.getElementById("toast");
  var toastTimer = null;
  var currentText = "";

  /* ---------- 提示 ---------- */
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 2000);
  }

  /* ---------- 单选行辅助 ---------- */
  function bindRadio(row) {
    Array.prototype.forEach.call(row.querySelectorAll("label"), function (label) {
      label.addEventListener("click", function () {
        Array.prototype.forEach.call(row.querySelectorAll("label"), function (l) { l.classList.remove("checked"); });
        label.classList.add("checked");
      });
    });
  }
  function radioVal(row) {
    var c = row.querySelector("input:checked");
    return c ? c.value : "";
  }
  bindRadio(modeRow);

  /* ---------- 复制 / 下载 ---------- */
  function copyText(text, okMsg) {
    if (!text) { showToast("Nothing to copy"); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () { showToast(okMsg || "Copied"); },
        function () { fallbackCopy(text, okMsg); }
      );
    } else {
      fallbackCopy(text, okMsg);
    }
  }
  function fallbackCopy(text, okMsg) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); showToast(okMsg || "Copied"); }
    catch (e) { showToast("Copy failed"); }
    document.body.removeChild(ta);
  }
  function downloadFile(filename, text) {
    var blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 100);
  }

  /* ---------- 字符 / 编码工具 ---------- */
  function hex4(n) { var s = n.toString(16); while (s.length < 4) s = "0" + s; return s; }
  function hex2(n) { var s = n.toString(16); while (s.length < 2) s = "0" + s; return s; }
  function hexCP(cp) { var s = cp.toString(16).toUpperCase(); while (s.length < 4) s = "0" + s; return s; }

  function strToUtf8(str) {
    var bytes = [];
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      if (c < 0x80) bytes.push(c);
      else if (c < 0x800) bytes.push(0xC0 | (c >> 6), 0x80 | (c & 0x3F));
      else if (c >= 0xD800 && c <= 0xDBFF && i + 1 < str.length) {
        var c2 = str.charCodeAt(i + 1);
        var cp = 0x10000 + ((c - 0xD800) << 10) + (c2 - 0xDC00);
        i++;
        bytes.push(0xF0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3F), 0x80 | ((cp >> 6) & 0x3F), 0x80 | (cp & 0x3F));
      } else {
        bytes.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 0x3F), 0x80 | (c & 0x3F));
      }
    }
    return bytes;
  }

  function bytesToStr(bytes) {
    var out = "";
    var i = 0;
    while (i < bytes.length) {
      var b = bytes[i++];
      if (b < 0x80) out += String.fromCharCode(b);
      else if ((b & 0xE0) === 0xC0) {
        var c2 = bytes[i++];
        out += String.fromCharCode(((b & 0x1F) << 6) | (c2 & 0x3F));
      } else if ((b & 0xF0) === 0xE0) {
        var c2b = bytes[i++], c3 = bytes[i++];
        out += String.fromCharCode(((b & 0x0F) << 12) | ((c2b & 0x3F) << 6) | (c3 & 0x3F));
      } else if ((b & 0xF8) === 0xF0) {
        var d2 = bytes[i++], d3 = bytes[i++], d4 = bytes[i++];
        var cp = ((b & 0x07) << 18) | ((d2 & 0x3F) << 12) | ((d3 & 0x3F) << 6) | (d4 & 0x3F);
        cp -= 0x10000;
        out += String.fromCharCode(0xD800 + (cp >> 10), 0xDC00 + (cp & 0x3FF));
      }
    }
    return out;
  }

  function codePoints(str) {
    var out = [];
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      if (c >= 0xD800 && c <= 0xDBFF && i + 1 < str.length) {
        var c2 = str.charCodeAt(i + 1);
        out.push(0x10000 + ((c - 0xD800) << 10) + (c2 - 0xDC00));
        i++;
      } else out.push(c);
    }
    return out;
  }

  /* ---------- 编码 ---------- */
  function toJs(str) {
    var out = "";
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      if (c >= 0xD800 && c <= 0xDBFF && i + 1 < str.length) {
        var c2 = str.charCodeAt(i + 1);
        out += "\\u" + hex4(c) + "\\u" + hex4(c2);
        i++;
      } else out += "\\u" + hex4(c);
    }
    return out;
  }
  function toHexBytes(str) {
    return strToUtf8(str).map(function (b) { return "\\x" + hex2(b); }).join("");
  }
  function toCodepoint(str) {
    return codePoints(str).map(function (cp) { return "U+" + hexCP(cp); }).join(" ");
  }
  function toHtmlDec(str) {
    return codePoints(str).map(function (cp) { return "&#" + cp + ";"; }).join("");
  }
  function toHtmlHex(str) {
    return codePoints(str).map(function (cp) { return "&#x" + cp.toString(16) + ";"; }).join("");
  }
  function toUtf8Hex(str) {
    return strToUtf8(str).map(function (b) { return hex2(b).toUpperCase(); }).join(" ");
  }
  function toPercent(str) {
    return strToUtf8(str).map(function (b) { return "%" + hex2(b).toUpperCase(); }).join("");
  }

  var FORMATS = {
    js: { label: "JS escape (\\uXXXX)", fn: toJs },
    hexbytes: { label: "\\xXX (UTF-8 bytes)", fn: toHexBytes },
    codepoint: { label: "Code point U+XXXX", fn: toCodepoint },
    htmldec: { label: "HTML decimal entity", fn: toHtmlDec },
    htmlhex: { label: "HTML hexadecimal entity", fn: toHtmlHex },
    utf8hex: { label: "UTF-8 Hex", fn: toUtf8Hex },
    percent: { label: "Percent encoding", fn: toPercent }
  };

  /* ---------- 解码 ---------- */
  function detectFormat(s) {
    if (s.indexOf("&#") > -1) return "html";
    if (s.indexOf("\\u") > -1) return "js";
    if (s.indexOf("\\x") > -1) return "hexbytes";
    if (s.indexOf("U+") > -1) return "codepoint";
    if (s.indexOf("%") > -1) return "percent";
    if (/^(?:[0-9A-Fa-f]{2}\s*)+$/.test(s.trim()) && s.trim().length > 0) return "utf8hex";
    return "unknown";
  }
  function decodeHtml(s) {
    return s.replace(/&#(x?[0-9A-Fa-f]+);/g, function (m, p) {
      var base = p.charAt(0) === "x" || p.charAt(0) === "X" ? 16 : 10;
      return String.fromCodePoint(parseInt(p, base));
    });
  }
  function decodeJs(s) {
    var m = s.match(/\\u([0-9A-Fa-f]{4})/g);
    if (!m) return s;
    return m.map(function (x) { return String.fromCharCode(parseInt(x.slice(2), 16)); }).join("");
  }
  function decodeHexBytes(s) {
    var m = s.match(/\\x([0-9A-Fa-f]{2})/g);
    if (!m) return "";
    var bytes = m.map(function (x) { return parseInt(x.slice(2), 16); });
    return bytesToStr(bytes);
  }
  function decodeCodepoint(s) {
    var m = s.match(/U\+([0-9A-Fa-f]+)/g);
    if (!m) return s;
    return m.map(function (x) { return String.fromCodePoint(parseInt(x.slice(2), 16)); }).join("");
  }
  function decodePercent(s) {
    var m = s.match(/%([0-9A-Fa-f]{2})/g);
    if (!m) return "";
    var bytes = m.map(function (x) { return parseInt(x.slice(1), 16); });
    return bytesToStr(bytes);
  }
  function decodeUtf8Hex(s) {
    var parts = s.trim().split(/\s+/);
    var bytes = [];
    for (var i = 0; i < parts.length; i++) {
      var v = parseInt(parts[i], 16);
      if (!isNaN(v)) bytes.push(v);
    }
    return bytesToStr(bytes);
  }
  function decodeStr(s) {
    var fmt = detectFormat(s);
    switch (fmt) {
      case "html": return decodeHtml(s);
      case "js": return decodeJs(s);
      case "hexbytes": return decodeHexBytes(s);
      case "codepoint": return decodeCodepoint(s);
      case "percent": return decodePercent(s);
      case "utf8hex": return decodeUtf8Hex(s);
      default: return s;
    }
  }

  /* ---------- 明细表 ---------- */
  function buildTable(str) {
    var cps = codePoints(str);
    var rows = "";
    var max = Math.min(cps.length, 300);
    for (var i = 0; i < max; i++) {
      var cp = cps[i];
      var charStr = cp > 0xFFFF
        ? String.fromCharCode(0xD800 + ((cp - 0x10000) >> 10), 0xDC00 + ((cp - 0x10000) & 0x3FF))
        : String.fromCharCode(cp);
      var utf8 = strToUtf8(charStr).map(function (b) { return hex2(b).toUpperCase(); }).join(" ");
      var units;
      if (cp <= 0xFFFF) units = hex4(cp);
      else {
        var hi = 0xD800 + ((cp - 0x10000) >> 10);
        var lo = 0xDC00 + ((cp - 0x10000) & 0x3FF);
        units = hex4(hi) + " " + hex4(lo);
      }
      var disp = charStr === " " ? "␣" : charStr;
      if (cp === 0x200B) disp = "​";
      rows += "<tr><td class=\"char-cell\">" + escapeHtml(disp) + "</td>"
        + "<td class=\"mono-cell\">U+" + hexCP(cp) + "</td>"
        + "<td class=\"mono-cell\">" + utf8 + "</td>"
        + "<td class=\"mono-cell\">" + units + "</td></tr>";
    }
    tbody.innerHTML = rows;
    if (cps.length > 300) {
      trunc.hidden = false;
      trunc.textContent = "Showing the first 300 characters, total" + cps.length + " characters.";
    } else {
      trunc.hidden = true;
    }
  }
  function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /* ---------- 主流程 ---------- */
  function process() {
    var text = input.value;
    var mode = radioVal(modeRow) || "encode";

    if (mode === "encode") {
      fmtWrap.classList.remove("uni-hidden");
      if (!text) { output.textContent = ""; currentText = ""; tbody.innerHTML = ""; trunc.hidden = true; return; }
      var selected = Array.prototype.slice.call(document.querySelectorAll(".uni-fmt:checked")).map(function (cb) { return cb.value; });
      if (!selected.length) {
        output.textContent = "Please select at least one output format.";
        currentText = "";
        buildTable(text);
        return;
      }
      var blocks = [];
      selected.forEach(function (key) {
        var f = FORMATS[key];
        blocks.push("# " + f.label + "\n" + f.fn(text));
      });
      var out = blocks.join("\n\n");
      output.textContent = out;
      currentText = out;
      buildTable(text);
    } else {
      fmtWrap.classList.add("uni-hidden");
      if (!text) { output.textContent = ""; currentText = ""; tbody.innerHTML = ""; trunc.hidden = true; return; }
      var fmt = detectFormat(text);
      var decoded;
      try { decoded = decodeStr(text); }
      catch (e) { output.textContent = "Decoding failed: " + (e && e.message ? e.message : String(e)); currentText = ""; return; }
      var fmtName = { html: "HTML entity", js: "JS escape", hexbytes: "UTF-8 byte escape", codepoint: "Code point U+", percent: "Percent encoding", utf8hex: "UTF-8 Hex", unknown: "Unrecognized (returned as-is)" }[fmt];
      output.textContent = "# Recognized as:" + fmtName + "\n" + decoded;
      currentText = decoded;
      buildTable(decoded);
    }
  }

  /* ---------- 示例 ---------- */
  var SAMPLE = "Hello, World🌍! A";

  /* ---------- 事件 ---------- */
  btnSample.addEventListener("click", function () {
    input.value = SAMPLE;
    process();
    showToast("Sample loaded");
  });
  btnCopy.addEventListener("click", function () {
    if (!currentText) { showToast("Nothing to copy"); return; }
    copyText(currentText, "Copied");
  });
  btnDownload.addEventListener("click", function () {
    if (!currentText) { showToast("Nothing to download"); return; }
    downloadFile("unicode-output.txt", currentText);
    showToast("Downloaded");
  });
  btnClear.addEventListener("click", function () {
    input.value = "";
    process();
    showToast("Cleared");
  });

  modeRow.addEventListener("change", process);
  Array.prototype.forEach.call(document.querySelectorAll(".uni-fmt"), function (cb) {
    cb.addEventListener("change", function () { if ((radioVal(modeRow) || "encode") === "encode") process(); });
  });
  input.addEventListener("input", process);

  /* ---------- 初始化 ---------- */
  process();
})();
