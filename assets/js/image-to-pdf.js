/* ============================================================
   图片转 PDF - 工具页逻辑
   依赖：../assets/vendor/pdf-lib.min.js（全局 PDFLib）
   多图上传、拖拽排序、canvas 排版，本地合成 PDF
   所有处理均在浏览器本地完成，不发起任何网络请求
   ============================================================ */
(function () {
  "use strict";

  if (typeof PDFLib === "undefined" || !PDFLib.PDFDocument) {
    showError("PDF 组件加载失败，请刷新页面重试。");
    return;
  }

  /* ---------- DOM ---------- */
  var drop = document.getElementById("i2pDrop");
  var input = document.getElementById("i2pInput");
  var listEl = document.getElementById("i2pList");
  var sizeSel = document.getElementById("i2pSize");
  var orientRow = document.getElementById("i2pOrient");
  var marginSel = document.getElementById("i2pMargin");
  var perPageSel = document.getElementById("i2pPerPage");
  var qualityInput = document.getElementById("i2pQuality");
  var qualityVal = document.getElementById("i2pQualityVal");
  var genBtn = document.getElementById("i2pGenBtn");
  var clearBtn = document.getElementById("i2pClearBtn");
  var progressEl = document.getElementById("i2pProgress");
  var errorBox = document.getElementById("i2pError");

  var images = []; // {file, name, url, img, width, height, ready, failed}

  /* ---------- 提示 ---------- */
  var toastEl = document.getElementById("toast");
  var toastTimer = null;
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 2200);
  }
  function showError(msg) {
    errorBox.hidden = false;
    errorBox.textContent = msg;
  }
  function clearError() { errorBox.hidden = true; }

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

  /* ---------- 上传 ---------- */
  drop.addEventListener("click", function () { input.click(); });
  drop.addEventListener("dragover", function (e) { e.preventDefault(); drop.classList.add("dragover"); });
  drop.addEventListener("dragleave", function () { drop.classList.remove("dragover"); });
  drop.addEventListener("drop", function (e) {
    e.preventDefault(); drop.classList.remove("dragover");
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  });
  input.addEventListener("change", function () {
    if (input.files.length) addFiles(input.files);
    input.value = "";
  });

  function addFiles(fileList) {
    clearError();
    var arr = Array.prototype.slice.call(fileList || []);
    arr.forEach(function (file) {
      if (!/^image\//.test(file.type)) {
        showToast("已跳过非图片文件：" + file.name);
        return;
      }
      var entry = {
        file: file, name: file.name, url: URL.createObjectURL(file),
        img: null, width: 0, height: 0, ready: false, failed: false
      };
      images.push(entry);
      loadImage(entry);
    });
    renderList();
  }

  function loadImage(entry) {
    var im = new Image();
    im.onload = function () {
      entry.img = im;
      entry.width = im.naturalWidth;
      entry.height = im.naturalHeight;
      entry.ready = true;
      renderList();
    };
    im.onerror = function () {
      entry.failed = true;
      showToast("图片读取失败：" + entry.name);
      renderList();
    };
    im.src = entry.url;
  }

  /* ---------- 列表渲染 ---------- */
  function renderList() {
    listEl.innerHTML = "";
    images.forEach(function (entry, i) {
      var row = document.createElement("div");
      row.className = "i2p-row";

      var idx = document.createElement("div");
      idx.className = "idx";
      idx.textContent = String(i + 1);

      var thumb = document.createElement("img");
      thumb.className = "thumb";
      thumb.src = entry.url;
      thumb.alt = entry.name;

      var meta = document.createElement("div");
      meta.className = "meta";
      var fname = document.createElement("div");
      fname.className = "fname";
      fname.textContent = entry.name;
      var fsub = document.createElement("div");
      fsub.className = "fsub";
      fsub.textContent = entry.ready
        ? (entry.width + " × " + entry.height + " px")
        : (entry.failed ? "读取失败" : "读取中…");
      meta.appendChild(fname);
      meta.appendChild(fsub);

      var ctrl = document.createElement("div");
      ctrl.className = "ctrl-col";
      var up = document.createElement("button");
      up.className = "mini"; up.type = "button"; up.textContent = "↑"; up.title = "上移";
      up.disabled = i === 0;
      up.addEventListener("click", function () {
        if (i > 0) { var t = images[i - 1]; images[i - 1] = entry; images[i] = t; renderList(); }
      });
      var down = document.createElement("button");
      down.className = "mini"; down.type = "button"; down.textContent = "↓"; down.title = "下移";
      down.disabled = i === images.length - 1;
      down.addEventListener("click", function () {
        if (i < images.length - 1) { var t = images[i + 1]; images[i + 1] = entry; images[i] = t; renderList(); }
      });
      var del = document.createElement("button");
      del.className = "mini danger"; del.type = "button"; del.textContent = "✕"; del.title = "删除";
      del.addEventListener("click", function () {
        if (entry.url) URL.revokeObjectURL(entry.url);
        images.splice(i, 1);
        renderList();
      });
      ctrl.appendChild(up); ctrl.appendChild(down); ctrl.appendChild(del);

      row.appendChild(idx);
      row.appendChild(thumb);
      row.appendChild(meta);
      row.appendChild(ctrl);
      listEl.appendChild(row);
    });
    genBtn.disabled = images.length === 0;
    clearBtn.disabled = images.length === 0;
  }

  clearBtn.addEventListener("click", function () {
    images.forEach(function (e) { if (e.url) URL.revokeObjectURL(e.url); });
    images = [];
    renderList();
    progressEl.textContent = "";
    clearError();
  });

  qualityInput.addEventListener("input", function () {
    qualityVal.textContent = parseFloat(qualityInput.value).toFixed(2);
  });

  /* ---------- 页面尺寸 ---------- */
  function getPageSize() {
    var base = sizeSel.value === "letter"
      ? { w: 612, h: 792 }
      : { w: 595.28, h: 841.89 };
    if (orientRow.querySelector("input:checked").value === "landscape") {
      return { w: base.h, h: base.w };
    }
    return base;
  }
  function autoSize(w, h) {
    var maxDim = 2000, scale = 1;
    if (Math.max(w, h) > maxDim) scale = maxDim / Math.max(w, h);
    return { w: Math.round(w * scale), h: Math.round(h * scale) };
  }
  function computeGrid(perPage, landscape) {
    if (perPage === 1) return { cols: 1, rows: 1 };
    if (perPage === 2) return landscape ? { cols: 2, rows: 1 } : { cols: 1, rows: 2 };
    return { cols: 2, rows: 2 };
  }

  /* ---------- 画布排版 ---------- */
  function drawContain(ctx, img, x, y, cw, ch) {
    var ir = img.width / img.height;
    var cr = cw / ch;
    var dw, dh;
    if (ir > cr) { dw = cw; dh = cw / ir; }
    else { dh = ch; dw = ch * ir; }
    var dx = x + (cw - dw) / 2;
    var dy = y + (ch - dh) / 2;
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  function renderPage(group, pageSize, grid, margin, quality) {
    var S = 2; // 超采样倍率
    var W = pageSize.w, H = pageSize.h;
    var cv = document.createElement("canvas");
    cv.width = Math.round(W * S);
    cv.height = Math.round(H * S);
    var ctx = cv.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cv.width, cv.height);
    var m = margin * S;
    var cellW = (cv.width - 2 * m) / grid.cols;
    var cellH = (cv.height - 2 * m) / grid.rows;
    for (var i = 0; i < group.length; i++) {
      var r = Math.floor(i / grid.cols);
      var c = i % grid.cols;
      var x = m + c * cellW;
      var y = m + r * cellH;
      drawContain(ctx, group[i].img, x, y, cellW, cellH);
    }
    return new Promise(function (resolve, reject) {
      cv.toBlob(function (blob) {
        if (!blob) { reject(new Error("画布导出失败")); return; }
        blob.arrayBuffer().then(resolve, reject);
      }, "image/jpeg", quality);
    });
  }

  /* ---------- 生成 ---------- */
  genBtn.addEventListener("click", async function () {
    clearError();
    progressEl.textContent = "";
    if (!images.length) { showToast("请先添加图片"); return; }
    if (images.some(function (e) { return !e.ready; })) {
      showToast("部分图片仍在读取中，请稍候");
      return;
    }
    var btn = this;
    btn.disabled = true;
    var oldText = btn.textContent;
    btn.textContent = "生成中…";
    try {
      var perPage = parseInt(perPageSel.value, 10);
      var margin = parseInt(marginSel.value, 10);
      var quality = parseFloat(qualityInput.value);
      var auto = sizeSel.value === "auto";

      var pages = [];
      if (auto) {
        images.forEach(function (e) { pages.push([e]); });
      } else {
        var grid = computeGrid(perPage, orientRow.querySelector("input:checked").value === "landscape");
        for (var i = 0; i < images.length; i += perPage) {
          pages.push(images.slice(i, i + perPage));
        }
      }

      var pdf = await PDFLib.PDFDocument.create();
      for (var p = 0; p < pages.length; p++) {
        var group = pages[p];
        var ps = auto ? autoSize(group[0].width, group[0].height) : getPageSize();
        var g = auto ? { cols: 1, rows: 1 } : computeGrid(perPage, orientRow.querySelector("input:checked").value === "landscape");
        var jpeg = await renderPage(group, ps, g, margin, quality);
        var jpg = await pdf.embedJpg(jpeg);
        var page = pdf.addPage([ps.w, ps.h]);
        page.drawImage(jpg, { x: 0, y: 0, width: ps.w, height: ps.h });
        progressEl.textContent = "已处理 " + (p + 1) + " / " + pages.length;
      }
      var bytes = await pdf.save();
      downloadBlob(new Blob([bytes], { type: "application/pdf" }), "图片合集.pdf");
      showToast("已生成 PDF，共 " + pages.length + " 页");
    } catch (e) {
      showError("生成失败：" + (e && e.message ? e.message : e));
    } finally {
      btn.disabled = images.length === 0;
      btn.textContent = oldText;
    }
  });

  /* ---------- 单选组高亮 ---------- */
  function wireRadio(row) {
    function sync() {
      Array.prototype.forEach.call(row.querySelectorAll("label"), function (l) {
        var inp = l.querySelector("input");
        l.classList.toggle("checked", !!(inp && inp.checked));
      });
    }
    row.addEventListener("change", sync);
    sync();
  }
  wireRadio(orientRow);

  renderList();
})();
