/* ============================================================
   在线工具大全 - 多语言运行时（仅英文页加载）
   ------------------------------------------------------------
   en.js 定义 window.I18N_EN（中文 → 英文 字典）。
   构建脚本已把页面与 JS 静态翻译，本脚本是兜底保险：
     1. 加载后 walk 一次 DOM，翻译漏网的中文文本/属性
     2. MutationObserver 监听 JS 动态插入的中文并实时翻译
   中文页不引用本脚本，零影响。
   ============================================================ */
(function () {
  "use strict";
  if (document.documentElement.lang !== "en" || !window.I18N_EN) return;

  var D = window.I18N_EN;
  var CJK = /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/;
  var ATTRS = ["placeholder", "title", "aria-label", "alt", "data-name", "data-desc", "data-tags"];
  /* 代码/表单域内容不翻译：可能是示例代码或用户数据 */
  var SKIP = { TEXTAREA: 1, INPUT: 1, SCRIPT: 1, STYLE: 1, TEMPLATE: 1, PRE: 1, CODE: 1, KBD: 1, SAMP: 1 };

  function lookup(s) {
    var t = s.trim();
    if (!t || !Object.prototype.hasOwnProperty.call(D, t)) return null;
    var v = D[t];
    /* 译文仍含中文则放弃（防止坏翻译循环） */
    return CJK.test(v) ? null : v;
  }

  function trText(s) {
    var v = lookup(s);
    if (v === null) return s;
    var lead = s.length - s.replace(/^\s+/, "").length;
    var tail = s.length - s.replace(/\s+$/, "").length;
    return s.slice(0, lead) + v + (tail ? s.slice(s.length - tail) : "");
  }

  function trAttrs(el) {
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i];
      var v = el.getAttribute && el.getAttribute(a);
      if (v && CJK.test(v)) {
        var nv = trText(v);
        if (nv !== v) el.setAttribute(a, nv);
      }
    }
  }

  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) {
      if (CJK.test(root.data)) {
        var nt = trText(root.data);
        if (nt !== root.data) root.data = nt;
      }
      return;
    }
    if (root.nodeType !== 1) return;
    if (SKIP[root.tagName]) return;
    trAttrs(root);
    var kids = root.childNodes;
    for (var i = 0; i < kids.length; i++) walk(kids[i]);
  }

  function onMutations(records) {
    for (var i = 0; i < records.length; i++) {
      var r = records[i];
      if (r.type === "attributes") { trAttrs(r.target); continue; }
      if (r.type === "characterData") {
        if (CJK.test(r.target.data)) {
          var nt = trText(r.target.data);
          if (nt !== r.target.data) r.target.data = nt;
        }
        continue;
      }
      for (var j = 0; j < r.addedNodes.length; j++) walk(r.addedNodes[j]);
    }
  }

  if (document.body) {
    walk(document.body);
    var obs = new MutationObserver(onMutations);
    obs.observe(document.body, {
      childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: ATTRS
    });
  }
})();
