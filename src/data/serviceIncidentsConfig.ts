import { getCharacterDef } from './storyConfig';
import { GameWorld, StoryModalEvent } from '../types/game';

let incUid = 50000;
function nextIncidentUid(prefix: string): string {
  incUid += 1;
  return `${prefix}_${incUid}`;
}

export interface SideQuestSummaryItem {
  id: string;
  title: string;
  npcName: string;
  accentColor: string;
  stageLabel: string;
  branchLabel: string;
  completed: boolean;
  summaryText: string;
}

// ============================================================================
// 1. SIDE-QUEST BRANCHING ARCHIVE SUMMARIES (FOR STORY CHRONICLE MODAL)
// ============================================================================

export function getDiscoveredSideQuestSummaries(world: GameWorld): SideQuestSummaryItem[] {
  const f = world.storyFlags;
  const list: SideQuestSummaryItem[] = [];

  // 1) Journalist Xu Qingchuan (3-Act, 6 Endings)
  if (f.side_journalist) {
    const st = f.side_journalist;
    const isDone = st.endsWith('_DONE');
    const branchMap: Record<string, { stage: string; branch: string; summary: string }> = {
      OPEN_KITCHEN: {
        stage: '第 1/3 幕 · 暗访破局',
        branch: '透明后厨线',
        summary: '你大方敞开后厨任由记者许清川查验，后续将在营业中迎来他的再度登门。',
      },
      BRIBE: {
        stage: '第 1/3 幕 · 暗访隐患',
        branch: '封口费风波线',
        summary: '你选择花钱息事宁人，但这笔交易似乎被人暗中拍下，风暴仍在酝酿。',
      },
      DEBATE: {
        stage: '第 1/3 幕 · 当堂交锋',
        branch: '公堂辩论线',
        summary: '你请全厅食客作证与记者硬碰硬辩论，全城美食圈正热议此事，后续将有盲测挑战。',
      },
      A_PARTNER: {
        stage: '第 2/3 幕 · 专题合作',
        branch: '明厨公益线',
        summary: '你与许清川携手举办透明食安开放日，港报头版引发巨大反响，静待终章回访。',
      },
      A_HYPE: {
        stage: '第 2/3 幕 · 流量造势',
        branch: '高调出圈线',
        summary: '你借港报专访乘势高调打广告，短期流量暴涨却也引来了同行的觊觎。',
      },
      B_REDEEM: {
        stage: '第 2/3 幕 · 诚恳致歉',
        branch: '绝地洗白线',
        summary: '封口费流言爆发后你公开道歉并透明示众，正努力重塑街坊信任。',
      },
      B_HARDLINE: {
        stage: '第 2/3 幕 · 铁腕硬刚',
        branch: '黑红流量线',
        summary: '你发律师函强硬反击，虽毁誉参半却让门店声名大噪。',
      },
      C_VICTORY: {
        stage: '第 2/3 幕 · 盲测完胜',
        branch: '鲜味封神线',
        summary: '在直播盲测中你家镇店海鲜碾压对手，全城食客慕名打卡。',
      },
      C_HUMBLE: {
        stage: '第 2/3 幕 · 谦和试吃',
        branch: '街坊死忠线',
        summary: '你拒绝炒作只请众人免费试吃，用真材实料收获了一批忠实回头客。',
      },
      A_PARTNER_DONE: {
        stage: '支线完结 (3/3)',
        branch: '结局：港湾食安金招牌',
        summary: '许清川辞去八卦报社成为你的专属食安顾问，并拉来商会宣传赞助！',
      },
      A_HYPE_DONE: {
        stage: '支线完结 (3/3)',
        branch: '结局：全城流量风口店',
        summary: '顶住同行围攻后，你的门店成为港湾最具话题度的爆红名馆！',
      },
      B_REDEEM_DONE: {
        stage: '支线完结 (3/3)',
        branch: '结局：浪子回头口碑逆转',
        summary: '连续透明开放厨房彻底洗刷风波，许清川发表长文为你正名！',
      },
      B_HARDLINE_DONE: {
        stage: '支线完结 (3/3)',
        branch: '结局：铁腕传奇话题馆',
        summary: '虽历经争议，却靠过硬菜品与强硬手腕杀出一条独门商路！',
      },
      C_VICTORY_DONE: {
        stage: '支线完结 (3/3)',
        branch: '结局：直播封神沸鼎王',
        summary: '盲测视频播放破百万，许清川正式将你收录进年度港城美食榜首推荐！',
      },
      C_HUMBLE_DONE: {
        stage: '支线完结 (3/3)',
        branch: '结局：厚道实在老字号',
        summary: '不争流量只争鲜味的格局令许清川动容，为你写下传世专栏佳话！',
      },
    };
    const info = branchMap[st] ?? {
      stage: '进行中',
      branch: '暗访支线',
      summary: '营业中与记者许清川的交集正在发酵。',
    };
    list.push({
      id: 'side_journalist',
      title: '暗访风波 · 美食记者许清川',
      npcName: '许清川',
      accentColor: '#38BDF8',
      stageLabel: info.stage,
      branchLabel: info.branch,
      completed: isDone,
      summaryText: info.summary,
    });
  }

  // 2) Old Captain Ahai (2-Act, 3 Endings)
  if (f.side_captain) {
    const st = f.side_captain;
    const isDone = st.endsWith('_DONE');
    const branchMap: Record<string, { stage: string; branch: string; summary: string }> = {
      KIND: {
        stage: '第 1/2 幕 · 一锅暖人心',
        branch: '善意赠锅线',
        summary: '你免费请避雨的老渔民吃了一顿热腾海鲜锅，老人临走时深深记住了你的招牌。',
      },
      FAIR: {
        stage: '第 1/2 幕 · 公道实在人',
        branch: '半价礼盒线',
        summary: '你以实在半价为老人打包热食，老人夸你做事有分寸，日后必有回响。',
      },
      REFUSED: {
        stage: '第 1/2 幕 · 擦肩而过',
        branch: '婉拒离去线',
        summary: '因高峰客满你婉拒了避雨老人的请求，他撑着旧伞默默消失在雨幕中。',
      },
      KIND_DONE: {
        stage: '支线完结 (2/2)',
        branch: '结局：秘传古法鱼露知音',
        summary: '老船长阿海竟是退隐码头大船东，携祖传鲜露与冷链鲜货重礼报恩！',
      },
      FAIR_DONE: {
        stage: '支线完结 (2/2)',
        branch: '结局：港湾渔船直供盟友',
        summary: '阿海船长赏识你的商道规矩，为你牵线船队平价直供并返还货款补贴！',
      },
      REFUSED_DONE: {
        stage: '支线完结 (2/2)',
        branch: '结局：失之交臂的船东宴',
        summary: '渔业商会包场去了对街，阿海留下一句忠告让你警醒，全店由此立下温情服务铁律。',
      },
    };
    const info = branchMap[st] ?? {
      stage: '进行中',
      branch: '老船长支线',
      summary: '老船长阿海的后续缘分即将到来。',
    };
    list.push({
      id: 'side_captain',
      title: '避雨老渔民 · 阿海船长的秘酿',
      npcName: '老船长阿海',
      accentColor: '#F59E0B',
      stageLabel: info.stage,
      branchLabel: info.branch,
      completed: isDone,
      summaryText: info.summary,
    });
  }

  // 3) Runaway Heiress Su Wanqing (2-Act, 2 Endings)
  if (f.side_runaway) {
    const st = f.side_runaway;
    const isDone = st.endsWith('_DONE');
    const branchMap: Record<string, { stage: string; branch: string; summary: string }> = {
      SHELTER: {
        stage: '第 1/2 幕 · 围裙奇缘',
        branch: '庇护帮工线',
        summary: '你借给逃婚千金苏晚晴一套围裙在后厨避风头，她临走塞给你一张神秘名片。',
      },
      MEDIATE: {
        stage: '第 1/2 幕 · 沸锅调解',
        branch: '煮茶和解线',
        summary: '你劝下冲动的姑娘并请保镖入座喝茶，促成一场坦诚沟通。',
      },
      SHELTER_DONE: {
        stage: '支线完结 (2/2)',
        branch: '结局：千金豪掷包场谢恩',
        summary: '苏晚晴重获人生自主权后携闺蜜名流包场庆贺，豪赠礼金并引爆贵宾口碑！',
      },
      MEDIATE_DONE: {
        stage: '支线完结 (2/2)',
        branch: '结局：冰释前嫌的港湾家宴',
        summary: '苏家父女在你的热锅前重归于好，特赠金字牌匾与家族赞助！',
      },
    };
    const info = branchMap[st] ?? {
      stage: '进行中',
      branch: '千金奇缘线',
      summary: '逃婚千金苏晚晴的后续回音正在路上。',
    };
    list.push({
      id: 'side_runaway',
      title: '礼服与围裙 · 逃婚千金苏晚晴',
      npcName: '苏晚晴',
      accentColor: '#F472B6',
      stageLabel: info.stage,
      branchLabel: info.branch,
      completed: isDone,
      summaryText: info.summary,
    });
  }

  return list;
}

// ============================================================================
// 2. BRANCHING SIDE-QUEST BUILDERS
// ============================================================================

function buildJournalistAct1(mgrName: string): StoryModalEvent {
  return {
    id: nextIncidentUid('inc_jour_1'),
    category: 'INCIDENT',
    badge: '营业突发支线 · 第 1 幕',
    speakerName: '许清川',
    speakerTitle: '港城美食专栏暗访记者',
    accentColor: '#38BDF8',
    headline: '突发暗访！食客拍桌质疑海鲜新鲜度',
    body: '营业正忙，一名戴黑框眼镜的瘦削男子突然举着单反站起身，对着冰台一阵狂拍。',
    lines: [
      {
        speaker: '许清川',
        title: '港城美食专栏暗访记者',
        text: '各位食客先别急着下筷！我是《港湾食评报》的许清川——刚才我看这冰台碎冰融得挺快，你这虾蟹不会是冷库压了几天的隔夜冻货吧？',
      },
      {
        speaker: mgrName,
        title: '店长',
        text: '（全厅食客瞬间都朝这边看了过来！若处理失当，口碑恐怕要受损；但若应对得体，或许能反客为主……）',
      },
    ],
    choices: [
      {
        id: 'side_jour_1_open',
        label: '大方请他进后厨冷库全程查验进货单与鲜度',
        hint: '开启【透明后厨支线】 · 口碑 +3 · 匠心 +2（卫生良好时效果绝佳）',
        reputationDelta: 3,
        philosophyDelta: { CRAFT: 2 },
        storyFlag: { key: 'side_journalist', value: 'OPEN_KITCHEN' },
        outcomeText: '你坦然拉开后厨冷链门请许清川当众核验批次与冰鲜成色。他紧锁的眉头渐渐舒展，收起相机低声道：“倒是家少见的实在馆子，过几天我再来细访。”',
      },
      {
        id: 'side_jour_1_bribe',
        label: '拉他到角落塞上 ¥120“车马费”请他高抬贵手',
        hint: '开启【暗流风波支线】 · 资金 -¥120 · 暂时平息骚动，但可能埋下后续隐患',
        cashDelta: -120,
        philosophyDelta: { EMPIRE: 1 },
        storyFlag: { key: 'side_journalist', value: 'BRIBE' },
        outcomeText: '许清川盯着信封冷笑一声，收下后匆匆离去。大堂暂时恢复了安静，但你不经意瞥见窗外似乎有人正举着手机拍下了这一幕……',
      },
      {
        id: 'side_jour_1_debate',
        label: '不卑不亢亮出活鲜现捞凭证，请满堂食客现场公证',
        hint: '开启【全城辩论支线】 · 口碑 +2 · 商业 +2 · 引发美食圈热议',
        reputationDelta: 2,
        philosophyDelta: { EMPIRE: 2 },
        storyFlag: { key: 'side_journalist', value: 'DEBATE' },
        outcomeText: '你当场掰开鲜虾展示晶莹弹牙的肉质，满堂熟客纷纷为你叫好！许清川涨红了脸放下狠话：“好一张利嘴，改日我带读者来跟你们盲测见真章！”',
      },
    ],
  };
}

function buildJournalistAct2(world: GameWorld, mgrName: string): StoryModalEvent | null {
  const branch = world.storyFlags.side_journalist;

  if (branch === 'OPEN_KITCHEN') {
    return {
      id: nextIncidentUid('inc_jour_2a'),
      category: 'INCIDENT',
      badge: '支线延续 · 透明后厨线 (2/3)',
      speakerName: '许清川',
      speakerTitle: '港城美食专栏记者',
      accentColor: '#38BDF8',
      headline: '许清川再度登门：港报头版专题邀约',
      body: '上次查验后厨后，许清川带着摄影助理再次走进店堂，神情满是敬意。',
      lines: [
        {
          speaker: '许清川',
          title: '港城美食专栏记者',
          text: `${mgrName}店长！上次我暗访后写了篇客观短评，没想到后台读者都在追问你家店名。我想做一期《港湾最透明海鲜明厨》头版专题，你看咱们怎么配合？`,
        },
      ],
      choices: [
        {
          id: 'side_jour_2_a_partner',
          label: '顺势举办“食安透明开放日”，邀市民免费参观冷链后厨',
          hint: '口碑 +7 · 卫生 +6 · 匠心 +2（导向「食安金招牌」终章）',
          reputationDelta: 7,
          philosophyDelta: { CRAFT: 2 },
          storyFlag: { key: 'side_journalist', value: 'A_PARTNER' },
          outcomeText: '开放日现场掌声雷动，连市场监管局都转发点赞！许清川激动地表示终稿刊发后还要给你带来一份重磅大礼。',
        },
        {
          id: 'side_jour_2_a_hype',
          label: '借头版热度立刻联动促销，放大商业声量',
          hint: '立即获得流量红利 +¥220 · 口碑 +3 · 商业 +2（导向「全城流量风口」终章）',
          cashDelta: 220,
          reputationDelta: 3,
          philosophyDelta: { EMPIRE: 2 },
          storyFlag: { key: 'side_journalist', value: 'A_HYPE' },
          outcomeText: '专题刚上线，店门口的队伍就排到了街角，营收飙升！只是对街几家老牌对手的眼神变得愈发不善……',
        },
      ],
    };
  }

  if (branch === 'BRIBE') {
    return {
      id: nextIncidentUid('inc_jour_2b'),
      category: 'INCIDENT',
      badge: '支线延续 · 封口费反噬 (2/3)',
      speakerName: '许清川',
      speakerTitle: '神色焦急的记者',
      accentColor: '#F87171',
      headline: '危机爆发！“花钱封口”照片在网上流传',
      body: '营业中途，许清川满头大汗地冲进店里，把手机屏幕递到你面前。',
      lines: [
        {
          speaker: '许清川',
          title: '神色焦急的记者',
          text: `${mgrName}店长出事了！那天咱们私下塞信封的画面被你对街的竞争对手偷拍了，现在本地论坛都在传你家靠买通记者掩盖食材问题！我真不该收那笔钱……现在怎么补救？`,
        },
      ],
      choices: [
        {
          id: 'side_jour_2_b_redeem',
          label: '退还歪风、公开致歉并拿出 ¥100 请全厅食客加菜验货',
          hint: '资金 -¥100 · 口碑 +3 · 温情 +2（导向「浪子回头逆转」终章）',
          cashDelta: -100,
          reputationDelta: 3,
          philosophyDelta: { WARMTH: 2 },
          storyFlag: { key: 'side_journalist', value: 'B_REDEEM' },
          outcomeText: '你当众坦承一时糊涂，并敞开冷库免费加菜任人检验。真诚的姿态意外赢回了不少街坊的理解，许清川也发誓要写长文替你澄清。',
        },
        {
          id: 'side_jour_2_b_hardline',
          label: '花费 ¥150 发律师声明反告对手恶意造谣，硬刚到底',
          hint: '资金 -¥150 · 口碑 -3 · 商业 +3（导向「铁腕黑红名店」终章）',
          cashDelta: -150,
          reputationDelta: -3,
          philosophyDelta: { EMPIRE: 3 },
          storyFlag: { key: 'side_journalist', value: 'B_HARDLINE' },
          outcomeText: '你的强硬律师函瞬间把话题推上同城热搜！虽然口碑褒贬不一，但大批猎奇食客反倒慕名涌来店里一探究竟。',
        },
      ],
    };
  }

  if (branch === 'DEBATE') {
    return {
      id: nextIncidentUid('inc_jour_2c'),
      category: 'INCIDENT',
      badge: '支线延续 · 公堂辩论线 (2/3)',
      speakerName: '许清川',
      speakerTitle: '带队挑战的食评人',
      accentColor: '#FBBF24',
      headline: '直播盲测踢馆！全城食客围观沸鼎试鲜',
      body: '许清川竟真的带着十来位美食博主和直播镜头再次登门，提出当众盲测鲜度！',
      lines: [
        {
          speaker: '许清川',
          title: '带队挑战的食评人',
          text: `${mgrName}店长，我说到做到！今天我带了十万观众在线见证——敢不敢现场捞出你的招牌海鲜和滚沸锅底，跟对街大店盲测比高下？`,
        },
      ],
      choices: [
        {
          id: 'side_jour_2_c_victory',
          label: '霸气应战！现场开壳涮煮镇店海鲜一决高下',
          hint: '口碑 +7 · 获直播打赏与爆单 +¥260 · 商业 +2（导向「直播封神」终章）',
          cashDelta: 260,
          reputationDelta: 7,
          philosophyDelta: { EMPIRE: 2 },
          storyFlag: { key: 'side_journalist', value: 'C_VICTORY' },
          outcomeText: '鲜甜弹牙的虾蟹一入口，直播间弹幕彻底沸腾！许清川心服口服地对着镜头竖起大拇指，满堂食客欢呼雀跃！',
        },
        {
          id: 'side_jour_2_c_humble',
          label: '婉拒拉踩炒作，自掏 ¥80 请在场观众免费试吃评判',
          hint: '资金 -¥80 · 口碑 +6 · 温情 +2（导向「厚道老字号」终章）',
          cashDelta: -80,
          reputationDelta: 6,
          philosophyDelta: { WARMTH: 2 },
          storyFlag: { key: 'side_journalist', value: 'C_HUMBLE' },
          outcomeText: '“好味道不需要踩着同行出名，请大家坐下安心尝一口。”你这番话赢得满屏赞誉，许清川也被你的格局深深打动。',
        },
      ],
    };
  }

  return null;
}

function buildJournalistAct3(world: GameWorld, mgrName: string): StoryModalEvent | null {
  const branch = world.storyFlags.side_journalist;
  const endings: Record<
    string,
    { headline: string; text: string; cash: number; rep: number; badge: string; flagVal: string }
  > = {
    A_PARTNER: {
      headline: '支线终章 · 港湾食安金招牌',
      badge: '支线终章 · 完美达成',
      text: `${mgrName}店长，我辞掉了那家爱捕风捉影的小报社！今天我是代表港湾餐饮协会来颁授“年度透明明厨标杆”奖牌与 ¥360 宣传补贴的。以后你这店，我免费当一辈子义务食安顾问！`,
      cash: 360,
      rep: 8,
      flagVal: 'A_PARTNER_DONE',
    },
    A_HYPE: {
      headline: '支线终章 · 全城流量风口店',
      badge: '支线终章 · 商业告捷',
      text: `恭喜${mgrName}店长！尽管对手眼红联手打压，但咱们的头版话题硬是稳居全城热榜第一！这是媒体合作分红 ¥420，潮鲜沸鼎已经是港湾流量之王了！`,
      cash: 420,
      rep: 4,
      flagVal: 'A_HYPE_DONE',
    },
    B_REDEEM: {
      headline: '支线终章 · 浪子回头口碑逆转',
      badge: '支线终章 · 逆风翻盘',
      text: `${mgrName}店长，我发表了长达五千字的实名澄清报道，公开了你连日透明后厨的实拍。网友都说“知错能改的实诚馆子更值得信任”！这是我自掏的赔罪礼 ¥180，咱们一笑泯恩仇！`,
      cash: 180,
      rep: 8,
      flagVal: 'B_REDEEM_DONE',
    },
    B_HARDLINE: {
      headline: '支线终章 · 铁腕传奇话题馆',
      badge: '支线终章 · 独辟蹊径',
      text: `对手最终撤下了黑稿，还赔了名誉和解金 ¥320！港城商圈现在都知道潮鲜沸鼎不好惹，但只要菜品够鲜，黑红也是真金白银的流量！`,
      cash: 320,
      rep: 3,
      flagVal: 'B_HARDLINE_DONE',
    },
    C_VICTORY: {
      headline: '支线终章 · 直播封神沸鼎王',
      badge: '支线终章 · 荣耀加冕',
      text: `盲测视频播放破百万了！${mgrName}店长，今年《港城必吃海鲜指南》封面非你莫属！主办方托我送来 ¥380 冠军礼金，祝潮鲜沸鼎长红不衰！`,
      cash: 380,
      rep: 9,
      flagVal: 'C_VICTORY_DONE',
    },
    C_HUMBLE: {
      headline: '支线终章 · 厚道实在老字号',
      badge: '支线终章 · 德艺双馨',
      text: `不炒作、不踩人、只用一锅真鲜留客——${mgrName}店长，读者们票选你为“港湾最具人情味好馆子”！这是商会敬赠的 ¥260 礼金与满仓鲜货礼遇！`,
      cash: 260,
      rep: 10,
      flagVal: 'C_HUMBLE_DONE',
    },
  };

  const end = endings[branch];
  if (!end) return null;

  return {
    id: nextIncidentUid('inc_jour_3'),
    category: 'INCIDENT',
    badge: end.badge,
    speakerName: '许清川',
    speakerTitle: '港城知名美食撰稿人',
    accentColor: '#E8C97A',
    headline: end.headline,
    body: end.text,
    lines: [
      {
        speaker: '许清川',
        title: '港城知名美食撰稿人',
        text: end.text,
      },
    ],
    choices: [
      {
        id: `side_jour_3_finish_${branch}`,
        label: '握手致谢，收下这份沉甸甸的认可',
        hint: `奖励：资金 +¥${end.cash} · 门店口碑 +${end.rep} · 支线结局永久收录见闻录`,
        cashDelta: end.cash,
        reputationDelta: end.rep,
        storyFlag: { key: 'side_journalist', value: end.flagVal },
        outcomeText: `【支线完结 · ${end.headline}】资金 +¥${end.cash}，口碑 +${end.rep}！该分支结局已镌刻至「主线见闻」档案。`,
      },
    ],
  };
}

function buildCaptainAct1(mgrName: string): StoryModalEvent {
  return {
    id: nextIncidentUid('inc_cap_1'),
    category: 'INCIDENT',
    badge: '营业突发支线 · 第 1 幕',
    speakerName: '老船长阿海',
    speakerTitle: '浑身湿透的老渔民',
    accentColor: '#F59E0B',
    headline: '门外避雨的老人：只求一碗热海鲜汤',
    body: '店里正热火朝天，一位穿着褪色旧雨衣、满手老茧的老渔民站在门口局促地搓着手。',
    lines: [
      {
        speaker: '老船长阿海',
        title: '避雨的老渔民',
        text: '小老板……外头风浪太大，我老寒腿犯了。我就兜里这二十块钱，不进大厅占桌，能不能买一碗你们后厨的滚热海鲜汤暖暖身子？',
      },
      {
        speaker: mgrName,
        title: '店长',
        text: '（他身上的雨衣虽然破旧，但手腕上那块老铜船表和挑海鲜的眼神，似乎并不是寻常人……）',
      },
    ],
    choices: [
      {
        id: 'side_cap_1_kind',
        label: '分文不收！立刻请老人进屋坐下吃顿热腾海鲜锅',
        hint: '开启【善意赠锅支线】 · 口碑 +3 · 温情 +2 · 消耗少量熟食',
        reputationDelta: 3,
        philosophyDelta: { WARMTH: 2 },
        storyFlag: { key: 'side_captain', value: 'KIND' },
        outcomeText: '你拉着老人坐到暖灯下，端上滚沸海鲜锅与热茶。老人眼眶微微泛红，临走时深深看了一眼店匾：“好孩子，老头子记住潮鲜沸鼎了！”',
      },
      {
        id: 'side_cap_1_fair',
        label: '按半价 ¥30 贴心打包一份热腾海鲜熟食盒与姜茶',
        hint: '开启【商道实在支线】 · 资金 +¥30 · 匠心 +1',
        cashDelta: 30,
        philosophyDelta: { CRAFT: 1 },
        storyFlag: { key: 'side_captain', value: 'FAIR' },
        outcomeText: '你既照顾了老人的自尊，又塞得满满当当。老渔民掂了掂沉甸甸的餐盒，点头笑道：“不贪便宜也不摆架子，你会做生意。”',
      },
      {
        id: 'side_cap_1_refuse',
        label: '店内高峰客满，委婉指引老人去隔壁平价面馆',
        hint: '开启【擦肩而过支线】 · 不耗食材，保持当前节奏',
        storyFlag: { key: 'side_captain', value: 'REFUSED' },
        outcomeText: '老渔民理解地点点头，紧了紧湿透的雨衣，低头慢慢消失在街角人潮中。',
      },
    ],
  };
}

function buildCaptainAct2(world: GameWorld, mgrName: string): StoryModalEvent | null {
  const branch = world.storyFlags.side_captain;
  if (branch === 'KIND') {
    return {
      id: nextIncidentUid('inc_cap_2a'),
      category: 'INCIDENT',
      badge: '支线终章 · 善意回报 (2/2)',
      speakerName: '老船长阿海',
      speakerTitle: '港湾渔业协会荣誉船东',
      accentColor: '#E8C97A',
      headline: '秘传古法鱼露赠知音！大船东携鲜货登门',
      body: '数日后，一辆满载鲜活渔获的冷链货车停在门口，那天避雨的老人身着笔挺唐装大步走来！',
      lines: [
        {
          speaker: '老船长阿海',
          title: '港湾渔业协会荣誉船东',
          text: `哈哈，${mgrName}店长别惊讶！那天我去码头巡船忘带钱包，多亏你一锅热汤暖了我的心！我带了两坛祖传古法鲜鱼露、一车免单冷链原料和 ¥280 商会贺礼，以后潮鲜沸鼎就是我阿海船队的头号直供伙伴！`,
        },
      ],
      choices: [
        {
          id: 'side_cap_2_kind_done',
          label: '躬身接过秘酿鱼露与鲜货大礼',
          hint: '奖励：资金 +¥280 · 口碑 +8 · 后场冷链原料直接补满！',
          cashDelta: 280,
          reputationDelta: 8,
          storyFlag: { key: 'side_captain', value: 'KIND_DONE' },
          outcomeText: '【支线完结 · 秘传古法鱼露知音】现金 +¥280、口碑 +8，冷链库房原料瞬间装满！',
        },
      ],
    };
  }

  if (branch === 'FAIR') {
    return {
      id: nextIncidentUid('inc_cap_2b'),
      category: 'INCIDENT',
      badge: '支线终章 · 商道同盟 (2/2)',
      speakerName: '老船长阿海',
      speakerTitle: '港湾渔业协会荣誉船东',
      accentColor: '#38BDF8',
      headline: '阿海船长再访：签订港湾渔船直供返利',
      body: '那位老渔民穿着整洁的海员夹克走进大厅，身后跟着两位船队大副。',
      lines: [
        {
          speaker: '老船长阿海',
          title: '港湾渔业协会荣誉船东',
          text: `${mgrName}店长，上次那盒半价热食让我看清你是个有分寸的实在商人。我把咱们港湾直供船队的 ¥200 首批返利和一批海鲜补货送来，愿咱们细水长流！`,
        },
      ],
      choices: [
        {
          id: 'side_cap_2_fair_done',
          label: '爽快签约合作，共谋港湾鲜味',
          hint: '奖励：资金 +¥200 · 口碑 +5 · 后场原料 +15',
          cashDelta: 200,
          reputationDelta: 5,
          storyFlag: { key: 'side_captain', value: 'FAIR_DONE' },
          outcomeText: '【支线完结 · 港湾渔船直供盟友】现金 +¥200、口碑 +5、后场冷链原料 +15！',
        },
      ],
    };
  }

  if (branch === 'REFUSED') {
    return {
      id: nextIncidentUid('inc_cap_2c'),
      category: 'INCIDENT',
      badge: '支线终章 · 商海一课 (2/2)',
      speakerName: '老船长阿海',
      speakerTitle: '港湾渔业协会荣誉船东',
      accentColor: '#C5AE92',
      headline: '失之交臂的船东宴与一句老船长忠告',
      body: '窗外对街鞭炮齐鸣，渔业商会的百人庆功宴竟然包了竞争对手的场子。片刻后，老船长独自推门进来喝了杯茶。',
      lines: [
        {
          speaker: '老船长阿海',
          title: '港湾渔业协会荣誉船东',
          text: `${mgrName}店长，做生意讲究效率没错，但海港的火锅店最留人的，往往是寒夜里多递出的那一碗热汤。今天的话虽逆耳，望你往后顺风顺水。`,
        },
      ],
      choices: [
        {
          id: 'side_cap_2_refuse_done',
          label: '虚心受教，在全店立下“温情迎客”服务规章',
          hint: '口碑 -2 · 但全体员工士气拉满至 100 且疲劳大幅恢复！',
          reputationDelta: -2,
          philosophyDelta: { WARMTH: 1 },
          storyFlag: { key: 'side_captain', value: 'REFUSED_DONE' },
          outcomeText: '【支线完结 · 失之交臂的船东宴】虽然错过了大船东包场，但全店上下由此凝聚，员工士气拉满！',
        },
      ],
    };
  }

  return null;
}

function buildRunawayAct1(mgrName: string): StoryModalEvent {
  return {
    id: nextIncidentUid('inc_run_1'),
    category: 'INCIDENT',
    badge: '营业突发支线 · 第 1 幕',
    speakerName: '苏晚晴',
    speakerTitle: '提着裙摆冲进来的神秘女孩',
    accentColor: '#F472B6',
    headline: '突降奇客！穿晚礼服的姑娘躲进后厨',
    body: '一阵香风刮过，一名穿着珍珠白晚礼服、拎着高跟鞋的姑娘急匆匆溜进迎宾台旁！',
    lines: [
      {
        speaker: '苏晚晴',
        title: '逃婚的豪门千金',
        text: '店长救命！我爸逼我今天去跟不认识的继承人订婚，我趁乱溜出来了，门外保镖快追来了！求你借我一套服务员围裙假装干活躲半小时，我干活超麻利！',
      },
      {
        speaker: mgrName,
        title: '店长',
        text: '（门外确实有两名西装革履的保镖正在街口张望……这件事该如何决断？）',
      },
    ],
    choices: [
      {
        id: 'side_run_1_shelter',
        label: '递上干净围裙：“先去帮着端端熟食、躲过这阵风头再说！”',
        hint: '开启【围裙奇缘支线】 · 温情 +2 · 立即获帮工支援（熟食 +3、净餐具 +3）',
        philosophyDelta: { WARMTH: 2 },
        storyFlag: { key: 'side_runaway', value: 'SHELTER' },
        outcomeText: '苏晚晴麻利地扎起头发套上围裙，不仅成功骗过了保镖，还帮你端出好几盘热菜！临走前她俏皮地留下一句：“这顿人情，改天我带全城闺蜜来还！”',
      },
      {
        id: 'side_run_1_mediate',
        label: '劝她别意气用事，并请保镖与她父亲进包间吃锅详谈',
        hint: '开启【沸锅和解支线】 · 口碑 +4 · 匠心 +2',
        reputationDelta: 4,
        philosophyDelta: { CRAFT: 2 },
        storyFlag: { key: 'side_runaway', value: 'MEDIATE' },
        outcomeText: '在热气腾腾的火锅雾气中，剑拔弩张的气氛竟真的缓和了下来。苏家保镖临走时对你竖起大拇指：“店长是个有格局的明白人。”',
      },
    ],
  };
}

function buildRunawayAct2(world: GameWorld, mgrName: string): StoryModalEvent | null {
  const branch = world.storyFlags.side_runaway;
  if (branch === 'SHELTER') {
    return {
      id: nextIncidentUid('inc_run_2a'),
      category: 'INCIDENT',
      badge: '支线终章 · 闺蜜名流包场 (2/2)',
      speakerName: '苏晚晴',
      speakerTitle: '独立创业的苏家千金',
      accentColor: '#F472B6',
      headline: '千金兑现诺言：豪掷重金包场庆贺自由',
      body: '数日后，苏晚晴挽着一众时尚名流笑容灿烂地走入大厅，直接递上一张沉甸甸的烫金支票！',
      lines: [
        {
          speaker: '苏晚晴',
          title: '独立创业的苏家千金',
          text: `${mgrName}店长！我跟老爸彻底摊牌取消联姻、自己开了设计工作室啦！多亏那天你的围裙和那顿热乎海鲜给我勇气——这 ¥450 是今天姐妹团的包场赏金，以后我就是潮鲜沸鼎的头号代言人！`,
        },
      ],
      choices: [
        {
          id: 'side_run_2_shelter_done',
          label: '举杯同贺！欢迎苏大小姐常回家吃锅',
          hint: '奖励：资金 +¥450 · 口碑 +7 · 在座食客满意度大幅提升',
          cashDelta: 450,
          reputationDelta: 7,
          storyFlag: { key: 'side_runaway', value: 'SHELTER_DONE' },
          outcomeText: '【支线完结 · 千金豪掷包场谢恩】资金 +¥450、口碑 +7，满堂贵宾赞不绝口！',
        },
      ],
    };
  }

  if (branch === 'MEDIATE') {
    return {
      id: nextIncidentUid('inc_run_2b'),
      category: 'INCIDENT',
      badge: '支线终章 · 温情家宴 (2/2)',
      speakerName: '苏晚晴',
      speakerTitle: '重归于好的苏家父女',
      accentColor: '#E8C97A',
      headline: '冰释前嫌的和解家宴：苏氏家族赠匾',
      body: '苏晚晴挽着她父亲的手臂微笑着走进潮鲜沸鼎，父女俩带来了一块手工雕花的金字贺匾！',
      lines: [
        {
          speaker: '苏晚晴',
          title: '苏家千金',
          text: `${mgrName}店长，那天多亏你没有推波助澜，反而留了一桌热锅让我们父女十年来第一次好好说话。我爸同意尊重我的选择啦！他特意备了 ¥320 谢礼和牌匾，说全港湾就服你这家有温度的馆子！`,
        },
      ],
      choices: [
        {
          id: 'side_run_2_mediate_done',
          label: '高悬贺匾，祝苏氏父女阖家安康',
          hint: '奖励：资金 +¥320 · 口碑 +9 · 温情 +2',
          cashDelta: 320,
          reputationDelta: 9,
          philosophyDelta: { WARMTH: 2 },
          storyFlag: { key: 'side_runaway', value: 'MEDIATE_DONE' },
          outcomeText: '【支线完结 · 冰释前嫌的港湾家宴】资金 +¥320、口碑 +9，成为街坊传颂的暖心佳话！',
        },
      ],
    };
  }

  return null;
}

// ============================================================================
// 3. STANDALONE IN-SERVICE UNEXPECTED INCIDENTS
// ============================================================================

function buildStandaloneIncident(id: string, mgrName: string): StoryModalEvent {
  switch (id) {
    case 'inc_ice_melt':
      return {
        id: nextIncidentUid('inc_ice_melt'),
        category: 'INCIDENT',
        badge: '营业突发状况 · 设备抢险',
        speakerName: '前厅领班',
        speakerTitle: '急匆匆跑来的值班员',
        accentColor: '#38BDF8',
        headline: '制冰机突停！海鲜冰台开始加速化水',
        body: '午市高峰将至，冰台底部的碎冰忽然渗水，海鲜保鲜度眼看就要受影响！',
        lines: [
          {
            speaker: '前厅领班',
            title: '前厅值班员',
            text: `${mgrName}店长不好了！冰台下方制冰管路突然结霜堵住了，碎冰融得特别快，客人们都在看呢，咱们怎么救急？`,
          },
        ],
        choices: [
          {
            id: 'inc_ice_buy',
            label: '立即呼叫码头急送加急干冰与碎冰（花费 ¥65）',
            hint: '资金 -¥65 · 卫生 +5 · 口碑 +2 · 冰台瞬间稳固保鲜',
            cashDelta: -65,
            reputationDelta: 2,
            philosophyDelta: { CRAFT: 1 },
            outcomeText: '加急碎冰十分钟内铺满冰台，雾气缭绕反倒显得海鲜格外诱人！卫生 +5，口碑 +2。',
          },
          {
            id: 'inc_ice_diy',
            label: '亲手清理冷凝管并临时倒冰救急（免花钱）',
            hint: '不扣资金 · 设备健康 -10 · 卫生 -3 · 匠心 +1',
            philosophyDelta: { CRAFT: 1 },
            outcomeText: '你满手冰水亲手疏通了管道，虽让设备略微过载、地面溅了点水，但省下了应急开支。',
          },
          {
            id: 'inc_ice_promo',
            label: '顺势把冰台鲜货转给热厨现炒，推出限时“铁板鲜虾秀”',
            hint: '口碑 +3 · 熟食热菜立即补满！后场冷链原料 -4',
            reputationDelta: 3,
            philosophyDelta: { EMPIRE: 1 },
            outcomeText: '临危不乱的铁板爆炒香气瞬间征服全场！熟食明档满槽出锅，口碑 +3！',
          },
        ],
      };

    case 'inc_table_dispute':
      return {
        id: nextIncidentUid('inc_table_dispute'),
        category: 'INCIDENT',
        badge: '营业突发状况 · 堂口纠纷',
        speakerName: '前厅领班',
        speakerTitle: '焦急的前厅服务员',
        accentColor: '#FB923C',
        headline: '餐桌小风波：两桌食客因蘸料溅油争执',
        body: '大堂中央两桌食客因为端牛油辣锅时不小心溅到衣角吵了起来，周围顾客纷纷侧目。',
        lines: [
          {
            speaker: '前厅领班',
            title: '前厅服务员',
            text: `${mgrName}店长快来看看！那边两位客人因为辣油溅到袖口闹得不愉快，要是不赶紧劝开，整排桌子的兴致都要受影响！`,
          },
        ],
        choices: [
          {
            id: 'inc_dispute_treat',
            label: '亲自致歉递上干洗补贴 ¥45，并赠双方特调冰饮',
            hint: '资金 -¥45 · 口碑 +4 · 在座全部顾客满意度 +10 · 温情 +1',
            cashDelta: -45,
            reputationDelta: 4,
            philosophyDelta: { WARMTH: 1 },
            outcomeText: '你的大度与诚意迅速化解了尴尬，两桌客人握手言和，连邻桌都夸你家服务周到！',
          },
          {
            id: 'inc_dispute_swap',
            label: '温和劝解并迅速为双方免费换新锅、递上湿巾围裙',
            hint: '免费 · 口碑 +2 · 消耗 1 套洁净餐具',
            reputationDelta: 2,
            outcomeText: '利落的换锅与贴心围裙很快平息了争执，堂口重归热闹有序。',
          },
          {
            id: 'inc_dispute_strict',
            label: '按店规请双方保持安静，避免影响他人用餐',
            hint: '无消耗 · 口碑 -3 · 顾客略感生硬',
            reputationDelta: -3,
            outcomeText: '场面虽安静下来，但那两桌客人脸色始终不太好看，走时嘟囔着下次不来了。',
          },
        ],
      };

    case 'inc_dock_peddler':
      return {
        id: nextIncidentUid('inc_dock_peddler'),
        category: 'INCIDENT',
        badge: '营业突发状况 · 临时货源',
        speakerName: '码头老渔民',
        speakerTitle: '赶潮上岸的散户渔民',
        accentColor: '#34D399',
        headline: '后门惊喜！赶潮渔民低价急售一筐活虾蟹',
        body: '营业中途后门敲响，一位刚收网的渔民扛着两大筐活蹦乱跳的海鲜急着变现。',
        lines: [
          {
            speaker: '码头老渔民',
            title: '赶潮散户渔民',
            text: `${mgrName}老板！今天潮水好捞多了一筐活鲜，天热放不住，¥90 全打包给你！你验验货，条条都还蹦跶着呢！`,
          },
        ],
        choices: [
          {
            id: 'inc_peddler_buy',
            label: '当场逐一验鲜合格后 ¥90 爽快全收',
            hint: '资金 -¥90 · 后场冷链原料 +14 · 冰台 2 格菜品立即补满！',
            cashDelta: -90,
            philosophyDelta: { EMPIRE: 1 },
            outcomeText: '这批现捕海鲜鲜亮极了！刚一倒上冰台就被客人们抢着拍照，省了一大笔冷链采购费！',
          },
          {
            id: 'inc_peddler_reject',
            label: '坚持只收带正规检疫票据的冷链货源，礼貌婉拒',
            hint: '食安零风险 · 卫生 +6 · 口碑 +2 · 匠心 +1',
            reputationDelta: 2,
            philosophyDelta: { CRAFT: 1 },
            outcomeText: '你坚守食品溯源底线的做法让路过的熟客赞不绝口，卫生评价 +6、口碑 +2！',
          },
        ],
      };

    default:
      return {
        id: nextIncidentUid('inc_power_flicker'),
        category: 'INCIDENT',
        badge: '营业突发状况 · 电路跳闸',
        speakerName: '前厅领班',
        speakerTitle: '值班电工助手',
        accentColor: '#FBBF24',
        headline: '高峰骤暗！大堂电路过载跳闸三十秒',
        body: '满堂沸锅同时开到最大火，配电箱突然“啪”地跳闸，大厅陷入短暂昏暗！',
        lines: [
          {
            speaker: '前厅领班',
            title: '前厅领班',
            text: `${mgrName}店长！电磁炉满负荷运转把分闸跳了，客人们正举着手机照亮呢，快拿主意！`,
          },
        ],
        choices: [
          {
            id: 'inc_power_candle',
            label: '点亮备用暖光提灯，笑称“限时烛光海鲜夜宴”并送小果盘',
            hint: '资金 -¥40 · 口碑 +5 · 全场食客满意度 +12 · 温情 +2',
            cashDelta: -40,
            reputationDelta: 5,
            philosophyDelta: { WARMTH: 2 },
            outcomeText: '慌乱竟瞬间变成了浪漫惊喜！客人们纷纷发朋友圈称赞你的临场应变，口碑 +5！',
          },
          {
            id: 'inc_power_reset',
            label: '立刻冲进设备间强行合闸恢复供电（免花钱）',
            hint: '免费 · 设备健康 -12 · 口碑 +1',
            reputationDelta: 1,
            outcomeText: '十秒内灯光与锅灶全部恢复，但老化线路微微发热，记得闭店后去设备间检修一下。',
          },
        ],
      };
  }
}

// ============================================================================
// 4. INCIDENT DISPATCHER & MECHANICAL EFFECT APPLIER
// ============================================================================

export function pickServiceIncident(world: GameWorld): StoryModalEvent | null {
  const mgrName = getCharacterDef(world.characterId).name;
  const f = world.storyFlags;

  // Priority 1: Follow-up acts of ongoing branching side-quests!
  if (f.side_journalist && !f.side_journalist.endsWith('_DONE')) {
    const lastDay = Number(f.side_journalist_day || 0);
    if (world.day - lastDay >= 2) {
      if (['OPEN_KITCHEN', 'BRIBE', 'DEBATE'].includes(f.side_journalist)) {
        return buildJournalistAct2(world, mgrName);
      }
      if (
        ['A_PARTNER', 'A_HYPE', 'B_REDEEM', 'B_HARDLINE', 'C_VICTORY', 'C_HUMBLE'].includes(
          f.side_journalist
        )
      ) {
        return buildJournalistAct3(world, mgrName);
      }
    }
  }

  if (f.side_captain && !f.side_captain.endsWith('_DONE')) {
    const lastDay = Number(f.side_captain_day || 0);
    if (world.day - lastDay >= 2) {
      return buildCaptainAct2(world, mgrName);
    }
  }

  if (f.side_runaway && !f.side_runaway.endsWith('_DONE')) {
    const lastDay = Number(f.side_runaway_day || 0);
    if (world.day - lastDay >= 2) {
      return buildRunawayAct2(world, mgrName);
    }
  }

  // Priority 2: Day 1 guaranteed lively operational incident so player experiences crisis handling!
  if (world.day === 1) {
    world.recentIncidentIds.push('inc_table_dispute');
    return buildStandaloneIncident('inc_table_dispute', mgrName);
  }

  // Priority 3: Start a new branching side-quest when day threshold is reached
  const startableSides: Array<() => StoryModalEvent> = [];
  if (!f.side_journalist && world.day >= 2) {
    startableSides.push(() => buildJournalistAct1(mgrName));
  }
  if (!f.side_captain && world.day >= 3) {
    startableSides.push(() => buildCaptainAct1(mgrName));
  }
  if (!f.side_runaway && world.day >= 5) {
    startableSides.push(() => buildRunawayAct1(mgrName));
  }

  if (startableSides.length > 0 && Math.random() < 0.62) {
    const picked = startableSides[Math.floor(Math.random() * startableSides.length)];
    return picked();
  }

  // Priority 4: Non-repeating standalone operational incident
  const pool = ['inc_ice_melt', 'inc_table_dispute', 'inc_dock_peddler', 'inc_power_flicker'];
  const fresh = pool.filter((id) => !world.recentIncidentIds.slice(-2).includes(id));
  const chosenId = (fresh.length > 0 ? fresh : pool)[
    Math.floor(Math.random() * (fresh.length > 0 ? fresh.length : pool.length))
  ];
  world.recentIncidentIds.push(chosenId);
  if (world.recentIncidentIds.length > 8) {
    world.recentIncidentIds = world.recentIncidentIds.slice(-8);
  }
  return buildStandaloneIncident(chosenId, mgrName);
}

export function applyIncidentChoiceEffects(world: GameWorld, choiceId: string): void {
  // Record day timestamps for branching side-quest pacing
  if (choiceId.startsWith('side_jour_')) {
    world.storyFlags.side_journalist_day = String(world.day);
  } else if (choiceId.startsWith('side_cap_')) {
    world.storyFlags.side_captain_day = String(world.day);
  } else if (choiceId.startsWith('side_run_')) {
    world.storyFlags.side_runaway_day = String(world.day);
  }

  switch (choiceId) {
    case 'side_jour_2_a_partner':
      world.hygiene = Math.min(100, world.hygiene + 6);
      break;
    case 'side_cap_1_kind':
      world.cookedStock = Math.max(0, world.cookedStock - 1);
      break;
    case 'side_cap_2_kind_done':
      world.rawIngredients = world.rawIngredientsMax;
      break;
    case 'side_cap_2_fair_done':
      world.rawIngredients = Math.min(world.rawIngredientsMax, world.rawIngredients + 15);
      break;
    case 'side_cap_2_refuse_done':
      world.staff.forEach((s) => {
        s.morale = 100;
        s.fatigue = Math.max(0, s.fatigue - 30);
      });
      break;
    case 'side_run_1_shelter':
      world.cookedStock = Math.min(world.cookedMaxStock, world.cookedStock + 3);
      world.cleanDishes = Math.min(world.dishwareMax, world.cleanDishes + 3);
      break;
    case 'side_run_2_shelter_done':
      world.tables.forEach((t) => {
        if (t.customer) t.customer.satisfaction = Math.min(100, t.customer.satisfaction + 15);
      });
      break;
    case 'inc_ice_buy':
      world.hygiene = Math.min(100, world.hygiene + 5);
      break;
    case 'inc_ice_diy':
      world.equipmentHealth = Math.max(10, world.equipmentHealth - 10);
      world.hygiene = Math.max(0, world.hygiene - 3);
      break;
    case 'inc_ice_promo':
      world.cookedStock = world.cookedMaxStock;
      world.rawIngredients = Math.max(0, world.rawIngredients - 4);
      break;
    case 'inc_dispute_treat':
      world.tables.forEach((t) => {
        if (t.customer) t.customer.satisfaction = Math.min(100, t.customer.satisfaction + 10);
      });
      break;
    case 'inc_dispute_swap':
      world.cleanDishes = Math.max(0, world.cleanDishes - 1);
      break;
    case 'inc_peddler_buy':
      world.rawIngredients = Math.min(world.rawIngredientsMax, world.rawIngredients + 14);
      world.buffetSlots.slice(0, 2).forEach((s) => {
        s.stock = s.maxStock;
      });
      break;
    case 'inc_peddler_reject':
      world.hygiene = Math.min(100, world.hygiene + 6);
      break;
    case 'inc_power_candle':
      world.tables.forEach((t) => {
        if (t.customer) t.customer.satisfaction = Math.min(100, t.customer.satisfaction + 12);
      });
      break;
    case 'inc_power_reset':
      world.equipmentHealth = Math.max(10, world.equipmentHealth - 12);
      break;
  }
}
