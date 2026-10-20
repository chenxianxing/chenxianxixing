/* ============================================================
   便捷工具箱 - 全站通用脚本
   ============================================================ */
(function () {
  "use strict";

  /* 页脚年份自动填充 */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });

  /* 首页工具搜索过滤 */
  var searchInput = document.getElementById("toolSearch");
  if (!searchInput) return;

  var grid = document.getElementById("toolsGrid");
  if (!grid) return;

  var cards = Array.prototype.slice.call(grid.querySelectorAll(".tool-card"));
  var emptyState = document.getElementById("emptyState");
  var countEl = document.getElementById("toolCount");

  searchInput.addEventListener("input", function () {
    var kw = searchInput.value.trim().toLowerCase();
    var visible = 0;

    cards.forEach(function (card) {
      var name = (card.getAttribute("data-name") || "").toLowerCase();
      var desc = (card.getAttribute("data-desc") || "").toLowerCase();
      var tags = (card.getAttribute("data-tags") || "").toLowerCase();
      var hit = !kw || name.indexOf(kw) > -1 || desc.indexOf(kw) > -1 || tags.indexOf(kw) > -1;
      card.style.display = hit ? "" : "none";
      if (hit) visible++;
    });

    if (emptyState) emptyState.classList.toggle("show", visible === 0);
    if (countEl) countEl.textContent = "共 " + visible + " 款工具";
  });

  /* 快捷键：按 / 聚焦搜索框 */
  document.addEventListener("keydown", function (e) {
    if (e.key === "/" && document.activeElement !== searchInput) {
      e.preventDefault();
      searchInput.focus();
    }
  });
})();
