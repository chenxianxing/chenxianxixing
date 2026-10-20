/* ============================================================
  Excel转JSON - 工具页逻辑
   文件 → JSON（SheetJS）+ JSON → Excel
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
  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  if (typeof XLSX === "undefined") {
    showToast("SheetJS 库未加载");
  }

  /* ---------- 模式切换 ---------- */
  var modeRow = document.getElementById("modeRow");
  var panelToJson = document.getElementById("panelToJson");
  var panelToExcel = document.getElementById("panelToExcel");
  function syncRadio(row) {
    Array.prototype.forEach.call(row.querySelectorAll("label"), function (l) {
      l.classList.toggle("checked", !!l.querySelector("input:checked"));
    });
  }
  Array.prototype.forEach.call(modeRow.querySelectorAll("label"), function (l) {
    l.addEventListener("click", function () {
      syncRadio(modeRow);
      var m = modeRow.querySelector("input:checked").value;
      panelToJson.hidden = m !== "toJson";
      panelToExcel.hidden = m !== "toExcel";
    });
  });

  /* ---------- 文件读取 ---------- */
  var dropZone = document.getElementById("dropZone");
  var fileInput = document.getElementById("fileInput");
  var sheetSel = document.getElementById("sheetSel");
  var rangeInput = document.getElementById("rangeInput");
  var jsonFmt = document.getElementById("jsonFmt");
  var hasHeader = document.getElementById("hasHeader");
  var exJsonOutput = document.getElementById("exJsonOutput");
  var previewWrap = document.getElementById("previewWrap");
  var rowStat = document.getElementById("rowStat");
  var exWarn = document.getElementById("exWarn");

  var currentWb = null;

  document.getElementById("btnPick").addEventListener("click", function (e) {
    e.stopPropagation();
    fileInput.click();
  });
  dropZone.addEventListener("click", function () { fileInput.click(); });
  fileInput.addEventListener("change", function () {
    var f = fileInput.files && fileInput.files[0];
    if (f) readFile(f);
  });
  ["dragenter", "dragover"].forEach(function (ev) {
    dropZone.addEventListener(ev, function (e) {
      e.preventDefault(); e.stopPropagation();
      dropZone.classList.add("dragover");
    });
  });
  ["dragleave", "drop"].forEach(function (ev) {
    dropZone.addEventListener(ev, function (e) {
      e.preventDefault(); e.stopPropagation();
      dropZone.classList.remove("dragover");
    });
  });
  dropZone.addEventListener("drop", function (e) {
    var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) readFile(f);
  });

  function readFile(file) {
    exWarn.hidden = true;
    if (typeof XLSX === "undefined") {
      exWarn.hidden = false; exWarn.textContent = "SheetJS 库未加载，无法解析文件。";
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      exWarn.hidden = false;
      exWarn.textContent = "文件较大（" + (file.size / 1048576).toFixed(1) + " MB），解析可能较慢，请耐心等待。";
    }
    var reader = new FileReader();
    reader.onload = function (ev) {
      try {
        var data = new Uint8Array(ev.target.result);
        currentWb = XLSX.read(data, { type: "array" });
        sheetSel.innerHTML = "";
        currentWb.SheetNames.forEach(function (name) {
          var opt = document.createElement("option");
          opt.value = name; opt.textContent = name;
          sheetSel.appendChild(opt);
        });
        convertToJson();
      } catch (e) {
        exWarn.hidden = false;
        exWarn.textContent = "解析失败：" + e.message;
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function convertToJson() {
    exWarn.hidden = true;
    if (!currentWb) { exJsonOutput.value = ""; return; }
    var name = sheetSel.value;
    if (!name) { exJsonOutput.value = ""; return; }
    var ws = currentWb.Sheets[name];
    if (!ws) { exJsonOutput.value = ""; return; }
    var opts = {};
    if (!hasHeader.checked) opts.header = 1;
    var rangeVal = rangeInput.value.trim();
    if (rangeVal) opts.range = rangeVal;
    var arr;
    try {
      arr = XLSX.utils.sheet_to_json(ws, opts);
    } catch (e) {
      exWarn.hidden = false; exWarn.textContent = "转换失败：" + e.message; return;
    }
    var str = (jsonFmt.value === "compact") ? JSON.stringify(arr) : JSON.stringify(arr, null, 2);
    exJsonOutput.value = str;
    rowStat.textContent = "共 " + arr.length + " 行";
    if (arr.length > 5000) {
      exWarn.hidden = false;
      exWarn.textContent = "数据量较大（" + arr.length + " 行），预览仅显示前 50 行，下载为完整数据。";
    }
    renderPreview(arr);
  }

  function renderPreview(arr) {
    if (!arr.length) { previewWrap.innerHTML = '<div class="empty-tip">暂无数据</div>'; return; }
    var isObj = typeof arr[0] === "object" && arr[0] !== null && !Array.isArray(arr[0]);
    var cols = [];
    if (isObj) {
      var seen = {};
      for (var i = 0; i < Math.min(arr.length, 200); i++) {
        Object.keys(arr[i]).forEach(function (k) { if (!seen[k]) { seen[k] = true; cols.push(k); } });
      }
    } else {
      var maxLen = 0;
      for (var j = 0; j < Math.min(arr.length, 200); j++) maxLen = Math.max(maxLen, arr[j].length);
      for (var c = 0; c < maxLen; c++) cols.push("列" + (c + 1));
    }
    var html = "<table class=\"data-table\"><thead><tr>";
    cols.forEach(function (c) { html += "<th>" + escapeHtml(c) + "</th>"; });
    html += "</tr></thead><tbody>";
    var limit = Math.min(arr.length, 50);
    for (var r = 0; r < limit; r++) {
      html += "<tr>";
      var row = arr[r];
      cols.forEach(function (col, idx) {
        var v = isObj ? row[col] : row[idx];
        if (v === undefined || v === null) v = "";
        html += "<td>" + escapeHtml(v) + "</td>";
      });
      html += "</tr>";
    }
    html += "</tbody></table>";
    previewWrap.innerHTML = html;
  }

  sheetSel.addEventListener("change", convertToJson);
  rangeInput.addEventListener("input", convertToJson);
  jsonFmt.addEventListener("change", convertToJson);
  hasHeader.addEventListener("change", convertToJson);

  document.getElementById("btnConvertEx").addEventListener("click", convertToJson);
  document.getElementById("btnCopyEx").addEventListener("click", function () {
    if (!exJsonOutput.value) { showToast("结果为空"); return; }
    copyText(exJsonOutput.value, "已复制 JSON");
  });
  document.getElementById("btnDownloadEx").addEventListener("click", function () {
    if (!exJsonOutput.value) { showToast("结果为空"); return; }
    download("data.json", exJsonOutput.value, "application/json");
    showToast("已下载 data.json");
  });
  document.getElementById("btnClearEx").addEventListener("click", function () {
    currentWb = null;
    fileInput.value = "";
    sheetSel.innerHTML = '<option value="">请先选择文件</option>';
    exJsonOutput.value = "";
    previewWrap.innerHTML = '<div class="empty-tip">尚未生成预览</div>';
    rowStat.textContent = "未读取";
    exWarn.hidden = true;
  });

  /* ---------- JSON → Excel ---------- */
  var jsonInputEx = document.getElementById("jsonInputEx");
  var exWarn2 = document.getElementById("exWarn2");
  document.getElementById("btnGenExcel").addEventListener("click", function () {
    exWarn2.hidden = true;
    var text = jsonInputEx.value.trim();
    if (!text) { showToast("请输入 JSON"); return; }
    var data;
    try { data = JSON.parse(text); } catch (e) {
      exWarn2.hidden = false; exWarn2.textContent = "JSON 解析失败：" + e.message; return;
    }
    if (!Array.isArray(data)) {
      exWarn2.hidden = false; exWarn2.textContent = "JSON 根节点必须是数组。"; return;
    }
    if (!data.length) { showToast("数组为空"); return; }
    if (typeof XLSX === "undefined") {
      exWarn2.hidden = false; exWarn2.textContent = "SheetJS 库未加载，无法生成。"; return;
    }
    // 仅支持对象数组
    if (typeof data[0] !== "object" || data[0] === null || Array.isArray(data[0])) {
      exWarn2.hidden = false; exWarn2.textContent = "仅支持对象数组（每行一个对象）。"; return;
    }
    try {
      var ws = XLSX.utils.json_to_sheet(data);
      var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      XLSX.writeFile(wb, "data.xlsx");
      showToast("已下载 data.xlsx");
    } catch (e) {
      exWarn2.hidden = false; exWarn2.textContent = "生成失败：" + e.message;
    }
  });
  document.getElementById("btnClearEx2").addEventListener("click", function () {
    jsonInputEx.value = ""; exWarn2.hidden = true;
  });
})();
