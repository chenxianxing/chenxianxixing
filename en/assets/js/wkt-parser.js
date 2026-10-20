/* ============================================================
   WKT几何解析 - 工具页逻辑
   支持 POINT/LINESTRING/POLYGON 及其 MULTI 与 GEOMETRYCOLLECTION
   识别 Z/M/ZM；输出 bbox、坐标表、GeoJSON(RFC7946)、SVG预览
   ============================================================ */
(function () {
  "use strict";

  var inputEl = document.getElementById("wktInput");
  var errorEl = document.getElementById("wktError");
  var statsEl = document.getElementById("wktStats");
  var bboxWrap = document.getElementById("wktBboxWrap");
  var bboxEl = document.getElementById("wktBbox");
  var tableWrap = document.getElementById("wktTableWrap");
  var theadEl = document.getElementById("wktThead");
  var tbodyEl = document.getElementById("wktTbody");
  var svgEl = document.getElementById("wktSvg");
  var svgEmpty = document.getElementById("wktSvgEmpty");
  var jsonEl = document.getElementById("wktJson");
  var extraEl = document.getElementById("wktExtra");

  var SAMPLE = "GEOMETRYCOLLECTION (\n" +
    "  POINT (30 10),\n" +
    "  LINESTRING (30 10, 10 30, 40 40),\n" +
    "  POLYGON ((30 10, 40 40, 20 40, 10 20, 30 10)),\n" +
    "  MULTIPOINT ((10 40), (40 30)),\n" +
    "  MULTIPOLYGON (((30 20, 45 40, 10 40, 30 20)))\n)";

  /* ---------- 工具：顶层逗号切分（忽略括号内部逗号） ---------- */
  function splitTopLevel(s) {
    var parts = [], depth = 0, cur = "", i, c;
    for (i = 0; i < s.length; i++) {
      c = s[i];
      if (c === "(") depth++;
      else if (c === ")") depth--;
      if (c === "," && depth === 0) { parts.push(cur); cur = ""; }
      else cur += c;
    }
    if (cur.trim() !== "") parts.push(cur);
    return parts;
  }

  /* ---------- 提取括号内容（配平） ---------- */
  function extractBalanced(s) {
    var start = s.indexOf("(");
    if (start === -1) return null;
    var depth = 0;
    for (var i = start; i < s.length; i++) {
      if (s[i] === "(") depth++;
      else if (s[i] === ")") {
        depth--;
        if (depth === 0) return s.slice(start + 1, i);
      }
    }
    return null;
  }

  /* ---------- 解析一层坐标文本为节点树 ---------- */
  /* 节点：数字数组（一个点）或 数组（一组子节点） */
  function parseLevel(s) {
    s = s.trim();
    var parts = splitTopLevel(s);
    var nodes = [];
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i].trim();
      if (p === "") continue;
      if (p[0] === "(") {
        var inner = p.slice(1, p.length - 1);
        nodes.push(parseLevel(inner));
      } else {
        var tokens = p.split(/\s+/);
        var nums = tokens.map(Number);
        nodes.push(nums);
      }
    }
    return nodes;
  }

  var TYPE_MAP = {
    POINT: "Point", LINESTRING: "LineString", POLYGON: "Polygon",
    MULTIPOINT: "MultiPoint", MULTILINESTRING: "MultiLineString",
    MULTIPOLYGON: "MultiPolygon", GEOMETRYCOLLECTION: "GeometryCollection"
  };

  /* ---------- 按类型归一化坐标 ---------- */
  function normalize(typeRaw, nodes) {
    if (typeRaw === "POINT") {
      return nodes.length ? nodes[0] : [];
    }
    if (typeRaw === "MULTIPOINT") {
      /* 兼容 ((x y),(x y)) 与 (x y, x y) 两种写法 */
      if (nodes.length && Array.isArray(nodes[0]) && Array.isArray(nodes[0][0])) {
        return nodes.map(function (n) { return n[0]; });
      }
      return nodes;
    }
    return nodes;
  }

  /* ---------- 解析单个几何（递归用于 GEOMETRYCOLLECTION） ---------- */
  function parseGeometry(str) {
    str = str.trim();
    var m = str.match(/^([A-Za-z]+)\s*(Z|M|ZM)?\s*([\s\S]*)$/);
    if (!m) throw makeErr(0, "Unrecognized geometry text");
    var typeRaw = m[1].toUpperCase();
    var dim = (m[2] || "").toUpperCase();
    var body = m[3].trim();

    if (!(typeRaw in TYPE_MAP)) throw makeErr(0, "Unsupported geometry type: " + typeRaw);

    if (body.toUpperCase() === "EMPTY") {
      return { type: TYPE_MAP[typeRaw], dim: dim, coordinates: typeRaw === "GEOMETRYCOLLECTION" ? [] : [], empty: true };
    }

    if (typeRaw === "GEOMETRYCOLLECTION") {
      var inner = extractBalanced(body);
      if (inner === null) throw makeErr(body.indexOf("(") === -1 ? str.indexOf("(") : str.indexOf("("), "Missing brackets in geometry collection");
      var parts = splitTopLevel(inner);
      var geoms = parts.map(function (p) { return parseGeometry(p); });
      return { type: "GeometryCollection", dim: dim, geometries: geoms };
    }

    if (body[0] !== "(") throw makeErr(str.indexOf(body), "Missing coordinate brackets after geometry type");
    var inner2 = extractBalanced(body);
    if (inner2 === null) throw makeErr(str.indexOf("("), "Mismatched brackets");

    var nodes = parseLevel(inner2);
    var coords = normalize(typeRaw, nodes);
    return { type: TYPE_MAP[typeRaw], dim: dim, coordinates: coords };
  }

  function makeErr(pos, msg) {
    var e = new Error(msg);
    e.pos = typeof pos === "number" ? pos : 0;
    return e;
  }

  /* ---------- 坐标数值合法性预校验（带位置） ---------- */
  function validateNumbers(str) {
    var re = /[+\-]?(\d+\.?\d*|\.\d+)([eE][+\-]?\d+)?/g;
    var m;
    while ((m = re.exec(str)) !== null) {
      var tok = m[0];
      /* 跳过原本无效的（如单独的符号或小数点） */
      if (!/^[+\-]?(\d+(\.\d+)?|\.\d+)([eE][+\-]?\d+)?$/.test(tok)) {
        return { pos: m.index, msg: "Invalid coordinate value format: " + tok };
      }
      var num = Number(tok);
      if (!isFinite(num)) {
        return { pos: m.index, msg: "Invalid coordinate value: " + tok };
      }
    }
    return null;
  }

  /* ---------- 收集所有点 ---------- */
  function collectPoints(geom) {
    var pts = [];
    if (geom.type === "GeometryCollection") {
      geom.geometries.forEach(function (g) { pts = pts.concat(collectPoints(g)); });
      return pts;
    }
    walk(geom.coordinates, pts);
    return pts;
  }

  function walk(arr, out) {
    if (!Array.isArray(arr) || arr.length === 0) return;
    if (typeof arr[0] === "number") {
      out.push(arr);
      return;
    }
    for (var i = 0; i < arr.length; i++) walk(arr[i], out);
  }

  function maxDepth(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return 0;
    if (typeof arr[0] === "number") return 1;
    var d = 0;
    for (var i = 0; i < arr.length; i++) d = Math.max(d, maxDepth(arr[i]));
    return d + 1;
  }

  /* ---------- 主解析入口 ---------- */
  function run() {
    errorEl.hidden = true;
    var text = inputEl.value.trim();
    if (!text) { showToast("Please enter WKT text"); return; }

    /* 括号配平检查 */
    var depth = 0, badPos = -1;
    for (var i = 0; i < text.length; i++) {
      if (text[i] === "(") depth++;
      else if (text[i] === ")") { depth--; if (depth < 0) { badPos = i; break; } }
    }
    if (depth !== 0 || badPos > -1) {
      return fail(badPos > -1 ? badPos : text.indexOf("(") > -1 ? text.lastIndexOf("(") : 0,
        "Mismatched brackets: please check that left brackets and right brackets are paired.");
    }

    var numErr = validateNumbers(text);
    if (numErr) return fail(numErr.pos, numErr.msg);

    var geom;
    try {
      geom = parseGeometry(text);
    } catch (e) {
      return fail(e.pos || 0, "Parse failed: " + e.message);
    }

    /* 校验每个点至少 2 个数值 */
    var pts = collectPoints(geom);
    for (var j = 0; j < pts.length; j++) {
      if (!Array.isArray(pts[j]) || pts[j].length < 2 || pts[j].some(function (v) { return !isFinite(v); })) {
        return fail(0, "Line " + (j + 1) + "coordinate points are incorrectly formatted; at least X and Y values are required.");
      }
    }

    render(geom, pts);
  }

  function fail(pos, msg) {
    errorEl.hidden = false;
    errorEl.textContent = "⚠ " + msg + (pos ? "(position about " + pos + "）" : "");
    statsEl.hidden = true;
    bboxWrap.hidden = true;
    tableWrap.hidden = true;
    svgEl.hidden = true;
    svgEmpty.hidden = false;
    jsonEl.value = "";
    showToast("Parse error");
  }

  /* ---------- 渲染 ---------- */
  function render(geom, pts) {
    var hasZ = geom.dim.indexOf("Z") > -1 || (pts.length && pts[0].length >= 3);
    var showZ = extraEl.checked && (hasZ);

    /* 统计 */
    var level = geom.type === "GeometryCollection" ? "Multi-geometry" : String(maxDepth(geom.coordinates));
    document.getElementById("stType").textContent = geom.type;
    document.getElementById("stCount").textContent = String(pts.length);
    document.getElementById("stLevel").textContent = level;
    document.getElementById("stDim").textContent = geom.dim || (showZ ? "Z" : "2D");
    statsEl.hidden = false;

    /* bbox */
    if (pts.length) {
      var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      pts.forEach(function (p) {
        if (p[0] < minX) minX = p[0];
        if (p[1] < minY) minY = p[1];
        if (p[0] > maxX) maxX = p[0];
        if (p[1] > maxY) maxY = p[1];
      });
      bboxEl.textContent = "bbox: [" + fmt(minX) + ", " + fmt(minY) + ", " + fmt(maxX) + ", " + fmt(maxY) + "]";
      bboxWrap.hidden = false;
      geom.bbox = [minX, minY, maxX, maxY];
    } else {
      bboxWrap.hidden = true;
    }

    /* 坐标表 */
    renderTable(pts, showZ);

    /* SVG */
    renderSvg(geom, pts);

    /* GeoJSON */
    var gj = toGeoJSON(geom, showZ);
    jsonEl.value = JSON.stringify(gj, null, 2);
  }

  function fmt(n) {
    if (!isFinite(n)) return String(n);
    var r = Math.round(n * 1e6) / 1e6;
    return String(r);
  }

  function renderTable(pts, showZ) {
    var head = "<tr><th>#</th><th>X</th><th>Y</th>" + (showZ ? "<th>Z</th>" : "") + "</tr>";
    theadEl.innerHTML = head;
    var html = "";
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      html += "<tr><td class='num'>" + (i + 1) + "</td><td class='num'>" + fmt(p[0]) +
        "</td><td class='num'>" + fmt(p[1]) + "</td>" +
        (showZ ? "<td class='num dim'>" + (p[2] !== undefined ? fmt(p[2]) : "-") + "</td>" : "") + "</tr>";
    }
    tbodyEl.innerHTML = html;
    tableWrap.hidden = pts.length === 0;
  }

  /* ---------- GeoJSON ---------- */
  function toGeoJSON(geom, showZ) {
    if (geom.type === "GeometryCollection") {
      var gj = { type: "GeometryCollection", geometries: geom.geometries.map(function (g) { return toGeoJSON(g, showZ); }) };
      var bb = bboxOf(geom.geometries);
      if (bb) gj.bbox = bb;
      return gj;
    }
    var coords = stripDim(geom.coordinates, showZ, geom.dim);
    var obj = { type: geom.type, coordinates: coords };
    if (geom.bbox) obj.bbox = geom.bbox;
    return obj;
  }

  function stripDim(coords, showZ, dim) {
    if (!showZ) {
      /* 去掉 Z/M，仅保留 X,Y */
      return walkMap(coords, function (p) { return [p[0], p[1]]; });
    }
    return coords;
  }

  function walkMap(arr, fn) {
    if (!Array.isArray(arr) || arr.length === 0) return arr;
    if (typeof arr[0] === "number") return fn(arr);
    return arr.map(function (x) { return walkMap(x, fn); });
  }

  function bboxOf(geoms) {
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, any = false;
    geoms.forEach(function (g) {
      var pts = collectPoints(g);
      pts.forEach(function (p) {
        any = true;
        if (p[0] < minX) minX = p[0];
        if (p[1] < minY) minY = p[1];
        if (p[0] > maxX) maxX = p[0];
        if (p[1] > maxY) maxY = p[1];
      });
    });
    return any ? [minX, minY, maxX, maxY] : null;
  }

  /* ---------- SVG 预览 ---------- */
  function renderSvg(geom, pts) {
    if (!pts.length) {
      svgEl.hidden = true;
      svgEmpty.hidden = false;
      return;
    }
    var W = 640, H = 400, pad = 36;
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    pts.forEach(function (p) {
      minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]);
      minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]);
    });
    var spanX = maxX - minX, spanY = maxY - minY;
    if (spanX === 0) { minX -= 1; maxX += 1; spanX = 2; }
    if (spanY === 0) { minY -= 1; maxY += 1; spanY = 2; }
    var scale = Math.min((W - 2 * pad) / spanX, (H - 2 * pad) / spanY);
    function px(x) { return pad + (x - minX) * scale; }
    function py(y) { return H - pad - (y - minY) * scale; }

    var svg = "";
    /* 坐标轴 */
    svg += '<line x1="' + pad + '" y1="' + (H - pad) + '" x2="' + (W - pad) + '" y2="' + (H - pad) + '" stroke="#cbd5e1" stroke-width="1"/>';
    svg += '<line x1="' + pad + '" y1="' + pad + '" x2="' + pad + '" y2="' + (H - pad) + '" stroke="#cbd5e1" stroke-width="1"/>';
    svg += '<text x="' + (W - pad) + '" y="' + (H - pad + 16) + '" font-size="11" fill="#94a3b8" text-anchor="end">X max ' + fmt(maxX) + '</text>';
    svg += '<text x="' + (W - pad) + '" y="' + (H - pad + 28) + '" font-size="11" fill="#94a3b8" text-anchor="end">X min ' + fmt(minX) + '</text>';
    svg += '<text x="' + (pad + 4) + '" y="' + (pad - 6) + '" font-size="11" fill="#94a3b8">Y max ' + fmt(maxY) + '</text>';
    svg += '<text x="' + (pad + 4) + '" y="' + (H - pad - 6) + '" font-size="11" fill="#94a3b8">Y min ' + fmt(minY) + '</text>';

    svg += emitGeometry(geom, px, py);
    svgEl.innerHTML = svg;
    svgEl.hidden = false;
    svgEmpty.hidden = true;
  }

  function emitGeometry(geom, px, py) {
    if (geom.type === "GeometryCollection") {
      return geom.geometries.map(function (g) { return emitGeometry(g, px, py); }).join("");
    }
    switch (geom.type) {
      case "Point":
        return circle(px(geom.coordinates[0]), py(geom.coordinates[1]));
      case "MultiPoint":
        return geom.coordinates.map(function (p) { return circle(px(p[0]), py(p[1])); }).join("");
      case "LineString":
        return polyline(geom.coordinates, px, py, false);
      case "MultiLineString":
        return geom.coordinates.map(function (l) { return polyline(l, px, py, false); }).join("");
      case "Polygon":
        return geom.coordinates.map(function (ring) { return polyline(ring, px, py, true); }).join("");
      case "MultiPolygon":
        return geom.coordinates.map(function (poly) {
          return poly.map(function (ring) { return polyline(ring, px, py, true); }).join("");
        }).join("");
    }
    return "";
  }

  function polyline(coords, px, py, closed) {
    if (!coords || !coords.length) return "";
    var d = "";
    coords.forEach(function (p, i) {
      d += (i === 0 ? "M" : "L") + px(p[0]).toFixed(1) + " " + py(p[1]).toFixed(1) + " ";
    });
    if (closed) d += "Z";
    if (closed) {
      return '<path d="' + d + '" fill="rgba(37,99,235,0.12)" stroke="#2563eb" stroke-width="2" stroke-linejoin="round"/>';
    }
    return '<path d="' + d + '" fill="none" stroke="#2563eb" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
  }

  function circle(cx, cy) {
    return '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="5" fill="#2563eb" stroke="#fff" stroke-width="1.5"/>';
  }

  /* ---------- 事件 ---------- */
  document.getElementById("wktParse").addEventListener("click", run);

  document.getElementById("wktSample").addEventListener("click", function () {
    inputEl.value = SAMPLE;
    run();
  });

  document.getElementById("wktClear").addEventListener("click", function () {
    inputEl.value = "";
    errorEl.hidden = true;
    statsEl.hidden = true;
    bboxWrap.hidden = true;
    tableWrap.hidden = true;
    svgEl.hidden = true;
    svgEmpty.hidden = false;
    jsonEl.value = "";
  });

  extraEl.addEventListener("change", function () {
    if (inputEl.value.trim()) run();
  });

  document.getElementById("wktCopy").addEventListener("click", function () {
    if (!jsonEl.value) { showToast("No GeoJSON yet"); return; }
    copyText(jsonEl.value, "GeoJSON copied");
  });

  document.getElementById("wktDownload").addEventListener("click", function () {
    if (!jsonEl.value) { showToast("No GeoJSON yet"); return; }
    var blob = new Blob([jsonEl.value], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "geometry.geojson";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    showToast("Downloaded geometry.geojson");
  });

  /* ---------- 工具函数 ---------- */
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
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 2000);
  }
})();
