/* ============================================================
   扑克牌手册 - 工具页逻辑
   Tab：牌型大小 / 德州扑克规则 / 术语词典 / 奥马哈与短牌
   牌型概率基于 C(52,5)=2598960；词典数据由 JS 数组渲染
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Tab 切换 ---------- */
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".ph-tab"));
  var panels = Array.prototype.slice.call(document.querySelectorAll(".ph-panel"));
  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      tabs.forEach(function (x) { x.classList.remove("active"); });
      panels.forEach(function (p) { p.classList.remove("active"); });
      tab.classList.add("active");
      var panel = document.getElementById("panel-" + tab.getAttribute("data-tab"));
      if (panel) panel.classList.add("active");
    });
  });

  /* ---------- 牌型数据（从大到小） ---------- */
  var HANDS = [
    {
      rank: 1, name: "皇家同花顺", cards: "♠A ♠K ♠Q ♠J ♠10", combos: "4",
      prob: "0.000154%", odds: "约 1 / 649,740", desc: "同花色的 A K Q J 10，同花顺中最大的特殊形态"
    },
    {
      rank: 2, name: "同花顺", cards: "♠9 ♠8 ♠7 ♠6 ♠5", combos: "36",
      prob: "0.001385%", odds: "约 1 / 72,193", desc: "同一花色的连续五张（不含皇家同花顺）"
    },
    {
      rank: 3, name: "四条", cards: "♠9 ♥9 ♦9 ♣9 ♠K", combos: "156",
      prob: "0.00600%", odds: "约 1 / 4,165", desc: "四张同点加一张踢脚"
    },
    {
      rank: 4, name: "葫芦", cards: "♠9 ♥9 ♦9 ♣K ♠K", combos: "3,744",
      prob: "0.1441%", odds: "约 1 / 694", desc: "三条加一对，先比三条再比对子"
    },
    {
      rank: 5, name: "同花", cards: "♠2 ♠5 ♠9 ♠J ♠K", combos: "5,108",
      prob: "0.1965%", odds: "约 1 / 509", desc: "五张同花色，不要求连续"
    },
    {
      rank: 6, name: "顺子", cards: "♠7 ♥8 ♦9 ♣10 ♠J", combos: "10,200",
      prob: "0.3925%", odds: "约 1 / 255", desc: "五张连续点数，花色不限，A 可高可低"
    },
    {
      rank: 7, name: "三条", cards: "♠9 ♥9 ♦9 ♠K ♣4", combos: "54,912",
      prob: "2.1128%", odds: "约 1 / 47.3", desc: "三张同点加两张踢脚"
    },
    {
      rank: 8, name: "两对", cards: "♠9 ♥9 ♦K ♣K ♠4", combos: "123,552",
      prob: "4.7539%", odds: "约 1 / 21.0", desc: "两个对子加一张踢脚，先比大对"
    },
    {
      rank: 9, name: "一对", cards: "♠9 ♥9 ♦K ♣7 ♠4", combos: "1,098,240",
      prob: "42.2569%", odds: "约 1 / 2.37", desc: "一个对子加三张踢脚"
    },
    {
      rank: 10, name: "高牌", cards: "♠A ♥K ♦9 ♣7 ♠4", combos: "1,298,400",
      prob: "49.9961%", odds: "约 1 / 2.00", desc: "以上牌型都不满足，只比最大单张"
    }
  ];

  function renderCards(text) {
    /* 花色 ♥ ♦ 标红，♠ ♣ 保持深色 */
    return text.split(" ").map(function (card) {
      var suit = card.charAt(0);
      var cls = (suit === "♥" || suit === "♦") ? "ph-red" : "";
      return cls ? "<span class=\"" + cls + "\">" + card + "</span>" : card;
    }).join(" ");
  }

  (function renderHandTable() {
    var tbody = document.querySelector("#handTable tbody");
    if (!tbody) return;
    var html = "";
    HANDS.forEach(function (h) {
      html += "<tr>" +
        "<td class=\"rank\">" + h.rank + "</td>" +
        "<td>" + t(h.name) + "</td>" +
        "<td class=\"cards\">" + renderCards(h.cards) + "</td>" +
        "<td class=\"num\">" + h.combos + "</td>" +
        "<td class=\"num\">" + h.prob + "</td>" +
        "<td class=\"num\">" + h.odds + "</td>" +
        "<td>" + t(h.desc) + "</td>" +
        "</tr>";
    });
    tbody.innerHTML = html;
  })();

  /* ---------- 术语词典（60+ 条） ---------- */
  var GLOSSARY = [
    { en: "All-in", zh: "全下", desc: "把全部筹码押入底池，此后再无后续行动余地。" },
    { en: "Ante", zh: "前注", desc: "每局由全部玩家强制缴纳的小额筹码，常见于锦标赛。" },
    { en: "Backdoor", zh: "后门", desc: "需要转牌与河牌连续命中才能成型的听牌，成牌概率较低。" },
    { en: "Bad Beat", zh: "爆冷", desc: "一路领先却在最后被小概率牌反超而输掉大底池。" },
    { en: "Bet", zh: "下注", desc: "在无人下注时率先向底池投入筹码的行为。" },
    { en: "Blind", zh: "盲注", desc: "SB 与 BB 每局强制下的注，构成初始底池。" },
    { en: "Bluff", zh: "诈唬", desc: "手持弱牌却通过下注施压，迫使对手弃掉更强的牌。" },
    { en: "Board", zh: "公共牌", desc: "桌面上所有人共用的 5 张牌（翻牌 3 张加转牌、河牌）。" },
    { en: "Broadway", zh: "百老汇", desc: "指 10-J-Q-K-A 这组最大的五张连续牌。" },
    { en: "Buy-in", zh: "买入", desc: "进入一局或一场锦标赛所需支付的筹码金额。" },
    { en: "C-bet", zh: "持续下注", desc: "翻牌前加注者在翻牌圈继续主动下注的行为。" },
    { en: "Call", zh: "跟注", desc: "与当前下注额相等地投入筹码，继续留在牌局中。" },
    { en: "Calling Station", zh: "跟注站", desc: "几乎不弃牌、什么牌都跟到底的对手，诈唬对其无效。" },
    { en: "Check", zh: "过牌", desc: "不下注也不弃牌，把行动权交给下一位玩家。" },
    { en: "Chip", zh: "筹码", desc: "代表现金价值的代币，是下注与计分的单位。" },
    { en: "Cutoff (CO)", zh: "关煞位", desc: "按钮位左侧的位置，是偷盲的热门座位。" },
    { en: "Dealer", zh: "庄家", desc: "持有庄家按钮（Button）的人，负责按规则切牌发牌。" },
    { en: "Dealer Button (BTN)", zh: "按钮位", desc: "全桌位置最好的座位，翻牌后最后行动。" },
    { en: "Dominated", zh: "被压制", desc: "两张底牌与对手同点却同小花色，如 A♣K♦ 对 A♠Q♠。" },
    { en: "Draw", zh: "听牌", desc: "尚未成牌但再补一两张即可成型的牌，如同花听牌。" },
    { en: "Early Position", zh: "前位", desc: "翻牌前较早行动的位置，如 UTG，位置不利。" },
    { en: "Effective Stack", zh: "有效筹码", desc: "对决双方中较短的筹码量，决定能输赢的上限。" },
    { en: "Equity", zh: "胜率", desc: "一手牌在当前位置下最终获胜的概率百分比。" },
    { en: "Fish", zh: "鱼", desc: "技术水平较弱、容易被针对的休闲玩家。" },
    { en: "Flop", zh: "翻牌", desc: "发出的前 3 张公共牌，是第一轮下注的依据。" },
    { en: "Flush", zh: "同花", desc: "五张同花色的牌，比顺子大、比葫芦小。" },
    { en: "Fold", zh: "弃牌", desc: "放弃本局，交出底牌并不再参与竞争。" },
    { en: "Full House", zh: "葫芦", desc: "三张同点加一对，牌力排在四条之下、同花之上。" },
    { en: "Game Theory Optimal (GTO)", zh: "博弈论最优", desc: "使对手无法通过任何策略剥削的均衡打法。" },
    { en: "Grinder", zh: "磨工", desc: "依靠稳定小优势长期积累盈利的稳健型玩家。" },
    { en: "Gutshot", zh: "中洞听牌", desc: "只有 4 张 outs 的顺子听牌，如 5-7-8 等 6。" },
    { en: "Heads-up", zh: "单挑", desc: "仅剩两名玩家争夺底池的局面。" },
    { en: "Hijack (HJ)", zh: "劫持位", desc: "位于 CO 左侧、UTG 右侧的中前场位置。" },
    { en: "Hole Cards", zh: "底牌", desc: "只有玩家自己可见的私有手牌，德州每人 2 张。" },
    { en: "ICM", zh: "独立筹码模型", desc: "锦标赛中把筹码转换为奖金期望的数学模型。" },
    { en: "Kicker", zh: "踢脚", desc: "与公共牌不配对的单张，用于比较牌型相同的牌力。" },
    { en: "Late Position", zh: "后位", desc: "行动顺序靠后的位置，如 CO 与 BTN，信息占优。" },
    { en: "Limp", zh: "跛入", desc: "翻牌前只跟大盲而不加注的被动入局方式。" },
    { en: "Middle Position", zh: "中位", desc: "介于前位与后位之间的座位，行动顺序居中。" },
    { en: "Muck", zh: "弃牌堆", desc: "已放弃的底牌堆放处，也指不看牌直接弃牌的动作。" },
    { en: "Multi-way Pot", zh: "多人底池", desc: "三名以上玩家进入翻牌的底池，对牌力要求更高。" },
    { en: "Nuts", zh: "坚果牌", desc: "当前公共牌下可能形成的最强牌型。" },
    { en: "Open-raise", zh: "率先加注", desc: "之前无人入局时第一个主动加注的行为。" },
    { en: "Outs", zh: "出牌", desc: "能让你反超或成牌的剩余牌数量，决定成牌概率。" },
    { en: "Overcard", zh: "高张", desc: "比牌面所有公共牌都大的单张，如牌面 7-8-9 时的 K。" },
    { en: "Play Money", zh: "游戏币", desc: "无真实价值的筹码，仅用于练习与娱乐。" },
    { en: "Pocket Pair", zh: "口袋对", desc: "两张底牌点数相同，如 9♠9♥。" },
    { en: "Polarized Range", zh: "两极范围", desc: "只包含超强牌与诈唬牌、缺少中等牌的范围结构。" },
    { en: "Position", zh: "位置", desc: "相对按钮位的行动顺序，后行动方拥有信息优势。" },
    { en: "Pot", zh: "底池", desc: "本局所有已下注筹码的总和，最终由赢家获得。" },
    { en: "Pot Odds", zh: "底池赔率", desc: "跟注金额与底池总额的比例，用于判断跟注是否划算。" },
    { en: "Premium Hand", zh: "顶级牌", desc: "如 AA、KK、AK 等任何位置都值得入局的强牌。" },
    { en: "Protection", zh: "保护下注", desc: "用强牌下注迫使听牌付费或直接弃牌的战术。" },
    { en: "Raise", zh: "加注", desc: "在前面玩家下注基础上提高注码，施压或扩大底池。" },
    { en: "Range", zh: "范围", desc: "一名玩家在某一局面下可能持有的所有手牌集合。" },
    { en: "Rake", zh: "抽水", desc: "平台从底池中按比例收取的服务费。" },
    { en: "River", zh: "河牌", desc: "最后一张公共牌，此后进行最后一轮下注。" },
    { en: "Rock", zh: "岩石", desc: "只玩顶级强牌的极紧型玩家，很难被诈唬。" },
    { en: "Satellite", zh: "卫星赛", desc: "奖励为更高级别赛事门票而非现金的比赛。" },
    { en: "Semi-bluff", zh: "半诈唬", desc: "用有 outs 的听牌下注，兼具成牌与诈唬双重收益。" },
    { en: "Set", zh: "暗三条", desc: "底牌对子与公共牌组成的三条，比明三条隐蔽。" },
    { en: "Shark", zh: "鲨鱼", desc: "技术精湛、长期盈利的强力玩家。" },
    { en: "Short Stack", zh: "短筹码", desc: "筹码量远低于桌面平均，可选择全下或弃牌的玩家。" },
    { en: "Showdown", zh: "摊牌", desc: "下注结束后幸存玩家亮牌比大小决定底池归属。" },
    { en: "Sit-and-Go (SNG)", zh: "坐满即开", desc: "报名人数满后即开始的单桌锦标赛。" },
    { en: "Slow Play", zh: "慢打", desc: "手握强牌却表现得被动，引诱对手继续下注。" },
    { en: "Split Pot", zh: "平分底池", desc: "双方牌型完全相同时将底池对半分配。" },
    { en: "Squeeze", zh: "挤压", desc: "对加注者与跟注者同时大幅加注，利用双方牌弱施压。" },
    { en: "Steal", zh: "偷盲", desc: "在后位通过加注试图直接赢下盲注的行为。" },
    { en: "Straight", zh: "顺子", desc: "五张连续点数、花色不限的牌型。" },
    { en: "String Bet", zh: "拆注", desc: "违规分多次连续投注入池的下注方式，多数场合被禁止。" },
    { en: "Suited", zh: "同花色", desc: "两张底牌花色相同，成同花的潜力更大。" },
    { en: "Suited Connector", zh: "同花连张", desc: "同花色的连续点数底牌，如 8♠9♠，易成顺子与同花。" },
    { en: "Table Stakes", zh: "筹码封顶", desc: "每局最多只能输掉桌上的筹码，不能追加大额买入。" },
    { en: "Tell", zh: "马脚", desc: "对手无意中暴露手牌强弱的行为或表情细节。" },
    { en: "Three-bet", zh: "三注", desc: "对加注者再次加注，即第三个下注动作。" },
    { en: "Tilt", zh: "上头", desc: "因情绪波动而偏离理性打法的状态。" },
    { en: "Trap", zh: "设套", desc: "用强牌诱导对手下注或加注，再加以反加的战术。" },
    { en: "Turn", zh: "转牌", desc: "第 4 张公共牌，此后牌面结构基本定型。" },
    { en: "Under the Gun (UTG)", zh: "枪口位", desc: "翻牌前第一个行动的座位，位置最不利。" },
    { en: "Value Bet", zh: "价值下注", desc: "用强牌下注，希望被更弱的牌跟注以赢取更多筹码。" },
    { en: "Variance", zh: "波动", desc: "短期结果与长期期望的偏离幅度，是运气的量化体现。" },
    { en: "Wheel", zh: "轮子顺", desc: "A-2-3-4-5 组成的最小顺子，短牌中为 A-6-7-8-9。" }
  ];

  var glossaryTbody = document.querySelector("#glossaryTable tbody");
  var glossaryEmpty = document.getElementById("glossaryEmpty");
  var glossaryCount = document.getElementById("glossaryCount");
  var glossarySearch = document.getElementById("glossarySearch");

  function renderGlossary(kw) {
    if (!glossaryTbody) return;
    var q = (kw || "").trim().toLowerCase();
    var html = "";
    var shown = 0;
    GLOSSARY.forEach(function (item) {
      var hay = (item.en + " " + item.zh + " " + item.desc).toLowerCase();
      if (q && hay.indexOf(q) === -1) return;
      shown++;
      html += "<tr>" +
        "<td class=\"en\">" + item.en + "</td>" +
        "<td class=\"zh\">" + t(item.zh) + "</td>" +
        "<td>" + t(item.desc) + "</td>" +
        "</tr>";
    });
    glossaryTbody.innerHTML = html;
    if (glossaryEmpty) glossaryEmpty.hidden = shown > 0;
    if (glossaryCount) glossaryCount.textContent = t("共 {n} 条", { n: shown });
  }

  if (glossarySearch) {
    glossarySearch.addEventListener("input", function () {
      renderGlossary(glossarySearch.value);
    });
  }
  renderGlossary("");
})();
