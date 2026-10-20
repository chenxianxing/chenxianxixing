/* ============================================================
   Token生成器 - 工具页逻辑
   使用 crypto.getRandomValues 生成随机字节，按 Hex/Base64/Base64URL 编码
   ============================================================ */
(function () {
  "use strict";

  var lengthInput = document.getElementById("tkLength");
  var countInput = document.getElementById("tkCount");
  var formatRow = document.getElementById("tkFormat");
  var resultsEl = document.getElementById("tkResults");
  var actionsEl = document.getElementById("tkActions");

  var currentTokens = [];

  function getFormat() {
    var checked = formatRow.querySelector("input:checked");
    return checked ? checked.value : "hex";
  }

  function randomBytes(len) {
    var buf = new Uint8Array(len);
    crypto.getRandomValues(buf);
    return buf;
  }

  function toHex(bytes) {
    var s = "";
    for (var i = 0; i < bytes.length; i++) {
      s += ("0" + bytes[i].toString(16)).slice(-2);
    }
    return s;
  }

  function toBase64(bytes) {
    var bin = "";
    var chunk = 0x8000;
    for (var i = 0; i < bytes.length; i += chunk) {
      var slice = bytes.subarray(i, i + chunk);
      bin += String.fromCharCode.apply(null, slice);
    }
    return btoa(bin);
  }

  function toBase64Url(bytes) {
    return toBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function encode(bytes, fmt) {
    if (fmt === "hex") return toHex(bytes);
    if (fmt === "b64") return toBase64(bytes);
    return toBase64Url(bytes);
  }

  function generate() {
    var len = parseInt(lengthInput.value, 10);
    var count = parseInt(countInput.value, 10);
    if (isNaN(len) || len < 16) len = 16;
    if (len > 128) len = 128;
    lengthInput.value = len;
    if (isNaN(count) || count < 1) count = 1;
    if (count > 100) count = 100;
    countInput.value = count;

    var fmt = getFormat();
    currentTokens = [];
    for (var i = 0; i < count; i++) {
      currentTokens.push(encode(randomBytes(len), fmt));
    }
    render();
  }

  function render() {
    resultsEl.innerHTML = "";
    currentTokens.forEach(function (tok) {
      var item = document.createElement("div");
      item.className = "tk-item";

      var text = document.createElement("div");
      text.className = "tk-text";
      text.textContent = tok;

      var copyBtn = document.createElement("button");
      copyBtn.className = "btn";
      copyBtn.type = "button";
      copyBtn.textContent = "Copy";
      copyBtn.addEventListener("click", function () {
        copyText(tok, "Token copied");
      });

      item.appendChild(text);
      item.appendChild(copyBtn);
      resultsEl.appendChild(item);
    });
    resultsEl.hidden = false;
    actionsEl.hidden = false;
  }

  /* ---------- radio 样式联动 ---------- */
  Array.prototype.forEach.call(formatRow.querySelectorAll("label"), function (label) {
    label.addEventListener("click", function () {
      Array.prototype.forEach.call(formatRow.querySelectorAll("label"), function (l) {
        l.classList.remove("checked");
      });
      label.classList.add("checked");
      if (currentTokens.length) generate(); // 已有结果时直接按新格式重算
    });
  });

  document.getElementById("btnGen").addEventListener("click", generate);

  document.getElementById("btnCopyAll").addEventListener("click", function () {
    if (!currentTokens.length) return;
    copyText(currentTokens.join("\n"), "All copied " + currentTokens.length + " tokens");
  });

  document.getElementById("btnDownload").addEventListener("click", function () {
    if (!currentTokens.length) return;
    var content = currentTokens.join("\n") + "\n";
    var blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "tokens-" + currentTokens.length + ".txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Token file downloaded");
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
})();
