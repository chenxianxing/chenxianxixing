/* ============================================================
   CSV转JSON - 工具页逻辑
   CSV ↔ JSON 双向转换，RFC4180 引号解析
   ============================================================ */
(function () {
  "use strict";

  /* ---------- 轻提示 / 复制 ---------- */
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
      fallbackCopy(text); done();
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
  function download(filename, text, mime) {
    var blob = new Blob([text], { type: (mime || "text/plain") + ";charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /* ---------- 模式切换 ---------- */
  var modeRow = document.getElementById("modeRow");
  var panelToJson = document.getElementById("panelToJson");
  var panelToCsv = document.getElementById("panelToCsv");

  function syncRadioStyle() {
    Array.prototype.forEach.call(modeRow.querySelectorAll("label"), function (label) {
      label.classList.toggle("checked", !!label.querySelector("input:checked"));
    });
  }
  Array.prototype.forEach.call(modeRow.querySelectorAll("label"), function (label) {
    label.addEventListener("click", function () {
      syncRadioStyle();
      var mode = modeRow.querySelector("input:checked").value;
      panelToJson.hidden = mode !== "toJson";
      panelToCsv.hidden = mode !== "toCsv";
    });
  });

  /* ---------- 分隔符选择 ---------- */
  var delimSel = document.getElementById("delim");
  var customWrap = document.getElementById("customDelimWrap");
  var customDelim = document.getElementById("customDelim");
  delimSel.addEventListener("change", function () {
    customWrap.hidden = delimSel.value !== "__custom__";
    if (delimSel.value !== "__custom__") convertToJson();
  });
  customDelim.addEventListener("input", function () {
    if (delimSel.value === "__custom__") convertToJson();
  });

  function getDelim() {
    if (delimSel.value === "__custom__") {
      return customDelim.value.length ? customDelim.value : ",";
    }
    return delimSel.value;
  }

  /* ---------- RFC4180 CSV 解析 ---------- */
  function parseCSV(text, delim, hasHeader, doTrim) {
    var records = [];
    var field = "";
    var row = [];
    var inQuotes = false;
    var quoteStartLine = 1;
    var line = 1;
    var i = 0;
    var n = text.length;

    function pushField() {
      row.push(doTrim ? field.trim() : field);
      field = "";
    }
    function pushRow() {
      records.push(row);
      row = [];
    }

    while (i < n) {
      var c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (i + 1 < n && text[i + 1] === '"') {
            field += '"';
            i += 2;
            continue;
          }
          inQuotes = false;
          i++;
          continue;
        }
        if (c === "\n") line++;
        field += c;
        i++;
      } else {
        if (c === '"') {
          inQuotes = true;
          quoteStartLine = line;
          i++;
        } else if (c === delim) {
          pushField();
          i++;
        } else if (c === "\n") {
          pushField();
          pushRow();
          line++;
          i++;
        } else if (c === "\r") {
          pushField();
          pushRow();
          i++;
          if (i < n && text[i] === "\n") { line++; i++; }
          else { line++; }
        } else {
          field += c;
          i++;
        }
      }
    }
    if (inQuotes) {
      throw new Error("第 " + quoteStartLine + " 行存在未闭合的双引号，请检查引号是否成对。");
    }
    if (field !== "" || row.length > 0) {
      pushField();
      pushRow();
    }

    // 过滤完全为空的行
    records = records.filter(function (r) {
      return !(r.length === 1 && r[0] === "");
    });

    if (!records.length) return [];

    if (hasHeader) {
      var header = records[0];
      var out = [];
      for (var r = 1; r < records.length; r++) {
        var obj = {};
        var cells = records[r];
        for (var k = 0; k < header.length; k++) {
          obj[header[k]] = (k < cells.length) ? cells[k] : "";
        }
        out.push(obj);
      }
      return out;
    }
    return records;
  }

  /* ---------- 文件读取 ---------- */
  var fileInput = document.getElementById("fileInput");
  document.getElementById("btnFile").addEventListener("click", function () { fileInput.click(); });
  fileInput.addEventListener("change", function () {
    var f = fileInput.files && fileInput.files[0];
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function (e) {
      document.getElementById("csvInput").value = e.target.result;
      convertToJson();
    };
    reader.readAsText(f, "UTF-8");
  });

  /* ---------- CSV → JSON ---------- */
  var csvInput = document.getElementById("csvInput");
  var jsonOutput = document.getElementById("jsonOutput");
  var jsonFormat = document.getElementById("jsonFormat");
  var hasHeader = document.getElementById("hasHeader");
  var trimWs = document.getElementById("trimWs");
  var errJson = document.getElementById("errJson");

  function convertToJson() {
    errJson.hidden = true;
    var text = csvInput.value;
    if (!text.trim()) {
      jsonOutput.value = "";
      return;
    }
    try {
      var data = parseCSV(text, getDelim(), hasHeader.checked, trimWs.checked);
      var str = (jsonFormat.value === "compact")
        ? JSON.stringify(data)
        : JSON.stringify(data, null, 2);
      jsonOutput.value = str;
    } catch (e) {
      jsonOutput.value = "";
      errJson.hidden = false;
      errJson.textContent = "解析失败：" + e.message;
    }
  }

  document.getElementById("btnConvert").addEventListener("click", convertToJson);
  document.getElementById("btnCopyJson").addEventListener("click", function () {
    if (!jsonOutput.value) { showToast("结果为空"); return; }
    copyText(jsonOutput.value, "已复制 JSON 结果");
  });
  document.getElementById("btnDownloadJson").addEventListener("click", function () {
    if (!jsonOutput.value) { showToast("结果为空"); return; }
    download("data.json", jsonOutput.value, "application/json");
    showToast("已下载 data.json");
  });
  document.getElementById("btnClearJson").addEventListener("click", function () {
    csvInput.value = "";
    jsonOutput.value = "";
    errJson.hidden = true;
  });

  [hasHeader, trimWs, jsonFormat].forEach(function (el) {
    el.addEventListener("change", convertToJson);
  });
  csvInput.addEventListener("input", convertToJson);

  /* ---------- JSON → CSV ---------- */
  var jsonInput = document.getElementById("jsonInput");
  var csvOutput = document.getElementById("csvOutput");
  var csvDelimOut = document.getElementById("csvDelimOut");
  var errCsv = document.getElementById("errCsv");

  function csvEscape(val, delim) {
    if (val === null || val === undefined) val = "";
    var s = String(val);
    if (s.indexOf('"') > -1 || s.indexOf(delim) > -1 || s.indexOf("\n") > -1 || s.indexOf("\r") > -1) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  function convertToCsv() {
    errCsv.hidden = true;
    var text = jsonInput.value.trim();
    if (!text) {
      csvOutput.value = "";
      return;
    }
    var data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      csvOutput.value = "";
      errCsv.hidden = false;
      errCsv.textContent = "JSON 解析失败：" + e.message;
      return;
    }
    if (!Array.isArray(data)) {
      errCsv.hidden = false;
      errCsv.textContent = "JSON 根节点必须是数组（对象数组或二维数组）。";
      return;
    }
    var delim = csvDelimOut.value;
    var lines = [];
    if (data.length && typeof data[0] === "object" && data[0] !== null && !Array.isArray(data[0])) {
      var headers = [];
      data.forEach(function (obj) {
        Object.keys(obj).forEach(function (k) {
          if (headers.indexOf(k) === -1) headers.push(k);
        });
      });
      lines.push(headers.map(function (h) { return csvEscape(h, delim); }).join(delim));
      data.forEach(function (obj) {
        lines.push(headers.map(function (h) { return csvEscape(obj[h], delim); }).join(delim));
      });
    } else {
      data.forEach(function (row) {
        if (Array.isArray(row)) {
          lines.push(row.map(function (v) { return csvEscape(v, delim); }).join(delim));
        } else {
          lines.push(csvEscape(row, delim));
        }
      });
    }
    csvOutput.value = lines.join("\r\n");
  }

  document.getElementById("btnConvertCsv").addEventListener("click", convertToCsv);
  document.getElementById("btnCopyCsv").addEventListener("click", function () {
    if (!csvOutput.value) { showToast("结果为空"); return; }
    copyText(csvOutput.value, "已复制 CSV 结果");
  });
  document.getElementById("btnDownloadCsv").addEventListener("click", function () {
    if (!csvOutput.value) { showToast("结果为空"); return; }
    download("data.csv", csvOutput.value, "text/csv");
    showToast("已下载 data.csv");
  });
  document.getElementById("btnClearCsv").addEventListener("click", function () {
    jsonInput.value = "";
    csvOutput.value = "";
    errCsv.hidden = true;
  });
  csvDelimOut.addEventListener("change", convertToCsv);
  jsonInput.addEventListener("input", convertToCsv);

  /* 默认示例填充（首次进入且无内容时） */
  if (!csvInput.value) {
    csvInput.value = "name,age,city\n张三,18,北京\n李四,21,上海";
    convertToJson();
  }
})();
