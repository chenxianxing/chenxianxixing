/* ============================================================
  SQL Dump生成器 - 工具页逻辑
   JSON/CSV → INSERT INTO（多值批量）
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

  var tblName = document.getElementById("tblName");
  var dataFmt = document.getElementById("dataFmt");
  var rowsPer = document.getElementById("rowsPer");
  var quoteCols = document.getElementById("quoteCols");
  var nullAsNull = document.getElementById("nullAsNull");
  var dataInput = document.getElementById("dataInput");
  var colList = document.getElementById("colList");
  var dumpOut = document.getElementById("dumpOut");
  var dumpErr = document.getElementById("dumpErr");
  var dumpStat = document.getElementById("dumpStat");

  var colChecked = {}; // 记忆勾选状态

  /* ---------- CSV/TSV 单行解析（含引号） ---------- */
  function splitCsvLine(line, delim) {
    var out = [], field = "", inQ = false, i = 0, n = line.length;
    while (i < n) {
      var c = line[i];
      if (inQ) {
        if (c === '"') {
          if (i + 1 < n && line[i + 1] === '"') { field += '"'; i += 2; continue; }
          inQ = false; i++; continue;
        }
        field += c; i++;
      } else {
        if (c === '"') { inQ = true; i++; }
        else if (c === delim) { out.push(field); field = ""; i++; }
        else { field += c; i++; }
      }
    }
    out.push(field);
    return out;
  }

  function parseData() {
    var text = dataInput.value.trim();
    if (!text) return { rows: [], cols: [] };
    if (dataFmt.value === "json") {
      var d = JSON.parse(text);
      if (!Array.isArray(d)) throw new Error("The JSON root node must be an array (array of objects).");
      var cols = [];
      d.forEach(function (o) {
        if (o && typeof o === "object" && !Array.isArray(o)) {
          Object.keys(o).forEach(function (k) { if (cols.indexOf(k) === -1) cols.push(k); });
        }
      });
      return { rows: d, cols: cols };
    }
    // CSV / TSV
    var lines = text.split(/\r?\n/).filter(function (l) { return l.trim() !== ""; });
    if (!lines.length) return { rows: [], cols: [] };
    var delim = lines[0].indexOf("\t") > -1 ? "\t" : ",";
    var header = splitCsvLine(lines[0], delim);
    var rows = [];
    for (var i = 1; i < lines.length; i++) {
      var cells = splitCsvLine(lines[i], delim);
      var o = {};
      header.forEach(function (h, idx) { o[h] = cells[idx] !== undefined ? cells[idx] : ""; });
      rows.push(o);
    }
    return { rows: rows, cols: header };
  }

  /* ---------- 列勾选渲染 ---------- */
  function updateColumns() {
    var parsed;
    try { parsed = parseData(); }
    catch (e) { colList.innerHTML = '<span class="badge">Columns appear after parsing the data</span>'; return; }
    if (!parsed.cols.length) { colList.innerHTML = '<span class="badge">No columns</span>'; return; }
    colList.innerHTML = "";
    parsed.cols.forEach(function (c) {
      if (!(c in colChecked)) colChecked[c] = true;
      var label = document.createElement("label");
      var cb = document.createElement("input");
      cb.type = "checkbox"; cb.value = c; cb.checked = colChecked[c];
      cb.addEventListener("change", function () { colChecked[c] = cb.checked; });
      label.appendChild(cb);
      label.appendChild(document.createTextNode(" " + c));
      colList.appendChild(label);
    });
  }

  /* ---------- 值格式化 ---------- */
  function formatVal(v) {
    if (v === null || v === undefined) return nullAsNull.checked ? "NULL" : "''";
    if (typeof v === "number") return String(v);
    if (typeof v === "boolean") return v ? "1" : "0";
    if (typeof v === "object") v = JSON.stringify(v);
    var s = String(v);
    if (nullAsNull.checked && s.trim() === "") return "NULL";
    return "'" + s.replace(/'/g, "''") + "'";
  }

  function generate() {
    dumpErr.hidden = true;
    var parsed;
    try { parsed = parseData(); }
    catch (e) { dumpErr.hidden = false; dumpErr.textContent = "Data parsing failed: " + e.message; return; }
    var cols = parsed.cols.filter(function (c) { return colChecked[c] !== false; });
    if (!cols.length) { dumpErr.hidden = false; dumpErr.textContent = "Please select at least one column."; return; }
    var tbl = tblName.value.trim() || "table";
    var q = quoteCols.checked;
    var tblNameStr = q ? "`" + tbl + "`" : tbl;
    var colStr = cols.map(function (c) { return q ? "`" + c + "`" : c; }).join(", ");
    var rpp = parseInt(rowsPer.value, 10) || 1;
    var lines = [];
    for (var i = 0; i < parsed.rows.length; i += rpp) {
      var chunk = parsed.rows.slice(i, i + rpp);
      var tuples = chunk.map(function (row) {
        return "(" + cols.map(function (c) { return formatVal(row[c]); }).join(", ") + ")";
      });
      lines.push("INSERT INTO " + tblNameStr + " (" + colStr + ") VALUES " + tuples.join(", ") + ";");
    }
    var sql = lines.join("\n");
    dumpOut.textContent = sql;
    dumpStat.textContent = "Total " + parsed.rows.length + " rows / " + lines.length + " statements";
  }

  /* ---------- 事件 ---------- */
  dataFmt.addEventListener("change", updateColumns);
  dataInput.addEventListener("input", updateColumns);
  [tblName, rowsPer, quoteCols, nullAsNull].forEach(function (el) {
    el.addEventListener("change", generate);
  });
  document.getElementById("btnGen").addEventListener("click", generate);
  document.getElementById("btnExample").addEventListener("click", function () {
    tblName.value = "users";
    dataFmt.value = "json";
    dataInput.value = '[\n  {"id": 1, "name": "Alice", "age": 18, "email": "alice@example.com"},\n  {"id": 2, "name": "O\'Brien", "age": 21, "email": ""},\n  {"id": 3, "name": "Bob", "age": 25, "email": "bob@example.com"}\n]';
    colChecked = {};
    updateColumns();
    generate();
  });
  document.getElementById("btnClear").addEventListener("click", function () {
    dataInput.value = ""; dumpOut.textContent = ""; dumpStat.textContent = "";
    dumpErr.hidden = true; colChecked = {}; updateColumns();
  });
  document.getElementById("btnCopyDump").addEventListener("click", function () {
    if (!dumpOut.textContent) { showToast("Please generate first"); return; }
    copyText(dumpOut.textContent, "SQL copied");
  });
  document.getElementById("btnDownloadDump").addEventListener("click", function () {
    if (!dumpOut.textContent) { showToast("Please generate first"); return; }
    download("dump.sql", dumpOut.textContent, "text/plain");
    showToast("Downloaded dump.sql");
  });

  updateColumns();
})();
