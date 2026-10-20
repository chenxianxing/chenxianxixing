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
    errorBox.textContent = t("Mermaid 库加载失败，请确认网络或本地资源 mermaid.min.js 可用。");
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
      errorBox.textContent = t("初始化失败：") + e.message;
    }
  }

  function showError(msg) {
    errorBox.hidden = false;
    errorBox.textContent = t("渲染失败：") + msg;
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
    flowchart: "flowchart TD\n  A[开始] --> B{判断条件}\n  B -->|是| C[执行操作]\n  B -->|否| D[结束]\n  C --> D",
    sequence: "sequenceDiagram\n  participant 用户\n  participant 系统\n  用户->>系统: 登录请求\n  系统-->>用户: 返回令牌\n  用户->>系统: 查询数据\n  系统-->>用户: 返回结果",
    class: "classDiagram\n  class 动物 {\n    +String 名称\n    +吃()\n  }\n  class 狗 {\n    +吠()\n  }\n  动物 <|-- 狗",
    er: "erDiagram\n  CUSTOMER ||--o{ ORDER : 下单\n  ORDER ||--|{ LINE_ITEM : 包含\n  CUSTOMER { \n    int id \n    string 姓名 \n  }",
    gantt: "gantt\n  title 项目排期\n  dateFormat YYYY-MM-DD\n  section 设计\n  需求: a1, 2024-01-01, 7d\n  原型: a2, after a1, 5d\n  section 开发\n  编码: b1, after a2, 10d\n  测试: b2, after b1, 5d",
    mindmap: "mindmap\n  root((核心主题))\n    分支A\n      子项1\n      子项2\n    分支B\n      子项3\n      子项4",
    pie: "pie title 使用占比\n  \"方案A\" : 40\n  \"方案B\" : 25\n  \"方案C\" : 20\n  \"其他\" : 15"
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
    showToast(t("已清空"));
  });

  document.getElementById("btnCopy").addEventListener("click", function () {
    if (!input.value) {
      showToast(t("代码为空"));
      return;
    }
    copyText(input.value, t("已复制代码"));
  });

  document.getElementById("btnSample").addEventListener("click", function () {
    loadSample("flowchart");
    showToast(t("已载入示例"));
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
      showToast(t("暂无可导出的图表"));
      return;
    }
    var blob = new Blob([lastSvg], { type: "image/svg+xml;charset=utf-8" });
    downloadBlob(blob, "mermaid.svg");
    showToast(t("已下载 SVG"));
  });

  /* 下载 PNG：SVG 字符串经 encodeURIComponent 编码以支持中文 */
  document.getElementById("btnPng").addEventListener("click", function () {
    if (!lastSvg) {
      showToast(t("暂无可导出的图表"));
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
          showToast(t("导出失败"));
          return;
        }
        downloadBlob(blob, "mermaid.png");
        showToast(t("已下载 PNG"));
      }, "image/png");
    };
    img.onerror = function () {
      showToast(t("导出失败"));
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
