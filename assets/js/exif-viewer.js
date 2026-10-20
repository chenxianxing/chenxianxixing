/* ============================================================
   EXIF查看器 - 工具页逻辑
   依赖：../assets/vendor/piexif.js（全局 piexif）
   全部本地处理，不发起任何网络请求
   ============================================================ */
(function () {
  "use strict";

  if (typeof piexif === "undefined") {
    showToast(t("EXIF 组件加载失败，请刷新页面重试。"));
    return;
  }

  var MAX_SIZE = 30 * 1024 * 1024; // 30MB
  var GROUPS = ["0th", "Exif", "GPS", "Interop", "1st"];
  var GROUP_LABELS = {
    "0th": "IFD0 · 图像属性",
    "Exif": "Exif · 拍摄参数",
    "GPS": "GPS · 位置信息",
    "Interop": "Interop · 兼容性信息",
    "1st": "IFD1 · 缩略图属性"
  };

  /* 常见标签中文名（英文名 -> 中文名） */
  var ZH_NAMES = {
    Make: "相机品牌",
    Model: "相机型号",
    DateTime: "修改时间",
    Software: "软件",
    Orientation: "方向",
    ProcessingSoftware: "处理软件",
    Artist: "作者",
    ImageDescription: "图像描述",
    DocumentName: "文档名称",
    HostComputer: "主机计算机",
    XResolution: "水平分辨率",
    YResolution: "垂直分辨率",
    ResolutionUnit: "分辨率单位",
    ExposureTime: "曝光时间",
    FNumber: "光圈值",
    ISOSpeedRatings: "ISO 感光度",
    FocalLength: "焦距",
    DateTimeOriginal: "拍摄时间",
    DateTimeDigitized: "数字化时间",
    ExposureBiasValue: "曝光补偿",
    MaxApertureValue: "最大光圈",
    MeteringMode: "测光模式",
    Flash: "闪光灯",
    WhiteBalance: "白平衡",
    ExifVersion: "EXIF 版本",
    FlashpixVersion: "Flashpix 版本",
    PixelXDimension: "图像宽度",
    PixelYDimension: "图像高度",
    ColorSpace: "色彩空间",
    Contrast: "对比度",
    Saturation: "饱和度",
    Sharpness: "锐度",
    SceneCaptureType: "场景类型",
    GainControl: "增益控制",
    LightSource: "光源",
    SensingMethod: "感光方式",
    CustomRendered: "自定义渲染",
    DigitalZoomRatio: "数字变焦倍率",
    SceneType: "场景类型",
    ExposureMode: "曝光模式",
    FocalLengthIn35mmFilm: "等效 35mm 焦距",
    LensMake: "镜头品牌",
    LensModel: "镜头型号",
    LensSerialNumber: "镜头编号",
    BodySerialNumber: "机身编号",
    CameraOwnerName: "相机所有者",
    UserComment: "用户备注",
    MakerNote: "制造商备注",
    RelatedSoundFile: "关联音频",
    OffsetTime: "时区偏移",
    SensitivityType: "感光度类型",
    GPSLatitude: "纬度",
    GPSLatitudeRef: "纬度方向",
    GPSLongitude: "经度",
    GPSLongitudeRef: "经度方向",
    GPSAltitude: "海拔",
    GPSAltitudeRef: "海拔参考",
    GPSTimeStamp: "GPS 时间戳",
    GPSDateStamp: "GPS 日期",
    InteroperabilityIndex: "互操作性索引"
  };

  var ORIENT_DESC = {
    3: "（旋转 180°）",
    6: "（顺时针旋转 90°）",
    8: "（逆时针旋转 90°）"
  };

  /* 清除范围对应的标签 ID */
  var TIME_IDS_0TH = [306];
  var TIME_IDS_EXIF = [36867, 36868];
  var DEVICE_IDS_0TH = [11, 271, 272, 305, 316];
  var DEVICE_IDS_EXIF = [37500, 42032, 42033, 42035, 42036, 42037];

  var drop = document.getElementById("exifDrop");
  var input = document.getElementById("exifInput");
  var resultBox = document.getElementById("exifResult");
  var errorBox = document.getElementById("exifError");
  var nameEl = document.getElementById("exifName");
  var typeEl = document.getElementById("exifType");
  var sizeEl = document.getElementById("exifSize");
  var dimEl = document.getElementById("exifDim");
  var thumbWrap = document.getElementById("exifThumbWrap");
  var thumbImg = document.getElementById("exifThumb");
  var gpsWarn = document.getElementById("exifGpsWarn");
  var gpsText = document.getElementById("exifGpsText");
  var mapLink = document.getElementById("exifMapLink");
  var noneNote = document.getElementById("exifNone");
  var tablesBox = document.getElementById("exifTables");
  var clearBox = document.getElementById("exifClearBox");
  var clearResult = document.getElementById("exifClearResult");
  var newPreview = document.getElementById("exifNewPreview");
  var compareEl = document.getElementById("exifCompare");

  var state = {
    dataURL: null,
    exif: null,
    name: "",
    size: 0,
    newURL: null,
    newName: ""
  };

  function showError(msg) {
    errorBox.hidden = false;
    errorBox.textContent = msg;
  }
  function clearError() { errorBox.hidden = true; }

  /* ---------- 文件选择 ---------- */
  drop.addEventListener("click", function () { input.click(); });
  drop.addEventListener("dragover", function (e) {
    e.preventDefault();
    drop.classList.add("dragover");
  });
  drop.addEventListener("dragleave", function () { drop.classList.remove("dragover"); });
  drop.addEventListener("drop", function (e) {
    e.preventDefault();
    drop.classList.remove("dragover");
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
  });
  input.addEventListener("change", function () {
    if (input.files.length) handleFile(input.files[0]);
    input.value = "";
  });

  function handleFile(file) {
    clearError();
    var isJpeg = /\.jpe?g$/i.test(file.name) || (file.type && /jpe?g/i.test(file.type));
    if (!isJpeg) {
      showToast(t("仅支持 JPEG（.jpg / .jpeg）格式的照片"));
      return;
    }
    if (file.size > MAX_SIZE) {
      showToast(t("文件大小超过 30MB，请选择更小的照片"));
      return;
    }
    var fr = new FileReader();
    fr.onload = function () {
      var dataURL = fr.result;
      try {
        var b64 = String(dataURL).slice(String(dataURL).indexOf(",") + 1);
        var head = atob(b64.slice(0, 8));
        if (head.charCodeAt(0) !== 0xFF || head.charCodeAt(1) !== 0xD8) {
          showToast(t("不是有效的 JPEG 文件"));
          return;
        }
      } catch (e) {
        showToast(t("文件读取失败，请重试"));
        return;
      }
      loadExif(String(dataURL), file);
    };
    fr.onerror = function () {
      showToast(t("文件读取失败，请重试"));
    };
    fr.readAsDataURL(file);
  }

  /* ---------- 解析与展示 ---------- */
  function loadExif(dataURL, file) {
    var exif;
    try {
      exif = piexif.load(dataURL);
    } catch (err) {
      showToast(t("EXIF 解析失败：{msg}", { msg: err.message }));
      return;
    }

    state.dataURL = dataURL;
    state.exif = exif;
    state.name = file.name;
    state.size = file.size;
    state.newURL = null;

    nameEl.textContent = file.name;
    typeEl.textContent = t("JPEG 图像（{mime}）", { mime: file.type || "image/jpeg" });
    sizeEl.textContent = formatSize(file.size);
    dimEl.textContent = t("读取中…");
    var img = new Image();
    img.onload = function () {
      dimEl.textContent = img.naturalWidth + " × " + img.naturalHeight;
    };
    img.onerror = function () { dimEl.textContent = "-"; };
    img.src = dataURL;

    if (exif.thumbnail) {
      try {
        thumbImg.src = "data:image/jpeg;base64," + btoa(exif.thumbnail);
        thumbWrap.hidden = false;
      } catch (e) {
        thumbWrap.hidden = true;
      }
    } else {
      thumbWrap.hidden = true;
    }

    var gpsKeys = exif.GPS ? Object.keys(exif.GPS) : [];
    if (gpsKeys.length) {
      gpsWarn.hidden = false;
      var gi = getGpsDecimal(exif);
      if (gi) {
        var latS = trimNum(gi.lat);
        var lonS = trimNum(gi.lon);
        gpsText.textContent = t("纬度 {lat}，经度 {lon}", { lat: latS, lon: lonS });
        mapLink.hidden = false;
        mapLink.href = "https://www.openstreetmap.org/?mlat=" + latS + "&mlon=" + lonS +
          "#map=16/" + latS + "/" + lonS;
      } else {
        gpsText.textContent = "";
        mapLink.hidden = true;
      }
    } else {
      gpsWarn.hidden = true;
    }

    var hasTags = renderTables(exif);
    noneNote.hidden = hasTags;
    clearBox.hidden = !hasTags;
    clearResult.hidden = true;
    compareEl.textContent = "";

    resultBox.hidden = false;
    showToast(hasTags ? t("已读取 {n} 个 EXIF 标签", { n: countTags(exif) }) : t("未检测到 EXIF 信息"));
  }

  /* ---------- EXIF 表格 ---------- */
  function tagEnName(group, id) {
    var g = piexif.TAGS[group];
    if (g && g[id]) return g[id].name;
    return null;
  }

  function hex4(id) {
    var h = id.toString(16).toUpperCase();
    while (h.length < 4) h = "0" + h;
    return h;
  }

  function tagLabel(group, id) {
    var en = tagEnName(group, id);
    var zh = en ? ZH_NAMES[en] : null;
    if (zh) return zh;
    return t("标签 0x{h} {name}", { h: hex4(id), name: en || "?" });
  }

  function renderTables(exif) {
    tablesBox.innerHTML = "";
    var any = false;
    GROUPS.forEach(function (g) {
      var dict = exif[g];
      if (!dict) return;
      var ids = Object.keys(dict).map(Number).sort(function (a, b) { return a - b; });
      if (!ids.length) return;
      any = true;

      var lab = document.createElement("div");
      lab.className = "exif-group-label";
      lab.textContent = GROUP_LABELS[g];
      tablesBox.appendChild(lab);

      var wrap = document.createElement("div");
      wrap.className = "table-wrap";
      var table = document.createElement("table");
      table.className = "data-table";

      var thead = document.createElement("thead");
      var trh = document.createElement("tr");
      [t("标签"), t("值")].forEach(function (h) {
        var th = document.createElement("th");
        th.textContent = h;
        trh.appendChild(th);
      });
      thead.appendChild(trh);
      table.appendChild(thead);

      var tbody = document.createElement("tbody");
      ids.forEach(function (id) {
        var tr = document.createElement("tr");
        var td1 = document.createElement("td");
        td1.textContent = tagLabel(g, id);
        var td2 = document.createElement("td");
        td2.className = "val";
        var val = formatValue(g, dict, id, dict[id]);
        td2.textContent = val;
        if (val.length > 60) td2.title = val;
        tr.appendChild(td1);
        tr.appendChild(td2);
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      wrap.appendChild(table);
      tablesBox.appendChild(wrap);
    });
    return any;
  }

  /* ---------- 值格式化 ---------- */
  function isRat(v) {
    return Array.isArray(v) && v.length === 2 &&
      typeof v[0] === "number" && typeof v[1] === "number";
  }

  function rat(v) {
    if (!isRat(v)) return null;
    if (v[1] === 0) return 0;
    return v[0] / v[1];
  }

  function trimNum(n) {
    return String(Math.round(n * 1e6) / 1e6);
  }

  function pad2(n) {
    var r = Math.round(n);
    return (r < 10 ? "0" : "") + r;
  }

  function truncate(s, max) {
    if (s.length <= max) return s;
    return s.slice(0, max) + "…";
  }

  function generic(v) {
    if (v === null || v === undefined || v === "") return "-";
    if (typeof v === "string") {
      if (/[^\t\n\x20-\x7E\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(v)) {
        return t("二进制数据（{n} 字节）", { n: v.length });
      }
      return truncate(v, 200);
    }
    if (isRat(v)) {
      return v[1] === 1 ? String(v[0]) : v[0] + "/" + v[1];
    }
    if (Array.isArray(v)) {
      if (!v.length) return "-";
      if (typeof v[0] === "number") return v.join(", ");
      return v.map(function (x) {
        return isRat(x) ? (x[1] === 1 ? String(x[0]) : x[0] + "/" + x[1]) : String(x);
      }).join(", ");
    }
    return String(v);
  }

  function formatExposure(v) {
    var r = rat(v);
    if (r === null || r <= 0) return generic(v);
    if (r < 1) return "1/" + Math.round(1 / r) + " " + t("秒");
    return trimNum(r) + " " + t("秒");
  }

  function decodeUserComment(v) {
    if (v.slice(0, 8) === "UNICODE\x00") {
      var bin = v.slice(8);
      var out = "";
      for (var i = 0; i + 1 < bin.length; i += 2) {
        out += String.fromCharCode((bin.charCodeAt(i) << 8) | bin.charCodeAt(i + 1));
      }
      return out || "-";
    }
    return v.replace(/^(ASCII|JIS)\x00{0,7}/, "") || "-";
  }

  function dmsToDeg(dms, ref) {
    if (!Array.isArray(dms) || dms.length < 3) return null;
    var d = rat(dms[0]);
    var m = rat(dms[1]);
    var s = rat(dms[2]);
    if (d === null || m === null || s === null) return null;
    var deg = d + m / 60 + s / 3600;
    if (ref === "S" || ref === "W") deg = -deg;
    return deg;
  }

  function getGpsDecimal(exif) {
    var gps = exif.GPS || {};
    if (!gps[2] || !gps[4]) return null;
    var la = dmsToDeg(gps[2], gps[1]);
    var lo = dmsToDeg(gps[4], gps[3]);
    if (la === null || lo === null) return null;
    return { lat: la, lon: lo };
  }

  function formatGpsValue(gps, id, v) {
    switch (id) {
      case 2: // GPSLatitude
      case 4: { // GPSLongitude
        var ref = id === 2 ? gps[1] : gps[3];
        var deg = dmsToDeg(v, ref);
        if (deg === null) return generic(v);
        var dir = id === 2 ? (ref === "S" ? "S" : "N") : (ref === "W" ? "W" : "E");
        return trimNum(deg) + "° " + dir;
      }
      case 5: // GPSAltitudeRef
        return (v === 0 || v === "0") ? t("海平面") : t("海平面以下");
      case 6: { // GPSAltitude
        var alt = rat(v);
        return alt === null ? generic(v) : trimNum(alt) + " " + t("米");
      }
      case 7: // GPSTimeStamp
        if (Array.isArray(v) && v.length === 3) {
          var h = rat(v[0]);
          var m = rat(v[1]);
          var s = rat(v[2]);
          if (h !== null && m !== null && s !== null) return pad2(h) + ":" + pad2(m) + ":" + pad2(s);
        }
        return generic(v);
      case 29: // GPSDateStamp
        return String(v).replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3");
      default:
        return generic(v);
    }
  }

  function formatValue(group, dict, id, v) {
    if (group === "GPS") return formatGpsValue(dict, id, v);
    if (id === 33434 && isRat(v)) return formatExposure(v);       // ExposureTime
    if (id === 33437 && isRat(v)) return "f/" + trimNum(rat(v));  // FNumber
    if (id === 37386 && isRat(v)) return trimNum(rat(v)) + " " + t("毫米"); // FocalLength
    if ((id === 306 || id === 36867 || id === 36868) && typeof v === "string") {
      return v.replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3");
    }
    if (id === 274) { // Orientation
      return String(v) + (ORIENT_DESC[v] ? t(ORIENT_DESC[v]) : "");
    }
    if (id === 37510 && typeof v === "string") { // UserComment
      return decodeUserComment(v);
    }
    return generic(v);
  }

  /* ---------- 清除隐私信息 ---------- */
  var allBox = document.querySelector('#exifScopes input[value="all"]');
  var otherBoxes = Array.prototype.filter.call(
    document.querySelectorAll('#exifScopes input[type="checkbox"]'),
    function (c) { return c !== allBox; }
  );
  allBox.addEventListener("change", function () {
    otherBoxes.forEach(function (c) { c.disabled = allBox.checked; });
  });

  function copyExif(obj) {
    var o = {};
    GROUPS.forEach(function (g) {
      o[g] = {};
      if (obj[g]) {
        Object.keys(obj[g]).forEach(function (k) { o[g][k] = obj[g][k]; });
      }
    });
    o.thumbnail = obj.thumbnail || null;
    return o;
  }

  function countTags(obj) {
    var n = 0;
    GROUPS.forEach(function (g) {
      if (obj[g]) n += Object.keys(obj[g]).length;
    });
    return n;
  }

  function applyClear(obj, scope) {
    if (scope === "gps") {
      obj.GPS = {};
    } else if (scope === "time") {
      TIME_IDS_0TH.forEach(function (id) { delete obj["0th"][id]; });
      TIME_IDS_EXIF.forEach(function (id) { delete obj.Exif[id]; });
    } else if (scope === "device") {
      DEVICE_IDS_0TH.forEach(function (id) { delete obj["0th"][id]; });
      DEVICE_IDS_EXIF.forEach(function (id) { delete obj.Exif[id]; });
    }
  }

  function cleanedName(name) {
    return name.replace(/\.jpe?g$/i, "") + "-cleaned.jpg";
  }

  document.getElementById("exifClearBtn").addEventListener("click", function () {
    if (!state.exif) return;
    var scopes = Array.prototype.filter.call(
      document.querySelectorAll('#exifScopes input[type="checkbox"]'),
      function (c) { return c.checked; }
    ).map(function (c) { return c.value; });
    if (!scopes.length) {
      showToast(t("请至少勾选一项清除范围"));
      return;
    }

    var before = countTags(state.exif);
    var newURL;
    try {
      if (scopes.indexOf("all") > -1) {
        newURL = piexif.remove(state.dataURL);
      } else {
        var obj = copyExif(state.exif);
        scopes.forEach(function (s) { applyClear(obj, s); });
        if (countTags(obj) === 0) {
          newURL = piexif.remove(state.dataURL);
        } else {
          newURL = piexif.insert(piexif.dump(obj), state.dataURL);
        }
      }
    } catch (err) {
      showToast(t("清除失败：{msg}", { msg: err.message }));
      return;
    }

    var after = 0;
    try {
      after = countTags(piexif.load(newURL));
    } catch (e) {
      after = 0;
    }

    state.newURL = newURL;
    state.newName = cleanedName(state.name);
    newPreview.src = newURL;
    clearResult.hidden = false;
    compareEl.innerHTML = t("清除前 <b>{n}</b> 个标签 → 清除后 <b>{m}</b> 个", { n: before, m: after });
    showToast(t("已生成清除隐私信息后的照片"));
  });

  document.getElementById("exifDownloadBtn").addEventListener("click", function () {
    if (!state.newURL) return;
    downloadBlob(dataURLToBlob(state.newURL), state.newName);
    showToast(t("已下载：{name}", { name: state.newName }));
  });

  /* ============================================================
     下载 + 提示
     ============================================================ */
  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  function dataURLToBlob(dataURL) {
    var parts = String(dataURL).split(",");
    var mime = "image/jpeg";
    var m = /:(.*?);/.exec(parts[0]);
    if (m) mime = m[1];
    var bin = atob(parts[1]);
    var len = bin.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime });
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
    }, 2200);
  }

  function formatSize(bytes) {
    if (bytes >= 1024 * 1024 * 1024) return t("{v} {u}", { v: (bytes / 1024 / 1024 / 1024).toFixed(2), u: t("GB") });
    if (bytes >= 1024 * 1024) return t("{v} {u}", { v: (bytes / 1024 / 1024).toFixed(2), u: t("MB") });
    if (bytes >= 1024) return t("{v} {u}", { v: (bytes / 1024).toFixed(1), u: t("KB") });
    return t("{v} {u}", { v: String(bytes), u: t("B") });
  }

  /* 多语言助手（中文环境原样返回；英文环境由构建脚本注入翻译） */
  function t(key, vars) {
    var s = key;
    if (document.documentElement.lang === "en" && window.I18N_EN &&
        Object.prototype.hasOwnProperty.call(window.I18N_EN, key)) {
      s = window.I18N_EN[key];
    }
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        s = s.split("{" + k + "}").join(String(vars[k]));
      });
    }
    return s;
  }
})();
