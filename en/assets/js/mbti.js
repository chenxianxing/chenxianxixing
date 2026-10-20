/* ============================================================
   MBTI性格测试 - 工具页逻辑
   48 题（E/I、S/N、T/F、J/P 每维 12 题，顺序固定打乱）
   5 级量表：-2 / -1 / 0 / +1 / +2
   流程：开始页 -> 答题页 -> 结果页；全部本地计算
   ============================================================ */
(function () {
  "use strict";

  /* ---------- 维度定义 ---------- */
  var DIMENSIONS = [
    { key: "EI", a: "E", b: "I", label: "Energy" },
    { key: "SN", a: "S", b: "N", label: "Information" },
    { key: "TF", a: "T", b: "F", label: "Decision-Making" },
    { key: "JP", a: "J", b: "P", label: "Lifestyle" }
  ];

  /* ---------- 48 道题库（每维 12 道，前 6 题倾向首字母、后 6 题倾向次字母；展示顺序固定打乱） ---------- */
  var QUESTIONS = [
    /* E/I */
    { g: "EI", toward: "E", text: "At a party full of strangers, I would take the initiative to meet new friends." },
    { g: "EI", toward: "E", text: "I enjoy moments when I am the center of attention." },
    { g: "EI", toward: "E", text: "I tend to think out loud and clarify my ideas through conversation." },
    { g: "EI", toward: "E", text: "Meeting new friends makes me feel excited and energized." },
    { g: "EI", toward: "E", text: "On weekends I would rather plan outings or group activities." },
    { g: "EI", toward: "E", text: "In team discussions I am usually one of the first to speak up." },
    { g: "EI", toward: "I", text: "After busy social activities I need some time alone to recharge." },
    { g: "EI", toward: "I", text: "Compared with speaking in public, I am better at expressing my ideas in writing." },
    { g: "EI", toward: "I", text: "I prefer deep conversations with a few close friends over large social gatherings." },
    { g: "EI", toward: "I", text: "Long periods of quiet solitude do not bore me." },
    { g: "EI", toward: "I", text: "Unexpected phone calls make me slightly uncomfortable." },
    { g: "EI", toward: "I", text: "I usually weigh my ideas over and over internally before saying them out loud." },
    /* S/N */
    { g: "SN", toward: "S", text: "I trust facts that I have seen with my own eyes or experienced firsthand." },
    { g: "SN", toward: "S", text: "When learning a new skill I prefer hands-on practice step by step over theory first." },
    { g: "SN", toward: "S", text: "I pay attention to details and notice concrete changes others miss." },
    { g: "SN", toward: "S", text: "When describing something I try to give concrete data and examples." },
    { g: "SN", toward: "S", text: "I tend to follow proven, mature methods when doing things." },
    { g: "SN", toward: "S", text: "I am sensitive to changes in my surroundings, such as moved furniture." },
    { g: "SN", toward: "N", text: "I often think about the possibilities and long-term meaning behind things." },
    { g: "SN", toward: "N", text: "Wild ideas that others find odd often pop into my head." },
    { g: "SN", toward: "N", text: "A vision of the future attracts my attention more than present reality." },
    { g: "SN", toward: "N", text: "I enjoy pondering abstract concepts and joining brainstorming sessions." },
    { g: "SN", toward: "N", text: "Routine and repetition bore me; I always want to try new approaches." },
    { g: "SN", toward: "N", text: "I trust my gut judgment even when I cannot explain the reason." },
    /* T/F */
    { g: "TF", toward: "T", text: "When making decisions I first consider whether the logic holds together." },
    { g: "TF", toward: "T", text: "When evaluating a plan I care more about efficiency than personal feelings." },
    { g: "TF", toward: "T", text: "I believe pointing out problems honestly matters more than sparing feelings." },
    { g: "TF", toward: "T", text: "When analyzing problems I try to leave emotional factors out." },
    { g: "TF", toward: "T", text: "I tend to respond to a friend's complaints with reason rather than comfort." },
    { g: "TF", toward: "T", text: "Fairness means rules are applied consistently to everyone." },
    { g: "TF", toward: "F", text: "When making decisions I seriously consider the feelings of those involved." },
    { g: "TF", toward: "F", text: "When someone is in a bad mood I easily notice it and am affected by it." },
    { g: "TF", toward: "F", text: "It is hard for me to say no when someone asks for help." },
    { g: "TF", toward: "F", text: "Harmonious relationships are the core of happiness for me." },
    { g: "TF", toward: "F", text: "I often put myself in the other person's shoes to feel their situation." },
    { g: "TF", toward: "F", text: "Praise and encouragement motivate growth more than criticism." },
    /* J/P */
    { g: "JP", toward: "J", text: "I like to make plans in advance and follow them." },
    { g: "JP", toward: "J", text: "Checking items off a to-do list one by one gives me satisfaction." },
    { g: "JP", toward: "J", text: "My belongings are usually tidied away, each with its own place." },
    { g: "JP", toward: "J", text: "Before a trip I make a detailed itinerary." },
    { g: "JP", toward: "J", text: "Finishing tasks early puts my mind at ease; leaving them to the last minute makes me anxious." },
    { g: "JP", toward: "J", text: "I dislike having my plans disrupted by sudden changes." },
    { g: "JP", toward: "P", text: "I am used to adapting on the fly and dislike being bound by early plans." },
    { g: "JP", toward: "P", text: "I often become efficient only when a deadline approaches." },
    { g: "JP", toward: "P", text: "My desk is often in a state of creative chaos." },
    { g: "JP", toward: "P", text: "I enjoy dropping everything and traveling on a whim." },
    { g: "JP", toward: "P", text: "Working on several tasks at the same time energizes me." },
    { g: "JP", toward: "P", text: "I stay open to new options and am willing to postpone a final decision." }
  ];

  /* 展示顺序：固定打乱（QUESTIONS 索引的排列），保证相邻题目来自不同维度 */
  var DISPLAY_ORDER = [
    0, 12, 24, 36, 41, 5, 17, 29,
    1, 13, 25, 37, 42, 6, 18, 30,
    2, 14, 26, 38, 43, 7, 19, 31,
    3, 15, 27, 39, 44, 8, 20, 32,
    4, 16, 28, 40, 45, 9, 21, 33,
    46, 10, 22, 34, 47, 11, 23, 35
  ];

  /* ---------- 5 级量表 ---------- */
  var SCALE = [
    { v: 2, label: "Strongly Agree" },
    { v: 1, label: "Agree" },
    { v: 0, label: "Neutral" },
    { v: -1, label: "Disagree" },
    { v: -2, label: "Strongly Disagree" }
  ];

  /* ---------- 16 型数据 ---------- */
  var TYPES = {
    INTJ: {
      name: "Architect",
      desc: "Visionary and strategic, skilled at breaking down complex problems independently and making long-term plans. They pursue knowledge and ability relentlessly and carry a goal through to the end. They dislike being bound by rules and emotions and may seem distant socially. Demanding and perfectionist, they are typical long-term thinkers who can achieve great things once the direction is right.",
      strengths: ["Strategic thinking and long-term planning", "Ability to solve problems independently", "Strong learner who pursues professional depth", "Strong will and stress resistance", "Rational, calm, and not swayed by emotions"],
      weaknesses: ["Perfectionism that easily leads to inner friction", "Reluctant to express feelings, may seem cold", "Little patience with people slower than themselves", "Easily annoyed when plans are disrupted", "Not good at compromising in teamwork"],
      careers: ["Strategy Consultant", "Product Manager", "Researcher", "Systems Architect", "Investment Analyst"],
      match: ["ENTP", "ENFP"]
    },
    INTP: {
      name: "Logician",
      desc: "A born problem solver, obsessed with theory and logic, who likes to get to the bottom of how things work. Active-minded and inventive, they often build complex theoretical models in their head. They are uninterested in worldly affairs and social niceties and can sink into thinking while neglecting action. Most efficient alone, they are quiet and profound analysts.",
      strengths: ["Rigorous logic that gets to the heart of problems", "Curious and broadly knowledgeable", "Thinks independently, never follows the crowd", "Creative and theoretically gifted", "Open-minded and respectful of different views"],
      weaknesses: ["Thinks much and does little, prone to procrastination", "Careless about details of daily life", "Not good at handling interpersonal conflict", "Little patience for trivial execution work", "Attention easily shifts to new ideas"],
      careers: ["Software Engineer", "Data Scientist", "Mathematician", "University Researcher", "Technical Architect"],
      match: ["ENTJ", "ENFJ"]
    },
    ENTJ: {
      name: "Commander",
      desc: "A natural leader with a strong sense of purpose, good at coordinating resources, setting strategy, and driving execution. Confident and decisive, they enjoy challenges and get more excited under competition and pressure. They value efficiency and results, speak directly, and sometimes overlook others' feelings. Unwilling to be mediocre, they pursue influence and achievement and habitually point the way for their team.",
      strengths: ["Strong leadership and charisma", "Clear goals and strong execution", "Good at overall planning and resource allocation", "Confident, decisive, and willing to call the shots", "Strong under pressure, undaunted by setbacks"],
      weaknesses: ["Forceful and domineering, slow to hear objections", "Blunt speech that easily hurts feelings", "Little patience with inefficient people or things", "Workaholic tendency that neglects life balance", "Weak emotional management"],
      careers: ["Corporate Executive", "Entrepreneur", "Lawyer", "Project Lead", "Marketing Strategy"],
      match: ["INTP", "INFP"]
    },
    ENTP: {
      name: "Debater",
      desc: "Quick-witted and eloquent, they enjoy challenging conventions and brainstorming. Curious about new things, they are good at spotting loopholes and proposing innovative solutions. Broad interests but limited persistence, they easily tire of rules and repetition. Enjoying intellectual sparring, they are the team's idea engine and mood lifter.",
      strengths: ["Agile thinking with endless ideas", "Strong expression and persuasion", "Adapts to change and improvises well", "Broad knowledge with integrated insight", "Optimistic, humorous, and socially skilled"],
      weaknesses: ["Short bursts of enthusiasm, hard to see things through", "Argumentative and prone to quibbling", "Dismissive of routine procedures and details", "Disorganized and weak at planning", "Easily gives an unreliable impression"],
      careers: ["Entrepreneur", "Marketing", "Advertising Creative", "Lawyer", "Investor"],
      match: ["INTJ", "INFJ"]
    },
    INFJ: {
      name: "Advocate",
      desc: "A blend of idealism and insight, good at reading people and persistent in the pursuit of meaning and values. Quiet and gentle in appearance, they hold firm beliefs and long-term goals inside. Skilled at listening and inspiring others, they willingly give quietly for the values they believe in. Sensitive to the suffering of the world, they easily carry too much of others' emotions.",
      strengths: ["Reads people well with strong empathy", "Principled and persistent for ideals", "Combines creativity with insight", "Good at listening and encouraging others", "Works with depth, never superficially"],
      weaknesses: ["Expects too much of self and others", "Easily accumulates negative emotions", "Overgiving that leads to burnout", "Tends to avoid conflict or hurt inwardly", "The gap between ideal and reality brings pain"],
      careers: ["Counseling Psychologist", "Human Resources", "Teacher", "Writer", "Nonprofit Program Lead"],
      match: ["ENTP", "ENFP"]
    },
    INFP: {
      name: "Mediator",
      desc: "Gentle idealists with a rich inner world who value authenticity. Understanding, they always think from others' perspectives and long for a better world. They hate conflict and hypocrisy and would rather stay silent than hypocritically please. With artistic talent and a feel for words, they suit fields that need creativity and humanistic care.",
      strengths: ["Empathetic, kind, and considerate", "Creative and imaginative", "Loyal to their own values", "Tolerant and open, slow to judge", "Passionate about the things they love"],
      weaknesses: ["Overly idealistic and easily disappointed", "Poor at refusing, easily wronged", "Avoids conflict and practical problems", "Self-doubting and lacking confidence", "Easily immersed in emotions"],
      careers: ["Counseling Psychologist", "Illustrator", "Writer", "Social Worker", "Content Creator"],
      match: ["ENFJ", "ENTJ"]
    },
    ENFJ: {
      name: "Protagonist",
      desc: "Charismatic natural mentors who inspire and unite others, bringing out the best in everyone. Warm and generous, they value relationships and treat helping others grow as their mission. They keenly pick up on others' needs and proactively build bridges of communication. Caring about how they are judged, they feel uneasy when relationships tense up and need recognition.",
      strengths: ["Infectious and good at motivating others", "Excellent at organizing and coordinating", "Combines empathy with communication", "Helpful with a strong sense of responsibility", "Values harmony and resolves conflicts well"],
      weaknesses: ["Overly concerned with others' opinions", "Takes on too much and neglects themselves", "Avoids conflict and forces themselves", "Idealizes others and gets hurt when disappointed", "Blurry boundaries, easily drained"],
      careers: ["Teacher", "Trainer", "Public Relations", "Human Resources", "Team Manager"],
      match: ["INFP", "ISFP"]
    },
    ENFP: {
      name: "Campaigner",
      desc: "Passionate, free spirits forever curious about and in love with the world. Full of ideas and energy, they are good at igniting enthusiasm in those around them. They value possibilities and genuine relationships and hate rigid constraints. Easily distracted by novelty, they need to find a balance between freedom and responsibility.",
      strengths: ["Enthusiastic and highly infectious", "Rich in creativity and association", "Good at spotting the best in others", "Highly adaptable and willing to try", "Wide network and approachable"],
      weaknesses: ["Scattered attention, hard to focus", "Dislikes trivial details and procedures", "Mood swings", "Over-promises and under-delivers", "Needs external validation to stay driven"],
      careers: ["Host", "Marketing Planner", "Journalist", "Counseling Psychologist", "Entrepreneur"],
      match: ["INTJ", "INFJ"]
    },
    ISTJ: {
      name: "Logistician",
      desc: "Rigorous and pragmatic, with a strong sense of responsibility, they value rules, order, and commitments. Down-to-earth, detail-oriented, and process-driven, they always keep their word. They trust facts and data and dislike empty talk and change. A reliable backbone at home and at work, they prove their worth through action rather than words.",
      strengths: ["Responsible and trustworthy", "Detail-oriented with few mistakes", "Rule-abiding with steady execution", "Clear logic, good at organizing processes", "Calm and rational in a crisis"],
      weaknesses: ["Overly rigid and inflexible", "Dismissive of theoretical innovation", "Awkward at expressing emotions", "Anxious about uncertainty", "Easily stuck in their ways"],
      careers: ["Financial Auditor", "Civil Servant", "Legal Officer", "Quality Manager", "Data Administrator"],
      match: ["ESFP", "ESTP"]
    },
    ISFJ: {
      name: "Defender",
      desc: "Warm and attentive guardians who quietly remember everyone's preferences and needs and offer care at the right moment. Valuing tradition and responsibility, they work carefully and thoroughly and are the most reliable cornerstone of a team. Never competing or grabbing, they still touch people with details. Afraid of change and rejection, they prefer to keep giving in a stable environment.",
      strengths: ["Attentive and understanding", "Responsible and hardworking without complaint", "Good memory and attention to detail", "Loyal, reliable, and dependable", "Patient, gentle, and unhurried"],
      weaknesses: ["Suppresses their own needs too much", "Cannot say no, easily drained", "Afraid of conflict and change", "Lacks confidence in themselves", "Easily accumulates grievances"],
      careers: ["Nurse", "Administrative Staff", "Teacher", "Human Resources", "Customer Service"],
      match: ["ESFP", "ESTP"]
    },
    ESTJ: {
      name: "Executive",
      desc: "Decisive and efficient organizers, good at setting rules, assigning tasks, and getting things done. They value order and results and believe in systems and hard work. Straight-talking and intolerant of delay and inefficiency. Upholders of tradition and order, they always deliver impressive results where execution matters.",
      strengths: ["Strong organizational and management skills", "Decisive and quick to act", "Responsible and leads by example", "Pragmatic, rational, and results-driven", "Good at building order and systems"],
      weaknesses: ["Forceful and stubborn, inflexible", "Cold and results-only", "Distrusts innovation and intuition", "Quick to criticize others", "Not good at handling emotional issues"],
      careers: ["Business Manager", "Project Manager", "Operations Director", "Sales Lead", "Supply Chain Manager"],
      match: ["ISFP", "INTP"]
    },
    ESFJ: {
      name: "Consul",
      desc: "Warm-hearted hosts who see making people comfortable as their achievement. Attuned to every cue, they take care of everyone and are the organizing core of parties and communities. Valuing harmony, gratitude, and tradition, they invest in relationships for the long run. Caring about what others think, they feel visibly down when ignored or criticized.",
      strengths: ["Warm-hearted and eager to help", "Highly socially attuned and caring", "Strong event organization skills", "Loyal, trustworthy, and commitment-minded", "Pragmatic, reliable, true to their word"],
      weaknesses: ["Overly concerned with others' opinions", "Needs plenty of external approval", "Sensitive to criticism, easily hurt", "Avoids conflict, forces a false harmony", "Sometimes lectures others and oversteps"],
      careers: ["Teacher", "Nurse", "Administrative Management", "Customer Success", "Event Planner"],
      match: ["ISFP", "INTP"]
    },
    ISTP: {
      name: "Virtuoso",
      desc: "Calm doers who like to understand the world with their hands and tools. Exceptionally composed in a crisis, they quickly locate problems and fix them. Valuing freedom and efficiency, they hate long meetings and empty discussion. Not talkative, but every word hits the mark, and they dig extremely deep into whatever interests them.",
      strengths: ["Hands-on and good at solving practical problems", "Calm and strong in crisis handling", "Pragmatic, flexible, and informal", "Focused and capable of deep research", "Independent and self-reliant"],
      weaknesses: ["Slow to express emotions, seems cold", "Dislikes commitments and long-term planning", "Risk-prone and careless of danger", "Terse communication, hard to get close to", "Impatient with theory and lecturing"],
      careers: ["Engineer", "Surgeon", "Pilot", "Technical Expert", "Paramedic"],
      match: ["ESFJ", "ESTJ"]
    },
    ISFP: {
      name: "Adventurer",
      desc: "Quiet, sensitive artists who experience the world through feeling and aesthetics. Disliking debate and lecturing, they prefer to express themselves through works and actions. Valuing personal space and present experience, they hate being bound by plans and rules. Gentle and considerate, with a natural feel for beauty, they often move others without trying.",
      strengths: ["Keen aesthetic sense and artistic talent", "Gentle, considerate, and non-judgmental", "Lives in the moment and knows how to enjoy life", "Flexible, practical, and hands-on", "Loyal to the people and things they love"],
      weaknesses: ["Avoids conflict and competition", "Lacks long-term planning", "Low self-esteem and self-doubt", "Dislikes being constrained or rushed", "Easily shuts down under pressure"],
      careers: ["Designer", "Musician", "Illustrator", "Chef", "Craft Maker"],
      match: ["ESFJ", "ESTJ"]
    },
    ESTP: {
      name: "Entrepreneur",
      desc: "Realists with explosive drive who believe in doing first. Good at seizing opportunities amid change, they love the thrill of risk and excitement. The focus of social scenes, they read people well and negotiate skillfully. Hating armchair talk and long waits, they trust conclusions from hands-on practice.",
      strengths: ["Decisive action and fast execution", "Strong on-the-spot adaptability", "Socially sharp and good at negotiating", "Dares to take risks and spots opportunities", "Pragmatic and rational, not emotional"],
      weaknesses: ["Acts impulsively and lacks patience", "Ignores risk and safety", "Cannot stand boredom and repetition", "Prone to friction with others", "Dislikes long-term commitments"],
      careers: ["Entrepreneur", "Sales", "Sports Agent", "Marketing Promoter", "Emergency Responder"],
      match: ["ISFJ", "ISTJ"]
    },
    ESFP: {
      name: "Entertainer",
      desc: "The life of the party, born with stage presence and infectious energy. Loving novelty, food, music, and everything beautiful, they excel at passing joy to those around them. Living in the moment, they do not worry about distant things. Emotions come and go quickly; craving attention and affection, they are the rescuer of any mood.",
      strengths: ["Infectious with natural joyful energy", "Sociable and well-liked", "Highly motivated and willing to try", "Good taste and a fun-loving life", "Direct empathy and warm comfort"],
      weaknesses: ["Poor at delaying gratification, impulse spending", "Avoids seriousness and long-term planning", "Mood swings and a need for attention", "Dislikes dry theoretical study", "Easily thrown off by criticism"],
      careers: ["Streamer", "Actor", "Event Planner", "Sales", "Preschool Teacher"],
      match: ["ISTJ", "ISFJ"]
    }
  };

  /* ---------- 状态与元素 ---------- */
  var TOTAL = DISPLAY_ORDER.length;
  var answers = []; /* answers[i] = -2..2 或 null */
  var idx = 0;

  var startView = document.getElementById("mbtiStart");
  var quizView = document.getElementById("mbtiQuiz");
  var resultView = document.getElementById("mbtiResult");
  var bar = document.getElementById("mbtiBar");
  var qMeta = document.getElementById("mbtiQMeta");
  var qGroup = document.getElementById("mbtiQGroup");
  var qText = document.getElementById("mbtiQText");
  var qOptions = document.getElementById("mbtiOptions");
  var qHint = document.getElementById("mbtiQHint");
  var btnPrev = document.getElementById("btnPrev");

  /* ---------- 复制与提示（与 url-encode.js 一致） ---------- */
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

  /* ---------- 视图切换 ---------- */
  function show(view) {
    startView.hidden = view !== "start";
    quizView.hidden = view !== "quiz";
    resultView.hidden = view !== "result";
  }

  /* ---------- 答题渲染 ---------- */
  var locked = false; /* 防止同一题的 change/label 事件重复触发 */

  function dimOf(gKey) {
    for (var i = 0; i < DIMENSIONS.length; i++) {
      if (DIMENSIONS[i].key === gKey) return DIMENSIONS[i];
    }
    return DIMENSIONS[0];
  }

  function renderQuestion() {
    var q = QUESTIONS[DISPLAY_ORDER[idx]];
    var pct = Math.round(((idx) / TOTAL) * 100);
    bar.style.width = pct + "%";
    qMeta.textContent = t("Question {n} / {m}", { n: idx + 1, m: TOTAL });
    qGroup.textContent = t(dimOf(q.g).label);

    qText.textContent = t(q.text);
    qOptions.innerHTML = "";
    locked = false;
    SCALE.forEach(function (opt) {
      var label = document.createElement("label");
      label.className = "mbti-option" + (answers[idx] === opt.v ? " selected" : "");
      var input = document.createElement("input");
      input.type = "radio";
      input.name = "mbtiOption";
      input.value = String(opt.v);
      input.checked = answers[idx] === opt.v;
      input.addEventListener("change", function () { choose(opt.v); });
      var span = document.createElement("span");
      span.textContent = t(opt.label);
      label.appendChild(input);
      label.appendChild(span);
      qOptions.appendChild(label);
    });

    btnPrev.disabled = idx === 0;
    qHint.textContent = idx === TOTAL - 1
      ? t("This is the last question. Choose an option to see your result")
      : t("Select an option to move to the next question");
  }

  function choose(v) {
    if (locked) return;
    locked = true;
    answers[idx] = v;
    if (idx < TOTAL - 1) {
      idx++;
      renderQuestion();
    } else {
      bar.style.width = "100%";
      showResult();
    }
  }

  /* ---------- 计分与结果 ---------- */
  function calcResult() {
    var code = "";
    var dims = [];
    DIMENSIONS.forEach(function (d) {
      var aScore = 0;
      for (var pos = 0; pos < TOTAL; pos++) {
        var q = QUESTIONS[DISPLAY_ORDER[pos]];
        if (q.g !== d.key) continue;
        var v = answers[pos];
        if (v == null) continue;
        aScore += (q.toward === d.a) ? v : -v;
      }
      var pct = Math.round(((aScore + 24) / 48) * 100);
      if (pct < 0) pct = 0;
      if (pct > 100) pct = 100;
      var letter = aScore > 0 ? d.a : (aScore < 0 ? d.b : d.a);
      dims.push({ dim: d, aScore: aScore, pct: pct, letter: letter, balanced: aScore === 0 });
      code += letter;
    });
    return { code: code, dims: dims };
  }

  var lastResult = null;

  function showResult() {
    var res = calcResult();
    lastResult = res;
    var info = TYPES[res.code];

    document.getElementById("resCode").textContent = res.code;
    document.getElementById("resName").textContent = t(info.name);
    document.getElementById("resDesc").textContent = t(info.desc);

    var dimsBox = document.getElementById("resDims");
    dimsBox.innerHTML = "";
    res.dims.forEach(function (r) {
      var d = r.dim;
      var aPct = d.a === r.letter ? r.pct : 100 - r.pct;
      var bPct = 100 - aPct;
      var wrap = document.createElement("div");
      wrap.className = "mbti-dim";

      var head = document.createElement("div");
      head.className = "mbti-dim-head";
      var name = document.createElement("span");
      name.className = "dim-name";
      name.textContent = t(d.label);
      var val = document.createElement("b");
      val.textContent = t("{a} {n}% / {b} {m}%", { a: d.a, n: aPct, b: d.b, m: bPct });
      head.appendChild(name);
      head.appendChild(val);
      if (r.balanced) {
        var tag = document.createElement("span");
        tag.className = "badge";
        tag.textContent = t("Balanced");
        head.appendChild(tag);
      }

      var track = document.createElement("div");
      track.className = "mbti-dim-track";
      var fill = document.createElement("div");
      fill.className = "mbti-dim-fill";
      fill.style.width = aPct + "%";
      track.appendChild(fill);

      wrap.appendChild(head);
      wrap.appendChild(track);
      dimsBox.appendChild(wrap);
    });

    fillList("resStrengths", info.strengths);
    fillList("resWeaknesses", info.weaknesses);
    fillTags("resCareers", info.careers);
    fillTags("resMatch", info.match, true);

    show("result");
  }

  function fillList(id, items) {
    var box = document.getElementById(id);
    box.innerHTML = "";
    items.forEach(function (it) {
      var li = document.createElement("li");
      li.textContent = t(it);
      box.appendChild(li);
    });
  }

  function fillTags(id, items, isType) {
    var box = document.getElementById(id);
    box.innerHTML = "";
    items.forEach(function (it) {
      var tag = document.createElement("span");
      tag.className = "badge" + (isType ? " blue" : " green");
      tag.textContent = isType ? (it + " " + t(TYPES[it].name)) : t(it);
      box.appendChild(tag);
    });
  }

  /* ---------- 结果文本 ---------- */
  function buildResultText() {
    var res = lastResult;
    var info = TYPES[res.code];
    var lines = [];
    lines.push(t("MBTI Personality Test Result"));
    lines.push(t("Type: {code} {name}", { code: res.code, name: t(info.name) }));
    lines.push(t("Description: {desc}", { desc: t(info.desc) }));
    lines.push(t("Dimension tendencies:"));
    res.dims.forEach(function (r) {
      var d = r.dim;
      var aPct = d.a === r.letter ? r.pct : 100 - r.pct;
      var bPct = 100 - aPct;
      var suffix = r.balanced ? t(" (Balanced)") : "";
      lines.push(t("{label}：{a} {n}% / {b} {m}%{suffix}", {
        label: t(d.label), a: d.a, n: aPct, b: d.b, m: bPct, suffix: suffix
      }));
    });
    lines.push(t("Strengths: {items}", { items: info.strengths.map(function (s) { return t(s); }).join("、") }));
    lines.push(t("Weaknesses: {items}", { items: info.weaknesses.map(function (s) { return t(s); }).join("、") }));
    lines.push(t("Career directions: {items}", { items: info.careers.map(function (s) { return t(s); }).join("、") }));
    lines.push(t("Compatible types: {items}", {
      items: info.match.map(function (c) { return c + " " + t(TYPES[c].name); }).join("、")
    }));
    lines.push(t("(Results are for entertainment and self-exploration only)"));
    return lines.join("\n");
  }

  /* ---------- 事件 ---------- */
  function emptyAnswers() {
    var arr = [];
    for (var i = 0; i < TOTAL; i++) arr.push(null);
    return arr;
  }

  document.getElementById("btnStart").addEventListener("click", function () {
    answers = emptyAnswers();
    idx = 0;
    show("quiz");
    renderQuestion();
  });

  btnPrev.addEventListener("click", function () {
    if (idx > 0) {
      idx--;
      renderQuestion();
    }
  });

  document.getElementById("btnRestart").addEventListener("click", function () {
    answers = emptyAnswers();
    idx = 0;
    show("start");
  });

  document.getElementById("btnCopyResult").addEventListener("click", function () {
    if (!lastResult) return;
    copyText(buildResultText(), t("Test result copied"));
  });

  show("start");
})();
