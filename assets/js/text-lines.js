/* ============================================================
   文本行处理 - 工具页逻辑
   去重/排序/去空行/大小写/前后缀/行号/拆分合并/查找替换
   历史栈支持撤销，复制与下载
   ============================================================ */
(function () {
  "use strict";

  /* ---------- DOM ---------- */
  var input = document.getElementById("tlInput");
  var output = document.getElementById("tlOutput");
  var linesEl = document.getElementById("tlLines");
  var charsEl = document.getElementById("tlChars");
  var uniqueEl = document.getElementById("tlUnique");
  var affix = document.getElementById("tlAffix");
  var findEl = document.getElementById("tlFind");
  var replaceEl = document.getElementById("tlReplace");
  var regexChk = document.getElementById("tlRegex");
  var igChk = document.getElementById("tlIgnoreCase");
  var replaceBtn = document.getElementById("tlReplaceBtn");
  var replaceCount = document.getElementById("tlReplaceCount");
  var undoBtn = document.getElementById("tlUndo");
  var resetBtn = document.getElementById("tlReset");
  var copyBtn = document.getElementById("tlCopy");
  var downloadBtn = document.getElementById("tlDownload");
  var sampleBtn = document.getElementById("tlSample");

  /* ---------- 提示 / 复制 ---------- */
  var toastEl = document.getElementById("toast");
  var toastTimer = null;
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 2000);
  }
  function copyText(text) {
    if (!text) { showToast(t("内容为空")); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () { showToast(t("已复制到剪贴板")); },
        function () { fallbackCopy(text); }
      );
    } else {
      fallbackCopy(text);
    }
  }
  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); showToast(t("已复制到剪贴板")); }
    catch (e) { showToast(t("复制失败，请手动复制")); }
    document.body.removeChild(ta);
  }

  /* ---------- 状态 ---------- */
  var baseText = "";     /* 输入框当前内容 */
  var history = [];      /* 每次操作后的结果文本 */

  function current() {
    return history.length ? history[history.length - 1] : baseText;
  }
  function render() {
    var text = current();
    output.value = text;
    updateStats(text);
  }
  function pushResult(text) {
    history.push(text);
    render();
  }

  /* 将整段文本拆成行（去掉结尾换行产生的空行） */
  function toLines(text) {
    if (text === "") return [];
    var arr = text.split("\n");
    if (text.charAt(text.length - 1) === "\n") arr.pop();
    return arr;
  }
  function fromLines(arr) {
    return arr.join("\n");
  }

  function updateStats(text) {
    var lines = toLines(text);
    linesEl.textContent = String(lines.length);
    charsEl.textContent = String(text.length);
    var seen = {};
    var uniq = 0;
    lines.forEach(function (ln) {
      if (!Object.prototype.hasOwnProperty.call(seen, ln)) {
        seen[ln] = true;
        uniq++;
      }
    });
    uniqueEl.textContent = String(uniq);
  }

  /* ---------- 各类操作 ---------- */
  var OPS = {
    dedup: function (lines) {
      var seen = {}, out = [];
      lines.forEach(function (ln) {
        if (!Object.prototype.hasOwnProperty.call(seen, ln)) {
          seen[ln] = true;
          out.push(ln);
        }
      });
      return out;
    },
    blank: function (lines) {
      return lines.filter(function (ln) { return ln.trim() !== ""; });
    },
    trim: function (lines) {
      return lines.map(function (ln) { return ln.trim(); });
    },
    lower: function (lines) {
      return lines.map(function (ln) { return ln.toLowerCase(); });
    },
    upper: function (lines) {
      return lines.map(function (ln) { return ln.toUpperCase(); });
    },
    "sort-asc": function (lines) {
      return lines.slice().sort();
    },
    "sort-desc": function (lines) {
      return lines.slice().sort().reverse();
    },
    "len-asc": function (lines) {
      return lines.slice().sort(function (a, b) { return a.length - b.length; });
    },
    "len-desc": function (lines) {
      return lines.slice().sort(function (a, b) { return b.length - a.length; });
    },
    reverse: function (lines) {
      return lines.slice().reverse();
    },
    prefix: function (lines) {
      var p = affix.value;
      return lines.map(function (ln) { return p + ln; });
    },
    suffix: function (lines) {
      var s = affix.value;
      return lines.map(function (ln) { return ln + s; });
    },
    lineno: function (lines) {
      return lines.map(function (ln, i) { return (i + 1) + ". " + ln; });
    },
    split: function (lines) {
      var sep = affix.value;
      if (sep === "") { showToast(t("请先填写分隔符")); return null; }
      var merged = lines.join("\n");
      return merged.split(sep);
    },
    join: function (lines) {
      var sep = affix.value;
      if (sep === "") sep = " ";
      return [lines.join(sep)];
    }
  };

  var OP_LABELS = {
    "dedup": "去重", "blank": "去除空行", "trim": "首尾去空格",
    "lower": "转小写", "upper": "转大写", "sort-asc": "排序升序",
    "sort-desc": "排序降序", "len-asc": "按长度升序", "len-desc": "按长度降序",
    "reverse": "行反转", "prefix": "加前缀", "suffix": "加后缀",
    "lineno": "行号前缀", "split": "按分隔符拆分", "join": "合并成一行"
  };

  function runOp(op) {
    var lines = toLines(current());
    var fn = OPS[op];
    if (!fn) return;
    var result = fn(lines);
    if (result === null) return; /* 需要参数但未填 */
    pushResult(fromLines(result));
    showToast(t("已执行：{n}", { n: OP_LABELS[op] || op }));
  }

  /* ---------- 查找替换 ---------- */
  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function doReplace() {
    var find = findEl.value;
    var repl = replaceEl.value;
    if (find === "") { showToast(t("请输入查找内容")); return; }
    var text = current();
    var count = 0;
    var result;
    if (regexChk.checked) {
      var flags = igChk.checked ? "gi" : "g";
      var re;
      try {
        re = new RegExp(find, flags);
      } catch (e) {
        showToast(t("正则表达式无效"));
        return;
      }
      var matches = text.match(re);
      count = matches ? matches.length : 0;
      /* 直接以字符串替换，原生支持 $1 $2 等捕获组引用 */
      result = text.replace(re, repl);
    } else {
      var needle = igChk.checked ? find.toLowerCase() : find;
      var lower = text.toLowerCase();
      var idx = 0;
      var out = "";
      while (true) {
        var at = igChk.checked ? lower.indexOf(needle, idx) : text.indexOf(find, idx);
        if (at === -1) { out += text.slice(idx); break; }
        out += text.slice(idx, at) + repl;
        idx = at + find.length;
        count++;
      }
      result = out;
    }
    pushResult(result);
    replaceCount.innerHTML = t("替换次数：<b>{n}</b>", { n: String(count) });
    showToast(t("替换完成，共 {n} 处", { n: String(count) }));
  }

  /* ---------- 下载 ---------- */
  function download() {
    var text = current();
    if (text === "") { showToast(t("内容为空")); return; }
    var blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "text-lines.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    showToast(t("已下载 text-lines.txt"));
  }

  /* ---------- 事件 ---------- */
  input.addEventListener("input", function () {
    baseText = input.value;
    history = [];
    render();
  });

  Array.prototype.forEach.call(document.querySelectorAll("[data-op]"), function (btn) {
    btn.addEventListener("click", function () { runOp(btn.getAttribute("data-op")); });
  });

  replaceBtn.addEventListener("click", doReplace);
  undoBtn.addEventListener("click", function () {
    if (history.length === 0) { showToast(t("没有可撤销的操作")); return; }
    history.pop();
    render();
    showToast(t("已撤销上一步"));
  });
  resetBtn.addEventListener("click", function () {
    input.value = "";
    baseText = "";
    history = [];
    output.value = "";
    replaceCount.innerHTML = t("替换次数：<b>0</b>");
    updateStats("");
    input.focus();
    showToast(t("已重置"));
  });
  copyBtn.addEventListener("click", function () { copyText(current()); });
  downloadBtn.addEventListener("click", download);
  sampleBtn.addEventListener("click", function () {
    input.value =
      "banana\nApple\ncherry\napple\nBanana\n\n葡萄\napple\nCherry\n\n芒果\nbanana";
    baseText = input.value;
    history = [];
    render();
    showToast(t("已载入示例（含重复与空行）"));
  });

  /* ---------- 初始化 ---------- */
  baseText = input.value;
  render();
})();
