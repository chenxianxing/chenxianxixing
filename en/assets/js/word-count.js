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
    setText(els.readTime, s.readTime === 0 ? "0 min" : "about" + s.readMinutes + "Minute");
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
    "Word count is one of the most basic needs in writing, typesetting and translation work.",
    "Whether you are a student writing a paper, a social media manager writing copy, or a developer writing technical documentation,",
    "you always need to know how much you have written.",
    "",
    "This is a free online word counter. It supports mixed Chinese and English counting:",
    "Chinese characters are counted one by one, while English words are counted as a whole.",
    "The results also show lines, paragraphs, sentences and the estimated reading time in real time.",
    "",
    "Paste your text into the input box above, or drag a .txt file directly in, and the counting begins."
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
        "[Word Count Result]\n" +
        "Characters (with spaces): " + fmt(s.chars) + "\n" +
        "Characters (without spaces): " + fmt(s.charsNoSpace) + "\n" +
        "Chinese Characters: " + fmt(s.chinese) + "\n" +
        "English Words: " + fmt(s.words) + "\n" +
        "Total Words: " + fmt(s.total) + "\n" +
        "Lines: " + fmt(s.lines) + " (non-empty" + fmt(s.nonEmptyLines) + "）\n" +
        "Paragraphs: " + fmt(s.paragraphs) + "\n" +
        "Sentences: " + fmt(s.sentences) + "\n" +
        "Estimated reading time: " + (s.readMinutes === 0 ? "0 min" : "about" + s.readMinutes + "Minute");

      function done() {
        showToast("Statistics copied to clipboard");
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
          showToast("File too large (over 5MB), please split it into smaller batches");
          return;
        }
        var reader = new FileReader();
        reader.onload = function () {
          textarea.value = String(reader.result || "");
          render();
          showToast("File loaded: " + file.name);
        };
        reader.onerror = function () {
          showToast("Failed to read file, please try again");
        };
        reader.readAsText(file, "utf-8");
      } else {
        showToast("Only plain text files such as .txt and .md are supported");
      }
    });
  }

  render();
})();
