/* ============================================================
   Markdown编辑器 - 工具页逻辑
   实时预览 / 工具栏插入语法 / 草稿自动保存 / 导出HTML / 下载md
   ============================================================ */
(function () {
  "use strict";

  var STORAGE_KEY = "md-editor-draft";
  var input = document.getElementById("mdInput");
  var preview = document.getElementById("mdPreview");
  var draftHint = document.getElementById("draftHint");
  var toolbar = document.getElementById("mdToolbar");

  /* 轻提示 */
  var toastEl = document.getElementById("toast");
  var toastTimer = null;
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 2000);
  }

  /* 复制（带降级） */
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

  /* 渲染预览 */
  function render() {
    var md = input.value;
    if (!md.trim()) {
      preview.innerHTML = '<span class="empty-tip" style="padding:40px 0;">预览将显示在这里</span>';
      return;
    }
    if (window.marked && typeof window.marked.parse === "function") {
      try {
        preview.innerHTML = window.marked.parse(md);
      } catch (e) {
        preview.textContent = md;
      }
    } else {
      preview.textContent = md;
    }
  }

  /* 草稿自动保存 */
  var saveTimer = null;
  function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try {
        localStorage.setItem(STORAGE_KEY, input.value);
        if (input.value.trim()) {
          draftHint.classList.add("show");
          setTimeout(function () { draftHint.classList.remove("show"); }, 1500);
        }
      } catch (e) { /* 隐私模式等可能不可用 */ }
    }, 400);
  }

  input.addEventListener("input", function () {
    render();
    scheduleSave();
  });

  /* 文本框选区操作 */
  function wrapSelection(before, after, placeholder) {
    var start = input.selectionStart;
    var end = input.selectionEnd;
    var selected = input.value.substring(start, end) || (placeholder || "");
    var text = before + selected + after;
    input.value = input.value.substring(0, start) + text + input.value.substring(end);
    var cursor = start + before.length;
    input.focus();
    input.setSelectionRange(cursor, cursor + selected.length);
    render();
    scheduleSave();
  }

  function insertAtLineStart(prefix) {
    var start = input.selectionStart;
    var value = input.value;
    var lineStart = value.lastIndexOf("\n", start - 1) + 1;
    input.value = value.substring(0, lineStart) + prefix + value.substring(lineStart);
    input.focus();
    input.setSelectionRange(start + prefix.length, start + prefix.length);
    render();
    scheduleSave();
  }

  function insertBlock(text) {
    var start = input.selectionStart;
    var value = input.value;
    var needNl = start > 0 && value.charAt(start - 1) !== "\n";
    var block = (needNl ? "\n" : "") + text;
    input.value = value.substring(0, start) + block + value.substring(start);
    var pos = start + block.length;
    input.focus();
    input.setSelectionRange(pos, pos);
    render();
    scheduleSave();
  }

  /* 工具栏指令 */
  var ACTIONS = {
    bold: function () { wrapSelection("**", "**", "粗体文本"); },
    italic: function () { wrapSelection("*", "*", "斜体文本"); },
    strike: function () { wrapSelection("~~", "~~", "删除线文本"); },
    h1: function () { insertAtLineStart("# "); },
    h2: function () { insertAtLineStart("## "); },
    h3: function () { insertAtLineStart("### "); },
    ul: function () { insertAtLineStart("- "); },
    ol: function () { insertAtLineStart("1. "); },
    quote: function () { insertAtLineStart("> "); },
    link: function () { wrapSelection("[", "](https://)", "链接文字"); },
    image: function () { wrapSelection("![", "](https://)", "图片描述"); },
    code: function () { wrapSelection("`", "`", "代码"); },
    codeblock: function () { wrapSelection("\n```\n", "\n```\n", "在此输入代码"); },
    table: function () {
      insertBlock("| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |\n| 内容 | 内容 | 内容 |");
    },
    hr: function () { insertBlock("---"); }
  };

  toolbar.addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-md]");
    if (!btn) return;
    var act = ACTIONS[btn.getAttribute("data-md")];
    if (act) act();
  });

  /* 载入示例 */
  var SAMPLE = [
    "# 欢迎使用 Markdown 编辑器",
    "",
    "这是一个**实时预览**的 *Markdown* 编辑器，~~删除线~~ 也支持。",
    "",
    "## 功能列表",
    "",
    "- 左右分栏实时预览",
    "- 工具栏一键插入语法",
    "- 草稿自动保存到本地",
    "",
    "1. 第一步：编写内容",
    "2. 第二步：实时预览",
    "3. 第三步：导出或下载",
    "",
    "> 引用一句话：所有处理都在浏览器本地完成。",
    "",
    "### 代码块示例",
    "",
    "```js",
    "function hello(name) {",
    "  return '你好，' + name;",
    "}",
    "```",
    "",
    "### 表格示例",
    "",
    "| 工具 | 说明 | 是否免费 |",
    "| --- | --- | --- |",
    "| Markdown编辑器 | 实时预览 | 是 |",
    "| URL编码 | 编解码 | 是 |",
    "",
    "更多语法参见 [Markdown 官网](https://commonmark.org)。"
  ].join("\n");

  document.getElementById("btnSample").addEventListener("click", function () {
    input.value = SAMPLE;
    render();
    scheduleSave();
    showToast("已载入示例文档");
  });

  /* 导出 HTML（带基础样式的完整文档） */
  function buildFullHtml(md) {
    var body = "";
    if (window.marked && typeof window.marked.parse === "function") {
      try { body = window.marked.parse(md); } catch (e) { body = "<pre>" + escapeHtml(md) + "</pre>"; }
    } else {
      body = "<pre>" + escapeHtml(md) + "</pre>";
    }
    return [
      "<!DOCTYPE html>",
      '<html lang="zh-CN">',
      "<head>",
      '  <meta charset="UTF-8">',
      '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
      "  <title>Markdown 导出文档</title>",
      "  <style>",
      "    body{max-width:860px;margin:40px auto;padding:0 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;line-height:1.8;color:#1f2937;}",
      "    h1,h2,h3,h4,h5,h6{line-height:1.4;margin:22px 0 12px;}",
      "    h1{font-size:28px;border-bottom:1px solid #e5e7eb;padding-bottom:8px;}",
      "    h2{font-size:23px;border-bottom:1px solid #e5e7eb;padding-bottom:6px;}",
      "    h3{font-size:19px;}",
      "    p{margin:12px 0;}",
      "    ul,ol{margin:12px 0 12px 24px;}",
      "    li{margin:5px 0;}",
      "    blockquote{margin:14px 0;padding:10px 18px;border-left:4px solid #2563eb;background:#eff6ff;color:#1e40af;border-radius:6px;}",
      "    code{background:#f1f5f9;padding:2px 6px;border-radius:5px;font-family:Consolas,Menlo,monospace;font-size:13px;}",
      "    pre{background:#f8fafc;border:1px solid #e5e7eb;padding:16px;border-radius:10px;overflow:auto;}",
      "    pre code{background:none;padding:0;}",
      "    table{border-collapse:collapse;width:100%;margin:14px 0;font-size:14px;}",
      "    th,td{border:1px solid #e5e7eb;padding:8px 12px;text-align:left;}",
      "    th{background:#f8fafc;}",
      "    a{color:#2563eb;}",
      "    img{max-width:100%;}",
      "    hr{border:none;border-top:1px solid #e5e7eb;margin:20px 0;}",
      "  </style>",
      "</head>",
      "<body>",
      body,
      "</body>",
      "</html>"
    ].join("\n");
  }

  function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function download(filename, content, mime) {
    var blob = new Blob([content], { type: (mime || "text/plain") + ";charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  document.getElementById("btnExportHtml").addEventListener("click", function () {
    if (!input.value.trim()) { showToast("内容为空，无法导出"); return; }
    download("markdown-export.html", buildFullHtml(input.value), "text/html");
    showToast("已导出 HTML 文件");
  });

  document.getElementById("btnDownloadMd").addEventListener("click", function () {
    if (!input.value.trim()) { showToast("内容为空，无法下载"); return; }
    download("document.md", input.value, "text/markdown");
    showToast("已下载 .md 文件");
  });

  document.getElementById("btnClearDraft").addEventListener("click", function () {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
    showToast("已清除本地草稿");
  });

  document.getElementById("btnClear").addEventListener("click", function () {
    input.value = "";
    render();
    scheduleSave();
    input.focus();
  });

  /* 初始化：恢复草稿 */
  try {
    var saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) input.value = saved;
  } catch (e) { /* ignore */ }

  render();
})();
