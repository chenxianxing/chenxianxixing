/* ============================================================
   长图拼接 - 工具页逻辑
   多图上传/拖拽 -> 列表（上移/下移/删除）
   纵向/横向拼接、统一尺寸、间距/边距/背景色/对齐
   导出 PNG/JPEG，全部在浏览器本地完成
   ============================================================ */
(function () {
  "use strict";

  var drop = document.getElementById("stDrop");
  var input = document.getElementById("stInput");
  var listBox = document.getElementById("stListBox");
  var listEl = document.getElementById("stList");
  var dirRow = document.getElementById("stDir");
  var sizeModeRow = document.getElementById("stSizeMode");
  var targetWrap = document.getElementById("stTargetWrap");
  var targetLabel = document.getElementById("stTargetLabel");
  var targetInput = document.getElementById("stTarget");
  var gapInput = document.getElementById("stGap");
  var padInput = document.getElementById("stPad");
  var bgInput = document.getElementById("stBg");
  var bgVal = document.getElementById("stBgVal");
  var alignRow = document.getElementById("stAlign");
  var fmtRow = document.getElementById("stFmt");
  var qualityWrap = document.getElementById("stQualityWrap");
  var qualityInput = document.getElementById("stQuality");
  var qualityVal = document.getElementById("stQualityVal");
  var preview = document.getElementById("stPreview");
  var sizeText = document.getElementById("stSize");
  var btnDownload = document.getElementById("stDownload");
  var btnClear = document.getElementById("stClear");
  var errBox = document.getElementById("stError");

  var items = [];
  var resultCanvas = null;

  /* ---------- 工具函数 ---------- */
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  function showToast(msg) {
    var t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.classList.remove("show"); }, 2000);
  }

  function showErr(m) { errBox.hidden = false; errBox.textContent = m; }
  function hideErr() { errBox.hidden = true; }

  function radioVal(row) {
    var c = row.querySelector("input:checked");
    return c ? c.value : "";
  }

  function bindRadio(row) {
    Array.prototype.forEach.call(row.querySelectorAll("label"), function (l) {
      l.addEventListener("click", function () {
        Array.prototype.forEach.call(row.querySelectorAll("label"), function (x) {
          x.classList.remove("checked");
        });
        l.classList.add("checked");
      });
    });
    row.addEventListener("change", function () {
      Array.prototype.forEach.call(row.querySelectorAll("label"), function (x) {
        var inp = x.querySelector("input");
        x.classList.toggle("checked", !!(inp && inp.checked));
      });
    });
  }

  /* ---------- 选择/拖拽 ---------- */
  drop.addEventListener("click", function () { input.click(); });
  input.addEventListener("change", function () {
    if (input.files && input.files.length) addFiles(input.files);
    input.value = "";
  });
  ["dragenter", "dragover"].forEach(function (ev) {
    drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("dragover"); });
  });
  ["dragleave", "drop"].forEach(function (ev) {
    drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove("dragover"); });
  });
  drop.addEventListener("drop", function (e) {
    var dt = e.dataTransfer;
    if (dt && dt.files && dt.files.length) addFiles(dt.files);
  });

  function addFiles(files) {
    hideErr();
    var arr = Array.prototype.slice.call(files);
    if (arr.length === 0) return;
    arr.forEach(function (file) {
      if (!file.type || file.type.indexOf("image/") !== 0) {
        showErr("仅支持图片文件（当前包含：" + (file.type || "未知") + "）。");
        return;
      }
      var url = URL.createObjectURL(file);
      var im = new Image();
      im.onload = function () {
        items.push({
          url: url,
          img: im,
          w: im.naturalWidth,
          h: im.naturalHeight,
          name: file.name || "image"
        });
        renderList();
        renderPreview();
        listBox.hidden = items.length === 0;
      };
      im.onerror = function () {
        URL.revokeObjectURL(url);
        showErr("存在无法解码的图片，已跳过。");
      };
      im.src = url;
    });
  }

  /* ---------- 列表渲染 ---------- */
  function renderList() {
    listEl.innerHTML = "";
    items.forEach(function (it, idx) {
      var row = document.createElement("div");
      row.className = "st-item";

      var thumb = document.createElement("img");
      thumb.src = it.url;
      thumb.alt = it.name;

      var meta = document.createElement("div");
      meta.className = "st-meta";
      var nm = document.createElement("div");
      nm.className = "st-name";
      nm.textContent = it.name;
      var dim = document.createElement("div");
      dim.className = "st-dim";
      dim.textContent = it.w + " × " + it.h + " px";
      meta.appendChild(nm);
      meta.appendChild(dim);

      var actions = document.createElement("div");
      actions.className = "st-actions";

      var up = document.createElement("button");
      up.className = "st-btn";
      up.type = "button";
      up.textContent = "↑";
      up.title = "上移";
      up.disabled = idx === 0;
      up.addEventListener("click", function () { move(idx, -1); });

      var down = document.createElement("button");
      down.className = "st-btn";
      down.type = "button";
      down.textContent = "↓";
      down.title = "下移";
      down.disabled = idx === items.length - 1;
      down.addEventListener("click", function () { move(idx, 1); });

      var del = document.createElement("button");
      del.className = "st-btn";
      del.type = "button";
      del.textContent = "✕";
      del.title = "删除";
      del.addEventListener("click", function () { removeItem(idx); });

      actions.appendChild(up);
      actions.appendChild(down);
      actions.appendChild(del);

      row.appendChild(thumb);
      row.appendChild(meta);
      row.appendChild(actions);
      listEl.appendChild(row);
    });
  }

  function move(i, d) {
    var j = i + d;
    if (j < 0 || j >= items.length) return;
    var t = items[i];
    items[i] = items[j];
    items[j] = t;
    renderList();
    renderPreview();
  }

  function removeItem(i) {
    var it = items[i];
    if (it && it.url) URL.revokeObjectURL(it.url);
    items.splice(i, 1);
    renderList();
    renderPreview();
    listBox.hidden = items.length === 0;
  }

  btnClear.addEventListener("click", function () {
    items.forEach(function (it) { if (it.url) URL.revokeObjectURL(it.url); });
    items = [];
    renderList();
    renderPreview();
    listBox.hidden = true;
    showToast("已清空列表");
  });

  /* ---------- 拼接 ---------- */
  function buildStitch() {
    if (items.length === 0) return null;
    var dir = radioVal(dirRow) === "h" ? "h" : "v";
    var mode = radioVal(sizeModeRow);
    var bg = bgInput.value;
    var gap = clamp(parseInt(gapInput.value, 10), 0, 40);
    var pad = clamp(parseInt(padInput.value, 10), 0, 40);
    var target = Math.max(1, parseInt(targetInput.value, 10) || 1);

    var sizes = items.map(function (it) {
      if (dir === "v") {
        var w = mode === "max" ? Math.max.apply(null, items.map(function (i) { return i.w; })) : target;
        var scale = w / it.w;
        return { w: w, h: it.h * scale };
      } else {
        var h = mode === "max" ? Math.max.apply(null, items.map(function (i) { return i.h; })) : target;
        var scale2 = h / it.h;
        return { w: it.w * scale2, h: h };
      }
    });

    var totalW, totalH;
    if (dir === "v") {
      totalW = Math.max.apply(null, sizes.map(function (s) { return s.w; })) + pad * 2;
      totalH = sizes.reduce(function (a, s) { return a + s.h; }, 0) + gap * (sizes.length - 1) + pad * 2;
    } else {
      totalH = Math.max.apply(null, sizes.map(function (s) { return s.h; })) + pad * 2;
      totalW = sizes.reduce(function (a, s) { return a + s.w; }, 0) + gap * (sizes.length - 1) + pad * 2;
    }

    var canvas = document.createElement("canvas");
    canvas.width = Math.round(totalW);
    canvas.height = Math.round(totalH);
    var cx = canvas.getContext("2d");
    cx.fillStyle = bg;
    cx.fillRect(0, 0, canvas.width, canvas.height);

    var align = radioVal(alignRow);
    var off = pad;
    for (var i = 0; i < items.length; i++) {
      var s = sizes[i];
      var dx, dy;
      if (dir === "v") {
        var avail = totalW - pad * 2;
        if (align === "center") dx = pad + (avail - s.w) / 2;
        else if (align === "end") dx = pad + (avail - s.w);
        else dx = pad;
        dy = off;
        off += s.h + gap;
      } else {
        var availH = totalH - pad * 2;
        if (align === "center") dy = pad + (availH - s.h) / 2;
        else if (align === "end") dy = pad + (availH - s.h);
        else dy = pad;
        dx = off;
        off += s.w + gap;
      }
      cx.drawImage(items[i].img, dx, dy, s.w, s.h);
    }
    return canvas;
  }

  function renderPreview() {
    var c = buildStitch();
    if (!c) {
      preview.style.display = "none";
      sizeText.textContent = "最终尺寸：-";
      btnDownload.disabled = true;
      resultCanvas = null;
      return;
    }
    resultCanvas = c;
    var maxW = (preview.parentElement ? preview.parentElement.clientWidth : 0) || 600;
    var scale = c.width <= maxW ? 1 : maxW / c.width;
    var dw = Math.max(1, Math.round(c.width * scale));
    var dh = Math.max(1, Math.round(c.height * scale));
    preview.width = dw;
    preview.height = dh;
    preview.style.display = "block";
    var pctx = preview.getContext("2d");
    pctx.clearRect(0, 0, dw, dh);
    pctx.drawImage(c, 0, 0, c.width, c.height, 0, 0, dw, dh);
    sizeText.innerHTML = "最终尺寸：<b>" + c.width + " × " + c.height + " px</b>";
    btnDownload.disabled = false;
  }

  btnDownload.addEventListener("click", function () {
    if (!resultCanvas) { showToast("请先添加图片"); return; }
    var fmt = radioVal(fmtRow) === "image/jpeg" ? "image/jpeg" : "image/png";
    var q = fmt === "image/jpeg" ? parseFloat(qualityInput.value) : undefined;
    var ext = fmt === "image/jpeg" ? "jpg" : "png";
    if (!resultCanvas.toBlob) {
      var a0 = document.createElement("a");
      a0.href = resultCanvas.toDataURL(fmt, q);
      a0.download = "stitched." + ext;
      document.body.appendChild(a0);
      a0.click();
      document.body.removeChild(a0);
      showToast("已开始下载");
      return;
    }
    resultCanvas.toBlob(function (blob) {
      if (!blob) { showErr("该格式不被当前浏览器支持。"); return; }
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "stitched." + ext;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      showToast("已开始下载");
    }, fmt, q);
  });

  /* ---------- 控件联动 ---------- */
  function updateTargetUI() {
    var dir = radioVal(dirRow);
    var mode = radioVal(sizeModeRow);
    targetLabel.textContent = dir === "h" ? "目标高度（px）" : "目标宽度（px）";
    targetInput.disabled = mode === "max";
  }

  function syncFmtUI() {
    var fmt = radioVal(fmtRow);
    qualityWrap.style.display = fmt === "image/jpeg" ? "block" : "none";
  }

  [dirRow, sizeModeRow, alignRow, fmtRow].forEach(function (row) { bindRadio(row); });

  dirRow.addEventListener("change", function () { updateTargetUI(); renderPreview(); });
  sizeModeRow.addEventListener("change", function () { updateTargetUI(); renderPreview(); });
  targetInput.addEventListener("input", renderPreview);
  gapInput.addEventListener("input", renderPreview);
  padInput.addEventListener("input", renderPreview);
  bgInput.addEventListener("input", function () { bgVal.textContent = bgInput.value; renderPreview(); });
  alignRow.addEventListener("change", renderPreview);
  fmtRow.addEventListener("change", function () { syncFmtUI(); });
  qualityInput.addEventListener("input", function () {
    qualityVal.textContent = parseFloat(qualityInput.value).toFixed(2);
  });

  window.addEventListener("resize", function () {
    if (items.length) renderPreview();
  });

  /* ---------- 初始化 ---------- */
  updateTargetUI();
  syncFmtUI();
})();
