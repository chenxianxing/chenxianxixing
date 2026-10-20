/* ============================================================
   SVG压缩 - 工具页逻辑
   删除注释/声明/metadata/编辑器属性/空g、合并空白、数值精度
   字节数对比、复制、下载、格式化预览、拖入文件
   ============================================================ */
(function () {
  "use strict";

  /* ---------- DOM ---------- */
  var input = document.getElementById("svgcInput");
  var output = document.getElementById("svgcOutput");
  var dropWrap = document.getElementById("svgcDrop");
  var optComments = document.getElementById("svgcComments");
  var optDecl = document.getElementById("svgcDecl");
  var optMeta = document.getElementById("svgcMeta");
  var optEditor = document.getElementById("svgcEditor");
  var optEmpty = document.getElementById("svgcEmpty");
  var optWhitespace = document.getElementById("svgcWhitespace");
  var optDefault = document.getElementById("svgcDefault");
  var precisionSel = document.getElementById("svgcPrecision");
  var btnCompress = document.getElementById("svgcCompress");
  var btnFormat = document.getElementById("svgcFormat");
  var btnCopy = document.getElementById("svgcCopy");
  var btnDownload = document.getElementById("svgcDownload");
  var btnClear = document.getElementById("svgcClear");
  var btnSample = document.getElementById("svgcSample");
  var beforeEl = document.getElementById("svgcBefore");
  var afterEl = document.getElementById("svgcAfter");
  var savedEl = document.getElementById("svgcSaved");

  /* ---------- 提示 / 复制 ---------- */
  var toastEl = document.getElementById("toast");
  var toastTimer = null;
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 2000);
  }
  function copyText(text) {
    if (!text) { showToast(t("Content is empty")); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () { showToast(t("Copied to clipboard")); },
        function () { fallbackCopy(text); }
      );
    } else {
      fallbackCopy(text);
    }
  }
  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); showToast(t("Copied to clipboard")); }
    catch (e) { showToast(t("Copy failed, please copy manually")); }
    document.body.removeChild(ta);
  }

  function byteLen(s) {
    return new Blob([s]).size;
  }

  /* ---------- 压缩 ---------- */
  function roundNumbersInAttrs(str, prec) {
    var attrs = ["d", "points", "x", "y", "width", "height", "cx", "cy", "r",
      "rx", "ry", "x1", "y1", "x2", "y2", "dx", "dy", "viewBox", "offset",
      "transform", "gradientTransform", "patternTransform", "stroke-width",
      "stroke-dasharray", "stroke-dashoffset", "font-size", "letter-spacing"];
    attrs.forEach(function (name) {
      var re = new RegExp("(" + name + "\\s*=\\s*\")([^\"]*)(\")", "gi");
      str = str.replace(re, function (m, pre, val, post) {
        var rounded = val.replace(/-?\d*\.?\d+(?:[eE][-+]?\d+)?/g, function (num) {
          var n = Number(num);
          if (!isFinite(n)) return num;
          var s = n.toFixed(prec);
          if (s.indexOf(".") > -1) {
            s = s.replace(/0+$/, "").replace(/\.$/, "");
          }
          return s;
        });
        return pre + rounded + post;
      });
    });
    return str;
  }

  function compress(raw) {
    var s = raw;
    var prec = parseInt(precisionSel.value, 10);
    if (isNaN(prec) || prec < 0) prec = 2;

    if (optComments.checked) {
      s = s.replace(/<!--[\s\S]*?-->/g, "");
    }
    if (optDecl.checked) {
      s = s.replace(/<\?xml[\s\S]*?\?>/gi, "");
      s = s.replace(/<!DOCTYPE[\s\S]*?>/gi, "");
    }
    if (optMeta.checked) {
      s = s.replace(/<metadata[\s\S]*?<\/metadata>/gi, "");
      s = s.replace(/<title>[\s\S]*?<\/title>/gi, "");
      s = s.replace(/<desc>[\s\S]*?<\/desc>/gi, "");
    }
    if (optEditor.checked) {
      var editorAttrs = [
        /\s+inkscape:[a-zA-Z0-9_-]+="[^"]*"/g,
        /\s+sodipodi:[a-zA-Z0-9_-]+="[^"]*"/g,
        /\s+data-name="[^"]*"/g,
        /\s+xmlns:inkscape="[^"]*"/g,
        /\s+xmlns:sodipodi="[^"]*"/g,
        /\s+xmlns:dc="[^"]*"/g,
        /\s+xmlns:cc="[^"]*"/g,
        /\s+xmlns:rdf="[^"]*"/g,
        /\s+xmlns:svg="[^"]*"/g,
        /\s+xmlns:serif="[^"]*"/g,
        /\s+id="[^"]*"/g
      ];
      editorAttrs.forEach(function (re) { s = s.replace(re, ""); });
    }
    if (optDefault.checked) {
      s = s.replace(/\s+stroke-width="1"/g, "");
      s = s.replace(/\s+stroke-linecap="butt"/g, "");
      s = s.replace(/\s+stroke-linejoin="miter"/g, "");
      s = s.replace(/\s+fill="none"/g, "");
    }

    s = roundNumbersInAttrs(s, prec);

    if (optEmpty.checked) {
      /* 反复移除空 <g> 直到无变化 */
      var prev;
      do {
        prev = s;
        s = s.replace(/<g[^>]*>\s*<\/g>/gi, "");
      } while (s !== prev);
    }

    if (optWhitespace.checked) {
      s = s.replace(/<!--[\s\S]*?-->/g, ""); /* 二次保险 */
      s = s.replace(/>\s+</g, "><");
      s = s.replace(/\s+/g, " ");
      s = s.replace(/\s+\/>/g, "/>");
      s = s.replace(/\s+>/g, ">");
    }

    return s.trim();
  }

  function runCompress() {
    var raw = input.value;
    if (raw.trim() === "") { showToast(t("Please enter SVG content first")); return; }
    var before = byteLen(raw);
    var result = compress(raw);
    var after = byteLen(result);
    output.textContent = result;
    beforeEl.textContent = String(before);
    afterEl.textContent = String(after);
    var saved = before > 0 ? Math.round((1 - after / before) * 100) : 0;
    savedEl.textContent = (saved > 0 ? saved : 0) + "%";
    showToast(t("Compression complete"));
  }

  /* ---------- 格式化预览 ---------- */
  function formatSVG(svg) {
    var pretty = svg.replace(/>\s*</g, ">\n<");
    var lines = pretty.split("\n");
    var indent = 0;
    var out = [];
    lines.forEach(function (rawLine) {
      var line = rawLine.trim();
      if (line === "") return;
      var isClose = /^<\//.test(line);
      var isSelf = /\/>$/.test(line);
      var isOpen = /^<[^/!?][^>]*[^\/]>/.test(line);
      if (isClose) indent = Math.max(0, indent - 1);
      out.push(new Array(indent + 1).join("  ") + line);
      if (isOpen && !isSelf) indent++;
    });
    return out.join("\n");
  }

  function runFormat() {
    var raw = input.value;
    if (raw.trim() === "") { showToast(t("Please enter SVG content first")); return; }
    output.textContent = formatSVG(raw);
    showToast(t("Formatted preview (uncompressed)"));
  }

  /* ---------- 下载 ---------- */
  function download() {
    var text = output.textContent;
    if (!text) { showToast(t("Nothing to download")); return; }
    var blob = new Blob([text], { type: "image/svg+xml;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "compressed.svg";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    showToast(t("Downloaded compressed.svg"));
  }

  /* ---------- 拖拽载入 ---------- */
  function handleFile(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (e) {
      input.value = String(e.target.result);
      showToast(t("Loaded {n}", { n: file.name }));
    };
    reader.readAsText(file);
  }

  dropWrap.addEventListener("dragover", function (e) {
    e.preventDefault();
    dropWrap.classList.add("dragover");
    input.classList.add("dragover");
  });
  dropWrap.addEventListener("dragleave", function (e) {
    e.preventDefault();
    dropWrap.classList.remove("dragover");
    input.classList.remove("dragover");
  });
  dropWrap.addEventListener("drop", function (e) {
    e.preventDefault();
    dropWrap.classList.remove("dragover");
    input.classList.remove("dragover");
    var file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  /* ---------- 事件 ---------- */
  btnCompress.addEventListener("click", runCompress);
  btnFormat.addEventListener("click", runFormat);
  btnCopy.addEventListener("click", function () { copyText(output.textContent); });
  btnDownload.addEventListener("click", download);
  btnClear.addEventListener("click", function () {
    input.value = "";
    output.textContent = "";
    beforeEl.textContent = "0";
    afterEl.textContent = "0";
    savedEl.textContent = "0%";
    input.focus();
  });
  btnSample.addEventListener("click", function () {
    input.value =
      '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n' +
      '<!-- sample icon -->\n' +
      '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n' +
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="64.000000" height="64.000000" viewBox="0 0 64 64">\n' +
      '  <metadata><rdf:RDF><cc:Work></cc:Work></rdf:RDF></metadata>\n' +
      '<title>Sample</title>\n' +
      '<desc>A sample circle</desc>\n' +
      '  <g inkscape:groupmode="layer" data-name="layer1">\n' +
      '    <g>\n' +
      '      <circle cx="32.000000" cy="32.000000" r="20.500000" fill="#2563eb" stroke-width="1"/>\n' +
      '    </g>\n' +
      '    <path d="M 10.000000 10.000000 L 54.000000 54.000000" stroke="#10b981"/>\n' +
      '  </g>\n' +
      '</svg>';
    output.textContent = "";
    beforeEl.textContent = "0";
    afterEl.textContent = "0";
    savedEl.textContent = "0%";
    input.focus();
    showToast(t("Sample loaded"));
  });

  /* ---------- 初始化 ---------- */
  beforeEl.textContent = "0";
  afterEl.textContent = "0";
  savedEl.textContent = "0%";
})();
