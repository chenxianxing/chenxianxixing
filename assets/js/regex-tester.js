/* ============================================================
   正则表达式在线测试 - 工具页逻辑
   实时匹配 + 高亮 + 分组捕获 + 替换测试 + 常用正则速查
   ============================================================ */
(function () {
  "use strict";

  var patternInput = document.getElementById("rePattern");
  var flagBox = document.getElementById("reFlags");
  var textInput = document.getElementById("reText");
  var errorBox = document.getElementById("reError");
  var countBadge = document.getElementById("reCount");
  var timeBadge = document.getElementById("reTime");
  var preview = document.getElementById("rePreview");
  var tableWrap = document.getElementById("reTableWrap");
  var tableBody = document.getElementById("reTableBody");
  var noMatch = document.getElementById("reNoMatch");
  var replaceTo = document.getElementById("reReplaceTo");
  var replaceCount = document.getElementById("reReplaceCount");
  var replaceOut = document.getElementById("reReplaceOut");
  var presetsBox = document.getElementById("rePresets");

  var MAX_MATCHES = 10000;

  function getFlags() {
    var flags = "";
    Array.prototype.forEach.call(flagBox.querySelectorAll("input:checked"), function (cb) {
      flags += cb.value;
    });
    return flags;
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function collectMatches(re, text) {
    var matches = [];
    var guard = 0;
    if (re.global || re.sticky) {
      re.lastIndex = 0;
      var m;
      while ((m = re.exec(text)) !== null) {
        matches.push(m);
        if (m[0] === "") re.lastIndex++; // 防止空匹配死循环
        if (++guard >= MAX_MATCHES) break;
      }
    } else {
      var m2 = re.exec(text);
      if (m2) matches.push(m2);
    }
    return matches;
  }

  function render() {
    errorBox.hidden = true;
    var pattern = patternInput.value;
    var text = textInput.value;
    var flags = getFlags();

    if (!pattern) {
      countBadge.textContent = "匹配 0 处";
      timeBadge.textContent = "耗时 0 ms";
      preview.innerHTML = '<span class="empty-tip" style="padding:12px 0;">输入正则和测试文本后，匹配结果将高亮显示在这里</span>';
      tableWrap.hidden = true;
      noMatch.hidden = false;
      noMatch.textContent = "暂无匹配";
      replaceOut.textContent = "替换结果会显示在这里";
      replaceCount.value = "0";
      return;
    }

    var re;
    try {
      re = new RegExp(pattern, flags);
    } catch (e) {
      errorBox.hidden = false;
      errorBox.textContent = "正则语法错误：" + e.message;
      return;
    }

    var t0 = performance.now();
    var matches = collectMatches(re, text);
    var ms = performance.now() - t0;

    countBadge.textContent = "匹配 " + matches.length + " 处";
    timeBadge.textContent = "耗时 " + ms.toFixed(2) + " ms";

    /* 高亮预览：按匹配区间构建 */
    if (!matches.length) {
      preview.innerHTML = '<span class="empty-tip" style="padding:12px 0;">没有匹配项</span>';
    } else {
      var html = "";
      var pos = 0;
      matches.forEach(function (m, i) {
        var start = m.index;
        var end = start + m[0].length;
        if (start < pos) return; // 粘性模式下重叠保护
        html += escapeHtml(text.slice(pos, start));
        html += '<mark class="match' + (i % 2 === 1 ? " alt" : "") + '">' + escapeHtml(m[0]) + "</mark>";
        pos = end;
      });
      html += escapeHtml(text.slice(pos));
      preview.innerHTML = html;
    }

    /* 匹配详情表 */
    tableBody.innerHTML = "";
    if (matches.length) {
      tableWrap.hidden = false;
      noMatch.hidden = true;
      matches.forEach(function (m, i) {
        var groups = [];
        for (var g = 1; g < m.length; g++) {
          groups.push("$" + g + "=" + (m[g] === undefined ? "∅" : JSON.stringify(m[g])));
        }
        var tr = document.createElement("tr");
        tr.innerHTML =
          "<td class='num'>" + (i + 1) + "</td>" +
          "<td>" + escapeHtml(m[0] || "(空匹配)") + "</td>" +
          "<td class='num'>" + m.index + "</td>" +
          "<td class='num'>" + m[0].length + "</td>" +
          "<td>" + (groups.length ? escapeHtml(groups.join("  ")) : "—") + "</td>";
        tableBody.appendChild(tr);
      });
    } else {
      tableWrap.hidden = true;
      noMatch.hidden = false;
      noMatch.textContent = "暂无匹配";
    }

    /* 替换测试 */
    if (!text) {
      replaceOut.textContent = "替换结果会显示在这里";
      replaceCount.value = "0";
    } else {
      try {
        var repl = replaceTo.value;
        var re2 = new RegExp(pattern, flags.indexOf("g") > -1 ? flags : flags + "g");
        var out = text.replace(re2, repl);
        replaceOut.textContent = out;
        /* 统计替换次数：用全局正则匹配数近似 */
        var re3 = new RegExp(pattern, flags.indexOf("g") > -1 ? flags : flags + "g");
        replaceCount.value = String(collectMatches(re3, text).length);
      } catch (e) {
        replaceOut.textContent = "替换失败：" + e.message;
        replaceCount.value = "0";
      }
    }
  }

  var timer = null;
  function schedule() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(render, 120);
  }

  patternInput.addEventListener("input", schedule);
  textInput.addEventListener("input", schedule);
  replaceTo.addEventListener("input", schedule);
  Array.prototype.forEach.call(flagBox.querySelectorAll("input"), function (cb) {
    cb.addEventListener("change", render);
  });

  document.getElementById("btnClear").addEventListener("click", function () {
    patternInput.value = "";
    textInput.value = "";
    replaceTo.value = "";
    render();
    patternInput.focus();
  });

  /* 常用正则速查 */
  var PRESETS = [
    ["邮箱", "^[\\w.!#$%&'*+/=?^`{|}~-]+@[\\w-]+(?:\\.[\\w-]+)+$"],
    ["手机号", "^1[3-9]\\d{9}$"],
    ["URL", "https?://[\\w.-]+(?:/[^\\s]*)?"],
    ["IPv4", "^(\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})$"],
    ["日期", "^\\d{4}-\\d{2}-\\d{2}$"],
    ["身份证", "^\\d{17}[\\dXx]$"],
    ["中文", "[\\u4e00-\\u9fa5]+"],
    ["整数", "^-?\\d+$"],
    ["小数", "^-?\\d+(?:\\.\\d+)?$"],
    ["QQ号", "^[1-9]\\d{4,10}$"],
    ["HTML标签", "</?[a-zA-Z][^>]*>"],
    ["十六进制颜色", "#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\\b"]
  ];

  PRESETS.forEach(function (p) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn";
    btn.textContent = p[0];
    btn.addEventListener("click", function () {
      patternInput.value = p[1];
      if (!textInput.value) {
        textInput.value = "示例：user@example.com  2024-06-15  <div class=\"box\">  #ff8800";
      }
      render();
      showToast("已填入「" + p[0] + "」正则，可点击填入示例文本");
    });
    presetsBox.appendChild(btn);
  });

  /* 轻提示 */
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

  render();
})();
