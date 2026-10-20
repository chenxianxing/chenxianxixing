/* ============================================================
   Mermaid 在线编辑器 - 工具页逻辑
   依赖：../assets/vendor/mermaid.min.js (v10 API)
   ============================================================ */
(function () {
  "use strict";

  var input = document.getElementById("mmInput");
  var svgWrap = document.getElementById("svgWrap");
  var preview = document.getElementById("preview");
  var errorBox = document.getElementById("mmError");
  var themeRow = document.getElementById("themeRow");

  if (typeof window.mermaid === "undefined") {
    errorBox.hidden = false;
    errorBox.textContent = t("Failed to load the Mermaid library. Please check your connection or the local asset mermaid.min.js.");
    return;
  }

  var theme = "default";
  var scale = 1;
  var renderSeq = 0;
  var renderTimer = null;
  var lastSvg = "";

  function initMermaid() {
    try {
      window.mermaid.initialize({
        startOnLoad: false,
        theme: theme,
        securityLevel: "strict"
      });
    } catch (e) {
      errorBox.hidden = false;
      errorBox.textContent = t("Init failed: ") + e.message;
    }
  }

  function showError(msg) {
    errorBox.hidden = false;
    errorBox.textContent = t("Render failed: ") + msg;
  }

  function clearError() {
    errorBox.hidden = true;
    errorBox.textContent = "";
  }

  function render() {
    var text = input.value.trim();
    if (!text) {
      svgWrap.innerHTML = "";
      lastSvg = "";
      preview.classList.remove("has-svg");
      clearError();
      return;
    }
    var id = "mmd-" + (++renderSeq);
    window.mermaid.render(id, text).then(function (res) {
      lastSvg = res.svg;
      svgWrap.innerHTML = lastSvg;
      preview.classList.add("has-svg");
      applyScale();
      clearError();
    }).catch(function (err) {
      var msg = (err && err.message) ? err.message : String(err);
      showError(msg);
      svgWrap.innerHTML = "";
      lastSvg = "";
      preview.classList.remove("has-svg");
    });
  }

  function scheduleRender() {
    if (renderTimer) clearTimeout(renderTimer);
    renderTimer = setTimeout(render, 500);
  }

  function applyScale() {
    svgWrap.style.transform = "scale(" + scale + ")";
  }

  /* ---------- 示例 ---------- */
  var SAMPLES = {
    flowchart: "flowchart TD\n  A[Start] --> B{Decision}\n  B -->|Yes| C[Execute]\n  B -->|No| D[End]\n  C --> D",
    sequence: "sequenceDiagram\n  participant User\n  participant System\n  User->>System: Login request\n  System-->>User: Return token\n  User->>System: Query data\n  System-->>User: Return result",
    class: "classDiagram\n  class Animal {\n    +String name\n    +eat()\n  }\n  class Dog {\n    +bark()\n  }\n  Animal <|-- Dog",
    er: "erDiagram\n  CUSTOMER ||--o{ ORDER : places\n  ORDER ||--|{ LINE_ITEM : contains\n  CUSTOMER { \n    int id \n    string name \n  }",
    gantt: "gantt\n  title Project Schedule\n  dateFormat YYYY-MM-DD\n  section Design\n  Requirements: a1, 2024-01-01, 7d\n  Prototype: a2, after a1, 5d\n  section Development\n  Coding: b1, after a2, 10d\n  Testing: b2, after b1, 5d",
    mindmap: "mindmap\n  root((Core Topic))\n    Branch A\n      Item 1\n      Item 2\n    Branch B\n      Item 3\n      Item 4",
    pie: 'pie title Usage Share\n  \"Plan A\" : 40\n  \"Plan B\" : 25\n  \"Plan C\" : 20\n  \"Other\" : 15'
  };

  function loadSample(key) {
    if (SAMPLES[key]) {
      input.value = SAMPLES[key];
      render();
    }
  }

  /* ---------- 事件 ---------- */
  input.addEventListener("input", scheduleRender);

  document.getElementById("btnRender").addEventListener("click", render);

  document.getElementById("btnClear").addEventListener("click", function () {
    input.value = "";
    svgWrap.innerHTML = "";
    lastSvg = "";
    preview.classList.remove("has-svg");
    clearError();
    input.focus();
    showToast(t("Cleared"));
  });

  document.getElementById("btnCopy").addEventListener("click", function () {
    if (!input.value) {
      showToast(t("Code is empty"));
      return;
    }
    copyText(input.value, t("Code copied"));
  });

  document.getElementById("btnSample").addEventListener("click", function () {
    loadSample("flowchart");
    showToast(t("Sample loaded"));
  });

  Array.prototype.forEach.call(document.querySelectorAll("[data-sample]"), function (btn) {
    btn.addEventListener("click", function () {
      loadSample(btn.getAttribute("data-sample"));
    });
  });

  /* 缩放控制 */
  document.getElementById("btnZoomIn").addEventListener("click", function () {
    scale = Math.min(scale + 0.2, 4);
    applyScale();
  });
  document.getElementById("btnZoomOut").addEventListener("click", function () {
    scale = Math.max(scale - 0.2, 0.2);
    applyScale();
  });
  document.getElementById("btnZoomReset").addEventListener("click", function () {
    scale = 1;
    applyScale();
  });
  document.getElementById("btnFit").addEventListener("click", function () {
    var svgEl = svgWrap.querySelector("svg");
    if (!svgEl) {
      scale = 1;
      applyScale();
      return;
    }
    var pw = preview.clientWidth - 32;
    var sw = svgEl.getBoundingClientRect().width / scale;
    if (sw > 0) {
      scale = Math.max(0.2, Math.min(4, pw / sw));
      applyScale();
    }
  });

  /* 主题切换 */
  Array.prototype.forEach.call(themeRow.querySelectorAll("label"), function (label) {
    label.addEventListener("click", function () {
      Array.prototype.forEach.call(themeRow.querySelectorAll("label"), function (l) {
        l.classList.remove("checked");
      });
      label.classList.add("checked");
      theme = themeRow.querySelector("input:checked").value;
      initMermaid();
      render();
    });
  });

  /* 下载 SVG */
  document.getElementById("btnSvg").addEventListener("click", function () {
    if (!lastSvg) {
      showToast(t("Nothing to export yet"));
      return;
    }
    var blob = new Blob([lastSvg], { type: "image/svg+xml;charset=utf-8" });
    downloadBlob(blob, "mermaid.svg");
    showToast(t("SVG downloaded"));
  });

  /* 下载 PNG：SVG 字符串经 encodeURIComponent 编码以支持中文 */
  document.getElementById("btnPng").addEventListener("click", function () {
    if (!lastSvg) {
      showToast(t("Nothing to export yet"));
      return;
    }
    var encoded = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(lastSvg);
    var img = new Image();
    img.onload = function () {
      var w = img.width || 800;
      var h = img.height || 600;
      var canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      var ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(function (blob) {
        if (!blob) {
          showToast(t("Export failed"));
          return;
        }
        downloadBlob(blob, "mermaid.png");
        showToast(t("PNG downloaded"));
      }, "image/png");
    };
    img.onerror = function () {
      showToast(t("Export failed"));
    };
    img.src = encoded;
  });

  /* ---------- 工具函数 ---------- */
  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function copyText(text, msg) {
    function done() {
      showToast(msg);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () {
        fallbackCopy(text);
        done();
      });
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
    }, 2000);
  }

  /* ---------- 启动 ---------- */
  initMermaid();
  input.value = SAMPLES.flowchart;
  render();
})();
