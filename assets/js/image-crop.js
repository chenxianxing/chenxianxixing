/* ============================================================
   图片裁剪 - 工具页逻辑
   上传/拖拽/粘贴单张图片，canvas 预览 + 裁剪框 8 手柄拖动缩放
   比例锁定、旋转 90°、水平/垂直翻转、PNG/JPEG/WebP 导出
   全部在浏览器本地完成
   ============================================================ */
(function () {
  "use strict";

  var drop = document.getElementById("cropDrop");
  var input = document.getElementById("cropInput");
  var controls = document.getElementById("cropControls");
  var ratioRow = document.getElementById("cropRatio");
  var fmtRow = document.getElementById("cropFmt");
  var qualityWrap = document.getElementById("cropQualityWrap");
  var qualityInput = document.getElementById("cropQuality");
  var qualityVal = document.getElementById("cropQualityVal");
  var stage = document.getElementById("cropStage");
  var wrap = document.getElementById("cropWrap");
  var canvas = document.getElementById("cropCanvas");
  var ctx = canvas.getContext("2d");
  var box = document.getElementById("cropBox");
  var maskTop = document.getElementById("cropMaskTop");
  var maskBottom = document.getElementById("cropMaskBottom");
  var maskLeft = document.getElementById("cropMaskLeft");
  var maskRight = document.getElementById("cropMaskRight");
  var errBox = document.getElementById("cropError");
  var out = document.getElementById("cropOut");
  var outSize = document.getElementById("cropOutSize");
  var outSize2 = document.getElementById("cropOutSize2");
  var resultImg = document.getElementById("cropResult");
  var btnDownload = document.getElementById("cropDownload");
  var inX = document.getElementById("cropX");
  var inY = document.getElementById("cropY");
  var inW = document.getElementById("cropW");
  var inH = document.getElementById("cropH");

  var img = null;
  var rotation = 0;
  var flipH = false;
  var flipV = false;
  var workingW = 0;
  var workingH = 0;
  var crop = { x: 0, y: 0, w: 0, h: 0 };
  var displayScale = 1;
  var sourceName = "image";
  var resultBlob = null;
  var resultURL = null;

  var workCanvas = document.createElement("canvas");
  var workCtx = workCanvas.getContext("2d");

  /* ---------- 工具函数 ---------- */
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  function fmtSize(b) {
    if (b < 1024) return b + " B";
    if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
    return (b / 1048576).toFixed(2) + " MB";
  }

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

  function getFmt() {
    var c = fmtRow.querySelector("input:checked");
    return c ? c.value : "image/png";
  }

  function getRatioVal() {
    var c = ratioRow.querySelector("input:checked");
    var v = parseFloat(c ? c.value : "0");
    return isNaN(v) ? 0 : v;
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

  /* ---------- 选择/拖拽/粘贴 ---------- */
  drop.addEventListener("click", function () { input.click(); });
  input.addEventListener("change", function () {
    if (input.files && input.files[0]) loadFile(input.files[0]);
  });
  ["dragenter", "dragover"].forEach(function (ev) {
    drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("dragover"); });
  });
  ["dragleave", "drop"].forEach(function (ev) {
    drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove("dragover"); });
  });
  drop.addEventListener("drop", function (e) {
    var dt = e.dataTransfer;
    if (dt && dt.files && dt.files[0]) loadFile(dt.files[0]);
  });
  document.addEventListener("paste", function (e) {
    var items = (e.clipboardData && e.clipboardData.items) || [];
    for (var i = 0; i < items.length; i++) {
      if (items[i].type && items[i].type.indexOf("image/") === 0) {
        var f = items[i].getAsFile();
        if (f) loadFile(f);
        break;
      }
    }
  });

  function loadFile(file) {
    hideErr();
    if (!file.type || file.type.indexOf("image/") !== 0) {
      showErr("请选择图片文件（当前类型：" + (file.type || "未知") + "）。");
      return;
    }
    sourceName = (file.name || "image").replace(/\.[^.]+$/, "");
    var reader = new FileReader();
    reader.onload = function () {
      var im = new Image();
      im.onload = function () {
        img = im;
        rotation = 0;
        flipH = false;
        flipV = false;
        computeWorking();
        resetCropFull();
        controls.hidden = false;
        buildWork();
        renderDisplay();
        updateNumericInputs();
        updateOutput();
        syncRatioUI();
        syncFmtUI();
      };
      im.onerror = function () { showErr("图片解码失败，请换一张试试。"); };
      im.src = reader.result;
    };
    reader.onerror = function () { showErr("文件读取失败，请重试。"); };
    reader.readAsDataURL(file);
  }

  /* ---------- 工作画布（旋转+翻转后） ---------- */
  function computeWorking() {
    if (rotation === 90 || rotation === 270) {
      workingW = img.naturalHeight;
      workingH = img.naturalWidth;
    } else {
      workingW = img.naturalWidth;
      workingH = img.naturalHeight;
    }
  }

  function resetCropFull() {
    crop.x = 0;
    crop.y = 0;
    crop.w = workingW;
    crop.h = workingH;
  }

  function buildWork() {
    workCanvas.width = workingW;
    workCanvas.height = workingH;
    workCtx.clearRect(0, 0, workingW, workingH);
    workCtx.save();
    workCtx.translate(workingW / 2, workingH / 2);
    workCtx.rotate(rotation * Math.PI / 180);
    if (flipH) workCtx.scale(-1, 1);
    if (flipV) workCtx.scale(1, -1);
    var dw = (rotation === 90 || rotation === 270) ? img.naturalHeight : img.naturalWidth;
    var dh = (rotation === 90 || rotation === 270) ? img.naturalWidth : img.naturalHeight;
    workCtx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
    workCtx.restore();
  }

  /* ---------- 预览渲染 ---------- */
  function renderDisplay() {
    var maxW = wrap.clientWidth || 600;
    var dispW = workingW <= maxW ? workingW : maxW;
    dispW = Math.max(40, dispW);
    displayScale = dispW / workingW;
    var dispH = Math.round(workingH * displayScale);
    dispW = Math.round(dispW);
    canvas.width = dispW;
    canvas.height = dispH;
    stage.style.width = dispW + "px";
    stage.style.height = dispH + "px";
    ctx.clearRect(0, 0, dispW, dispH);
    ctx.drawImage(workCanvas, 0, 0, workingW, workingH, 0, 0, dispW, dispH);
    updateOverlay();
  }

  function updateOverlay() {
    var left = crop.x * displayScale;
    var top = crop.y * displayScale;
    var w = crop.w * displayScale;
    var h = crop.h * displayScale;
    box.style.left = left + "px";
    box.style.top = top + "px";
    box.style.width = w + "px";
    box.style.height = h + "px";

    var cw = canvas.width;
    var ch = canvas.height;
    maskTop.style.left = "0px";
    maskTop.style.top = "0px";
    maskTop.style.width = cw + "px";
    maskTop.style.height = top + "px";
    maskBottom.style.left = "0px";
    maskBottom.style.top = (top + h) + "px";
    maskBottom.style.width = cw + "px";
    maskBottom.style.height = Math.max(0, ch - (top + h)) + "px";
    maskLeft.style.left = "0px";
    maskLeft.style.top = top + "px";
    maskLeft.style.width = left + "px";
    maskLeft.style.height = h + "px";
    maskRight.style.left = (left + w) + "px";
    maskRight.style.top = top + "px";
    maskRight.style.width = Math.max(0, cw - (left + w)) + "px";
    maskRight.style.height = h + "px";
  }

  function updateNumericInputs() {
    inX.value = Math.round(crop.x);
    inY.value = Math.round(crop.y);
    inW.value = Math.round(crop.w);
    inH.value = Math.round(crop.h);
    inX.max = workingW;
    inY.max = workingH;
    inW.max = workingW;
    inH.max = workingH;
  }

  /* ---------- 输出 ---------- */
  function updateOutput() {
    if (!img) return;
    var fmt = getFmt();
    var q = fmt === "image/jpeg" ? parseFloat(qualityInput.value) : undefined;
    var oc = document.createElement("canvas");
    oc.width = Math.max(1, Math.round(crop.w));
    oc.height = Math.max(1, Math.round(crop.h));
    var octx = oc.getContext("2d");
    if (fmt === "image/jpeg") {
      octx.fillStyle = "#ffffff";
      octx.fillRect(0, 0, oc.width, oc.height);
    }
    octx.drawImage(workCanvas, crop.x, crop.y, crop.w, crop.h, 0, 0, oc.width, oc.height);

    out.hidden = false;
    outSize.textContent = oc.width + " × " + oc.height + " px";

    if (!oc.toBlob) {
      var data = oc.toDataURL(fmt, q);
      resultBlob = { size: Math.round(data.length * 0.75) };
      if (resultURL) URL.revokeObjectURL(resultURL);
      resultURL = data;
      resultImg.src = data;
      outSize2.textContent = fmtSize(resultBlob.size);
      btnDownload.disabled = false;
      return;
    }
    oc.toBlob(function (blob) {
      if (!blob) {
        showErr("该格式可能不被当前浏览器支持，请换 PNG 或 JPEG。");
        return;
      }
      resultBlob = blob;
      if (resultURL && resultURL.indexOf("blob:") === 0) URL.revokeObjectURL(resultURL);
      resultURL = URL.createObjectURL(blob);
      resultImg.src = resultURL;
      outSize2.textContent = fmtSize(blob.size);
      btnDownload.disabled = false;
    }, fmt, q);
  }

  btnDownload.addEventListener("click", function () {
    if (!resultBlob) { showToast("请先生成结果"); return; }
    var fmt = getFmt();
    var ext = fmt.split("/")[1];
    if (ext === "jpeg") ext = "jpg";
    var a = document.createElement("a");
    a.href = resultURL;
    a.download = sourceName + "-cropped." + ext;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast("已开始下载");
  });

  /* ---------- 比例 ---------- */
  function applyRatio(r) {
    var cx = crop.x + crop.w / 2;
    var cy = crop.y + crop.h / 2;
    var w = crop.w;
    var h = w / r;
    if (h > workingH) { h = workingH; w = h * r; }
    var x = cx - w / 2;
    var y = cy - h / 2;
    x = clamp(x, 0, workingW - w);
    y = clamp(y, 0, workingH - h);
    crop.x = x; crop.y = y; crop.w = w; crop.h = h;
  }

  ratioRow.addEventListener("change", function () {
    if (!img) return;
    var r = getRatioVal();
    if (r > 0) applyRatio(r);
    updateOverlay();
    updateNumericInputs();
    updateOutput();
  });

  function syncRatioUI() {
    var f = ratioRow.querySelector('input[value="0"]');
    if (f) f.checked = true;
    Array.prototype.forEach.call(ratioRow.querySelectorAll("label"), function (x) {
      var i = x.querySelector("input");
      x.classList.toggle("checked", !!(i && i.checked));
    });
  }

  /* ---------- 数值输入 ---------- */
  function readNumeric() {
    var x = parseInt(inX.value, 10);
    var y = parseInt(inY.value, 10);
    var w = parseInt(inW.value, 10);
    var h = parseInt(inH.value, 10);
    if (isNaN(x) || isNaN(y) || isNaN(w) || isNaN(h)) return false;
    x = clamp(x, 0, workingW);
    y = clamp(y, 0, workingH);
    w = clamp(w, 20, workingW - x);
    h = clamp(h, 20, workingH - y);
    crop.x = x; crop.y = y; crop.w = w; crop.h = h;
    return true;
  }

  [inX, inY, inW, inH].forEach(function (el) {
    el.addEventListener("change", function () {
      if (!img) return;
      if (readNumeric()) { updateOverlay(); updateOutput(); }
      else { updateNumericInputs(); }
    });
  });

  /* ---------- 按钮 ---------- */
  document.getElementById("cropRotate").addEventListener("click", function () {
    if (!img) return;
    rotation = (rotation + 90) % 360;
    computeWorking();
    resetCropFull();
    syncRatioUI();
    buildWork();
    renderDisplay();
    updateNumericInputs();
    updateOutput();
  });
  document.getElementById("cropFlipH").addEventListener("click", function () {
    if (!img) return;
    flipH = !flipH;
    buildWork();
    renderDisplay();
    updateOutput();
  });
  document.getElementById("cropFlipV").addEventListener("click", function () {
    if (!img) return;
    flipV = !flipV;
    buildWork();
    renderDisplay();
    updateOutput();
  });
  document.getElementById("cropReset").addEventListener("click", function () {
    if (!img) return;
    rotation = 0;
    flipH = false;
    flipV = false;
    resetCropFull();
    computeWorking();
    syncRatioUI();
    buildWork();
    renderDisplay();
    updateNumericInputs();
    updateOutput();
    showToast("已重置为原图");
  });

  /* ---------- 格式与质量 ---------- */
  fmtRow.addEventListener("change", function () {
    syncFmtUI();
    if (img) updateOutput();
  });
  qualityInput.addEventListener("input", function () {
    qualityVal.textContent = parseFloat(qualityInput.value).toFixed(2);
  });
  qualityInput.addEventListener("change", function () {
    if (img) updateOutput();
  });

  function syncFmtUI() {
    var fmt = getFmt();
    qualityWrap.style.display = fmt === "image/jpeg" ? "flex" : "none";
  }

  /* ---------- 裁剪框拖动 / 缩放 ---------- */
  var drag = null;

  box.addEventListener("pointerdown", function (e) {
    if (!img) return;
    e.preventDefault();
    var dir = (e.target && e.target.dataset) ? e.target.dataset.dir : "";
    drag = {
      dir: dir,
      startX: e.clientX,
      startY: e.clientY,
      orig: { x: crop.x, y: crop.y, w: crop.w, h: crop.h }
    };
    if (box.setPointerCapture) {
      try { box.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    }
  });

  box.addEventListener("pointermove", function (e) {
    if (!drag) return;
    var dx = (e.clientX - drag.startX) / displayScale;
    var dy = (e.clientY - drag.startY) / displayScale;
    if (drag.dir === "") {
      var nx = clamp(drag.orig.x + dx, 0, workingW - drag.orig.w);
      var ny = clamp(drag.orig.y + dy, 0, workingH - drag.orig.h);
      crop.x = nx;
      crop.y = ny;
    } else {
      resizeCrop(drag.dir, drag.orig, dx, dy);
    }
    updateOverlay();
    updateNumericInputs();
  });

  function endDrag() {
    if (!drag) return;
    drag = null;
    if (img) updateOutput();
  }
  box.addEventListener("pointerup", endDrag);
  box.addEventListener("pointercancel", endDrag);

  function resizeCrop(dir, orig, dx, dy) {
    var minS = 20;
    var r = getRatioVal();
    var x0 = orig.x, y0 = orig.y, x1 = orig.x + orig.w, y1 = orig.y + orig.h;

    if (dir.indexOf("w") >= 0) x0 = orig.x + dx;
    if (dir.indexOf("e") >= 0) x1 = orig.x + orig.w + dx;
    if (dir.indexOf("n") >= 0) y0 = orig.y + dy;
    if (dir.indexOf("s") >= 0) y1 = orig.y + orig.h + dy;
    if (dir === "n" || dir === "s") { x0 = orig.x; x1 = orig.x + orig.w; }
    if (dir === "e" || dir === "w") { y0 = orig.y; y1 = orig.y + orig.h; }

    var nx = Math.min(x0, x1), nw = Math.abs(x1 - x0);
    var ny = Math.min(y0, y1), nh = Math.abs(y1 - y0);

    if (r > 0 && (dir === "nw" || dir === "ne" || dir === "sw" || dir === "se")) {
      var ax, ay, sx, sy;
      if (dir === "nw") { ax = orig.x + orig.w; ay = orig.y + orig.h; sx = -1; sy = -1; }
      else if (dir === "ne") { ax = orig.x; ay = orig.y + orig.h; sx = 1; sy = -1; }
      else if (dir === "sw") { ax = orig.x + orig.w; ay = orig.y; sx = -1; sy = 1; }
      else { ax = orig.x; ay = orig.y; sx = 1; sy = 1; }
      var maxW = sx > 0 ? (workingW - ax) : ax;
      var maxH = sy > 0 ? (workingH - ay) : ay;
      var w = Math.max(nw, nh * r);
      var h = w / r;
      if (w > maxW) { w = maxW; h = w / r; }
      if (h > maxH) { h = maxH; w = h * r; }
      w = Math.max(minS, w);
      h = Math.max(minS, h);
      crop.x = sx > 0 ? ax : ax - w;
      crop.y = sy > 0 ? ay : ay - h;
      crop.w = w;
      crop.h = h;
      return;
    }

    if (r > 0 && (dir === "e" || dir === "w")) {
      var top = orig.y;
      var w2 = Math.max(minS, nw);
      var h2 = w2 / r;
      if (h2 > workingH - top) { h2 = workingH - top; w2 = h2 * r; }
      w2 = Math.max(minS, w2);
      h2 = Math.max(minS, h2);
      crop.x = dir === "e" ? orig.x : orig.x + orig.w - w2;
      crop.y = top;
      crop.w = w2;
      crop.h = h2;
      return;
    }

    if (r > 0 && (dir === "n" || dir === "s")) {
      var left0 = orig.x;
      var h3 = Math.max(minS, nh);
      var w3 = h3 * r;
      if (w3 > workingW - left0) { w3 = workingW - left0; h3 = w3 / r; }
      w3 = Math.max(minS, w3);
      h3 = Math.max(minS, h3);
      crop.x = left0;
      crop.y = dir === "s" ? orig.y : orig.y + orig.h - h3;
      crop.w = w3;
      crop.h = h3;
      return;
    }

    if (nx < 0) { nw += nx; nx = 0; }
    if (ny < 0) { nh += ny; ny = 0; }
    if (nx + nw > workingW) nw = workingW - nx;
    if (ny + nh > workingH) nh = workingH - ny;
    nw = Math.max(minS, nw);
    nh = Math.max(minS, nh);
    crop.x = nx;
    crop.y = ny;
    crop.w = nw;
    crop.h = nh;
  }

  /* ---------- 窗口尺寸变化 ---------- */
  window.addEventListener("resize", function () {
    if (img) renderDisplay();
  });

  /* ---------- 初始化 ---------- */
  bindRadio(ratioRow);
  bindRadio(fmtRow);
  syncFmtUI();
})();
