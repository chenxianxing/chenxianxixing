/* ============================================================
   URL编码解码 - 工具页逻辑
   四种模式：encodeURIComponent / encodeURI / decodeURIComponent / decodeURI
   ============================================================ */
(function () {
  "use strict";

  var input = document.getElementById("ueInput");
  var output = document.getElementById("ueOutput");
  var modeRow = document.getElementById("modeRow");
  var autoConvert = document.getElementById("autoConvert");
  var errorBox = document.getElementById("ueError");

  function getMode() {
    var checked = modeRow.querySelector("input:checked");
    return checked ? checked.value : "encodeComponent";
  }

  /* radio 样式联动 */
  Array.prototype.forEach.call(modeRow.querySelectorAll("label"), function (label) {
    label.addEventListener("click", function () {
      Array.prototype.forEach.call(modeRow.querySelectorAll("label"), function (l) {
        l.classList.remove("checked");
      });
      label.classList.add("checked");
    });
  });

  function convert() {
    errorBox.hidden = true;
    var text = input.value;
    if (!text) {
      output.value = "";
      return;
    }
    var mode = getMode();
    try {
      switch (mode) {
        case "encodeComponent":
          output.value = encodeURIComponent(text);
          break;
        case "encodeURI":
          output.value = encodeURI(text);
          break;
        case "decodeComponent":
          output.value = decodeURIComponent(text);
          break;
        case "decodeURI":
          output.value = decodeURI(text);
          break;
      }
    } catch (e) {
      output.value = "";
      errorBox.hidden = false;
      errorBox.textContent = "Decoding failed: " + e.message + ". Please check whether the input is valid URL-encoded content, or try switching the decoding mode.";
    }
  }

  input.addEventListener("input", function () {
    if (autoConvert.checked) convert();
  });

  Array.prototype.forEach.call(modeRow.querySelectorAll("input"), function (radio) {
    radio.addEventListener("change", function () {
      if (autoConvert.checked || output.value === "") convert();
    });
  });

  document.getElementById("btnConvert").addEventListener("click", convert);

  document.getElementById("btnSwap").addEventListener("click", function () {
    if (!output.value) {
      showToast("The conversion result is empty");
      return;
    }
    input.value = output.value;
    output.value = "";
    input.focus();
    showToast("Result moved to the input box");
  });

  document.getElementById("btnCopy").addEventListener("click", function () {
    if (!output.value) {
      showToast("The conversion result is empty");
      return;
    }
    copyText(output.value, "Conversion result copied");
  });

  document.getElementById("btnClear").addEventListener("click", function () {
    input.value = "";
    output.value = "";
    errorBox.hidden = true;
    input.focus();
  });

  /* 复制工具（带降级） */
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

  /* 轻提示 */
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
})();
