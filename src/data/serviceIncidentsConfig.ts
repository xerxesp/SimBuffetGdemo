import { getCharacterDef } from './storyConfig';
import { GameWorld, SeasonId, StoryModalEvent } from '../types/game';

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

export interface SeasonalEventSummaryItem {
  id: string;
  season: SeasonId;
  seasonLabel: string;
  title: string;
  accentColor: string;
  outcomeLabel: string;
  summaryText: string;
}

// ============================================================================
// 1. SIDE-QUEST & SEASONAL ARCHIVE SUMMARIES (FOR STORY CHRONICLE MODAL)
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
// 3.5 SEASONAL LIMITED EVENTS (8 EVENTS: 2 PER SEASON — SPRING / SUMMER / AUTUMN / WINTER)
// ============================================================================

interface SeasonalEventMeta {
  id: string;
  flagKey: string;
  season: SeasonId;
  seasonLabel: string;
  title: string;
  accentColor: string;
  outcomes: Record<string, { label: string; summary: string }>;
}

const SEASONAL_EVENT_CATALOG: SeasonalEventMeta[] = [
  {
    id: 'season_spring_sakura_tea',
    flagKey: 'season_ev_spring_1',
    season: 'SPRING',
    seasonLabel: '春季',
    title: '春日樱影 · 码头花朝游船客',
    accentColor: '#F9A8D4',
    outcomes: {
      tea_feast: {
        label: '樱茶鲜蛤宴',
        summary: '以现泡樱花乌龙与春蛤鲜盘款待花朝游船团，满堂春意大受赞誉。',
      },
      cruise_deal: {
        label: '花朝游船联票',
        summary: '与港湾游船社签下春季赏鲜联票分成协议，为小店带来源源不断的观光客流。',
      },
      photo_spot: {
        label: '樱檐留影角',
        summary: '在店门樱花灯檐下搭起留影打卡角并赠春笋试吃，成了老街最火春日背景墙。',
      },
    },
  },
  {
    id: 'season_spring_first_catch',
    flagKey: 'season_ev_spring_2',
    season: 'SPRING',
    seasonLabel: '春季',
    title: '开春第一网 · 春汛活鲜直抵',
    accentColor: '#6EE7B7',
    outcomes: {
      premium_buy: {
        label: '包圆头茬春鲜',
        summary: '果断收下开春第一网小管鱿与活皮皮虾，鲜甜嫩滑的口感惊艳全厅食客。',
      },
      contract: {
        label: '春汛平价包船',
        summary: '与年轻渔民敲定整个春季的直采包船协议，稳住了活鲜供货与利润率。',
      },
      share_alley: {
        label: '邻里分鲜共富',
        summary: '留半数上台并帮渔民把余货分销给老街坊摊位，整条码头街都记着你的仗义。',
      },
    },
  },
  {
    id: 'season_summer_heatwave_ice',
    flagKey: 'season_ev_summer_1',
    season: 'SUMMER',
    seasonLabel: '夏季',
    title: '酷夏热浪 · 冰台保鲜与解暑凉茶',
    accentColor: '#38BDF8',
    outcomes: {
      herbal_cool: {
        label: '草粿凉茶解暑',
        summary: '在酷暑午市免费奉上冰镇草粿与荷叶冬瓜茶并加铺碎冰，食客直呼贴心至极。',
      },
      beer_promo: {
        label: '冰爽精酿套餐',
        summary: '顺势推出精酿冰啤配现捞活鲜的酷夏特惠，晚市翻台与客单双双飙升。',
      },
      micro_rotate: {
        label: '小盘高频锁鲜',
        summary: '改用小盘高频现切补货严守冷链温度，在烈日高温下仍守住零异味口碑。',
      },
    },
  },
  {
    id: 'season_summer_moratorium',
    flagKey: 'season_ev_summer_2',
    season: 'SUMMER',
    seasonLabel: '夏季',
    title: '伏季休渔 · 近海货紧突围',
    accentColor: '#F59E0B',
    outcomes: {
      deepsea_aqua: {
        label: '深海网箱直供',
        summary: '紧急调配合规深海生态网箱活鲜与冷库备货，休渔期依旧维持顶级鲜度。',
      },
      hotdish_pivot: {
        label: '热卤烤贝突围',
        summary: '灵活主推蒜蓉烤生蚝与秘制热卤熟食，巧避原料暴涨并收获亮眼盈利。',
      },
      ocean_pledge: {
        label: '护海科普之夜',
        summary: '联合老渔户举办休渔护海主题夜并赠送回头券，赢得满堂敬意与街坊力挺。',
      },
    },
  },
  {
    id: 'season_autumn_crab_feast',
    flagKey: 'season_ev_autumn_1',
    season: 'AUTUMN',
    seasonLabel: '秋季',
    title: '秋风起蟹脚痒 · 膏蟹品鉴挑战',
    accentColor: '#FB923C',
    outcomes: {
      live_showcase: {
        label: '活缸现捞盲品',
        summary: '当众从活氧缸现捞肥膏蟹上锅盲品，满膏流油的鲜美彻底折服美食俱乐部。',
      },
      crab_vip: {
        label: '金秋蟹皇尊席',
        summary: '趁势推出金秋蟹皇尊享席位，单晚便吸引城中老饕豪掷重金预订。',
      },
      ginger_tea: {
        label: '古法姜醋驱寒',
        summary: '免费为全厅配齐现熬姜醋与桂圆茶中和蟹寒，细致温情收获全网好评。',
      },
    },
  },
  {
    id: 'season_autumn_lantern_gala',
    flagKey: 'season_ev_autumn_2',
    season: 'AUTUMN',
    seasonLabel: '秋季',
    title: '金秋港湾灯会 · 团圆夜宵长龙',
    accentColor: '#FBBF24',
    outcomes: {
      osmanthus_gift: {
        label: '桂花圆子赠团圆',
        summary: '灯会之夜每桌加赠手作桂花酒酿圆子，欢声笑语伴着秋风飘满整个港湾。',
      },
      lantern_sponsor: {
        label: '冠名码头花灯',
        summary: '出资冠名港湾灯会主牌楼，“潮鲜沸鼎”红灯金匾一夜映入全城眼帘。',
      },
      autumn_broth: {
        label: '秋梨菌菇润燥锅',
        summary: '现熬秋梨鲜菌润燥金汤应节上桌，清甜解腻成为灯会夜最抢手的招牌锅底。',
      },
    },
  },
  {
    id: 'season_winter_blizzard_hearth',
    flagKey: 'season_ev_winter_1',
    season: 'WINTER',
    seasonLabel: '冬季',
    title: '寒潮围炉 · 风雪夜归人',
    accentColor: '#93C5FD',
    outcomes: {
      ginger_hearth: {
        label: '门廊免费姜枣汤',
        summary: '风雪夜在门廊支起滚烫红糖姜枣汤桶，暖透了候位食客与夜归路人的心。',
      },
      winter_tonic: {
        label: '冬令花胶滋补锅',
        summary: '现开慢熬花胶牛骨老汤迎战寒潮，一口暖胃鲜汤让食客甘愿冒雪排队。',
      },
      inn_bundle: {
        label: '海景旅馆围炉票',
        summary: '与周边海景旅馆联名推出风雪围炉套票，寒冬淡季反而迎来爆满收益。',
      },
    },
  },
  {
    id: 'season_winter_yearend_banquet',
    flagKey: 'season_ev_winter_2',
    season: 'WINTER',
    seasonLabel: '冬季',
    title: '岁末尾牙 · 港城商帮压轴宴',
    accentColor: '#E8C97A',
    outcomes: {
      grand_feast: {
        label: '全员冲刺尾牙大单',
        summary: '咬牙接下港城商帮整场尾牙宴，靠默契配合一举创下岁末单日营收新高！',
      },
      curated_table: {
        label: '精品品鉴尾牙席',
        summary: '坚持以质取胜仅接精品品鉴席，每一道活鲜火候精准，赢得商帮大佬盛赞。',
      },
      dock_warmth: {
        label: '余汤暖赠守夜工',
        summary: '承接平价家宴并将余下滚沸鲜汤分送码头守夜工人，岁末善举传为全城美谈。',
      },
    },
  },
];

export function getDiscoveredSeasonalEventSummaries(world: GameWorld): SeasonalEventSummaryItem[] {
  const f = world.storyFlags;
  const list: SeasonalEventSummaryItem[] = [];
  for (const meta of SEASONAL_EVENT_CATALOG) {
    const val = f[meta.flagKey];
    if (!val) continue;
    const outcome = meta.outcomes[val] ?? {
      label: '已完成',
      summary: '这段应季海港见闻已收入店长纪略。',
    };
    list.push({
      id: meta.id,
      season: meta.season,
      seasonLabel: meta.seasonLabel,
      title: meta.title,
      accentColor: meta.accentColor,
      outcomeLabel: outcome.label,
      summaryText: outcome.summary,
    });
  }
  return list;
}

function buildSeasonalEvent(id: string, mgrName: string): StoryModalEvent {
  switch (id) {
    case 'season_spring_sakura_tea':
      return {
        id: nextIncidentUid('season_sp1'),
        category: 'INCIDENT',
        badge: '春季限定事件 · 花朝海港',
        speakerName: '花朝游船领队·苏晴',
        speakerTitle: '港湾赏樱观光团',
        accentColor: '#F9A8D4',
        headline: '春日樱影 · 码头花朝游船客',
        body: '窗外樱瓣随春风漫天飘落，一艘花朝赏樱游船刚在码头靠岸，二十余名兴致勃勃的观光客涌到店门前。',
        lines: [
          {
            speaker: '花朝游船领队·苏晴',
            title: '港湾赏樱观光团',
            text: `“${mgrName}店长您好！码头上的樱花开得正好，团里客人都被你们门口的鲜汤香味吸引过来了，想问问有没有应季的春日待客活动？”`,
            accentColor: '#F9A8D4',
            portraitSide: 'right',
          },
          {
            speaker: mgrName,
            title: '潮鲜沸鼎店长',
            text: '“春风送客上门，这可是换季打响招牌的好机会！是现沏樱茶配春蛤做口碑，还是顺势和游船社签下联票合作？”',
            accentColor: '#E8C97A',
            portraitSide: 'left',
          },
        ],
        choices: [
          {
            id: 'season_sp_sakura_tea',
            label: '现泡樱花乌龙茶并加推现灼春蛤鲜盘招待全团',
            hint: '花费 ¥55 · 口碑 +6 · 在座客满意 +12 · 匠心/烟火各 +1',
            cashDelta: -55,
            reputationDelta: 6,
            philosophyDelta: { CRAFT: 1, WARMTH: 1 },
            storyFlag: { key: 'season_ev_spring_1', value: 'tea_feast' },
            outcomeText: '樱花茶香混着现灼春蛤的清甜令人陶醉，游船客纷纷拍图转发，口碑 +6！',
          },
          {
            id: 'season_sp_sakura_ticket',
            label: '与游船社当场签下「花朝赏鲜联票」合作分成',
            hint: '立刻到账合作定金 +¥180 · 口碑 +3 · 商道 +2',
            cashDelta: 180,
            reputationDelta: 3,
            philosophyDelta: { EMPIRE: 2 },
            storyFlag: { key: 'season_ev_spring_1', value: 'cruise_deal' },
            outcomeText: '双方一拍即合签下春季游船联票协议，定金 +¥180 立刻入账！',
          },
          {
            id: 'season_sp_sakura_photo',
            label: '在樱花红灯檐下布置免费留影角，顺带赠春笋试吃',
            hint: '花费 ¥20 · 口碑 +4 · 卫生 +3 · 烟火 +2',
            cashDelta: -20,
            reputationDelta: 4,
            philosophyDelta: { WARMTH: 2 },
            storyFlag: { key: 'season_ev_spring_1', value: 'photo_spot' },
            outcomeText: '游客们在檐下樱影前排起队拍照，老街春色与热锅烟火瞬间刷屏本地圈！',
          },
        ],
      };

    case 'season_spring_first_catch':
      return {
        id: nextIncidentUid('season_sp2'),
        category: 'INCIDENT',
        badge: '春季限定事件 · 开春春汛',
        speakerName: '渔家小伙·阿浪',
        speakerTitle: '码头早船渔民',
        accentColor: '#6EE7B7',
        headline: '开春第一网 · 春汛活鲜直抵',
        body: '春潮涨起，年轻渔民阿浪挑着两筐晶莹剔透的春汛小管鱿与活蹦乱跳的皮皮虾快步来到后门。',
        lines: [
          {
            speaker: '渔家小伙·阿浪',
            title: '码头早船渔民',
            text: '“店长！刚靠岸的开春第一网，个个还带着海水咸鲜味儿呢！大批发商还没赶到码头，我想先问问您要不要？”',
            accentColor: '#6EE7B7',
            portraitSide: 'right',
          },
          {
            speaker: mgrName,
            title: '潮鲜沸鼎店长',
            text: '“好精神的春汛活货！这批鲜度千金难求，怎么收这批开春头茬鲜最划算？”',
            accentColor: '#E8C97A',
            portraitSide: 'left',
          },
        ],
        choices: [
          {
            id: 'season_sp_catch_all',
            label: '溢价包圆全部头茬活鲜，立刻补满冷库、供氧与前厅冰台',
            hint: '花费 ¥110 · 原料 +18 · 冰台前两槽补满 · 供氧回满 · 口碑 +5',
            cashDelta: -110,
            reputationDelta: 5,
            philosophyDelta: { CRAFT: 2 },
            storyFlag: { key: 'season_ev_spring_2', value: 'premium_buy' },
            outcomeText: '活鲜刚摆上冰台便引来满堂惊呼，食客们赞不绝口，口碑 +5！',
          },
          {
            id: 'season_sp_catch_bargain',
            label: '以实在价签下春季包船直供协议，先收一批稳住成本',
            hint: '花费 ¥65 · 原料 +12 · 口碑 +2 · 商道 +2',
            cashDelta: -65,
            reputationDelta: 2,
            philosophyDelta: { EMPIRE: 2 },
            storyFlag: { key: 'season_ev_spring_2', value: 'contract' },
            outcomeText: '阿浪爽快签下春季直供单，冷库一下充实了 12 份鲜货！',
          },
          {
            id: 'season_sp_catch_share',
            label: '留一半给自家后厨，另一半热心帮他分销给街坊老摊',
            hint: '花费 ¥30 · 原料 +8 · 口碑 +5 · 全员士气 +10 · 烟火 +2',
            cashDelta: -30,
            reputationDelta: 5,
            philosophyDelta: { WARMTH: 2 },
            storyFlag: { key: 'season_ev_spring_2', value: 'share_alley' },
            outcomeText: '整条街的商户都夸你厚道，阿浪感动不已，伙计们干活也更有劲了！',
          },
        ],
      };

    case 'season_summer_heatwave_ice':
      return {
        id: nextIncidentUid('season_su1'),
        category: 'INCIDENT',
        badge: '夏季限定事件 · 酷暑热浪',
        speakerName: '大堂值班伙计',
        speakerTitle: '前厅急报',
        accentColor: '#38BDF8',
        headline: '酷夏热浪 · 冰台保鲜与解暑凉茶',
        body: '盛夏午后热浪翻涌，门外空气热得微微扭曲，进店避暑的食客个个汗流浃背，海鲜冰台的冷气负荷也在飙升！',
        lines: [
          {
            speaker: '大堂值班伙计',
            title: '前厅急报',
            text: '“店长，外头气温破三十八度啦！刚进门的客人都喊热，冰台边缘碎冰融得比平时快了一倍，咱们怎么应对？”',
            accentColor: '#38BDF8',
            portraitSide: 'right',
          },
          {
            speaker: mgrName,
            title: '潮鲜沸鼎店长',
            text: '“酷夏吃海鲜火锅，拼的就是冰火两重天的痛快！必须马上拿出消暑保鲜的绝招。”',
            accentColor: '#E8C97A',
            portraitSide: 'left',
          },
        ],
        choices: [
          {
            id: 'season_su_heat_herbal',
            label: '现煮冰镇潮汕草粿与冬瓜荷叶茶免费解暑，并加铺厚层碎冰',
            hint: '花费 ¥50 · 口碑 +6 · 卫生 +5 · 全场客满意 +14 · 烟火 +2',
            cashDelta: -50,
            reputationDelta: 6,
            philosophyDelta: { WARMTH: 2 },
            storyFlag: { key: 'season_ev_summer_1', value: 'herbal_cool' },
            outcomeText: '一杯冰爽凉茶下肚，满堂暑气顿消，食客纷纷点赞这份酷夏温柔！',
          },
          {
            id: 'season_su_heat_beer',
            label: '趁势推出「酷夏精酿配活鲜」冰爽宵夜套餐拉高创收',
            hint: '增收 +¥210 · 口碑 +3 · 设备健康 -5 · 商道 +2',
            cashDelta: 210,
            reputationDelta: 3,
            philosophyDelta: { EMPIRE: 2 },
            storyFlag: { key: 'season_ev_summer_1', value: 'beer_promo' },
            outcomeText: '冰啤碰杯声响彻大厅，单晚创收 +¥210！不过制冷机略微超负荷，记得抽空保养。',
          },
          {
            id: 'season_su_heat_rotate',
            label: '改为小盘高频现切现补，同时热厨加出清爽冷拌菜',
            hint: '花费 ¥25 · 卫生 +6 · 熟食 +3 · 口碑 +5 · 匠心 +2',
            cashDelta: -25,
            reputationDelta: 5,
            philosophyDelta: { CRAFT: 2 },
            storyFlag: { key: 'season_ev_summer_1', value: 'micro_rotate' },
            outcomeText: '每盘海鲜都保持最佳冷鲜脆嫩口感，酷暑高温下口碑不降反升！',
          },
        ],
      };

    case 'season_summer_moratorium':
      return {
        id: nextIncidentUid('season_su2'),
        category: 'INCIDENT',
        badge: '夏季限定事件 · 伏季休渔',
        speakerName: '冷链调度员·老吴',
        speakerTitle: '港城渔市线人',
        accentColor: '#F59E0B',
        headline: '伏季休渔 · 近海货紧突围',
        body: '盛夏进入伏季休渔高峰，近海捕捞暂停，批发市场的活鲜行情一夜普涨，不少同行已悄悄缩减海鲜种类。',
        lines: [
          {
            speaker: '冷链调度员·老吴',
            title: '港城渔市线人',
            text: `“${mgrName}店长，休渔期近海活鲜紧俏得很，外面好几家店都悄悄换冻货撑场面了。你这边准备怎么稳住夏市？”`,
            accentColor: '#F59E0B',
            portraitSide: 'right',
          },
          {
            speaker: mgrName,
            title: '潮鲜沸鼎店长',
            text: '“休渔是为了大海生生不息，咱们绝不能偷工减料。办法总比困难多！”',
            accentColor: '#E8C97A',
            portraitSide: 'left',
          },
        ],
        choices: [
          {
            id: 'season_su_mora_deepsea',
            label: '高价调配合规深海生态网箱活鲜，绝不降低半分鲜度标准',
            hint: '花费 ¥95 · 原料 +16 · 供氧回满 · 口碑 +6 · 匠心 +2',
            cashDelta: -95,
            reputationDelta: 6,
            philosophyDelta: { CRAFT: 2 },
            storyFlag: { key: 'season_ev_summer_2', value: 'deepsea_aqua' },
            outcomeText: '深海生态网箱活鲜及时入缸，休渔期还能吃到活蹦乱跳的好货，全城食客慕名而来！',
          },
          {
            id: 'season_su_mora_hotdish',
            label: '趁机主推蒜蓉烤生蚝与招牌热卤熟食，巧避原料涨价峰谷',
            hint: '增收 +¥140 · 熟食补满 · 口碑 +3 · 商道 +2',
            cashDelta: 140,
            reputationDelta: 3,
            philosophyDelta: { EMPIRE: 2 },
            storyFlag: { key: 'season_ev_summer_2', value: 'hotdish_pivot' },
            outcomeText: '香飘十里的热卤与蒜蓉烤贝成了盛夏爆款，既避开了涨价潮又多赚 ¥140！',
          },
          {
            id: 'season_su_mora_union',
            label: '联合老渔户办「休渔护海科普夜」，并给老客送开海季优先券',
            hint: '花费 ¥40 · 口碑 +6 · 全员士气 +12 · 烟火 +2',
            cashDelta: -40,
            reputationDelta: 6,
            philosophyDelta: { WARMTH: 2 },
            storyFlag: { key: 'season_ev_summer_2', value: 'ocean_pledge' },
            outcomeText: '食客们为你的海洋环保格局热烈鼓掌，开海季还没到，预约名单已排满三页！',
          },
        ],
      };

    case 'season_autumn_crab_feast':
      return {
        id: nextIncidentUid('season_au1'),
        category: 'INCIDENT',
        badge: '秋季限定事件 · 金秋蟹季',
        speakerName: '金秋饕客会会长',
        speakerTitle: '港城品蟹名家',
        accentColor: '#FB923C',
        headline: '秋风起蟹脚痒 · 膏蟹品鉴挑战',
        body: '秋风吹落檐前红枫，正是膏满黄肥的黄金蟹季。港城饕客会一行人慕名而来，点名要当场检验你家活鲜品质！',
        lines: [
          {
            speaker: '金秋饕客会会长',
            title: '港城品蟹名家',
            text: `“秋风起，蟹脚痒！听闻${mgrName}店长的海鲜池养功一绝，我们品蟹会今晚专程登门，不知店长敢不敢亮出压箱底的秋蟹绝活？”`,
            accentColor: '#FB923C',
            portraitSide: 'right',
          },
          {
            speaker: mgrName,
            title: '潮鲜沸鼎店长',
            text: '“既逢金秋丰获季，哪有怯场的道理！就让诸位见识见识什么叫真正的顶盖肥鲜。”',
            accentColor: '#E8C97A',
            portraitSide: 'left',
          },
        ],
        choices: [
          {
            id: 'season_au_crab_live',
            label: '当众从活氧缸现捞肥膏蟹现蒸盲品，以真功夫镇场',
            hint: '花费 ¥75 · 口碑 +7 · 供氧回满 · 全场客满意 +15 · 匠心 +2',
            cashDelta: -75,
            reputationDelta: 7,
            philosophyDelta: { CRAFT: 2 },
            storyFlag: { key: 'season_ev_autumn_1', value: 'live_showcase' },
            outcomeText: '掀盖瞬间金黄蟹膏满溢鲜香，会长连赞三声“绝品”，金秋口碑一飞冲天！',
          },
          {
            id: 'season_au_crab_vip',
            label: '顺势为饕客会加开「金秋蟹皇尊享席」高客单包桌',
            hint: '立刻增收 +¥260 · 口碑 +4 · 商道 +2',
            cashDelta: 260,
            reputationDelta: 4,
            philosophyDelta: { EMPIRE: 2 },
            storyFlag: { key: 'season_ev_autumn_1', value: 'crab_vip' },
            outcomeText: '一桌金秋蟹皇席气派非凡，老饕们爽快结账还留了丰厚赏钱，净增 +¥260！',
          },
          {
            id: 'season_au_crab_ginger',
            label: '为全厅宾客免费配齐古法紫苏姜醋与热桂圆茶驱蟹寒',
            hint: '花费 ¥30 · 口碑 +5 · 卫生 +4 · 全场客满意 +12 · 烟火 +2',
            cashDelta: -30,
            reputationDelta: 5,
            philosophyDelta: { WARMTH: 2 },
            storyFlag: { key: 'season_ev_autumn_1', value: 'ginger_tea' },
            outcomeText: '暖胃的姜茶与紫苏醋赢得满堂喝彩，品蟹会成员称赞你“既懂海味，更懂人心”。',
          },
        ],
      };

    case 'season_autumn_lantern_gala':
      return {
        id: nextIncidentUid('season_au2'),
        category: 'INCIDENT',
        badge: '秋季限定事件 · 港湾灯会',
        speakerName: '灯会街坊会大姐',
        speakerTitle: '港湾中秋灯会筹委',
        accentColor: '#FBBF24',
        headline: '金秋港湾灯会 · 团圆夜宵长龙',
        body: '秋夜华灯初上，港湾游灯队伍浩浩荡荡经过门前，携老带幼的赏灯家庭在红灯笼下排起了暖洋洋的长龙。',
        lines: [
          {
            speaker: '灯会街坊会大姐',
            title: '港湾中秋灯会筹委',
            text: `“${mgrName}老板！今晚港湾灯会游人如织，好多一家老小看完花灯都奔着你家热火锅来了，筹委会也想问问要不要一起添点彩头？”`,
            accentColor: '#FBBF24',
            portraitSide: 'right',
          },
          {
            speaker: mgrName,
            title: '潮鲜沸鼎店长',
            text: '“明月照港湾，灯火映热锅，一年难得这样团圆热闹的秋夜！”',
            accentColor: '#E8C97A',
            portraitSide: 'left',
          },
        ],
        choices: [
          {
            id: 'season_au_gala_osmanthus',
            label: '每桌免费加赠手作桂花酒酿圆子，共庆灯火团圆夜',
            hint: '花费 ¥45 · 口碑 +6 · 全场客满意 +16 · 全员士气 +10 · 烟火 +2',
            cashDelta: -45,
            reputationDelta: 6,
            philosophyDelta: { WARMTH: 2 },
            storyFlag: { key: 'season_ev_autumn_2', value: 'osmanthus_gift' },
            outcomeText: '桂花甜香飘满厅堂，老少食客笑逐颜开，这一夜的团圆暖意久久不散！',
          },
          {
            id: 'season_au_gala_sponsor',
            label: '出资冠名码头灯会主牌楼，把「潮鲜沸鼎」挂上最高花灯',
            hint: '花费 ¥90 · 口碑 +8 · 商道 +2',
            cashDelta: -90,
            reputationDelta: 8,
            philosophyDelta: { EMPIRE: 2 },
            storyFlag: { key: 'season_ev_autumn_2', value: 'lantern_sponsor' },
            outcomeText: '整片港湾抬头皆见“潮鲜沸鼎”璀璨金匾，次日未开店门口便已排满慕名新客！',
          },
          {
            id: 'season_au_gala_broth',
            label: '现熬秋梨鲜菌润燥金汤与热厨应节小菜，以味惊艳灯会夜',
            hint: '花费 ¥35 · 口碑 +5 · 熟食补满 · 原料 +8 · 匠心 +2',
            cashDelta: -35,
            reputationDelta: 5,
            philosophyDelta: { CRAFT: 2 },
            storyFlag: { key: 'season_ev_autumn_2', value: 'autumn_broth' },
            outcomeText: '清润甘甜的秋梨菌汤成了灯会夜最大惊喜，老饕们连喝三碗仍意犹未尽！',
          },
        ],
      };

    case 'season_winter_blizzard_hearth':
      return {
        id: nextIncidentUid('season_wi1'),
        category: 'INCIDENT',
        badge: '冬季限定事件 · 寒潮飞雪',
        speakerName: '冒雪赶来的食客',
        speakerTitle: '港湾夜归人',
        accentColor: '#93C5FD',
        headline: '寒潮围炉 · 风雪夜归人',
        body: '强冷空气突袭港城，细密雪花扑簌簌落满青石屋檐与门廊，推门而入的食客肩头挂着白霜，直搓着冻红的双手。',
        lines: [
          {
            speaker: '冒雪赶来的食客',
            title: '港湾夜归人',
            text: '“嘶……好大的寒潮风雪！远远看见你们家这排红灯笼和窗里冒着的热气，就像看见救星一样，快冻僵啦！”',
            accentColor: '#93C5FD',
            portraitSide: 'right',
          },
          {
            speaker: mgrName,
            title: '潮鲜沸鼎店长',
            text: '“风雪越紧，这口滚沸汤鼎就越要暖透人心！赶紧安排热饮和冬令硬菜上阵。”',
            accentColor: '#E8C97A',
            portraitSide: 'left',
          },
        ],
        choices: [
          {
            id: 'season_wi_snow_ginger',
            label: '在门廊支起滚烫红糖姜枣汤桶，免费给候位客与路人暖手',
            hint: '花费 ¥35 · 口碑 +7 · 全场客满意 +15 · 全员士气 +12 · 烟火 +2',
            cashDelta: -35,
            reputationDelta: 7,
            philosophyDelta: { WARMTH: 2 },
            storyFlag: { key: 'season_ev_winter_1', value: 'ginger_hearth' },
            outcomeText: '风雪夜一碗免费热姜汤感动了无数路人，有人拍下照片配文“港城最暖的灯火”，口碑 +7！',
          },
          {
            id: 'season_wi_snow_stew',
            label: '现开冬令滋补花胶牛骨老汤，主打慢熬浓鲜暖身锅',
            hint: '花费 ¥70 · 口碑 +6 · 熟食补满 · 原料 +10 · 匠心 +2',
            cashDelta: -70,
            reputationDelta: 6,
            philosophyDelta: { CRAFT: 2 },
            storyFlag: { key: 'season_ev_winter_1', value: 'winter_tonic' },
            outcomeText: '浓白醇厚的花胶老汤瞬间驱散全身寒气，满堂宾客吃得额头冒汗、连呼过瘾！',
          },
          {
            id: 'season_wi_snow_inn',
            label: '与周边海景旅馆火速联名，推出「风雪围炉暖冬套票」',
            hint: '立刻增收 +¥240 · 口碑 +4 · 商道 +2',
            cashDelta: 240,
            reputationDelta: 4,
            philosophyDelta: { EMPIRE: 2 },
            storyFlag: { key: 'season_ev_winter_1', value: 'inn_bundle' },
            outcomeText: '被大雪困在旅馆的游客们结伴涌来围炉涮海鲜，寒潮夜反而创下超高流水 +¥240！',
          },
        ],
      };

    case 'season_winter_yearend_banquet':
    default:
      return {
        id: nextIncidentUid('season_wi2'),
        category: 'INCIDENT',
        badge: '冬季限定事件 · 岁末尾牙',
        speakerName: '港城商帮执事',
        speakerTitle: '岁末尾牙筹办人',
        accentColor: '#E8C97A',
        headline: '岁末尾牙 · 港城商帮压轴宴',
        body: '岁末年关将至，港城商帮原定的尾牙酒楼暖气突然故障，执事急匆匆踏雪而来，想请你紧急接下这场压轴尾牙大宴！',
        lines: [
          {
            speaker: '港城商帮执事',
            title: '岁末尾牙筹办人',
            text: `“${mgrName}店长救急！商帮几十号船东与掌柜今晚要吃尾牙团圆饭，全港城能临时稳住这阵仗的海鲜沸锅馆，我只信得过您这一家！”`,
            accentColor: '#E8C97A',
            portraitSide: 'right',
          },
          {
            speaker: mgrName,
            title: '潮鲜沸鼎店长',
            text: '“岁末尾牙是港城人一年到头最看重的聚餐。是全员冲刺接下整场大单，还是精选接待守住火候，抑或顺带温暖守夜的码头兄弟？”',
            accentColor: '#E8C97A',
            portraitSide: 'left',
          },
        ],
        choices: [
          {
            id: 'season_wi_banq_grand',
            label: '全员咬牙齐心接下整场商帮尾牙包场，冲击岁末最大一单！',
            hint: '巨额回款 +¥340 · 口碑 +5 · 设备健康 -8 · 员工略感疲惫 · 商道 +2',
            cashDelta: 340,
            reputationDelta: 5,
            philosophyDelta: { EMPIRE: 2 },
            storyFlag: { key: 'season_ev_winter_2', value: 'grand_feast' },
            outcomeText: '满厅推杯换盏直到深夜，商帮掌柜们痛快结清 ¥340 大单并夸你调度如神！',
          },
          {
            id: 'season_wi_banq_craft',
            label: '量力而行只接核心精品品鉴席，确保每一口活鲜火候零失误',
            hint: '增收 +¥180 · 口碑 +7 · 卫生 +5 · 匠心 +2',
            cashDelta: 180,
            reputationDelta: 7,
            philosophyDelta: { CRAFT: 2 },
            storyFlag: { key: 'season_ev_winter_2', value: 'curated_table' },
            outcomeText: '不贪多只求精的克制反而赢得商帮大佬极高敬意，当场预订了来年的开春头宴！',
          },
          {
            id: 'season_wi_banq_dock',
            label: '平价承接尾牙家宴，并将余下滚沸鲜汤与热食打包送给守夜码头工',
            hint: '增收 +¥90 · 口碑 +8 · 全员士气回满 · 烟火 +2',
            cashDelta: 90,
            reputationDelta: 8,
            philosophyDelta: { WARMTH: 2 },
            storyFlag: { key: 'season_ev_winter_2', value: 'dock_warmth' },
            outcomeText: '雪夜码头上升起阵阵热汤白雾，全城都传颂起“潮鲜沸鼎”的岁末义举，口碑 +8！',
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

  // Priority 2.5: Seasonal Limited Events matching current world.season!
  // Guaranteed on Day 4-5 of a season if untriggered, and high priority (72%) earlier in the season.
  const untriggeredSeasonal = SEASONAL_EVENT_CATALOG.filter(
    (ev) => ev.season === world.season && !f[ev.flagKey]
  );
  if (untriggeredSeasonal.length > 0) {
    const seasonalChance = world.dayInSeason >= 4 ? 1.0 : 0.72;
    if (Math.random() < seasonalChance) {
      const chosenSeasonal =
        untriggeredSeasonal[Math.floor(Math.random() * untriggeredSeasonal.length)];
      world.recentIncidentIds.push(chosenSeasonal.id);
      if (world.recentIncidentIds.length > 8) {
        world.recentIncidentIds = world.recentIncidentIds.slice(-8);
      }
      return buildSeasonalEvent(chosenSeasonal.id, mgrName);
    }
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

  if (startableSides.length > 0 && Math.random() < 0.65) {
    const picked = startableSides[Math.floor(Math.random() * startableSides.length)];
    return picked();
  }

  // Priority 4: Non-repeating standalone operational incident (plus occasional seasonal revisit in Year 2+)
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

    // --- Seasonal Event Choice Effects ---
    case 'season_sp_sakura_tea':
      world.tables.forEach((t) => {
        if (t.customer) t.customer.satisfaction = Math.min(100, t.customer.satisfaction + 12);
      });
      break;
    case 'season_sp_sakura_photo':
      world.hygiene = Math.min(100, world.hygiene + 3);
      break;
    case 'season_sp_catch_all':
      world.rawIngredients = Math.min(world.rawIngredientsMax, world.rawIngredients + 18);
      world.oxygenLevel = 100;
      world.buffetSlots.slice(0, 2).forEach((s) => {
        s.stock = s.maxStock;
      });
      break;
    case 'season_sp_catch_bargain':
      world.rawIngredients = Math.min(world.rawIngredientsMax, world.rawIngredients + 12);
      break;
    case 'season_sp_catch_share':
      world.rawIngredients = Math.min(world.rawIngredientsMax, world.rawIngredients + 8);
      world.staff.forEach((s) => {
        s.morale = Math.min(100, s.morale + 10);
      });
      break;
    case 'season_su_heat_herbal':
      world.hygiene = Math.min(100, world.hygiene + 5);
      world.tables.forEach((t) => {
        if (t.customer) t.customer.satisfaction = Math.min(100, t.customer.satisfaction + 14);
      });
      break;
    case 'season_su_heat_beer':
      world.equipmentHealth = Math.max(10, world.equipmentHealth - 5);
      break;
    case 'season_su_heat_rotate':
      world.hygiene = Math.min(100, world.hygiene + 6);
      world.cookedStock = Math.min(world.cookedMaxStock, world.cookedStock + 3);
      break;
    case 'season_su_mora_deepsea':
      world.rawIngredients = Math.min(world.rawIngredientsMax, world.rawIngredients + 16);
      world.oxygenLevel = 100;
      break;
    case 'season_su_mora_hotdish':
      world.cookedStock = world.cookedMaxStock;
      break;
    case 'season_su_mora_union':
      world.staff.forEach((s) => {
        s.morale = Math.min(100, s.morale + 12);
      });
      break;
    case 'season_au_crab_live':
      world.oxygenLevel = 100;
      world.tables.forEach((t) => {
        if (t.customer) t.customer.satisfaction = Math.min(100, t.customer.satisfaction + 15);
      });
      break;
    case 'season_au_crab_ginger':
      world.hygiene = Math.min(100, world.hygiene + 4);
      world.tables.forEach((t) => {
        if (t.customer) t.customer.satisfaction = Math.min(100, t.customer.satisfaction + 12);
      });
      break;
    case 'season_au_gala_osmanthus':
      world.tables.forEach((t) => {
        if (t.customer) t.customer.satisfaction = Math.min(100, t.customer.satisfaction + 16);
      });
      world.staff.forEach((s) => {
        s.morale = Math.min(100, s.morale + 10);
      });
      break;
    case 'season_au_gala_broth':
      world.cookedStock = world.cookedMaxStock;
      world.rawIngredients = Math.min(world.rawIngredientsMax, world.rawIngredients + 8);
      break;
    case 'season_wi_snow_ginger':
      world.tables.forEach((t) => {
        if (t.customer) t.customer.satisfaction = Math.min(100, t.customer.satisfaction + 15);
      });
      world.staff.forEach((s) => {
        s.morale = Math.min(100, s.morale + 12);
      });
      break;
    case 'season_wi_snow_stew':
      world.cookedStock = world.cookedMaxStock;
      world.rawIngredients = Math.min(world.rawIngredientsMax, world.rawIngredients + 10);
      break;
    case 'season_wi_banq_grand':
      world.equipmentHealth = Math.max(10, world.equipmentHealth - 8);
      world.staff.forEach((s) => {
        s.fatigue = Math.min(100, s.fatigue + 8);
      });
      break;
    case 'season_wi_banq_craft':
      world.hygiene = Math.min(100, world.hygiene + 5);
      break;
    case 'season_wi_banq_dock':
      world.staff.forEach((s) => {
        s.morale = 100;
      });
      break;
  }
}
