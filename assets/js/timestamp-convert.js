/* ============================================================
   时间戳转换 - 工具页逻辑
   Unix时间戳（秒/毫秒）<-> 日期时间，实时时钟，快捷时间
   ============================================================ */
(function () {
  "use strict";

  var tsInput = document.getElementById("tsInput");
  var tsUnit = document.getElementById("tsUnit");
  var tsResults = document.getElementById("tsResults");

  var dtInput = document.getElementById("dtInput");
  var dtText = document.getElementById("dtText");
  var dtResults = document.getElementById("dtResults");

  /* ---------- 工具：复制 / 提示 ---------- */
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

  /* ---------- 格式化辅助 ---------- */
  function pad(n, len) {
    var s = String(n);
    while (s.length < len) s = "0" + s;
    return s;
  }

  var WEEK = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

  function fmtLocal(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1, 2) + "-" + pad(d.getDate(), 2) +
      " " + pad(d.getHours(), 2) + ":" + pad(d.getMinutes(), 2) + ":" + pad(d.getSeconds(), 2) +
      " " + WEEK[d.getDay()];
  }

  function fmtISO(d) {
    var off = -d.getTimezoneOffset();
    var sign = off >= 0 ? "+" : "-";
    var ah = Math.floor(Math.abs(off) / 60);
    var am = Math.abs(off) % 60;
    return d.getFullYear() + "-" + pad(d.getMonth() + 1, 2) + "-" + pad(d.getDate(), 2) +
      "T" + pad(d.getHours(), 2) + ":" + pad(d.getMinutes(), 2) + ":" + pad(d.getSeconds(), 2) +
      sign + pad(ah, 2) + ":" + pad(am, 2);
  }

  function fmtUTC(d) {
    return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1, 2) + "-" + pad(d.getUTCDate(), 2) +
      " " + pad(d.getUTCHours(), 2) + ":" + pad(d.getUTCMinutes(), 2) + ":" + pad(d.getUTCSeconds(), 2) + " UTC";
  }

  /* ---------- 时间戳 → 日期 ---------- */
  function parseTs() {
    var raw = (tsInput.value || "").trim();
    if (!raw) {
      tsResults.innerHTML = '<div class="empty-tip">输入时间戳后，将在此显示本地时间、ISO 8601、UTC 三种格式</div>';
      return;
    }
    if (!/^\d+$/.test(raw)) {
      tsResults.innerHTML = '<div class="warn-note">请输入纯数字时间戳（Unix时间戳），不含空格或字母。</div>';
      return;
    }
    var unit = tsUnit.value;
    var ms;
    if (unit === "s") {
      ms = parseInt(raw, 10) * 1000;
    } else if (unit === "ms") {
      ms = parseInt(raw, 10);
    } else {
      if (raw.length >= 13) ms = parseInt(raw, 10);
      else if (raw.length >= 10) ms = parseInt(raw, 10) * 1000;
      else { ms = parseInt(raw, 10) * 1000; }
    }
    if (!isFinite(ms) || ms < 0 || ms > 8.64e15) {
      tsResults.innerHTML = '<div class="warn-note">时间戳超出可解析范围（建议在 0 ~ 9999 年之间）。</div>';
      return;
    }
    var d = new Date(ms);
    if (isNaN(d.getTime())) {
      tsResults.innerHTML = '<div class="warn-note">无法解析该时间戳。</div>';
      return;
    }
    var rows = [
      ["本地时间", fmtLocal(d)],
      ["ISO 8601", fmtISO(d)],
      ["UTC", fmtUTC(d)]
    ];
    tsResults.innerHTML = rows.map(function (r) {
      return '<div class="ts-result-row"><span class="k">' + r[0] + '</span>' +
        '<span class="v">' + escapeHtml(r[1]) + '</span>' +
        '<button class="btn copy" type="button" data-copy="' + escapeAttr(r[1]) + '" data-label="' + escapeAttr(r[0]) + '">复制</button></div>';
    }).join("");
    Array.prototype.forEach.call(tsResults.querySelectorAll("[data-copy]"), function (btn) {
      btn.addEventListener("click", function () {
        var label = decodeAttr(btn.getAttribute("data-label"));
        var name = { "本地时间": "本地时间", "ISO 8601": "ISO 8601", "UTC": "UTC 时间" }[label] || "结果";
        copyText(decodeAttr(btn.getAttribute("data-copy")), "已复制" + name);
      });
    });
  }

  tsInput.addEventListener("input", parseTs);
  tsUnit.addEventListener("change", parseTs);

  document.getElementById("btnNow").addEventListener("click", function () {
    tsInput.value = String(Math.floor(Date.now() / 1000));
    tsUnit.value = "auto";
    parseTs();
    showToast("已填入当前秒级时间戳");
  });
  document.getElementById("btnClearTs").addEventListener("click", function () {
    tsInput.value = "";
    parseTs();
  });

  /* ---------- 日期 → 时间戳 ---------- */
  function parseDt() {
    var value = (dtText.value || "").trim();
    var dateStr = value ? value.replace(" ", "T") : dtInput.value;
    if (!dateStr) {
      dtResults.innerHTML = '<div class="empty-tip">选择或输入日期时间后，将显示对应的秒/毫秒时间戳</div>';
      return;
    }
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      dtResults.innerHTML = '<div class="warn-note">无法解析该日期时间，请检查格式（如 2024-01-01 00:00:00）。</div>';
      return;
    }
    var sec = Math.floor(d.getTime() / 1000);
    var ms = d.getTime();
    var rows = [
      ["秒 (s)", String(sec), "秒"],
      ["毫秒 (ms)", String(ms), "毫秒"]
    ];
    dtResults.innerHTML = rows.map(function (r) {
      return '<div class="ts-result-row"><span class="k">' + r[0] + '</span>' +
        '<span class="v">' + r[1] + '</span>' +
        '<button class="btn copy" type="button" data-ts="' + r[1] + '" data-unit="' + r[2] + '">复制</button></div>';
    }).join("");
    Array.prototype.forEach.call(dtResults.querySelectorAll("[data-ts]"), function (btn) {
      btn.addEventListener("click", function () {
        var unit = btn.getAttribute("data-unit");
        copyText(btn.getAttribute("data-ts"), "已复制" + unit + "时间戳");
      });
    });
  }

  dtInput.addEventListener("input", function () {
    dtText.value = "";
    parseDt();
  });
  dtText.addEventListener("input", function () {
    dtInput.value = "";
    parseDt();
  });
  document.getElementById("btnDtToTs").addEventListener("click", parseDt);
  document.getElementById("btnCopyDtTs").addEventListener("click", function () {
    var first = dtResults.querySelector("[data-ts]");
    if (!first) { showToast("暂无可复制的时间戳"); return; }
    copyText(first.getAttribute("data-ts"), "已复制秒级时间戳");
  });

  /* ---------- 实时时钟 ---------- */
  function tickClock() {
    var now = new Date();
    var sec = Math.floor(now.getTime() / 1000);
    var ms = now.getTime();
    var lt = document.getElementById("liveTime");
    var ls = document.getElementById("liveSec");
    var lm = document.getElementById("liveMs");
    if (lt) lt.textContent = pad(now.getHours(), 2) + ":" + pad(now.getMinutes(), 2) + ":" + pad(now.getSeconds(), 2);
    if (ls) ls.textContent = "秒 " + sec;
    if (lm) lm.textContent = "毫秒 " + ms;
  }
  tickClock();
  setInterval(tickClock, 1000);

  document.getElementById("btnCopySec").addEventListener("click", function () {
    copyText(String(Math.floor(Date.now() / 1000)), "已复制当前秒级时间戳");
  });
  document.getElementById("btnCopyMs").addEventListener("click", function () {
    copyText(String(Date.now()), "已复制当前毫秒级时间戳");
  });

  /* ---------- 快捷时间 ---------- */
  function toLocalInput(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1, 2) + "-" + pad(d.getDate(), 2) +
      "T" + pad(d.getHours(), 2) + ":" + pad(d.getMinutes(), 2) + ":" + pad(d.getSeconds(), 2);
  }

  Array.prototype.forEach.call(document.querySelectorAll("[data-quick]"), function (btn) {
    btn.addEventListener("click", function () {
      var now = new Date();
      var d;
      var q = btn.getAttribute("data-quick");
      if (q === "today0") {
        d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      } else if (q === "yesterday") {
        d = new Date(now.getTime() - 86400000);
      } else if (q === "monday") {
        var diff = (now.getDay() + 6) % 7;
        d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff, 0, 0, 0);
      } else if (q === "month1") {
        d = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      } else if (q === "year1") {
        d = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
      }
      if (!d) return;
      tsInput.value = String(Math.floor(d.getTime() / 1000));
      tsUnit.value = "auto";
      parseTs();
      dtInput.value = toLocalInput(d);
      dtText.value = "";
      parseDt();
      showToast("已填入快捷时间：" + btn.textContent);
    });
  });

  /* ---------- 常见参考表 ---------- */
  function buildRef() {
    var list = [
      { label: "Unix 纪元起点 (1970-01-01 00:00:00 UTC)", s: 0 },
      { label: "10 亿秒", s: 1000000000 },
      { label: "1234567890", s: 1234567890 },
      { label: "13 亿秒", s: 1300000000 },
      { label: "14 亿秒", s: 1400000000 },
      { label: "15 亿秒", s: 1500000000 },
      { label: "16 亿秒", s: 1600000000 },
      { label: "17 亿秒", s: 1700000000 },
      { label: "20 亿秒", s: 2000000000 },
      { label: "17 亿秒对应毫秒", s: 1700000000, ms: 1700000000000 }
    ];
    var tbody = document.getElementById("refTable");
    tbody.innerHTML = list.map(function (it) {
      var sec = it.s;
      var msVal = it.ms != null ? it.ms : sec * 1000;
      return "<tr><td>" + escapeHtml(it.label) + "</td><td class='num'>" + sec + "</td><td class='num'>" + msVal + "</td></tr>";
    }).join("");
  }
  buildRef();

  /* ---------- 转义 ---------- */
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function escapeAttr(s) {
    return String(s).replace(/"/g, "&quot;");
  }
  function decodeAttr(s) {
    return String(s).replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  }
})();
