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
      rank: 1, name: "Royal Flush", cards: "♠A ♠K ♠Q ♠J ♠10", combos: "4",
      prob: "0.000154%", odds: "About 1 in 649,740", desc: "The suited A K Q J 10, the largest special form of a straight flush"
    },
    {
      rank: 2, name: "Straight Flush", cards: "♠9 ♠8 ♠7 ♠6 ♠5", combos: "36",
      prob: "0.001385%", odds: "About 1 in 72,193", desc: "Five consecutive cards of the same suit (excluding the royal flush)"
    },
    {
      rank: 3, name: "Four of a Kind", cards: "♠9 ♥9 ♦9 ♣9 ♠K", combos: "156",
      prob: "0.00600%", odds: "About 1 in 4,165", desc: "Four cards of the same rank plus one kicker"
    },
    {
      rank: 4, name: "Full House", cards: "♠9 ♥9 ♦9 ♣K ♠K", combos: "3,744",
      prob: "0.1441%", odds: "About 1 in 694", desc: "Three of a kind plus a pair; compare the trips first, then the pair"
    },
    {
      rank: 5, name: "Flush", cards: "♠2 ♠5 ♠9 ♠J ♠K", combos: "5,108",
      prob: "0.1965%", odds: "About 1 in 509", desc: "Five cards of the same suit, no sequence required"
    },
    {
      rank: 6, name: "Straight", cards: "♠7 ♥8 ♦9 ♣10 ♠J", combos: "10,200",
      prob: "0.3925%", odds: "About 1 in 255", desc: "Five consecutive ranks of any suits; the Ace can be high or low"
    },
    {
      rank: 7, name: "Three of a Kind", cards: "♠9 ♥9 ♦9 ♠K ♣4", combos: "54,912",
      prob: "2.1128%", odds: "About 1 in 47.3", desc: "Three cards of the same rank plus two kickers"
    },
    {
      rank: 8, name: "Two Pair", cards: "♠9 ♥9 ♦K ♣K ♠4", combos: "123,552",
      prob: "4.7539%", odds: "About 1 in 21.0", desc: "Two pairs plus one kicker; compare the higher pair first"
    },
    {
      rank: 9, name: "One Pair", cards: "♠9 ♥9 ♦K ♣7 ♠4", combos: "1,098,240",
      prob: "42.2569%", odds: "About 1 in 2.37", desc: "One pair plus three kickers"
    },
    {
      rank: 10, name: "High Card", cards: "♠A ♥K ♦9 ♣7 ♠4", combos: "1,298,400",
      prob: "49.9961%", odds: "About 1 in 2.00", desc: "None of the above; only the highest single card counts"
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
    { en: "All-in", zh: "All-in", desc: "Pushing your entire stack into the pot, after which no further action is possible." },
    { en: "Ante", zh: "Ante", desc: "A small forced bet posted by every player each hand, common in tournaments." },
    { en: "Backdoor", zh: "Backdoor", desc: "A draw that needs to hit on both the turn and the river to complete, with low probability." },
    { en: "Bad Beat", zh: "Bad Beat", desc: "Leading all the way but losing a big pot to an unlikely comeback at the end." },
    { en: "Bet", zh: "Bet", desc: "The act of putting chips into the pot first when no one has bet." },
    { en: "Blind", zh: "Blind", desc: "The forced bets posted by the SB and BB each hand, forming the initial pot." },
    { en: "Bluff", zh: "Bluff", desc: "Betting with a weak hand to pressure opponents into folding stronger hands." },
    { en: "Board", zh: "Board", desc: "The 5 cards shared by everyone on the table (3 on the flop plus the turn and river)." },
    { en: "Broadway", zh: "Broadway", desc: "The highest five consecutive cards: 10-J-Q-K-A." },
    { en: "Buy-in", zh: "Buy-in", desc: "The amount paid to enter a game or tournament." },
    { en: "C-bet", zh: "C-bet", desc: "A pre-flop raiser continuing to bet first on the flop." },
    { en: "Call", zh: "Call", desc: "Matching the current bet to stay in the hand." },
    { en: "Calling Station", zh: "Calling Station", desc: "An opponent who rarely folds and calls everything down, immune to bluffs." },
    { en: "Check", zh: "Check", desc: "Passing the action to the next player without betting or folding." },
    { en: "Chip", zh: "Chip", desc: "A token representing cash value and the unit of betting and scoring." },
    { en: "Cutoff (CO)", zh: "Cutoff (CO)", desc: "The seat to the left of the Button and a popular spot for stealing the blinds." },
    { en: "Dealer", zh: "Dealer", desc: "The person holding the dealer Button, responsible for cutting and dealing cards by the rules." },
    { en: "Dealer Button (BTN)", zh: "Button (BTN)", desc: "The best seat at the table, acting last after the flop." },
    { en: "Dominated", zh: "Dominated", desc: "Sharing the same rank with an opponent but a weaker suit, e.g. A-club K-diamond against A-spade Q-spade." },
    { en: "Draw", zh: "Draw", desc: "A hand not yet made that completes with one or two more cards, such as a flush draw." },
    { en: "Early Position", zh: "Early Position", desc: "Positions that act earlier before the flop, such as UTG, which are unfavorable." },
    { en: "Effective Stack", zh: "Effective Stack", desc: "The shorter of the two stacks in a confrontation, which caps how much can be won or lost." },
    { en: "Equity", zh: "Equity", desc: "The percentage chance a hand ultimately wins from its current situation." },
    { en: "Fish", zh: "Fish", desc: "A casual player with weak skills who is easily exploited." },
    { en: "Flop", zh: "Flop", desc: "The first 3 community cards, the basis for the first betting round." },
    { en: "Flush", zh: "Flush", desc: "Five cards of the same suit, bigger than a straight and smaller than a full house." },
    { en: "Fold", zh: "Fold", desc: "Giving up the hand by surrendering your cards and no longer competing." },
    { en: "Full House", zh: "Full House", desc: "Three of a kind plus a pair, ranking below four of a kind and above a flush." },
    { en: "Game Theory Optimal (GTO)", zh: "Game Theory Optimal (GTO)", desc: "An equilibrium strategy that opponents cannot exploit with any counter-strategy." },
    { en: "Grinder", zh: "Grinder", desc: "A steady player who builds profit over time from small consistent edges." },
    { en: "Gutshot", zh: "Gutshot", desc: "A straight draw with only 4 outs, e.g. 5-7-8 waiting for a 6." },
    { en: "Heads-up", zh: "Heads-up", desc: "A situation where only two players are left contesting the pot." },
    { en: "Hijack (HJ)", zh: "Hijack (HJ)", desc: "A mid-early position to the left of CO and the right of UTG." },
    { en: "Hole Cards", zh: "Hole Cards", desc: "The private cards only you can see; 2 per player in Texas Holdem." },
    { en: "ICM", zh: "ICM", desc: "A mathematical model that converts chip stacks into prize equity in tournaments." },
    { en: "Kicker", zh: "Kicker", desc: "A single card that does not pair the board, used to compare hands of the same category." },
    { en: "Late Position", zh: "Late Position", desc: "Positions that act later in the order, such as CO and BTN, which enjoy an information advantage." },
    { en: "Limp", zh: "Limp", desc: "Passively entering pre-flop by only calling the big blind instead of raising." },
    { en: "Middle Position", zh: "Middle Position", desc: "A seat between the early and late positions, acting in the middle of the order." },
    { en: "Muck", zh: "Muck", desc: "The pile for discarded cards, also the act of folding without looking." },
    { en: "Multi-way Pot", zh: "Multi-way Pot", desc: "A pot entered by three or more players on the flop, which demands stronger hands." },
    { en: "Nuts", zh: "Nuts", desc: "The strongest possible hand on the current board." },
    { en: "Open-raise", zh: "Open-raise", desc: "The first voluntary raise when no one has yet entered the pot." },
    { en: "Outs", zh: "Outs", desc: "The number of remaining cards that can make or improve your hand, determining the chance of completing it." },
    { en: "Overcard", zh: "Overcard", desc: "A single card higher than every card on the board, such as a K on a 7-8-9 board." },
    { en: "Play Money", zh: "Play Money", desc: "Chips with no real value, used only for practice and fun." },
    { en: "Pocket Pair", zh: "Pocket Pair", desc: "Two hole cards of the same rank, such as 9-spade 9-heart." },
    { en: "Polarized Range", zh: "Polarized Range", desc: "A range structure made only of very strong hands and bluffs, with few medium-strength hands." },
    { en: "Position", zh: "Position", desc: "Your order of action relative to the Button; acting later carries an information advantage." },
    { en: "Pot", zh: "Pot", desc: "The total of all chips bet in the hand, ultimately won by the winner." },
    { en: "Pot Odds", zh: "Pot Odds", desc: "The ratio of the call amount to the total pot, used to judge whether calling is worthwhile." },
    { en: "Premium Hand", zh: "Premium Hand", desc: "Strong hands such as AA, KK or AK that are worth playing from any position." },
    { en: "Protection", zh: "Protection", desc: "Betting a strong hand to make draws pay or fold outright." },
    { en: "Raise", zh: "Raise", desc: "Increasing the bet over a previous bettor to apply pressure or grow the pot." },
    { en: "Range", zh: "Range", desc: "The full set of hands a player could hold in a given situation." },
    { en: "Rake", zh: "Rake", desc: "The service fee the room takes from each pot as a percentage." },
    { en: "River", zh: "River", desc: "The final community card, after which the last betting round takes place." },
    { en: "Rock", zh: "Rock", desc: "An extremely tight player who only plays premium hands and is very hard to bluff." },
    { en: "Satellite", zh: "Satellite", desc: "A tournament whose prize is a seat in a bigger event rather than cash." },
    { en: "Semi-bluff", zh: "Semi-bluff", desc: "Betting a draw that has outs, combining the chance to make a hand with bluff value." },
    { en: "Set", zh: "Set", desc: "Three of a kind made with a pocket pair, more concealed than trips on the board." },
    { en: "Shark", zh: "Shark", desc: "A highly skilled player who wins consistently over the long run." },
    { en: "Short Stack", zh: "Short Stack", desc: "A player with chips far below the table average, limited to shoving or folding." },
    { en: "Showdown", zh: "Showdown", desc: "After betting ends, the remaining players reveal their hands and the best hand takes the pot." },
    { en: "Sit-and-Go (SNG)", zh: "Sit-and-Go (SNG)", desc: "A single-table tournament that starts once all registered seats are filled." },
    { en: "Slow Play", zh: "Slow Play", desc: "Playing passively with a strong hand to induce opponents to keep betting." },
    { en: "Split Pot", zh: "Split Pot", desc: "Dividing the pot in half when both hands are exactly equal." },
    { en: "Squeeze", zh: "Squeeze", desc: "Making a large raise against both a raiser and callers, exploiting the likely weakness of both." },
    { en: "Steal", zh: "Steal", desc: "Raising from a late position to try to win the blinds outright." },
    { en: "Straight", zh: "Straight", desc: "Five consecutive ranks of any suits." },
    { en: "String Bet", zh: "String Bet", desc: "An illegal way of releasing chips into the pot in multiple motions, banned in most venues." },
    { en: "Suited", zh: "Suited", desc: "Two hole cards of the same suit, with more potential to make a flush." },
    { en: "Suited Connector", zh: "Suited Connector", desc: "Consecutive hole cards of the same suit, such as 8-spade 9-spade, which easily make straights and flushes." },
    { en: "Table Stakes", zh: "Table Stakes", desc: "You can lose at most the chips on the table in a hand and cannot add more mid-hand." },
    { en: "Tell", zh: "Tell", desc: "Behavioral or facial details that unintentionally reveal the strength of an opponent's hand." },
    { en: "Three-bet", zh: "Three-bet", desc: "Raising a raiser, i.e. the third betting action." },
    { en: "Tilt", zh: "Tilt", desc: "A state of straying from rational play because of emotional swings." },
    { en: "Trap", zh: "Trap", desc: "Inducing opponents to bet or raise with a strong hand, then check-raising them." },
    { en: "Turn", zh: "Turn", desc: "The 4th community card, after which the board structure is largely set." },
    { en: "Under the Gun (UTG)", zh: "Under the Gun (UTG)", desc: "The seat that acts first before the flop, the most disadvantageous position." },
    { en: "Value Bet", zh: "Value Bet", desc: "Betting a strong hand to be called by weaker hands and win more chips." },
    { en: "Variance", zh: "Variance", desc: "The deviation of short-term results from long-term expectation, a quantification of luck." },
    { en: "Wheel", zh: "Wheel", desc: "The lowest straight, A-2-3-4-5, which becomes A-6-7-8-9 in Short Deck." }
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
    if (glossaryCount) glossaryCount.textContent = t("{n} terms", { n: shown });
  }

  if (glossarySearch) {
    glossarySearch.addEventListener("input", function () {
      renderGlossary(glossarySearch.value);
    });
  }
  renderGlossary("");
})();
