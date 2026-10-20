/* ============================================================
   TOML Lite - 轻量 TOML 解析 / 序列化（纯 JS，无依赖）
   暴露 window.TOMLLite = { parse, stringify }
   支持：注释、bare/quoted 键、basic/literal 字符串、多行字符串、
         整数（_ 分隔、0x/0o/0b）、浮点（inf/nan）、布尔、数组
         （多行/嵌套/尾逗号）、行内表、[table] 与 [[array of tables]]、
         偏移日期时间（保留为字符串）；解析错误带行号。
   ============================================================ */
(function () {
  "use strict";

  function err(msg, lineNo) {
    var e = new Error(lineNo
      ? t("TOML 解析错误（第 {n} 行）：{msg}", { n: lineNo, msg: msg })
      : t("TOML 解析错误：{msg}", { msg: msg }));
    e.name = "TOMLLiteError";
    e.line = lineNo || 0;
    return e;
  }

  var ESCAPES = { b: "\b", t: "\t", n: "\n", f: "\f", r: "\r", '"': '"', "\\": "\\" };

  function parse(input) {
    if (typeof input !== "string") {
      throw err(t("输入必须是字符串"));
    }
    var pos = 0;
    var line = 1;
    var len = input.length;
    var root = {};
    var current = root;

    function cur() { return input[pos]; }
    function peek(k) { return input.substr(pos, k); }

    function skipInlineWs() {
      while (pos < len && (cur() === " " || cur() === "\t")) pos++;
    }

    function skipComment() {
      if (cur() === "#") {
        while (pos < len && cur() !== "\n" && cur() !== "\r") pos++;
      }
    }

    function skipBlankAndComments() {
      while (pos < len) {
        var c = cur();
        if (c === " " || c === "\t") { pos++; continue; }
        if (c === "\r") { pos++; if (cur() === "\n") pos++; line++; continue; }
        if (c === "\n") { pos++; line++; continue; }
        if (c === "#") { skipComment(); continue; }
        break;
      }
    }

    function skipWsAndNewlines() {
      while (pos < len) {
        var c = cur();
        if (c === " " || c === "\t") { pos++; continue; }
        if (c === "\r") { pos++; if (cur() === "\n") pos++; line++; continue; }
        if (c === "\n") { pos++; line++; continue; }
        break;
      }
    }

    function advanceNewline() {
      if (cur() === "\r") { pos++; if (cur() === "\n") pos++; line++; return; }
      if (cur() === "\n") { pos++; line++; return; }
      throw err(t("行尾存在多余内容"), line);
    }

    /* ---------- 键路径 ---------- */
    function parseKeyPath() {
      var path = [];
      while (true) {
        skipInlineWs();
        var c = cur();
        if (c === '"') { path.push(parseBasicString()); }
        else if (c === "'") { path.push(parseLiteralString()); }
        else {
          var m = /^[A-Za-z0-9_-]+/.exec(input.slice(pos));
          if (!m) throw err(t("无效的键名"), line);
          pos += m[0].length;
          path.push(m[0]);
        }
        skipInlineWs();
        if (cur() === ".") { pos++; continue; }
        break;
      }
      if (!path.length) throw err(t("无效的键名"), line);
      return path;
    }

    /* ---------- 表头 ---------- */
    var explicitTables = {};

    function openTable(path, startLine) {
      var obj = root;
      for (var i = 0; i < path.length - 1; i++) {
        var seg = path[i];
        var next;
        if (!Object.prototype.hasOwnProperty.call(obj, seg)) { next = {}; obj[seg] = next; }
        else if (Array.isArray(obj[seg])) { next = obj[seg][obj[seg].length - 1]; }
        else if (typeof obj[seg] !== "object" || obj[seg] === null) {
          throw err(t("键路径冲突：「{p}」已被定义为非表值", { p: path.slice(0, i + 1).join(".") }), startLine);
        }
        else { next = obj[seg]; }
        obj = next;
        if (typeof obj !== "object" || obj === null) {
          throw err(t("键路径冲突：「{p}」已被定义为非表值", { p: path.slice(0, i + 1).join(".") }), startLine);
        }
      }
      var last = path[path.length - 1];
      var joined = path.join(".");
      if (Object.prototype.hasOwnProperty.call(explicitTables, joined)) {
        throw err(t("表「{p}」重复定义", { p: joined }), startLine);
      }
      explicitTables[joined] = true;
      if (!Object.prototype.hasOwnProperty.call(obj, last)) obj[last] = {};
      else if (typeof obj[last] !== "object" || obj[last] === null || Array.isArray(obj[last])) {
        throw err(t("表「{p}」重复定义或与已有值冲突", { p: joined }), startLine);
      }
      return obj[last];
    }

    function openArrayTable(path, startLine) {
      var obj = root;
      for (var i = 0; i < path.length - 1; i++) {
        var seg = path[i];
        var next;
        if (!Object.prototype.hasOwnProperty.call(obj, seg)) { next = {}; obj[seg] = next; }
        else if (Array.isArray(obj[seg])) { next = obj[seg][obj[seg].length - 1]; }
        else if (typeof obj[seg] !== "object" || obj[seg] === null) {
          throw err(t("键路径冲突：「{p}」已被定义为非表值", { p: path.slice(0, i + 1).join(".") }), startLine);
        }
        else { next = obj[seg]; }
        obj = next;
        if (typeof obj !== "object" || obj === null) {
          throw err(t("键路径冲突：「{p}」已被定义为非表值", { p: path.slice(0, i + 1).join(".") }), startLine);
        }
      }
      var last = path[path.length - 1];
      var joined = path.join(".");
      if (Object.prototype.hasOwnProperty.call(explicitTables, joined)) {
        throw err(t("「{p}」已被定义为表，不能重复定义为数组表", { p: joined }), startLine);
      }
      if (!Object.prototype.hasOwnProperty.call(obj, last)) obj[last] = [];
      else if (!Array.isArray(obj[last])) {
        throw err(t("「{p}」已被定义为非数组表", { p: joined }), startLine);
      }
      var item = {};
      obj[last].push(item);
      return item;
    }

    function assignPath(table, keyPath, val, startLine) {
      var obj = table;
      for (var i = 0; i < keyPath.length - 1; i++) {
        var seg = keyPath[i];
        if (!Object.prototype.hasOwnProperty.call(obj, seg)) obj[seg] = {};
        else if (typeof obj[seg] !== "object" || obj[seg] === null || Array.isArray(obj[seg])) {
          throw err(t("键路径冲突：「{p}」已被定义为非表值", { p: keyPath.slice(0, i + 1).join(".") }), startLine);
        }
        obj = obj[seg];
      }
      var last = keyPath[keyPath.length - 1];
      if (Object.prototype.hasOwnProperty.call(obj, last)) {
        throw err(t("键「{p}」重复定义", { p: keyPath.join(".") }), startLine);
      }
      obj[last] = val;
    }

    /* ---------- 字符串 ---------- */
    function parseBasicString() {
      pos++;
      var out = "";
      while (true) {
        if (pos >= len) throw err(t("字符串缺少结束引号"), line);
        var c = cur();
        if (c === '"') { pos++; return out; }
        if (c === "\n" || c === "\r") throw err(t("单行字符串不能换行"), line);
        if (c === "\\") {
          pos++;
          var e = cur();
          if (e === "u" || e === "U") {
            var n = e === "u" ? 4 : 8;
            var hex = input.substr(pos + 1, n);
            if (!new RegExp("^[0-9a-fA-F]{" + n + "}$").test(hex)) {
              throw err(t("无效的 Unicode 转义序列"), line);
            }
            out += String.fromCodePoint(parseInt(hex, 16));
            pos += 1 + n;
          } else if (Object.prototype.hasOwnProperty.call(ESCAPES, e)) {
            out += ESCAPES[e];
            pos++;
          } else {
            throw err(t("无效的转义字符：{c}", { c: "\\" + e }), line);
          }
          continue;
        }
        out += c;
        pos++;
      }
    }

    function parseLiteralString() {
      pos++;
      var out = "";
      while (true) {
        if (pos >= len) throw err(t("字符串缺少结束引号"), line);
        var c = cur();
        if (c === "'") { pos++; return out; }
        if (c === "\n" || c === "\r") throw err(t("单行字符串不能换行"), line);
        out += c;
        pos++;
      }
    }

    function parseMultilineBasic() {
      pos += 3;
      if (cur() === "\r") { pos++; if (cur() === "\n") pos++; line++; }
      else if (cur() === "\n") { pos++; line++; }
      var out = "";
      while (true) {
        if (pos >= len) throw err(t("多行字符串缺少结束引号"), line);
        if (peek(3) === '"""') { pos += 3; return out; }
        var c = cur();
        if (c === "\r") { pos++; if (cur() === "\n") pos++; out += "\n"; line++; continue; }
        if (c === "\n") { pos++; out += "\n"; line++; continue; }
        if (c === "\\") {
          pos++;
          if (cur() === "\r") { pos++; if (cur() === "\n") pos++; line++; skipWsAndNewlines(); continue; }
          if (cur() === "\n") { pos++; line++; skipWsAndNewlines(); continue; }
          var e = cur();
          if (e === "u" || e === "U") {
            var n = e === "u" ? 4 : 8;
            var hex = input.substr(pos + 1, n);
            if (!new RegExp("^[0-9a-fA-F]{" + n + "}$").test(hex)) {
              throw err(t("无效的 Unicode 转义序列"), line);
            }
            out += String.fromCodePoint(parseInt(hex, 16));
            pos += 1 + n;
          } else if (Object.prototype.hasOwnProperty.call(ESCAPES, e)) {
            out += ESCAPES[e];
            pos++;
          } else {
            throw err(t("无效的转义字符：{c}", { c: "\\" + e }), line);
          }
          continue;
        }
        out += c;
        pos++;
      }
    }

    function parseMultilineLiteral() {
      pos += 3;
      if (cur() === "\r") { pos++; if (cur() === "\n") pos++; line++; }
      else if (cur() === "\n") { pos++; line++; }
      var out = "";
      while (true) {
        if (pos >= len) throw err(t("多行字符串缺少结束引号"), line);
        if (peek(3) === "'''") { pos += 3; return out; }
        var c = cur();
        if (c === "\r") { pos++; if (cur() === "\n") pos++; out += "\n"; line++; continue; }
        if (c === "\n") { pos++; out += "\n"; line++; continue; }
        out += c;
        pos++;
      }
    }

    /* ---------- 数组与行内表 ---------- */
    function parseArray() {
      pos++;
      var arr = [];
      while (true) {
        skipBlankAndComments();
        if (pos >= len) throw err(t("数组缺少 ]"), line);
        if (cur() === "]") { pos++; return arr; }
        arr.push(parseValue());
        skipBlankAndComments();
        if (pos >= len) throw err(t("数组缺少 ]"), line);
        if (cur() === ",") { pos++; continue; }
        if (cur() === "]") { pos++; return arr; }
        throw err(t("数组元素后应为 , 或 ]"), line);
      }
    }

    function parseInlineTable() {
      pos++;
      var obj = {};
      skipInlineWs();
      if (cur() === "}") { pos++; return obj; }
      while (true) {
        skipInlineWs();
        var keyPath = parseKeyPath();
        skipInlineWs();
        if (cur() !== "=") throw err(t("键后缺少 = 号"), line);
        pos++;
        var val = parseValue();
        assignPath(obj, keyPath, val, line);
        skipInlineWs();
        var c = cur();
        if (c === ",") { pos++; continue; }
        if (c === "}") { pos++; return obj; }
        throw err(t("行内表元素后应为 , 或 }"), line);
      }
    }

    /* ---------- 标量 ---------- */
    function classifyScalar(raw, lineNo) {
      var s = raw;
      var low = s.toLowerCase();
      if (s === "true") return true;
      if (s === "false") return false;
      if (/^\d{4}-\d{2}-\d{2}([Tt ].*)?$/.test(s)) return s;
      if (/^\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(s)) return s;
      if (low === "inf" || low === "+inf") return Infinity;
      if (low === "-inf") return -Infinity;
      if (low === "nan" || low === "+nan" || low === "-nan") return NaN;
      var mHex = /^([+-]?)0x([0-9a-fA-F][0-9a-fA-F_]*)$/.exec(s);
      if (mHex) return parseInt(mHex[1] + mHex[2].replace(/_/g, ""), 16);
      var mOct = /^([+-]?)0o([0-7][0-7_]*)$/.exec(s);
      if (mOct) return parseInt(mOct[1] + mOct[2].replace(/_/g, ""), 8);
      var mBin = /^([+-]?)0b([01][01_]*)$/.exec(s);
      if (mBin) return parseInt(mBin[1] + mBin[2].replace(/_/g, ""), 2);
      if (/^[+-]?\d[\d_]*$/.test(s)) return parseInt(s.replace(/_/g, ""), 10);
      if (/^[+-]?(\d[\d_]*)?\.\d[\d_]*([eE][+-]?\d+)?$/.test(s) ||
          /^[+-]?\d[\d_]*\.(\d[\d_]*)?[eE][+-]?\d+$/.test(s) ||
          /^[+-]?\d[\d_]*[eE][+-]?\d+$/.test(s)) {
        return parseFloat(s.replace(/_/g, ""));
      }
      throw err(t("无法识别的值「{v}」", { v: s }), lineNo);
    }

    function parseNumberOrDate() {
      var start = pos;
      var startLine = line;
      while (pos < len) {
        var c = cur();
        if (c === "," || c === "]" || c === "}" || c === "\n" || c === "\r" || c === "#") break;
        pos++;
      }
      var raw = input.slice(start, pos).trim();
      if (!raw) throw err(t("无效的值"), startLine);
      return classifyScalar(raw, startLine);
    }

    function parseValue() {
      skipInlineWs();
      var c = cur();
      if (c === '"') {
        if (peek(3) === '"""') return parseMultilineBasic();
        return parseBasicString();
      }
      if (c === "'") {
        if (peek(3) === "'''") return parseMultilineLiteral();
        return parseLiteralString();
      }
      if (c === "[") return parseArray();
      if (c === "{") return parseInlineTable();
      if (input.substr(pos, 4) === "true") { pos += 4; return true; }
      if (input.substr(pos, 5) === "false") { pos += 5; return false; }
      return parseNumberOrDate();
    }

    /* ---------- 主循环 ---------- */
    while (true) {
      skipBlankAndComments();
      if (pos >= len) break;
      var startLine = line;
      if (cur() === "[") {
        if (peek(2) === "[[") {
          pos += 2;
          var aPath = parseKeyPath();
          skipInlineWs();
          if (peek(2) !== "]]") throw err(t("数组表头缺少 ]]"), line);
          pos += 2;
          current = openArrayTable(aPath, startLine);
        } else {
          pos++;
          var tPath = parseKeyPath();
          skipInlineWs();
          if (cur() !== "]") throw err(t("表头缺少 ]"), line);
          pos++;
          current = openTable(tPath, startLine);
        }
        skipInlineWs();
        skipComment();
        if (pos < len) advanceNewline();
        continue;
      }
      var keyPath = parseKeyPath();
      skipInlineWs();
      if (cur() !== "=") throw err(t("键后缺少 = 号"), line);
      pos++;
      var val = parseValue();
      assignPath(current, keyPath, val, startLine);
      skipInlineWs();
      skipComment();
      if (pos < len) advanceNewline();
    }
    return root;
  }

  /* ============================================================
     序列化：对象 → TOML
     ============================================================ */

  function isPlainObject(v) {
    return Object.prototype.toString.call(v) === "[object Object]";
  }

  function quoteBasic(s) {
    var out = '"';
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      if (c === "\\") out += "\\\\";
      else if (c === '"') out += '\\"';
      else if (c === "\n") out += "\\n";
      else if (c === "\r") out += "\\r";
      else if (c === "\t") out += "\\t";
      else if (c === "\b") out += "\\b";
      else if (c === "\f") out += "\\f";
      else if (c < " ") out += "\\u" + ("0000" + c.charCodeAt(0).toString(16)).slice(-4);
      else out += c;
    }
    return out + '"';
  }

  function fmtKey(k) {
    return /^[A-Za-z0-9_-]+$/.test(k) ? k : quoteBasic(k);
  }

  function fmtValue(v, keyPath) {
    if (v === null || v === undefined) {
      throw new Error(t("TOML 不支持 null 值（键：{k}），请删除该键或改为空字符串", { k: keyPath }));
    }
    if (typeof v === "string") return quoteBasic(v);
    if (typeof v === "boolean") return v ? "true" : "false";
    if (typeof v === "number") {
      if (isNaN(v)) return "nan";
      if (v === Infinity) return "inf";
      if (v === -Infinity) return "-inf";
      return String(v);
    }
    if (v instanceof Date) return quoteBasic(v.toISOString());
    if (Array.isArray(v)) {
      return "[" + v.map(function (item) { return fmtValue(item, keyPath); }).join(", ") + "]";
    }
    if (isPlainObject(v)) {
      var parts = [];
      Object.keys(v).forEach(function (k) {
        parts.push(fmtKey(k) + " = " + fmtValue(v[k], keyPath ? keyPath + "." + k : k));
      });
      return "{ " + parts.join(", ") + " }";
    }
    return quoteBasic(String(v));
  }

  function writeTable(obj, path, lines) {
    var tables = [];
    var arrayTables = [];
    Object.keys(obj).forEach(function (k) {
      var v = obj[k];
      if (isPlainObject(v)) { tables.push(k); return; }
      if (Array.isArray(v) && v.length && v.every(isPlainObject)) { arrayTables.push(k); return; }
      lines.push(fmtKey(k) + " = " + fmtValue(v, path.concat(k).join(".")));
    });
    tables.forEach(function (k) {
      var p = path.concat(k);
      if (lines.length && lines[lines.length - 1] !== "") lines.push("");
      lines.push("[" + p.map(fmtKey).join(".") + "]");
      writeTable(obj[k], p, lines);
    });
    arrayTables.forEach(function (k) {
      var p = path.concat(k);
      obj[k].forEach(function (item) {
        if (lines.length && lines[lines.length - 1] !== "") lines.push("");
        lines.push("[[" + p.map(fmtKey).join(".") + "]]");
        writeTable(item, p, lines);
      });
    });
  }

  function stringify(obj) {
    if (!isPlainObject(obj)) {
      throw new Error(t("TOML 序列化要求顶层为对象，当前数据为数组或标量"));
    }
    var lines = [];
    writeTable(obj, [], lines);
    return lines.join("\n") + "\n";
  }

  window.TOMLLite = { parse: parse, stringify: stringify };
})();
