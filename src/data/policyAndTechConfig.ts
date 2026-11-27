import {
  DiningRegimeDef,
  FacilitySceneId,
  HiddenSynergyDef,
  OpsPolicyCardDef,
  RegimeId,
  SpecialStaffId,
  TechTreeNodeDef,
} from '../types/game';

export const REGIME_SWITCH_COOLDOWN_DAYS = 3;

// ==========================================
// 1. DINING STORE TYPES (门店档次 / 店面类型)
// ==========================================

export const DINING_REGIMES: DiningRegimeDef[] = [
  {
    id: 'street_stall',
    name: '烟火大排档',
    eraLabel: '阶段一 · 初始店面类型',
    baseTicketPrice: 128,
    purchaseCost: 0,
    setupDays: 0,
    customerRateMult: 1.22,
    vipBonus: 0,
    accentColor: '#4ADE80',
    description: '高翻台亲民海鲜档口，街坊与平价老饕云集，适合开局积累人气与口碑。',
    passivePerk: '客流 +22% · 全档位平价奇遇皆可光顾',
    slots: ['DISH', 'DISH', 'BROTH', 'WILDCARD'],
  },
  {
    id: 'harbor_bistro',
    name: '海港鲜味坊',
    eraLabel: '阶段二 · 品质店面类型',
    baseTicketPrice: 198,
    purchaseCost: 680,
    setupDays: 1,
    customerRateMult: 1.1,
    vipBonus: 0.06,
    accentColor: '#38BDF8',
    description: '进阶海鲜品质馆，增设经营策略位，兼顾客流与精致出品体验。',
    passivePerk: '客流 +10% · VIP 概率 +6% · 开放经营策略位',
    slots: ['DISH', 'DISH', 'BROTH', 'OPS', 'WILDCARD'],
  },
  {
    id: 'seafood_hall',
    name: '潮鲜臻品堂',
    eraLabel: '阶段三 · 旗舰店面类型',
    baseTicketPrice: 298,
    purchaseCost: 1480,
    setupDays: 2,
    customerRateMult: 0.96,
    vipBonus: 0.14,
    accentColor: '#F59E0B',
    description: '中高端海鲜自助名馆，扩展至三菜品席位，高消费名流与食评家频临。',
    passivePerk: 'VIP 概率 +14% · 三菜品配置位 · 小费自然溢价',
    slots: ['DISH', 'DISH', 'DISH', 'BROTH', 'OPS', 'WILDCARD'],
  },
  {
    id: 'imperial_feast',
    name: '御海尊享殿',
    eraLabel: '阶段四 · ¥400+ 高定店面类型',
    baseTicketPrice: 418,
    purchaseCost: 2800,
    setupDays: 2,
    customerRateMult: 0.78,
    vipBonus: 0.24,
    accentColor: '#C084FC',
    description: '跨越 ¥400 高端门槛！筛走低预算散客与平价老饕（如周老灶），专攻高净值 VIP 与豪门贵客。',
    passivePerk: '跨入 ¥400+ 门槛 · 双锅底位 · VIP +24% · 高额打赏',
    slots: ['DISH', 'DISH', 'DISH', 'BROTH', 'BROTH', 'OPS', 'WILDCARD'],
  },
  {
    id: 'legendary_citadel',
    name: '传奇沸鼎城',
    eraLabel: '阶段五 · 终极传奇店面',
    baseTicketPrice: 528,
    purchaseCost: 4800,
    setupDays: 3,
    customerRateMult: 0.72,
    vipBonus: 0.34,
    accentColor: '#F472B6',
    description: '海鲜自助终极殿堂，坐拥八大经营配置位与双策略位，名震四海的顶奢御宴。',
    passivePerk: '8 张满配经营卡位 · VIP +34% · 顶奢客单价',
    slots: ['DISH', 'DISH', 'DISH', 'BROTH', 'BROTH', 'OPS', 'OPS', 'WILDCARD'],
  },
];

export function getRegimeDef(id: RegimeId): DiningRegimeDef {
  return DINING_REGIMES.find((r) => r.id === id) ?? DINING_REGIMES[0];
}

// ==========================================
// 2. GREEN OPERATIONAL POLICY CARDS (运营策略卡)
// ==========================================

export const OPS_POLICY_CARDS: OpsPolicyCardDef[] = [
  {
    id: 'ops_fresh_qc',
    name: '码头严选品控',
    shortEffect: '食材补货成本 -14% · 卫生衰减 -12%',
    description: '严格实行晨间码头直采验收，降低损耗并保持冰台洁净。',
    accentColor: '#34D399',
    costDiscount: 0.14,
    hygieneDecayReduction: 0.12,
  },
  {
    id: 'ops_iron_flame',
    name: '明档铁板烟火',
    shortEffect: '熟食现烹产出 +1 · 小费 +10%',
    description: '强化热厨铁板明档香气外溢效果，显著提升热菜出餐效率。',
    accentColor: '#FB923C',
    extraCookedYield: 1,
    tipBonus: 0.1,
  },
  {
    id: 'ops_speed_turn',
    name: '动线极速翻台',
    shortEffect: '全员移速与效率 +14% · 客流 +10%',
    description: '优化传菜与收台动线，高峰期大幅提升大厅周转率。',
    accentColor: '#38BDF8',
    speedBonus: 0.14,
    customerRateBonus: 0.1,
  },
  {
    id: 'ops_vip_concierge',
    name: '金钥匙礼宾',
    shortEffect: 'VIP 来访率 +12% · 顾客耐心损耗 -18%',
    description: '提供五星级茶水迎宾与桌边剥虾服务，深受豪门贵客赞誉。',
    accentColor: '#FBBF24',
    vipChanceBonus: 0.12,
    patienceDecayReduction: 0.18,
  },
  {
    id: 'ops_hygiene_shield',
    name: '无菌冷链标杆',
    shortEffect: '全店卫生衰减 -30% · 小费 +8%',
    description: '引入高标准油水分离与每小时洗手间巡检规范，食安稳如磐石。',
    accentColor: '#2DD4BF',
    hygieneDecayReduction: 0.3,
    tipBonus: 0.08,
  },
  {
    id: 'ops_harbor_feast',
    name: '港湾御膳排场',
    shortEffect: '全店小费 +22% · VIP 来访率 +10%',
    description: '开鱼仪式与沸鼎上桌敲锣礼仪，让每桌高阶宴席充满仪式感。',
    accentColor: '#C084FC',
    tipBonus: 0.22,
    vipChanceBonus: 0.1,
  },
];

export function getOpsPolicyCardDef(id: string): OpsPolicyCardDef | undefined {
  return OPS_POLICY_CARDS.find((c) => c.id === id);
}

// ==========================================
// 3. HIDDEN POLICY CARD SYNERGIES (隐藏组合奖励 - 未触发前完全保密)
// ==========================================

export const HIDDEN_SYNERGIES: HiddenSynergyDef[] = [
  {
    id: 'syn_fire_and_ice',
    name: '冰火海鲜双重奏',
    badge: '隐藏共鸣 · 冰火相济',
    description: '同时装备「刺身日料区菜品卡」+「熟食热菜区菜品卡」+「川味麻辣牛油锅」触发！',
    effectText: '全店小费 +20% · 客流 +10%',
    accentColor: '#F97316',
    tipBonus: 0.2,
    customerRateBonus: 0.1,
  },
  {
    id: 'syn_harbor_night',
    name: '港湾烟火不夜城',
    badge: '隐藏共鸣 · 烟火鼎沸',
    description: '同时装备「蒜蓉粉丝蒸扇贝烤蚝」+「避风塘铁板炒蟹」或「明档铁板烟火」触发！',
    effectText: '熟食产出 +1 · 客流 +15% · 餐位 +¥16',
    accentColor: '#FBBF24',
    extraCookedYield: 1,
    customerRateBonus: 0.15,
    ticketBonus: 16,
  },
  {
    id: 'syn_deep_sea_trio',
    name: '深海三绝御宴',
    badge: '隐藏搭配 · 珍馐满堂',
    description: '在菜单配置位中同时上架 3 张及以上高阶活捞/刺身海鲜卡（生蚝/三文鱼/甜虾/活鲍/龙虾/帝王蟹/蓝鳍大腹）触发！',
    effectText: '基础餐位额外 +¥32 · 全店小费 +24%',
    accentColor: '#38BDF8',
    ticketBonus: 32,
    tipBonus: 0.24,
  },
  {
    id: 'syn_seasonal_master',
    name: '不时不食 · 时令宗师',
    badge: '隐藏搭配 · 四季天成',
    description: '在菜单配置位中同时上架 ≥ 2 张当前季节限定菜品卡或限定锅底卡触发！',
    effectText: '全店食材采购成本 -20% · 小费 +15%',
    accentColor: '#4ADE80',
    costDiscount: 0.2,
    tipBonus: 0.15,
  },
  {
    id: 'syn_ops_engine',
    name: '精密堂口运转阵',
    badge: '隐藏搭配 · 高效协同',
    description: '在配置位中同时启用 ≥ 2 张绿色经营策略卡触发！',
    effectText: '全员移速效率 +15% · 卫生衰减 -25%',
    accentColor: '#2DD4BF',
    speedBonus: 0.15,
    hygieneDecayReduction: 0.25,
  },
  {
    id: 'syn_grand_buffet',
    name: '海鲜自助大满贯',
    badge: '隐藏搭配 · 全域盛宴',
    description: '上架的菜品卡同时横跨 ≥ 3 个不同自助餐品分区（冰鲜/熟食/铁板烧烤/配菜/甜品/刺身/活捞）触发！',
    effectText: '基础餐位额外 +¥28 · 全店小费 +16%',
    accentColor: '#E879F9',
    ticketBonus: 28,
    tipBonus: 0.16,
  },
];

// ==========================================
// 4. 5-STAGE STORE DEVELOPMENT / RESEARCH TREE (门店发展树)
// ==========================================

export const TECH_STAGE_LABELS: Record<1 | 2 | 3 | 4 | 5, { title: string; subtitle: string }> = {
  1: { title: '阶段一 · 街角初兴', subtitle: '立稳根基与初始菜牌' },
  2: { title: '阶段二 · 港湾立名', subtitle: '升级海港鲜味坊与甜品冷链' },
  3: { title: '阶段三 · 潮鲜臻品', subtitle: '扩建刺身日料区与臻品堂店型' },
  4: { title: '阶段四 · 御海尊享', subtitle: '扩建活捞海鲜缸与¥400+高定店型' },
  5: { title: '阶段五 · 沸鼎传奇', subtitle: '登顶帝王珍馐与传奇火锅城' },
};

export const TECH_TREE_NODES: TechTreeNodeDef[] = [
  // ---- STAGE 1 (Starter & Early Unlocks) ----
  {
    id: 'tech_origin',
    stage: 1,
    row: 0,
    kind: 'REGIME',
    title: '烟火大排档',
    shortDesc: '初始店型 · 4配置位',
    detail: '街角起家的亲民海鲜自助店面类型（¥128），开放冰鲜区、熟食区与配菜小料区。',
    cost: 0,
    pointCost: 0,
    researchDays: 0,
    prereqs: [],
    targetId: 'street_stall',
    isKeystone: true,
    starterUnlocked: true,
    accentColor: '#4ADE80',
  },
  {
    id: 'tech_dish_oysters',
    stage: 1,
    row: 1,
    kind: 'SEAFOOD',
    title: '乳山生蚝青口',
    shortDesc: '菜品卡 · 冰鲜区',
    detail: '解锁「乳山生蚝青口鱿鱼」菜品配置卡，上架后显著提升餐位价值。',
    cost: 220,
    pointCost: 1,
    researchDays: 1,
    prereqs: ['tech_origin'],
    targetId: 'oysters',
    accentColor: '#38BDF8',
  },
  {
    id: 'tech_broth_bamboo',
    stage: 1,
    row: 2,
    kind: 'BROTH',
    title: '春笋椰青清锅',
    shortDesc: '锅底卡 · 春夏限定',
    detail: '解锁「春笋椰青清润锅」锅底卡，春夏清甜降火，搭配虾贝鲜味倍增。',
    cost: 200,
    pointCost: 1,
    researchDays: 1,
    prereqs: ['tech_origin'],
    targetId: 'spring_bamboo',
    accentColor: '#34D399',
  },
  {
    id: 'tech_hw_tables6',
    stage: 1,
    row: 3,
    kind: 'TABLES',
    title: '扩建 12 张雅座',
    shortDesc: '硬件扩建 · 12桌+6净盘',
    detail: '夜间改造大厅增设至 12 张火锅桌，并附赠 6 套高温消毒餐具。',
    cost: 320,
    pointCost: 1,
    researchDays: 1,
    prereqs: ['tech_origin'],
    targetNumber: 12,
    accentColor: '#E8C97A',
  },
  {
    id: 'tech_zone_dimsum',
    stage: 1,
    row: 4,
    kind: 'ZONE',
    title: '广式蒸笼点心区',
    shortDesc: '专区蓝图 · 虾饺/多宝鱼',
    detail: '研发「广式蒸笼海鲜点心区」蓝图与虾饺皇、清蒸多宝鱼菜品卡；研发完成后需在「前厅区域布局」开店前购置施工。',
    cost: 280,
    pointCost: 1,
    researchDays: 1,
    prereqs: ['tech_origin'],
    targetId: 'steam_dimsum',
    accentColor: '#F59E0B',
  },

  // ---- STAGE 2 (Harbor Bistro Regime & Drinks/Dessert Zone) ----
  {
    id: 'tech_regime_bistro',
    stage: 2,
    row: 0,
    kind: 'REGIME',
    title: '海港鲜味坊',
    shortDesc: '店型蓝图 · Lv.2东翼扩建',
    detail: '门店升级关键节点！研发解锁「海港鲜味坊（¥198 · 5卡位）」店型蓝图（需在门店配置中开店前购置装潢），同时店铺升至 Lv.2（东翼扩建解锁4-5号区位购置资格，编制扩至10人）并获「码头严选品控」卡！',
    cost: 520,
    pointCost: 2,
    researchDays: 1,
    prereqs: ['tech_dish_oysters', 'tech_hw_tables6'],
    targetId: 'harbor_bistro',
    isKeystone: true,
    accentColor: '#38BDF8',
  },
  {
    id: 'tech_zone_drinks',
    stage: 2,
    row: 1,
    kind: 'ZONE',
    title: '酒水甜品水果区',
    shortDesc: '专区蓝图 · 榴莲甜品卡',
    detail: '解锁「酒水饮料/甜品水果区」建设蓝图与「金枕榴莲精酿甜品台」菜品卡；需在开店前前往「前厅区域布局」出资建成后配置上架。',
    cost: 360,
    pointCost: 1,
    researchDays: 1,
    prereqs: ['tech_dish_oysters'],
    targetId: 'drinks_dessert',
    accentColor: '#F472B6',
  },
  {
    id: 'tech_broth_maw',
    stage: 2,
    row: 2,
    kind: 'BROTH',
    title: '金汤花胶鸡锅',
    shortDesc: '锅底卡 · 春秋冬限定',
    detail: '研发招牌浓稠金汤花胶鸡锅底卡（锅底费 +¥28），同步解锁运营卡「明档铁板烟火」。',
    cost: 340,
    pointCost: 1,
    researchDays: 1,
    prereqs: ['tech_broth_bamboo'],
    targetId: 'golden_maw',
    accentColor: '#F59E0B',
  },
  {
    id: 'tech_hw_dish_buffet1',
    stage: 2,
    row: 3,
    kind: 'DISHWARE',
    title: '消毒柜与冰台升级',
    shortDesc: '28套餐具 + 冰台扩容',
    detail: '安装商用高温消毒柜（28套）并深化碎冰槽（每格+3份），缓解高峰断供。',
    cost: 360,
    pointCost: 1,
    researchDays: 1,
    prereqs: ['tech_hw_tables6'],
    targetNumber: 28,
    accentColor: '#7DD3FC',
  },
  {
    id: 'tech_zone_teppan',
    stage: 2,
    row: 4,
    kind: 'ZONE',
    title: '铁板烧烤区',
    shortDesc: '专区蓝图 · 羊排/海鲜串/鹅肝',
    detail: '解锁「铁板烧烤区」明火设备蓝图与炭烤海鲜串、铁板羊排、铁板鹅肝三张烧烤卡；需在开店前前往「前厅区域布局」购置施工后安放。',
    cost: 440,
    pointCost: 1,
    researchDays: 1,
    prereqs: ['tech_zone_dimsum'],
    targetId: 'teppan_bbq',
    accentColor: '#EF4444',
  },

  // ---- STAGE 3 (Seafood Hall Regime & Sashimi Zone) ----
  {
    id: 'tech_regime_hall',
    stage: 3,
    row: 0,
    kind: 'REGIME',
    title: '潮鲜臻品堂',
    shortDesc: '店型蓝图 · Lv.3南庭扩建',
    detail: '门店升级关键节点！解锁「潮鲜臻品堂（¥298 · 6卡位）」店型蓝图（需在开店前购置装潢），店铺升至 Lv.3（南庭扩建解锁6-7号区位购置资格，编制14人）并获「动线极速翻台」卡！',
    cost: 1080,
    pointCost: 3,
    researchDays: 2,
    prereqs: ['tech_regime_bistro', 'tech_zone_drinks'],
    targetId: 'seafood_hall',
    minReputation: 72,
    isKeystone: true,
    accentColor: '#F59E0B',
  },
  {
    id: 'tech_zone_sashimi',
    stage: 3,
    row: 1,
    kind: 'ZONE',
    title: '刺身与日料区',
    shortDesc: '专区蓝图 · 三文鱼/甜虾卡',
    detail: '解锁「刺身与日料区」恒温明档蓝图与三文鱼、甜虾北极贝手卷卡；需在开店前前往「前厅区域布局」购置建设后开放招聘日料师。',
    cost: 620,
    pointCost: 2,
    researchDays: 1,
    prereqs: ['tech_regime_bistro', 'tech_zone_drinks'],
    targetId: 'sashimi_sushi',
    accentColor: '#FB7185',
  },
  {
    id: 'tech_dish_typhoon',
    stage: 3,
    row: 2,
    kind: 'SEAFOOD',
    title: '避风塘蟹与冬阴功',
    shortDesc: '热菜卡 + 冬阴功皇锅',
    detail: '同时解锁秋冬热菜王牌「避风塘铁板炒蟹」与南洋名锅「冬阴功海鲜皇锅」两张高价值配置卡！',
    cost: 640,
    pointCost: 2,
    researchDays: 1,
    prereqs: ['tech_broth_maw'],
    targetId: 'typhoon_crab',
    accentColor: '#EA580C',
  },
  {
    id: 'tech_hw_tables8',
    stage: 3,
    row: 3,
    kind: 'TABLES',
    title: '扩建 24 张豪华席',
    shortDesc: '硬件扩建 · 24桌 + 策略卡',
    detail: '东翼大厅全面摆开至 24 张豪华餐桌（餐具扩至 42 套），并解锁「无菌冷链标杆」经营策略卡。',
    cost: 720,
    pointCost: 2,
    researchDays: 1,
    prereqs: ['tech_hw_dish_buffet1', 'tech_regime_bistro'],
    targetNumber: 24,
    accentColor: '#E8C97A',
  },
  {
    id: 'tech_zone_raw_marinated',
    stage: 3,
    row: 4,
    kind: 'ZONE',
    title: '潮汕生腌熟醉区',
    shortDesc: '专区蓝图 · 生腌膏蟹/熟醉虾',
    detail: '解锁「潮汕生腌与花雕熟醉区」冷浸明档蓝图及生腌膏蟹、花雕熟醉罗氏虾双卡；需在开店前于「前厅区域布局」购置施工。',
    cost: 680,
    pointCost: 2,
    researchDays: 1,
    prereqs: ['tech_zone_teppan'],
    targetId: 'raw_marinated',
    accentColor: '#06B6D4',
  },

  // ---- STAGE 4 (Imperial Feast ¥400+ Regime & Live Seafood Tank Zone) ----
  {
    id: 'tech_regime_imperial',
    stage: 4,
    row: 0,
    kind: 'REGIME',
    title: '御海尊享殿',
    shortDesc: '店型蓝图 · Lv.4东阁扩建',
    detail: '门店升级关键节点！解锁 ¥418 高定店型「御海尊享殿（7卡位）」蓝图（需开店前购置装潢），店铺升至 Lv.4（东阁扩建解锁8-9号区位购置资格，编制18人）并获「金钥匙礼宾」卡！',
    cost: 2100,
    pointCost: 3,
    researchDays: 2,
    prereqs: ['tech_regime_hall', 'tech_zone_sashimi'],
    targetId: 'imperial_feast',
    minReputation: 80,
    isKeystone: true,
    accentColor: '#C084FC',
  },
  {
    id: 'tech_zone_live',
    stage: 4,
    row: 1,
    kind: 'ZONE',
    title: '活捞海鲜暂养区',
    shortDesc: '专区蓝图 · 活鲍/波龙卡',
    detail: '解锁「活捞海鲜暂养区」海水循环缸蓝图与鲜活大鲍鱼、波士顿活龙虾卡；需在开店前于「前厅区域布局」购置施工后启用！',
    cost: 1120,
    pointCost: 2,
    researchDays: 2,
    prereqs: ['tech_regime_hall', 'tech_zone_sashimi'],
    targetId: 'live_seafood',
    accentColor: '#2DD4BF',
  },
  {
    id: 'tech_dish_wagyu_mutton',
    stage: 4,
    row: 2,
    kind: 'SEAFOOD',
    title: 'M9和牛与海参御汤',
    shortDesc: '和牛卡 + 古法海参老汤锅',
    detail: '解锁顶奢肉品「雪花M9和牛」与秋冬补品「古法海参滋补老汤锅」双卡！',
    cost: 960,
    pointCost: 2,
    researchDays: 1,
    prereqs: ['tech_dish_typhoon'],
    targetId: 'wagyu',
    accentColor: '#A82633',
  },
  {
    id: 'tech_hw_tables10',
    stage: 4,
    row: 3,
    kind: 'TABLES',
    title: '36桌南庭与60套餐具',
    shortDesc: '36桌 + 60套餐具 + 深冰槽',
    detail: '南庭水景大厅扩建至 36 张雅座、60 套高温消毒餐具与超深碎冰槽（每格额外+4份）。',
    cost: 1380,
    pointCost: 2,
    researchDays: 2,
    prereqs: ['tech_hw_tables8', 'tech_regime_hall'],
    targetNumber: 36,
    accentColor: '#E8C97A',
  },
  {
    id: 'tech_zone_wagyu_carving',
    stage: 4,
    row: 4,
    kind: 'ZONE',
    title: '现切和牛炙烤档',
    shortDesc: '专区蓝图 · 眼肉/战斧牛排',
    detail: '解锁「现切和牛炙烤明档区」蓝图及现切雪花和牛眼肉、低温慢烤战斧牛排顶奢肉卡；需在开店前于「前厅区域布局」购置建设。',
    cost: 1180,
    pointCost: 2,
    researchDays: 2,
    prereqs: ['tech_zone_raw_marinated', 'tech_dish_wagyu_mutton'],
    targetId: 'wagyu_carving',
    accentColor: '#E11D48',
  },

  // ---- STAGE 5 (Legendary Citadel & King Crab) ----
  {
    id: 'tech_regime_legendary',
    stage: 5,
    row: 0,
    kind: 'REGIME',
    title: '传奇沸鼎城',
    shortDesc: '终极店型蓝图 · Lv.5总殿',
    detail: '终极门店节点！解锁「传奇沸鼎城（¥528 · 8卡位）」店型蓝图（需开店前购置装潢），店铺登顶 Lv.5（解锁第10号旗舰主岛位购置资格，编制24人）并获「港湾御膳排场」卡！',
    cost: 3600,
    pointCost: 4,
    researchDays: 2,
    prereqs: ['tech_regime_imperial', 'tech_zone_live'],
    targetId: 'legendary_citadel',
    minReputation: 86,
    isKeystone: true,
    accentColor: '#F472B6',
  },
  {
    id: 'tech_dish_kingcrab',
    stage: 5,
    row: 1,
    kind: 'SEAFOOD',
    title: '深海帝王蟹腿',
    shortDesc: '顶级活鲜卡 · 秋冬王者',
    detail: '解锁全城瞩目的镇店王者「深海帝王蟹腿」菜品配置卡（餐位 +¥102）！',
    cost: 1950,
    pointCost: 3,
    researchDays: 2,
    prereqs: ['tech_zone_live', 'tech_dish_wagyu_mutton'],
    targetId: 'king_crab',
    accentColor: '#E04B2E',
  },
  {
    id: 'tech_hw_tables12',
    stage: 5,
    row: 3,
    kind: 'TABLES',
    title: '48桌满编大厅与顶级冷链',
    shortDesc: '满编48桌 + 84套餐具',
    detail: '开放全厅 48 张满编大宴餐桌、84 套顶级消毒柜与终极碎冰保鲜库，气势如虹！',
    cost: 2200,
    pointCost: 3,
    researchDays: 2,
    prereqs: ['tech_hw_tables10', 'tech_regime_imperial'],
    targetNumber: 48,
    accentColor: '#F2CE74',
  },
];

export function getTechNodeDef(id: string): TechTreeNodeDef | undefined {
  return TECH_TREE_NODES.find((n) => n.id === id);
}

// ==========================================
// 5. PLAYABLE 2D BACKSTAGE FLOORPLAN GEOMETRY (960 x 640)
// ==========================================

export interface BackstageRoomRect {
  id: FacilitySceneId;
  name: string;
  shortName: string;
  x: number;
  y: number;
  w: number;
  h: number;
  doorX: number;
  doorY: number;
  consoleX: number;
  consoleY: number;
  npcX: number;
  npcY: number;
  accentColor: string;
  floorColor: string;
  sideStoryStaffId?: SpecialStaffId;
}

export const BACKSTAGE_CORRIDOR = {
  x: 24,
  y: 286,
  w: 912,
  h: 68,
  centerY: 320,
};

export const BACKSTAGE_EXIT_DOOR = {
  x: 42,
  y: 320,
  w: 36,
  h: 64,
};

// Dining Hall doorway to enter the Backstage rooms
export const DINING_HALL_BACKSTAGE_DOOR = {
  x: 942,
  y: 122,
  w: 34,
  h: 40,
};

// 3 Seamless Front-Hall <-> Backstage Connecting Archways (aligned with top kitchen aisles & bottom backstage rooms)
export const FRONT_BACK_ARCHWAYS: ReadonlyArray<{
  id: 'west' | 'center' | 'east';
  roomId: FacilitySceneId;
  x: number;
  halfWidth: number;
}> = [
  { id: 'west', roomId: 'restroom', x: 221, halfWidth: 24 },
  { id: 'center', roomId: 'equipment_room', x: 406, halfWidth: 26 },
  { id: 'east', roomId: 'dormitory', x: 682, halfWidth: 28 },
];

export function findNearestFrontBackArchway(x: number) {
  let best = FRONT_BACK_ARCHWAYS[1];
  let bestDist = Infinity;
  for (const arch of FRONT_BACK_ARCHWAYS) {
    const d = Math.abs(arch.x - x);
    if (d < bestDist) {
      bestDist = d;
      best = arch;
    }
  }
  return best;
}

export const BACKSTAGE_ROOMS: BackstageRoomRect[] = [
  // Top Row (4 rooms, doorway on bottom wall facing corridor y=286)
  {
    id: 'cold_storage',
    name: '粗加工与活鲜/冷链库房',
    shortName: '冷链活鲜库',
    x: 28,
    y: 24,
    w: 214,
    h: 254,
    doorX: 135,
    doorY: 278,
    consoleX: 135,
    consoleY: 165,
    npcX: 185,
    npcY: 195,
    accentColor: '#38BDF8',
    floorColor: '#253D52',
    sideStoryStaffId: 'lin_xi',
  },
  {
    id: 'hot_kitchen',
    name: '热厨与出品间',
    shortName: '热厨出品间',
    x: 258,
    y: 24,
    w: 214,
    h: 254,
    doorX: 365,
    doorY: 278,
    consoleX: 365,
    consoleY: 165,
    npcX: 418,
    npcY: 195,
    accentColor: '#FB923C',
    floorColor: '#4A2B22',
    sideStoryStaffId: 'shen_zhiwei',
  },
  {
    id: 'dish_washroom',
    name: '餐具回收与洗消间',
    shortName: '餐具洗消间',
    x: 488,
    y: 24,
    w: 214,
    h: 254,
    doorX: 595,
    doorY: 278,
    consoleX: 595,
    consoleY: 165,
    npcX: 545,
    npcY: 195,
    accentColor: '#67E8F9',
    floorColor: '#2C4954',
  },
  {
    id: 'office',
    name: '店长办公室',
    shortName: '店长办公室',
    x: 718,
    y: 24,
    w: 214,
    h: 254,
    doorX: 825,
    doorY: 278,
    consoleX: 825,
    consoleY: 165,
    npcX: 775,
    npcY: 195,
    accentColor: '#E8C97A',
    floorColor: '#3D2A20',
    sideStoryStaffId: 'su_xingyao',
  },
  // Bottom Row (3 rooms, doorway on top wall facing corridor y=354)
  {
    id: 'restroom',
    name: '卫生间与多联洗手区',
    shortName: '卫生间洗手区',
    x: 28,
    y: 362,
    w: 288,
    h: 254,
    doorX: 172,
    doorY: 362,
    consoleX: 172,
    consoleY: 478,
    npcX: 245,
    npcY: 495,
    accentColor: '#86EFAC',
    floorColor: '#314D4A',
  },
  {
    id: 'equipment_room',
    name: '机电与冷链设备间',
    shortName: '机电设备间',
    x: 332,
    y: 362,
    w: 296,
    h: 254,
    doorX: 480,
    doorY: 362,
    consoleX: 480,
    consoleY: 478,
    npcX: 545,
    npcY: 495,
    accentColor: '#FBBF24',
    floorColor: '#323844',
  },
  {
    id: 'dormitory',
    name: '员工宿舍与茶室',
    shortName: '员工宿舍',
    x: 644,
    y: 362,
    w: 288,
    h: 254,
    doorX: 788,
    doorY: 362,
    consoleX: 788,
    consoleY: 478,
    npcX: 720,
    npcY: 495,
    accentColor: '#F472B6',
    floorColor: '#473035',
  },
];

export function getBackstageRoomRect(id: FacilitySceneId): BackstageRoomRect {
  return BACKSTAGE_ROOMS.find((r) => r.id === id) ?? BACKSTAGE_ROOMS[0];
}
