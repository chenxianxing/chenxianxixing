/* ============================================================
   世界时钟与时区转换器 - 工具页逻辑
   基于 Intl.DateTimeFormat + IANA 时区数据库，全部本地计算
   ============================================================ */
(function () {
  "use strict";

  /* ---------- 数据 ---------- */

  /* 常用城市（约50个） */
  var CITIES = [
    { n: "Beijing", z: "Asia/Shanghai" },
    { n: "Hong Kong", z: "Asia/Hong_Kong" },
    { n: "Taipei", z: "Asia/Taipei" },
    { n: "Tokyo", z: "Asia/Tokyo" },
    { n: "Seoul", z: "Asia/Seoul" },
    { n: "Singapore", z: "Asia/Singapore" },
    { n: "Bangkok", z: "Asia/Bangkok" },
    { n: "Jakarta", z: "Asia/Jakarta" },
    { n: "Manila", z: "Asia/Manila" },
    { n: "Kuala Lumpur", z: "Asia/Kuala_Lumpur" },
    { n: "Mumbai", z: "Asia/Kolkata" },
    { n: "Karachi", z: "Asia/Karachi" },
    { n: "Dhaka", z: "Asia/Dhaka" },
    { n: "Dubai", z: "Asia/Dubai" },
    { n: "Riyadh", z: "Asia/Riyadh" },
    { n: "Tehran", z: "Asia/Tehran" },
    { n: "Jerusalem", z: "Asia/Jerusalem" },
    { n: "Istanbul", z: "Europe/Istanbul" },
    { n: "Moscow", z: "Europe/Moscow" },
    { n: "London", z: "Europe/London" },
    { n: "Paris", z: "Europe/Paris" },
    { n: "Berlin", z: "Europe/Berlin" },
    { n: "Rome", z: "Europe/Rome" },
    { n: "Madrid", z: "Europe/Madrid" },
    { n: "Amsterdam", z: "Europe/Amsterdam" },
    { n: "Stockholm", z: "Europe/Stockholm" },
    { n: "Zurich", z: "Europe/Zurich" },
    { n: "Athens", z: "Europe/Athens" },
    { n: "Cairo", z: "Africa/Cairo" },
    { n: "Johannesburg", z: "Africa/Johannesburg" },
    { n: "Nairobi", z: "Africa/Nairobi" },
    { n: "Lagos", z: "Africa/Lagos" },
    { n: "New York", z: "America/New_York" },
    { n: "Chicago", z: "America/Chicago" },
    { n: "Denver", z: "America/Denver" },
    { n: "Los Angeles", z: "America/Los_Angeles" },
    { n: "Phoenix", z: "America/Phoenix" },
    { n: "Anchorage", z: "America/Anchorage" },
    { n: "Honolulu", z: "Pacific/Honolulu" },
    { n: "Toronto", z: "America/Toronto" },
    { n: "Vancouver", z: "America/Vancouver" },
    { n: "Mexico City", z: "America/Mexico_City" },
    { n: "Bogota", z: "America/Bogota" },
    { n: "Lima", z: "America/Lima" },
    { n: "Santiago", z: "America/Santiago" },
    { n: "Sao Paulo", z: "America/Sao_Paulo" },
    { n: "Buenos Aires", z: "America/Argentina/Buenos_Aires" },
    { n: "Sydney", z: "Australia/Sydney" },
    { n: "Melbourne", z: "Australia/Melbourne" },
    { n: "Perth", z: "Australia/Perth" },
    { n: "Auckland", z: "Pacific/Auckland" },
    { n: "Fiji", z: "Pacific/Fiji" },
    { n: "Guam", z: "Pacific/Guam" },
    { n: "Almaty", z: "Asia/Almaty" },
    { n: "Ulaanbaatar", z: "Asia/Ulaanbaatar" }
  ];

  /* IANA 时区下拉列表 */
  var ZONES = [
    "UTC",
    "Africa/Abidjan", "Africa/Accra", "Africa/Addis_Ababa", "Africa/Algiers",
    "Africa/Cairo", "Africa/Casablanca", "Africa/Johannesburg", "Africa/Khartoum",
    "Africa/Lagos", "Africa/Nairobi", "Africa/Tripoli", "Africa/Tunis",
    "America/Anchorage", "America/Argentina/Buenos_Aires", "America/Bogota",
    "America/Caracas", "America/Chicago", "America/Denver", "America/Halifax",
    "America/Havana", "America/Lima", "America/Los_Angeles", "America/Mexico_City",
    "America/New_York", "America/Phoenix", "America/Santiago", "America/Sao_Paulo",
    "America/St_Johns", "America/Toronto", "America/Vancouver",
    "Asia/Almaty", "Asia/Baghdad", "Asia/Bangkok", "Asia/Beirut", "Asia/Colombo",
    "Asia/Damascus", "Asia/Dhaka", "Asia/Dubai", "Asia/Hong_Kong", "Asia/Jakarta",
    "Asia/Jerusalem", "Asia/Karachi", "Asia/Kathmandu", "Asia/Kolkata",
    "Asia/Kuala_Lumpur", "Asia/Manila", "Asia/Riyadh", "Asia/Seoul",
    "Asia/Shanghai", "Asia/Singapore", "Asia/Taipei", "Asia/Tehran", "Asia/Tokyo",
    "Asia/Ulaanbaatar", "Asia/Yangon", "Asia/Yerevan",
    "Atlantic/Azores", "Atlantic/Canary", "Atlantic/Reykjavik",
    "Australia/Adelaide", "Australia/Brisbane", "Australia/Melbourne",
    "Australia/Perth", "Australia/Sydney",
    "Europe/Amsterdam", "Europe/Athens", "Europe/Belgrade", "Europe/Berlin",
    "Europe/Brussels", "Europe/Bucharest", "Europe/Budapest", "Europe/Copenhagen",
    "Europe/Dublin", "Europe/Helsinki", "Europe/Istanbul", "Europe/Kyiv",
    "Europe/Lisbon", "Europe/Ljubljana", "Europe/London", "Europe/Madrid",
    "Europe/Minsk", "Europe/Moscow", "Europe/Oslo", "Europe/Paris", "Europe/Prague",
    "Europe/Riga", "Europe/Rome", "Europe/Stockholm", "Europe/Vienna",
    "Europe/Vilnius", "Europe/Warsaw", "Europe/Zurich",
    "Pacific/Auckland", "Pacific/Fiji", "Pacific/Guam", "Pacific/Honolulu",
    "Pacific/Kiritimati", "Pacific/Noumea", "Pacific/Pago_Pago",
    "Pacific/Port_Moresby", "Pacific/Tahiti", "Pacific/Tongatapu"
  ];

  /* UTC-12 ~ UTC+14 速查表 */
  var TZ_TABLE = [
    { off: -12, z: "Etc/GMT+12", cities: "Baker Island (uninhabited)" },
    { off: -11, z: "Pacific/Pago_Pago", cities: "Pago Pago, Niue" },
    { off: -10, z: "Pacific/Honolulu", cities: "Honolulu" },
    { off: -9, z: "America/Anchorage", cities: "Anchorage" },
    { off: -8, z: "America/Los_Angeles", cities: "Los Angeles, Vancouver" },
    { off: -7, z: "America/Denver", cities: "Denver, Phoenix" },
    { off: -6, z: "America/Chicago", cities: "Chicago, Mexico City" },
    { off: -5, z: "America/New_York", cities: "New York, Toronto, Havana" },
    { off: -4, z: "America/Halifax", cities: "Halifax, Caracas" },
    { off: -3, z: "America/Sao_Paulo", cities: "Sao Paulo, Buenos Aires" },
    { off: -2, z: "Etc/GMT+2", cities: "South Georgia" },
    { off: -1, z: "Atlantic/Azores", cities: "Azores, Cape Verde" },
    { off: 0, z: "Europe/London", cities: "London, Lisbon, Accra" },
    { off: 1, z: "Europe/Paris", cities: "Paris, Berlin, Madrid" },
    { off: 2, z: "Europe/Athens", cities: "Athens, Cairo, Johannesburg" },
    { off: 3, z: "Europe/Moscow", cities: "Moscow, Nairobi, Riyadh" },
    { off: 4, z: "Asia/Dubai", cities: "Dubai, Baku" },
    { off: 5, z: "Asia/Karachi", cities: "Karachi, Tashkent" },
    { off: 6, z: "Asia/Dhaka", cities: "Dhaka, Almaty" },
    { off: 7, z: "Asia/Bangkok", cities: "Bangkok, Jakarta" },
    { off: 8, z: "Asia/Shanghai", cities: "Beijing, Singapore, Perth" },
    { off: 9, z: "Asia/Tokyo", cities: "Tokyo, Seoul" },
    { off: 10, z: "Australia/Sydney", cities: "Sydney, Guam" },
    { off: 11, z: "Pacific/Noumea", cities: "Noumea, Solomon Islands" },
    { off: 12, z: "Pacific/Auckland", cities: "Auckland, Fiji" },
    { off: 13, z: "Pacific/Tongatapu", cities: "Nukualofa (Tonga)" },
    { off: 14, z: "Pacific/Kiritimati", cities: "Kiritimati (Kiribati)" }
  ];

  var UTC_STR = "UTC";

  /* ---------- DOM ---------- */
  var clockList = document.getElementById("clockList");
  var wcCity = document.getElementById("wcCity");
  var wcTz = document.getElementById("wcTz");
  var btnAddClock = document.getElementById("btnAddClock");
  var timeSlider = document.getElementById("timeSlider");
  var sliderVal = document.getElementById("sliderVal");
  var btnLive = document.getElementById("btnLive");
  var liveTip = document.getElementById("liveTip");
  var srcTz = document.getElementById("srcTz");
  var srcTime = document.getElementById("srcTime");
  var convList = document.getElementById("convList");
  var convTz = document.getElementById("convTz");
  var btnAddTarget = document.getElementById("btnAddTarget");
  var tzTbody = document.querySelector("#tzTable tbody");
  var wfzA = document.getElementById("wfzA");
  var wfzB = document.getElementById("wfzB");
  var wfStartA = document.getElementById("wfStartA");
  var wfEndA = document.getElementById("wfEndA");
  var wfStartB = document.getElementById("wfStartB");
  var wfEndB = document.getElementById("wfEndB");
  var btnOverlap = document.getElementById("btnOverlap");
  var overlapResult = document.getElementById("overlapResult");

  /* ---------- 工具函数 ---------- */
  function locale() {
    return document.documentElement.lang === "en" ? "en-US" : "zh-CN";
  }

  function pad2(n) {
    return (n < 10 ? "0" : "") + n;
  }

  function fmtHM(mins) {
    mins = ((mins % 1440) + 1440) % 1440;
    return pad2(Math.floor(mins / 60)) + ":" + pad2(mins % 60);
  }

  function localDatetimeValue(d) {
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()) +
      "T" + pad2(d.getHours()) + ":" + pad2(d.getMinutes());
  }

  /* 取某时区在某时刻的各日期时间分量 */
  var partsCache = {};
  function tzParts(timeZone, date) {
    var key = timeZone + "|" + locale();
    var f = partsCache[key];
    if (!f) {
      f = new Intl.DateTimeFormat(locale(), {
        timeZone: timeZone,
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
      partsCache[key] = f;
    }
    var map = {};
    f.formatToParts(date).forEach(function (p) { map[p.type] = p.value; });
    return {
      y: +map.year, mo: +map.month, d: +map.day,
      h: +map.hour, mi: +map.minute, s: +map.second
    };
  }

  /* 该时区相对 UTC 的偏移（分钟） */
  function offsetMinutes(timeZone, date) {
    var p = tzParts(timeZone, date);
    var asUTC = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s);
    var t = date.getTime();
    t -= t % 1000;
    return Math.round((asUTC - t) / 60000);
  }

  function fmtOffset(mins) {
    var sign = mins < 0 ? "-" : "+";
    var a = Math.abs(mins);
    return UTC_STR + sign + pad2(Math.floor(a / 60)) + ":" + pad2(a % 60);
  }

  var simpleFmtCache = {};
  function simpleFmt(type, timeZone) {
    var key = type + "|" + timeZone + "|" + locale();
    var f = simpleFmtCache[key];
    if (!f) {
      var opts = { timeZone: timeZone };
      if (type === "date") {
        opts.month = "long";
        opts.day = "numeric";
      } else if (type === "week") {
        opts.weekday = "short";
      } else {
        opts.hourCycle = "h23";
        opts.hour = "2-digit";
        opts.minute = "2-digit";
        if (type === "timeSec") opts.second = "2-digit";
      }
      f = new Intl.DateTimeFormat(locale(), opts);
      simpleFmtCache[key] = f;
    }
    return f;
  }

  function fmtDate(timeZone, date) { return simpleFmt("date", timeZone).format(date); }
  function fmtWeekday(timeZone, date) { return simpleFmt("week", timeZone).format(date); }
  function fmtTime(timeZone, date) { return simpleFmt("timeMin", timeZone).format(date); }
  function fmtTimeSec(timeZone, date) { return simpleFmt("timeSec", timeZone).format(date); }

  /* 是否实行夏令时；当前是否处于夏令时 */
  function dstState(timeZone, date) {
    var year = date.getUTCFullYear();
    var jan = offsetMinutes(timeZone, new Date(Date.UTC(year, 0, 15, 12)));
    var jul = offsetMinutes(timeZone, new Date(Date.UTC(year, 6, 15, 12)));
    if (jan === jul) return null;
    var cur = offsetMinutes(timeZone, date);
    return cur === Math.max(jan, jul);
  }

  /* 时区 -> 显示名（优先常用城市名） */
  function tzLabel(timeZone) {
    for (var i = 0; i < CITIES.length; i++) {
      if (CITIES[i].z === timeZone) return t(CITIES[i].n);
    }
    return timeZone;
  }

  /* 墙上时间 -> UTC 时刻（两次逼近，处理夏令时切换） */
  function tzWallToInstant(timeZone, y, mo, d, h, mi) {
    var guess = Date.UTC(y, mo - 1, d, h, mi);
    var off = offsetMinutes(timeZone, new Date(guess));
    var t = guess - off * 60000;
    off = offsetMinutes(timeZone, new Date(t));
    return new Date(guess - off * 60000);
  }

  /* 时刻 -> 某时区的当天分钟数（含跨天偏移） */
  function wallMinutes(timeZone, instant, y, mo, d) {
    var p = tzParts(timeZone, instant);
    var dayDiff = Math.round(
      (Date.UTC(p.y, p.mo - 1, p.d) - Date.UTC(y, mo - 1, d)) / 86400000
    );
    return dayDiff * 1440 + p.h * 60 + p.mi;
  }

  /* 24 小时圆环上两段区间的重叠分钟数 */
  function circleOverlap(s1, e1, s2, e2) {
    var total = 0;
    for (var shift = -1440; shift <= 1440; shift += 1440) {
      var lo = Math.max(s1, s2 + shift);
      var hi = Math.min(e1, e2 + shift);
      if (hi > lo) total += hi - lo;
    }
    return total;
  }

  /* ---------- 提示与复制 ---------- */
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

  function copyText(text, msg) {
    function done() { showToast(msg); }
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

  /* ---------- 下拉列表填充 ---------- */
  function fillCitySelect() {
    var ph = document.createElement("option");
    ph.value = "";
    ph.textContent = t("Quick pick a city");
    wcCity.appendChild(ph);
    CITIES.forEach(function (c) {
      var o = document.createElement("option");
      o.value = c.z;
      o.textContent = c.n;
      wcCity.appendChild(o);
    });
  }

  function fillZoneSelect(sel, placeholder) {
    if (placeholder) {
      var ph = document.createElement("option");
      ph.value = "";
      ph.textContent = placeholder;
      sel.appendChild(ph);
    }
    ZONES.forEach(function (z) {
      var o = document.createElement("option");
      o.value = z;
      o.textContent = z;
      sel.appendChild(o);
    });
  }

  fillCitySelect();
  fillZoneSelect(wcTz, t("or pick any IANA time zone"));
  fillZoneSelect(srcTz);
  fillZoneSelect(convTz, t("Select a target zone"));
  fillZoneSelect(wfzA);
  fillZoneSelect(wfzB);

  try {
    var localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (localTz && ZONES.indexOf(localTz) > -1) srcTz.value = localTz;
  } catch (e) { /* ignore */ }
  if (!srcTz.value) srcTz.value = "Asia/Shanghai";
  wfzA.value = "Asia/Shanghai";
  wfzB.value = "America/New_York";

  /* ---------- 世界时钟 ---------- */
  var clocks = [
    { n: "Beijing", z: "Asia/Shanghai" },
    { n: "Tokyo", z: "Asia/Tokyo" },
    { n: "London", z: "Europe/London" },
    { n: "New York", z: "America/New_York" },
    { n: "Los Angeles", z: "America/Los_Angeles" }
  ];

  var sliderMin = null; /* null 表示实时模式 */

  function currentInstant() {
    if (sliderMin === null) return new Date();
    var now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, sliderMin, 0);
  }

  function renderClocks() {
    clockList.innerHTML = "";
    if (!clocks.length) {
      var tip = document.createElement("div");
      tip.className = "empty-tip";
      tip.textContent = t("The clock list is empty. Add one from above.");
      clockList.appendChild(tip);
      return;
    }
    clocks.forEach(function (c) {
      var card = document.createElement("div");
      card.className = "clock-card";

      var info = document.createElement("div");
      info.className = "clock-info";
      var city = document.createElement("div");
      city.className = "clock-city";
      city.textContent = t(c.n);
      var time = document.createElement("div");
      time.className = "clock-time";
      var date = document.createElement("div");
      date.className = "clock-date";
      info.appendChild(city);
      info.appendChild(time);
      info.appendChild(date);

      var meta = document.createElement("div");
      meta.className = "clock-meta";
      var off = document.createElement("span");
      off.className = "badge blue";
      var dst = document.createElement("span");
      dst.className = "badge green";
      dst.hidden = true;
      dst.textContent = t("DST");
      meta.appendChild(off);
      meta.appendChild(dst);

      var ops = document.createElement("div");
      ops.className = "clock-ops";
      var up = document.createElement("button");
      up.type = "button";
      up.className = "mini";
      up.textContent = "↑";
      up.setAttribute("aria-label", t("Move Up"));
      var down = document.createElement("button");
      down.type = "button";
      down.className = "mini";
      down.textContent = "↓";
      down.setAttribute("aria-label", t("Move Down"));
      var copy = document.createElement("button");
      copy.type = "button";
      copy.className = "mini";
      copy.textContent = t("Copy");
      var del = document.createElement("button");
      del.type = "button";
      del.className = "mini danger";
      del.textContent = t("Delete");
      ops.appendChild(up);
      ops.appendChild(down);
      ops.appendChild(copy);
      ops.appendChild(del);

      up.addEventListener("click", function () { moveClock(c, -1); });
      down.addEventListener("click", function () { moveClock(c, 1); });
      copy.addEventListener("click", function () { copyClock(c); });
      del.addEventListener("click", function () {
        clocks = clocks.filter(function (x) { return x !== c; });
        renderClocks();
        tick();
      });

      card.appendChild(info);
      card.appendChild(meta);
      card.appendChild(ops);
      clockList.appendChild(card);

      c.refs = { time: time, date: date, off: off, dst: dst };
    });
  }

  function moveClock(c, dir) {
    var i = clocks.indexOf(c);
    var j = i + dir;
    if (i < 0 || j < 0 || j >= clocks.length) return;
    var tmp = clocks[i];
    clocks[i] = clocks[j];
    clocks[j] = tmp;
    renderClocks();
    tick();
  }

  function updateClocks(instant) {
    clocks.forEach(function (c) {
      if (!c.refs) return;
      c.refs.time.textContent = fmtTimeSec(c.z, instant);
      c.refs.date.textContent = fmtDate(c.z, instant) + " " + fmtWeekday(c.z, instant);
      c.refs.off.textContent = fmtOffset(offsetMinutes(c.z, instant));
      c.refs.dst.hidden = !dstState(c.z, instant);
    });
  }

  function copyClock(c) {
    var instant = currentInstant();
    var line = t("{a}：{b} {c} {d}（{e}）", {
      a: t(c.n),
      b: fmtDate(c.z, instant),
      c: fmtWeekday(c.z, instant),
      d: fmtTimeSec(c.z, instant),
      e: fmtOffset(offsetMinutes(c.z, instant))
    });
    copyText(line, t("Copied the current time of {n}", { n: t(c.n) }));
  }

  wcCity.addEventListener("change", function () {
    if (wcCity.value) wcTz.value = wcCity.value;
  });

  wcTz.addEventListener("change", function () {
    var z = wcTz.value;
    if (!z) return;
    var hit = null;
    for (var i = 0; i < CITIES.length; i++) {
      if (CITIES[i].z === z) { hit = CITIES[i].z; break; }
    }
    wcCity.value = hit || "";
  });

  btnAddClock.addEventListener("click", function () {
    var z = wcTz.value;
    if (!z) {
      showToast(t("Select a time zone to add first"));
      return;
    }
    if (clocks.some(function (c) { return c.z === z; })) {
      showToast(t("This time zone is already in the list"));
      return;
    }
    var name = wcCity.value ? wcCity.options[wcCity.selectedIndex].text : tzLabel(z);
    clocks.push({ n: name, z: z });
    wcCity.value = "";
    renderClocks();
    tick();
  });

  /* ---------- 时间滑块 ---------- */
  function initSlider() {
    var now = new Date();
    var m = now.getHours() * 60 + now.getMinutes();
    timeSlider.value = String(m);
    sliderVal.textContent = fmtHM(m);
    liveTip.textContent = t("Live");
  }

  timeSlider.addEventListener("input", function () {
    sliderMin = +timeSlider.value;
    sliderVal.textContent = fmtHM(sliderMin);
    btnLive.hidden = false;
    liveTip.textContent = t("Slider");
    tick();
  });

  btnLive.addEventListener("click", function () {
    sliderMin = null;
    btnLive.hidden = true;
    liveTip.textContent = t("Live");
    initSlider();
    tick();
  });

  /* ---------- 时间转换器 ---------- */
  var convTargets = [
    "Asia/Tokyo",
    "Europe/London",
    "America/New_York",
    "Australia/Sydney"
  ];
  var convRows = [];

  function renderConv() {
    convList.innerHTML = "";
    convRows = [];
    convTargets.forEach(function (z) {
      var row = document.createElement("div");
      row.className = "conv-row";
      var tz = document.createElement("span");
      tz.className = "conv-tz";
      tz.textContent = tzLabel(z);
      var time = document.createElement("span");
      time.className = "conv-time";
      var del = document.createElement("button");
      del.type = "button";
      del.className = "mini danger";
      del.textContent = "✕";
      del.setAttribute("aria-label", t("Delete"));
      del.addEventListener("click", function () {
        convTargets = convTargets.filter(function (x) { return x !== z; });
        renderConv();
      });
      row.appendChild(tz);
      row.appendChild(time);
      row.appendChild(del);
      convList.appendChild(row);
      convRows.push({ z: z, time: time });
    });
    updateConv();
  }

  function updateConv() {
    var v = srcTime.value;
    var instant = null;
    if (v) {
      var parts = v.split("T");
      var dp = parts[0].split("-");
      var tp = (parts[1] || "00:00").split(":");
      instant = tzWallToInstant(
        srcTz.value,
        +dp[0], +dp[1], +dp[2],
        +tp[0], +tp[1] || 0
      );
    }
    convRows.forEach(function (r) {
      if (!instant) {
        r.time.textContent = "—";
        return;
      }
      r.time.textContent =
        fmtDate(r.z, instant) + " " + fmtWeekday(r.z, instant) + " " + fmtTimeSec(r.z, instant);
    });
  }

  srcTz.addEventListener("change", updateConv);
  srcTime.addEventListener("input", updateConv);

  btnAddTarget.addEventListener("click", function () {
    var z = convTz.value;
    if (!z) {
      showToast(t("Select a time zone to add first"));
      return;
    }
    if (convTargets.indexOf(z) > -1) {
      showToast(t("This time zone is already in the list"));
      return;
    }
    convTargets.push(z);
    renderConv();
  });

  /* ---------- 常用时区速查表 ---------- */
  var tzRows = [];

  function renderTable() {
    tzTbody.innerHTML = "";
    tzRows = [];
    TZ_TABLE.forEach(function (row) {
      var tr = document.createElement("tr");
      var td1 = document.createElement("td");
      td1.textContent = UTC_STR + (row.off < 0 ? "-" : "+") + Math.abs(row.off);
      var td2 = document.createElement("td");
      td2.textContent = t(row.cities);
      var td3 = document.createElement("td");
      td3.className = "num";
      var time = document.createElement("span");
      var dst = document.createElement("span");
      dst.className = "badge green";
      dst.style.marginLeft = "8px";
      dst.hidden = true;
      dst.textContent = t("DST");
      td3.appendChild(time);
      td3.appendChild(dst);
      tr.appendChild(td1);
      tr.appendChild(td2);
      tr.appendChild(td3);
      tzTbody.appendChild(tr);
      tzRows.push({ z: row.z, time: time, dst: dst });
    });
  }

  function updateTable(instant) {
    tzRows.forEach(function (r) {
      r.time.textContent = fmtTime(r.z, instant);
      r.dst.hidden = !dstState(r.z, instant);
    });
  }

  /* ---------- 共同工作时段 ---------- */
  btnOverlap.addEventListener("click", function () {
    var tzA = wfzA.value;
    var tzB = wfzB.value;
    var nums = [wfStartA.value, wfEndA.value, wfStartB.value, wfEndB.value].map(function (v) {
      var s = String(v).trim();
      if (s === "") return NaN;
      return Number(s);
    });
    var valid = nums.every(function (n) {
      return typeof n === "number" && n === n && n >= 0 && n <= 24 && n % 1 === 0;
    });
    if (!valid) {
      overlapResult.hidden = false;
      overlapResult.textContent = t("Enter valid working hours between 0 and 24");
      return;
    }
    if (nums[1] <= nums[0] || nums[3] <= nums[2]) {
      overlapResult.hidden = false;
      overlapResult.textContent = t("The end time must be later than the start time");
      return;
    }
    var sA = nums[0] * 60, eA = nums[1] * 60;
    var sB = nums[2] * 60, eB = nums[3] * 60;

    var now = new Date();
    var y = now.getUTCFullYear(), mo = now.getUTCMonth() + 1, d = now.getUTCDate();

    /* A 的工作窗口换算到 B 的墙上时间 */
    var aStart = tzWallToInstant(tzA, y, mo, d, nums[0], 0);
    var aEnd = tzWallToInstant(tzA, y, mo, d, nums[1], 0);
    var bStart = wallMinutes(tzB, aStart, y, mo, d);
    var bEnd = wallMinutes(tzB, aEnd, y, mo, d);
    var delta = bStart - sA;

    var total = circleOverlap(bStart, bEnd, sB, eB);
    overlapResult.hidden = false;
    if (total <= 0) {
      overlapResult.textContent = t("The two work schedules have no overlap. Consider async communication or staggered hours.");
      return;
    }

    /* 取实际重叠区间 */
    var lo = null, hi = null;
    for (var shift = -1440; shift <= 1440; shift += 1440) {
      var l = Math.max(bStart, sB + shift);
      var h = Math.min(bEnd, eB + shift);
      if (h - l === total) { lo = l; hi = h; break; }
    }
    if (lo === null) { lo = Math.max(bStart, sB); hi = Math.min(bEnd, eB); }

    var hours = total / 60;
    var hoursTxt = (hours % 1 === 0) ? String(hours) : hours.toFixed(1);
    overlapResult.textContent =
      t("Overlap: {c} hours", { c: hoursTxt }) + "（" +
      t("{za} {a} - {b}", { za: tzLabel(tzA), a: fmtHM(lo - delta), b: fmtHM(hi - delta) }) + "；" +
      t("{za} {a} - {b}", { za: tzLabel(tzB), a: fmtHM(lo), b: fmtHM(hi) }) + "）";
  });

  /* ---------- 主循环 ---------- */
  function tick() {
    var instant = currentInstant();
    updateClocks(instant);
    updateTable(instant);
  }

  /* ---------- 初始化 ---------- */
  renderClocks();
  renderConv();
  renderTable();
  initSlider();
  srcTime.value = localDatetimeValue(new Date());
  updateConv();
  tick();
  setInterval(tick, 1000);
})();
