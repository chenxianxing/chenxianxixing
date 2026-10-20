/* ============================================================
   HTML格式化 - 工具页逻辑
   美化 / 压缩 / 转义反转义 / 标签未闭合检测
   ============================================================ */
(function () {
  "use strict";

  var VOID = {
    area: 1, base: 1, br: 1, col: 1, embed: 1, hr: 1, img: 1,
    input: 1, link: 1, meta: 1, param: 1, source: 1, track: 1, wbr: 1
  };

  var input = document.getElementById("hfInput");
  var output = document.getElementById("hfOutput");
  var opRow = document.getElementById("hfOp");
  var indentSel = document.getElementById("hfIndent");
  var wrapAttr = document.getElementById("hfWrapAttr");
  var errorBox = document.getElementById("hfError");
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

  /* 把 HTML 拆成 token：comment / doctype / tag / text */
  function tokenize(html) {
    var tokens = [];
    var re = /<!--[\s\S]*?-->|<!DOCTYPE[^>]*>|<\/?[a-zA-Z][\w:-]*((?:[^>"']|"[^"]*"|'[^']*')*)(\s*\/?)>|[\s\S]+?(?=<!--|<!DOCTYPE|<\/?[a-zA-Z]|$)/gi;
    var m;
    while ((m = re.exec(html)) !== null) {
      var v = m[0];
      if (/^<!--/.test(v)) {
        tokens.push({ type: "comment", value: v });
      } else if (/^<!DOCTYPE/i.test(v)) {
        tokens.push({ type: "doctype", value: v });
      } else if (/^<[^>]*>$/.test(v) && v.indexOf("<") === 0) {
        var close = v.charAt(1) === "/";
        var selfClose = /\/\s*>$/.test(v);
        var nameMatch = v.match(/^<\/?([a-zA-Z][\w:-]*)/);
        var name = nameMatch ? nameMatch[1] : "";
        var attrs = m[1] || "";
        tokens.push({ type: "tag", name: name, close: close, selfClose: selfClose, attrs: attrs });
      } else {
        tokens.push({ type: "text", value: v });
      }
      if (m.index === re.lastIndex) re.lastIndex++;
    }
    return tokens;
  }

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
  function renderOpen(tag, is, lv, wrap){
    var n = tag.name, raw = (tag.attrs || "").trim();
    var close = tag.selfClose ? "/>" : ">";
    if(!wrap || !raw) return "<" + n + (raw ? " " + raw : "") + close;
    var a = parseAttrs(raw), inner = is.repeat(lv + 1), base = is.repeat(lv), lines = ["<" + n];
    a.forEach(function(x){ lines.push(inner + x); });
    lines.push(base + close);
    return lines.join(NL);
  }
  function beautify(html, is, wrap){
    var toks = tokenize(html), lv = 0, out = [];
    function pad(){ return is.repeat(lv); }
    toks.forEach(function(t){
      if(t.type === "comment"){ out.push(pad() + t.value); }
      else if(t.type === "doctype"){ out.push(pad() + t.value); }
      else if(t.type === "text"){
        var x = t.value.replace(/\s+/g, " ").trim();
        if(x) out.push(pad() + x);
      } else if(t.type === "tag"){
        if(t.selfClose || VOID[t.name.toLowerCase()]){ out.push(pad() + renderOpen(t, is, lv, wrap)); }
        else if(t.close){ lv = Math.max(0, lv - 1); out.push(pad() + "</" + t.name + ">"); }
        else { out.push(pad() + renderOpen(t, is, lv, wrap)); lv++; }
      }
    });
    return out.join(NL);
  }
  function compress(html){
    var blocks = [];
    html = html.replace(/<(pre|textarea|script)([\s\S]*?)<\/\1>/gi, function(m){
      blocks.push(m);
      return " " + (blocks.length - 1) + " ";
    });
    html = html.replace(/<!--[\s\S]*?-->/g, "");
    html = html.replace(/>\s+</g, "><");
    html = html.replace(/ (\d+) /g, function(_, i){ return blocks[+i]; });
    return html.trim();
  }
  function escapeHtml(s){
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function unescapeHtml(s){
    return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'").replace(/&amp;/g, "&");
  }
  function checkTags(html){
    var toks = tokenize(html), stack = [], probs = [];
    toks.forEach(function(t){
      if(t.type !== "tag" || t.selfClose || VOID[t.name.toLowerCase()]) return;
      if(t.close){
        if(stack.length && stack[stack.length - 1] === t.name) stack.pop();
        else probs.push("多余的闭合标签：</" + t.name + ">");
      } else stack.push(t.name);
    });
    stack.forEach(function(n){ probs.push("未闭合标签：<" + n + ">"); });
    return probs;
  }
  function getOp(){
    var c = opRow.querySelector("input:checked");
    return c ? c.value : "beautify";
  }
  function indentString(){
    var v = indentSel.value;
    if(v === "tab") return "\t";
    return v === "4" ? "    " : "  ";
  }
  function process(){
    errorBox.hidden = true;
    var text = input.value;
    if(!text){ output.value = ""; return; }
    var op = getOp(), result = text;
    if(op === "beautify") result = beautify(text, indentString(), wrapAttr.checked);
    else if(op === "compress") result = compress(text);
    else if(op === "escape") result = escapeHtml(text);
    else if(op === "unescape") result = unescapeHtml(text);
    output.value = result;
    var probs = checkTags(text);
    if(probs.length){
      errorBox.hidden = false;
      errorBox.textContent = "标签检测：" + probs.join("；");
    }
  }
  Array.prototype.forEach.call(opRow.querySelectorAll("label"), function(label){
    label.addEventListener("click", function(){
      Array.prototype.forEach.call(opRow.querySelectorAll("label"), function(l){ l.classList.remove("checked"); });
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
  input.addEventListener("input", process);
  document.getElementById("btnProcess").addEventListener("click", process);
  document.getElementById("btnCopy").addEventListener("click", function(){
    if(!output.value){ showToast("处理结果为空"); return; }
    copyText(output.value, "已复制处理结果");
  });
  document.getElementById("btnClear").addEventListener("click", function(){
    input.value = ""; output.value = ""; errorBox.hidden = true; input.focus();
  });
  var SAMPLE = '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n<title>示例</title>\n<meta charset="UTF-8">\n</head>\n<body>\n<div class="box"><h1>标题</h1><p>这是一段<b>加粗</b>文字。</p><ul><li>项目一</li><li>项目二</li></ul></div>\n</body>\n</html>';
  document.getElementById("btnSample").addEventListener("click", function(){
    input.value = SAMPLE; process(); showToast("已载入示例");
  });
  process();
})();
