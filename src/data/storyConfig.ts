import {
  CharacterId,
  DialogueLine,
  EndingEpilogueReport,
  FacilitySceneId,
  GameWorld,
  MainChapterDef,
  ManagerCharacterDef,
  SpecialCustomerId,
  SpecialStaffId,
  SpecialStoryDef,
  StaffCandidate,
  StaffRole,
  StoryChoiceOption,
  StoryModalEvent,
  StoryPhilosophy,
} from '../types/game';
import { getTechNodeDef } from './policyAndTechConfig';

import titleKeyartImg from '../assets/images/hotpot_title_keyart_1795580644561.jpg';
import portraitLinXiImg from '../assets/images/vn_portrait_lin_xi_1795709046807.jpg';
import portraitShenZhiweiImg from '../assets/images/portrait_shen_zhiwei_1795600827822.jpg';
import portraitSuXingyaoImg from '../assets/images/vn_portrait_su_xingyao_1795709048705.jpg';
import portraitElderChenImg from '../assets/images/portrait_elder_chen_1795600831785.jpg';
import portraitCriticEditorImg from '../assets/images/portrait_critic_editor_1795600833176.jpg';
import portraitHarborHeirImg from '../assets/images/vn_portrait_lin_chaosheng_1795709046048.jpg';
import portraitHotelDirectorImg from '../assets/images/vn_portrait_su_wanqing_1795709045889.jpg';
import portraitBrothArtisanImg from '../assets/images/vn_portrait_lu_tieguo_1795709048996.jpg';

export const TITLE_KEYART_URL = titleKeyartImg;

export const NPC_PORTRAIT_URLS = {
  lin_xi: portraitLinXiImg,
  shen_zhiwei: portraitShenZhiweiImg,
  su_xingyao: portraitSuXingyaoImg,
  elder_chen: portraitElderChenImg,
  critic_editor: portraitCriticEditorImg,
} as const;

export function resolveSpeakerPortrait(
  speakerName: string,
  characterId: CharacterId
): { url: string; side: 'left' | 'right'; isManager: boolean } {
  const mgr = getCharacterDef(characterId);
  const name = speakerName || '';
  if (
    name === mgr.name ||
    name.includes(mgr.name) ||
    name.includes('店长') ||
    name === '我'
  ) {
    return { url: mgr.portraitUrl, side: 'left', isManager: true };
  }
  if (name.includes('林汐')) {
    return { url: NPC_PORTRAIT_URLS.lin_xi, side: 'right', isManager: false };
  }
  if (name.includes('沈知微')) {
    return { url: NPC_PORTRAIT_URLS.shen_zhiwei, side: 'right', isManager: false };
  }
  if (name.includes('苏星遥') || name.includes('顾清欢') || name.includes('苏晚晴') || name.includes('千金')) {
    return { url: NPC_PORTRAIT_URLS.su_xingyao, side: 'right', isManager: false };
  }
  if (
    name.includes('陈伯') ||
    name.includes('周老灶') ||
    name.includes('渔业') ||
    name.includes('船老大') ||
    name.includes('船长') ||
    name.includes('阿海') ||
    name.includes('渔民') ||
    name.includes('老街坊')
  ) {
    return { url: NPC_PORTRAIT_URLS.elder_chen, side: 'right', isManager: false };
  }
  if (
    name.includes('沈墨白') ||
    name.includes('许清川') ||
    name.includes('记者') ||
    name.includes('主编') ||
    name.includes('自媒体') ||
    name.includes('日报') ||
    name.includes('程明镜') ||
    name.includes('食评') ||
    name.includes('督查') ||
    name.includes('检查组') ||
    name.includes('阿镜')
  ) {
    return { url: NPC_PORTRAIT_URLS.critic_editor, side: 'right', isManager: false };
  }
  return { url: NPC_PORTRAIT_URLS.elder_chen, side: 'right', isManager: false };
}

export const MANAGER_CHARACTERS: ManagerCharacterDef[] = [
  {
    id: 'harbor_heir',
    name: '林潮生',
    title: '渔港少东家',
    portraitUrl: portraitHarborHeirImg,
    accentColor: '#5CC8FF',
    backstory:
      '潮汕三代远洋渔船传人，带着一手码头直采冷链闯荡繁华都市，决心让老百姓吃上最鲜活的海鲜自助。',
    startingCash: 460,
    startingReputation: 78,
    perkSummary: '开局资金 ¥460 · 免费解锁「乳山生蚝扇贝」· 补货成本 -20% · 冰台容量 +1',
    bonuses: {
      ingredientDiscount: 0.2,
      buffetCapacityExtra: 1,
      patienceDecayReduction: 0,
      tipMultiplierBonus: 0.05,
      playerMoveSpeedMult: 1.0,
      playerWorkSpeedMult: 1.0,
      brothPriceMult: 1.0,
      dineSpeedBonus: 0,
      freeSeafoodId: 'oysters',
    },
  },
  {
    id: 'hotel_director',
    name: '苏婉清',
    title: '五星酒店前总监',
    portraitUrl: portraitHotelDirectorImg,
    accentColor: '#F2BE54',
    backstory:
      '曾执掌海景五星酒店餐饮部的金牌礼宾官，辞去高薪自立门户，以润物无声的极致服务俘获满城食客。',
    startingCash: 380,
    startingReputation: 86,
    perkSummary: '开局口碑 86 · 顾客耐心损耗 -20% · 全店小费 +25% · 开局自带 1 名迎宾员',
    bonuses: {
      ingredientDiscount: 0,
      buffetCapacityExtra: 0,
      patienceDecayReduction: 0.2,
      tipMultiplierBonus: 0.25,
      playerMoveSpeedMult: 1.05,
      playerWorkSpeedMult: 1.05,
      brothPriceMult: 1.0,
      dineSpeedBonus: 0,
      freeStarterHost: true,
    },
  },
  {
    id: 'broth_artisan',
    name: '陆铁锅',
    title: '川潮秘汤传人',
    portraitUrl: portraitBrothArtisanImg,
    accentColor: '#F67248',
    backstory:
      '游历巴蜀与闽粤的江湖奇厨，凭一口滚沸鲜香的秘制海鲜高汤走红夜市，亲力亲为效率惊人。',
    startingCash: 400,
    startingReputation: 78,
    perkSummary: '免费解锁「金汤花胶鸡锅」· 店长移速 +18% / 效率 +30% · 锅底费 +25% · 翻台 +15%',
    bonuses: {
      ingredientDiscount: 0,
      buffetCapacityExtra: 0,
      patienceDecayReduction: 0,
      tipMultiplierBonus: 0.08,
      playerMoveSpeedMult: 1.18,
      playerWorkSpeedMult: 1.3,
      brothPriceMult: 1.25,
      dineSpeedBonus: 0.15,
      freeBrothId: 'golden_maw',
    },
  },
];

export function getCharacterDef(id: CharacterId): ManagerCharacterDef {
  return MANAGER_CHARACTERS.find((c) => c.id === id) || MANAGER_CHARACTERS[0];
}

export const MAIN_CHAPTERS: MainChapterDef[] = [
  {
    chapter: 1,
    title: '第一章 · 烟火初开',
    subtitle: '立稳街角第一锅，点亮阶段一天赋起点',
    narrative:
      '新店剪彩伊始，街坊们大多仍在门外张望。亲自迎宾、守住厅堂卫生、接待头 8 桌客人，并在天赋发展树点亮阶段一的首个新节点。',
    completionNarrative:
      '第一批食客口口相传，小店每晚都飘出鲜香锅气与蒜蓉烤贝的焦香！关于小店未来的方向，第一个抉择已经摆在面前。',
    rewardCash: 320,
    rewardReputation: 5,
    rewardNote: '奖励 ¥320 · 口碑 +5 · 开启第一章剧情抉择',
  },
  {
    chapter: 2,
    title: '第二章 · 鲜锅立名',
    subtitle: '充实阶段一菜牌与产能，用口味锁住食客胃口',
    narrative:
      '想在港城站稳脚跟，光靠基础菜单远远不够。持续推进阶段一天赋节点（点亮 2 项）、累计接待 20 桌宾客并售出 50 份菜品，让老饕们记住你家鲜味。',
    completionNarrative:
      '热气腾腾的锅底配上鲜活海味，桌桌见底！一位嘴刁的港城老饕暗访了一整晚，终于在打烊前亮明了身份。',
    rewardCash: 480,
    rewardReputation: 5,
    rewardNote: '奖励 ¥480 · 口碑 +5 · 开启第二章剧情抉择',
  },
  {
    chapter: 3,
    title: '第三章 · 同舟招贤',
    subtitle: '迈入天赋树阶段二，招兵买马告别单打独斗',
    narrative:
      '晚市排号渐渐变长，一个人既要迎宾又要补菜洗碗已捉襟见肘。招募至少 2 名帮手、踏入天赋树阶段二点亮新节点，并将累计营收推上 ¥5,000。',
    completionNarrative:
      '伙计们配合渐入佳境，探店短视频也在同城悄然走红！资本与口碑的十字路口，正等着你亲手拍板。',
    rewardCash: 680,
    rewardReputation: 5,
    rewardNote: '奖励 ¥680 · 口碑 +5 · 开启第三章剧情抉择',
  },
  {
    chapter: 4,
    title: '第四章 · 后场定规',
    subtitle: '夯实阶段二经营体系，整肃后场明档与设施',
    narrative:
      '前厅红火，后场更容不得半点马虎。点亮 3 项阶段二及以上天赋、扩建至 4 处自助明档，将设备、供氧与洗手间均保持在 80% 以上，营收突破 ¥12,000。',
    completionNarrative:
      '明档分区井然有序，后场冷链与洗消一尘不染！面对同行暗中掀起的食安流言，你手握最硬的底气。',
    rewardCash: 920,
    rewardReputation: 6,
    rewardNote: '奖励 ¥920 · 口碑 +6 · 开启第四章剧情抉择',
  },
  {
    chapter: 5,
    title: '第五章 · 四季初潮',
    subtitle: '历经首轮换季浪潮，踏入天赋树阶段三',
    narrative:
      '港城海风一变，时令行情与客流偏好也随之更迭。跨越首轮换季（抵达第 6 天）、点亮阶段三天赋节点，将口碑推上 70 分并达成 ¥24,000 累计营收。',
    completionNarrative:
      '四季更迭间你稳扎稳打，面对休渔期涨价与气候突变毫不慌乱。港城渔业协会的峰会邀约，已悄悄递到了你案头。',
    rewardCash: 1280,
    rewardReputation: 6,
    rewardNote: '奖励 ¥1,280 · 口碑 +6 · 开启第五章剧情抉择',
  },
  {
    chapter: 6,
    title: '第六章 · 江湖奇遇',
    subtitle: '深化阶段三天赋，结交奇人异士并锻造骨干',
    narrative:
      '名气渐起后，码头各路奇人开始留意这块招牌。点亮 3 项阶段三及以上天赋、结识至少 2 位奇遇来客或特聘伙伴、培养 2 名 2 星骨干，并突破 ¥45,000 营收。',
    completionNarrative:
      '店里不再只是谋生之地，更成了各路高人愿停步小酌的江湖堂口。老码头夜市的商帮前辈，今夜专程登门拜会。',
    rewardCash: 1680,
    rewardReputation: 6,
    rewardNote: '奖励 ¥1,680 · 口碑 +6 · 开启第六章剧情抉择',
  },
  {
    chapter: 7,
    title: '第七章 · 百味明档',
    subtitle: '迈入阶段四御海尊享，打造琳琅海鲜矩阵',
    narrative:
      '真正的海鲜殿堂讲究丰盛与格调并存。跨入天赋树阶段四点亮首个节点，解锁 9 种海鲜熟食、开放 5 大自助明档分区，并将累计营收推升至 ¥78,000。',
    completionNarrative:
      '活捞缸波光粼粼，热厨与冷盘交相辉映，全城食客纷至沓来！就在此时，星级评鉴前的商战暗流也悄然逼近。',
    rewardCash: 2200,
    rewardReputation: 7,
    rewardNote: '奖励 ¥2,200 · 口碑 +7 · 开启第七章剧情抉择',
  },
  {
    chapter: 8,
    title: '第八章 · 商海竞逐',
    subtitle: '深耕阶段四高定体系，在高压客流下守住口碑',
    narrative:
      '连锁巨头与网红新馆接连落子港城。点亮 3 项阶段四及以上天赋、累计接待 140 桌宾客、突破 ¥125,000 总营收，并同时守住 80 分口碑与 82 分卫生标线。',
    completionNarrative:
      '面对价格战与跟风潮，你用实打实的出品节奏笑傲全城。年度港城美食峰会正式邀你登台，为行业定调。',
    rewardCash: 2800,
    rewardReputation: 7,
    rewardNote: '奖励 ¥2,800 · 口碑 +7 · 开启第八章剧情抉择',
  },
  {
    chapter: 9,
    title: '第九章 · 薪火传承',
    subtitle: '叩响阶段五沸鼎传奇，铸就黄金班底与汤鼎绝艺',
    narrative:
      '距离巅峰仅一步之遥！点亮阶段五天赋树首个节点，组建 6 人以上精锐班底（含 3 名 2 星骨干），累计售出 400 份菜品并达成 ¥175,000 总营收。',
    completionNarrative:
      '从青涩小馆到宾客盈门的海味殿堂，你的故事登上城市美食年鉴封面。距离最终的传奇终章，只差最后临门一脚。',
    rewardCash: 3600,
    rewardReputation: 8,
    rewardNote: '奖励 ¥3,600 · 口碑 +8 · 开启第九章剧情抉择',
  },
  {
    chapter: 10,
    title: '第十章 · 海上传奇',
    subtitle: '登顶阶段五双节点，书写港城不熄的时代终章',
    narrative:
      '集大成于一鼎，铸就海上传奇！在阶段五天赋树点亮至少 2 个节点，累计接待 220 桌宾客、总营收突破 ¥220,000 并守住 88 分金字口碑，迎接四维史诗终章！',
    completionNarrative:
      '从街角烟火小馆到名震四海的潮鲜殿堂，你用无数个滚沸的日夜与四季潮汐，彻底改写了这座港城的味觉记忆。',
    rewardCash: 5000,
    rewardReputation: 10,
    rewardNote: '终章奖励 ¥5,000 · 永久小费 +30% · 解锁四维多结局史诗终章',
  },
];

interface ChapterSceneScript {
  badge: string;
  headline: string;
  lines: (charName: string) => DialogueLine[];
  choices: StoryChoiceOption[];
}

export const MAIN_CHAPTER_SCRIPTS: Record<number, ChapterSceneScript> = {
  1: {
    badge: '主线演绎 · 第一章抉择',
    headline: '街角的第一盏红灯笼',
    lines: (charName) => [
      {
        speaker: '老街坊·陈伯',
        title: '首批回头客',
        text: `“${charName}店长，快擦擦汗！今晚最后那锅鲜菌汤底和蒜蓉粉丝蒸扇贝，可把隔壁老王一家香迷糊了！”`,
        accentColor: '#F59E0B',
        portraitSide: 'right',
      },
      {
        speaker: charName,
        title: '潮鲜沸鼎店长',
        text: '“陈伯过奖啦，刚开张头几天，最怕冰台鲜度不够或者热厨出菜慢。您吃得舒坦，这几晚熬夜备货就全值了。”',
        accentColor: '#E8C97A',
        portraitSide: 'left',
      },
      {
        speaker: '老街坊·陈伯',
        title: '首批回头客',
        text: '“不过我得给你透个风——刚才门外有位穿西装的商业街招商经理转悠了半天，说看中了你这自助火锅的势头，想拉你进大商场做标准化快餐复制呢！”',
        accentColor: '#F59E0B',
        portraitSide: 'right',
      },
      {
        speaker: charName,
        title: '潮鲜沸鼎店长',
        text: '“进驻大商场做快餐化……还是守着新鲜冷链把口碑做透，抑或留住这街角的深夜灯火？小店刚刚迈出第一步，接下来的方向得由我亲手定调。”',
        accentColor: '#E8C97A',
        portraitSide: 'left',
      },
    ],
    choices: [
      {
        id: 'ch1_craft',
        label: '“鲜味容不得妥协，先把每一批冷链与火候打磨到极致。”',
        hint: '匠心路线 +2 · 卫生 +6 · 原料库 +10',
        philosophyDelta: { CRAFT: 2 },
        storyFlag: { key: 'ch1', value: 'craft' },
        outcomeText: '你婉拒了快餐化方案，连夜在冷链库房写下“隔夜海鲜绝不上台”的店规。',
      },
      {
        id: 'ch1_empire',
        label: '“记下招商名片！好模式就该标准化，我要把招牌插满整座城。”',
        hint: '商业帝国 +2 · 启动资金 +¥180',
        philosophyDelta: { EMPIRE: 2 },
        cashDelta: 180,
        storyFlag: { key: 'ch1', value: 'empire' },
        outcomeText: '你与招商顾问互留联络，拿到了第一笔品牌合作试水补贴，目光已投向更广阔的商圈。',
      },
      {
        id: 'ch1_warmth',
        label: '“大商场太冷清，我想留一盏深夜红灯笼，让下班的人有口热汤喝。”',
        hint: '烟火温情 +2 · 口碑 +5',
        philosophyDelta: { WARMTH: 2 },
        reputationDelta: 5,
        storyFlag: { key: 'ch1', value: 'warmth' },
        outcomeText: '陈伯听罢大笑，隔天带着半条街的老邻舍来捧场，小店成了港湾最暖的深夜据点。',
      },
    ],
  },
  2: {
    badge: '主线演绎 · 第二章抉择',
    headline: '试锅夜的老饕暗访',
    lines: (charName) => [
      {
        speaker: '老饕·蔡叔',
        title: '港城味觉活字典',
        text: `“小老板，别忙着收灶！我连着三天来试你的新锅底和海鲜冰台，今晚总算敢开口评一句——你这口鲜味，有点老码头当年的魂了！”`,
        accentColor: '#F97316',
        portraitSide: 'right',
      },
      {
        speaker: charName,
        title: '潮鲜沸鼎店长',
        text: '“原来您就是食客们常提起的蔡叔！这几天我反复调配汤料比例，又扩充了新海鲜品类，就怕口重掩了鲜、口轻又没回甘。”',
        accentColor: '#E8C97A',
        portraitSide: 'left',
      },
      {
        speaker: '老饕·蔡叔',
        title: '港城味觉活字典',
        text: '“难得你肯花心思钻研菜单！我手里正好有张三十年前老港城渔市的秘制蘸料方子，还有几家本地吃货群的人脉——你说，你想拿这手艺先打哪张牌？”',
        accentColor: '#F97316',
        portraitSide: 'right',
      },
    ],
    choices: [
      {
        id: 'ch2_craft',
        label: '“请蔡叔赐教古法蘸料与熬汤心法，我想把底味磨成镇店绝学！”',
        hint: '匠心路线 +2 · 熟食补满 · 原料库 +10 · 口碑 +4',
        philosophyDelta: { CRAFT: 2 },
        reputationDelta: 4,
        storyFlag: { key: 'ch2', value: 'craft' },
        outcomeText: '蔡叔欣然手书古法沙茶与海鲜酱油秘方，满堂食客闻香称绝，回头率节节攀升。',
      },
      {
        id: 'ch2_empire',
        label: '“借吃货群口碑推出‘限时新菜品鉴卡’，趁势把客单价和翻台拉起来！”',
        hint: '商业帝国 +2 · 预售回款 +¥240 · 口碑 +2',
        philosophyDelta: { EMPIRE: 2 },
        cashDelta: 240,
        reputationDelta: 2,
        storyFlag: { key: 'ch2', value: 'empire' },
        outcomeText: '品鉴卡一经推出便在本地吃货圈售罄，新菜还没上架就先收回了一笔充裕现金流。',
      },
      {
        id: 'ch2_warmth',
        label: '“把秘方做成免费自选蘸料台，让老街坊花平民价也能尝到老港味。”',
        hint: '烟火温情 +2 · 口碑 +6 · 卫生 +4',
        philosophyDelta: { WARMTH: 2 },
        reputationDelta: 6,
        storyFlag: { key: 'ch2', value: 'warmth' },
        outcomeText: '免费古法蘸料台一夜传遍老街，蔡叔竖起大拇指：“有这格局，这招牌保准长青！”',
      },
    ],
  },
  3: {
    badge: '主线演绎 · 第三章抉择',
    headline: '爆红之后的十字路口',
    lines: (charName) => [
      {
        speaker: '本地美食自媒体',
        title: '探店达人·林编辑',
        text: `“${charName}老板，恭喜恭喜！我昨天发的那条冰台活虾配滚沸锅底的探店视频爆了，你们店直接冲上全城热门榜前三啦！”`,
        accentColor: '#38BDF8',
        portraitSide: 'right',
      },
      {
        speaker: charName,
        title: '潮鲜沸鼎店长',
        text: '“难怪今天还没到晚市，门口的排号队就已经拐到巷口了。幸好提前招齐了伙计、理顺了经营流程，不然今晚肯定手忙脚乱。”',
        accentColor: '#E8C97A',
        portraitSide: 'left',
      },
      {
        speaker: '本地美食自媒体',
        title: '探店达人·林编辑',
        text: '“哈哈，真实烟火气才最圈粉！不过有件事我得替人带个话——城东那家连锁餐饮集团托我递上合作书，愿出重金帮你半年连开十家分店，唯一条件是统一改用中央工厂预制冻货降本。”',
        accentColor: '#38BDF8',
        portraitSide: 'right',
      },
      {
        speaker: charName,
        title: '潮鲜沸鼎店长',
        text: '“全改预制冻货……资本的快车确实诱人，但客人排两小时队，究竟是为了这块招牌，还是为了嘴里那一口鲜？这份意向书，我必须给个明确答复。”',
        accentColor: '#E8C97A',
        portraitSide: 'left',
      },
    ],
    choices: [
      {
        id: 'ch3_craft',
        label: '“冻货预制绝无可能！宁可步子慢些，也要守住活鲜现烹的灵魂。”',
        hint: '匠心路线 +2 · 口碑 +6',
        philosophyDelta: { CRAFT: 2 },
        reputationDelta: 6,
        storyFlag: { key: 'ch3', value: 'craft' },
        outcomeText: '你的硬气回应被发到网上，反而引发全城食客点赞，“死磕活鲜”成了店里的金字标签。',
      },
      {
        id: 'ch3_empire',
        label: '“引入资本但保留冷链主权！用大宗直采建立自己的海鲜供应链帝国。”',
        hint: '商业帝国 +2 · 合作注资 +¥360',
        philosophyDelta: { EMPIRE: 2 },
        cashDelta: 360,
        storyFlag: { key: 'ch3', value: 'empire' },
        outcomeText: '凭借出色的谈判，你拿下战略注资并握紧了冷链采购主导权，门店扩张速度倍增！',
      },
      {
        id: 'ch3_warmth',
        label: '“把扩张预算省下来，翻新员工宿舍、给团队涨福利，人稳了菜才香。”',
        hint: '烟火温情 +2 · 全体特聘伙伴好感 +10 · 员工士气回满',
        philosophyDelta: { WARMTH: 2 },
        reputationDelta: 3,
        storyFlag: { key: 'ch3', value: 'warmth' },
        outcomeText: '当晚宿舍里欢呼声一片，员工们自发多留半小时打磨摆台细节，团队凝聚力空前高涨。',
      },
    ],
  },
  4: {
    badge: '主线演绎 · 第四章抉择',
    headline: '明厨亮灶的食安暗战',
    lines: (charName) => [
      {
        speaker: '后场设备师傅·老梁',
        title: '冷链与管网顾问',
        text: `“${charName}店长，刚才巡完后场七间房，我不得不佩服——活氧泵稳得很，洗消间连水渍都擦得透亮，洗手间也香喷喷的！”`,
        accentColor: '#2DD4BF',
        portraitSide: 'right',
      },
      {
        speaker: charName,
        title: '潮鲜沸鼎店长',
        text: '“老梁叔，前厅是面子，后场才是里子。明档越开越多，如果冷链、设备和洗消跟不上，迟早要砸了招牌。”',
        accentColor: '#E8C97A',
        portraitSide: 'left',
      },
      {
        speaker: '后场设备师傅·老梁',
        title: '冷链与管网顾问',
        text: '“说得太对了！刚才街尾几家眼红的同行在本地论坛匿名造谣，说咱们自助海鲜便宜没好货、后厨肯定藏污纳垢。你打算怎么回敬他们？”',
        accentColor: '#2DD4BF',
        portraitSide: 'right',
      },
    ],
    choices: [
      {
        id: 'ch4_craft',
        label: '“直接装上透明玻璃墙办‘后场开放日’，请全城食客亲自查验冷链与洗消！”',
        hint: '匠心路线 +2 · 卫生回满 · 设备/供氧 +15 · 口碑 +6',
        philosophyDelta: { CRAFT: 2 },
        reputationDelta: 6,
        storyFlag: { key: 'ch4', value: 'open_backstage' },
        outcomeText: '透明后场直播一战封神，食客们惊叹连冰库温度计都清清楚楚，谣言不攻自破！',
      },
      {
        id: 'ch4_empire',
        label: '“顺势申请第三方食安金盾认证，把品控标准做成全城最高门槛！”',
        hint: '商业帝国 +2 · 品牌补贴 +¥420 · 口碑 +3',
        philosophyDelta: { EMPIRE: 2 },
        cashDelta: 420,
        reputationDelta: 3,
        storyFlag: { key: 'ch4', value: 'golden_cert' },
        outcomeText: '你用一纸权威认证反向收割了一大波高端商务客流，同行反而灰头土脸。',
      },
      {
        id: 'ch4_warmth',
        label: '“邀请街坊大妈团和老客当‘荣誉食安监督员’，每月送免费海鲜锅！”',
        hint: '烟火温情 +2 · 口碑 +7 · 全体特聘伙伴好感 +6',
        philosophyDelta: { WARMTH: 2 },
        reputationDelta: 7,
        storyFlag: { key: 'ch4', value: 'neighbor_watch' },
        outcomeText: '大妈监督团比谁都护短，把你家干净透亮的后厨夸遍了整片社区，回头客络绎不绝。',
      },
    ],
  },
  5: {
    badge: '主线演绎 · 第五章抉择',
    headline: '四季休渔与行业风浪',
    lines: (charName) => [
      {
        speaker: '渔业协会代表',
        title: '港城渔政顾问',
        text: `“${charName}店长，久仰大名。季节一换、行情剧烈波动，不少海鲜自助同行为了压价以次充好，唯独你们店稳稳扛过了换季考验。”`,
        accentColor: '#4ADE80',
        portraitSide: 'right',
      },
      {
        speaker: charName,
        title: '潮鲜沸鼎店长',
        text: '“实不相瞒，换季和休渔期冷链涨价的时候，我每天闭店对着采购账本也头疼。但既然挂了‘潮鲜’二字，总不能拿不新鲜的货糊弄客人。”',
        accentColor: '#E8C97A',
        portraitSide: 'left',
      },
      {
        speaker: '渔业协会代表',
        title: '港城渔政顾问',
        text: '“正因如此，港城渔业协会想请你作为新生代餐饮代表定下一项行业倡议——面对四季潮汐与海洋资源变化，你最主张哪条路？”',
        accentColor: '#4ADE80',
        portraitSide: 'right',
      },
    ],
    choices: [
      {
        id: 'ch5_craft',
        label: '“顺应四季不时不食！推行可持续渔获与应季锅底，尊重每一片海域。”',
        hint: '匠心路线 +2 · 时代生态向好 · 口碑 +7',
        philosophyDelta: { CRAFT: 2 },
        reputationDelta: 7,
        storyFlag: { key: 'ch5', value: 'sustainable_sea' },
        outcomeText: '你的倡议引发全场共鸣，渔业协会授予门店“绿色可持续海鲜示范餐厅”铭牌。',
      },
      {
        id: 'ch5_empire',
        label: '“打通全球深海冷链航线！让食客在任何季节都能吃遍四大洋珍馐。”',
        hint: '商业帝国 +2 · 时代冷链腾飞 · 资金 +¥500',
        philosophyDelta: { EMPIRE: 2 },
        cashDelta: 500,
        storyFlag: { key: 'ch5', value: 'global_coldchain' },
        outcomeText: '远洋冷链巨头当场抛出橄榄枝，港城迅速崛起为全国海鲜冷链集散新枢纽。',
      },
      {
        id: 'ch5_warmth',
        label: '“发起港城夜市互助联盟，把小渔船和街头老摊一起带进现代美食街！”',
        hint: '烟火温情 +2 · 时代夜市复兴 · 口碑 +5 / 资金 +¥200',
        philosophyDelta: { WARMTH: 2 },
        reputationDelta: 5,
        cashDelta: 200,
        storyFlag: { key: 'ch5', value: 'harbor_alliance' },
        outcomeText: '数十家老渔户和夜市档口抱团新生，曾经沉寂的老码头重新亮起绵延十里的灯火。',
      },
    ],
  },
  6: {
    badge: '主线演绎 · 第六章抉择',
    headline: '码头夜市的无声邀约',
    lines: (charName) => [
      {
        speaker: '码头总把头·郑叔',
        title: '老渔帮牵头人',
        text: `“${charName}掌柜，听说你店里不仅聚起了得力骨干，连江湖上的奇人都频频登门？老码头的兄弟们托我送来一坛陈年花雕，想问你一句实在话。”`,
        accentColor: '#F59E0B',
        portraitSide: 'right',
      },
      {
        speaker: charName,
        title: '潮鲜沸鼎店长',
        text: '“郑叔客气了！做餐饮哪有独行侠，靠的都是伙计们同心、老船东供鲜、贵客捧场。码头这边可是有什么难处？”',
        accentColor: '#E8C97A',
        portraitSide: 'left',
      },
      {
        speaker: '码头总把头·郑叔',
        title: '老渔帮牵头人',
        text: '“老码头下个月要改建文化渔港，大开发商想一口气买断所有凌晨早市的优质鱼获优先权。咱们这些世代跑船的，想问问你愿不愿站出来牵个头？”',
        accentColor: '#F59E0B',
        portraitSide: 'right',
      },
    ],
    choices: [
      {
        id: 'ch6_craft',
        label: '“联合船老大设立‘鲜度分级拍卖台’，好渔获按质论价，绝不让外行糟蹋！”',
        hint: '匠心路线 +2 · 原料库补满 · 口碑 +6',
        philosophyDelta: { CRAFT: 2 },
        reputationDelta: 6,
        storyFlag: { key: 'ch6', value: 'fresh_auction' },
        outcomeText: '清晨的鲜度分级拍卖成了港城新风景，最肥美的头茬活鲜从此总先送到你后厨。',
      },
      {
        id: 'ch6_empire',
        label: '“由我出面组建港城渔获集采联盟，直接把码头早市变成咱们的专属前仓！”',
        hint: '商业帝国 +2 · 联盟分红 +¥560',
        philosophyDelta: { EMPIRE: 2 },
        cashDelta: 560,
        storyFlag: { key: 'ch6', value: 'dock_syndicate' },
        outcomeText: '你凭借精准议价把采购成本压低一截，码头商户纷纷认你作了新任商界话事人。',
      },
      {
        id: 'ch6_warmth',
        label: '“为老渔民保留早市摊位，每逢大风浪夜，我的店免费给收船兄弟留碗热汤！”',
        hint: '烟火温情 +2 · 口碑 +6 · 全体特聘伙伴好感 +8',
        philosophyDelta: { WARMTH: 2 },
        reputationDelta: 6,
        storyFlag: { key: 'ch6', value: 'fishermen_hearth' },
        outcomeText: '老渔帮汉子们红了眼眶，此后每有稀罕深海鲜货上岸，第一时间便提着竹篓敲响你的后门。',
      },
    ],
  },
  7: {
    badge: '主线演绎 · 第七章抉择',
    headline: '星级评鉴前的暗流涌动',
    lines: (charName) => [
      {
        speaker: '海鲜巨鳄·秦总监',
        title: '外埠连锁餐饮副总裁',
        text: `“${charName}店长，久仰。刚参观完你们的明档分区与厅堂陈设，菜品之丰盛确实让我吃了一惊——难怪我们新开的旗舰店客流总被你分走一半。”`,
        accentColor: '#F43F5E',
        portraitSide: 'right',
      },
      {
        speaker: charName,
        title: '潮鲜沸鼎店长',
        text: '“秦总大驾光临，不知是来吃海鲜的，还是来下战书的？港城市场大得很，靠真本事留客，谁也不用怕谁。”',
        accentColor: '#E8C97A',
        portraitSide: 'left',
      },
      {
        speaker: '海鲜巨鳄·秦总监',
        title: '外埠连锁餐饮副总裁',
        text: '“爽快！下周就是城市星级餐厅评鉴，我们可以一起联合造势垄断高端市场，也可以各自打响价格补贴战——或者，你有第三种解法？”',
        accentColor: '#F43F5E',
        portraitSide: 'right',
      },
    ],
    choices: [
      {
        id: 'ch7_craft',
        label: '“不搞恶性补贴，也不搞垄断——评鉴现场比活鲜、比锅底、比明档真功夫！”',
        hint: '匠心路线 +2 · 熟食补满 · 卫生 +6 · 口碑 +7',
        philosophyDelta: { CRAFT: 2 },
        reputationDelta: 7,
        storyFlag: { key: 'ch7', value: 'craft_duel' },
        outcomeText: '评鉴现场你的现切活鲜与沸腾金汤艳压全场，秦总监尝罢亦不得不抱拳认输。',
      },
      {
        id: 'ch7_empire',
        label: '“签下互惠联名协议，借他们的全国渠道把‘潮鲜沸鼎’名号推向省外！”',
        hint: '商业帝国 +2 · 联名分成 +¥680 · 口碑 +2',
        philosophyDelta: { EMPIRE: 2 },
        cashDelta: 680,
        reputationDelta: 2,
        storyFlag: { key: 'ch7', value: 'alliance_deal' },
        outcomeText: '你在谈判桌上寸步不让，不仅守住了独立品牌，还顺势借船出海收获巨额联名收益。',
      },
      {
        id: 'ch7_warmth',
        label: '“评鉴之夜举办‘老客回馈百鲜宴’，真正给这家店打分的，永远是桌上食客！”',
        hint: '烟火温情 +2 · 口碑 +8 · 员工士气回满',
        philosophyDelta: { WARMTH: 2 },
        reputationDelta: 8,
        storyFlag: { key: 'ch7', value: 'guest_jury' },
        outcomeText: '当晚满堂欢笑与真诚好评胜过一切公关通稿，评委们当场写下满分评语。',
      },
    ],
  },
  8: {
    badge: '主线演绎 · 第八章抉择',
    headline: '港城美食峰会的聚光灯',
    lines: (charName) => [
      {
        speaker: '港城餐饮商会会长',
        title: '年度峰会主持人',
        text: `“各位来宾，让我们把掌声送给‘潮鲜沸鼎’的${charName}店长！在激烈的商海竞逐中，这家从街角起家的门店用无可挑剔的口碑与经营体系折服了所有人！”`,
        accentColor: '#A855F7',
        portraitSide: 'right',
      },
      {
        speaker: charName,
        title: '潮鲜沸鼎店长',
        text: '“聚光灯打在脸上，台下坐着曾经质疑过我的同行、帮衬过我的老渔民、还有一路捧场的食客……这一刻，比拿到任何奖杯都沉甸甸的。”',
        accentColor: '#E8C97A',
        portraitSide: 'left',
      },
      {
        speaker: '港城餐饮商会会长',
        title: '年度峰会主持人',
        text: '“作为本届峰会最具影响力的领军人物，商会将为你配套一笔专项扶持基金——你会把这股势能投向哪一方向？”',
        accentColor: '#A855F7',
        portraitSide: 'right',
      },
    ],
    choices: [
      {
        id: 'ch8_craft',
        label: '“筹建海鲜锅底研发实验室，把潮汕与深海烹鲜技艺整理成典籍！”',
        hint: '匠心路线 +2 · 原料库 +16 · 口碑 +7',
        philosophyDelta: { CRAFT: 2 },
        reputationDelta: 7,
        storyFlag: { key: 'ch8', value: 'flavor_lab' },
        outcomeText: '你的研发手记很快成为港城厨师争相传阅的宝典，门店也成了行业朝圣之地。',
      },
      {
        id: 'ch8_empire',
        label: '“启动智慧冷链与品牌孵化计划，把港城海鲜模式输出到全国沿海城市！”',
        hint: '商业帝国 +2 · 专项扶持 +¥820',
        philosophyDelta: { EMPIRE: 2 },
        cashDelta: 820,
        storyFlag: { key: 'ch8', value: 'expansion_fund' },
        outcomeText: '峰会尚未散场，已有三座海滨城市的商业代表团围过来递上旗舰店邀约。',
      },
      {
        id: 'ch8_warmth',
        label: '“设立‘港城青年厨师助学金’，帮更多怀揣烟火梦的年轻人撑起第一口灶！”',
        hint: '烟火温情 +2 · 口碑 +8 · 全体特聘伙伴好感 +10',
        philosophyDelta: { WARMTH: 2 },
        reputationDelta: 8,
        storyFlag: { key: 'ch8', value: 'youth_fellowship' },
        outcomeText: '台下爆发出经久不息的掌声，无数怀揣热忱的年轻厨师因此把你视作灯塔。',
      },
    ],
  },
  9: {
    badge: '主线演绎 · 第九章抉择',
    headline: '十年之问与星级殿堂',
    lines: (charName) => [
      {
        speaker: '城市美食年鉴主编',
        title: '特约人物专访',
        text: `“${charName}店长，请看这组对比照——左边是你刚开业时人手紧巴巴的街角小馆，右边则是今晚团队精锐、锅底百味、满堂欢声的顶级殿堂。”`,
        accentColor: '#C084FC',
        portraitSide: 'right',
      },
      {
        speaker: charName,
        title: '潮鲜沸鼎店长',
        text: '“时间过得真快啊……看着照片，我还能想起当初人手不够时自己一手端沸锅、一手收脏碗满场飞奔的样子，也记得每一次换季迎风浪的夜晚。”',
        accentColor: '#E8C97A',
        portraitSide: 'left',
      },
      {
        speaker: '城市美食年鉴主编',
        title: '特约人物专访',
        text: '“如今全城餐饮界都在研究你的管理哲学。作为今年年鉴的封面人物，最后一个问题：如果十年后人们再提起‘潮鲜沸鼎’，你最想留下怎样的印记？”',
        accentColor: '#C084FC',
        portraitSide: 'right',
      },
      {
        speaker: charName,
        title: '潮鲜沸鼎店长',
        text: '“十年后的港城会是什么模样？而我与一路相伴的伙伴们，又想把这家店带向何方？我望向窗外闪烁的红灯笼，缓缓说出了回答。”',
        accentColor: '#E8C97A',
        portraitSide: 'left',
      },
    ],
    choices: [
      {
        id: 'ch9_craft',
        label: '“希望它成为写进厨艺教科书的百年鲜味标杆。”',
        hint: '匠心路线 +2 · 口碑 +7',
        philosophyDelta: { CRAFT: 2 },
        reputationDelta: 7,
        storyFlag: { key: 'ch9', value: 'craft' },
        outcomeText: '主编郑重记下这句话，决定为你的锅底工艺与活鲜标准撰写整章专题。',
      },
      {
        id: 'ch9_empire',
        label: '“希望‘潮鲜沸鼎’成为走向海外的东方海鲜自助第一品牌！”',
        hint: '商业帝国 +2 · 品牌赞助 +¥900',
        philosophyDelta: { EMPIRE: 2 },
        cashDelta: 900,
        storyFlag: { key: 'ch9', value: 'empire' },
        outcomeText: '海外华商餐饮代表团读到专访后率先发来新加坡与东京的旗舰店选址邀约。',
      },
      {
        id: 'ch9_warmth',
        label: '“希望无论时代怎么变，推开这扇门，总有熟人笑着给你留一张桌。”',
        hint: '烟火温情 +2 · 口碑 +6 / 全体特聘伙伴好感 +10',
        philosophyDelta: { WARMTH: 2 },
        reputationDelta: 6,
        storyFlag: { key: 'ch9', value: 'warmth' },
        outcomeText: '访谈刊出当晚，许多从第一章就来吃虾的老客特意送来手写贺卡，贴满了迎宾台。',
      },
    ],
  },
  10: {
    badge: '主线终章演绎 · 时代定调',
    headline: '海上传奇 · 沸鼎不息',
    lines: (charName) => [
      {
        speaker: '老街坊·陈伯',
        title: '港城老客代表',
        text: `“哎哟，${charName}店长！从街角第一盏红灯笼，到今天名动四方的潮鲜传奇殿堂，我这老头子算是亲眼见证了一段海上传奇啦！”`,
        accentColor: '#F59E0B',
        portraitSide: 'right',
      },
      {
        speaker: '城市美食年鉴主编',
        title: '时代见证者',
        text: '“今晚全城媒体、渔业协会与餐饮同仁齐聚于此，为‘潮鲜沸鼎’加冕年度至高金鼎！不知站上巅峰的店长，下一步打算书写怎样的终章？”',
        accentColor: '#C084FC',
        portraitSide: 'right',
      },
      {
        speaker: charName,
        title: '潮鲜沸鼎店长',
        text: '“大厅里沸腾的蒸汽、后厨忙碌却默契的伙计们、四季流转间留下的欢笑与感动、还有一路并肩相守的身影……这口沸鼎，承载了太多人的梦想。”',
        accentColor: '#E8C97A',
        portraitSide: 'left',
      },
      {
        speaker: charName,
        title: '潮鲜沸鼎店长',
        text: '“现在，该为这家店、为我的未来人生、也为这座港城的味觉时代，落下最郑重的一笔了。”',
        accentColor: '#E8C97A',
        portraitSide: 'left',
      },
    ],
    choices: [
      {
        id: 'ch10_craft',
        label: '设立「潮鲜传艺学堂」，守着这方总店把匠心海味传给下一代。',
        hint: '锁定匠心宗师终章 · 见证四维史诗结局',
        philosophyDelta: { CRAFT: 3 },
        storyFlag: { key: 'ch10', value: 'academy' },
        outcomeText: '你亲手挂上“潮鲜传艺”匾额，从此江湖流传：凡出此门者，皆识天下至鲜。',
      },
      {
        id: 'ch10_empire',
        label: '敲响「潮鲜沸鼎集团」上市钟声，让东方海鲜沸锅扬帆四海！',
        hint: '锁定商业传奇终章 · 见证四维史诗结局',
        philosophyDelta: { EMPIRE: 3 },
        storyFlag: { key: 'ch10', value: 'ipo' },
        outcomeText: '港城码头礼炮齐鸣，从街角起步的品牌正式驶向世界餐饮的星辰大海！',
      },
      {
        id: 'ch10_warmth',
        label: '卸下浮名，与挚爱和老伙计们守着海风与灯火，把温暖延续到白头。',
        hint: '锁定人间烟火终章 · 见证四维史诗结局',
        philosophyDelta: { WARMTH: 3 },
        storyFlag: { key: 'ch10', value: 'haven' },
        outcomeText: '海风吹过灯笼，灶上鲜汤翻滚如初。你笑着系紧围裙，迎向又一个热气腾腾的夜晚。',
      },
    ],
  },
};

export interface ChapterObjectiveStatus {
  label: string;
  currentText: string;
  done: boolean;
}

export function evaluateChapterObjectives(world: GameWorld): {
  objectives: ChapterObjectiveStatus[];
  allDone: boolean;
} {
  const ch = world.mainChapter;
  const totalDishesConsumed = Object.values(world.dishConsumptionCounts || {}).reduce(
    (sum, n) => sum + (Number.isFinite(n) ? n : 0),
    0
  );
  const highTierCount = world.staff.filter((s) => s.tier >= 2).length;
  const discoveredSpecialCustomers = Object.values(world.specialStories).filter(
    (st) => st.discovered
  ).length;
  const recruitedSpecialStaff = Object.values(world.specialStaffBonds).filter(
    (b) => b.recruited
  ).length;

  const countTechAtOrAbove = (minStage: number) =>
    world.unlockedTechNodeIds.filter((id) => {
      const def = getTechNodeDef(id);
      return Boolean(def && !def.starterUnlocked && def.stage >= minStage);
    }).length;

  let objectives: ChapterObjectiveStatus[] = [];

  if (ch === 1) {
    const stage1Nodes = countTechAtOrAbove(1);
    objectives = [
      {
        label: '累计接待顾客',
        currentText: `${world.totalGuestsServed}/8 桌`,
        done: world.totalGuestsServed >= 8,
      },
      {
        label: '门店卫生保持良好',
        currentText: `${Math.round(world.hygiene)}/78`,
        done: world.hygiene >= 78,
      },
      {
        label: '天赋树点亮阶段一新节点',
        currentText: `${stage1Nodes}/1 项`,
        done: stage1Nodes >= 1,
      },
    ];
  } else if (ch === 2) {
    const stage1Nodes = countTechAtOrAbove(1);
    objectives = [
      {
        label: '累计接待顾客',
        currentText: `${world.totalGuestsServed}/20 桌`,
        done: world.totalGuestsServed >= 20,
      },
      {
        label: '累计售出/消耗菜品',
        currentText: `${totalDishesConsumed}/50 份`,
        done: totalDishesConsumed >= 50,
      },
      {
        label: '天赋树点亮阶段一及以上节点',
        currentText: `${stage1Nodes}/2 项`,
        done: stage1Nodes >= 2,
      },
    ];
  } else if (ch === 3) {
    const stage2Nodes = countTechAtOrAbove(2);
    objectives = [
      {
        label: '组建团队（在职员工人数）',
        currentText: `${world.staff.length}/2 人`,
        done: world.staff.length >= 2,
      },
      {
        label: '天赋树点亮阶段二及以上节点',
        currentText: `${stage2Nodes}/1 项`,
        done: stage2Nodes >= 1,
      },
      {
        label: '累计营业收入',
        currentText: `¥${world.totalCashEarned.toLocaleString()}/¥5,000`,
        done: world.totalCashEarned >= 5000,
      },
    ];
  } else if (ch === 4) {
    const stage2Nodes = countTechAtOrAbove(2);
    const backstageMin = Math.min(
      Math.round(world.equipmentHealth),
      Math.round(world.oxygenLevel),
      Math.round(world.restroomCleanliness)
    );
    objectives = [
      {
        label: '天赋树点亮阶段二及以上节点',
        currentText: `${stage2Nodes}/3 项`,
        done: stage2Nodes >= 3,
      },
      {
        label: '后场设备、供氧与洗手间均 ≥ 80%',
        currentText: `最低 ${backstageMin}%/80%`,
        done:
          world.equipmentHealth >= 80 &&
          world.oxygenLevel >= 80 &&
          world.restroomCleanliness >= 80,
      },
      {
        label: '扩建自助明档分区',
        currentText: `${world.unlockedZones.length}/4 区`,
        done: world.unlockedZones.length >= 4,
      },
      {
        label: '累计营业收入',
        currentText: `¥${world.totalCashEarned.toLocaleString()}/¥12,000`,
        done: world.totalCashEarned >= 12000,
      },
    ];
  } else if (ch === 5) {
    const stage3Nodes = countTechAtOrAbove(3);
    objectives = [
      {
        label: '经营跨越首轮换季（抵达第 6 天）',
        currentText: `第 ${world.day}/6 天`,
        done: world.day >= 6,
      },
      {
        label: '天赋树点亮阶段三及以上节点',
        currentText: `${stage3Nodes}/1 项`,
        done: stage3Nodes >= 1,
      },
      {
        label: '门店口碑提升至小有名气',
        currentText: `${Math.round(world.reputation)}/70 分`,
        done: world.reputation >= 70,
      },
      {
        label: '累计营业收入',
        currentText: `¥${world.totalCashEarned.toLocaleString()}/¥24,000`,
        done: world.totalCashEarned >= 24000,
      },
    ];
  } else if (ch === 6) {
    const stage3Nodes = countTechAtOrAbove(3);
    const specialBondsCount = discoveredSpecialCustomers + recruitedSpecialStaff;
    objectives = [
      {
        label: '天赋树点亮阶段三及以上节点',
        currentText: `${stage3Nodes}/3 项`,
        done: stage3Nodes >= 3,
      },
      {
        label: '结识奇遇来客或招募特聘店员',
        currentText: `${specialBondsCount}/2 位`,
        done: specialBondsCount >= 2,
      },
      {
        label: '培养或聘请 2 星及以上员工',
        currentText: `${highTierCount}/2 人`,
        done: highTierCount >= 2,
      },
      {
        label: '累计营业收入',
        currentText: `¥${world.totalCashEarned.toLocaleString()}/¥45,000`,
        done: world.totalCashEarned >= 45000,
      },
    ];
  } else if (ch === 7) {
    const stage4Nodes = countTechAtOrAbove(4);
    objectives = [
      {
        label: '天赋树点亮阶段四及以上节点',
        currentText: `${stage4Nodes}/1 项`,
        done: stage4Nodes >= 1,
      },
      {
        label: '解锁海鲜/熟食品类',
        currentText: `${world.unlockedSeafoodIds.length}/9 种`,
        done: world.unlockedSeafoodIds.length >= 9,
      },
      {
        label: '扩建自助明档分区',
        currentText: `${world.unlockedZones.length}/5 区`,
        done: world.unlockedZones.length >= 5,
      },
      {
        label: '累计营业收入',
        currentText: `¥${world.totalCashEarned.toLocaleString()}/¥78,000`,
        done: world.totalCashEarned >= 78000,
      },
    ];
  } else if (ch === 8) {
    const stage4Nodes = countTechAtOrAbove(4);
    objectives = [
      {
        label: '天赋树点亮阶段四及以上节点',
        currentText: `${stage4Nodes}/3 项`,
        done: stage4Nodes >= 3,
      },
      {
        label: '累计接待顾客',
        currentText: `${world.totalGuestsServed}/140 桌`,
        done: world.totalGuestsServed >= 140,
      },
      {
        label: '口碑 ≥ 80 分 且 卫生 ≥ 82',
        currentText: `口碑 ${Math.round(world.reputation)}/80 · 卫生 ${Math.round(world.hygiene)}/82`,
        done: world.reputation >= 80 && world.hygiene >= 82,
      },
      {
        label: '累计营业收入',
        currentText: `¥${world.totalCashEarned.toLocaleString()}/¥125,000`,
        done: world.totalCashEarned >= 125000,
      },
    ];
  } else if (ch === 9) {
    const stage5Nodes = countTechAtOrAbove(5);
    objectives = [
      {
        label: '天赋树点亮阶段五节点',
        currentText: `${stage5Nodes}/1 项`,
        done: stage5Nodes >= 1,
      },
      {
        label: '在职员工 ≥ 6 人且含 3 名以上 2 星骨干',
        currentText: `${world.staff.length}/6 人 · 骨干 ${highTierCount}/3`,
        done: world.staff.length >= 6 && highTierCount >= 3,
      },
      {
        label: '累计售出/消耗菜品',
        currentText: `${totalDishesConsumed}/400 份`,
        done: totalDishesConsumed >= 400,
      },
      {
        label: '累计营业收入',
        currentText: `¥${world.totalCashEarned.toLocaleString()}/¥175,000`,
        done: world.totalCashEarned >= 175000,
      },
    ];
  } else {
    const stage5Nodes = countTechAtOrAbove(5);
    objectives = [
      {
        label: '阶段五天赋树点亮至少 2 个节点',
        currentText: `${stage5Nodes}/2 项`,
        done: stage5Nodes >= 2,
      },
      {
        label: '累计接待顾客',
        currentText: `${world.totalGuestsServed}/220 桌`,
        done: world.totalGuestsServed >= 220,
      },
      {
        label: '累计营业收入',
        currentText: `¥${world.totalCashEarned.toLocaleString()}/¥220,000`,
        done: world.totalCashEarned >= 220000,
      },
      {
        label: '门店口碑达到金字招牌',
        currentText: `${Math.round(world.reputation)}/88 分`,
        done: world.reputation >= 88,
      },
    ];
  }

  return {
    objectives,
    allDone: objectives.every((o) => o.done),
  };
}

// ==========================================
// SPECIAL CUSTOMERS (WITH TICKET PRICE FILTERS!)
// ==========================================

export const SPECIAL_STORIES: SpecialStoryDef[] = [
  {
    id: 'critic_shen',
    customerName: '沈墨白',
    roleTitle: '毒舌美食专栏家',
    color: '#C084FC',
    tagLabel: '食评家',
    minShopLevel: 1,
    minChapter: 1,
    minTicketPrice: 140,
    maxTicketPrice: 480,
    stage1Goal: '第1访：满意接待沈墨白（无断菜、不逃单）',
    stage2Goal: '第2访：卫生≥75且无断菜，再次令沈墨白满意',
    stage1Dialogue:
      '“哼，原本以为又是家拿冻货充数的自助店，没想到你这锅底与鲜虾竟如此扎实。过两日我再来复查，若水准依旧，我送你一份绝密渔货渠道。”',
    stage2Dialogue:
      '“火候、鲜度、出餐节奏皆属上乘！我已在专栏头版力荐贵店，并把珍藏的远洋蓝鳍金枪鱼直供名额赠予你——去冰台摆上镇店吧！”',
    rewardType: 'SPECIAL_DISH',
    rewardTitle: '隐藏特殊菜品 · 蓝鳍金枪鱼大腹',
    rewardDescription: '收入菜品卡库并附赠 18 份冷库库存！在门店发展树扩建「刺身与日料区」后即可上架，餐位费 +¥88 并大幅提升好评。',
    requiresHygiene: 75,
  },
  {
    id: 'master_zhou',
    customerName: '周老灶',
    roleTitle: '隐退国宴汤锅宗师',
    color: '#2DD4BF',
    tagLabel: '老宗师',
    minShopLevel: 1,
    minChapter: 1,
    minTicketPrice: 0,
    maxTicketPrice: 399, // When ticket price reaches >= 400, 周老灶 will NOT appear!
    stage1Goal: '第1访：餐位费<¥400时满意接待周老灶并及时端上沸腾锅底',
    stage2Goal: '第2访：店铺达 Lv.2 且保持亲民/品质档（<¥400）再次接待周老灶',
    stage1Dialogue:
      '“好一口滚烫鲜锅！老头子最看重实诚烟火气，不喜欢那些动辄四五百虚张声势的高价馆子。等你把店做大些，只要不忘本，我定再来喝一碗！”',
    stage2Dialogue:
      '“后生可畏啊！看你忙前忙后却一丝不苟，我这把老骨头又手痒了。别推辞，给我留条围裙，以后这店里的传锅灶台我来帮你镇场！”',
    rewardType: 'SPECIAL_STAFF',
    rewardTitle: '特殊员工 · 周老灶（特聘传锅宗师）',
    rewardDescription: '超强特殊上锅员免费入队（不占编制、日薪¥45），移速285/效率×3.4，小费+75%！',
  },
  {
    id: 'heiress_gu',
    customerName: '顾清欢',
    roleTitle: '远洋船王千金',
    color: '#FBBF24',
    tagLabel: '船王千金',
    minShopLevel: 1,
    minChapter: 1,
    minTicketPrice: 190,
    maxTicketPrice: 999,
    stage1Goal: '第1访：满意接待顾清欢，展现高端海鲜品质（餐位≥¥190更易偶遇）',
    stage2Goal: '第2访：冰台至少 4 种海鲜有货时再次满意接待',
    stage1Dialogue:
      '“哇，这里的活鲜口感居然不输我家游艇私厨！我正替家族晚宴物色定点餐厅，下次我会再带闺蜜来检验你们的品类丰盛度哦。”',
    stage2Dialogue:
      '“太惊艳了！从今天起，我正式把‘潮鲜沸鼎’设为船王家族的御用聚餐据点，以后常有我们家族的超级贵宾团光顾，记得备足好海鲜！”',
    rewardType: 'SUPER_CUSTOMER',
    rewardTitle: '超级顾客解锁 · 船王家族超VIP团',
    rewardDescription: '永久概率刷新「船王超VIP」：单桌消费 ×2.5倍、打赏 +¥120、满意离店口碑 +5！',
  },
  {
    id: 'inspector_cheng',
    customerName: '程明镜',
    roleTitle: '海归食安品控官',
    color: '#38BDF8',
    tagLabel: '品控官',
    minShopLevel: 1,
    minChapter: 1,
    minTicketPrice: 0,
    maxTicketPrice: 440,
    stage1Goal: '第1访：保持卫生≥80并满意接待程明镜',
    stage2Goal: '第2访：保持卫生≥85再次通过程明镜暗访',
    stage1Dialogue:
      '“餐具光洁无油膜，冷链和洗手间也达标，难得见到如此注重细节的自助火锅店。若下次抽查你依然能守住高卫生标准，我有份大礼相赠。”',
    stage2Dialogue:
      '“无可挑剔的洁净度！这是我签发的星级卫生认证，顺便把我最得力的洗消徒弟‘阿镜’派来助你一臂之力，保你后厨永不积碗！”',
    rewardType: 'SPECIAL_STAFF_BUFF',
    rewardTitle: '特殊员工 · 阿镜 + 卫生抗衰 -25%',
    rewardDescription: '获得特殊洗碗神手「阿镜」（不占编制，单次洗净6套、日薪¥40）及全店卫生衰减-25%！',
    requiresHygiene: 80,
  },
];

export function getSpecialStoryDef(id: SpecialCustomerId): SpecialStoryDef {
  return SPECIAL_STORIES.find((s) => s.id === id)!;
}

// ==========================================
// 3 ROMANCEABLE SPECIAL STAFF WITH 5-STAGE PERSONAL ARCS
// ==========================================

export interface SpecialStaffQuestDef {
  stage: number; // 1..5
  minChapter: number;
  phaseHint: 'PREP' | 'CLOSING' | 'ANY';
  sceneId: FacilitySceneId;
  title: string;
  lines: DialogueLine[];
  choices: StoryChoiceOption[];
}

export interface SpecialStaffDef {
  id: SpecialStaffId;
  name: string;
  title: string;
  role: StaffRole;
  color: string;
  favoriteScene: FacilitySceneId;
  recruitChapter: number;
  recruitCost: number;
  dailyWage: number;
  bio: string;
  bonusTitle: string;
  bonusDetail: string;
  wishes: string[];
  quests: SpecialStaffQuestDef[];
}

export const SPECIAL_STAFF_CATALOG: SpecialStaffDef[] = [
  {
    id: 'lin_xi',
    name: '林汐',
    title: '深海刀神 · 冷链切配',
    role: 'STOCKER',
    color: '#38BDF8',
    favoriteScene: 'cold_storage',
    recruitChapter: 1,
    recruitCost: 160,
    dailyWage: 42,
    bio: '自幼在渔港码头帮父亲剖鱼分拣的天才少女，刀工如雪，对海鲜鲜度近乎偏执，嘴硬心软。',
    bonusTitle: '霜刃锁鲜（特聘）',
    bonusDetail: '不占常规编制！高速冰台补货 ×3，全店小费 +18%，海鲜损耗大幅降低。',
    wishes: [
      '想在闭店后一起去码头吹吹海风、吃一串炭烤鱿鱼',
      '想让你陪她在冷链库房整理新到的应季海鲜图鉴',
      '想收一份温热的姜茶，驱散在冷库干活的寒气',
    ],
    quests: [
      {
        stage: 1,
        minChapter: 1,
        phaseHint: 'PREP',
        sceneId: 'cold_storage',
        title: '第1幕 · 凌晨五点的冷库霜花',
        lines: [
          {
            speaker: '林汐',
            title: '冷链切配师',
            text: '“喂，店长，你起得居然比我还早？这批基围虾冷链箱温度高了两度，我刚重新铺了碎冰。可别小看这两度，活虾差一口气，甜味就散了一半。”',
            accentColor: '#38BDF8',
          },
          {
            speaker: '林汐',
            title: '冷链切配师',
            text: '“以前那家老板嫌我太挑剔把我辞了……你呢？是不是也觉得为了两度温差折腾太麻烦？”',
            accentColor: '#38BDF8',
          },
        ],
        choices: [
          {
            id: 'lin1_a',
            label: '递上热姜茶：“以后冷库温度标准就按你的来，我完全信任你的手艺。”',
            hint: '林汐好感 +22 · 匠心 +1 · 原料库 +8',
            affectionDelta: { staffId: 'lin_xi', amount: 22 },
            philosophyDelta: { CRAFT: 1 },
            staffPath: { staffId: 'lin_xi', path: 'DEVOTION' },
            outcomeText: '林汐愣了一下，接过姜茶时耳尖微红：“哼……算你识货。那这间冷库，我就替你守到底了。”',
          },
          {
            id: 'lin1_b',
            label: '“把你的冷链品控写成标准手册，以后咱们做大时靠这套系统称霸行业！”',
            hint: '林汐好感 +18 · 商业帝国 +1 · 资金 +¥100',
            affectionDelta: { staffId: 'lin_xi', amount: 18 },
            philosophyDelta: { EMPIRE: 1 },
            cashDelta: 100,
            staffPath: { staffId: 'lin_xi', path: 'AMBITION' },
            outcomeText: '林汐眼神一亮：“把码头祖传的验鲜诀窍变成行业标准？这主意够带劲！”',
          },
        ],
      },
      {
        stage: 2,
        minChapter: 2,
        phaseHint: 'CLOSING',
        sceneId: 'cold_storage',
        title: '第2幕 · 供货商的风波',
        lines: [
          {
            speaker: '林汐',
            title: '冷链切配师',
            text: '“气死我了！批发商趁着咱们客流大涨，竟然把次等冻贝混进今晚的货里，还威胁我不签收明天就断咱们的供货！”',
            accentColor: '#38BDF8',
          },
        ],
        choices: [
          {
            id: 'lin2_a',
            label: '“立刻退货！明天天没亮我陪你亲自去渔港码头，重新找船老大直签。”',
            hint: '林汐好感 +22 · 口碑 +4',
            affectionDelta: { staffId: 'lin_xi', amount: 22 },
            reputationDelta: 4,
            staffPath: { staffId: 'lin_xi', path: 'DEVOTION' },
            outcomeText: '林汐长舒一口气，嘴角扬起灿烂的笑：“我就知道你会站在我这边！明早四点，别睡懒觉哦店长！”',
          },
          {
            id: 'lin2_b',
            label: '“借这机会直接建立我们自己的直采冷链协议，反客为主！”',
            hint: '林汐好感 +18 · 资金 +¥150',
            affectionDelta: { staffId: 'lin_xi', amount: 18 },
            cashDelta: 150,
            staffPath: { staffId: 'lin_xi', path: 'AMBITION' },
            outcomeText: '你们连夜拟出直采分账方案，三天后反而成了码头最受欢迎的大买家。',
          },
        ],
      },
      {
        stage: 3,
        minChapter: 3,
        phaseHint: 'PREP',
        sceneId: 'dormitory',
        title: '第3幕 · 霜刃下的旧伤',
        lines: [
          {
            speaker: '林汐',
            title: '冷链切配师',
            text: '“哎呀别看啦……只是昨晚试切蓝鳍金枪鱼太投入，手腕有点酸而已。我答应过老爸，一定要做出比城里顶级日料店更绝的鲜切摆盘。”',
            accentColor: '#38BDF8',
          },
        ],
        choices: [
          {
            id: 'lin3_a',
            label: '替她贴上温热膏药：“手艺是一辈子的事，别透支自己，今天冰台我多替你分担。”',
            hint: '林汐好感 +24 · 烟火温情 +1',
            affectionDelta: { staffId: 'lin_xi', amount: 24 },
            philosophyDelta: { WARMTH: 1 },
            outcomeText: '林汐安静下来，轻轻把下巴靠在桌沿：“……店长，你总是这么温柔，我都要习惯依赖你了。”',
          },
          {
            id: 'lin3_b',
            label: '“我给你配最趁手的定制柳刃刀，再招两名副手给你打下手！”',
            hint: '林汐好感 +20 · 匠心 +1',
            affectionDelta: { staffId: 'lin_xi', amount: 20 },
            philosophyDelta: { CRAFT: 1 },
            outcomeText: '林汐珍重地接过刀匣，目光炯炯：“有这把刀，我能把整座港湾的鲜味都切出花来！”',
          },
        ],
      },
      {
        stage: 4,
        minChapter: 4,
        phaseHint: 'CLOSING',
        sceneId: 'cold_storage',
        title: '第4幕 · 远洋冷链的邀约',
        lines: [
          {
            speaker: '林汐',
            title: '冷链切配师',
            text: '“店长，外省一家大型海鲜供应链公司想高薪挖我去做冷链首席顾问……说实话，待遇很诱人，但我站在这间库房里，却一步都迈不开。”',
            accentColor: '#38BDF8',
          },
        ],
        choices: [
          {
            id: 'lin4_a',
            label: '握住她的手：“这里不缺顾问，只缺你。留下来和我一起把店开成传奇吧。”',
            hint: '林汐好感 +25 · 锁定相守羁绊',
            affectionDelta: { staffId: 'lin_xi', amount: 25 },
            staffPath: { staffId: 'lin_xi', path: 'DEVOTION' },
            outcomeText: '林汐反手十指紧扣，笑着擦掉眼角水汽：“笨蛋，我等的就是你这句话呀。”',
          },
          {
            id: 'lin4_b',
            label: '“如果你想闯出更大天地，我们以合伙人身份共建海港冷链品牌！”',
            hint: '林汐好感 +20 · 资金 +¥260 · 商业共进',
            affectionDelta: { staffId: 'lin_xi', amount: 20 },
            cashDelta: 260,
            staffPath: { staffId: 'lin_xi', path: 'AMBITION' },
            outcomeText: '林汐豪爽拍肩：“成交！林汐冷链与潮鲜沸鼎，以后就是最硬核的双强拍档！”',
          },
        ],
      },
      {
        stage: 5,
        minChapter: 5,
        phaseHint: 'CLOSING',
        sceneId: 'dormitory',
        title: '第5幕 · 潮汐与归港',
        lines: [
          {
            speaker: '林汐',
            title: '冷链首席掌舵',
            text: '“从街角四张桌到今天的海上御膳火锅城，我看着你一趟趟跑码头、擦桌子、熬汤底……潮水每天有涨有落，但只要回头能看见你，我就像渔船找到了灯塔。”',
            accentColor: '#38BDF8',
          },
        ],
        choices: [
          {
            id: 'lin5_a',
            label: '“无论以后潮涨潮落，这座港湾永远是我们共同的家。”',
            hint: '林汐个人线圆满完结 · 好感拉满 +25 · 口碑 +5',
            affectionDelta: { staffId: 'lin_xi', amount: 25 },
            reputationDelta: 5,
            outcomeText: '海风掠过宿舍窗台，林汐把那枚陪伴多年的海螺挂坠系在了你的钥匙扣上。她的专属完美结局已写入史册！',
          },
        ],
      },
    ],
  },
  {
    id: 'shen_zhiwei',
    name: '沈知微',
    title: '归国热厨主厨',
    role: 'CHEF',
    color: '#F97316',
    favoriteScene: 'hot_kitchen',
    recruitChapter: 1,
    recruitCost: 180,
    dailyWage: 46,
    bio: '曾在海外星级餐厅担任副主厨，厌倦了冷冰冰的分子摆盘，回到港城迷上了蒜蓉蒸贝与猛火炒蟹的烟火香气。',
    bonusTitle: '炽焰明档（特聘）',
    bonusDetail: '不占常规编制！高速烹制熟食 +5 份/次，熟食区品质大涨，全店小费 +20%。',
    wishes: [
      '想和你一起在热厨试一道新研发的秘制芝士焗龙虾',
      '想在闭店后喝一杯手冲咖啡，聊聊各自最爱的老味道',
      '想趁筹备前去早市挑两把最新鲜的蒜薹与紫苏',
    ],
    quests: [
      {
        stage: 1,
        minChapter: 1,
        phaseHint: 'PREP',
        sceneId: 'hot_kitchen',
        title: '第1幕 · 米其林厨师与铁板明档',
        lines: [
          {
            speaker: '沈知微',
            title: '热厨主厨',
            text: '“店长，这口铁板火候太棒了。以前在高级餐厅，我隔着厚厚的墙做菜，从没听过食客咬下第一口烤生蚝时的惊叹声。”',
            accentColor: '#F97316',
          },
        ],
        choices: [
          {
            id: 'shen1_a',
            label: '“那就在熟食区放开手脚，让每一桌客人都尝到你滚烫的诚意！”',
            hint: '沈知微好感 +22 · 匠心 +1 · 熟食区瞬间满仓',
            affectionDelta: { staffId: 'shen_zhiwei', amount: 22 },
            philosophyDelta: { CRAFT: 1 },
            staffPath: { staffId: 'shen_zhiwei', path: 'DEVOTION' },
            outcomeText: '沈知微系上围裙，眉眼舒展：“好，今晚的蒜蓉粉丝蒸扇贝，保证香透整条街。”',
          },
          {
            id: 'shen1_b',
            label: '“把星级技法融入自助热菜，咱们打造全城独一无二的星厨熟食档！”',
            hint: '沈知微好感 +18 · 商业帝国 +1 · 口碑 +3',
            affectionDelta: { staffId: 'shen_zhiwei', amount: 18 },
            philosophyDelta: { EMPIRE: 1 },
            reputationDelta: 3,
            staffPath: { staffId: 'shen_zhiwei', path: 'AMBITION' },
            outcomeText: '沈知微轻笑点头：“降维打击？听起来倒是一场令人兴奋的厨艺实验。”',
          },
        ],
      },
      {
        stage: 2,
        minChapter: 2,
        phaseHint: 'CLOSING',
        sceneId: 'hot_kitchen',
        title: '第2幕 · 高峰夜的猛火试炼',
        lines: [
          {
            speaker: '沈知微',
            title: '热厨主厨',
            text: '“今晚高峰期熟食几乎秒空，有位老客问我为什么不在五星酒店吹空调，要在这里守着油烟。我一时竟不知怎么回答……”',
            accentColor: '#F97316',
          },
        ],
        choices: [
          {
            id: 'shen2_a',
            label: '“因为你做的不是炫技的艺术品，而是能抚慰疲惫人心的热饭呀。”',
            hint: '沈知微好感 +24 · 烟火温情 +1',
            affectionDelta: { staffId: 'shen_zhiwei', amount: 24 },
            philosophyDelta: { WARMTH: 1 },
            outcomeText: '沈知微怔了片刻，低头温柔地笑了：“谢谢你替我说出了心里话。真庆幸遇到了你这位店长。”',
          },
          {
            id: 'shen2_b',
            label: '“别理闲话，等咱们扩建出顶级铁板烧烤区，让所有人刮目相看！”',
            hint: '沈知微好感 +18 · 资金 +¥160',
            affectionDelta: { staffId: 'shen_zhiwei', amount: 18 },
            cashDelta: 160,
            outcomeText: '沈知微燃起斗志，当晚便画出了新一代无烟明档铁板的改造草图。',
          },
        ],
      },
      {
        stage: 3,
        minChapter: 3,
        phaseHint: 'PREP',
        sceneId: 'hot_kitchen',
        title: '第3幕 · 避风塘的秘方',
        lines: [
          {
            speaker: '沈知微',
            title: '热厨主厨',
            text: '“我翻遍了古籍和粤菜老谱，终于调出了一款金蒜面包糠配海鲜的绝妙比例！店长，你是第一个试吃的人，快张嘴尝尝？”',
            accentColor: '#F97316',
          },
        ],
        choices: [
          {
            id: 'shen3_a',
            label: '细细品尝后竖起大拇指：“外酥里嫩鲜到骨子里，以后这就是咱们的镇店招牌！”',
            hint: '沈知微好感 +24 · 口碑 +5',
            affectionDelta: { staffId: 'shen_zhiwei', amount: 24 },
            reputationDelta: 5,
            outcomeText: '沈知微眼底漾起笑意，悄悄帮你擦去嘴角一点金蒜屑：“合你胃口，比拿三颗星还开心。”',
          },
        ],
      },
      {
        stage: 4,
        minChapter: 4,
        phaseHint: 'CLOSING',
        sceneId: 'dormitory',
        title: '第4幕 · 巴黎故友的来信',
        lines: [
          {
            speaker: '沈知微',
            title: '热厨主厨',
            text: '“昔日巴黎餐厅的主厨寄来信，说只要我回去就能接任行政总厨。可我看着今晚热厨收档后你端来的那碗夜宵面，答案其实早就写好了。”',
            accentColor: '#F97316',
          },
        ],
        choices: [
          {
            id: 'shen4_a',
            label: '“无论你想留在这口灶台，还是去更大的舞台，我都陪你一起走。”',
            hint: '沈知微好感 +25 · 锁定相守羁绊',
            affectionDelta: { staffId: 'shen_zhiwei', amount: 25 },
            staffPath: { staffId: 'shen_zhiwei', path: 'DEVOTION' },
            outcomeText: '沈知微把回绝信折成纸船，温柔注视着你：“我的舞台，就在有你的这盏灶火旁。”',
          },
          {
            id: 'shen4_b',
            label: '“以后咱们把东方沸鼎开到巴黎去，让世界排队来尝你的菜！”',
            hint: '沈知微好感 +22 · 商业共进 · 资金 +¥240',
            affectionDelta: { staffId: 'shen_zhiwei', amount: 22 },
            cashDelta: 240,
            staffPath: { staffId: 'shen_zhiwei', path: 'AMBITION' },
            outcomeText: '沈知微朗声大笑：“好大的魄力！那我这个总厨，就陪你打下海外江山！”',
          },
        ],
      },
      {
        stage: 5,
        minChapter: 5,
        phaseHint: 'CLOSING',
        sceneId: 'hot_kitchen',
        title: '第5幕 · 炉火长明',
        lines: [
          {
            speaker: '沈知微',
            title: '星级热厨总主厨',
            text: '“这一路走过春夏秋冬，我终于明白顶级料理的秘密不是松露鱼子酱，而是和你一起在闭店后的热厨里，共享那锅冒着热气的鲜汤。”',
            accentColor: '#F97316',
          },
        ],
        choices: [
          {
            id: 'shen5_a',
            label: '“往后余生，每一季的新菜都由我们一起试味吧。”',
            hint: '沈知微个人线圆满完结 · 好感拉满 +25 · 口碑 +5',
            affectionDelta: { staffId: 'shen_zhiwei', amount: 25 },
            reputationDelta: 5,
            outcomeText: '热厨暖黄的灯光将两人的影子拉得很长，沈知微把刻着两人名字的铜勺放进了纪念匣。',
          },
        ],
      },
    ],
  },
  {
    id: 'su_xingyao',
    name: '苏星遥',
    title: '星级礼宾大堂',
    role: 'HOST',
    color: '#F472B6',
    favoriteScene: 'office',
    recruitChapter: 1,
    recruitCost: 150,
    dailyWage: 40,
    bio: '温柔机敏的前星级宴会礼宾，过目不忘，能记住每一位熟客偏好的锅底与忌口，是门面当之无愧的定海神针。',
    bonusTitle: '春风迎宾（特聘）',
    bonusDetail: '不占常规编制！高速带位，排队耐心衰减 -50%，VIP 概率大幅提升，进店好感拉满。',
    wishes: [
      '想和你去海滨栈道看一次落日，远离喧嚣歇半天',
      '想在店长办公室一起整理熟客手账，喝杯桂花乌龙',
      '想要一束街角花店的洋桔梗摆在迎宾台前',
    ],
    quests: [
      {
        stage: 1,
        minChapter: 1,
        phaseHint: 'PREP',
        sceneId: 'office',
        title: '第1幕 · 熟客手账的秘密',
        lines: [
          {
            speaker: '苏星遥',
            title: '大堂礼宾官',
            text: '“店长早安！你看我整理的这本《潮鲜客谱》：三号桌阿姨不能吃辣、周五总来那对情侣最爱蒜蓉蒸扇贝……记住客人的小习惯，他们就会把这里当第二个家。”',
            accentColor: '#F472B6',
          },
        ],
        choices: [
          {
            id: 'su1_a',
            label: '“太细心了！以后迎宾台和大堂礼宾全权交给你，客人们一定爱死这里。”',
            hint: '苏星遥好感 +22 · 烟火温情 +1 · 口碑 +4',
            affectionDelta: { staffId: 'su_xingyao', amount: 22 },
            philosophyDelta: { WARMTH: 1 },
            reputationDelta: 4,
            staffPath: { staffId: 'su_xingyao', path: 'DEVOTION' },
            outcomeText: '苏星遥眉眼弯弯：“能遇到懂得珍惜人情味的店长，真是我今年最大的幸运呢。”',
          },
          {
            id: 'su1_b',
            label: '“把这套熟客体系做成会员黑卡制度，锁定全城高净值回头客！”',
            hint: '苏星遥好感 +18 · 商业帝国 +1 · 资金 +¥120',
            affectionDelta: { staffId: 'su_xingyao', amount: 18 },
            philosophyDelta: { EMPIRE: 1 },
            cashDelta: 120,
            staffPath: { staffId: 'su_xingyao', path: 'AMBITION' },
            outcomeText: '苏星遥嫣然一笑：“好眼光！我明天就设计出第一批鎏金会员卡。”',
          },
        ],
      },
      {
        stage: 2,
        minChapter: 2,
        phaseHint: 'CLOSING',
        sceneId: 'office',
        title: '第2幕 · 暴雨夜的热姜汤',
        lines: [
          {
            speaker: '苏星遥',
            title: '大堂礼宾官',
            text: '“今晚突降暴雨，有几桌没带伞的客人本来焦躁得要发火，我临时煮了热姜汤又借出备用的雨伞，最后他们不但没投诉，还多给了双倍小费呢！”',
            accentColor: '#F472B6',
          },
        ],
        choices: [
          {
            id: 'su2_a',
            label: '披上干毛巾替她擦去发梢雨滴：“照顾好别人之前，也要记得照顾好自己呀。”',
            hint: '苏星遥好感 +24 · 烟火温情 +1',
            affectionDelta: { staffId: 'su_xingyao', amount: 24 },
            philosophyDelta: { WARMTH: 1 },
            outcomeText: '苏星遥双颊泛红，小声嘟囔：“店长突然这么近……心跳都要被你听见了。”',
          },
        ],
      },
      {
        stage: 3,
        minChapter: 3,
        phaseHint: 'PREP',
        sceneId: 'dormitory',
        title: '第3幕 · 星级酒店的挖角',
        lines: [
          {
            speaker: '苏星遥',
            title: '大堂礼宾官',
            text: '“昨天那家海景度假酒店的猎头找我，开出双倍薪水请我去做大堂经理……但我拒绝了。店长，你会不会觉得我很傻？”',
            accentColor: '#F472B6',
          },
        ],
        choices: [
          {
            id: 'su3_a',
            label: '“不傻，我也绝不会亏待你——这里未来的大堂总监与分红合伙人非你莫属！”',
            hint: '苏星遥好感 +24 · 口碑 +4',
            affectionDelta: { staffId: 'su_xingyao', amount: 24 },
            reputationDelta: 4,
            outcomeText: '苏星遥笑得像绽开的洋桔梗：“分红什么的倒在其次，我只是舍不得离开有你的地方。”',
          },
        ],
      },
      {
        stage: 4,
        minChapter: 4,
        phaseHint: 'CLOSING',
        sceneId: 'office',
        title: '第4幕 · 深夜账本与星光',
        lines: [
          {
            speaker: '苏星遥',
            title: '大堂礼宾官',
            text: '“每次闭店后陪你在办公室核对账本，听着外面海浪声，我都觉得哪怕每天忙到脚酸，也特别踏实。店长，你心里的未来蓝图里……有我的位置吗？”',
            accentColor: '#F472B6',
          },
        ],
        choices: [
          {
            id: 'su4_a',
            label: '“从第一天起，蓝图里最亮的星星就是你。”',
            hint: '苏星遥好感 +25 · 锁定相守羁绊',
            affectionDelta: { staffId: 'su_xingyao', amount: 25 },
            staffPath: { staffId: 'su_xingyao', path: 'DEVOTION' },
            outcomeText: '苏星遥眼眸晶亮，轻轻依偎在桌旁：“那说好了，拉钩不许赖账哦。”',
          },
        ],
      },
      {
        stage: 5,
        minChapter: 5,
        phaseHint: 'CLOSING',
        sceneId: 'office',
        title: '第5幕 · 客谱终章与余生',
        lines: [
          {
            speaker: '苏星遥',
            title: '首席礼宾合伙人',
            text: '“《潮鲜客谱》已经写满整整三大册啦！但最后一页我一直空着——因为那页，我想用来写我们两个人的四季故事。”',
            accentColor: '#F472B6',
          },
        ],
        choices: [
          {
            id: 'su5_a',
            label: '“那就从今晚打烊后开始，一起写满往后的每一年春夏秋冬。”',
            hint: '苏星遥个人线圆满完结 · 好感拉满 +25 · 口碑 +5',
            affectionDelta: { staffId: 'su_xingyao', amount: 25 },
            reputationDelta: 5,
            outcomeText: '苏星遥郑重在客谱末页落下两人的签名。她的专属完美结局已永恒镌刻！',
          },
        ],
      },
    ],
  },
];

export function getSpecialStaffDef(id: SpecialStaffId): SpecialStaffDef {
  return SPECIAL_STAFF_CATALOG.find((s) => s.id === id)!;
}

export function createSpecialStaffCandidate(id: SpecialStaffId): StaffCandidate {
  const def = getSpecialStaffDef(id);
  return {
    candidateId: `special_partner_${id}`,
    name: def.name,
    role: def.role,
    tier: 3,
    hireCost: def.recruitCost,
    dailyWage: def.dailyWage,
    moveSpeed: 235,
    workSpeed: 2.6,
    carryCapacity: 3,
    bonusTitle: def.bonusTitle,
    bonusDetail: def.bonusDetail,
    bonusValue: def.role === 'CHEF' ? 5 : def.role === 'HOST' ? 0.5 : 0.2,
    isSpecial: true,
    specialStaffId: id,
  };
}

export function createSpecialStaffTemplate(which: 'ZHOU' | 'AJING'): StaffCandidate {
  if (which === 'ZHOU') {
    return {
      candidateId: `special_zhou_${Date.now()}`,
      name: '周老灶·国宴宗师',
      role: 'RUNNER',
      tier: 4,
      hireCost: 0,
      dailyWage: 45,
      moveSpeed: 285,
      workSpeed: 3.4,
      carryCapacity: 4,
      bonusTitle: '国宴沸鼎神韵',
      bonusDetail: '特聘传奇上锅员：上锅小费+75%，就餐满意度拉满，翻台极速+45%！',
      bonusValue: 0.75,
      isSpecial: true,
    };
  }
  return {
    candidateId: `special_ajing_${Date.now()}`,
    name: '阿镜·洗消专员',
    role: 'DISHWASHER',
    tier: 4,
    hireCost: 0,
    dailyWage: 40,
    moveSpeed: 260,
    workSpeed: 3.2,
    carryCapacity: 6,
    bonusTitle: '纳米高温闪亮杀菌',
    bonusDetail: '特聘传奇洗碗工：单次洗净6套餐具，每次清洗恢复全店卫生+6！',
    bonusValue: 6,
    isSpecial: true,
  };
}

// ==========================================
// 7 BACKSTAGE FACILITY INTERACTIVE STORY EVENTS
// ==========================================

export function buildFacilitySceneEvent(
  sceneId: FacilitySceneId,
  world: GameWorld
): StoryModalEvent {
  const charDef = getCharacterDef(world.characterId);
  switch (sceneId) {
    case 'cold_storage':
      return {
        id: `scene_evt_cold_${world.day}`,
        category: 'FACILITY_SCENE',
        badge: '场馆互动 · 粗加工与冷链库房',
        speakerName: '老码头渔货员',
        speakerTitle: '冷链卸货通道',
        accentColor: '#38BDF8',
        headline: '卸货通道的意外鲜货',
        body: '清晨冷链车刚靠岸，渔货员从暂养活水箱里捞出一筐刚上岸的顶级海捕鲜货，问你要不要顺手吃下这批尾单？',
        choices: [
          {
            id: 'cold_buy',
            label: '“全收了！给冷库和活鲜池加满料。”（花费 ¥60）',
            hint: '原料库 +18 · 活鲜含氧与口碑小幅提升',
            cashDelta: -60,
            reputationDelta: 2,
            philosophyDelta: { CRAFT: 1 },
            outcomeText: '冷库里瞬间摆满活蹦乱跳的鲜货，今天熟食和冰台的鲜味稳了！',
          },
          {
            id: 'cold_inspect',
            label: '“先抽检冰温和水质，合格的部分按批发价拿走。”',
            hint: '无额外花费 · 原料库 +8 · 卫生 +3',
            philosophyDelta: { EMPIRE: 1 },
            outcomeText: '你严谨的品控赢得了货车司机的敬意，对方爽快送了半筐赠品。',
          },
        ],
      };
    case 'hot_kitchen':
      return {
        id: `scene_evt_hot_${world.day}`,
        category: 'FACILITY_SCENE',
        badge: '场馆互动 · 热厨与出品间',
        speakerName: charDef.name,
        speakerTitle: '热厨试味巡检',
        accentColor: '#F97316',
        headline: '铁板试味与动线优化',
        body: '你巡视热厨出品间，灶头大火正旺，蒜蓉油与烤蚝汁滋滋作响。厨师们正请示今天的主打热菜风味方向。',
        choices: [
          {
            id: 'hot_boost',
            label: '亲自掌勺调校火候，现出一批招牌熟食送往明档！',
            hint: '熟食库存 +4 · 口碑 +2',
            reputationDelta: 2,
            philosophyDelta: { CRAFT: 1 },
            outcomeText: '滚烫金黄的蒸贝与烤虾迅速摆满熟食台，香气瞬间飘满整个大厅！',
          },
          {
            id: 'hot_flow',
            label: '重新梳理热厨补货动线，让出餐避开顾客取餐主通道。',
            hint: '员工效率提升 · 卫生 +3',
            philosophyDelta: { EMPIRE: 1 },
            outcomeText: '独立补货通道畅通无阻，传菜与补货再也不怕撞车了！',
          },
        ],
      };
    case 'dish_washroom':
      return {
        id: `scene_evt_wash_${world.day}`,
        category: 'FACILITY_SCENE',
        badge: '场馆互动 · 餐具回收与洗消间',
        speakerName: '洗消班组',
        speakerTitle: '餐具分拣与高温消毒',
        accentColor: '#A78BFA',
        headline: '海鲜壳分拣与高温消杀',
        body: '回收通道堆了不少虾壳蟹壳与待洗餐盘，若不及时分类冲淋容易产生海鲜腥味。',
        choices: [
          {
            id: 'wash_deep',
            label: '开启高温蒸汽深度消杀并彻底分拣海鲜壳垃圾！',
            hint: '卫生 +6 · 加快脏碗清理',
            reputationDelta: 1,
            philosophyDelta: { CRAFT: 1 },
            outcomeText: '洗消间亮如明镜，空气中只剩下清爽的柠檬消毒清香。',
          },
        ],
      };
    case 'restroom':
      return {
        id: `scene_evt_restroom_${world.day}`,
        category: 'FACILITY_SCENE',
        badge: '场馆互动 · 卫生间与洗手区',
        speakerName: '大堂巡视记录',
        speakerTitle: '海鲜餐厅高频洗手区',
        accentColor: '#2DD4BF',
        headline: '去腥洗手液与香氛补给',
        body: '刚剥完基围虾和螃蟹的客人纷纷来到洗手台洗手。你发现去腥柠檬洗手液和擦手纸快见底了。',
        choices: [
          {
            id: 'restroom_vip',
            label: '换上高级柠檬海盐去腥洗手液与温热毛巾（花费 ¥35）',
            hint: '卫生间洁净度拉满 100 · 口碑 +3',
            cashDelta: -35,
            reputationDelta: 3,
            philosophyDelta: { WARMTH: 1 },
            outcomeText: '客人们洗完手连连夸赞：“连洗手间都这么讲究去海鲜腥味，这家店太用心了！”',
          },
          {
            id: 'restroom_std',
            label: '亲自清理台面水渍并补足常规洗手液。',
            hint: '卫生间洁净度大幅恢复 · 卫生 +2',
            outcomeText: '台面焕然一新，清爽洁净。',
          },
        ],
      };
    case 'equipment_room':
      return {
        id: `scene_evt_equip_${world.day}`,
        category: 'FACILITY_SCENE',
        badge: '场馆互动 · 设备间检修',
        speakerName: '机电巡检警报',
        speakerTitle: '制冷 / 制冰 / 增氧与油水分离',
        accentColor: '#94A3B8',
        headline: '制冰机与增氧泵例行点检',
        body: '设备间里制冷机组低鸣运转，你注意到油水分离器滤网略有堆积，活鲜缸增氧泵压力也有些偏低。',
        choices: [
          {
            id: 'equip_full',
            label: '更换全新滤芯并校准制冷制冰机组（花费 ¥50）',
            hint: '设备耐久恢复至 100% · 冷链稳固',
            cashDelta: -50,
            philosophyDelta: { CRAFT: 1 },
            outcomeText: '随着一声清脆启动音，制冰机与增氧泵恢复满负荷静音运行！',
          },
          {
            id: 'equip_diy',
            label: '亲自清洗滤网、紧固管路，省下一笔维修费。',
            hint: '设备耐久恢复 +28%',
            outcomeText: '一番满头大汗的检修后，各项仪表指针回到了安全绿区。',
          },
        ],
      };
    case 'dormitory':
      return {
        id: `scene_evt_dorm_${world.day}`,
        category: 'FACILITY_SCENE',
        badge: '场馆互动 · 员工宿舍',
        speakerName: '宿舍夜话',
        speakerTitle: '伙伴休憩港湾',
        accentColor: '#F472B6',
        headline: '热气腾腾的员工宵夜',
        body: '结束奔忙后，宿舍客厅里飘着电饭煲的米香。伙伴们一边泡脚一边聊起白天遇到的有趣食客。',
        choices: [
          {
            id: 'dorm_treat',
            label: '自掏腰包加餐海鲜砂锅粥慰问全员！（花费 ¥55）',
            hint: '全员消除疲劳、士气大涨 · 全体特殊店员好感 +6',
            cashDelta: -55,
            philosophyDelta: { WARMTH: 1 },
            outcomeText: '满屋笑声回荡，大家喝着热粥约定明天一起把门店翻台率再刷新高！',
          },
          {
            id: 'dorm_chat',
            label: '坐下来听听大家的吐槽，记下改善排班的建议。',
            hint: '全员疲劳小幅缓解 · 烟火温情 +1',
            philosophyDelta: { WARMTH: 1 },
            outcomeText: '坦诚的交流让团队彼此更加信任，宿舍氛围温暖如家。',
          },
        ],
      };
    case 'office':
    default:
      return {
        id: `scene_evt_office_${world.day}`,
        category: 'FACILITY_SCENE',
        badge: '场馆互动 · 店长办公室',
        speakerName: charDef.name,
        speakerTitle: '经营复盘与策略',
        accentColor: '#E8C97A',
        headline: '账簿上的四季商机',
        body: '办公桌上摊开着当日考勤表、当季渔货报价单和客流画像，你可以趁此刻微调经营节奏。',
        choices: [
          {
            id: 'office_promo',
            label: '在本地社区推送当季鲜味海报，吸引精准食客！',
            hint: '口碑 +3 · 商业洞察 +1',
            reputationDelta: 3,
            philosophyDelta: { EMPIRE: 1 },
            outcomeText: '海报发出不到一小时，门店收藏量节节攀升！',
          },
          {
            id: 'office_bonus',
            label: '给表现最勤恳的员工签发全勤嘉奖条（花费 ¥40）',
            hint: '全员士气高涨 · 烟火温情 +1',
            cashDelta: -40,
            philosophyDelta: { WARMTH: 1 },
            outcomeText: '嘉奖条贴上公告栏，整个后厨与大堂顿时干劲十足！',
          },
        ],
      };
  }
}

// ==========================================
// 4-DIMENSION DYNAMIC MULTI-ENDING GENERATOR
// ==========================================

export function buildEndingEpilogue(world: GameWorld): EndingEpilogueReport {
  const { CRAFT, EMPIRE, WARMTH } = world.storyPhilosophy;
  let dominant: StoryPhilosophy = 'CRAFT';
  if (EMPIRE >= CRAFT && EMPIRE >= WARMTH) dominant = 'EMPIRE';
  else if (WARMTH >= CRAFT && WARMTH >= EMPIRE) dominant = 'WARMTH';

  const charDef = getCharacterDef(world.characterId);
  const allZonesBuilt = world.unlockedZones.length >= 7;
  const partnerId = world.activePartnerId;
  const partnerDef = partnerId ? getSpecialStaffDef(partnerId) : null;
  const partnerState = partnerId ? world.specialStaffBonds[partnerId] : null;
  const isHappilyMarried = Boolean(
    partnerDef && partnerState && partnerState.relationship === 'MARRIED' && partnerState.partnerBond >= 60
  );
  const isDating = Boolean(
    partnerDef && partnerState && partnerState.relationship === 'DATING'
  );

  // 1. Shop Ending
  let shopEnding = {
    title: '《百年潮鲜 · 传世匠心老号》',
    summary:
      `“潮鲜沸鼎”拒绝了盲目加盟，坚守活鲜直采与四季应季锅底。${
        allZonesBuilt ? '七大顶级海鲜自助明档齐备，从活捞海鲜缸到刺身与铁板烧烤皆成行业教科书，' : ''
      }每年都有无数饕客专程乘飞机前来打卡，成为载入城市美食典籍的百年传奇老字号。`,
  };
  if (dominant === 'EMPIRE') {
    shopEnding = {
      title: '《沸鼎扬帆 · 跨海餐饮帝国》',
      summary:
        `从街角四张木桌起家，“潮鲜沸鼎”凭借自建深海冷链、标准化明档与精准的餐位分层策略成功登陆资本市场。${
          allZonesBuilt ? '旗下七大主题海鲜体验区风靡亚洲各大港口城市，' : ''
        }五年内开出八十余家星级海鲜殿堂，彻底改写了现代海鲜自助的商业版图。`,
    };
  } else if (dominant === 'WARMTH') {
    shopEnding = {
      title: '《港湾红灯 · 永不打烊的深夜食堂》',
      summary:
        `尽管早已声名远播，“潮鲜沸鼎”依旧保留着门口那排暖红纸灯笼与贴满手写祝福的迎宾墙。${
          allZonesBuilt ? '丰盛的七大明档让老街坊与远方来客都能各得其乐，' : ''
        }一代代港城人在这里庆祝升职、求婚与重逢，成为整座城市最温柔的情感地标。`,
    };
  }

  // 2. Manager Future Life Ending
  const loveSuffix = isHappilyMarried
    ? `事业登顶后，你与伴侣「${partnerDef!.name}」在海风拂面的港湾举行了盛大而温暖的婚礼。你们在繁忙之余始终牢记彼此约定，携手把滚烫烟火过成了最羡慕的细水长流。`
    : isDating
      ? `你与恋人「${partnerDef!.name}」在共同打拼的岁月里彼此成就，约定下一个休渔季便环海自驾，把恋爱的甜蜜延续到未来每一站。`
      : '你把满腔热忱倾注于滚沸汤鼎与四海食客之间，活成了港城餐饮界最潇洒自在的传奇人物。';

  const managerTitleMap: Record<CharacterId, Record<StoryPhilosophy, string>> = {
    harbor_heir: {
      CRAFT: '潮汕海味一代宗师',
      EMPIRE: '深海冷链商业巨擘',
      WARMTH: '渔港守灯人',
    },
    hotel_director: {
      CRAFT: '东方餐桌美学泰斗',
      EMPIRE: '星级餐饮集团掌门人',
      WARMTH: '城市待客之魂',
    },
    broth_artisan: {
      CRAFT: '中华汤鼎非遗传承人',
      EMPIRE: '江湖沸鼎品牌创始人',
      WARMTH: '烟火暖汤守护者',
    },
  };

  const managerSummaryMap: Record<CharacterId, string> = {
    harbor_heir: `林潮生没有辜负三代渔船先辈的嘱托，不仅让远洋直采活鲜走进千家万户，还创立了青年渔民合作社，让古老渔港焕发新生。${loveSuffix}`,
    hotel_director: `苏婉清用润物无声的服务哲学证明，顶级待客之道不在冰冷的奢华，而在滚烫的锅气与真诚的微笑。她撰写的礼宾手记被多所高校列为经典教材。${loveSuffix}`,
    broth_artisan: `陆铁锅带着那口走遍江湖的秘汤大锅名震四海，收徒百余人，无论走到哪座城市，总有人在微寒的夜里念起他熬出的那一口金汤鲜味。${loveSuffix}`,
  };

  // 3. Special Staff Future Life Endings
  const staffEndings: EndingEpilogueReport['staffEndings'] = [];

  for (const def of SPECIAL_STAFF_CATALOG) {
    const bond = world.specialStaffBonds[def.id];
    if (!bond.recruited && bond.storyStage === 0) continue;

    let relationBadge = '并肩挚友';
    let summary = '';

    if (bond.relationship === 'MARRIED') {
      relationBadge = bond.partnerBond >= 60 ? '恩爱伴侣 · 百年好合' : '结发伴侣 · 历经风雨';
      summary =
        bond.partnerBond >= 60
          ? `与你喜结连理的${def.name}不仅完成了全部心愿，更在店里独当一面。每晚闭店后的二人夜宵与海边漫步，成了你们维系一生的浪漫仪式。`
          : `${def.name}与你携手步入婚姻殿堂，虽曾因忙碌略有疏离，但终在共同的信念中重拾默契，彼此守护着这个来之不易的家。`;
    } else if (bond.relationship === 'DATING') {
      relationBadge = '热恋伴侣';
      summary = `${def.name}一直陪伴在你身侧，见证了门店的每一次蜕变。随着主线圆满落幕，你们决定放慢脚步，给彼此更多独处的温柔时光。`;
    } else if (bond.storyStage >= 5) {
      relationBadge = bond.storyPathChoice === 'AMBITION' ? '黄金合伙人' : '灵魂战友';
      summary =
        bond.storyPathChoice === 'AMBITION'
          ? `走完五幕成长历程的${def.name}成为你的核心事业合伙人，在各自专业领域声名鹊起，引领着新一代海鲜餐饮人才。`
          : `完成全部心路蜕变的${def.name}选择扎根总店，将多年积累的绝活毫无保留地传授给后辈，成为店里最受敬仰的支柱。`;
    } else {
      relationBadge = `默契同袍（剧情 ${bond.storyStage}/5）`;
      summary = `${def.name}在“潮鲜沸鼎”的历练中收获了宝贵经验，未来无论留在店中还是奔赴远方，这段热火朝天的记忆都将熠熠生辉。`;
    }

    staffEndings.push({
      name: def.name,
      roleTitle: def.title,
      relationBadge,
      summary,
      color: def.color,
    });
  }

  // Also include Special Customer recruited masters (周老灶 & 阿镜) if unlocked!
  if (world.specialStories.master_zhou.completed) {
    staffEndings.push({
      name: '周老灶',
      roleTitle: '隐退国宴汤锅宗师',
      relationBadge: '忘年恩师',
      summary:
        '重出江湖的周老灶在滚沸汤鼎间找回了年轻时的热忱，最终将毕生汤谱整理成册赠予门店，安享含饴弄孙、每日喝一碗头汤的惬意晚年。',
      color: '#2DD4BF',
    });
  }
  if (world.specialStories.inspector_cheng.completed) {
    staffEndings.push({
      name: '阿镜',
      roleTitle: '纳米高温洗消圣手',
      relationBadge: '食安守护神',
      summary:
        '阿镜设计的“海鲜自助零异味洗消动线”被行业广泛采纳，他也从洗消专员成长为全城知名的餐饮食安顾问。',
      color: '#38BDF8',
    });
  }

  // 4. Era / Times Change Ending
  const eraFlag = world.storyFlags.ch5 || world.storyFlags.ch3;
  let eraEnding = {
    title: '《碧海潮生 · 四季鲜食新时代》',
    summary:
      '二十年后，港城彻底告别了粗放低价的冻货时代。受你当年“顺应四季、不时不食”理念的深远影响，海洋生态休养生息，每逢开海季与冬至沸锅节，全城灯火如昼，成为世界闻名的可持续海鲜美食之都。',
  };
  if (eraFlag === 'global_coldchain' || dominant === 'EMPIRE') {
    eraEnding = {
      title: '《冷链通四海 · 港城全球味觉枢纽》',
      summary:
        '二十年后，高速智慧冷链与远洋活鲜航线将这座港口城市推向世界舞台。曾经偏居一隅的小码头崛起为国际海洋美食中心，东方海鲜自助火锅文化随着潮鲜沸鼎的航迹风靡全球。',
    };
  } else if (eraFlag === 'harbor_alliance' || dominant === 'WARMTH') {
    eraEnding = {
      title: '《十里红灯 · 永不消逝的港湾烟火》',
      summary:
        '二十年后，即便高楼林立、智能机器人遍布大街，老码头沿岸仍完整保留着当年你发起的港城夜市联盟。每当夜幕降临，海风吹拂着十里红灯笼与升腾的火锅热气，守护着这座城市最珍贵的人间温情。',
    };
  }

  return {
    overallTitle:
      dominant === 'CRAFT'
        ? '终局评定 · 一代海味匠心传奇'
        : dominant === 'EMPIRE'
          ? '终局评定 · 跨海沸鼎商业霸主'
          : '终局评定 · 港湾不熄烟火传说',
    dominantPhilosophy: dominant,
    shopEnding,
    managerEnding: {
      title: `${charDef.name} · ${managerTitleMap[world.characterId][dominant]}`,
      summary: managerSummaryMap[world.characterId],
    },
    staffEndings,
    eraEnding,
  };
}
