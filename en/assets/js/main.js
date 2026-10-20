/* ============================================================
   Online Tools - 全站通用脚本
   ============================================================ */
(function () {
  "use strict";

  /* 多语言助手：t('{n} terms', {n: 5}) —— 英文环境自动取英文翻译并替换占位符 */
  window.t = function (key, vars) {
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
  };

  /* 页脚年份自动填充 */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });

  /* 首页工具搜索过滤（跨分类） */
  var searchInput = document.getElementById("toolSearch");
  if (!searchInput) return;

  var cards = Array.prototype.slice.call(document.querySelectorAll(".tool-card"));
  var emptyState = document.getElementById("emptyState");
  var countEl = document.getElementById("toolCount");

  /* 每张卡片归属的分类区块 */
  var groups = cards.map(function (card) {
    var category = card.closest(".tool-category");
    return { card: card, category: category };
  });

  function applyFilter() {
    var kw = searchInput.value.trim().toLowerCase();
    var visible = 0;

    groups.forEach(function (g) {
      var name = (g.card.getAttribute("data-name") || "").toLowerCase();
      var desc = (g.card.getAttribute("data-desc") || "").toLowerCase();
      var tags = (g.card.getAttribute("data-tags") || "").toLowerCase();
      var hit = !kw || name.indexOf(kw) > -1 || desc.indexOf(kw) > -1 || tags.indexOf(kw) > -1;
      g.card.style.display = hit ? "" : "none";
      if (hit) visible++;
    });

    /* 分类内无可见卡片时隐藏整个分类区块 */
    Array.prototype.forEach.call(document.querySelectorAll(".tool-category"), function (cat) {
      var any = cat.querySelectorAll('.tool-card:not([style*="display: none"])').length > 0;
      cat.style.display = any ? "" : "none";
    });

    if (emptyState) emptyState.classList.toggle("show", visible === 0);
    if (countEl) {
      countEl.textContent = document.documentElement.lang === "en"
        ? visible + " tools"
        : "Total " + visible + " tools";
    }
  }

  searchInput.addEventListener("input", applyFilter);

  /* 快捷键：按 / 聚焦搜索框 */
  document.addEventListener("keydown", function (e) {
    if (e.key === "/" && document.activeElement !== searchInput) {
      e.preventDefault();
      searchInput.focus();
    }
  });
})();
