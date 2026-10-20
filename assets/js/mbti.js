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
    { key: "EI", a: "E", b: "I", label: "精力来源" },
    { key: "SN", a: "S", b: "N", label: "认知方式" },
    { key: "TF", a: "T", b: "F", label: "决策方式" },
    { key: "JP", a: "J", b: "P", label: "生活态度" }
  ];

  /* ---------- 48 道题库（每维 12 道，前 6 题倾向首字母、后 6 题倾向次字母；展示顺序固定打乱） ---------- */
  var QUESTIONS = [
    /* E/I */
    { g: "EI", toward: "E", text: "在陌生的聚会场合，我会主动结识新朋友。" },
    { g: "EI", toward: "E", text: "我享受成为众人注意焦点的时刻。" },
    { g: "EI", toward: "E", text: "我倾向于边说边思考，通过交谈来理清思路。" },
    { g: "EI", toward: "E", text: "认识新朋友让我感到兴奋和充满能量。" },
    { g: "EI", toward: "E", text: "周末我更愿意安排外出聚会或集体活动。" },
    { g: "EI", toward: "E", text: "在团队讨论中，我通常是较早开口发言的人。" },
    { g: "EI", toward: "I", text: "忙碌的社交活动之后，我需要独处一段时间来恢复精力。" },
    { g: "EI", toward: "I", text: "比起当众发言，我更擅长书面表达自己的想法。" },
    { g: "EI", toward: "I", text: "我更喜欢与少数几位好友深入交流，而非参与大型社交。" },
    { g: "EI", toward: "I", text: "长时间的安静独处不会让我感到无聊。" },
    { g: "EI", toward: "I", text: "接到意外来电时，我会感到一丝不自在。" },
    { g: "EI", toward: "I", text: "我的想法往往先在内心反复斟酌，才会说出口。" },
    /* S/N */
    { g: "SN", toward: "S", text: "我更信任亲眼所见、亲身经历的事实。" },
    { g: "SN", toward: "S", text: "学习新技能时，我喜欢按步骤实操，而不是先听理论。" },
    { g: "SN", toward: "S", text: "我注重细节，会注意到别人忽略的具体变化。" },
    { g: "SN", toward: "S", text: "描述一件事时，我会尽量给出具体的数据和例子。" },
    { g: "SN", toward: "S", text: "我倾向于遵循被验证过的成熟方法做事。" },
    { g: "SN", toward: "S", text: "我对周围环境的变化（如摆设移动）很敏感。" },
    { g: "SN", toward: "N", text: "我经常思考事物背后的可能性和长远意义。" },
    { g: "SN", toward: "N", text: "我常常冒出一些天马行空、别人觉得奇怪的想法。" },
    { g: "SN", toward: "N", text: "比起当下的现实，未来图景更能吸引我的注意力。" },
    { g: "SN", toward: "N", text: "我喜欢琢磨抽象概念，也乐于参加头脑风暴。" },
    { g: "SN", toward: "N", text: "常规和重复让我厌倦，我总想尝试新做法。" },
    { g: "SN", toward: "N", text: "我相信直觉的判断，即使当时说不出理由。" },
    /* T/F */
    { g: "TF", toward: "T", text: "做决定时，我首先考虑逻辑是否自洽。" },
    { g: "TF", toward: "T", text: "评价一个方案时，我更关注效率而不是人情。" },
    { g: "TF", toward: "T", text: "我认为坦诚指出问题比照顾情面更重要。" },
    { g: "TF", toward: "T", text: "分析问题时，我会尽量把情绪因素排除在外。" },
    { g: "TF", toward: "T", text: "我倾向于用道理而不是安慰来回应朋友的抱怨。" },
    { g: "TF", toward: "T", text: "公平意味着规则对所有人一致执行。" },
    { g: "TF", toward: "F", text: "做决定时，我会认真考虑相关者的感受。" },
    { g: "TF", toward: "F", text: "别人心情不好时，我很容易察觉到并受其影响。" },
    { g: "TF", toward: "F", text: "我很难对别人的求助说“不”。" },
    { g: "TF", toward: "F", text: "和谐的人际关系对我来说是幸福的核心。" },
    { g: "TF", toward: "F", text: "我常常站在对方的角度体会他们的处境。" },
    { g: "TF", toward: "F", text: "表扬和鼓励比批评更能激发一个人的成长。" },
    /* J/P */
    { g: "JP", toward: "J", text: "我喜欢提前列好计划，并按计划执行。" },
    { g: "JP", toward: "J", text: "待办事项被一一勾掉时，我会感到满足。" },
    { g: "JP", toward: "J", text: "我的物品通常摆放整齐、各有其位。" },
    { g: "JP", toward: "J", text: "旅行前我会做好详细的行程安排。" },
    { g: "JP", toward: "J", text: "做事尽早完成让我安心，拖到最后会让我焦虑。" },
    { g: "JP", toward: "J", text: "我不喜欢计划被临时变故打乱。" },
    { g: "JP", toward: "P", text: "我习惯随机应变，不喜欢被过早的计划束缚。" },
    { g: "JP", toward: "P", text: "我常常临近截止日期才进入高效状态。" },
    { g: "JP", toward: "P", text: "我的工作台面常常处于“创造性混乱”状态。" },
    { g: "JP", toward: "P", text: "我享受说走就走的旅行。" },
    { g: "JP", toward: "P", text: "同时推进多项任务让我更有活力。" },
    { g: "JP", toward: "P", text: "我对新选项保持开放，愿意推迟最终决定。" }
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
    { v: 2, label: "非常同意" },
    { v: 1, label: "同意" },
    { v: 0, label: "一般" },
    { v: -1, label: "不同意" },
    { v: -2, label: "非常不同意" }
  ];

  /* ---------- 16 型数据 ---------- */
  var TYPES = {
    INTJ: {
      name: "建筑师",
      desc: "富有远见与战略思维，擅长独立拆解复杂问题并制定长期计划。对知识和能力有极高追求，认定目标后会持之以恒地执行到底。不喜欢被规则和情绪牵绊，社交中可能显得疏离。标准严苛、追求完美，是典型的长期主义思考者，一旦方向正确往往能成大事。",
      strengths: ["战略思维与长远规划能力", "独立解决问题的能力", "学习能力强，追求专业深度", "意志坚定，抗压能力强", "理性冷静，不被情绪左右"],
      weaknesses: ["过度追求完美，容易内耗", "疏于表达情感，显得冷淡", "对不如自己麻利的人缺乏耐心", "计划被打乱时容易烦躁", "不擅长团队协作中的妥协"],
      careers: ["战略咨询师", "产品经理", "科研人员", "系统架构师", "投资分析师"],
      match: ["ENTP", "ENFP"]
    },
    INTP: {
      name: "逻辑学家",
      desc: "天生的问题解决者，痴迷于理论与逻辑，喜欢追根究底地探究事物原理。思维活跃、创意迭出，常在头脑中构建复杂的理论模型。对世俗事务和人情世故缺乏兴趣，容易沉溺于思考而忽略行动。独处时效率最高，是安静而深刻的分析者。",
      strengths: ["逻辑严密，分析问题一针见血", "好奇心强，知识面广", "独立思考，不随波逐流", "富有创造力和理论天赋", "开放包容，尊重不同观点"],
      weaknesses: ["想得多做得少，容易拖延", "粗心大意，忽视生活细节", "不擅长处理人际冲突", "对执行层面的琐事缺乏耐心", "注意力容易转移到新想法上"],
      careers: ["软件工程师", "数据科学家", "数学家", "高校研究员", "技术架构师"],
      match: ["ENTJ", "ENFJ"]
    },
    ENTJ: {
      name: "指挥官",
      desc: "天生的领导者，目标感极强，擅长统筹资源、制定战略并推动执行。自信果断，喜欢挑战，在竞争和压力下反而更加兴奋。重视效率和结果，说话直接，有时会忽略他人的感受。不甘平庸，追求影响力和成就，习惯为团队指明方向。",
      strengths: ["领导力与号召力强", "目标明确，执行力强", "善于统筹规划和资源分配", "自信果敢，敢于拍板", "抗压能力强，越挫越勇"],
      weaknesses: ["强势独断，不易听取反对意见", "说话直接容易伤人", "对低效的人和事缺乏耐心", "工作狂倾向，忽视生活平衡", "情绪管理能力偏弱"],
      careers: ["企业高管", "创业者", "律师", "项目负责人", "市场战略"],
      match: ["INTP", "INFP"]
    },
    ENTP: {
      name: "辩论家",
      desc: "思维敏捷、能言善辩，喜欢挑战常规和头脑风暴。对新鲜事物充满好奇，善于发现漏洞并提出创新方案。兴趣广泛但持久性不足，容易在规则和重复中感到厌倦。享受智力交锋的过程，是团队里的点子发动机和气氛担当。",
      strengths: ["思维敏捷，创意层出不穷", "表达能力强，善于说服", "适应变化，临场发挥出色", "知识面广，融会贯通", "乐观幽默，社交能力好"],
      weaknesses: ["三分钟热度，难以坚持到底", "好争辩，容易较真抬杠", "轻视常规流程和细节", "做事缺乏条理，计划性弱", "容易给人不靠谱的印象"],
      careers: ["创业者", "市场营销", "广告创意", "律师", "投资人"],
      match: ["INTJ", "INFJ"]
    },
    INFJ: {
      name: "提倡者",
      desc: "理想主义与洞察力的结合，善于洞察人心，对意义和价值有执着的追求。外表安静温和，内心却有着坚定的信念和长远的目标。擅长倾听和启发他人，愿意为认定的价值默默付出。对世界的苦难敏感，容易背负过多他人的情绪。",
      strengths: ["洞察人心，共情能力强", "有信念感，为理想坚持", "创造力与洞察力兼备", "善于倾听和鼓舞他人", "做事有深度，不浮于表面"],
      weaknesses: ["对自己和他人期待过高", "容易积累负面情绪", "过度付出导致倦怠", "冲突面前倾向逃避或内伤", "理想与现实的落差带来痛苦"],
      careers: ["心理咨询师", "人力资源", "教师", "作家", "公益项目负责人"],
      match: ["ENTP", "ENFP"]
    },
    INFP: {
      name: "调停者",
      desc: "温柔的理想主义者，内心世界丰富，重视价值观与真诚。善解人意，总能站在他人角度思考，渴望世界变得更好。讨厌冲突和虚伪，宁愿沉默也不愿违心迎合。有艺术天赋和文字敏感度，适合需要创造力与人文关怀的领域。",
      strengths: ["共情力强，善良体贴", "富有创造力与想象力", "忠于自己的价值观", "包容开放，不轻易评判", "在热爱的事情上极具热情"],
      weaknesses: ["过于理想化，容易失望", "不擅拒绝，容易受委屈", "逃避冲突和现实问题", "自我怀疑，缺乏自信", "容易沉溺于情绪"],
      careers: ["心理咨询师", "插画师", "作家", "社会工作者", "内容创作者"],
      match: ["ENFJ", "ENTJ"]
    },
    ENFJ: {
      name: "主人公",
      desc: "富有魅力的天生导师，善于鼓舞和团结他人，能让每个人发挥所长。热情慷慨，重视人际关系，把帮助他人成长视为自己的使命。敏锐捕捉他人的需求，并主动搭建沟通的桥梁。在意评价，当关系紧张时会感到不安，需要被认可。",
      strengths: ["感染力强，善于激励他人", "组织协调能力出色", "共情与沟通兼备", "乐于助人，责任感强", "注重和谐，善于化解矛盾"],
      weaknesses: ["过度在意他人评价", "容易大包大揽，忽视自己", "回避冲突，勉强自己", "理想化他人，失望时受伤", "边界感模糊，易被消耗"],
      careers: ["教师", "培训师", "公关", "人力资源", "团队管理者"],
      match: ["INFP", "ISFP"]
    },
    ENFP: {
      name: "竞选者",
      desc: "热情自由的灵魂，对世界永远充满好奇与热爱。想法多多、活力满满，擅长点燃周围人的热情。重视可能性和真诚的关系，讨厌一成不变的束缚。容易被新鲜事物吸引而分散精力，需要在自由与责任之间找到平衡。",
      strengths: ["热情洋溢，感染力强", "创意与联想力丰富", "善于发现他人的闪光点", "适应力强，敢于尝试", "人际网络广，亲和力好"],
      weaknesses: ["注意力分散，难以专注", "讨厌琐碎细节和流程", "情绪起伏较大", "承诺过多而兑现不足", "需要外部认可来驱动"],
      careers: ["主持人", "市场策划", "记者", "心理咨询师", "创业者"],
      match: ["INTJ", "INFJ"]
    },
    ISTJ: {
      name: "物流师",
      desc: "严谨务实的责任担当，重视规则、秩序和承诺。做事脚踏实地，注重细节和流程，答应的事一定做到。相信事实和数据，不喜欢空谈和变动。家庭和工作中都是可靠的后盾，用行动而非言语证明自己的价值。",
      strengths: ["责任心强，值得信赖", "注重细节，少出错", "遵守规则，执行力稳定", "逻辑清晰，善于梳理流程", "冷静理性，处变不惊"],
      weaknesses: ["过于刻板，不善变通", "轻视理论创新", "情感表达生硬", "对不确定性感到焦虑", "容易固执己见"],
      careers: ["财务审计", "公务员", "法务", "质量管理", "数据管理员"],
      match: ["ESFP", "ESTP"]
    },
    ISFJ: {
      name: "守卫者",
      desc: "温暖细心的守护者，默默记住每个人的喜好与需要，并适时给予关怀。重视传统与责任，做事认真周到，是团队中最可靠的基石。不争不抢，却总在细节处让人感动。害怕改变和被否定，倾向在稳定的环境中持续付出。",
      strengths: ["细心体贴，善解人意", "责任感强，任劳任怨", "记忆力好，重视细节", "忠诚可靠，值得托付", "耐心温和，不急不躁"],
      weaknesses: ["过度压抑自己的需求", "不懂拒绝，容易被消耗", "害怕冲突和改变", "对自己缺乏信心", "容易积攒委屈"],
      careers: ["护理人员", "行政人员", "教师", "人力资源", "客户服务"],
      match: ["ESFP", "ESTP"]
    },
    ESTJ: {
      name: "总经理",
      desc: "果断高效的组织者，擅长制定规则、分配任务并推动落地。重视秩序和结果，相信制度和努力的价值。说话直截了当，对拖延和低效零容忍。是传统与秩序的维护者，在需要执行力的位置上总能交出漂亮的成绩单。",
      strengths: ["组织管理能力强", "果断坚决，行动迅速", "责任心强，以身作则", "务实理性，结果导向", "善于建立秩序和制度"],
      weaknesses: ["强势固执，不善变通", "不近人情，只看结果", "不信任创新和直觉", "容易批评他人", "不擅处理情绪问题"],
      careers: ["企业管理者", "项目经理", "运营总监", "销售负责人", "供应链管理"],
      match: ["ISFP", "INTP"]
    },
    ESFJ: {
      name: "执政官",
      desc: "热心肠的东道主，把让身边人舒适自在视为自己的成就。善于察言观色、照顾每一个人，是聚会和社区的组织核心。重视和谐、感恩与传统，愿意为关系长期经营。在意他人的看法，被冷落或批评时会明显失落。",
      strengths: ["热心肠，乐于助人", "人际敏感度高，会照顾人", "组织活动能力强", "忠诚守信，重视承诺", "务实可靠，说到做到"],
      weaknesses: ["过度在意他人评价", "需要大量外部认可", "对批评敏感，容易受伤", "回避冲突，勉强维持和气", "有时好为人师，管得宽"],
      careers: ["教师", "护士", "行政管理", "客户成功", "活动策划"],
      match: ["ISFP", "INTP"]
    },
    ISTP: {
      name: "鉴赏家",
      desc: "冷静的实干派，喜欢用双手和工具理解世界。危机面前格外镇定，擅长快速定位问题并动手解决。重视自由和效率，讨厌冗长的会议和空洞的讨论。话不多，但每句都切中要害，对感兴趣的领域钻研极深。",
      strengths: ["动手能力强，善于解决实际问题", "冷静沉着，危机处理能力强", "务实灵活，不拘泥形式", "专注力强，能深入研究", "独立自主，不依赖他人"],
      weaknesses: ["情绪表达迟钝，显得冷淡", "厌恶承诺和长期规划", "容易冒险，忽视风险", "沟通简短，让人难以靠近", "对理论说教没耐心"],
      careers: ["工程师", "外科医生", "飞行员", "技术专家", "急救人员"],
      match: ["ESFJ", "ESTJ"]
    },
    ISFP: {
      name: "探险家",
      desc: "安静敏感的艺术家，用感受和审美体验世界。不喜欢争辩和说教，更愿意用作品和行动表达自己。重视个人空间和当下体验，讨厌被计划和规则束缚。温柔体贴，对美有天然感知力，常常在不经意间打动他人。",
      strengths: ["审美敏锐，富有艺术天赋", "温柔体贴，不评判他人", "活在当下，懂得享受生活", "灵活务实，动手能力强", "忠诚于自己热爱的人和事"],
      weaknesses: ["逃避冲突和竞争", "缺乏长远规划", "自我评价偏低，容易怀疑", "不喜欢被约束和催促", "压力大时容易封闭自己"],
      careers: ["设计师", "音乐人", "插画师", "料理师", "手工创作者"],
      match: ["ESFJ", "ESTJ"]
    },
    ESTP: {
      name: "企业家",
      desc: "行动力爆表的现实主义者，信奉做了再说。擅长在变化中捕捉机会，喜欢冒险和刺激带来的心跳感。社交场上的焦点，善于察言观色和谈判博弈。讨厌纸上谈兵和漫长等待，更相信亲身实践得出的结论。",
      strengths: ["行动果断，执行速度快", "临场应变能力强", "社交敏锐，善于谈判", "敢于冒险，抓机会准", "务实理性，不感情用事"],
      weaknesses: ["冲动行事，缺乏耐心", "忽视风险和安全", "难以忍受枯燥和重复", "容易与人发生摩擦", "不喜欢长期承诺"],
      careers: ["创业者", "销售", "体育经纪人", "市场推广", "应急救援"],
      match: ["ISFJ", "ISTJ"]
    },
    ESFP: {
      name: "表演者",
      desc: "人群中的开心果，天生自带舞台感和感染力。热爱新鲜、美食、音乐和一切美好的事物，擅长把快乐传递给身边的人。活在当下，不喜欢为遥远的事焦虑。情绪来得快去得也快，渴望被关注和喜爱，是气氛的拯救者。",
      strengths: ["感染力强，自带快乐能量", "善于社交，人缘好", "行动力强，敢于尝试", "审美在线，生活有情趣", "共情直接，安慰人很暖"],
      weaknesses: ["难以延迟满足，容易冲动消费", "逃避严肃和长期规划", "情绪波动大，需要关注", "讨厌枯燥的理论学习", "容易被批评影响心情"],
      careers: ["主播", "演员", "活动策划", "销售", "幼教老师"],
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
    qMeta.textContent = t("第 {n} / {m} 题", { n: idx + 1, m: TOTAL });
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
      ? t("这是最后一题，选择后查看结果")
      : t("选择后自动进入下一题");
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
        tag.textContent = t("趋于平衡");
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
    lines.push(t("MBTI 性格测试结果"));
    lines.push(t("人格类型：{code} {name}", { code: res.code, name: t(info.name) }));
    lines.push(t("类型描述：{desc}", { desc: t(info.desc) }));
    lines.push(t("维度倾向："));
    res.dims.forEach(function (r) {
      var d = r.dim;
      var aPct = d.a === r.letter ? r.pct : 100 - r.pct;
      var bPct = 100 - aPct;
      var suffix = r.balanced ? t("（趋于平衡）") : "";
      lines.push(t("{label}：{a} {n}% / {b} {m}%{suffix}", {
        label: t(d.label), a: d.a, n: aPct, b: d.b, m: bPct, suffix: suffix
      }));
    });
    lines.push(t("优势：{items}", { items: info.strengths.map(function (s) { return t(s); }).join("、") }));
    lines.push(t("劣势：{items}", { items: info.weaknesses.map(function (s) { return t(s); }).join("、") }));
    lines.push(t("适合职业：{items}", { items: info.careers.map(function (s) { return t(s); }).join("、") }));
    lines.push(t("相性类型：{items}", {
      items: info.match.map(function (c) { return c + " " + t(TYPES[c].name); }).join("、")
    }));
    lines.push(t("（测试结果仅供娱乐与自我探索参考）"));
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
    copyText(buildResultText(), t("已复制测试结果"));
  });

  show("start");
})();
