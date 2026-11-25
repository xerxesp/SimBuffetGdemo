import {
  DecorThemeId,
  HolidayId,
  MarketingCampaignId,
  SeasonId,
  WeatherId,
} from '../types/game';

// ============================================================================
// 1. DYNAMIC WEATHER DEFINITIONS
// ============================================================================

export interface WeatherDef {
  id: WeatherId;
  name: string;
  shortName: string;
  color: string;
  customerRateMult: number;
  costMultiplier: number;
  patienceMult: number; // >1 = faster patience decay, <1 = slower
  tipBonus: number;
  description: string;
}

export const WEATHER_CATALOG: Record<WeatherId, WeatherDef> = {
  SUNNY: {
    id: 'SUNNY',
    name: '晴朗海风',
    shortName: '晴',
    color: '#F6DA8D',
    customerRateMult: 1.0,
    costMultiplier: 1.0,
    patienceMult: 1.0,
    tipBonus: 0,
    description: '海港天朗气清，客流平稳，冷链到货准时。',
  },
  RAINY: {
    id: 'RAINY',
    name: '海滨细雨',
    shortName: '雨',
    color: '#7DD3FC',
    customerRateMult: 1.14,
    costMultiplier: 1.05,
    patienceMult: 0.92,
    tipBonus: 0.05,
    description: '绵绵细雨最宜围炉吃锅！客流 +14%，顾客更愿慢慢品味，小费 +5%。',
  },
  TYPHOON: {
    id: 'TYPHOON',
    name: '台风过境',
    shortName: '台风',
    color: '#A78BFA',
    customerRateMult: 1.26,
    costMultiplier: 1.32,
    patienceMult: 0.88,
    tipBonus: 0.12,
    description: '渔船避风导致冷链进价 ×1.32，但避风食客涌入吃热锅：客流 +26%，小费 +12%！',
  },
  HEATWAVE: {
    id: 'HEATWAVE',
    name: '盛夏酷暑',
    shortName: '酷暑',
    color: '#FB923C',
    customerRateMult: 0.96,
    costMultiplier: 0.95,
    patienceMult: 1.12,
    tipBonus: 0.04,
    description: '天气燥热顾客耐心略易下滑，但冰鲜采购价略降 5%，酒水甜品与冷饮备受欢迎。',
  },
  SNOWY: {
    id: 'SNOWY',
    name: '冬日飞雪',
    shortName: '雪',
    color: '#E0F2FE',
    customerRateMult: 1.32,
    costMultiplier: 1.15,
    patienceMult: 0.9,
    tipBonus: 0.14,
    description: '寒潮降雪火锅旺季爆发！客流 +32%，小费 +14%，海鲜冷链运输费 +15%。',
  },
};

export function getWeatherDef(id: WeatherId): WeatherDef {
  return WEATHER_CATALOG[id] ?? WEATHER_CATALOG.SUNNY;
}

// ============================================================================
// 2. SEASONAL HOLIDAYS & FESTIVALS
// ============================================================================

export interface HolidayDef {
  id: HolidayId;
  name: string;
  shortName: string;
  color: string;
  customerRateMult: number;
  costMultiplier: number;
  vipBonus: number;
  tipBonus: number;
  description: string;
}

export const HOLIDAY_CATALOG: Record<HolidayId, HolidayDef> = {
  NONE: {
    id: 'NONE',
    name: '平日营业',
    shortName: '',
    color: '#C5AE92',
    customerRateMult: 1.0,
    costMultiplier: 1.0,
    vipBonus: 0,
    tipBonus: 0,
    description: '常规营业日。',
  },
  GOLDEN_WEEK: {
    id: 'GOLDEN_WEEK',
    name: '港湾黄金周',
    shortName: '黄金周',
    color: '#FBBF24',
    customerRateMult: 1.38,
    costMultiplier: 1.05,
    vipBonus: 0.08,
    tipBonus: 0.1,
    description: '春季第 5 天旅游客流暴涨！进店客流 +38%，VIP 概率 +8%，小费 +10%。',
  },
  FISHING_OPEN: {
    id: 'FISHING_OPEN',
    name: '休渔开海季',
    shortName: '开海季',
    color: '#38BDF8',
    customerRateMult: 1.24,
    costMultiplier: 0.75,
    vipBonus: 0.05,
    tipBonus: 0.06,
    description: '夏季第 3 天千帆开海！冷链食材进货享 75 折狂欢，鲜货丰收客流 +24%！',
  },
  MID_AUTUMN: {
    id: 'MID_AUTUMN',
    name: '中秋蟹宴夜',
    shortName: '中秋节',
    color: '#F59E0B',
    customerRateMult: 1.35,
    costMultiplier: 1.08,
    vipBonus: 0.1,
    tipBonus: 0.16,
    description: '秋季第 4 天团圆赏月吃蟹！客流 +35%，小费 +16%，贵宾云集。',
  },
  NEW_YEAR_EVE: {
    id: 'NEW_YEAR_EVE',
    name: '岁末跨年沸宴',
    shortName: '跨年夜',
    color: '#F472B6',
    customerRateMult: 1.44,
    costMultiplier: 1.12,
    vipBonus: 0.15,
    tipBonus: 0.24,
    description: '冬季第 5 天全年最高潮！客流 +44%，VIP 概率 +15%，小费 +24%！',
  },
};

export function getHolidayForCalendar(season: SeasonId, dayInSeason: number): HolidayId {
  if (season === 'SPRING' && dayInSeason === 5) return 'GOLDEN_WEEK';
  if (season === 'SUMMER' && dayInSeason === 3) return 'FISHING_OPEN';
  if (season === 'AUTUMN' && dayInSeason === 4) return 'MID_AUTUMN';
  if (season === 'WINTER' && dayInSeason === 5) return 'NEW_YEAR_EVE';
  return 'NONE';
}

export function getHolidayDef(id: HolidayId): HolidayDef {
  return HOLIDAY_CATALOG[id] ?? HOLIDAY_CATALOG.NONE;
}

// ============================================================================
// 3. NEIGHBORHOOD RIVALS & CITY LEADERBOARD
// ============================================================================

export interface RivalTemplate {
  id: string;
  name: string;
  style: string;
  baseScore: number;
  growthPerDay: number;
  avgTicket: number;
  eventTitle: string;
  eventDesc: string;
  customerRateMult: number;
}

export const CITY_RIVALS: RivalTemplate[] = [
  {
    id: 'rival_1',
    name: '御龙湾海上皇宫',
    style: '顶级海鲜御宴 · 榜首霸主',
    baseScore: 760,
    growthPerDay: 2.2,
    avgTicket: 528,
    eventTitle: '御龙湾举办帝王蟹奢宴',
    eventDesc: '全城高端食客被吸引分流，近 2 日普通客流 -14%。可通过营销或高星装潢反击！',
    customerRateMult: 0.86,
  },
  {
    id: 'rival_2',
    name: '蓝鲸海景黑金自助',
    style: '奢华刺身日料厅',
    baseScore: 640,
    growthPerDay: 2.0,
    avgTicket: 438,
    eventTitle: '蓝鲸自助买单送波龙',
    eventDesc: '对手大打网红营销牌，近 2 日客流受到挤压（-12%）。',
    customerRateMult: 0.88,
  },
  {
    id: 'rival_3',
    name: '樱岚板前海鲜阁',
    style: '精致日料火锅',
    baseScore: 540,
    growthPerDay: 1.8,
    avgTicket: 358,
    eventTitle: '樱岚阁联名美食博主探店',
    eventDesc: '街区年轻客群涌向对面打卡，近 2 日客流 -10%。',
    customerRateMult: 0.9,
  },
  {
    id: 'rival_4',
    name: '金港湾蒸汽海鲜城',
    style: '活鲜蒸汽老字号',
    baseScore: 455,
    growthPerDay: 1.5,
    avgTicket: 298,
    eventTitle: '金港湾推出限时八折价格战',
    eventDesc: '同街区老字号降价抢客！近 2 日客流 -15%，建议开启团购或探店推广稳住客流。',
    customerRateMult: 0.85,
  },
  {
    id: 'rival_5',
    name: '南洋沸腾椰子鸡海鲜',
    style: '特色汤锅连锁',
    baseScore: 375,
    growthPerDay: 1.4,
    avgTicket: 248,
    eventTitle: '南洋汤锅新店开业发券',
    eventDesc: '街口新派连锁派发试吃券，近 2 日客流 -10%。',
    customerRateMult: 0.9,
  },
  {
    id: 'rival_6',
    name: '老码头生蚝烤炉馆',
    style: '夜宵铁板海鲜',
    baseScore: 305,
    growthPerDay: 1.2,
    avgTicket: 198,
    eventTitle: '老码头烤炉馆深夜促销',
    eventDesc: '平价烤生蚝吸引走一批夜宵客流（近 2 日客流 -12%）。',
    customerRateMult: 0.88,
  },
  {
    id: 'rival_7',
    name: '阿强平价虾贝自助',
    style: '街坊人气排档',
    baseScore: 240,
    growthPerDay: 1.0,
    avgTicket: 148,
    eventTitle: '阿强排档低价甩卖冻虾',
    eventDesc: '对面小馆压价抢生意，但口碑一般，仅造成轻微客流波动（-8%）。',
    customerRateMult: 0.92,
  },
  {
    id: 'rival_8',
    name: '海星小火锅便利店',
    style: '社区快餐锅',
    baseScore: 185,
    growthPerDay: 0.8,
    avgTicket: 118,
    eventTitle: '海星小锅推出午市特惠',
    eventDesc: '街坊客群略有分流（-6%）。',
    customerRateMult: 0.94,
  },
  {
    id: 'rival_9',
    name: '渔村砂锅粥大排档',
    style: '港边老摊位',
    baseScore: 135,
    growthPerDay: 0.5,
    avgTicket: 98,
    eventTitle: '渔村大排档夜市出摊',
    eventDesc: '对整体客流影响轻微（-5%）。',
    customerRateMult: 0.95,
  },
];

// ============================================================================
// 4. MARKETING CAMPAIGNS & EMERGENCY LOAN
// ============================================================================

export interface MarketingCampaignDef {
  id: MarketingCampaignId;
  name: string;
  cost: number; // negative means immediate cash inflow (prepaid)
  durationDays: number;
  customerRateMult: number;
  vipBonus: number;
  ticketDelta: number;
  reputationInstant: number;
  minReputation?: number;
  accentColor: string;
  summary: string;
  description: string;
}

export const MARKETING_CAMPAIGNS: MarketingCampaignDef[] = [
  {
    id: 'harbor_flyer',
    name: '码头商圈传单引流',
    cost: 120,
    durationDays: 2,
    customerRateMult: 1.24,
    vipBonus: 0.02,
    ticketDelta: 0,
    reputationInstant: 0,
    accentColor: '#38BDF8',
    summary: '2天 · 客流 +24% · 餐位不打折',
    description: '在港湾写字楼与码头广场发放试吃优惠单页，低成本快速拉升进店客流。',
  },
  {
    id: 'group_buy',
    name: '爆款限时团购冲量',
    cost: 180,
    durationDays: 3,
    customerRateMult: 1.42,
    vipBonus: 0,
    ticketDelta: -16,
    reputationInstant: 1,
    accentColor: '#FB923C',
    summary: '3天 · 客流 +42% · 餐位让利 ¥16',
    description: '上线全城热销海鲜自助团购券，薄利多销强势反击对手价格战，翻台收益暴涨！',
  },
  {
    id: 'food_blogger',
    name: '顶流食评达人探店',
    cost: 340,
    durationDays: 3,
    customerRateMult: 1.28,
    vipBonus: 0.14,
    ticketDelta: 0,
    reputationInstant: 4,
    accentColor: '#F472B6',
    summary: '3天 · 口碑 +4 · 客流 +28% · VIP +14%',
    description: '邀请全城百万粉丝美食探店博主直播沸锅与海鲜缸，立竿见影拉高口碑与高端客流！',
  },
  {
    id: 'vip_prepaid',
    name: '鎏金会员储值回笼',
    cost: -420,
    durationDays: 3,
    customerRateMult: 1.12,
    vipBonus: 0.06,
    ticketDelta: -18,
    reputationInstant: 0,
    minReputation: 60,
    accentColor: '#E8C97A',
    summary: '立得 +¥420 现金 · 3天每桌返利 ¥18',
    description: '向忠实熟客发售限量储值黑卡，瞬间回笼大笔现金周转，未来 3 天每桌略微让利返现。',
  },
];

// ============================================================================
// 5. FRONT-HALL INTERIOR DECOR THEMES (VISUALLY CHANGES CANVAS!)
// ============================================================================

export interface DecorThemeDef {
  id: DecorThemeId;
  name: string;
  cost: number;
  minShopLevel: number;
  ticketBonus: number;
  vipBonus: number;
  tipBonus: number;
  patienceReduction: number;
  rankScoreBonus: number;
  accentColor: string;
  description: string;
  perkSummary: string;
  // Visual palette hooks for renderer.ts
  floorTint: string;
  carpetFill: string;
  carpetTrim: string;
  beamFill: string;
  lanternGlowRgba: string;
  previewSwatches: [string, string, string];
}

export const DECOR_THEMES: DecorThemeDef[] = [
  {
    id: 'harbor_warm',
    name: '渔港红灯烟火风',
    cost: 0,
    minShopLevel: 1,
    ticketBonus: 0,
    vipBonus: 0,
    tipBonus: 0,
    patienceReduction: 0,
    rankScoreBonus: 0,
    accentColor: '#E8C97A',
    description: '经典的暖色原木地板、红毯迎宾道与摇曳红纸灯笼，满载质朴渔港沸腾烟火气。',
    perkSummary: '初始标配风格 · 温馨经典',
    floorTint: 'rgba(0,0,0,0)',
    carpetFill: '#5D1A1E',
    carpetTrim: '#C9953B',
    beamFill: '#6A3F25',
    lanternGlowRgba: 'rgba(255, 146, 62, 0.30)',
    previewSwatches: ['#4B2E20', '#7D1F23', '#E8C97A'],
  },
  {
    id: 'retro_mahogany',
    name: '南洋翡翠红木厅',
    cost: 680,
    minShopLevel: 2,
    ticketBonus: 14,
    vipBonus: 0.04,
    tipBonus: 0.05,
    patienceReduction: 0.08,
    rankScoreBonus: 35,
    accentColor: '#34D399',
    description: '深色老檀木地坪搭配孔雀翡翠雕花绒毯与琥珀铜灯，雅致舒心大幅安抚顾客情绪。',
    perkSummary: '餐位 +¥14 · 耐心损耗 -8% · 小费 +5% · 榜单 +35',
    floorTint: 'rgba(18, 36, 26, 0.22)',
    carpetFill: '#114A3B',
    carpetTrim: '#DFB660',
    beamFill: '#4C2A19',
    lanternGlowRgba: 'rgba(251, 191, 36, 0.34)',
    previewSwatches: ['#2E1C14', '#114A3B', '#DFB660'],
  },
  {
    id: 'obsidian_sushi',
    name: '黑金板前御膳殿',
    cost: 1480,
    minShopLevel: 3,
    ticketBonus: 32,
    vipBonus: 0.09,
    tipBonus: 0.1,
    patienceReduction: 0.1,
    rankScoreBonus: 75,
    accentColor: '#F59E0B',
    description: '玄黑大理石质感地坪与鎏金暗纹地毯，极具高定日料板前气场，贵宾流连忘返。',
    perkSummary: '餐位 +¥32 · VIP +9% · 小费 +10% · 榜单 +75',
    floorTint: 'rgba(10, 12, 22, 0.42)',
    carpetFill: '#241B15',
    carpetTrim: '#F5C443',
    beamFill: '#2B221E',
    lanternGlowRgba: 'rgba(245, 196, 67, 0.36)',
    previewSwatches: ['#1A1C26', '#2C221A', '#F5C443'],
  },
  {
    id: 'azure_luxury',
    name: '蔚蓝星海琉璃宫',
    cost: 2680,
    minShopLevel: 4,
    ticketBonus: 54,
    vipBonus: 0.14,
    tipBonus: 0.16,
    patienceReduction: 0.14,
    rankScoreBonus: 130,
    accentColor: '#38BDF8',
    description: '深海蓝绒毯、珍珠母贝镶边与海蓝琉璃光影，打造全城顶奢海上御膳地标！',
    perkSummary: '餐位 +¥54 · VIP +14% · 小费 +16% · 榜单 +130',
    floorTint: 'rgba(12, 34, 58, 0.36)',
    carpetFill: '#123354',
    carpetTrim: '#7DD3FC',
    beamFill: '#243B55',
    lanternGlowRgba: 'rgba(96, 216, 255, 0.34)',
    previewSwatches: ['#15283C', '#123354', '#7DD3FC'],
  },
];

export function getDecorThemeDef(id: DecorThemeId): DecorThemeDef {
  return DECOR_THEMES.find((t) => t.id === id) ?? DECOR_THEMES[0];
}

// ============================================================================
// 6. CROSS-RUN PERSISTENT ACHIEVEMENTS CATALOG
// ============================================================================

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  accentColor: string;
}

export const ACHIEVEMENTS_CATALOG: AchievementDef[] = [
  {
    id: 'ach_first_day',
    title: '初试沸鼎',
    description: '顺利完成首日营业并完成打烊结算。',
    accentColor: '#E8C97A',
  },
  {
    id: 'ach_clean_day',
    title: '明厨示范日',
    description: '单日实现零逃单且打烊时卫生 ≥ 90。',
    accentColor: '#34D399',
  },
  {
    id: 'ach_cash_3000',
    title: '海港小富翁',
    description: '门店流动资金首次突破 ¥3,000。',
    accentColor: '#FBBF24',
  },
  {
    id: 'ach_cash_10000',
    title: '万金沸鼎大亨',
    description: '门店流动资金首次突破 ¥10,000。',
    accentColor: '#F59E0B',
  },
  {
    id: 'ach_all_zones',
    title: '六大档口大满贯',
    description: '通过门店发展树完整扩建全部 6 大前场档口区域。',
    accentColor: '#38BDF8',
  },
  {
    id: 'ach_synergy_master',
    title: '绝配招牌宗师',
    description: '成功激活任意 2 个以上隐藏菜单组合加成。',
    accentColor: '#C084FC',
  },
  {
    id: 'ach_full_year',
    title: '春夏秋冬一轮回',
    description: '执掌门店历经完整四季，迈入第 2 年营业。',
    accentColor: '#6EE7B7',
  },
  {
    id: 'ach_top3_city',
    title: '全城前三名馆',
    description: '在全城海鲜自助排行榜中杀入前 3 名。',
    accentColor: '#FB923C',
  },
  {
    id: 'ach_rank_1',
    title: '全城第一海鲜王',
    description: '超越所有竞争对手，登顶全城海鲜自助榜首第 1 名！',
    accentColor: '#FDE047',
  },
  {
    id: 'ach_decor_collector',
    title: '殿堂级美学店长',
    description: '解锁并装潢过至少 2 套高端大厅主题风格。',
    accentColor: '#7DD3FC',
  },
  {
    id: 'ach_harbor_wedding',
    title: '红灯笼下的佳偶',
    description: '与一位特聘特殊店员步入婚姻殿堂。',
    accentColor: '#F472B6',
  },
  {
    id: 'ach_story_finale',
    title: '海上御膳传奇',
    description: '通关全部五章主线剧情并解锁命运终章结局。',
    accentColor: '#F6DA8D',
  },
];
