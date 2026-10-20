/* ============================================================
  随机数据生成 - 工具页逻辑
   字段类型多选 → 按序生成列 → 多种导出格式
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
  function download(filename, text, mime) {
    var blob = new Blob([text], { type: (mime || "text/plain") + ";charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /* ---------- 随机工具 ---------- */
  function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function randDigits(n) {
    var s = "";
    for (var i = 0; i < n; i++) s += randInt(0, 9);
    return s;
  }

  var SURNAMES = "王李张刘陈杨黄赵周吴徐孙马朱胡郭何高林郑谢罗梁宋唐许韩冯邓曹彭曾".split("");
  var GIVEN = "伟芳娜秀英敏静丽强磊洋艳勇军杰娟涛明超秀兰霞平刚桂英文辉力建华建国志强".split("");

  function genName() {
    var s = pick(SURNAMES);
    var len = randInt(1, 2);
    for (var i = 0; i < len; i++) s += pick(GIVEN);
    return s;
  }
  function genPhone() {
    return "1" + randInt(3, 9) + randDigits(9);
  }
  function genEmail() {
    var pre = "abcdefghijklmnopqrstuvwxyz";
    var n = randInt(5, 9);
    var user = "";
    for (var i = 0; i < n; i++) user += pre[randInt(0, pre.length - 1)];
    user += randInt(1, 999);
    return user + "@" + pick(["qq.com", "163.com", "gmail.com", "outlook.com", "foxmail.com", "sina.com"]);
  }
  function genIdCard() {
    var region = pick(["110101", "310101", "440101", "510101", "320101", "420101", "330101"]);
    var y = randInt(1970, 2004);
    var m = randInt(1, 12), d = randInt(1, 28);
    var birth = String(y) + ("0" + m).slice(-2) + ("0" + d).slice(-2);
    var seq = randDigits(3);
    var body = region + birth + seq;
    var weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
    var codes = "10X98765432";
    var sum = 0;
    for (var i = 0; i < 17; i++) sum += parseInt(body.charAt(i), 10) * weights[i];
    return body + codes.charAt(sum % 11);
  }
  function genDate() {
    var y = randInt(1970, 2025), m = randInt(1, 12), d = randInt(1, 28);
    return String(y) + "-" + ("0" + m).slice(-2) + "-" + ("0" + d).slice(-2);
  }
  function genInt(min, max) { return String(randInt(min, max)); }
  function genDecimal(min, max, digits) {
    var v = Math.random() * (max - min) + min;
    return v.toFixed(digits);
  }
  var PLATE_PROV = "京沪津渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼".split("");
  function genPlate() {
    var prov = pick(PLATE_PROV);
    var letter = "ABCDEFGHJKLMNPQRSTUVWXYZ".charAt(randInt(0, 23));
    var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
    var s = "";
    for (var i = 0; i < 5; i++) s += chars.charAt(randInt(0, chars.length - 1));
    return prov + letter + s;
  }
  function genUUID() {
    function h() { return Math.floor(Math.random() * 0x10000).toString(16).padStart(4, "0"); }
    return h() + h() + "-" + h().slice(0, 2) + h().slice(2) + "-" + "4" + h().slice(1) + "-" + "8" + h().slice(1) + "-" + h() + h() + h();
  }
  function genBool() { return Math.random() < 0.5 ? "true" : "false"; }
  function genCustom(prefix, digits) { return prefix + randDigits(digits); }

  var FIELD_META = {
    name:   { label: "姓名",   fn: function () { return genName(); } },
    phone:  { label: "手机号", fn: function () { return genPhone(); } },
    email:  { label: "邮箱",   fn: function () { return genEmail(); } },
    idcard: { label: "身份证", fn: function () { return genIdCard(); } },
    date:   { label: "日期",   fn: function () { return genDate(); } },
    int:    { label: "整数",   fn: function (o) { return genInt(o.intMin, o.intMax); } },
    decimal:{ label: "小数",   fn: function (o) { return genDecimal(o.decMin, o.decMax, o.decDigits); } },
    plate:  { label: "车牌",   fn: function () { return genPlate(); } },
    uuid:   { label: "UUID",   fn: function () { return genUUID(); } },
    bool:   { label: "布尔",   fn: function () { return genBool(); } },
    custom: { label: "自定义", fn: function (o) { return genCustom(o.customPrefix, o.customDigits); } }
  };

  /* ---------- DOM ---------- */
  var fieldList = document.getElementById("fieldList");
  var outFormat = document.getElementById("outFormat");
  var customSepWrap = document.getElementById("customSepWrap");
  var customSep = document.getElementById("customSep");
  var rdOutput = document.getElementById("rdOutput");
  var genCount = document.getElementById("genCount");

  outFormat.addEventListener("change", function () {
    customSepWrap.hidden = outFormat.value !== "custom";
  });

  document.getElementById("btnSelAll").addEventListener("click", function () {
    Array.prototype.forEach.call(fieldList.querySelectorAll("input"), function (c) { c.checked = true; });
  });
  document.getElementById("btnSelNone").addEventListener("click", function () {
    Array.prototype.forEach.call(fieldList.querySelectorAll("input"), function (c) { c.checked = false; });
  });

  function getSelectedFields() {
    var arr = [];
    Array.prototype.forEach.call(fieldList.querySelectorAll("input"), function (c) {
      if (c.checked) arr.push(c.value);
    });
    return arr;
  }

  function generate() {
    var fields = getSelectedFields();
    if (!fields.length) { showToast("请至少选择一个字段"); return; }

    var rows = parseInt(document.getElementById("rowCount").value, 10);
    if (isNaN(rows) || rows < 1) rows = 1;
    if (rows > 1000) rows = 1000;

    var opt = {
      intMin: parseInt(document.getElementById("intMin").value, 10) || 0,
      intMax: parseInt(document.getElementById("intMax").value, 10) || 0,
      decMin: parseFloat(document.getElementById("decMin").value),
      decMax: parseFloat(document.getElementById("decMax").value),
      decDigits: parseInt(document.getElementById("decDigits").value, 10) || 0,
      customPrefix: document.getElementById("customPrefix").value,
      customDigits: parseInt(document.getElementById("customDigits").value, 10) || 1
    };
    if (isNaN(opt.decMin)) opt.decMin = 0;
    if (isNaN(opt.decMax)) opt.decMax = 0;
    if (opt.intMax < opt.intMin) { var t = opt.intMin; opt.intMin = opt.intMax; opt.intMax = t; }
    if (opt.decMax < opt.decMin) { var t2 = opt.decMin; opt.decMin = opt.decMax; opt.decMax = t2; }

    var labels = fields.map(function (f) { return FIELD_META[f].label; });
    var records = [];
    for (var r = 0; r < rows; r++) {
      var row = [];
      for (var c = 0; c < fields.length; c++) {
        row.push(FIELD_META[fields[c]].fn(opt));
      }
      records.push(row);
    }

    var fmt = outFormat.value;
    var text = "";
    if (fmt === "json") {
      var objs = records.map(function (row) {
        var o = {};
        fields.forEach(function (f, idx) { o[labels[idx]] = row[idx]; });
        return o;
      });
      text = JSON.stringify(objs, null, 2);
    } else if (fmt === "csv") {
      var lines = [labels.join(",")];
      records.forEach(function (row) {
        lines.push(row.map(function (v) {
          if (/[",\n\r]/.test(v)) return '"' + String(v).replace(/"/g, '""') + '"';
          return v;
        }).join(","));
      });
      text = lines.join("\r\n");
    } else if (fmt === "custom") {
      var sep = customSep.value.length ? customSep.value : "|";
      text = records.map(function (row) { return row.join(sep); }).join("\n");
    } else {
      text = records.map(function (row) { return row.join(" "); }).join("\n");
    }

    rdOutput.value = text;
    genCount.textContent = "已生成 " + rows + " 行 × " + fields.length + " 列";
  }

  document.getElementById("btnGen").addEventListener("click", generate);
  document.getElementById("btnCopy").addEventListener("click", function () {
    if (!rdOutput.value) { showToast("请先生成数据"); return; }
    copyText(rdOutput.value, "已复制结果");
  });
  document.getElementById("btnDownload").addEventListener("click", function () {
    if (!rdOutput.value) { showToast("请先生成数据"); return; }
    var fmt = outFormat.value;
    var name = "random-data", mime = "text/plain";
    if (fmt === "json") { name += ".json"; mime = "application/json"; }
    else if (fmt === "csv") { name += ".csv"; mime = "text/csv"; }
    else { name += ".txt"; }
    download(name, rdOutput.value, mime);
    showToast("已下载 " + name);
  });

  generate();
})();
