/* ============================================================
   九宫格切图 - 工具页逻辑
   单图 -> 网格切分（2×2/3×3/4×4/自定义）
   居中裁正方形 / 按原图比例等分
   逐片预览、单独下载、全部顺序下载，本地完成
   ============================================================ */
(function () {
  "use strict";

  var drop = document.getElementById("ngDrop");
  var input = document.getElementById("ngInput");
  var controls = document.getElementById("ngControls");
  var gridRow = document.getElementById("ngGrid");
  var colsWrap = document.getElementById("ngColsWrap");
  var rowsWrap = document.getElementById("ngRowsWrap");
  var colsInput = document.getElementById("ngCols");
  var rowsInput = document.getElementById("ngRows");
  var modeRow = document.getElementById("ngMode");
  var fmtRow = document.getElementById("ngFmt");
  var qualityWrap = document.getElementById("ngQualityWrap");
  var qualityInput = document.getElementById("ngQuality");
  var qualityVal = document.getElementById("ngQualityVal");
  var gridPreview = document.getElementById("ngGridPreview");
  var info = document.getElementById("ngInfo");
  var btnDownloadAll = document.getElementById("ngDownloadAll");
  var errBox = document.getElementById("ngError");

  var img = null;
  var sourceName = "image";
  var slices = [];

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

  function loadFile(file) {
    hideErr();
    if (!file.type || file.type.indexOf("image/") !== 0) {
      showErr("请选择图片文件。");
      return;
    }
    sourceName = (file.name || "image").replace(/\.[^.]+$/, "");
    var reader = new FileReader();
    reader.onload = function () {
      var im = new Image();
      im.onload = function () {
        img = im;
        controls.hidden = false;
        render();
      };
      im.onerror = function () { showErr("图片解码失败，请换一张试试。"); };
      im.src = reader.result;
    };
    reader.onerror = function () { showErr("文件读取失败，请重试。"); };
    reader.readAsDataURL(file);
  }

  /* ---------- 网格参数 ---------- */
  function getGrid() {
    var g = radioVal(gridRow);
    var cols, rows;
    if (g === "2") { cols = 2; rows = 2; }
    else if (g === "4") { cols = 4; rows = 4; }
    else if (g === "custom") {
      cols = clamp(parseInt(colsInput.value, 10), 1, 10);
      rows = clamp(parseInt(rowsInput.value, 10), 1, 10);
    } else { cols = 3; rows = 3; }
    return { cols: cols, rows: rows };
  }

  function syncCustomUI() {
    var isCustom = radioVal(gridRow) === "custom";
    colsWrap.hidden = !isCustom;
    rowsWrap.hidden = !isCustom;
  }

  /* ---------- 切分 ---------- */
  function computeSlices() {
    if (!img) return;
    var g = getGrid();
    var mode = radioVal(modeRow);
    var fmt = radioVal(fmtRow) === "image/jpeg" ? "image/jpeg" : "image/png";
    var q = fmt === "image/jpeg" ? parseFloat(qualityInput.value) : undefined;
    var W = img.naturalWidth;
    var H = img.naturalHeight;
    var S = mode === "square" ? Math.min(W, H) : 0;

    slices = [];
    for (var r = 0; r < g.rows; r++) {
      for (var c = 0; c < g.cols; c++) {
        var sx, sy, sw, sh;
        if (mode === "square") {
          var cellW = S / g.cols;
          var cellH = S / g.rows;
          sx = (W - S) / 2 + c * cellW;
          sy = (H - S) / 2 + r * cellH;
          sw = cellW;
          sh = cellH;
        } else {
          sw = W / g.cols;
          sh = H / g.rows;
          sx = c * sw;
          sy = r * sh;
        }
        var cw = Math.max(1, Math.round(sw));
        var ch = Math.max(1, Math.round(sh));
        var sc = document.createElement("canvas");
        sc.width = cw;
        sc.height = ch;
        var sctx = sc.getContext("2d");
        if (fmt === "image/jpeg") {
          sctx.fillStyle = "#ffffff";
          sctx.fillRect(0, 0, cw, ch);
        }
        sctx.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch);
        slices.push({ canvas: sc, w: cw, h: ch, fmt: fmt, q: q, index: slices.length });
      }
    }
  }

  function render() {
    computeSlices();
    var g = getGrid();
    gridPreview.style.gridTemplateColumns = "repeat(" + g.cols + ", 1fr)";
    gridPreview.innerHTML = "";

    slices.forEach(function (sl, i) {
      var cell = document.createElement("div");
      cell.className = "ng-cell";
      cell.title = "点击单独下载第 " + (i + 1) + " 片";
      var idx = document.createElement("span");
      idx.className = "ng-idx";
      idx.textContent = String(i + 1);
      cell.appendChild(sl.canvas);
      cell.appendChild(idx);
      cell.addEventListener("click", function () { downloadSlice(sl, i); });
      gridPreview.appendChild(cell);
    });

    if (slices.length) {
      var first = slices[0];
      info.innerHTML = "每片尺寸：<b>" + first.w + " × " + first.h +
        " px</b> · 切片总数：<b>" + slices.length + "</b>";
    }
  }

  function downloadSlice(sl, i) {
    var ext = sl.fmt === "image/jpeg" ? "jpg" : "png";
    var name = sourceName + "-" + (i + 1) + "." + ext;
    if (!sl.canvas.toBlob) {
      var a0 = document.createElement("a");
      a0.href = sl.canvas.toDataURL(sl.fmt, sl.q);
      a0.download = name;
      document.body.appendChild(a0);
      a0.click();
      document.body.removeChild(a0);
      return;
    }
    sl.canvas.toBlob(function (blob) {
      if (!blob) { showErr("导出失败"); return; }
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    }, sl.fmt, sl.q);
  }

  btnDownloadAll.addEventListener("click", function () {
    if (!slices.length) { showToast("请先上传图片"); return; }
    showToast("开始依次下载 " + slices.length + " 张切片");
    slices.forEach(function (sl, i) {
      setTimeout(function () { downloadSlice(sl, i); }, i * 300);
    });
  });

  /* ---------- 控件联动 ---------- */
  function syncFmtUI() {
    var fmt = radioVal(fmtRow);
    qualityWrap.style.display = fmt === "image/jpeg" ? "block" : "none";
  }

  [gridRow, modeRow, fmtRow].forEach(function (row) { bindRadio(row); });

  gridRow.addEventListener("change", function () { syncCustomUI(); render(); });
  colsInput.addEventListener("input", function () { if (radioVal(gridRow) === "custom") render(); });
  rowsInput.addEventListener("input", function () { if (radioVal(gridRow) === "custom") render(); });
  modeRow.addEventListener("change", render);
  fmtRow.addEventListener("change", function () { syncFmtUI(); render(); });
  qualityInput.addEventListener("input", function () {
    qualityVal.textContent = parseFloat(qualityInput.value).toFixed(2);
    render();
  });

  /* ---------- 初始化 ---------- */
  syncCustomUI();
  syncFmtUI();
})();
