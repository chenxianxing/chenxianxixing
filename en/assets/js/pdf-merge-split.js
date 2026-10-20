/* ============================================================
   PDF合并与拆分 - 工具页逻辑
   依赖：../assets/vendor/pdf-lib.min.js（全局 PDFLib）
   所有处理均在浏览器本地完成，不发起任何网络请求
   ============================================================ */
(function () {
  "use strict";

  if (typeof PDFLib === "undefined" || !PDFLib.PDFDocument) {
    showToast(t("Failed to load the PDF component. Please refresh the page and try again."));
    return;
  }

  var MAX_SIZE = 50 * 1024 * 1024; // 50MB

  /* ---------- 模式切换 ---------- */
  var modeTabs = document.querySelector(".mode-tabs");
  var mergePanel = document.getElementById("mergePanel");
  var splitPanel = document.getElementById("splitPanel");

  Array.prototype.forEach.call(modeTabs.querySelectorAll("input"), function (radio) {
    radio.addEventListener("change", function () {
      var val = modeTabs.querySelector("input:checked").value;
      Array.prototype.forEach.call(modeTabs.querySelectorAll("label"), function (l) {
        l.classList.remove("checked");
      });
      radio.parentNode.classList.add("checked");
      mergePanel.classList.toggle("active", val === "merge");
      splitPanel.classList.toggle("active", val === "split");
    });
  });

  var errorBox = document.getElementById("pdfError");
  function showError(msg) {
    errorBox.hidden = false;
    errorBox.textContent = msg;
  }
  function clearError() { errorBox.hidden = true; }

  /* ============================================================
     合并模式
     ============================================================ */
  var mergeDrop = document.getElementById("mergeDrop");
  var mergeInput = document.getElementById("mergeInput");
  var mergeList = document.getElementById("mergeList");
  var mergeInfo = document.getElementById("mergeInfo");
  var mergeFiles = []; // {file, name, size, doc, pages, rotation}

  mergeDrop.addEventListener("click", function () { mergeInput.click(); });
  mergeDrop.addEventListener("dragover", function (e) {
    e.preventDefault(); mergeDrop.classList.add("dragover");
  });
  mergeDrop.addEventListener("dragleave", function () { mergeDrop.classList.remove("dragover"); });
  mergeDrop.addEventListener("drop", function (e) {
    e.preventDefault(); mergeDrop.classList.remove("dragover");
    handleMergeFiles(e.dataTransfer.files);
  });
  mergeInput.addEventListener("change", function () {
    handleMergeFiles(mergeInput.files);
    mergeInput.value = "";
  });

  function readArrayBuffer(file) {
    if (file.arrayBuffer) return file.arrayBuffer();
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { resolve(fr.result); };
      fr.onerror = function () { reject(fr.error); };
      fr.readAsArrayBuffer(file);
    });
  }

  function formatSize(bytes) {
    if (bytes >= 1024 * 1024 * 1024) return t("{v} {u}", { v: (bytes / 1024 / 1024 / 1024).toFixed(2), u: t("GB") });
    if (bytes >= 1024 * 1024) return t("{v} {u}", { v: (bytes / 1024 / 1024).toFixed(2), u: t("MB") });
    if (bytes >= 1024) return t("{v} {u}", { v: (bytes / 1024).toFixed(1), u: t("KB") });
    return t("{v} {u}", { v: String(bytes), u: t("B") });
  }

  async function handleMergeFiles(fileList) {
    clearError();
    var arr = Array.prototype.slice.call(fileList || []);
    if (!arr.length) return;
    for (var i = 0; i < arr.length; i++) {
      var file = arr[i];
      if (file.size > MAX_SIZE) {
        showToast(t("File {name} exceeds 50MB and was skipped", { name: file.name }));
        continue;
      }
      var entry = { file: file, name: file.name, size: file.size, doc: null, pages: 0, rotation: 0 };
      mergeFiles.push(entry);
      renderMergeList();
      try {
        var buf = await readArrayBuffer(file);
        var head = new Uint8Array(buf, 0, Math.min(5, buf.byteLength));
        var sig = String.fromCharCode.apply(null, head);
        if (sig.indexOf("%PDF") !== 0) {
          showToast(t("Not a valid PDF file: {name}", { name: file.name }));
          removeEntry(entry);
          continue;
        }
        var doc = await PDFLib.PDFDocument.load(buf);
        entry.doc = doc;
        entry.pages = doc.getPageCount();
      } catch (err) {
        showToast(t("Failed to parse PDF (it may be encrypted or corrupted): {name}", { name: file.name }));
        removeEntry(entry);
        continue;
      }
      renderMergeList();
    }
  }

  function removeEntry(entry) {
    var idx = mergeFiles.indexOf(entry);
    if (idx > -1) mergeFiles.splice(idx, 1);
    renderMergeList();
  }

  function renderMergeList() {
    mergeList.innerHTML = "";
    mergeFiles.forEach(function (entry, i) {
      var row = document.createElement("div");
      row.className = "file-row";

      var idx = document.createElement("div");
      idx.className = "idx";
      idx.textContent = String(i + 1);

      var meta = document.createElement("div");
      meta.className = "meta";
      var fname = document.createElement("div");
      fname.className = "fname";
      fname.textContent = entry.name;
      var fsub = document.createElement("div");
      fsub.className = "fsub";
      if (entry.doc) {
        fsub.textContent = t("{n} pages · {size}", { n: entry.pages, size: formatSize(entry.size) });
      } else {
        fsub.textContent = t("Reading...");
      }
      meta.appendChild(fname);
      meta.appendChild(fsub);

      var rot = document.createElement("select");
      rot.setAttribute("title", t("Rotation"));
      [0, 90, 180, 270].forEach(function (d) {
        var o = document.createElement("option");
        o.value = String(d);
        o.textContent = d + "°";
        if (d === entry.rotation) o.selected = true;
        rot.appendChild(o);
      });
      rot.addEventListener("change", function () { entry.rotation = parseInt(rot.value, 10); });

      var ctrl = document.createElement("div");
      ctrl.className = "ctrl-col";
      var up = document.createElement("button");
      up.className = "mini"; up.type = "button"; up.textContent = "↑"; up.title = t("Move Up");
      up.disabled = i === 0;
      up.addEventListener("click", function () {
        if (i > 0) { var tmp = mergeFiles[i - 1]; mergeFiles[i - 1] = entry; mergeFiles[i] = tmp; renderMergeList(); }
      });
      var down = document.createElement("button");
      down.className = "mini"; down.type = "button"; down.textContent = "↓"; down.title = t("Move Down");
      down.disabled = i === mergeFiles.length - 1;
      down.addEventListener("click", function () {
        if (i < mergeFiles.length - 1) { var tmp = mergeFiles[i + 1]; mergeFiles[i + 1] = entry; mergeFiles[i] = tmp; renderMergeList(); }
      });
      var del = document.createElement("button");
      del.className = "mini danger"; del.type = "button"; del.textContent = "✕"; del.title = t("Remove");
      del.addEventListener("click", function () { removeEntry(entry); });
      ctrl.appendChild(up); ctrl.appendChild(down); ctrl.appendChild(del);

      row.appendChild(idx); row.appendChild(meta); row.appendChild(rot); row.appendChild(ctrl);
      mergeList.appendChild(row);
    });
    mergeInfo.textContent = "";
  }

  document.getElementById("btnClearMerge").addEventListener("click", function () {
    mergeFiles = [];
    mergeList.innerHTML = "";
    mergeInfo.textContent = "";
    clearError();
  });

  document.getElementById("btnMerge").addEventListener("click", async function () {
    clearError();
    if (!mergeFiles.length) {
      showToast(t("Please add at least one PDF file first"));
      return;
    }
    var pending = mergeFiles.filter(function (e) { return !e.doc; });
    if (pending.length) {
      showToast(t("Some files are still being read, please wait"));
      return;
    }
    var btn = this;
    btn.disabled = true;
    var old = btn.textContent;
    btn.textContent = t("Processing…");
    try {
      showToast(t("Merging {n} files…", { n: mergeFiles.length }));
      var newDoc = await PDFLib.PDFDocument.create();
      var total = 0;
      for (var i = 0; i < mergeFiles.length; i++) {
        var e = mergeFiles[i];
        var indices = [];
        for (var p = 0; p < e.pages; p++) indices.push(p);
        var copied = await newDoc.copyPages(e.doc, indices);
        for (var c = 0; c < copied.length; c++) {
          if (e.rotation) copied[c].setRotation(PDFLib.degrees(e.rotation));
          newDoc.addPage(copied[c]);
        }
        total += e.pages;
      }
      var bytes = await newDoc.save();
      downloadBlob(new Blob([bytes], { type: "application/pdf" }), "merged.pdf");
      mergeInfo.innerHTML = t("{n} pages after merge · {size}", { n: total, size: formatSize(bytes.byteLength) });
      showToast(t("Merge complete, {n} pages in total", { n: total }));
    } catch (err) {
      showError(t("Merge failed: {msg}", { msg: err.message }));
    } finally {
      btn.disabled = false;
      btn.textContent = old;
    }
  });

  /* ============================================================
     拆分模式
     ============================================================ */
  var splitDrop = document.getElementById("splitDrop");
  var splitInput = document.getElementById("splitInput");
  var splitReady = document.getElementById("splitReady");
  var splitPagesEl = document.getElementById("splitPages");
  var splitSizeEl = document.getElementById("splitSize");
  var rangeWrap = document.getElementById("rangeWrap");
  var everyWrap = document.getElementById("everyWrap");
  var rangeInput = document.getElementById("rangeInput");
  var everyInput = document.getElementById("everyInput");
  var splitResults = document.getElementById("splitResults");
  var splitDoc = null, splitTotal = 0, splitFileSize = 0;

  splitDrop.addEventListener("click", function () { splitInput.click(); });
  splitDrop.addEventListener("dragover", function (e) { e.preventDefault(); splitDrop.classList.add("dragover"); });
  splitDrop.addEventListener("dragleave", function () { splitDrop.classList.remove("dragover"); });
  splitDrop.addEventListener("drop", function (e) {
    e.preventDefault(); splitDrop.classList.remove("dragover");
    if (e.dataTransfer.files.length) loadSplitFile(e.dataTransfer.files[0]);
  });
  splitInput.addEventListener("change", function () {
    if (splitInput.files.length) loadSplitFile(splitInput.files[0]);
    splitInput.value = "";
  });

  Array.prototype.forEach.call(document.querySelectorAll('input[name="splitMethod"]'), function (r) {
    r.addEventListener("change", function () {
      var v = document.querySelector('input[name="splitMethod"]:checked').value;
      rangeWrap.hidden = v !== "range";
      everyWrap.hidden = v !== "every";
    });
  });

  async function loadSplitFile(file) {
    clearError();
    splitResults.innerHTML = "";
    if (file.size > MAX_SIZE) {
      showToast(t("File {name} exceeds 50MB and was skipped", { name: file.name }));
      return;
    }
    try {
      var buf = await readArrayBuffer(file);
      var head = new Uint8Array(buf, 0, Math.min(5, buf.byteLength));
      if (String.fromCharCode.apply(null, head).indexOf("%PDF") !== 0) {
        showToast(t("Not a valid PDF file: {name}", { name: file.name }));
        return;
      }
      splitDoc = await PDFLib.PDFDocument.load(buf);
      splitTotal = splitDoc.getPageCount();
      splitFileSize = buf.byteLength;
      splitPagesEl.textContent = String(splitTotal);
      splitSizeEl.textContent = formatSize(splitFileSize);
      splitReady.hidden = false;
    } catch (err) {
      showToast(t("Failed to parse PDF (it may be encrypted or corrupted): {name}", { name: file.name }));
    }
  }

  document.getElementById("btnResetSplit").addEventListener("click", function () {
    splitDoc = null; splitReady.hidden = true; splitResults.innerHTML = "";
    clearError();
  });

  function parseRange(str, total) {
    var parts = str.split(",");
    var idx = [];
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i].trim();
      if (!part) continue;
      if (part.indexOf("-") > -1) {
        var seg = part.split("-");
        var a = parseInt(seg[0], 10), b = parseInt(seg[1], 10);
        if (isNaN(a) || isNaN(b) || a < 1 || b < a) return null;
        for (var k = a; k <= b; k++) {
          if (k > total) return "overflow";
          idx.push(k - 1);
        }
      } else {
        var n = parseInt(part, 10);
        if (isNaN(n) || n < 1) return null;
        if (n > total) return "overflow";
        idx.push(n - 1);
      }
    }
    return idx;
  }

  async function buildFromIndices(indices) {
    var out = await PDFLib.PDFDocument.create();
    var copied = await out.copyPages(splitDoc, indices);
    for (var i = 0; i < copied.length; i++) out.addPage(copied[i]);
    return await out.save();
  }

  document.getElementById("btnSplit").addEventListener("click", async function () {
    clearError();
    if (!splitDoc) {
      showToast(t("Please select a PDF to split first"));
      return;
    }
    var method = document.querySelector('input[name="splitMethod"]:checked').value;
    var groups = [];
    if (method === "range") {
      var raw = rangeInput.value.trim();
      if (!raw) { showToast(t("Please enter a page range")); return; }
      var res = parseRange(raw, splitTotal);
      if (res === null) { showToast(t("Invalid page range format, please check your input")); return; }
      if (res === "overflow") { showToast(t("Page number out of range ({n} pages in total)", { n: splitTotal })); return; }
      if (!res.length) { showToast(t("Invalid page range format, please check your input")); return; }
      groups = [res];
    } else {
      var n = parseInt(everyInput.value, 10);
      if (isNaN(n) || n < 1) { showToast(t("Pages per split must be an integer greater than 0")); return; }
      for (var s = 0; s < splitTotal; s += n) {
        var g = [];
        for (var j = s; j < Math.min(s + n, splitTotal); j++) g.push(j);
        groups.push(g);
      }
    }

    var btn = this;
    btn.disabled = true;
    var old = btn.textContent;
    btn.textContent = t("Processing…");
    try {
      showToast(t("Splitting…"));
      if (groups.length === 1) {
        var bytes = await buildFromIndices(groups[0]);
        downloadBlob(new Blob([bytes], { type: "application/pdf" }), "split.pdf");
        showToast(t("Split complete, {n} parts generated", { n: 1 }));
        renderSplitResults([{ name: "split.pdf", data: bytes }]);
      } else {
        var parts = [];
        for (var gi = 0; gi < groups.length; gi++) {
          var b = await buildFromIndices(groups[gi]);
          var name = "split_" + String(gi + 1).padStart(3, "0") + ".pdf";
          parts.push({ name: name, data: b });
        }
        renderSplitResults(parts);
        showToast(t("Split complete, {n} parts generated", { n: parts.length }));
      }
    } catch (err) {
      showError(t("Split failed: {msg}", { msg: err.message }));
    } finally {
      btn.disabled = false;
      btn.textContent = old;
    }
  });

  function renderSplitResults(parts) {
    splitResults.innerHTML = "";
    parts.forEach(function (p, i) {
      var b = document.createElement("button");
      b.className = "btn";
      b.type = "button";
      b.textContent = t("Download Part {n}", { n: i + 1 });
      b.addEventListener("click", function () {
        downloadBlob(new Blob([p.data], { type: "application/pdf" }), p.name);
        showToast(t("Downloaded: {name}", { name: p.name }));
      });
      splitResults.appendChild(b);
    });
    if (parts.length > 1) {
      var zipBtn = document.createElement("button");
      zipBtn.className = "btn btn-primary";
      zipBtn.type = "button";
      zipBtn.textContent = t("Download all as ZIP ({n} parts)", { n: parts.length });
      zipBtn.addEventListener("click", function () {
        try {
          var zip = createZip(parts);
          downloadBlob(zip, "splits.zip");
          showToast(t("ZIP download started ({n} parts)", { n: parts.length }));
        } catch (e) {
          showToast(t("ZIP generation failed: {msg}", { msg: e.message }));
        }
      });
      splitResults.appendChild(zipBtn);
    }
  }

  /* ============================================================
     下载 + 复制 + 提示
     ============================================================ */
  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
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

  var toastEl = document.getElementById("toast");
  var toastTimer = null;
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 2200);
  }

  /* ============================================================
     store-only ZIP 写入（crc32 + 本地头 + 中央目录）
     ============================================================ */
  var _crcTable = null;
  function crc32(buf) {
    if (!_crcTable) {
      _crcTable = new Uint32Array(256);
      for (var n = 0; n < 256; n++) {
        var c = n;
        for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        _crcTable[n] = c >>> 0;
      }
    }
    var c2 = 0xFFFFFFFF;
    for (var i = 0; i < buf.length; i++) {
      c2 = (_crcTable[(c2 ^ buf[i]) & 0xFF] ^ (c2 >>> 8)) >>> 0;
    }
    return (c2 ^ 0xFFFFFFFF) >>> 0;
  }

  function createZip(files) {
    var enc = new TextEncoder();
    var encFiles = files.map(function (f) {
      var nameBytes = enc.encode(f.name);
      return { name: f.name, nameBytes: nameBytes, data: f.data, crc: crc32(f.data) };
    });
    var enc = enc; // keep reference
    var total = 0;
    encFiles.forEach(function (f) {
      total += 30 + f.nameBytes.length + f.data.length;
    });
    encFiles.forEach(function (f) {
      total += 46 + f.nameBytes.length;
    });
    total += 22;

    var out = new Uint8Array(total);
    var dv = new DataView(out.buffer);
    var off = 0;
    var offsets = [];

    encFiles.forEach(function (f) {
      offsets.push(off);
      dv.setUint32(off, 0x04034b50, true); off += 4;
      dv.setUint16(off, 20, true); off += 2;       // version needed
      dv.setUint16(off, 0, true); off += 2;        // flags
      dv.setUint16(off, 0, true); off += 2;        // compression (store)
      dv.setUint16(off, 0, true); off += 2;        // mod time
      dv.setUint16(off, 0, true); off += 2;        // mod date
      dv.setUint32(off, f.crc, true); off += 4;
      dv.setUint32(off, f.data.length, true); off += 4; // comp size
      dv.setUint32(off, f.data.length, true); off += 4; // uncomp size
      dv.setUint16(off, f.nameBytes.length, true); off += 2;
      dv.setUint16(off, 0, true); off += 2;        // extra len
      out.set(f.nameBytes, off); off += f.nameBytes.length;
      out.set(f.data, off); off += f.data.length;
    });

    var cdStart = off;
    encFiles.forEach(function (f, i) {
      dv.setUint32(off, 0x02014b50, true); off += 4;
      dv.setUint16(off, 20, true); off += 2;       // version made by
      dv.setUint16(off, 20, true); off += 2;       // version needed
      dv.setUint16(off, 0, true); off += 2;        // flags
      dv.setUint16(off, 0, true); off += 2;        // compression
      dv.setUint16(off, 0, true); off += 2;        // mod time
      dv.setUint16(off, 0, true); off += 2;        // mod date
      dv.setUint32(off, f.crc, true); off += 4;
      dv.setUint32(off, f.data.length, true); off += 4;
      dv.setUint32(off, f.data.length, true); off += 4;
      dv.setUint16(off, f.nameBytes.length, true); off += 2;
      dv.setUint16(off, 0, true); off += 2;        // extra len
      dv.setUint16(off, 0, true); off += 2;        // comment len
      dv.setUint16(off, 0, true); off += 2;        // disk start
      dv.setUint16(off, 0, true); off += 2;        // internal attr
      dv.setUint32(off, 0, true); off += 4;        // external attr
      dv.setUint32(off, offsets[i], true); off += 4;
      out.set(f.nameBytes, off); off += f.nameBytes.length;
    });

    dv.setUint32(off, 0x06054b50, true); off += 4;
    dv.setUint16(off, 0, true); off += 2;          // disk num
    dv.setUint16(off, 0, true); off += 2;          // disk with cd
    dv.setUint16(off, encFiles.length, true); off += 2;
    dv.setUint16(off, encFiles.length, true); off += 2;
    dv.setUint32(off, off - cdStart, true); off += 4; // cd size
    dv.setUint32(off, cdStart, true); off += 4;    // cd offset
    dv.setUint16(off, 0, true); off += 2;          // comment len

    return new Blob([out], { type: "application/zip" });
  }

  /* 多语言助手（中文环境原样返回；英文环境由构建脚本注入翻译） */
  function t(key, vars) {
    var s = key;
    if (document.documentElement.lang === "en" && window.I18N_EN &&
        Object.prototype.hasOwnProperty.call(window.I18N_EN, key)) {
      s = window.I18N_EN[key];
    }
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        s = s.split("{" + k + "}").join(String(vars[k]));
      });
    }
    return s;
  }
})();
