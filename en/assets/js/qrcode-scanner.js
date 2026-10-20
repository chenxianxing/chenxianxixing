/* ============================================================
   二维码扫描器 - 工具页逻辑
   三种输入：图片文件 / 剪贴板粘贴 / 摄像头实时扫描
   依赖：../assets/vendor/jsqr.js (window.jsQR)
   ============================================================ */
(function () {
  "use strict";

  var hasJsQR = typeof window.jsQR === "function";

  var fileInput = document.getElementById("fileInput");
  var dropZone = document.getElementById("dropZone");
  var resultWrap = document.getElementById("resultWrap");
  var resType = document.getElementById("resType");
  var resSource = document.getElementById("resSource");
  var resDetail = document.getElementById("resDetail");
  var resRaw = document.getElementById("resRaw");
  var historyBlock = document.getElementById("historyBlock");
  var historyList = document.getElementById("historyList");
  var camVideo = document.getElementById("camVideo");
  var camCanvas = document.getElementById("camCanvas");
  var camStatus = document.getElementById("camStatus");
  var camWarn = document.getElementById("camWarn");

  var decodeCanvas = document.createElement("canvas");
  var dctx = decodeCanvas.getContext("2d", { willReadFrequently: true });
  var camDecodeCanvas = document.createElement("canvas");
  var camDecodeCtx = camDecodeCanvas.getContext("2d", { willReadFrequently: true });
  var camCtx = camCanvas.getContext("2d");

  var lastText = "";
  var history = [];
  var currentPane = "paneFile";
  var scanning = false;
  var camStream = null;
  var rafId = null;

  /* ---------- 标签页切换 ---------- */
  var tabs = [document.getElementById("tabFile"), document.getElementById("tabClip"), document.getElementById("tabCam")];
  tabs.forEach(function (btn) {
    btn.addEventListener("click", function () { switchPane(btn.getAttribute("data-pane")); });
  });

  function switchPane(name) {
    currentPane = name;
    ["paneFile", "paneClip", "paneCam"].forEach(function (id) {
      document.getElementById(id).hidden = (id !== name);
    });
    tabs.forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-pane") === name);
    });
    if (name !== "paneCam") stopCam();
  }

  /* ---------- 文件选择 / 拖拽 ---------- */
  dropZone.addEventListener("click", function () { fileInput.click(); });
  dropZone.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); }
  });
  dropZone.addEventListener("dragover", function (e) { e.preventDefault(); dropZone.classList.add("dragover"); });
  dropZone.addEventListener("dragleave", function () { dropZone.classList.remove("dragover"); });
  dropZone.addEventListener("drop", function (e) {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) decodeFile(f);
  });
  fileInput.addEventListener("change", function () {
    if (fileInput.files && fileInput.files[0]) decodeFile(fileInput.files[0]);
  });

  /* ---------- 剪贴板粘贴 ---------- */
  document.addEventListener("paste", function (e) {
    var cd = e.clipboardData || (window.clipboardData);
    if (!cd) return;
    var items = cd.items;
    if (!items) return;
    for (var i = 0; i < items.length; i++) {
      if (items[i].type && items[i].type.indexOf("image") === 0) {
        var file = items[i].getAsFile();
        if (file) {
          switchPane("paneClip");
          decodeFile(file);
          showToast(t("Image read from clipboard"));
        }
        return;
      }
    }
  });

  /* ---------- 解码图片 ---------- */
  function decodeFile(file) {
    if (!file.type || file.type.indexOf("image") !== 0) {
      showToast(t("Please select an image file"));
      return;
    }
    var reader = new FileReader();
    reader.onload = function (ev) {
      var img = new Image();
      img.onload = function () { scanImage(img, "Image"); };
      img.onerror = function () { showToast(t("Failed to decode the image")); };
      img.src = ev.target.result;
    };
    reader.onerror = function () { showToast(t("Failed to read the image")); };
    reader.readAsDataURL(file);
  }

  function scanImage(img, source) {
    if (!hasJsQR) { showToast(t("Scanner component failed to load")); return; }
    var w = img.naturalWidth || img.width;
    var h = img.naturalHeight || img.height;
    var scale = Math.min(1, 1280 / Math.max(w, h));
    var cw = Math.max(1, Math.round(w * scale));
    var ch = Math.max(1, Math.round(h * scale));
    decodeCanvas.width = cw;
    decodeCanvas.height = ch;
    dctx.drawImage(img, 0, 0, cw, ch);
    var idata;
    try {
      idata = dctx.getImageData(0, 0, cw, ch);
    } catch (e) {
      showToast(t("Failed to decode the image"));
      return;
    }
    var code = window.jsQR(idata.data, cw, ch);
    if (code && code.data) {
      handleResult(code.data, source);
    } else {
      showToast(t("No QR code detected, please try a clearer image"));
    }
  }

  /* ---------- 摄像头扫描 ---------- */
  document.getElementById("btnStartCam").addEventListener("click", startCam);
  document.getElementById("btnStopCam").addEventListener("click", function () {
    stopCam();
    camStatus.textContent = "";
  });

  function startCam() {
    if (!window.isSecureContext) {
      showCamWarn(t("Camera unavailable: the current context is not secure, so camera access is blocked. Please use the upload image or paste screenshot mode instead."));
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showCamWarn(t("The camera is not supported in this environment"));
      return;
    }
    camWarn.hidden = true;
    camStatus.textContent = t("Requesting camera permission...");
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      .then(function (stream) {
        camStream = stream;
        camVideo.srcObject = stream;
        camVideo.play();
        scanning = true;
        camStatus.textContent = t("Camera started, please aim the QR code at the viewfinder");
        scanFrame();
      })
      .catch(function (err) {
        showCamWarn(t("Unable to start the camera:") + (err && err.message ? err.message : t("Permission denied or device unavailable")));
      });
  }

  function stopCam() {
    scanning = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    if (camStream) {
      camStream.getTracks().forEach(function (tr) { tr.stop(); });
      camStream = null;
    }
    camVideo.srcObject = null;
  }

  function scanFrame() {
    if (!scanning) return;
    if (camVideo.readyState >= 2 && camVideo.videoWidth) {
      var vw = camVideo.videoWidth;
      var vh = camVideo.videoHeight;
      camCanvas.width = vw;
      camCanvas.height = vh;
      camCtx.clearRect(0, 0, vw, vh);
      camDecodeCanvas.width = vw;
      camDecodeCanvas.height = vh;
      camDecodeCtx.drawImage(camVideo, 0, 0, vw, vh);
      var idata = camDecodeCtx.getImageData(0, 0, vw, vh);
      var code = hasJsQR ? window.jsQR(idata.data, vw, vh) : null;
      if (code && code.location) {
        drawLocBox(camCtx, code.location);
        stopCam();
        handleResult(code.data, "Camera");
        return;
      }
    }
    rafId = requestAnimationFrame(scanFrame);
  }

  function drawLocBox(ctx, loc) {
    var pts = [loc.topLeftCorner, loc.topRightCorner, loc.bottomRightCorner, loc.bottomLeftCorner];
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.stroke();
  }

  function showCamWarn(msg) {
    camWarn.hidden = false;
    camWarn.textContent = msg;
    camStatus.textContent = "";
  }

  /* ---------- 分类与解析 ---------- */
  function classify(s) {
    if (/^WIFI:/i.test(s)) return "wifi";
    if (/^BEGIN:VCARD/i.test(s)) return "vcard";
    if (/^MECARD:/i.test(s)) return "mecard";
    if (/^(tel|callto):/i.test(s)) return "tel";
    if (/^mailto:/i.test(s)) return "mailto";
    if (/^smsto?:/i.test(s)) return "sms";
    if (/^geo:/i.test(s)) return "geo";
    if (/^https?:\/\//i.test(s)) return "url";
    return "text";
  }

  function parseWifi(str) {
    var body = str.replace(/^WIFI:/i, "").replace(/;*$/, "");
    var map = {};
    var i = 0;
    while (i < body.length) {
      var colon = body.indexOf(":", i);
      if (colon === -1) break;
      var key = body.substring(i, colon);
      i = colon + 1;
      var val = "";
      while (i < body.length) {
        var ch = body.charAt(i);
        if (ch === "\\") { val += body.charAt(i + 1) || ""; i += 2; continue; }
        if (ch === ";") { i++; break; }
        val += ch;
        i++;
      }
      map[key] = val;
    }
    return { type: map.T || "", ssid: map.S || "", password: map.P || "", hidden: map.H || "" };
  }

  function parseVcard(str) {
    var lines = str.split(/\r?\n/);
    var o = {};
    lines.forEach(function (ln) {
      var idx = ln.indexOf(":");
      if (idx === -1) return;
      var k = ln.substring(0, idx).replace(/;.*$/, "");
      var v = ln.substring(idx + 1);
      if (k === "FN") o.name = v;
      else if (k === "N") o.fullName = v;
      else if (k === "TEL") o.phone = v;
      else if (k === "EMAIL") o.email = v;
      else if (k === "ORG") o.org = v;
      else if (k === "TITLE") o.title = v;
      else if (k === "ADR") o.address = v;
    });
    return o;
  }

  function parseMecard(str) {
    var body = str.replace(/^MECARD:/i, "").replace(/;*$/, "");
    var fields = body.split(";");
    var o = {};
    fields.forEach(function (f) {
      var idx = f.indexOf(":");
      if (idx === -1) return;
      var k = f.substring(0, idx);
      var v = f.substring(idx + 1);
      if (k === "N") o.name = v;
      else if (k === "TEL") o.phone = v;
      else if (k === "EMAIL") o.email = v;
      else if (k === "ORG") o.org = v;
      else if (k === "ADR") o.address = v;
      else if (k === "TITLE") o.title = v;
    });
    return o;
  }

  /* ---------- 结果展示 ---------- */
  function typeLabel(t) {
    switch (t) {
      case "wifi": return tL("WiFi");
      case "vcard":
      case "mecard": return tL("vCard");
      case "tel": return tL("Phone");
      case "mailto": return tL("Email");
      case "sms": return tL("SMS");
      case "geo": return tL("Location");
      case "url": return tL("URL");
      default: return tL("Text");
    }
  }

  function sourceLabel(s) { return tL(s); }

  function detailCard(label, value) {
    var c = document.createElement("div");
    c.className = "result-card";
    var l = document.createElement("div");
    l.className = "label";
    l.textContent = tL(label);
    var v = document.createElement("div");
    v.className = "num";
    v.style.fontSize = "16px";
    v.style.color = "var(--text)";
    v.style.fontWeight = "600";
    v.style.fontVariantNumeric = "normal";
    v.textContent = value;
    c.appendChild(l);
    c.appendChild(v);
    return c;
  }

  function makeLink(href, label) {
    var a = document.createElement("a");
    a.className = "res-link";
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = tL(label);
    var wrap = document.createElement("div");
    wrap.style.marginTop = "12px";
    wrap.appendChild(a);
    return wrap;
  }

  function handleResult(text, source) {
    lastText = text;
    var type = classify(text);
    resType.textContent = typeLabel(type);
    resSource.textContent = sourceLabel(source);
    resDetail.innerHTML = "";

    if (type === "url") {
      resDetail.appendChild(makeLink(text, "Open Link"));
    } else if (type === "wifi") {
      var w = parseWifi(text);
      var grid = document.createElement("div");
      grid.className = "result-grid";
      if (w.ssid) grid.appendChild(detailCard("SSID", w.ssid));
      if (w.type) grid.appendChild(detailCard("Encryption", w.type));
      if (w.password) grid.appendChild(detailCard("Password", w.password));
      if (w.hidden) grid.appendChild(detailCard("Hidden Network", w.hidden === "true" ? tL("Yes") : tL("No")));
      resDetail.appendChild(grid);
    } else if (type === "vcard" || type === "mecard") {
      var o = type === "vcard" ? parseVcard(text) : parseMecard(text);
      var cg = document.createElement("div");
      cg.className = "result-grid";
      if (o.name) cg.appendChild(detailCard("Name", o.name));
      if (o.phone) cg.appendChild(detailCard("Phone", o.phone));
      if (o.email) cg.appendChild(detailCard("Email", o.email));
      if (o.org) cg.appendChild(detailCard("Organization", o.org));
      if (o.title) cg.appendChild(detailCard("Job Title", o.title));
      if (o.address) cg.appendChild(detailCard("Address", o.address));
      if (o.fullName && !o.name) cg.appendChild(detailCard("Name", o.fullName));
      resDetail.appendChild(cg);
    } else if (type === "tel" || type === "mailto" || type === "sms" || type === "geo") {
      var lbl = type === "tel" ? "Call" : type === "mailto" ? "Send Email" : type === "sms" ? "Send SMS" : "View Location";
      resDetail.appendChild(makeLink(text, lbl));
    }

    resRaw.textContent = text;
    resultWrap.hidden = false;
    addHistory(type, text, source);
  }

  /* ---------- 历史 ---------- */
  function addHistory(type, text, source) {
    history.unshift({ type: type, text: text, source: source, time: new Date() });
    if (history.length > 50) history.pop();
    renderHistory();
  }

  function formatTime(d) {
    var p = function (n) { return (n < 10 ? "0" : "") + n; };
    return p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds());
  }

  function renderHistory() {
    historyBlock.hidden = history.length === 0;
    historyList.innerHTML = "";
    history.forEach(function (item) {
      var row = document.createElement("div");
      row.className = "hist-item";
      var badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = typeLabel(item.type);
      var txt = document.createElement("span");
      txt.className = "hi-text";
      txt.title = item.text;
      txt.textContent = item.text;
      var time = document.createElement("span");
      time.className = "hi-time";
      time.textContent = formatTime(item.time);
      var copyBtn = document.createElement("button");
      copyBtn.className = "btn";
      copyBtn.type = "button";
      copyBtn.textContent = tL("Copy");
      copyBtn.addEventListener("click", function () { copyText(item.text, tL("Copied")); });
      row.appendChild(badge);
      row.appendChild(txt);
      row.appendChild(time);
      row.appendChild(copyBtn);
      historyList.appendChild(row);
    });
  }

  document.getElementById("btnClearHist").addEventListener("click", function () {
    history = [];
    renderHistory();
    showToast(t("Scan history cleared"));
  });

  /* ---------- 操作按钮 ---------- */
  document.getElementById("btnCopyResult").addEventListener("click", function () {
    if (!lastText) { showToast(t("Nothing to copy")); return; }
    copyText(lastText, t("Result copied"));
  });

  document.getElementById("btnRescan").addEventListener("click", function () {
    resultWrap.hidden = true;
    lastText = "";
    if (currentPane === "paneCam") startCam();
    else fileInput.click();
  });

  /* ---------- 多语言文案助手（中文原样返回，英文取翻译） ---------- */
  function tL(key) { return window.t ? window.t(key) : key; }

  /* ---------- 复制工具（带降级） ---------- */
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

  /* ---------- 轻提示 ---------- */
  var toastEl = document.getElementById("toast");
  var toastTimer = null;
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 2200);
  }
})();
