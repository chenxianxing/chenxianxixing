/* ============================================================
   进制转换 - 工具页逻辑
   2/8/10/16 + 任意(2-36) 互转，BigInt 支持，字节 HEX 视图
   ============================================================ */
(function () {
  "use strict";

  var inputEl = document.getElementById("bcInput");
  var fromEl = document.getElementById("bcFrom");
  var customWrap = document.getElementById("bcCustomWrap");
  var customEl = document.getElementById("bcCustom");
  var toCustomEl = document.getElementById("bcToCustom");
  var resultEl = document.getElementById("bcResult");
  var errorEl = document.getElementById("bcError");
  var prefixNote = document.getElementById("bcPrefixNote");

  var textEl = document.getElementById("bcText");
  var hexEl = document.getElementById("bcHex");

  /* ---------- 工具：复制 / 提示 ---------- */
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

  /* ---------- 字符数值 ---------- */
  function digitVal(c) {
    if (c >= "0" && c <= "9") return c.charCodeAt(0) - 48;
    if (c >= "a" && c <= "z") return c.charCodeAt(0) - 87;
    if (c >= "A" && c <= "Z") return c.charCodeAt(0) - 55;
    return -1;
  }

  function getFromBase() {
    var b = fromEl.value;
    if (b === "custom") {
      var cb = parseInt(customEl.value, 10);
      return (cb >= 2 && cb <= 36) ? cb : NaN;
    }
    return parseInt(b, 10);
  }

  function stripPrefix(str, base) {
    var note = "";
    if (base === 16 && /^0[xX]/.test(str)) { str = str.slice(2); note = "已按 0x 前缀识别为十六进制"; }
    else if (base === 2 && /^0[bB]/.test(str)) { str = str.slice(2); note = "已按 0b 前缀识别为二进制"; }
    else if (base === 8 && /^0[oO]/.test(str)) { str = str.slice(2); note = "已按 0o 前缀识别为八进制"; }
    return { str: str, note: note };
  }

  function parseBig(str, base) {
    str = str.trim();
    if (str === "") return null;
    var neg = false;
    if (str[0] === "-") { neg = true; str = str.slice(1); }
    else if (str[0] === "+") { str = str.slice(1); }
    if (str === "") return null;
    var result = 0n;
    var b = BigInt(base);
    str = str.toLowerCase();
    for (var i = 0; i < str.length; i++) {
      var d = digitVal(str[i]);
      if (d < 0 || d >= base) return null;
      result = result * b + BigInt(d);
    }
    return neg ? -result : result;
  }

  function formatBig(val, base) {
    var s = val.toString(base);
    if (base === 16) s = s.toUpperCase();
    return s;
  }

  function currentTargets() {
    var t = [2, 8, 10, 16];
    var tc = parseInt(toCustomEl.value, 10);
    if (tc >= 2 && tc <= 36 && t.indexOf(tc) === -1) t.push(tc);
    return t;
  }

  /* ---------- 主转换 ---------- */
  function convert() {
    errorEl.hidden = true;
    prefixNote.textContent = "";
    var raw = (inputEl.value || "").trim();
    if (raw === "") {
      resultEl.innerHTML = '<div class="empty-tip" style="grid-column:1/-1;">输入数值后，将在此显示各进制结果</div>';
      return;
    }
    var base = getFromBase();
    if (isNaN(base)) {
      errorEl.hidden = false;
      errorEl.textContent = "自定义进制需为 2 到 36 之间的整数。";
      return;
    }
    var stripped = stripPrefix(raw, base);
    if (stripped.note) prefixNote.textContent = stripped.note;
    var val = parseBig(stripped.str, base);
    if (val === null) {
      errorEl.hidden = false;
      errorEl.textContent = "输入包含「" + base + " 进制」不合法字符。该进制仅允许 0-" + (base <= 10 ? (base - 1) : "9 及 A-" + String.fromCharCode(54 + base)) + "。";
      return;
    }
    var labels = { 2: "二进制", 8: "八进制", 10: "十进制", 16: "十六进制" };
    var cards = currentTargets().map(function (tb) {
      var s = formatBig(val, tb);
      var lbl = labels[tb] || (tb + " 进制");
      return '<div class="result-card"><div class="label">' + lbl + '（' + tb + '）</div>' +
        '<div class="num" style="word-break:break-all; font-size:18px;">' + s + '</div>' +
        '<button class="btn" style="margin-top:8px;" type="button" data-bc="' + escapeAttr(s) + '">复制</button></div>';
    });
    resultEl.innerHTML = cards.join("");
    Array.prototype.forEach.call(resultEl.querySelectorAll("[data-bc]"), function (btn) {
      btn.addEventListener("click", function () {
        copyText(btn.getAttribute("data-bc"), "已复制该进制结果");
      });
    });
  }

  fromEl.addEventListener("change", function () {
    customWrap.style.display = fromEl.value === "custom" ? "flex" : "none";
    convert();
  });
  customEl.addEventListener("input", convert);
  toCustomEl.addEventListener("input", convert);
  inputEl.addEventListener("input", convert);
  document.getElementById("btnBcConvert").addEventListener("click", convert);
  document.getElementById("btnBcCopy").addEventListener("click", function () {
    var txt = Array.prototype.map.call(resultEl.querySelectorAll(".result-card"), function (c) {
      return c.querySelector(".label").textContent + "：" + c.querySelector(".num").textContent;
    }).join("\n");
    if (!txt) { showToast("暂无可复制结果"); return; }
    copyText(txt, "已复制全部进制结果");
  });

  /* ---------- 字节 HEX 视图 ---------- */
  function textToHex() {
    var text = textEl.value;
    if (text === "") { hexEl.value = ""; return; }
    var bytes = new TextEncoder().encode(text);
    var out = [];
    for (var i = 0; i < bytes.length; i++) {
      out.push(bytes[i].toString(16).toUpperCase().padStart(2, "0"));
    }
    hexEl.value = out.join(" ");
  }

  function hexToText() {
    var raw = hexEl.value.trim();
    if (raw === "") { textEl.value = ""; return; }
    var parts = raw.split(/[\s,]+/).filter(function (p) { return p !== ""; });
    var bytes = [];
    for (var i = 0; i < parts.length; i++) {
      if (!/^[0-9a-fA-F]{1,2}$/.test(parts[i])) {
        showToast("HEX 含非法字节：" + parts[i]);
        return;
      }
      bytes.push(parseInt(parts[i], 16));
    }
    try {
      textEl.value = new TextDecoder("utf-8", { fatal: true }).decode(new Uint8Array(bytes));
    } catch (e) {
      textEl.value = new TextDecoder("utf-8").decode(new Uint8Array(bytes));
      showToast("部分字节非合法 UTF-8，已尽力还原");
    }
  }

  textEl.addEventListener("input", textToHex);
  hexEl.addEventListener("input", hexToText);
  document.getElementById("btnTextToHex").addEventListener("click", function () { textToHex(); showToast("已生成 HEX 视图"); });
  document.getElementById("btnHexToText").addEventListener("click", hexToText);
  document.getElementById("btnCopyHex").addEventListener("click", function () {
    if (!hexEl.value) { showToast("HEX 为空"); return; }
    copyText(hexEl.value, "已复制 HEX");
  });

  function escapeAttr(s) {
    return String(s).replace(/"/g, "&quot;").replace(/&/g, "&amp;");
  }

  /* 初始渲染 */
  convert();
  textToHex();
})();
