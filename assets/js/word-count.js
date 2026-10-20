/* ============================================================
   在线统计字数 - 工具页逻辑
   统计口径：
   - 中文字数：汉字按「字」计（含中文标点不计入字数，但计入字符数）
   - 英文单词：连续的字母/数字串算一个单词
   - 总字数 = 中文字数 + 英文单词数
   - 阅读时长：按每分钟 300 字估算
   ============================================================ */
(function () {
  "use strict";

  var textarea = document.getElementById("wcInput");
  if (!textarea) return;

  var els = {
    chars: document.getElementById("statChars"),
    charsNoSpace: document.getElementById("statCharsNoSpace"),
    chinese: document.getElementById("statChinese"),
    words: document.getElementById("statWords"),
    total: document.getElementById("statTotal"),
    lines: document.getElementById("statLines"),
    nonEmptyLines: document.getElementById("statNonEmptyLines"),
    paragraphs: document.getElementById("statParagraphs"),
    sentences: document.getElementById("statSentences"),
    readTime: document.getElementById("statReadTime"),
    btnCopy: document.getElementById("btnCopy"),
    btnClear: document.getElementById("btnClear"),
    btnSample: document.getElementById("btnSample"),
    editor: document.getElementById("wcEditor")
  };

  var CHINESE_RE = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g; // CJK 统一表意文字
  var WORD_RE = /[A-Za-z0-9]+(?:['\-][A-Za-z0-9]+)*/g;          // 英文单词 / 数字串
  var SENTENCE_SPLIT_RE = /[。！？!?；;…]+|\.\s+|\.$|\!\s|\?\s/;   // 中英文句子终止符
  var READ_SPEED = 300; // 字/分钟

  function fmt(n) {
    return Number(n).toLocaleString("zh-CN");
  }

  function analyze(text) {
    var chars = Array.from(text).length; // 以 Unicode 码点计，避免 emoji 等被算成 2 个字符
    var charsNoSpace = Array.from(text.replace(/\s/g, "")).length;
    var chinese = text.match(CHINESE_RE);
    var english = text.match(WORD_RE);
    var chineseCount = chinese ? chinese.length : 0;
    var englishCount = english ? english.length : 0;
    var total = chineseCount + englishCount;

    var lineArr = text.length ? text.split("\n") : [];
    var lines = lineArr.length;
    var nonEmptyLines = 0;
    for (var i = 0; i < lineArr.length; i++) {
      if (lineArr[i].trim().length) nonEmptyLines++;
    }

    var paragraphs = 0;
    if (text.trim().length) {
      paragraphs = text.split(/\n\s*\n|\r\n\s*\r\n/).filter(function (p) {
        return p.trim().length > 0;
      }).length;
    }

    var sentences = 0;
    if (text.trim().length) {
      sentences = text.split(SENTENCE_SPLIT_RE).filter(function (s) {
        return s.trim().length > 0;
      }).length;
    }

    var minutes = Math.ceil(total / READ_SPEED);

    return {
      chars: chars,
      charsNoSpace: charsNoSpace,
      chinese: chineseCount,
      words: englishCount,
      total: total,
      lines: lines,
      nonEmptyLines: nonEmptyLines,
      paragraphs: paragraphs,
      sentences: sentences,
      readMinutes: minutes
    };
  }

  function setText(el, value) {
    if (el) el.textContent = value;
  }

  function render() {
    var s = analyze(textarea.value);
    setText(els.chars, fmt(s.chars));
    setText(els.charsNoSpace, fmt(s.charsNoSpace));
    setText(els.chinese, fmt(s.chinese));
    setText(els.words, fmt(s.words));
    setText(els.total, fmt(s.total));
    setText(els.lines, fmt(s.lines));
    setText(els.nonEmptyLines, fmt(s.nonEmptyLines));
    setText(els.paragraphs, fmt(s.paragraphs));
    setText(els.sentences, fmt(s.sentences));
    setText(els.readTime, s.readTime === 0 ? "0 分钟" : "约 " + s.readMinutes + " 分钟");
    if (els.btnCopy) els.btnCopy.disabled = textarea.value.length === 0;
  }

  var timer = null;
  function scheduleRender() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(render, 80);
  }

  textarea.addEventListener("input", scheduleRender);

  /* 清空 */
  if (els.btnClear) {
    els.btnClear.addEventListener("click", function () {
      textarea.value = "";
      textarea.focus();
      render();
    });
  }

  /* 示例文本 */
  var SAMPLE = [
    "字数统计是写作、排版和翻译工作中最常见的基础需求之一。",
    "无论是学生党写论文、新媒体运营写文案，还是开发者写技术文档，",
    "都需要随时了解自己写了多少字。",
    "",
    "This is a free online word counter. 它支持中英文混合统计：",
    "Chinese characters are counted one by one, while English words are counted as a whole.",
    "统计结果还会实时显示行数、段落数、句子数以及预计阅读时间。",
    "",
    "把文本粘贴到上方输入框，或者直接把 .txt 文件拖进来，就可以开始统计了。"
  ].join("\n");

  if (els.btnSample) {
    els.btnSample.addEventListener("click", function () {
      textarea.value = SAMPLE;
      textarea.focus();
      render();
    });
  }

  /* 复制统计结果 */
  if (els.btnCopy) {
    els.btnCopy.addEventListener("click", function () {
      var s = analyze(textarea.value);
      var report =
        "【字数统计结果】\n" +
        "字符数（含空格）：" + fmt(s.chars) + "\n" +
        "字符数（不含空格）：" + fmt(s.charsNoSpace) + "\n" +
        "中文字数：" + fmt(s.chinese) + "\n" +
        "英文单词数：" + fmt(s.words) + "\n" +
        "总字数：" + fmt(s.total) + "\n" +
        "行数：" + fmt(s.lines) + "（非空 " + fmt(s.nonEmptyLines) + "）\n" +
        "段落数：" + fmt(s.paragraphs) + "\n" +
        "句子数：" + fmt(s.sentences) + "\n" +
        "预计阅读时长：" + (s.readMinutes === 0 ? "0 分钟" : "约 " + s.readMinutes + " 分钟");

      function done() {
        showToast("统计结果已复制到剪贴板");
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(report).then(done, function () { fallbackCopy(report); done(); });
      } else {
        fallbackCopy(report);
        done();
      }
    });
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

  /* 拖入 .txt / .md 文件 */
  if (els.editor && window.FileReader) {
    var hint = els.editor.querySelector(".drop-hint");
    var dragDepth = 0;

    els.editor.addEventListener("dragenter", function (e) {
      e.preventDefault();
      dragDepth++;
      els.editor.classList.add("dragover");
    });
    els.editor.addEventListener("dragover", function (e) {
      e.preventDefault();
    });
    els.editor.addEventListener("dragleave", function (e) {
      e.preventDefault();
      dragDepth--;
      if (dragDepth <= 0) {
        dragDepth = 0;
        els.editor.classList.remove("dragover");
      }
    });
    els.editor.addEventListener("drop", function (e) {
      e.preventDefault();
      dragDepth = 0;
      els.editor.classList.remove("dragover");
      var file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (!file) return;
      if (/\.(txt|md|markdown|csv|json|log)$/i.test(file.name) || /^text\//.test(file.type)) {
        if (file.size > 5 * 1024 * 1024) {
          showToast("文件过大（超过 5MB），请分批处理");
          return;
        }
        var reader = new FileReader();
        reader.onload = function () {
          textarea.value = String(reader.result || "");
          render();
          showToast("已读取文件：" + file.name);
        };
        reader.onerror = function () {
          showToast("文件读取失败，请重试");
        };
        reader.readAsText(file, "utf-8");
      } else {
        showToast("仅支持 .txt / .md 等纯文本文件");
      }
    });
  }

  render();
})();
