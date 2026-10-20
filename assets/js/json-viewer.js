/* ============================================================
  JSON数据工作台 - 工具页逻辑
   校验（行列号）/ 树形视图 / 路径查询 / 复制值·路径
   ============================================================ */
(function () {
  "use strict";

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
    } else { fallbackCopy(text); done(); }
  }
  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch (e) { /* ignore */ }
    document.body.removeChild(ta);
  }

  var jvInput = document.getElementById("jvInput");
  var jvTree = document.getElementById("jvTree");
  var jvError = document.getElementById("jvError");
  var jvStat = document.getElementById("jvStat");
  var pathQuery = document.getElementById("pathQuery");

  /* ---------- 错误信息 → 行列号 ---------- */
  function locateError(text, err) {
    var msg = err.message || String(err);
    var posMatch = msg.match(/position\s+(\d+)/i);
    if (posMatch) {
      var pos = parseInt(posMatch[1], 10);
      var line = 1, col = 1;
      for (var i = 0; i < pos && i < text.length; i++) {
        if (text[i] === "\n") { line++; col = 1; } else { col++; }
      }
      return "JSON 语法错误：第 " + line + " 行第 " + col + " 列附近。" + msg;
    }
    return "JSON 解析失败：" + msg;
  }

  /* ---------- 渲染树 ---------- */
  function buildNode(value, path, keyLabel) {
    var node = document.createElement("div");
    node.className = "jt-node";
    var row = document.createElement("div");
    row.className = "jt-row";
    var caret = document.createElement("span");
    caret.className = "jt-caret";

    var isContainer = value !== null && typeof value === "object";
    if (isContainer) {
      var isArr = Array.isArray(value);
      var count = isArr ? value.length : Object.keys(value).length;
      caret.textContent = "▾";
      caret.classList.add("open");
      row.appendChild(caret);
      if (keyLabel !== null) {
        var k = document.createElement("span"); k.className = "jt-key"; k.textContent = keyLabel;
        row.appendChild(k); row.appendChild(document.createTextNode(": "));
      }
      var badge = document.createElement("span");
      badge.className = "badge " + (isArr ? "blue" : "green");
      badge.textContent = (isArr ? "数组 " : "对象 ") + count + (isArr ? " 项" : " 键");
      row.appendChild(badge);

      var children = document.createElement("div");
      children.className = "jt-children";
      if (isArr) {
        for (var i = 0; i < value.length; i++) children.appendChild(buildNode(value[i], path + "[" + i + "]", null));
      } else {
        Object.keys(value).forEach(function (kk) {
          children.appendChild(buildNode(value[kk], path + "." + kk, kk));
        });
      }
      caret.addEventListener("click", function () {
        var collapsed = node.classList.toggle("collapsed");
        caret.textContent = collapsed ? "▸" : "▾";
      });
      node.appendChild(row);
      node.appendChild(children);
    } else {
      caret.textContent = "·";
      caret.classList.add("leaf");
      row.appendChild(caret);
      if (keyLabel !== null) {
        var k2 = document.createElement("span"); k2.className = "jt-key"; k2.textContent = keyLabel;
        row.appendChild(k2); row.appendChild(document.createTextNode(": "));
      }
      var v = document.createElement("span");
      if (typeof value === "string") { v.className = "jt-str"; v.textContent = '"' + value + '"'; }
      else if (typeof value === "number") { v.className = "jt-num"; v.textContent = String(value); }
      else if (typeof value === "boolean") { v.className = "jt-bool"; v.textContent = String(value); }
      else { v.className = "jt-null"; v.textContent = "null"; }
      row.appendChild(v);
      node.appendChild(row);
    }

    var acts = document.createElement("span");
    acts.className = "jt-acts";
    var b1 = document.createElement("button"); b1.className = "jt-btn"; b1.textContent = "复制值";
    b1.addEventListener("click", function (e) { e.stopPropagation(); copyText(JSON.stringify(value, null, 2), "已复制节点值"); });
    var b2 = document.createElement("button"); b2.className = "jt-btn"; b2.textContent = "复制路径";
    b2.addEventListener("click", function (e) { e.stopPropagation(); copyText(path, "已复制路径"); });
    acts.appendChild(b1); acts.appendChild(b2);
    row.appendChild(acts);

    row.dataset.path = path;
    node.dataset.path = path;
    return node;
  }

  function countNodes(value) {
    if (value === null || typeof value !== "object") return 1;
    var n = 1;
    if (Array.isArray(value)) { for (var i = 0; i < value.length; i++) n += countNodes(value[i]); }
    else { Object.keys(value).forEach(function (k) { n += countNodes(value[k]); }); }
    return n;
  }

  function renderTree(data) {
    jvTree.innerHTML = "";
    jvTree.appendChild(buildNode(data, "$", null));
    var nodes = countNodes(data);
    jvStat.textContent = "节点 " + nodes + " 个";
    if (nodes > 5000) {
      jvError.hidden = false;
      jvError.textContent = "JSON 节点较多（" + nodes + " 个），树形渲染可能略有卡顿，建议折叠后查看。";
    }
  }

  function parseAndRender() {
    var text = jvInput.value;
    jvError.hidden = true;
    if (!text.trim()) {
      jvTree.innerHTML = '<div class="empty-tip">在上方输入合法 JSON 后，这里会展示树形结构</div>';
      jvStat.textContent = "未解析";
      return;
    }
    var data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      jvError.hidden = false;
      jvError.textContent = locateError(text, e);
      jvStat.textContent = "解析失败";
      return;
    }
    renderTree(data);
  }

  /* ---------- 路径解析 ---------- */
  function canonicalPath(q) {
    q = (q || "").trim();
    if (q === "" || q === "$") return "$";
    if (q.charAt(0) === "$") q = q.slice(1);
    var re = /\[(\d+)\]|\.?([^.\[\]]+)/g;
    var m, segs = [];
    while ((m = re.exec(q)) !== null) {
      if (m[1] !== undefined) segs.push("[" + m[1] + "]");
      else segs.push("." + m[2]);
    }
    return "$" + segs.join("");
  }

  function locate() {
    var target = canonicalPath(pathQuery.value);
    var rows = jvTree.querySelectorAll(".jt-row");
    var found = null;
    Array.prototype.forEach.call(rows, function (row) {
      row.classList.remove("jt-hl");
      if (row.dataset.path === target) found = row;
    });
    if (found) {
      // 展开所有祖先
      var p = found.parentElement;
      while (p && p !== jvTree) {
        if (p.classList && p.classList.contains("jt-node")) p.classList.remove("collapsed");
        p = p.parentElement;
      }
      found.classList.add("jt-hl");
      found.scrollIntoView({ block: "center", behavior: "smooth" });
      showToast("已定位：" + target);
      setTimeout(function () { found.classList.remove("jt-hl"); }, 3000);
    } else {
      showToast("未找到该路径");
    }
  }

  function setAllCollapsed(collapsed) {
    var nodes = jvTree.querySelectorAll(".jt-node");
    Array.prototype.forEach.call(nodes, function (n) {
      if (n.querySelector(":scope > .jt-children")) {
        if (collapsed) n.classList.add("collapsed"); else n.classList.remove("collapsed");
        var c = n.querySelector(":scope > .jt-row > .jt-caret");
        if (c) c.textContent = collapsed ? "▸" : "▾";
      }
    });
  }

  /* ---------- 事件 ---------- */
  jvInput.addEventListener("input", parseAndRender);
  document.getElementById("btnFormat").addEventListener("click", function () {
    var text = jvInput.value.trim();
    if (!text) { showToast("请输入 JSON"); return; }
    try { jvInput.value = JSON.stringify(JSON.parse(text), null, 2); parseAndRender(); }
    catch (e) { jvError.hidden = false; jvError.textContent = locateError(text, e); }
  });
  document.getElementById("btnCompact").addEventListener("click", function () {
    var text = jvInput.value.trim();
    if (!text) { showToast("请输入 JSON"); return; }
    try { jvInput.value = JSON.stringify(JSON.parse(text)); parseAndRender(); }
    catch (e) { jvError.hidden = false; jvError.textContent = locateError(text, e); }
  });
  document.getElementById("btnExample").addEventListener("click", function () {
    jvInput.value = JSON.stringify({
      store: {
        book: [
          { category: "fiction", title: "示例书名", price: 9.9, inStock: true },
          { category: "science", title: "另一本书", price: 12.5, inStock: false }
        ],
        basket: [1, 2, 3],
        owner: null
      }
    }, null, 2);
    parseAndRender();
  });
  document.getElementById("btnClear").addEventListener("click", function () {
    jvInput.value = ""; parseAndRender();
  });
  document.getElementById("btnLocate").addEventListener("click", locate);
  pathQuery.addEventListener("keydown", function (e) { if (e.key === "Enter") locate(); });
  document.getElementById("btnExpand").addEventListener("click", function () { setAllCollapsed(false); });
  document.getElementById("btnCollapse").addEventListener("click", function () { setAllCollapsed(true); });

  if (!jvInput.value) {
    jvInput.value = JSON.stringify({ name: "张三", age: 18, tags: ["a", "b"], active: true, note: null }, null, 2);
    parseAndRender();
  }
})();
