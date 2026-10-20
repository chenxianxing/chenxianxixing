/* ============================================================
   数据大小转换 - 工具页逻辑
   B/KB/MB/GB/TB/PB/EB 全单位换算，1024 与 1000 进制切换
   ============================================================ */
(function () {
  "use strict";

  var UNITS = [
    { k: "B", exp: 0, k1024: "B" },
    { k: "KB", exp: 1, k1024: "KiB" },
    { k: "MB", exp: 2, k1024: "MiB" },
    { k: "GB", exp: 3, k1024: "GiB" },
    { k: "TB", exp: 4, k1024: "TiB" },
    { k: "PB", exp: 5, k1024: "PiB" },
    { k: "EB", exp: 6, k1024: "EiB" }
  ];

  var valEl = document.getElementById("dsValue");
  var unitEl = document.getElementById("dsUnit");
  var tableEl = document.getElementById("dsTable");
  var tipEl = document.getElementById("dsTip");
  var baseEl = document.getElementById("dsBase");
  var refEl = document.getElementById("dsRef");

  var base = 1024;

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

  function fmt(n) {
    if (!isFinite(n)) return "—";
    if (n === 0) return "0";
    var abs = Math.abs(n);
    if (abs >= 1e15 || abs < 1e-9) return n.toExponential(6).replace(/\.?0+e/, "e");
    return parseFloat(n.toPrecision(10)).toString();
  }

  function unitLabel(u) {
    return base === 1024 ? u.k1024 : u.k;
  }

  function humanize(bytes) {
    if (bytes <= 0) return "0 B";
    var i = 0;
    for (; i < UNITS.length - 1; i++) {
      if (bytes < Math.pow(base, i + 1)) break;
    }
    var val = bytes / Math.pow(base, i);
    return fmt(val) + " " + unitLabel(UNITS[i]);
  }

  /* ---------- 进制切换样式 ---------- */
  Array.prototype.forEach.call(baseEl.querySelectorAll("label"), function (label) {
    label.addEventListener("click", function () {
      Array.prototype.forEach.call(baseEl.querySelectorAll("label"), function (l) {
        l.classList.remove("checked");
      });
      label.classList.add("checked");
      base = Number(label.querySelector("input").value);
      tipEl.textContent = base === 1024
        ? "Current base: 1024 (binary, using KiB/MiB/GiB labels, common on computer systems)"
        : "Current base: 1000 (decimal, using KB/MB/GB labels, common for manufacturers and networks)";
      convert();
      buildRef();
    });
  });

  unitEl.innerHTML = UNITS.map(function (u) {
    return '<option value="' + u.exp + '">' + u.k + (u.k1024 !== u.k ? " / " + u.k1024 : "") + "</option>";
  }).join("");

  function convert() {
    var raw = (valEl.value || "").trim();
    if (raw === "") {
      tableEl.innerHTML = '<tr><td colspan="2" class="empty-tip">Please enter a value</td></tr>';
      return;
    }
    var v = Number(raw);
    if (!isFinite(v)) {
      tableEl.innerHTML = '<tr><td colspan="2" class="warn-note">Please enter a valid value</td></tr>';
      return;
    }
    var chosenExp = Number(unitEl.value);
    var bytes = v * Math.pow(base, chosenExp);
    var rows = UNITS.map(function (u) {
      var val = bytes / Math.pow(base, u.exp);
      return "<tr><td>" + unitLabel(u) + "</td><td class='num'>" + fmt(val) + "</td></tr>";
    });
    tableEl.innerHTML = rows.join("");
  }

  valEl.addEventListener("input", convert);
  unitEl.addEventListener("change", convert);
  document.getElementById("btnCopyTable").addEventListener("click", function () {
    var lines = [];
    Array.prototype.forEach.call(tableEl.querySelectorAll("tr"), function (tr) {
      var tds = tr.querySelectorAll("td");
      if (tds.length === 2) lines.push(tds[0].textContent + "\t" + tds[1].textContent);
    });
    if (!lines.length) { showToast("Nothing to copy yet"); return; }
    copyText(lines.join("\n"), "Conversion table copied");
  });

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---------- 常见参照 ---------- */
  var REFS = [
    { name: "One English character", bytes: 1, note: "1 byte in ASCII encoding" },
    { name: "One SMS message (about 140 characters)", bytes: 140, note: "About 140 B as plain text" },
    { name: "One page of plain text in Word", bytes: 30 * 1024, note: "About 30 KB" },
    { name: "One MP3 song (4 minutes)", bytes: 5 * 1024 * 1024, note: "About 5 MB" },
    { name: "One JPEG photo", bytes: 3 * 1024 * 1024, note: "About 3 MB from a phone camera" },
    { name: "One CD disc", bytes: 700 * 1024 * 1024, note: "About 700 MB capacity" },
    { name: "One DVD disc", bytes: Math.round(4.7 * 1024 * 1024 * 1024), note: "About 4.7 GB for single layer" },
    { name: "One 720p HD movie", bytes: Math.round(1.5 * 1024 * 1024 * 1024), note: "About 1.5 GB" },
    { name: "One 1080p HD movie", bytes: 4 * 1024 * 1024 * 1024, note: "About 4 GB" },
    { name: "One Blu-ray movie", bytes: 25 * 1024 * 1024 * 1024, note: "About 25 GB" },
    { name: "32 GB USB Drive", bytes: 32 * 1024 * 1024 * 1024, note: "A common USB drive capacity" },
    { name: "1 TB Hard Disk Drive", bytes: 1e12, note: "Manufacturer-labeled 1 TB in decimal" }
  ];

  function buildRef() {
    refEl.innerHTML = REFS.map(function (r) {
      return '<div class="ref-card"><div class="name">' + escapeHtml(r.name) + '</div>' +
        '<div class="size">About' + humanize(r.bytes) + '</div>' +
        '<div class="note">' + escapeHtml(r.note) + '</div></div>';
    }).join("");
  }

  tipEl.textContent = "Current base: 1024 (binary, using KiB/MiB/GiB labels, common on computer systems)";
  convert();
  buildRef();
})();
