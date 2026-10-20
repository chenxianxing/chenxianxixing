/* ============================================================
   UUID生成器 - 工具页逻辑
   v4（随机）/ v7（RFC 9562 时间有序）批量生成
   ============================================================ */
(function () {
  "use strict";

  var versionRow = document.getElementById("uuidVersion");
  var countInput = document.getElementById("uuidCount");
  var optUpper = document.getElementById("optUpper");
  var optNoDash = document.getElementById("optNoDash");
  var optBrace = document.getElementById("optBrace");
  var resultEl = document.getElementById("uuidResult");

  var currentList = [];

  function getVersion() {
    var c = versionRow.querySelector("input:checked");
    return c ? c.value : "4";
  }

  Array.prototype.forEach.call(versionRow.querySelectorAll("label"), function (label) {
    label.addEventListener("click", function () {
      Array.prototype.forEach.call(versionRow.querySelectorAll("label"), function (l) { l.classList.remove("checked"); });
      label.classList.add("checked");
    });
  });

  function toHex(b) {
    var s = "";
    for (var i = 0; i < b.length; i++) {
      var h = (b[i] >>> 0).toString(16);
      s += h.length < 2 ? "0" + h : h;
    }
    return s;
  }

  function formatStandard(hex) {
    return hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" + hex.slice(12, 16) +
      "-" + hex.slice(16, 20) + "-" + hex.slice(20, 32);
  }

  function uuidV4() {
    var b = new Uint8Array(16);
    crypto.getRandomValues(b);
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    return toHex(b);
  }

  /* RFC 9562 UUID v7：48 位毫秒时间戳 + 版本 + 变体位 + 随机 */
  function uuidV7() {
    var ts = Date.now();
    var rand = new Uint8Array(10);
    crypto.getRandomValues(rand);
    var b = new Uint8Array(16);
    b[0] = (ts / Math.pow(2, 40)) & 0xff;
    b[1] = (ts >>> 32) & 0xff;
    b[2] = (ts >>> 24) & 0xff;
    b[3] = (ts >>> 16) & 0xff;
    b[4] = (ts >>> 8) & 0xff;
    b[5] = ts & 0xff;
    b[6] = 0x70 | (rand[0] & 0x0f);   /* version 7 + rand_a 高 4 位 */
    b[7] = rand[1];                     /* rand_a 低 8 位 */
    b[8] = 0x80 | (rand[2] & 0x3f);    /* variant 10 + rand_b 高 6 位 */
    b[9] = rand[3];
    b[10] = rand[4];
    b[11] = rand[5];
    b[12] = rand[6];
    b[13] = rand[7];
    b[14] = rand[8];
    b[15] = rand[9];
    return toHex(b);
  }

  function applyOptions(u) {
    if (optNoDash.checked) u = u.replace(/-/g, "");
    if (optUpper.checked) u = u.toUpperCase();
    if (optBrace.checked) u = "{" + u + "}";
    return u;
  }

  function generateOne() {
    var hex = getVersion() === "7" ? uuidV7() : uuidV4();
    return applyOptions(formatStandard(hex));
  }

  function generate() {
    var n = parseInt(countInput.value, 10);
    if (!isFinite(n) || n < 1) n = 1;
    if (n > 100) n = 100;
    countInput.value = n;

    currentList = [];
    for (var i = 0; i < n; i++) currentList.push(generateOne());
    renderList();
    showToast("已生成 " + n + " 个 UUID v" + getVersion());
  }

  function renderList() {
    if (!currentList.length) {
      resultEl.innerHTML = '<div class="empty-tip">点击「生成」获取 UUID，悬停某一行可单独复制</div>';
      return;
    }
    var html = currentList.map(function (u, idx) {
      return '<div class="uuid-line"><span class="uid">' + escapeHtml(u) + '</span>' +
        '<button class="btn copy-one" type="button" data-i="' + idx + '">复制</button></div>';
    }).join("");
    resultEl.innerHTML = html;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  /* ---------- 事件绑定 ---------- */
  document.getElementById("btnGen").addEventListener("click", generate);

  document.getElementById("btnCopyAll").addEventListener("click", function () {
    if (!currentList.length) { showToast("尚未生成"); return; }
    copyText(currentList.join("\n"), "已复制全部 " + currentList.length + " 个 UUID");
  });

  document.getElementById("btnDownload").addEventListener("click", function () {
    if (!currentList.length) { showToast("尚未生成"); return; }
    downloadText(currentList.join("\n"), "uuid-v" + getVersion() + "-" + Date.now() + ".txt", "text/plain");
  });

  document.getElementById("btnClear").addEventListener("click", function () {
    currentList = [];
    renderList();
  });

  resultEl.addEventListener("click", function (e) {
    var btn = e.target.closest && e.target.closest(".copy-one");
    if (!btn) return;
    var i = parseInt(btn.getAttribute("data-i"), 10);
    if (currentList[i] != null) copyText(currentList[i], "已复制该 UUID");
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
    showToast("已下载 " + filename);
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
