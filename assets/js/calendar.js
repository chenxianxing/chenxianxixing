/* ============================================================
   日历工具 - 工具页逻辑
   月视图 + 中国法定节假日（2024-2027） + 日期详情/统计/倒计时
   2024-2026 数据来源：国务院办公厅年度放假安排通知
   2027 数据为依据《全国年节及纪念日放假办法》调休原则推导的预测，
   正式通知发布后请以官方安排为准并更新下方 HOLIDAY_DATA
   ============================================================ */
(function () {
  "use strict";

  /* ---------- 节假日数据 ---------- */
  var HOLIDAY_DATA = {
    2024: {
      holidays: [
        { name: "元旦", start: "2024-01-01", end: "2024-01-01" },
        { name: "春节", start: "2024-02-10", end: "2024-02-17" },
        { name: "清明节", start: "2024-04-04", end: "2024-04-06" },
        { name: "劳动节", start: "2024-05-01", end: "2024-05-05" },
        { name: "端午节", start: "2024-06-08", end: "2024-06-10" },
        { name: "中秋节", start: "2024-09-15", end: "2024-09-17" },
        { name: "国庆节", start: "2024-10-01", end: "2024-10-07" }
      ],
      workdays: [
        "2024-02-04", "2024-02-18", "2024-04-07", "2024-04-28",
        "2024-05-11", "2024-09-14", "2024-09-29", "2024-10-12"
      ]
    },
    2025: {
      holidays: [
        { name: "元旦", start: "2025-01-01", end: "2025-01-01" },
        { name: "春节", start: "2025-01-28", end: "2025-02-04" },
        { name: "清明节", start: "2025-04-04", end: "2025-04-06" },
        { name: "劳动节", start: "2025-05-01", end: "2025-05-05" },
        { name: "端午节", start: "2025-05-31", end: "2025-06-02" },
        { name: "国庆节", start: "2025-10-01", end: "2025-10-08" }
      ],
      workdays: [
        "2025-01-26", "2025-02-08", "2025-04-27", "2025-09-28", "2025-10-11"
      ]
    },
    2026: {
      holidays: [
        { name: "元旦", start: "2026-01-01", end: "2026-01-03" },
        { name: "春节", start: "2026-02-15", end: "2026-02-23" },
        { name: "清明节", start: "2026-04-04", end: "2026-04-06" },
        { name: "劳动节", start: "2026-05-01", end: "2026-05-05" },
        { name: "端午节", start: "2026-06-19", end: "2026-06-21" },
        { name: "中秋节", start: "2026-09-25", end: "2026-09-27" },
        { name: "国庆节", start: "2026-10-01", end: "2026-10-07" }
      ],
      workdays: [
        "2026-01-04", "2026-02-14", "2026-02-28", "2026-05-09",
        "2026-09-20", "2026-10-10"
      ]
    },
    2027: {
      holidays: [
        { name: "元旦", start: "2027-01-01", end: "2027-01-03" },
        { name: "春节", start: "2027-02-05", end: "2027-02-13" },
        { name: "清明节", start: "2027-04-03", end: "2027-04-05" },
        { name: "劳动节", start: "2027-05-01", end: "2027-05-05" },
        { name: "端午节", start: "2027-06-09", end: "2027-06-09" },
        { name: "中秋节", start: "2027-09-15", end: "2027-09-15" },
        { name: "国庆节", start: "2027-10-01", end: "2027-10-07" }
      ],
      workdays: [
        "2027-01-31", "2027-02-14", "2027-05-08", "2027-09-26", "2027-10-09"
      ]
    }
  };

  var WEEK_CHARS = ["日", "一", "二", "三", "四", "五", "六"];

  /* ---------- DOM ---------- */
  var calWeek = document.getElementById("calWeek");
  var calGrid = document.getElementById("calGrid");
  var btnPrev = document.getElementById("btnPrev");
  var btnNext = document.getElementById("btnNext");
  var btnToday = document.getElementById("btnToday");
  var yearSel = document.getElementById("yearSel");
  var monthSel = document.getElementById("monthSel");
  var weekStartRow = document.getElementById("weekStartRow");
  var ddDate = document.getElementById("ddDate");
  var ddWeek = document.getElementById("ddWeek");
  var ddDayOfYear = document.getElementById("ddDayOfYear");
  var ddWeekNo = document.getElementById("ddWeekNo");
  var ddDiff = document.getElementById("ddDiff");
  var ddType = document.getElementById("ddType");
  var stDays = document.getElementById("stDays");
  var stWork = document.getElementById("stWork");
  var stHoliday = document.getElementById("stHoliday");
  var stWeekend = document.getElementById("stWeekend");
  var cdName = document.getElementById("cdName");
  var cdRange = document.getElementById("cdRange");
  var cdDays = document.getElementById("cdDays");

  /* ---------- 工具函数 ---------- */
  function locale() {
    return document.documentElement.lang === "en" ? "en-US" : "zh-CN";
  }

  function pad2(n) {
    return (n < 10 ? "0" : "") + n;
  }

  function dateKey(y, m, d) {
    return y + "-" + pad2(m + 1) + "-" + pad2(d);
  }

  function parseKey(key) {
    var p = key.split("-");
    return { y: +p[0], m: +p[1] - 1, d: +p[2] };
  }

  function startOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function dayDiff(a, b) {
    return Math.round((startOfDay(a) - startOfDay(b)) / 86400000);
  }

  function fmtLongDate(d) {
    return new Intl.DateTimeFormat(locale(), {
      year: "numeric",
      month: "long",
      day: "numeric"
    }).format(d);
  }

  function fmtWeekdayLong(d) {
    return new Intl.DateTimeFormat(locale(), { weekday: "long" }).format(d);
  }

  function fmtShortDate(d) {
    return new Intl.DateTimeFormat(locale(), { month: "short", day: "numeric" }).format(d);
  }

  function dayOfYear(d) {
    return Math.floor((startOfDay(d) - new Date(d.getFullYear(), 0, 1)) / 86400000) + 1;
  }

  /* ISO 8601 周数（周一为每周起始） */
  function isoWeek(d) {
    var t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    var day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    var yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return Math.ceil(((t - yearStart) / 86400000 + 1) / 7);
  }

  /* ---------- 节假日查询 ---------- */
  function holidayInfo(key) {
    var p = parseKey(key);
    var data = HOLIDAY_DATA[p.y];
    if (!data) return null;
    for (var i = 0; i < data.holidays.length; i++) {
      var h = data.holidays[i];
      if (key >= h.start && key <= h.end) return h;
    }
    return null;
  }

  function isMakeupWorkday(key) {
    var p = parseKey(key);
    var data = HOLIDAY_DATA[p.y];
    return !!data && data.workdays.indexOf(key) > -1;
  }

  function isWeekend(y, m, d) {
    var wd = new Date(y, m, d).getDay();
    return wd === 0 || wd === 6;
  }

  /* ---------- 状态 ---------- */
  var today = startOfDay(new Date());
  var viewY = today.getFullYear();
  var viewM = today.getMonth();
  var selected = today;
  var weekStart = 0;

  /* ---------- 渲染 ---------- */
  function renderWeekHeader() {
    calWeek.innerHTML = "";
    for (var i = 0; i < 7; i++) {
      var span = document.createElement("span");
      span.textContent = t(WEEK_CHARS[(i + weekStart) % 7]);
      calWeek.appendChild(span);
    }
  }

  function renderGrid() {
    calGrid.innerHTML = "";
    var first = new Date(viewY, viewM, 1);
    var daysInMonth = new Date(viewY, viewM + 1, 0).getDate();
    var offset = (first.getDay() - weekStart + 7) % 7;
    /* 固定 6 行 42 格，保持高度稳定 */
    var total = 42;

    for (var i = 0; i < total; i++) {
      var cellDate = new Date(viewY, viewM, 1 - offset + i);
      var key = dateKey(cellDate.getFullYear(), cellDate.getMonth(), cellDate.getDate());
      var cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cal-cell";
      cell.setAttribute("data-key", key);

      var num = document.createElement("span");
      num.className = "cal-num";
      num.textContent = String(cellDate.getDate());
      cell.appendChild(num);

      var holiday = holidayInfo(key);
      var makeup = isMakeupWorkday(key);
      if (holiday) {
        cell.classList.add("holiday");
        var fest = document.createElement("span");
        fest.className = "cal-fest";
        fest.textContent = t(holiday.name);
        cell.appendChild(fest);
        cell.title = t(holiday.name);
      } else if (makeup) {
        cell.classList.add("makeup");
        cell.title = t("调休工作日");
      }
      if (holiday) {
        var rest = document.createElement("span");
        rest.className = "cal-badge rest";
        rest.textContent = t("休");
        cell.appendChild(rest);
      } else if (makeup) {
        var work = document.createElement("span");
        work.className = "cal-badge work";
        work.textContent = t("班");
        cell.appendChild(work);
      }

      if (cellDate.getMonth() !== viewM || cellDate.getFullYear() !== viewY) {
        cell.classList.add("other-month");
      }
      if (dayDiff(cellDate, today) === 0) cell.classList.add("today");
      if (dayDiff(cellDate, selected) === 0) cell.classList.add("selected");

      cell.addEventListener("click", function (e) {
        var k = e.currentTarget.getAttribute("data-key");
        var p = parseKey(k);
        selected = new Date(p.y, p.m, p.d);
        if (p.y !== viewY || p.m !== viewM) {
          viewY = p.y;
          viewM = p.m;
          syncSelects();
        }
        renderAll();
      });

      calGrid.appendChild(cell);
    }
  }

  function renderDetail() {
    ddDate.textContent = fmtLongDate(selected);
    ddWeek.textContent = fmtWeekdayLong(selected);
    ddDayOfYear.textContent = t("第 {n} 天", { n: dayOfYear(selected) });
    ddWeekNo.textContent = t("第 {n} 周", { n: isoWeek(selected) });

    var diff = dayDiff(selected, today);
    ddDiff.textContent = diff === 0
      ? t("今天")
      : (diff > 0 ? t("{n} 天后", { n: diff }) : t("{n} 天前", { n: -diff }));

    var key = dateKey(selected.getFullYear(), selected.getMonth(), selected.getDate());
    var holiday = holidayInfo(key);
    var makeup = isMakeupWorkday(key);
    if (holiday) {
      ddType.textContent = t("节假日") + " · " + t(holiday.name);
    } else if (makeup) {
      ddType.textContent = t("调休工作日");
    } else if (isWeekend(selected.getFullYear(), selected.getMonth(), selected.getDate())) {
      ddType.textContent = t("周末");
    } else {
      ddType.textContent = t("工作日");
    }
  }

  function renderStats() {
    var days = new Date(viewY, viewM + 1, 0).getDate();
    var work = 0, holiday = 0, weekend = 0;
    for (var d = 1; d <= days; d++) {
      var key = dateKey(viewY, viewM, d);
      var h = holidayInfo(key);
      var mk = isMakeupWorkday(key);
      var we = isWeekend(viewY, viewM, d);
      if (h) holiday++;
      if (we) weekend++;
      if (mk || (!h && !we)) work++;
    }
    stDays.textContent = String(days);
    stWork.textContent = String(work);
    stHoliday.textContent = String(holiday);
    stWeekend.textContent = String(weekend);
  }

  function renderCountdown() {
    var data = HOLIDAY_DATA[today.getFullYear()];
    var candidates = [];
    if (data) {
      data.holidays.forEach(function (h) {
        if (h.end >= dateKey(today.getFullYear(), today.getMonth(), today.getDate())) {
          candidates.push(h);
        }
      });
    }
    /* 今年过完则看下一年 */
    if (!candidates.length) {
      var nextYear = today.getFullYear() + 1;
      var nd = HOLIDAY_DATA[nextYear];
      if (nd) candidates = nd.holidays.slice();
    }

    if (!candidates.length) {
      cdName.textContent = t("暂无所选年份的节假日数据");
      cdRange.textContent = "--";
      cdDays.textContent = "--";
      return;
    }

    var h = candidates[0];
    var start = parseKey(h.start);
    var end = parseKey(h.end);
    var startDate = new Date(start.y, start.m, start.d);
    var endDate = new Date(end.y, end.m, end.d);
    cdName.textContent = t(h.name);
    cdRange.textContent = fmtShortDate(startDate) + " - " + fmtShortDate(endDate);

    var diff = dayDiff(startDate, today);
    if (diff > 0) {
      cdDays.textContent = t("还有 {n} 天", { n: diff });
    } else if (dayDiff(endDate, today) >= 0) {
      cdDays.textContent = t("进行中，还有 {n} 天", { n: dayDiff(endDate, today) + 1 });
    } else {
      cdDays.textContent = t("已结束");
    }
  }

  function renderAll() {
    renderWeekHeader();
    renderGrid();
    renderDetail();
    renderStats();
  }

  function syncSelects() {
    yearSel.value = String(viewY);
    monthSel.value = String(viewM + 1);
  }

  /* ---------- 下拉列表 ---------- */
  function fillSelects() {
    for (var y = 2015; y <= 2040; y++) {
      var o = document.createElement("option");
      o.value = String(y);
      o.textContent = String(y);
      yearSel.appendChild(o);
    }
    for (var m = 1; m <= 12; m++) {
      var om = document.createElement("option");
      om.value = String(m);
      om.textContent = pad2(m);
      monthSel.appendChild(om);
    }
    syncSelects();
  }

  /* ---------- 事件 ---------- */
  btnPrev.addEventListener("click", function () {
    viewM -= 1;
    if (viewM < 0) { viewM = 11; viewY -= 1; }
    syncSelects();
    renderAll();
  });

  btnNext.addEventListener("click", function () {
    viewM += 1;
    if (viewM > 11) { viewM = 0; viewY += 1; }
    syncSelects();
    renderAll();
  });

  btnToday.addEventListener("click", function () {
    viewY = today.getFullYear();
    viewM = today.getMonth();
    selected = today;
    syncSelects();
    renderAll();
  });

  yearSel.addEventListener("change", function () {
    viewY = +yearSel.value;
    renderAll();
  });

  monthSel.addEventListener("change", function () {
    viewM = +monthSel.value - 1;
    renderAll();
  });

  Array.prototype.forEach.call(weekStartRow.querySelectorAll("label"), function (label) {
    label.addEventListener("click", function () {
      Array.prototype.forEach.call(weekStartRow.querySelectorAll("label"), function (l) {
        l.classList.remove("checked");
      });
      label.classList.add("checked");
    });
  });

  weekStartRow.addEventListener("change", function () {
    var checked = weekStartRow.querySelector("input:checked");
    weekStart = checked ? +checked.value : 0;
    renderAll();
  });

  /* 键盘快捷键：← → 切换月份，T 回今天 */
  document.addEventListener("keydown", function (e) {
    var tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
    if (e.key === "ArrowLeft") {
      btnPrev.click();
    } else if (e.key === "ArrowRight") {
      btnNext.click();
    } else if (e.key === "t" || e.key === "T") {
      btnToday.click();
    }
  });

  /* ---------- 初始化 ---------- */
  fillSelects();
  renderAll();
  renderCountdown();
})();
