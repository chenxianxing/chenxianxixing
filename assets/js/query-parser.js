/* ============================================================
   Query参数解析 - 工具页逻辑
   支持：完整URL / ?a=1&b=2 / a=1&b=2；保留#hash；可编辑、增删、编码开关、实时重组
   ============================================================ */
(function () {
  "use strict";

  var inputEl = document.getElementById("qpInput");
  var bodyEl = document.getElementById("qpBody");
  var emptyEl = document.getElementById("qpEmpty");
  var urlEl = document.getElementById("qpUrl");
  var encodeEl = document.getElementById("qpEncode");

  var rows = [];      // { key, value, encoded }
  var baseUrl = "";   // 问号之前的部分（含协议、域名、路径）
  var hashPart = "";  // # 之后的片段

  function safeDecode(s) {
    try { return decodeURIComponent(s); } catch (e) { return s; }
  }

  function isEncoded(str) {
    return /%[0-9A-Fa-f]{2}/.test(str);
  }

  /* 解析输入，填充 rows / baseUrl / hashPart */
  function parse(raw) {
    raw = (raw || "").trim();
    rows = [];
    baseUrl = "";
    hashPart = "";

    if (!raw) return;

    /* 拆分 hash */
    var hashIdx = raw.indexOf("#");
    if (hashIdx > -1) {
      hashPart = raw.slice(hashIdx + 1);
      raw = raw.slice(0, hashIdx);
    }

    var query = "";
    var qIdx = raw.indexOf("?");
    if (qIdx > -1) {
      /* 含问号：问号前为 base，问号后为 query */
      baseUrl = raw.slice(0, qIdx);
      query = raw.slice(qIdx + 1);
    } else if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(raw) || raw.indexOf("//") === 0) {
      /* 形如 URL 但无 query：base 为整体，无参数 */
      baseUrl = raw;
      query = "";
    } else {
      /* 纯参数串（可能带或不带问号，已排除） */
      query = raw;
    }

    if (!query) return;

    var pairs = query.split("&");
    pairs.forEach(function (pair) {
      if (pair === "") return;
      var eq = pair.indexOf("=");
      var rawKey, rawVal;
      if (eq === -1) {
        rawKey = pair;
        rawVal = "";
      } else {
        rawKey = pair.slice(0, eq);
        rawVal = pair.slice(eq + 1);
      }
      var encoded = isEncoded(rawKey) || isEncoded(rawVal);
      rows.push({
        key: safeDecode(rawKey),
        value: safeDecode(rawVal),
        encoded: encoded
      });
    });
  }

  /* 渲染参数表格 */
  function renderTable() {
    if (!rows.length) {
      bodyEl.innerHTML = "";
      emptyEl.hidden = false;
      return;
    }
    emptyEl.hidden = true;
    var html = "";
    rows.forEach(function (r, i) {
      var flag = r.encoded
        ? '<span class="badge blue">已编码</span>'
        : '<span class="badge">未编码</span>';
      html +=
        '<tr data-idx="' + i + '">' +
          '<td class="col-key"><input type="text" class="form-input" data-f="key" value="' + escAttr(r.key) + '"></td>' +
          '<td class="col-val"><input type="text" class="form-input" data-f="value" value="' + escAttr(r.value) + '"></td>' +
          '<td class="col-flag">' + flag + '</td>' +
          '<td class="col-op"><button class="qp-del" type="button" data-act="del" title="删除">×</button></td>' +
        "</tr>";
    });
    bodyEl.innerHTML = html;
  }

  /* 实时重组 URL */
  function buildUrl() {
    var doEncode = encodeEl.checked;
    var parts = [];
    rows.forEach(function (r) {
      if (r.key === "" && r.value === "") return;
      var k = doEncode ? encodeURIComponent(r.key) : r.key;
      var v = doEncode ? encodeURIComponent(r.value) : r.value;
      parts.push(k + "=" + v);
    });
    var query = parts.join("&");
    var url = baseUrl || "";
    if (query) url += (baseUrl && baseUrl.indexOf("?") === -1 ? "?" : "") + query;
    if (hashPart) url += "#" + hashPart;
    return url;
  }

  function refreshUrl() {
    urlEl.value = buildUrl();
  }

  function escAttr(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* 事件：解析按钮 */
  document.getElementById("qpParse").addEventListener("click", function () {
    parse(inputEl.value);
    renderTable();
    refreshUrl();
    if (!rows.length) showToast("未解析出参数");
  });

  /* 事件：载入当前页面 URL */
  document.getElementById("qpLoad").addEventListener("click", function () {
    var href = location.href;
    inputEl.value = href;
    parse(href);
    renderTable();
    refreshUrl();
    if (!rows.length) {
      showToast("当前页面 URL 没有查询参数");
    } else {
      showToast("已载入当前页面 URL");
    }
  });

  /* 事件：添加参数 */
  document.getElementById("qpAdd").addEventListener("click", function () {
    rows.push({ key: "", value: "", encoded: false });
    renderTable();
    refreshUrl();
    var last = bodyEl.querySelector("tr:last-child .form-input");
    if (last) last.focus();
  });

  /* 事件：表格内编辑/删除（委托） */
  bodyEl.addEventListener("input", function (e) {
    var inp = e.target.closest("input[data-f]");
    if (!inp) return;
    var tr = inp.closest("tr");
    var idx = parseInt(tr.getAttribute("data-idx"), 10);
    if (!rows[idx]) return;
    rows[idx][inp.getAttribute("data-f")] = inp.value;
    refreshUrl();
  });

  bodyEl.addEventListener("click", function (e) {
    var btn = e.target.closest('button[data-act="del"]');
    if (!btn) return;
    var tr = btn.closest("tr");
    var idx = parseInt(tr.getAttribute("data-idx"), 10);
    rows.splice(idx, 1);
    renderTable();
    refreshUrl();
  });

  /* 事件：编码开关 */
  encodeEl.addEventListener("change", refreshUrl);

  /* 复制重组 URL */
  document.getElementById("qpCopy").addEventListener("click", function () {
    if (!urlEl.value) { showToast("暂无可复制的 URL"); return; }
    copyText(urlEl.value, "已复制重组 URL");
  });

  /* 清空 */
  document.getElementById("qpClear").addEventListener("click", function () {
    inputEl.value = "";
    rows = [];
    baseUrl = "";
    hashPart = "";
    renderTable();
    refreshUrl();
  });

  /* ---------- 工具函数（与全站一致） ---------- */
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
