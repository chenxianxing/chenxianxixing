/* ============================================================
   JSON 转类型定义 - 工具页逻辑
   推断 JSON 结构并生成 TypeScript / Go / Python / Rust / JSON Schema
   ============================================================ */
(function () {
  "use strict";

  /* ---------- DOM ---------- */
  var input = document.getElementById("jtsInput");
  var output = document.getElementById("jtsOutput");
  var langSel = document.getElementById("jtsLang");
  var rootInput = document.getElementById("jtsRoot");
  var styleRow = document.getElementById("jtsStyleRow");
  var optRow = document.getElementById("jtsOptRow");
  var styleWrap = document.getElementById("jtsStyleWrap");
  var errorBox = document.getElementById("jtsError");
  var extBadge = document.getElementById("jtsExtBadge");
  var btnConvert = document.getElementById("jtsBtnConvert");
  var btnSample = document.getElementById("jtsBtnSample");
  var btnCopy = document.getElementById("jtsBtnCopy");
  var btnDownload = document.getElementById("jtsBtnDownload");

  var toastEl = document.getElementById("toast");
  var toastTimer = null;
  var currentCode = "";
  var currentExt = ".ts";

  /* ---------- 提示 ---------- */
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 2000);
  }

  /* ---------- 单选行辅助 ---------- */
  function bindRadio(row) {
    Array.prototype.forEach.call(row.querySelectorAll("label"), function (label) {
      label.addEventListener("click", function () {
        Array.prototype.forEach.call(row.querySelectorAll("label"), function (l) { l.classList.remove("checked"); });
        label.classList.add("checked");
      });
    });
  }
  function radioVal(row) {
    var c = row.querySelector("input:checked");
    return c ? c.value : "";
  }
  bindRadio(styleRow);
  bindRadio(optRow);

  /* ---------- 复制 / 下载 ---------- */
  function copyText(text, okMsg) {
    if (!text) { showToast("Nothing to copy"); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () { showToast(okMsg || "Copied"); },
        function () { fallbackCopy(text, okMsg); }
      );
    } else {
      fallbackCopy(text, okMsg);
    }
  }
  function fallbackCopy(text, okMsg) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); showToast(okMsg || "Copied"); }
    catch (e) { showToast("Copy failed"); }
    document.body.removeChild(ta);
  }
  function downloadFile(filename, text) {
    var blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 100);
  }

  /* ---------- 键名转换 ---------- */
  var TS_RESERVED = { "break":1,"case":1,"catch":1,"class":1,"const":1,"continue":1,"debugger":1,"default":1,"delete":1,"do":1,"else":1,"export":1,"extends":1,"finally":1,"for":1,"function":1,"if":1,"import":1,"in":1,"instanceof":1,"new":1,"return":1,"super":1,"switch":1,"this":1,"throw":1,"try":1,"typeof":1,"var":1,"void":1,"while":1,"with":1,"yield":1,"enum":1,"await":1,"implements":1,"interface":1,"let":1,"package":1,"private":1,"protected":1,"public":1,"static":1,"type":1,"as":1 };
  function isTSIdent(k) {
    if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k)) return false;
    return !TS_RESERVED[k];
  }
  function pascalCase(s) {
    var parts = String(s).split(/[^A-Za-z0-9]+/).filter(Boolean);
    if (!parts.length) return "Field";
    return parts.map(function (p) { return p.charAt(0).toUpperCase() + p.slice(1); }).join("");
  }
  function snakeCase(s) {
    var out = "";
    var prevLower = false;
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      if (/[A-Z]/.test(c)) {
        if (out && !out.endsWith("_") && prevLower) out += "_";
        out += c.toLowerCase();
        prevLower = false;
      } else if (/[a-z0-9]/.test(c)) {
        out += c;
        prevLower = true;
      } else {
        if (out && !out.endsWith("_")) out += "_";
        prevLower = false;
      }
    }
    out = out.replace(/_+/g, "_").replace(/^_+/, "");
    if (/^[0-9]/.test(out)) out = "_" + out;
    return out || "field";
  }
  function hex4(n) { var s = n.toString(16); while (s.length < 4) s = "0" + s; return s; }
  function hex2(n) { var s = n.toString(16); while (s.length < 2) s = "0" + s; return s; }

  /* ---------- 结构推断 ---------- */
  function normalize(v) {
    if (v === null) return { t: "null" };
    if (typeof v === "boolean") return { t: "boolean" };
    if (typeof v === "number") return { t: "number", int: Number.isInteger(v) };
    if (typeof v === "string") return { t: "string" };
    if (Array.isArray(v)) {
      if (v.length === 0) return { t: "array", of: { t: "any" } };
      var acc = null;
      for (var i = 0; i < v.length; i++) acc = union(acc, normalize(v[i]));
      return { t: "array", of: acc };
    }
    var fields = {};
    Object.keys(v).forEach(function (k) { fields[k] = normalize(v[k]); });
    return { t: "object", fields: fields };
  }

  function sig(d) {
    if (d.t === "object") {
      var keys = Object.keys(d.fields).sort();
      return "o:" + keys.map(function (k) { return k + ">" + sig(d.fields[k]); }).join(",");
    }
    if (d.t === "array") return "a:" + sig(d.of);
    if (d.t === "union") return "u:" + d.items.map(sig).sort().join("|");
    if (d.t === "number") return "n" + (d.int ? 1 : 0);
    return d.t;
  }

  function dedupe(list) {
    var out = [];
    list.forEach(function (it) {
      var s = sig(it);
      var found = false;
      for (var i = 0; i < out.length; i++) { if (sig(out[i]) === s) { found = true; break; } }
      if (!found) out.push(it);
    });
    return out;
  }

  function union(x, y) {
    if (!x) return y;
    if (!y) return x;
    if (x.t === "object" && y.t === "object") {
      var fields = {};
      Object.keys(x.fields).forEach(function (k) { fields[k] = x.fields[k]; });
      Object.keys(y.fields).forEach(function (k) {
        if (fields[k]) fields[k] = union(fields[k], y.fields[k]);
        else fields[k] = y.fields[k];
      });
      return { t: "object", fields: fields };
    }
    if (x.t === "array" && y.t === "array") {
      return { t: "array", of: union(x.of, y.of) };
    }
    if (x.t === y.t && x.t !== "object" && x.t !== "array" && x.t !== "union") {
      if (x.t === "number" && x.int !== y.int) return { t: "number", int: false };
      return x;
    }
    var list = [];
    if (x.t === "union") x.items.forEach(function (it) { list.push(it); });
    else list.push(x);
    if (y.t === "union") y.items.forEach(function (it) { list.push(it); });
    else list.push(y);
    var d = dedupe(list);
    return d.length === 1 ? d[0] : { t: "union", items: d };
  }

  /* ---------- 命名（具名子类型） ---------- */
  function assignNames(d, name, ctx) {
    if (d.t === "object") {
      d._name = name;
      ctx.defs.push(d);
      Object.keys(d.fields).forEach(function (k) { assignNames(d.fields[k], name + pascalCase(k), ctx); });
    } else if (d.t === "array") {
      assignNames(d.of, name + "Item", ctx);
    } else if (d.t === "union") {
      d.items.forEach(function (it, i) { assignNames(it, name + "Alt" + i, ctx); });
    }
  }

  /* ---------- TypeScript ---------- */
  function tsType(d) {
    switch (d.t) {
      case "string": return "string";
      case "number": return "number";
      case "boolean": return "boolean";
      case "null": return "null";
      case "any": return "any";
      case "object": return d._name;
      case "array": {
        var inner = tsType(d.of);
        if (d.of.t === "union" || d.of.t === "object") inner = "(" + inner + ")";
        return inner + "[]";
      }
      case "union": return d.items.map(tsType).join(" | ");
    }
    return "any";
  }
  function tsObject(od, style, optional) {
    var header = (style === "interface" ? "export interface " : "export type ") + od._name + (style === "interface" ? " {" : " = {");
    var lines = Object.keys(od.fields).map(function (k) {
      var key = isTSIdent(k) ? k : JSON.stringify(k);
      return "  " + key + (optional ? "?" : "") + ": " + tsType(od.fields[k]) + ";";
    });
    var close = style === "interface" ? "}" : "};";
    return header + "\n" + lines.join("\n") + "\n" + close;
  }
  function renderTS(d, rootName, style, optional) {
    var ctx = { defs: [] };
    assignNames(d, rootName, ctx);
    var blocks = ctx.defs.map(function (od) { return tsObject(od, style, optional); });
    var rootBlock = "";
    if (d.t !== "object") rootBlock = "export type " + rootName + " = " + tsType(d) + ";";
    return blocks.join("\n\n") + (rootBlock ? "\n\n" + rootBlock : "");
  }

  /* ---------- Go ---------- */
  function goType(d) {
    switch (d.t) {
      case "string": return "string";
      case "number": return d.int ? "int64" : "float64";
      case "boolean": return "bool";
      case "null": return "interface{}";
      case "any": return "interface{}";
      case "object": return d._name;
      case "array": return "[]" + goType(d.of);
      case "union": return "interface{}";
    }
    return "interface{}";
  }
  function goStruct(od, optional) {
    var lines = Object.keys(od.fields).map(function (k) {
      var fieldName = pascalCase(k) || "Field";
      var t = goType(od.fields[k]);
      if (optional) t = "*" + t;
      return "    " + fieldName + " " + t + " `json:\"" + k + "\"`";
    });
    return "type " + od._name + " struct {\n" + lines.join("\n") + "\n}";
  }
  function renderGo(d, rootName, optional) {
    var ctx = { defs: [] };
    assignNames(d, rootName, ctx);
    var structs = ctx.defs.map(function (od) { return goStruct(od, optional); });
    var rootDecl = "";
    if (d.t !== "object") rootDecl = "type " + rootName + " = " + goType(d) + "\n";
    return "package main\n\n" + structs.join("\n\n") + (rootDecl ? "\n" + rootDecl : "");
  }

  /* ---------- Python ---------- */
  function pyType(d) {
    switch (d.t) {
      case "string": return "str";
      case "number": return d.int ? "int" : "float";
      case "boolean": return "bool";
      case "null": return "None";
      case "any": return "Any";
      case "object": return d._name;
      case "array": return "List[" + pyType(d.of) + "]";
      case "union": return "Union[" + d.items.map(pyType).join(", ") + "]";
    }
    return "Any";
  }
  function pyClass(od, optional) {
    var base = "class " + od._name + "(TypedDict" + (optional ? ", total=False" : "") + "):";
    var lines = Object.keys(od.fields).map(function (k) {
      return "    " + snakeCase(k) + ": " + pyType(od.fields[k]);
    });
    return base + "\n" + (lines.length ? lines.join("\n") : "    pass");
  }
  function renderPy(d, rootName, optional) {
    var ctx = { defs: [] };
    assignNames(d, rootName, ctx);
    var classes = ctx.defs.map(function (od) { return pyClass(od, optional); });
    var rootNote = d.t !== "object" ? "\n# Root type:" + pyType(d) + "\n" : "";
    return "from typing import TypedDict, List, Union, Any, Optional\n\n" + classes.join("\n\n") + rootNote;
  }

  /* ---------- Rust ---------- */
  function rustType(d) {
    switch (d.t) {
      case "string": return "String";
      case "number": return d.int ? "i64" : "f64";
      case "boolean": return "bool";
      case "null": return "Value";
      case "any": return "Value";
      case "object": return d._name;
      case "array": return "Vec<" + rustType(d.of) + ">";
      case "union": return "Value";
    }
    return "Value";
  }
  function needsValue(d) {
    if (!d) return false;
    if (d.t === "null" || d.t === "any" || d.t === "union") return true;
    if (d.t === "object") {
      var keys = Object.keys(d.fields);
      for (var i = 0; i < keys.length; i++) if (needsValue(d.fields[keys[i]])) return true;
      return false;
    }
    if (d.t === "array") return needsValue(d.of);
    return false;
  }
  function rustStruct(od, optional) {
    var lines = Object.keys(od.fields).map(function (k) {
      var name = snakeCase(k);
      var t = rustType(od.fields[k]);
      if (optional) t = "Option<" + t + ">";
      return "    pub " + name + ": " + t + ",";
    });
    return "#[derive(Debug, Serialize, Deserialize)]\npub struct " + od._name + " {\n" + lines.join("\n") + "\n}";
  }
  function renderRust(d, rootName, optional) {
    var ctx = { defs: [] };
    assignNames(d, rootName, ctx);
    var usesVal = needsValue(d);
    var head = usesVal
      ? "use serde_json::Value;\nuse serde::Serialize;\nuse serde::Deserialize;\n"
      : "use serde::Serialize;\nuse serde::Deserialize;\n";
    var structs = ctx.defs.map(function (od) { return rustStruct(od, optional); });
    var rootNote = d.t !== "object" ? "\n// Root type:" + rustType(d) + "\n" : "";
    return head + structs.join("\n\n") + rootNote;
  }

  /* ---------- JSON Schema ---------- */
  function schemaOf(d, optional) {
    switch (d.t) {
      case "string": return { type: "string" };
      case "number": return { type: d.int ? "integer" : "number" };
      case "boolean": return { type: "boolean" };
      case "null": return { type: "null" };
      case "any": return {};
      case "object": {
        var props = {};
        var req = [];
        Object.keys(d.fields).forEach(function (k) {
          props[k] = schemaOf(d.fields[k], optional);
          if (!optional) req.push(k);
        });
        var o = { type: "object", properties: props };
        if (req.length) o.required = req;
        return o;
      }
      case "array": return { type: "array", items: schemaOf(d.of, optional) };
      case "union": return { anyOf: d.items.map(function (it) { return schemaOf(it, optional); }) };
    }
    return {};
  }
  function renderSchema(d, rootName, optional) {
    var schema = schemaOf(d, optional);
    if (d.t === "object") {
      schema["$schema"] = "https://json-schema.org/draft/2020-12/schema";
      schema["title"] = rootName;
    }
    return JSON.stringify(schema, null, 2);
  }

  /* ---------- 错误定位 ---------- */
  function lineCol(text, pos) {
    var line = 1, col = 1;
    for (var i = 0; i < pos && i < text.length; i++) {
      if (text[i] === "\n") { line++; col = 1; } else col++;
    }
    return { line: line, col: col };
  }
  function showError(e, text) {
    var msg = e && e.message ? e.message : String(e);
    var m = /position (\d+)/.exec(msg);
    if (m) {
      var lc = lineCol(text, parseInt(m[1], 10));
      msg = "JSON parse failed (line " + lc.line + ", column " + lc.col + "):" + msg;
    } else {
      msg = "JSON parse failed: " + msg;
    }
    errorBox.hidden = false;
    errorBox.textContent = msg;
    output.textContent = "";
    currentCode = "";
  }

  /* ---------- 主转换 ---------- */
  function convert() {
    errorBox.hidden = true;
    var text = input.value;
    var lang = langSel.value;
    var rootName = (rootInput.value || "Root").trim() || "Root";
    var style = radioVal(styleRow) || "interface";
    var optional = radioVal(optRow) === "opt";

    if (!text.trim()) { output.textContent = ""; currentCode = ""; return; }

    var data;
    try { data = JSON.parse(text); }
    catch (err) { showError(err, text); return; }

    var desc = normalize(data);
    var code = "", ext = ".ts";
    try {
      if (lang === "ts") { code = renderTS(desc, rootName, style, optional); ext = ".ts"; }
      else if (lang === "go") { code = renderGo(desc, rootName, optional); ext = ".go"; }
      else if (lang === "py") { code = renderPy(desc, rootName, optional); ext = ".py"; }
      else if (lang === "rust") { code = renderRust(desc, rootName, optional); ext = ".rs"; }
      else { code = renderSchema(desc, rootName, optional); ext = ".json"; }
    } catch (err) { showError(err, text); return; }

    output.textContent = code;
    extBadge.textContent = ext;
    currentCode = code;
    currentExt = ext;
  }

  /* ---------- 示例 ---------- */
  var SAMPLE = '{\n  "name": "Alice",\n  "age": 30,\n  "active": true,\n  "tags": ["vip", "new"],\n  "scores": [98, 87, 95],\n  "address": {\n    "city": "Beijing",\n    "zip": "100000"\n  },\n  "orders": [\n    { "id": 1, "total": 19.9 },\n    { "id": 2, "total": 5, "note": "gift" }\n  ],\n  "mixed": [1, "two", true],\n  "empty": [],\n  "avatar": null,\n  "user-name": "a.b"\n}';

  /* ---------- 事件 ---------- */
  btnConvert.addEventListener("click", function () { convert(); });
  btnSample.addEventListener("click", function () {
    input.value = SAMPLE;
    convert();
    showToast("Sample loaded");
  });
  btnCopy.addEventListener("click", function () {
    if (!currentCode) { showToast("Please generate a result first"); return; }
    copyText(currentCode, "Result copied");
  });
  btnDownload.addEventListener("click", function () {
    if (!currentCode) { showToast("Please generate a result first"); return; }
    downloadFile("output" + currentExt, currentCode);
    showToast("Downloaded" + currentExt);
  });

  langSel.addEventListener("change", function () {
    var isTs = langSel.value === "ts";
    styleWrap.classList.toggle("disabled", !isTs);
    convert();
  });
  [rootInput, styleRow, optRow].forEach(function (el) {
    el.addEventListener("change", convert);
  });
  input.addEventListener("input", convert);

  /* ---------- 初始化 ---------- */
  convert();
})();
