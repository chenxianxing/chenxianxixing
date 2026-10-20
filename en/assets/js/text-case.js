/* ============================================================
   大小写转换 - 工具页逻辑
   多种模式可多选，按固定顺序依次应用
   ============================================================ */
(function () {
  "use strict";

  var input = document.getElementById("tcInput");
  var output = document.getElementById("tcOutput");
  var modesBox = document.getElementById("tcModes");

  /* 轻提示 */
  var toastEl = document.getElementById("toast");
  var toastTimer = null;
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 2000);
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

  /* 把字符串拆分为词（处理驼峰边界、符号、数字） */
  function toWords(s) {
    var step = s
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
      .replace(/([0-9])([A-Za-z])/g, "$1 $2")
      .replace(/([A-Za-z])([0-9])/g, "$1 $2");
    return step.split(/[^A-Za-z0-9]+/).filter(function (p) { return p.length > 0; });
  }

  /* 各转换函数：输入字符原样，返回新字符串 */
  var TRANSFORMS = {
    upper: function (s) { return s.toUpperCase(); },
    lower: function (s) { return s.toLowerCase(); },
    capitalize: function (s) {
      return s.replace(/(^|\s)([a-z])/g, function (_, pre, ch) { return pre + ch.toUpperCase(); });
    },
    sentence: function (s) {
      var lower = s.toLowerCase();
      return lower.replace(/(^|[.!?]\s+)([a-z])/g, function (_, pre, ch) { return pre + ch.toUpperCase(); });
    },
    toggle: function (s) {
      return s.replace(/[a-zA-Z]/g, function (ch) {
        return ch === ch.toUpperCase() ? ch.toLowerCase() : ch.toUpperCase();
      });
    },
    camel: function (s) {
      var words = toWords(s);
      return words.map(function (w, i) {
        w = w.toLowerCase();
        if (i === 0) return w;
        return w.charAt(0).toUpperCase() + w.slice(1);
      }).join("");
    },
    pascal: function (s) {
      return toWords(s).map(function (w) {
        w = w.toLowerCase();
        return w.charAt(0).toUpperCase() + w.slice(1);
      }).join("");
    },
    snake: function (s) {
      return toWords(s).map(function (w) { return w.toLowerCase(); }).join("_");
    },
    kebab: function (s) {
      return toWords(s).map(function (w) { return w.toLowerCase(); }).join("-");
    },
    constant: function (s) {
      return toWords(s).map(function (w) { return w.toUpperCase(); }).join("_");
    }
  };

  /* 应用顺序（与页面按钮顺序一致） */
  var ORDER = ["upper", "lower", "capitalize", "sentence", "toggle", "camel", "pascal", "snake", "kebab", "constant"];

  function getActive() {
    var active = [];
    Array.prototype.forEach.call(modesBox.querySelectorAll("input:checked"), function (cb) {
      active.push(cb.value);
    });
    // 按固定顺序排序，确保应用次序稳定
    return active.slice().sort(function (a, b) {
      return ORDER.indexOf(a) - ORDER.indexOf(b);
    });
  }

  function convert() {
    var text = input.value;
    if (!text) { output.value = ""; return; }
    var active = getActive();
    if (active.length === 0) { output.value = text; return; }
    var result = text;
    active.forEach(function (key) {
      var fn = TRANSFORMS[key];
      if (fn) result = fn(result);
    });
    output.value = result;
  }

  /* 按钮选中样式联动 */
  Array.prototype.forEach.call(modesBox.querySelectorAll(".tc-mode"), function (label) {
    label.addEventListener("click", function () {
      var cb = label.querySelector("input");
      cb.checked = !cb.checked;
      label.classList.toggle("active", cb.checked);
      convert();
    });
  });

  input.addEventListener("input", convert);

  document.getElementById("btnCopy").addEventListener("click", function () {
    if (!output.value) { showToast("The conversion result is empty"); return; }
    copyText(output.value, "Conversion result copied");
  });

  document.getElementById("btnSwap").addEventListener("click", function () {
    if (!output.value) { showToast("The conversion result is empty"); return; }
    input.value = output.value;
    output.value = "";
    input.focus();
    showToast("Result moved to the input box");
  });

  document.getElementById("btnClear").addEventListener("click", function () {
    input.value = "";
    output.value = "";
    input.focus();
  });

  convert();
})();
