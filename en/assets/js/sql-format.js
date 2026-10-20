/* ============================================================
   SQL格式化 - 工具页逻辑
   美化（关键字大写 / 子句换行 / AND-OR 缩进）+ 压缩
   ============================================================ */
(function () {
  "use strict";

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
    } else { fallbackCopy(text); done(); }
  }
  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch (e) { /* ignore */ }
    document.body.removeChild(ta);
  }
  function download(filename, text, mime) {
    var blob = new Blob([text], { type: (mime || "text/plain") + ";charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /* ---------- 关键字集合 ---------- */
  var KEYWORDS = {};
  ("SELECT FROM WHERE AND OR NOT IN IS NULL LIKE BETWEEN GROUP BY ORDER HAVING LIMIT OFFSET " +
   "INSERT INTO VALUES UPDATE SET DELETE JOIN INNER LEFT RIGHT FULL OUTER CROSS ON UNION ALL AS " +
   "DISTINCT CASE WHEN THEN ELSE END CREATE TABLE DROP ALTER ADD COLUMN INDEX PRIMARY KEY FOREIGN " +
   "REFERENCES DEFAULT ASC DESC EXISTS USING INTERSECT EXCEPT WITH HAVING").split(/\s+/).forEach(function (k) {
    KEYWORDS[k] = true;
  });

  function isKeyword(w) { return KEYWORDS[w] === true; }

  /* ---------- 词法分析 ---------- */
  function tokenize(sql) {
    var tokens = [];
    var i = 0, n = sql.length;
    while (i < n) {
      var c = sql[i];
      if (/\s/.test(c)) { i++; continue; }
      if (c === "-" && sql[i + 1] === "-") {
        var j = i; while (j < n && sql[j] !== "\n") j++;
        tokens.push({ t: "comment", v: sql.slice(i, j), line: true }); i = j; continue;
      }
      if (c === "/" && sql[i + 1] === "*") {
        var j = i + 2; while (j < n && !(sql[j] === "*" && sql[j + 1] === "/")) j++;
        j = Math.min(n, j + 2);
        tokens.push({ t: "comment", v: sql.slice(i, j), line: false }); i = j; continue;
      }
      if (c === "'") {
        var j = i + 1;
        while (j < n) {
          if (sql[j] === "'") { if (sql[j + 1] === "'") { j += 2; continue; } j++; break; }
          j++;
        }
        tokens.push({ t: "string", v: sql.slice(i, j) }); i = j; continue;
      }
      if (c === '"') {
        var j = i + 1; while (j < n && sql[j] !== '"') j++;
        j = Math.min(n, j + 1);
        tokens.push({ t: "string", v: sql.slice(i, j) }); i = j; continue;
      }
      if (c === "`") {
        var j = i + 1; while (j < n && sql[j] !== "`") j++;
        j = Math.min(n, j + 1);
        tokens.push({ t: "word", v: sql.slice(i, j) }); i = j; continue;
      }
      if (/[A-Za-z0-9_$@]/.test(c)) {
        var j = i; while (j < n && /[A-Za-z0-9_$@.]/.test(sql[j])) j++;
        tokens.push({ t: "word", v: sql.slice(i, j) }); i = j; continue;
      }
      tokens.push({ t: "punct", v: c }); i++;
    }
    return tokens;
  }

  /* ---------- 子句识别（带前瞻） ---------- */
  function clauseAt(tokens, i) {
    var up = tokens[i].v.toUpperCase();
    var n1 = tokens[i + 1] ? tokens[i + 1].v.toUpperCase() : "";
    var n2 = tokens[i + 2] ? tokens[i + 2].v.toUpperCase() : "";
    if (up === "GROUP" && n1 === "BY") return { phrase: "GROUP BY", len: 2 };
    if (up === "ORDER" && n1 === "BY") return { phrase: "ORDER BY", len: 2 };
    if (up === "INSERT" && n1 === "INTO") return { phrase: "INSERT INTO", len: 2 };
    if (up === "DELETE" && n1 === "FROM") return { phrase: "DELETE FROM", len: 2 };
    if (up === "UNION" && n1 === "ALL") return { phrase: "UNION ALL", len: 2 };
    if ((up === "LEFT" || up === "RIGHT" || up === "FULL") && n1 === "OUTER" && n2 === "JOIN")
      return { phrase: up + " OUTER JOIN", len: 3 };
    if ((up === "LEFT" || up === "RIGHT" || up === "INNER" || up === "FULL" || up === "CROSS") && n1 === "JOIN")
      return { phrase: up + " JOIN", len: 2 };
    if (up === "SELECT" || up === "FROM" || up === "WHERE" || up === "HAVING" || up === "LIMIT" ||
        up === "OFFSET" || up === "UPDATE" || up === "SET" || up === "VALUES" || up === "INSERT" ||
        up === "DELETE" || up === "JOIN" || up === "UNION")
      return { phrase: up, len: 1 };
    return null;
  }

  /* ---------- 美化 ---------- */
  function beautify(tokens, indentUnit, breakComma, upperKw) {
    var out = [];
    var level = 0;
    var paren = 0;
    var spaceBefore = false;
    var atLineStart = true;

    function putIndent() { for (var k = 0; k < level; k++) out.push(indentUnit); }
    function newline() { out.push("\n"); atLineStart = true; spaceBefore = false; }
    function emit(s) {
      if (atLineStart) { putIndent(); atLineStart = false; spaceBefore = false; }
      if (spaceBefore) out.push(" ");
      out.push(s);
      spaceBefore = true;
    }

    var i = 0, n = tokens.length;
    while (i < n) {
      var tok = tokens[i];
      if (tok.t === "comment") {
        if (tok.line) {
          if (out.length && out[out.length - 1] !== "\n") newline();
          emit(tok.v);
          newline();
        } else {
          emit(tok.v);
        }
        i++; continue;
      }
      if (tok.t === "string") { emit(tok.v); i++; continue; }
      if (tok.t === "punct") {
        var p = tok.v;
        if (p === "(") { emit("("); spaceBefore = false; paren++; }
        else if (p === ")") { spaceBefore = false; emit(")"); paren--; }
        else if (p === ",") {
          spaceBefore = false; emit(",");
          if (paren === 0 && breakComma) newline();
        } else if (p === ";") {
          spaceBefore = false; emit(";"); newline();
        } else if (p === ".") {
          spaceBefore = false; emit(".");
        } else {
          emit(p);
        }
        i++; continue;
      }
      // word
      var up = tok.v.toUpperCase();
      var cl = (paren === 0) ? clauseAt(tokens, i) : null;
      if (cl) {
        if (out.length) newline();
        level = 0;
        emit(cl.phrase);
        level = 1;
        i += cl.len; continue;
      }
      if (paren === 0 && (up === "AND" || up === "OR")) {
        newline();
        emit(upperKw ? up : tok.v);
        i++; continue;
      }
      var disp = (upperKw && isKeyword(up)) ? up : tok.v;
      emit(disp);
      i++;
    }
    return out.join("").replace(/\n[ \t]+\n/g, "\n").replace(/\n+$/, "");
  }

  /* ---------- 压缩 ---------- */
  function compress(tokens, upperKw) {
    var parts = [];
    tokens.forEach(function (tok) {
      if (tok.t === "comment") return; // 去除注释
      if (tok.t === "string") { parts.push(tok.v); return; }
      if (tok.t === "punct") { parts.push(tok.v); return; }
      var up = tok.v.toUpperCase();
      parts.push((upperKw && isKeyword(up)) ? up : tok.v);
    });
    var s = parts.join(" ");
    s = s.replace(/\s*([,;)])/g, "$1");
    s = s.replace(/\(\s*/g, "(");
    s = s.replace(/\s+\)/g, ")");
    s = s.replace(/\s*\.\s*/g, ".");
    s = s.replace(/\s+/g, " ");
    return s.trim();
  }

  /* ---------- 驱动 ---------- */
  var sqlInput = document.getElementById("sqlInput");
  var sqlOutput = document.getElementById("sqlOutput");
  var modeRow = document.getElementById("modeRow");
  var breakComma = document.getElementById("breakComma");
  var upperKw = document.getElementById("upperKw");
  var indentSize = document.getElementById("indentSize");

  function getMode() {
    var c = modeRow.querySelector("input:checked");
    return c ? c.value : "pretty";
  }
  function syncRadioStyle() {
    Array.prototype.forEach.call(modeRow.querySelectorAll("label"), function (l) {
      l.classList.toggle("checked", !!l.querySelector("input:checked"));
    });
  }
  Array.prototype.forEach.call(modeRow.querySelectorAll("label"), function (l) {
    l.addEventListener("click", function () { syncRadioStyle(); format(); });
  });

  function format() {
    var text = sqlInput.value;
    if (!text.trim()) { sqlOutput.value = ""; return; }
    var tokens = tokenize(text);
    if (getMode() === "compact") {
      sqlOutput.value = compress(tokens, upperKw.checked);
    } else {
      var unit = (indentSize.value === "2") ? "  " : "    ";
      sqlOutput.value = beautify(tokens, unit, breakComma.checked, upperKw.checked);
    }
  }

  document.getElementById("btnFormat").addEventListener("click", format);
  document.getElementById("btnCopy").addEventListener("click", function () {
    if (!sqlOutput.value) { showToast("The result is empty"); return; }
    copyText(sqlOutput.value, "SQL copied");
  });
  document.getElementById("btnDownload").addEventListener("click", function () {
    if (!sqlOutput.value) { showToast("The result is empty"); return; }
    download("formatted.sql", sqlOutput.value, "text/plain");
    showToast("Downloaded formatted.sql");
  });
  document.getElementById("btnExample").addEventListener("click", function () {
    sqlInput.value = "select u.id,u.name,count(o.id) as cnt from user u left join orders o on u.id=o.user_id where u.age>18 and u.status=1 group by u.id,u.name having count(o.id)>0 order by cnt desc limit 10;";
    format();
  });
  document.getElementById("btnClear").addEventListener("click", function () {
    sqlInput.value = ""; sqlOutput.value = "";
  });

  [breakComma, upperKw, indentSize].forEach(function (el) {
    el.addEventListener("change", format);
  });
  sqlInput.addEventListener("input", format);

  if (!sqlInput.value) {
    sqlInput.value = "select id,name,age from user where status=1 and age between 18 and 30 order by id desc limit 20;";
    format();
  }
})();
