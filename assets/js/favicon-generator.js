/* ============================================================
   Favicon生成器 - 工具页逻辑
   上传图片 → canvas 多尺寸 PNG + ICO 合成 + manifest + ZIP
   全部本地完成，不发起任何网络请求
   ============================================================ */
(function () {
  "use strict";

  var MAX_SIZE = 10 * 1024 * 1024; // 10MB
  var SIZES = [16, 32, 48, 64, 128, 180, 192, 512];
  var ICO_SIZES = [16, 32, 48];
  var ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

  var drop = document.getElementById("fgDrop");
  var input = document.getElementById("fgInput");
  var editor = document.getElementById("fgEditor");
  var fileInfo = document.getElementById("fgFileInfo");
  var errorBox = document.getElementById("fgError");
  var previewBox = document.getElementById("fgPreview");
  var htmlCode = document.getElementById("fgHtmlCode");
  var siteName = document.getElementById("fgSiteName");
  var shortName = document.getElementById("fgShortName");
  var themeColor = document.getElementById("fgThemeColor");
  var bgColor = document.getElementById("fgBgColor");

  var state = {
    img: null,   // HTMLImageElement
    name: "",
    size: 0,
    pngs: {},    // size -> ArrayBuffer
    urls: {}     // size -> objectURL
  };

  function showError(msg) {
    errorBox.hidden = false;
    errorBox.textContent = msg;
  }
  function clearError() { errorBox.hidden = true; }

  /* ---------- 文件选择 ---------- */
  drop.addEventListener("click", function () { input.click(); });
  drop.addEventListener("dragover", function (e) {
    e.preventDefault();
    drop.classList.add("dragover");
  });
  drop.addEventListener("dragleave", function () { drop.classList.remove("dragover"); });
  drop.addEventListener("drop", function (e) {
    e.preventDefault();
    drop.classList.remove("dragover");
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
  });
  input.addEventListener("change", function () {
    if (input.files.length) handleFile(input.files[0]);
    input.value = "";
  });

  function isSvg(file) {
    return (file.type || "").toLowerCase() === "image/svg+xml" || /\.svg$/i.test(file.name);
  }

  function handleFile(file) {
    clearError();
    var type = (file.type || "").toLowerCase();
    if (!type && isSvg(file)) type = "image/svg+xml";
    if (ALLOWED.indexOf(type) === -1) {
      showToast(t("仅支持 PNG / JPG / JPEG / WebP / SVG 格式的图片"));
      return;
    }
    if (file.size > MAX_SIZE) {
      showToast(t("文件大小超过 10MB，请选择更小的图片"));
      return;
    }
    loadImage(file);
  }

  function loadImage(file) {
    var fr = new FileReader();
    fr.onerror = function () {
      showToast(t("图片读取失败，请重试"));
    };
    fr.onload = function () {
      var src;
      if (isSvg(file)) {
        src = fixSvgDataUrl(fr.result);
        if (!src) {
          showToast(t("SVG 图片解析失败，请重试"));
          return;
        }
      } else {
        src = fr.result;
      }
      var img = new Image();
      img.onload = function () {
        state.img = img;
        state.name = file.name;
        state.size = file.size;
        fileInfo.textContent = t("{name} · {size}", { name: file.name, size: formatSize(file.size) });
        showToast(t("图片已加载，正在生成图标…"));
        regenerate();
      };
      img.onerror = function () {
        showToast(t("图片加载失败，请更换文件重试"));
      };
      img.src = src;
    };
    if (isSvg(file)) fr.readAsText(file);
    else fr.readAsDataURL(file);
  }

  /* SVG 缺少固有尺寸（或使用百分比）时注入 512×512，避免 canvas 绘制失败 */
  function fixSvgDataUrl(text) {
    try {
      var doc = new DOMParser().parseFromString(text, "image/svg+xml");
      var svg = doc.querySelector("svg");
      if (!svg) return null;
      var w = svg.getAttribute("width") || "";
      var h = svg.getAttribute("height") || "";
      if (!w || /%|auto/i.test(w)) svg.setAttribute("width", "512");
      if (!h || /%|auto/i.test(h)) svg.setAttribute("height", "512");
      var xml = new XMLSerializer().serializeToString(doc.documentElement);
      return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
    } catch (e) {
      return null;
    }
  }

  /* ---------- 图标生成 ---------- */
  function releaseUrls() {
    Object.keys(state.urls).forEach(function (k) {
      URL.revokeObjectURL(state.urls[k]);
    });
    state.urls = {};
  }

  function regenerate() {
    if (!state.img) return;
    clearError();
    releaseUrls();
    state.pngs = {};
    var chain = Promise.resolve();
    SIZES.forEach(function (s) {
      chain = chain.then(function () {
        return renderPng(s).then(function (buf) {
          state.pngs[s] = buf;
          state.urls[s] = URL.createObjectURL(new Blob([buf], { type: "image/png" }));
        });
      });
    });
    chain.then(function () {
      editor.hidden = false;
      renderPreview();
      updateCode();
    }).catch(function (err) {
      showError(t("图标生成失败：{msg}", { msg: err.message }));
    });
  }

  function drawIcon(canvas, size) {
    var ctx = canvas.getContext("2d");
    var img = state.img;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = bgColor.value || "#ffffff";
    ctx.fillRect(0, 0, size, size);
    var iw = img.naturalWidth || img.width;
    var ih = img.naturalHeight || img.height;
    var scale = Math.max(size / iw, size / ih);
    var w = Math.round(iw * scale);
    var h = Math.round(ih * scale);
    ctx.drawImage(img, Math.round((size - w) / 2), Math.round((size - h) / 2), w, h);
  }

  function renderPng(size) {
    return new Promise(function (resolve, reject) {
      var canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      drawIcon(canvas, size);
      canvas.toBlob(function (blob) {
        if (!blob) {
          reject(new Error("canvas export failed"));
          return;
        }
        readArrayBuffer(blob).then(resolve, reject);
      }, "image/png");
    });
  }

  function renderPreview() {
    previewBox.innerHTML = "";
    SIZES.forEach(function (s) {
      var cell = document.createElement("div");
      cell.className = "fg-cell";

      var box = document.createElement("div");
      box.className = "fg-imgbox";
      var img = document.createElement("img");
      img.src = state.urls[s];
      img.alt = "";
      var show = Math.min(s, 64);
      img.width = show;
      img.height = show;
      box.appendChild(img);

      var lab = document.createElement("div");
      lab.className = "fg-size";
      lab.textContent = s + " × " + s;

      var btn = document.createElement("button");
      btn.className = "fg-mini";
      btn.type = "button";
      btn.textContent = t("下载");
      btn.title = t("下载 {n}×{n} PNG", { n: s });
      btn.addEventListener("click", function () { downloadPng(s); });

      cell.appendChild(box);
      cell.appendChild(lab);
      cell.appendChild(btn);
      previewBox.appendChild(cell);
    });
  }

  /* ---------- manifest 与 HTML 代码 ---------- */
  function buildManifest() {
    return {
      name: siteName.value.trim() || "我的网站",
      short_name: shortName.value.trim() || "网站",
      theme_color: themeColor.value,
      background_color: bgColor.value,
      icons: [
        { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png" }
      ]
    };
  }

  function buildHtmlSnippet() {
    return '<link rel="icon" href="/favicon.ico" sizes="32x32">\n' +
      '<link rel="apple-touch-icon" href="/apple-touch-icon.png">\n' +
      '<link rel="manifest" href="/manifest.json">\n' +
      '<meta name="theme-color" content="' + themeColor.value + '">';
  }

  function updateCode() {
    htmlCode.textContent = buildHtmlSnippet();
  }

  [siteName, shortName, themeColor].forEach(function (el) {
    el.addEventListener("input", updateCode);
  });
  bgColor.addEventListener("input", function () {
    regenerate();
    updateCode();
  });

  /* ---------- 下载 ---------- */
  function pngName(s) {
    if (s === 180) return "apple-touch-icon.png";
    if (s === 192) return "icon-192.png";
    if (s === 512) return "icon-512.png";
    return "favicon-" + s + "x" + s + ".png";
  }

  function downloadPng(s) {
    if (!state.img) return;
    if (!state.pngs[s]) {
      showToast(t("图标正在生成中，请稍候"));
      return;
    }
    var name = pngName(s);
    downloadBlob(new Blob([state.pngs[s]], { type: "image/png" }), name);
    showToast(t("已下载：{name}", { name: name }));
  }

  /* ICO 容器：ICONDIR + 多个 ICONDIRENTRY + 内嵌 PNG 数据 */
  function buildIcoBytes() {
    var parts = ICO_SIZES.map(function (s) {
      return new Uint8Array(state.pngs[s]);
    });
    var total = 6 + 16 * ICO_SIZES.length;
    parts.forEach(function (p) { total += p.length; });

    var out = new Uint8Array(total);
    var dv = new DataView(out.buffer);
    dv.setUint16(0, 0, true);                        // reserved
    dv.setUint16(2, 1, true);                        // type: 1 = icon
    dv.setUint16(4, ICO_SIZES.length, true);         // image count

    var off = 6 + 16 * ICO_SIZES.length;
    for (var i = 0; i < ICO_SIZES.length; i++) {
      var s = ICO_SIZES[i];
      var data = parts[i];
      var e = 6 + i * 16;
      out[e] = s & 0xFF;                             // width
      out[e + 1] = s & 0xFF;                         // height
      out[e + 2] = 0;                                // palette colors
      out[e + 3] = 0;                                // reserved
      dv.setUint16(e + 4, 1, true);                  // color planes
      dv.setUint16(e + 6, 32, true);                 // bits per pixel
      dv.setUint32(e + 8, data.length, true);        // bytes in resource
      dv.setUint32(e + 12, off, true);               // image offset
      out.set(data, off);
      off += data.length;
    }
    return out;
  }

  document.getElementById("fgDlIco").addEventListener("click", function () {
    if (!state.img) return;
    try {
      downloadBlob(new Blob([buildIcoBytes()], { type: "image/x-icon" }), "favicon.ico");
      showToast(t("已下载：{name}", { name: "favicon.ico" }));
    } catch (err) {
      showToast(t("ICO 生成失败：{msg}", { msg: err.message }));
    }
  });

  document.getElementById("fgDlApple").addEventListener("click", function () { downloadPng(180); });
  document.getElementById("fgDl192").addEventListener("click", function () { downloadPng(192); });
  document.getElementById("fgDl512").addEventListener("click", function () { downloadPng(512); });

  document.getElementById("fgDlManifest").addEventListener("click", function () {
    if (!state.img) return;
    var json = JSON.stringify(buildManifest(), null, 2) + "\n";
    downloadBlob(new Blob([json], { type: "application/manifest+json" }), "manifest.json");
    showToast(t("已下载：{name}", { name: "manifest.json" }));
  });

  document.getElementById("fgCopyHtml").addEventListener("click", function () {
    if (!htmlCode.textContent) {
      showToast(t("请先上传图片生成引用代码"));
      return;
    }
    copyText(htmlCode.textContent, t("已复制 HTML 引用代码"));
  });

  document.getElementById("fgZip").addEventListener("click", function () {
    if (!state.img) return;
    var missing = [180, 192, 512].some(function (s) { return !state.pngs[s]; });
    if (missing) {
      showToast(t("图标正在生成中，请稍候"));
      return;
    }
    try {
      var files = [
        { name: "favicon.ico", data: buildIcoBytes() },
        { name: "apple-touch-icon.png", data: new Uint8Array(state.pngs[180]) },
        { name: "icon-192.png", data: new Uint8Array(state.pngs[192]) },
        { name: "icon-512.png", data: new Uint8Array(state.pngs[512]) },
        { name: "manifest.json", data: new TextEncoder().encode(JSON.stringify(buildManifest(), null, 2) + "\n") }
      ];
      downloadBlob(createZip(files), "favicon-package.zip");
      showToast(t("已开始下载 favicon-package.zip（{n} 个文件）", { n: files.length }));
    } catch (err) {
      showToast(t("ZIP 打包失败：{msg}", { msg: err.message }));
    }
  });

  document.getElementById("fgReset").addEventListener("click", function () {
    state.img = null;
    state.name = "";
    state.size = 0;
    releaseUrls();
    state.pngs = {};
    previewBox.innerHTML = "";
    htmlCode.textContent = "";
    fileInfo.textContent = "";
    editor.hidden = true;
    clearError();
  });

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
    toastTimer = setTimeout(function () {
      toastEl.classList.remove("show");
    }, 2200);
  }

  function readArrayBuffer(blob) {
    if (blob.arrayBuffer) return blob.arrayBuffer();
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { resolve(fr.result); };
      fr.onerror = function () { reject(fr.error); };
      fr.readAsArrayBuffer(blob);
    });
  }

  function formatSize(bytes) {
    if (bytes >= 1024 * 1024 * 1024) return t("{v} {u}", { v: (bytes / 1024 / 1024 / 1024).toFixed(2), u: t("GB") });
    if (bytes >= 1024 * 1024) return t("{v} {u}", { v: (bytes / 1024 / 1024).toFixed(2), u: t("MB") });
    if (bytes >= 1024) return t("{v} {u}", { v: (bytes / 1024).toFixed(1), u: t("KB") });
    return t("{v} {u}", { v: String(bytes), u: t("B") });
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
