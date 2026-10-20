/* ============================================================
   HTML实体编解码 - 工具页逻辑
   编码（仅必要字符 / 非ASCII / 全部）+ 解码（命名/十进制/十六进制）
   内置命名实体卡片，点击插入或复制
   ============================================================ */
(function () {
  "use strict";

  /* ---------- DOM ---------- */
  var modeRow = document.getElementById("heMode");
  var styleRow = document.getElementById("heStyle");
  var input = document.getElementById("heInput");
  var output = document.getElementById("heOutput");
  var btnEncode = document.getElementById("heEncode");
  var btnDecode = document.getElementById("heDecode");
  var btnClear = document.getElementById("heClear");
  var btnCopy = document.getElementById("heCopy");
  var btnSample = document.getElementById("heSample");
  var entitiesBox = document.getElementById("heEntities");
  var filter = document.getElementById("heFilter");
  var countEl = document.getElementById("heCount");

  /* ---------- 提示 ---------- */
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
    if (!text) { showToast(t("内容为空")); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () { showToast(t("已复制到剪贴板")); },
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
    try {
      document.execCommand("copy");
      showToast(t("已复制到剪贴板"));
    } catch (e) {
      showToast(t("复制失败，请手动复制"));
    }
    document.body.removeChild(ta);
  }

  /* ---------- 命名实体表（≥60） ---------- */
  var ENTITIES = [
    ["nbsp", " "], ["iexcl", "¡"], ["cent", "¢"], ["pound", "£"],
    ["curren", "¤"], ["yen", "¥"], ["brvbar", "¦"], ["sect", "§"],
    ["uml", "¨"], ["copy", "©"], ["ordf", "ª"], ["laquo", "«"],
    ["not", "¬"], ["shy", "­"], ["reg", "®"], ["macr", "¯"],
    ["deg", "°"], ["plusmn", "±"], ["sup2", "²"], ["sup3", "³"],
    ["acute", "´"], ["micro", "µ"], ["para", "¶"], ["middot", "·"],
    ["cedil", "¸"], ["sup1", "¹"], ["ordm", "º"], ["raquo", "»"],
    ["frac14", "¼"], ["frac12", "½"], ["frac34", "¾"], ["iquest", "¿"],
    ["Agrave", "À"], ["Aacute", "Á"], ["Acirc", "Â"], ["Atilde", "Ã"],
    ["Auml", "Ä"], ["Aring", "Å"], ["AElig", "Æ"], ["Ccedil", "Ç"],
    ["Egrave", "È"], ["Eacute", "É"], ["Ecirc", "Ê"], ["Euml", "Ë"],
    ["Igrave", "Ì"], ["Iacute", "Í"], ["Icirc", "Î"], ["Iuml", "Ï"],
    ["Ntilde", "Ñ"], ["Ograve", "Ò"], ["Oacute", "Ó"], ["Ocirc", "Ô"],
    ["Otilde", "Õ"], ["Ouml", "Ö"], ["times", "×"], ["Oslash", "Ø"],
    ["Ugrave", "Ù"], ["Uacute", "Ú"], ["Ucirc", "Û"], ["Uuml", "Ü"],
    ["Yacute", "Ý"], ["THORN", "Þ"], ["szlig", "ß"], ["agrave", "à"],
    ["aacute", "á"], ["acirc", "â"], ["atilde", "ã"], ["auml", "ä"],
    ["aring", "å"], ["aelig", "æ"], ["ccedil", "ç"], ["egrave", "è"],
    ["eacute", "é"], ["ecirc", "ê"], ["euml", "ë"], ["igrave", "ì"],
    ["iacute", "í"], ["icirc", "î"], ["iuml", "ï"], ["eth", "ð"],
    ["ntilde", "ñ"], ["ograve", "ò"], ["oacute", "ó"], ["ocirc", "ô"],
    ["otilde", "õ"], ["ouml", "ö"], ["divide", "÷"], ["oslash", "ø"],
    ["ugrave", "ù"], ["uacute", "ú"], ["ucirc", "û"], ["uuml", "ü"],
    ["yacute", "ý"], ["thorn", "þ"], ["yuml", "ÿ"], ["amp", "&"],
    ["lt", "<"], ["gt", ">"], ["quot", "\""], ["apos", "'"],
    ["trade", "™"], ["hellip", "…"], ["mdash", "—"], ["ndash", "–"],
    ["lsquo", "‘"], ["rsquo", "’"], ["ldquo", "“"], ["rdquo", "”"],
    ["sbquo", "‚"], ["bdquo", "„"], ["dagger", "†"], ["Dagger", "‡"],
    ["bull", "•"], ["permil", "‰"], ["euro", "€"], ["larr", "←"],
    ["uarr", "↑"], ["rarr", "→"], ["darr", "↓"], ["harr", "↔"],
    ["lArr", "⇐"], ["uArr", "⇑"], ["rArr", "⇒"], ["dArr", "⇓"],
    ["hArr", "⇔"], ["ne", "≠"], ["le", "≤"], ["ge", "≥"],
    ["sum", "∑"], ["prod", "∏"], ["int", "∫"], ["part", "∂"],
    ["radic", "√"], ["infin", "∞"], ["asymp", "≈"], ["cong", "≅"],
    ["equiv", "≡"], ["sub", "⊂"], ["sup", "⊃"], ["sube", "⊆"],
    ["supe", "⊇"], ["isin", "∈"], ["notin", "∉"], ["cap", "∩"],
    ["cup", "∪"], ["forall", "∀"], ["exist", "∃"], ["empty", "∅"],
    ["nabla", "∇"], ["minus", "−"], ["lowast", "∗"], ["prop", "∝"],
    ["ang", "∠"], ["and", "∧"], ["or", "∨"], ["loz", "◊"],
    ["spades", "♠"], ["clubs", "♣"], ["hearts", "♥"], ["diams", "♦"]
  ];

  var NAMED = {};      /* name -> char */
  var CHAR2NAME = {};  /* char -> name（取首个） */
  ENTITIES.forEach(function (pair) {
    var name = pair[0], ch = pair[1];
    NAMED[name] = ch;
    if (!CHAR2NAME[ch]) CHAR2NAME[ch] = name;
  });

  /* ---------- 编码 / 解码 ---------- */
  function numEntity(code, hex) {
    if (hex) return "&#x" + code.toString(16).toUpperCase() + ";";
    return "&#" + code + ";";
  }

  function encodeText(str, mode, hex) {
    var out = "";
    for (var i = 0; i < str.length; i++) {
      var ch = str.charAt(i);
      var code = str.charCodeAt(i);
      if (mode === "necessary" || mode === "nonascii") {
        if (ch === "&") out += "&amp;";
        else if (ch === "<") out += "&lt;";
        else if (ch === ">") out += "&gt;";
        else if (ch === "\"") out += "&quot;";
        else if (ch === "'") out += "&apos;";
        else if (mode === "nonascii" && code > 127) out += numEntity(code, hex);
        else out += ch;
      } else { /* all */
        if (CHAR2NAME[ch]) out += "&" + CHAR2NAME[ch] + ";";
        else if (code > 127) out += numEntity(code, hex);
        else out += ch;
      }
    }
    return out;
  }

  function decodeText(str) {
    return str.replace(
      /&(?:#x([0-9a-fA-F]+)|#(\d+)|([a-zA-Z][a-zA-Z0-9]*));/g,
      function (m, hex, dec, name) {
        if (hex) return String.fromCharCode(parseInt(hex, 16));
        if (dec) return String.fromCharCode(parseInt(dec, 10));
        if (name && Object.prototype.hasOwnProperty.call(NAMED, name)) {
          return NAMED[name];
        }
        return m; /* 未识别的实体原样保留 */
      }
    );
  }

  function radioValue(row) {
    var checked = row.querySelector("input:checked");
    return checked ? checked.value : "";
  }

  function setOutput(text) {
    output.textContent = text;
  }

  /* ---------- 命名实体卡片 ---------- */
  function renderEntities(keyword) {
    keyword = (keyword || "").trim().toLowerCase();
    entitiesBox.innerHTML = "";
    var shown = 0;
    ENTITIES.forEach(function (pair) {
      var name = pair[0], ch = pair[1];
      if (keyword && name.toLowerCase().indexOf(keyword) === -1) return;
      shown++;
      var card = document.createElement("div");
      card.className = "he-entity";
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.title = "点击插入 &" + name + ";";

      var gly = document.createElement("div");
      gly.className = "gly";
      gly.textContent = ch === " " ? "␣" : ch;

      var ent = document.createElement("div");
      ent.className = "ent";
      ent.innerHTML = "&amp;" + name + ";";

      card.appendChild(gly);
      card.appendChild(ent);

      card.addEventListener("click", function () { insertEntity(name); });
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          insertEntity(name);
        }
      });
      entitiesBox.appendChild(card);
    });
    if (countEl) {
      countEl.textContent = keyword
        ? "匹配 " + shown + " / " + ENTITIES.length + " 个"
        : "共 " + ENTITIES.length + " 个";
    }
  }

  function insertEntity(name) {
    var token = "&" + name + ";";
    var text = input.value;
    var start = input.selectionStart;
    var end = input.selectionEnd;
    if (start === null || start === undefined) {
      start = end = text.length;
    }
    input.value = text.slice(0, start) + token + text.slice(end);
    var pos = start + token.length;
    input.focus();
    try {
      input.setSelectionRange(pos, pos);
    } catch (e) { /* 某些浏览器只读时不支持，忽略 */ }
    showToast(t("已插入 {n}", { n: token }));
  }

  /* ---------- 事件 ---------- */
  btnEncode.addEventListener("click", function () {
    var mode = radioValue(modeRow) || "necessary";
    var hex = radioValue(styleRow) === "hex";
    setOutput(encodeText(input.value, mode, hex));
    showToast(t("编码完成"));
  });

  btnDecode.addEventListener("click", function () {
    setOutput(decodeText(input.value));
    showToast(t("解码完成"));
  });

  btnClear.addEventListener("click", function () {
    input.value = "";
    setOutput("");
    input.focus();
  });

  btnCopy.addEventListener("click", function () {
    copyText(output.textContent);
  });

  btnSample.addEventListener("click", function () {
    input.value =
      "价格 < 100 元 & 库存 > 0，含中文「测试」与符号 © ® ™ → ★。\n" +
      "Tom & Jerry 的 " + '"引号"' + " 与 '撇号' 需要转义。";
    setOutput("");
    input.focus();
    showToast(t("已载入示例"));
  });

  filter.addEventListener("input", function () {
    renderEntities(filter.value);
  });

  /* radio 高亮联动（与模板样式一致） */
  [modeRow, styleRow].forEach(function (row) {
    Array.prototype.forEach.call(row.querySelectorAll("label"), function (label) {
      label.addEventListener("click", function () {
        Array.prototype.forEach.call(row.querySelectorAll("label"), function (l) {
          l.classList.remove("checked");
        });
        label.classList.add("checked");
      });
    });
  });

  /* ---------- 初始化 ---------- */
  renderEntities("");
})();
