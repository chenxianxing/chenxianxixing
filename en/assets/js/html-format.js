/* ============================================================
   HTML格式化 - 工具页逻辑
   美化 / 压缩 / 转义反转义 / 标签闭合检测（带行号）

   检测思路（浏览器同款行为）：
   - 逐字符扫描，正确跳过注释、DOCTYPE、CDATA
   - script / style / textarea / title / pre / xmp 内部按“原始文本”处理，
     里面的 < 与 > 不会被当成标签（这是旧版误报的根因）
   - 支持可省略结束标签（li / p / td / tr / option ...）的自动闭合
   - 每个问题都给出起始行号，点击可定位到输入框对应行
   ============================================================ */
(function () {
  "use strict";

  var VOID = {
    area: 1, base: 1, br: 1, col: 1, embed: 1, hr: 1, img: 1,
    input: 1, link: 1, meta: 1, param: 1, source: 1, track: 1, wbr: 1
  };

  /* 内容按原始文本处理（不解析内部标签） */
  var RAW_TEXT = {
    script: 1, style: 1, textarea: 1, title: 1, xmp: 1, pre: 1, plaintext: 1
  };

  /* 结束标签可省略的元素（html / head / body / p / li 等在 HTML5 中本来就可以不写闭合） */
  var OPT_CLOSE = {
    html: 1, head: 1, body: 1,
    li: 1, dt: 1, dd: 1, p: 1, option: 1, optgroup: 1,
    tr: 1, td: 1, th: 1, thead: 1, tbody: 1, tfoot: 1,
    rt: 1, rp: 1, colgroup: 1, caption: 1
  };

  /* 遇到这些块级元素时，父级 <p> 自动闭合 */
  var P_CLOSERS = {
    address: 1, article: 1, aside: 1, blockquote: 1, details: 1, dialog: 1,
    div: 1, dl: 1, fieldset: 1, figcaption: 1, figure: 1, footer: 1, form: 1,
    h1: 1, h2: 1, h3: 1, h4: 1, h5: 1, h6: 1, header: 1, hgroup: 1, hr: 1,
    main: 1, nav: 1, ol: 1, p: 1, pre: 1, section: 1, table: 1, ul: 1
  };

  var input = document.getElementById("hfInput");
  var output = document.getElementById("hfOutput");
  var opRow = document.getElementById("hfOp");
  var indentSel = document.getElementById("hfIndent");
  var wrapAttr = document.getElementById("hfWrapAttr");
  var checkBox = document.getElementById("hfCheck");
  var checkList = document.getElementById("hfCheckList");
  var checkSum = document.getElementById("hfCheckSum");
  var indentWrap = document.querySelector(".hf-indent-wrap");
  var wrapAttrWrap = document.querySelector(".hf-wrapattr-wrap");

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
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /* ---------------- 扫描器 ---------------- */
  function readTag(src, start) {
    var j = start + 1, close = false;
    if (src.charAt(j) === "/") { close = true; j++; }
    if (!/[a-zA-Z]/.test(src.charAt(j))) return null;
    var k = j;
    while (k < src.length && !/[\s/>]/.test(src.charAt(k))) k++;
    var name = src.slice(j, k);
    j = k;
    var quote = null;
    while (j < src.length) {
      var c = src.charAt(j);
      if (quote) { if (c === quote) quote = null; j++; continue; }
      if (c === '"' || c === "'") { quote = c; j++; continue; }
      if (c === ">") {
        var raw = src.slice(start, j + 1);
        return {
          name: name,
          close: close,
          selfClose: /\/\s*>$/.test(raw),
          attrs: src.slice(k, j).replace(/\/\s*$/, ""),
          raw: raw,
          end: j + 1
        };
      }
      j++;
    }
    return null;
  }

  function scan(src) {
    var n = src.length, i = 0, line = 1, toks = [];

    function countNL(from, to) {
      for (var k = from; k < to; k++) if (src.charCodeAt(k) === 10) line++;
    }

    while (i < n) {
      var lt = src.indexOf("<", i);
      if (lt < 0) lt = n;
      if (lt > i) {
        toks.push({ type: "text", value: src.slice(i, lt), line: line });
        countNL(i, lt);
        i = lt;
        continue;
      }
      /* 注释 */
      if (src.substr(i, 4) === "<!--") {
        var e1 = src.indexOf("-->", i + 4);
        e1 = e1 < 0 ? n : e1 + 3;
        toks.push({ type: "comment", value: src.slice(i, e1), line: line });
        countNL(i, e1); i = e1; continue;
      }
      /* DOCTYPE */
      if (src.substr(i, 9).toUpperCase() === "<!DOCTYPE") {
        var e2 = src.indexOf(">", i);
        e2 = e2 < 0 ? n : e2 + 1;
        toks.push({ type: "doctype", value: src.slice(i, e2), line: line });
        countNL(i, e2); i = e2; continue;
      }
      /* CDATA */
      if (src.substr(i, 9) === "<![CDATA[") {
        var e3 = src.indexOf("]]>", i);
        e3 = e3 < 0 ? n : e3 + 3;
        toks.push({ type: "text", value: src.slice(i, e3), line: line });
        countNL(i, e3); i = e3; continue;
      }
      /* 其它 <! ... > 与 <? ... ?> */
      if (src.charAt(i + 1) === "!" || src.charAt(i + 1) === "?") {
        var e4 = src.indexOf(">", i);
        e4 = e4 < 0 ? n : e4 + 1;
        toks.push({ type: "comment", value: src.slice(i, e4), line: line });
        countNL(i, e4); i = e4; continue;
      }

      var tag = readTag(src, i);
      if (!tag) { /* 单独的 < 号，按文本处理 */
        toks.push({ type: "text", value: "<", line: line });
        i++; continue;
      }
      toks.push({
        type: "tag", name: tag.name, close: tag.close, selfClose: tag.selfClose,
        attrs: tag.attrs, value: tag.raw, line: line
      });
      countNL(i, tag.end);
      i = tag.end;

      /* 原始文本元素：整体吞掉内容，直到对应结束标签 */
      var lname = tag.name.toLowerCase();
      if (!tag.close && !tag.selfClose && RAW_TEXT[lname]) {
        var re = new RegExp("</" + lname + "\\s*>", "i");
        var m = re.exec(src.slice(i));
        if (m) {
          var textEnd = i + m.index;
          if (textEnd > i) {
            toks.push({ type: "text", value: src.slice(i, textEnd), raw: true, rawTag: lname, line: line });
            countNL(i, textEnd);
            i = textEnd;
          }
        }
      }
    }
    return toks;
  }

  /* ---------------- 美化 ---------------- */
  function parseAttrs(raw) {
    var attrs = [];
    var re = /([\w:-]+)(?:\s*=\s*("(?:[^"]*)"|'(?:[^']*)'))?/g;
    var m;
    while ((m = re.exec(raw)) !== null) {
      if (m[2] !== undefined) attrs.push(m[1] + "=" + m[2]);
      else if (m[0].trim()) attrs.push(m[1]);
    }
    return attrs;
  }

  var NL = String.fromCharCode(10);
  function renderOpen(tag, indentUnit, lv, wrap) {
    var name = tag.name, raw = (tag.attrs || "").trim();
    var end = tag.selfClose ? "/>" : ">";
    if (!wrap || !raw) return "<" + name + (raw ? " " + raw : "") + end;
    var list = parseAttrs(raw);
    var inner = indentUnit.repeat(lv + 1), base = indentUnit.repeat(lv);
    var lines = ["<" + name];
    list.forEach(function (x) { lines.push(inner + x); });
    lines.push(base + end);
    return lines.join(NL);
  }

  function beautify(html, indentUnit, wrap) {
    var toks = scan(html), lv = 0, out = [];
    function pad() { return indentUnit.repeat(Math.max(0, lv)); }

    toks.forEach(function (t) {
      if (t.type === "comment" || t.type === "doctype") {
        out.push(pad() + t.value.trim());
      } else if (t.type === "text") {
        if (t.raw) {
          var body = t.value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
          var lines = body.split("\n");
          while (lines.length && !lines[0].trim()) lines.shift();
          while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
          if (!lines.length) return;
          /* pre / textarea 的空白参与渲染，不额外缩进，保持原样 */
          var base = (t.rawTag === "pre" || t.rawTag === "textarea") ? "" : pad();
          /* 取最小公共缩进，重新按层级缩进 */
          var minIndent = Infinity;
          lines.forEach(function (ln) {
            if (!ln.trim()) return;
            var lead = ln.match(/^[ \t]*/)[0].length;
            if (lead < minIndent) minIndent = lead;
          });
          if (!isFinite(minIndent)) minIndent = 0;
          lines.forEach(function (ln) {
            out.push(ln.trim() ? base + ln.slice(minIndent) : "");
          });
        } else {
          var x = t.value.replace(/\s+/g, " ").trim();
          if (x) out.push(pad() + x);
        }
      } else if (t.type === "tag") {
        var name = t.name;
        if (t.selfClose || VOID[name.toLowerCase()]) {
          out.push(pad() + renderOpen(t, indentUnit, lv, wrap));
        } else if (t.close) {
          lv = Math.max(0, lv - 1);
          out.push(pad() + "</" + name + ">");
        } else {
          out.push(pad() + renderOpen(t, indentUnit, lv, wrap));
          lv++;
        }
      }
    });
    return out.join(NL);
  }

  /* ---------------- 压缩 ---------------- */
  function compress(html) {
    var blocks = [];
    html = html.replace(/<(pre|textarea|script|style)([\s\S]*?)<\/\1>/gi, function (m) {
      blocks.push(m);
      return "\u0001" + (blocks.length - 1) + "\u0001";
    });
    html = html.replace(/<!--[\s\S]*?-->/g, "");
    html = html.replace(/>\s+</g, "><");
    html = html.replace(/\s{2,}/g, " ");
    html = html.replace(/\u0001(\d+)\u0001/g, function (_, i) { return blocks[+i]; });
    return html.trim();
  }

  function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function unescapeHtml(s) {
    return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'").replace(/&apos;/g, "'").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
  }

  /* ---------------- 标签闭合检测 ---------------- */
  function checkTags(src) {
    var toks = scan(src), stack = [], probs = [];

    function top() { return stack.length ? stack[stack.length - 1] : null; }

    toks.forEach(function (t) {
      if (t.type !== "tag") return;
      var name = t.name.toLowerCase();
      if (VOID[name]) return;

      if (t.close) {
        var idx = -1;
        for (var k = stack.length - 1; k >= 0; k--) {
          if (stack[k].name === name) { idx = k; break; }
        }
        if (idx < 0) {
          if (!OPT_CLOSE[name]) {
            probs.push({ kind: "extra", line: t.line, tag: t.name });
          }
          return;
        }
        /* 匹配项之上还压着的标签，说明它们没被关闭 */
        for (var k2 = stack.length - 1; k2 > idx; k2--) {
          var s = stack[k2];
          if (!OPT_CLOSE[s.name]) {
            probs.push({ kind: "unclosed", line: s.line, tag: s.name, endLine: t.line });
          }
        }
        stack.length = idx;
        return;
      }

      /* 可省略结束标签的自动闭合 */
      if (name === "li" || name === "option" || name === "optgroup") {
        while (top() && top().name === name) stack.pop();
      } else if (name === "dt" || name === "dd") {
        while (top() && (top().name === "dt" || top().name === "dd")) stack.pop();
      } else if (name === "td" || name === "th") {
        while (top() && (top().name === "td" || top().name === "th")) stack.pop();
      } else if (name === "tr") {
        while (top() && (top().name === "td" || top().name === "th" || top().name === "tr")) stack.pop();
      } else if (name === "thead" || name === "tbody" || name === "tfoot") {
        while (top() && (top().name === "thead" || top().name === "tbody" || top().name === "tfoot")) stack.pop();
      }
      if (P_CLOSERS[name] && top() && top().name === "p") stack.pop();

      stack.push({ name: name, tag: t.name, line: t.line });
    });

    for (var i = stack.length - 1; i >= 0; i--) {
      var s = stack[i];
      if (!OPT_CLOSE[s.name]) {
        probs.push({ kind: "unclosed", line: s.line, tag: s.tag });
      }
    }

    probs.sort(function (a, b) { return a.line - b.line; });
    return probs;
  }

  function selectLine(lineNo) {
    var lines = input.value.split("\n");
    if (lineNo < 1 || lineNo > lines.length) return;
    var start = 0;
    for (var k = 0; k < lineNo - 1; k++) start += lines[k].length + 1;
    input.focus();
    input.setSelectionRange(start, start + lines[lineNo - 1].length);
    var lh = parseFloat(window.getComputedStyle(input).lineHeight) || 22;
    input.scrollTop = Math.max(0, (lineNo - 1) * lh - input.clientHeight / 2);
  }

  function renderCheck(src) {
    if (!checkBox) return;
    checkList.innerHTML = "";
    if (!src.trim()) { checkBox.hidden = true; return; }

    var probs = checkTags(src);
    checkBox.hidden = false;

    if (!probs.length) {
      checkBox.className = "hf-check ok";
      checkSum.textContent = t("All tags are properly closed");
      return;
    }

    checkBox.className = "hf-check bad";
    checkSum.textContent = t("Found {n} issues. Click to locate the corresponding line", { n: probs.length });

    probs.forEach(function (p) {
      var li = document.createElement("li");
      li.tabIndex = 0;
      var msg = p.kind === "unclosed"
        ? t("Line {n}: <{tag}> is not closed", { n: p.line, tag: p.tag })
        : t("Line {n}: </{tag}> is extra; there is no matching opening tag before it", { n: p.line, tag: p.tag });
      li.innerHTML = '<span class="ln">' + p.line + '</span>' + esc(msg);
      if (p.endLine) {
        li.title = t("Not closed before the closing tag on line {n}", { n: p.endLine });
      }
      li.addEventListener("click", function () { selectLine(p.line); });
      li.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectLine(p.line); }
      });
      checkList.appendChild(li);
    });
  }

  /* ---------------- 交互 ---------------- */
  function getOp() {
    var c = opRow.querySelector("input:checked");
    return c ? c.value : "beautify";
  }
  function indentUnit() {
    var v = indentSel.value;
    if (v === "tab") return "\t";
    return v === "4" ? "    " : "  ";
  }
  function process() {
    var text = input.value;
    renderCheck(text);
    if (!text) { output.value = ""; return; }
    var op = getOp(), result = text;
    if (op === "beautify") result = beautify(text, indentUnit(), wrapAttr.checked);
    else if (op === "compress") result = compress(text);
    else if (op === "escape") result = escapeHtml(text);
    else if (op === "unescape") result = unescapeHtml(text);
    output.value = result;
  }

  Array.prototype.forEach.call(opRow.querySelectorAll("label"), function (label) {
    label.addEventListener("click", function () {
      Array.prototype.forEach.call(opRow.querySelectorAll("label"), function (l) { l.classList.remove("checked"); });
      label.classList.add("checked");
      var op = getOp();
      var show = op === "beautify";
      indentWrap.classList.toggle("show", show);
      wrapAttrWrap.classList.toggle("show", show);
      process();
    });
  });
  indentSel.addEventListener("change", process);
  wrapAttr.addEventListener("change", process);

  var debounceTimer = null;
  input.addEventListener("input", function () {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(process, 180);
  });

  document.getElementById("btnProcess").addEventListener("click", process);
  document.getElementById("btnCopy").addEventListener("click", function () {
    if (!output.value) { showToast("The result is empty"); return; }
    copyText(output.value, "Result copied");
  });
  document.getElementById("btnClear").addEventListener("click", function () {
    input.value = ""; output.value = ""; checkBox.hidden = true; input.focus();
  });

  var SAMPLE = [
    '<!DOCTYPE html>',
    '<html lang="zh-CN">',
    '<head>',
    '  <meta charset="UTF-8">',
    '<title>Example Page</title>',
    '</head>',
    '<body>',
    '  <div class="box">',
    '<h1>Title</h1>',
    '<p>This is a paragraph of <b>bold</b> text.</p>',
    '<ul><li>Item One</li><li>Item Two</li></ul>',
    '  </div>',
    '  <script>if (a < b && c > d) { console.log("1 < 2"); }</script>',
    '</body>',
    '</html>'
  ].join("\n");

  document.getElementById("btnSample").addEventListener("click", function () {
    input.value = SAMPLE; process(); showToast("Sample loaded");
  });

  process();

  /* 便于单元测试（浏览器中 module 未定义，不生效） */
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { scan: scan, checkTags: checkTags, beautify: beautify, compress: compress };
  }
})();
