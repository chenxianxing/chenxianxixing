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
    if (!text) { showToast(t("Content is empty")); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () { showToast(t("Copied to clipboard")); },
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
    try { document.execCommand("copy"); showToast(t("Copied to clipboard")); }
    catch (e) { showToast(t("Copy failed, please copy manually")); }
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
      if (sep === "") { showToast(t("Please enter a delimiter first")); return null; }
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
    "dedup": "Unique", "blank": "Remove blank lines", "trim": "Trim spaces",
    "lower": "To lowercase", "upper": "To uppercase", "sort-asc": "Sort ascending",
    "sort-desc": "Sort descending", "len-asc": "Sort by length ascending", "len-desc": "Sort by length descending",
    "reverse": "Reverse lines", "prefix": "Add prefix", "suffix": "Add suffix",
    "lineno": "Line number prefix", "split": "Split by delimiter", "join": "Merge into one line"
  };

  function runOp(op) {
    var lines = toLines(current());
    var fn = OPS[op];
    if (!fn) return;
    var result = fn(lines);
    if (result === null) return; /* 需要参数但未填 */
    pushResult(fromLines(result));
    showToast(t("Executed: {n}", { n: OP_LABELS[op] || op }));
  }

  /* ---------- 查找替换 ---------- */
  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function doReplace() {
    var find = findEl.value;
    var repl = replaceEl.value;
    if (find === "") { showToast(t("Please enter the find term")); return; }
    var text = current();
    var count = 0;
    var result;
    if (regexChk.checked) {
      var flags = igChk.checked ? "gi" : "g";
      var re;
      try {
        re = new RegExp(find, flags);
      } catch (e) {
        showToast(t("Invalid regular expression"));
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
    replaceCount.innerHTML = t("Replacements: <b>{n}</b>", { n: String(count) });
    showToast(t("Replacement complete, {n} occurrence(s)", { n: String(count) }));
  }

  /* ---------- 下载 ---------- */
  function download() {
    var text = current();
    if (text === "") { showToast(t("Content is empty")); return; }
    var blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "text-lines.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    showToast(t("Downloaded text-lines.txt"));
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
    if (history.length === 0) { showToast(t("No operation to undo")); return; }
    history.pop();
    render();
    showToast(t("Undid last step"));
  });
  resetBtn.addEventListener("click", function () {
    input.value = "";
    baseText = "";
    history = [];
    output.value = "";
    replaceCount.innerHTML = t("Replacements: <b>0</b>");
    updateStats("");
    input.focus();
    showToast(t("Reset"));
  });
  copyBtn.addEventListener("click", function () { copyText(current()); });
  downloadBtn.addEventListener("click", download);
  sampleBtn.addEventListener("click", function () {
    input.value =
      "banana\nApple\ncherry\napple\nBanana\n\ngrape\napple\nCherry\n\nmango\nbanana";
    baseText = input.value;
    history = [];
    render();
    showToast(t("Sample loaded (with duplicates and blank lines)"));
  });

  /* ---------- 初始化 ---------- */
  baseText = input.value;
  render();
})();
