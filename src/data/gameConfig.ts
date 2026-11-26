import {
  BrothDef,
  BuffetZoneDef,
  BuffetZoneId,
  FacilitySceneDef,
  PartTimeJobDef,
  SeafoodItemDef,
  SeasonDef,
  SeasonId,
  StaffCandidate,
  StaffRole,
  StaffTier,
  ZonePadDef,
} from '../types/game';

export const CANVAS_WIDTH = 960;
export const CANVAS_HEIGHT = 640;

export const DAY_DURATION_SECONDS = 95;
export const DAYS_PER_SEASON = 5;

export const SEASON_ORDER: SeasonId[] = ['SPRING', 'SUMMER', 'AUTUMN', 'WINTER'];

export const SEASONS_CONFIG: Record<SeasonId, SeasonDef> = {
  SPRING: {
    id: 'SPRING',
    name: '春季 · 潮生渔汛',
    shortName: '春',
    color: '#4ADE80',
    costMultiplier: 0.95,
    customerRateMult: 1.0,
    description: '春潮回暖，近海虾贝肥嫩，采购成本微降 5%，适合推出鲜笋菌菇清锅。',
    specialtyNote: '当季推荐：鲜活基围虾、甜虾北极贝、春笋鲜菌锅',
  },
  SUMMER: {
    id: 'SUMMER',
    name: '夏季 · 休渔热浪',
    shortName: '夏',
    color: '#38BDF8',
    costMultiplier: 1.16,
    customerRateMult: 1.08,
    description: '沿海伏季休渔期，海鲜采购成本上涨 16%，但夜宵客流旺盛，刺身、冬阴功与榴莲冰饮大热！',
    specialtyNote: '当季推荐：厚切三文鱼、金枕榴莲果饮、冬阴功皇锅',
  },
  AUTUMN: {
    id: 'AUTUMN',
    name: '秋季 · 开海丰收',
    shortName: '秋',
    color: '#F59E0B',
    costMultiplier: 0.85,
    customerRateMult: 1.12,
    description: '千帆开海满载归港！海鲜成本大降 15%，蟹肥膏满，正是囤原料与冲击营收的黄金季！',
    specialtyNote: '当季推荐：帝王蟹、避风塘炒蟹、现捞大鲍鱼、金汤花胶锅',
  },
  WINTER: {
    id: 'WINTER',
    name: '冬季 · 沸鼎暖冬',
    shortName: '冬',
    color: '#93C5FD',
    costMultiplier: 1.24,
    customerRateMult: 1.22,
    description: '远洋冷链运输成本上升 24%，但火锅消费迎来全年最高峰（客流 +22%），滋补锅底与热菜供不应求！',
    specialtyNote: '当季推荐：古法滋补老汤锅、金汤花胶锅、避风塘炒蟹、M9和牛',
  },
};

export function getSeasonDef(season: SeasonId): SeasonDef {
  return SEASONS_CONFIG[season];
}

export function isAvailableInSeason(seasons: SeasonId[] | undefined, season: SeasonId): boolean {
  if (!seasons || seasons.length === 0) return true;
  return seasons.includes(season);
}

// Station coordinates & hitboxes in logical canvas space (960 x 640)
export const STATIONS = {
  SINK: { x: 118, y: 68, w: 176, h: 86, label: '洗碗池' },
  CLEAN_RACK: { x: 312, y: 68, w: 152, h: 86, label: '消毒餐具柜' },
  BROTH_KITCHEN: { x: 542, y: 68, w: 238, h: 86, label: '熬汤锅底灶' },
  COLD_PREP: { x: 814, y: 68, w: 224, h: 86, label: '生鲜备菜台' },
  RECEPTION: { x: 86, y: 214, w: 120, h: 88, label: '迎宾接待台' },
  BUFFET_BAR: { x: 462, y: 222, w: 570, h: 68, label: '海鲜冰台自助区' },
  COOKED_COUNTER: { x: 852, y: 222, w: 178, h: 68, label: '熟食热菜铁板区' },
} as const;

// All 6 front-hall themed buffet zones (3 core zones on main line + 3 expandable specialty zones on upper showcase row)
export const FRONT_HALL_ZONES: Record<
  BuffetZoneId,
  {
    id: BuffetZoneId;
    x: number;
    y: number;
    w: number;
    h: number;
    row: 'UPPER' | 'MAIN';
    shortLabel: string;
    accentColor: string;
  }
> = {
  // Upper front showcase row (visually constructed & added to front hall once unlocked!)
  live_seafood: {
    id: 'live_seafood',
    x: 174,
    y: 132,
    w: 244,
    h: 50,
    row: 'UPPER',
    shortLabel: '活捞海鲜区',
    accentColor: '#2DD4BF',
  },
  sashimi_sushi: {
    id: 'sashimi_sushi',
    x: 428,
    y: 132,
    w: 244,
    h: 50,
    row: 'UPPER',
    shortLabel: '刺身与日料区',
    accentColor: '#FB7185',
  },
  drinks_dessert: {
    id: 'drinks_dessert',
    x: 682,
    y: 132,
    w: 244,
    h: 50,
    row: 'UPPER',
    shortLabel: '酒水甜品水果区',
    accentColor: '#F472B6',
  },
  // Main front buffet row (starter core zones always present in front hall)
  ice_seafood: {
    id: 'ice_seafood',
    x: 174,
    y: 188,
    w: 332,
    h: 68,
    row: 'MAIN',
    shortLabel: '冰鲜/冷冻海鲜区',
    accentColor: '#38BDF8',
  },
  hotpot_sides: {
    id: 'hotpot_sides',
    x: 514,
    y: 188,
    w: 238,
    h: 68,
    row: 'MAIN',
    shortLabel: '火锅/烧烤配菜区',
    accentColor: '#4ADE80',
  },
  cooked_hot: {
    id: 'cooked_hot',
    x: 760,
    y: 188,
    w: 180,
    h: 68,
    row: 'MAIN',
    shortLabel: '熟食热菜区',
    accentColor: '#F97316',
  },
  teppan_bbq: {
    id: 'teppan_bbq',
    x: 992,
    y: 158,
    w: 112,
    h: 186,
    row: 'UPPER',
    shortLabel: '铁板烧烤区',
    accentColor: '#EF4444',
  },
};

export interface FrontHallExpansionSpec {
  level: number;
  width: number;
  height: number;
  wingTitle: string;
  expansionNote: string;
}

export const FRONT_HALL_EXPANSION_BY_LEVEL: Record<number, FrontHallExpansionSpec> = {
  1: {
    level: 1,
    width: 960,
    height: 640,
    wingTitle: '初兴海港前厅',
    expansionNote: '基础大厅，开放 3 个分散区域位',
  },
  2: {
    level: 2,
    width: 1140,
    height: 640,
    wingTitle: '东翼雅廊扩建',
    expansionNote: '前厅向东扩建 +180px，新增第 4 区域位',
  },
  3: {
    level: 3,
    width: 1140,
    height: 770,
    wingTitle: '南庭水景厅扩建',
    expansionNote: '前厅向南扩建 +130px，新增第 5 区域位',
  },
  4: {
    level: 4,
    width: 1280,
    height: 770,
    wingTitle: '东阁御宴廊扩建',
    expansionNote: '东侧再扩 +140px，新增第 6 区域位',
  },
  5: {
    level: 5,
    width: 1280,
    height: 880,
    wingTitle: '传奇沸鼎南殿扩建',
    expansionNote: '南殿再扩 +110px，新增第 7 旗舰主岛位',
  },
};

export function getFrontHallBounds(shopLevel: number): FrontHallExpansionSpec {
  const lv = Math.max(1, Math.min(5, Math.floor(shopLevel || 1)));
  return FRONT_HALL_EXPANSION_BY_LEVEL[lv] ?? FRONT_HALL_EXPANSION_BY_LEVEL[1];
}

// 7 Well-Spaced Customizable Front-Hall Zone Pads distributed across Shop Levels Lv.1..Lv.5
export const FRONT_HALL_ZONE_PADS: ZonePadDef[] = [
  {
    id: 'pad_nw',
    label: '北厅西岛位',
    wingLabel: 'Lv.1 基础前厅',
    minShopLevel: 1,
    x: 186,
    y: 158,
    w: 204,
    h: 66,
    orientation: 'HORIZONTAL',
    defaultZone: 'ice_seafood',
  },
  {
    id: 'pad_ne',
    label: '北厅东岛位',
    wingLabel: 'Lv.1 基础前厅',
    minShopLevel: 1,
    x: 562,
    y: 158,
    w: 204,
    h: 66,
    orientation: 'HORIZONTAL',
    defaultZone: 'hotpot_sides',
  },
  {
    id: 'pad_east_mid',
    label: '东侧明档位',
    wingLabel: 'Lv.1 基础前厅',
    minShopLevel: 1,
    x: 846,
    y: 292,
    w: 86,
    h: 176,
    orientation: 'VERTICAL',
    defaultZone: 'cooked_hot',
  },
  {
    id: 'pad_east_wing_n',
    label: '东翼雅廊位',
    wingLabel: 'Lv.2 东翼扩建',
    minShopLevel: 2,
    x: 992,
    y: 158,
    w: 112,
    h: 186,
    orientation: 'VERTICAL',
  },
  {
    id: 'pad_south_west',
    label: '南庭水景位',
    wingLabel: 'Lv.3 南庭扩建',
    minShopLevel: 3,
    x: 214,
    y: 654,
    w: 234,
    h: 74,
    orientation: 'HORIZONTAL',
  },
  {
    id: 'pad_east_pavilion',
    label: '东阁御宴位',
    wingLabel: 'Lv.4 东阁扩建',
    minShopLevel: 4,
    x: 1138,
    y: 392,
    w: 108,
    h: 198,
    orientation: 'VERTICAL',
  },
  {
    id: 'pad_south_grand',
    label: '南殿主岛位',
    wingLabel: 'Lv.5 传奇南殿',
    minShopLevel: 5,
    x: 604,
    y: 748,
    w: 264,
    h: 80,
    orientation: 'HORIZONTAL',
  },
];

export function createDefaultZonePadAssignments(): Record<string, BuffetZoneId | null> {
  const map: Record<string, BuffetZoneId | null> = {};
  for (const pad of FRONT_HALL_ZONE_PADS) {
    map[pad.id] = pad.defaultZone ?? null;
  }
  return map;
}

export function getPadStandPoint(
  pad: ZonePadDef,
  refX?: number,
  refY?: number
): { x: number; y: number } {
  const cx = refX ?? pad.x + pad.w * 0.5;
  const cy = refY ?? pad.y + pad.h * 0.5;
  if (pad.orientation === 'VERTICAL') {
    return {
      x: pad.x - 18,
      y: Math.max(pad.y + 18, Math.min(pad.y + pad.h - 18, cy)),
    };
  }
  return {
    x: Math.max(pad.x + 20, Math.min(pad.x + pad.w - 20, cx)),
    y: pad.y + pad.h + 18,
  };
}

export const TABLE_POSITIONS: Array<{ x: number; y: number }> = [
  { x: 236, y: 326 },
  { x: 404, y: 326 },
  { x: 572, y: 326 },
  { x: 740, y: 326 },
  { x: 236, y: 446 },
  { x: 404, y: 446 },
  { x: 572, y: 446 },
  { x: 740, y: 446 },
  { x: 236, y: 566 },
  { x: 404, y: 566 },
  { x: 572, y: 566 },
  { x: 740, y: 566 },
];

export const TABLE_UNLOCK_ORDER = [0, 1, 4, 5, 2, 6, 3, 7, 8, 9, 10, 11];

export const BUFFET_ZONES_CONFIG: BuffetZoneDef[] = [
  {
    id: 'ice_seafood',
    name: '冰鲜 / 冷冻海鲜区',
    shortName: '冰鲜区',
    unlockCost: 0,
    buildDays: 0,
    minShopLevel: 1,
    ticketBonus: 0,
    vipBonus: 0,
    accentColor: '#38BDF8',
    description: '初始标配碎冰海鲜台，摆放冰镇虾、蟹、扇贝、生蚝、青口与鱿鱼，适合涮煮与蒸汽烹制。',
    itemsPreview: '基围虾 · 乳山生蚝扇贝 · 冰鲜鱿鱼青口',
  },
  {
    id: 'cooked_hot',
    name: '熟食 / 热菜明档区',
    shortName: '熟食热菜区',
    unlockCost: 0,
    buildDays: 0,
    minShopLevel: 1,
    ticketBonus: 12,
    vipBonus: 0.03,
    accentColor: '#F97316',
    description: '初始内置热食明档！需消耗冷链原料由店长或热厨主厨现做加工，提供蒜蓉蒸扇贝、避风塘炒蟹等热菜熟食。',
    itemsPreview: '蒜蓉粉丝蒸扇贝 · 避风塘炒蟹 · 热锅海鲜煲',
  },
  {
    id: 'teppan_bbq',
    name: '铁板烧烤区（明火炙烤档）',
    shortName: '铁板烧烤区',
    unlockCost: 440,
    buildDays: 1,
    minShopLevel: 1,
    ticketBonus: 34,
    vipBonus: 0.1,
    accentColor: '#EF4444',
    description: '开辟明火铁板与果木炭烤台！现煎法式羊排、炭烤蒜蓉海鲜串与黑松露鹅肝滋滋作响，炭火焦香极大拉升全厅客单与满意度！',
    itemsPreview: '铁板孜然羊排 · 炭烤蒜蓉海鲜串 · 铁板黑松露鹅肝',
  },
  {
    id: 'hotpot_sides',
    name: '火锅配菜与小料区',
    shortName: '配菜小料区',
    unlockCost: 0,
    buildDays: 0,
    minShopLevel: 1,
    ticketBonus: 8,
    vipBonus: 0,
    accentColor: '#4ADE80',
    description: '初始标配时蔬菌菇、豆制品、手打丸滑、面食与秘制蘸料小料台，有效平衡成本并加快翻台。',
    itemsPreview: '精选肥牛卷 · 手打虾滑时蔬 · 秘制海鲜蘸料',
  },
  {
    id: 'drinks_dessert',
    name: '酒水饮料 / 甜品水果区',
    shortName: '酒水甜品区',
    unlockCost: 340,
    buildDays: 1,
    minShopLevel: 1,
    ticketBonus: 26,
    vipBonus: 0.07,
    accentColor: '#F472B6',
    description: '增设精酿啤酒、鲜榨果汁、茶饮、蛋糕布丁、冰淇淋与当季水果（含金枕榴莲），大幅延缓顾客耐心消耗！',
    itemsPreview: '精酿果饮甜品台 · 金枕榴莲畅吃（春夏秋）',
  },
  {
    id: 'sashimi_sushi',
    name: '刺身与日料区',
    shortName: '刺身日料区',
    unlockCost: 580,
    buildDays: 1,
    minShopLevel: 2,
    ticketBonus: 42,
    vipBonus: 0.12,
    accentColor: '#FB7185',
    description: '开辟恒温刺身明档，供应厚切三文鱼、甜虾、北极贝、象拔蚌、金枪鱼及手卷寿司天妇罗，可配置刺身日料师！',
    itemsPreview: '厚切三文鱼 · 甜虾北极贝手卷 · 蓝鳍大腹',
  },
  {
    id: 'live_seafood',
    name: '活捞海鲜区（海鲜暂养缸）',
    shortName: '活捞海鲜区',
    unlockCost: 960,
    buildDays: 2,
    minShopLevel: 3,
    ticketBonus: 65,
    vipBonus: 0.18,
    accentColor: '#2DD4BF',
    description: '打造透明循环海水暂养池与海鲜缸，波士顿龙虾、鲜活鲍鱼、帝王蟹现捞现杀直下沸锅，镇店顶级名片！',
    itemsPreview: '波士顿活龙虾 · 现捞大鲍鱼 · 深海帝王蟹',
  },
];

export function getBuffetZoneDef(id: BuffetZoneId): BuffetZoneDef {
  return BUFFET_ZONES_CONFIG.find((z) => z.id === id)!;
}

export const SEAFOOD_CATALOG: SeafoodItemDef[] = [
  {
    id: 'prawns',
    name: '鲜活基围虾',
    shortName: '基围虾',
    zone: 'ice_seafood',
    color: '#F26D4B',
    accentColor: '#FFD1B8',
    unlockCost: 0,
    minShopLevel: 1,
    ticketBonus: 24,
    restockCost: 14,
    maxStock: 6,
    description: '基础海鲜招牌，冰鲜直供，四季常驻，人气稳定。',
  },
  {
    id: 'beef_rolls',
    name: '精选肥牛卷',
    shortName: '肥牛卷',
    zone: 'hotpot_sides',
    color: '#C93B3B',
    accentColor: '#FAD4D4',
    unlockCost: 0,
    minShopLevel: 1,
    ticketBonus: 22,
    restockCost: 12,
    maxStock: 6,
    description: '涮锅必点肉品，四季常驻，补货成本亲民。',
  },
  {
    id: 'veggies_balls',
    name: '手打虾滑时蔬小料',
    shortName: '虾滑时蔬',
    zone: 'hotpot_sides',
    color: '#4AA868',
    accentColor: '#C9F2D4',
    unlockCost: 0,
    minShopLevel: 1,
    ticketBonus: 16,
    restockCost: 8,
    maxStock: 7,
    description: '配菜小料区核心拼盘：菌菇时蔬、豆制品、丸滑与蘸料。',
  },
  {
    id: 'garlic_scallops',
    name: '蒜蓉粉丝蒸扇贝烤蚝',
    shortName: '蒜蓉蒸贝',
    zone: 'cooked_hot',
    color: '#F59E0B',
    accentColor: '#FEF3C7',
    unlockCost: 0,
    minShopLevel: 1,
    ticketBonus: 26,
    restockCost: 16,
    maxStock: 6,
    requiresCooking: true,
    description: '【熟食热菜区】消耗原料在热厨加工出品，方便不想久等煮熟的食客大快朵颐！',
  },
  {
    id: 'oysters',
    name: '乳山生蚝青口鱿鱼',
    shortName: '生蚝扇贝',
    zone: 'ice_seafood',
    color: '#6C97B8',
    accentColor: '#DCEEFF',
    unlockCost: 240,
    minShopLevel: 1,
    ticketBonus: 28,
    restockCost: 20,
    maxStock: 6,
    description: '冰鲜海鲜区主力贝类拼盘，肥美鲜甜，明显拉升客单价。',
  },
  {
    id: 'durian_craft',
    name: '金枕榴莲精酿甜品台',
    shortName: '榴莲甜品',
    zone: 'drinks_dessert',
    color: '#EAB308',
    accentColor: '#FEF9C3',
    unlockCost: 320,
    minShopLevel: 1,
    ticketBonus: 36,
    restockCost: 26,
    maxStock: 6,
    seasons: ['SPRING', 'SUMMER', 'AUTUMN'],
    description: '【酒水甜品水果区 · 春夏秋限定】当季金枕榴莲、蛋糕冰淇淋与精酿茶饮，食客满意度暴涨！',
  },
  {
    id: 'bbq_garlic_oyster',
    name: '炭烤蒜蓉海鲜串拼盘',
    shortName: '炭烤海鲜串',
    zone: 'teppan_bbq',
    color: '#EA580C',
    accentColor: '#FFEDD5',
    unlockCost: 380,
    minShopLevel: 1,
    ticketBonus: 34,
    restockCost: 22,
    maxStock: 6,
    description: '【铁板烧烤区】果木明火炭烤大虾、烤生蚝与鱿鱼须，滋滋焦香，四季热销人气王！',
  },
  {
    id: 'teppan_lamb',
    name: '铁板孜然法式羊排',
    shortName: '铁板羊排',
    zone: 'teppan_bbq',
    color: '#D97706',
    accentColor: '#FEF3C7',
    unlockCost: 460,
    minShopLevel: 2,
    ticketBonus: 42,
    restockCost: 27,
    maxStock: 6,
    description: '【铁板烧烤区】高温厚铁板现煎精选羊排配迷迭香与海盐，外焦里嫩，显著提升客单价值。',
  },
  {
    id: 'teppan_foie_gras',
    name: '铁板黑松露法式鹅肝',
    shortName: '铁板鹅肝',
    zone: 'teppan_bbq',
    color: '#B45309',
    accentColor: '#FDE68A',
    unlockCost: 680,
    minShopLevel: 2,
    ticketBonus: 58,
    restockCost: 38,
    maxStock: 5,
    seasons: ['SPRING', 'AUTUMN', 'WINTER'],
    description: '【铁板烧烤区 · 春秋冬限定】铁板慢煎法式肥鹅肝佐黑松露与蓝莓酱，入口即化，豪客必点硬菜！',
  },
  {
    id: 'salmon',
    name: '厚切深海三文鱼',
    shortName: '三文鱼',
    zone: 'sashimi_sushi',
    color: '#F48A5E',
    accentColor: '#FFE2D1',
    unlockCost: 420,
    minShopLevel: 2,
    ticketBonus: 40,
    restockCost: 28,
    maxStock: 6,
    description: '【刺身日料区】冰镇挪威三文鱼厚切刺身，四季供应，显著拉高 VIP 偏好。',
  },
  {
    id: 'sweet_shrimp_sushi',
    name: '甜虾北极贝手卷拼盘',
    shortName: '甜虾日料',
    zone: 'sashimi_sushi',
    color: '#FB7185',
    accentColor: '#FFE4E6',
    unlockCost: 540,
    minShopLevel: 2,
    ticketBonus: 46,
    restockCost: 32,
    maxStock: 6,
    seasons: ['SPRING', 'SUMMER', 'AUTUMN'],
    description: '【刺身日料区 · 春夏秋限定】冰鲜甜虾、北极贝、象拔蚌配现做寿司天妇罗。',
  },
  {
    id: 'typhoon_crab',
    name: '避风塘铁板炒蟹',
    shortName: '避风塘蟹',
    zone: 'cooked_hot',
    color: '#EA580C',
    accentColor: '#FFEDD5',
    unlockCost: 640,
    minShopLevel: 2,
    ticketBonus: 54,
    restockCost: 36,
    maxStock: 5,
    seasons: ['AUTUMN', 'WINTER'],
    requiresCooking: true,
    description: '【熟食铁板区 · 秋冬限定】消耗原料大火爆炒出锅，秋冬季最受欢迎的热菜硬货！',
  },
  {
    id: 'wagyu',
    name: '雪花M9和牛',
    shortName: 'M9和牛',
    zone: 'hotpot_sides',
    color: '#A82633',
    accentColor: '#F5C4C8',
    unlockCost: 820,
    minShopLevel: 3,
    ticketBonus: 56,
    restockCost: 38,
    maxStock: 5,
    description: '高端肉食天花板，四季常供，吸引高净值食客。',
  },
  {
    id: 'abalone_live',
    name: '现捞鲜活大鲍鱼',
    shortName: '活捞鲍鱼',
    zone: 'live_seafood',
    color: '#14B8A6',
    accentColor: '#CCFBF1',
    unlockCost: 980,
    minShopLevel: 3,
    ticketBonus: 62,
    restockCost: 44,
    maxStock: 5,
    seasons: ['SPRING', 'AUTUMN', 'WINTER'],
    description: '【活捞海鲜区 · 春秋冬限定】暂养缸现捞活鲍，弹牙鲜甜，食客纷纷拍照打卡。',
  },
  {
    id: 'lobster',
    name: '波士顿活龙虾',
    shortName: '波士顿龙虾',
    zone: 'live_seafood',
    color: '#D9381E',
    accentColor: '#FFC4B0',
    unlockCost: 1350,
    minShopLevel: 4,
    ticketBonus: 76,
    restockCost: 55,
    maxStock: 5,
    description: '【活捞海鲜区】镇店活鲜大件，现捞现杀直下沸锅，单客消费跃升并带来额外好评。',
  },
  {
    id: 'king_crab',
    name: '深海帝王蟹腿',
    shortName: '帝王蟹',
    zone: 'live_seafood',
    color: '#E04B2E',
    accentColor: '#FFE0A3',
    unlockCost: 2100,
    minShopLevel: 5,
    ticketBonus: 102,
    restockCost: 76,
    maxStock: 5,
    seasons: ['AUTUMN', 'WINTER'],
    description: '【活捞海鲜区 · 秋冬限定】顶级海鲜自助名片，开海肥美季与暖冬限定的王者珍馐。',
  },
  {
    id: 'bluefin_toro',
    name: '蓝鳍金枪鱼大腹',
    shortName: '蓝鳍大腹',
    zone: 'sashimi_sushi',
    color: '#E85D75',
    accentColor: '#FFE5EC',
    unlockCost: 0,
    minShopLevel: 1,
    ticketBonus: 88,
    restockCost: 42,
    maxStock: 6,
    description: '【食评家剧情限定】远洋直供极品大腹，四季尊享，超高餐位溢价与口碑加成！',
    isSpecialReward: true,
  },
];

export const BROTH_CATALOG: BrothDef[] = [
  {
    id: 'spicy_tallow',
    name: '川味麻辣牛油锅',
    color: '#C83223',
    secondaryColor: '#F28B30',
    unlockCost: 0,
    minShopLevel: 1,
    priceBonus: 12,
    description: '四季常驻 · 热辣飘香，经典自助火锅必备。',
  },
  {
    id: 'seafood_clear',
    name: '潮汕鲜菌海鲜锅',
    color: '#E6B85C',
    secondaryColor: '#FFF0C2',
    unlockCost: 0,
    minShopLevel: 1,
    priceBonus: 12,
    description: '四季常驻 · 鲜掉眉毛，最适合涮煮活鲜与贝类。',
  },
  {
    id: 'spring_bamboo',
    name: '春笋椰青清润锅',
    color: '#34D399',
    secondaryColor: '#D1FAE5',
    unlockCost: 240,
    minShopLevel: 1,
    priceBonus: 20,
    seasons: ['SPRING', 'SUMMER'],
    description: '春夏限定 · 清甜降火，搭配活虾与贝类鲜甜倍增。',
  },
  {
    id: 'golden_maw',
    name: '金汤花胶鸡锅',
    color: '#E69F22',
    secondaryColor: '#FFE899',
    unlockCost: 380,
    minShopLevel: 2,
    priceBonus: 28,
    seasons: ['SPRING', 'AUTUMN', 'WINTER'],
    description: '春秋冬限定 · 浓稠金黄高汤，显著提升锅底附加费与小费。',
  },
  {
    id: 'tomyum_royal',
    name: '冬阴功海鲜皇锅',
    color: '#D95A2B',
    secondaryColor: '#FFD07A',
    unlockCost: 680,
    minShopLevel: 2,
    priceBonus: 38,
    seasons: ['SPRING', 'SUMMER', 'AUTUMN'],
    description: '春夏秋限定 · 酸辣开胃南洋风味，夏季最畅销的高溢价锅底。',
  },
  {
    id: 'winter_mutton',
    name: '古法海参滋补老汤锅',
    color: '#B45309',
    secondaryColor: '#FDE68A',
    unlockCost: 920,
    minShopLevel: 3,
    priceBonus: 52,
    seasons: ['AUTUMN', 'WINTER'],
    description: '秋冬限定 · 慢火煨制十小时的顶级滋补御汤，寒冬客单暴涨利器！',
  },
];

export const TICKET_PRICE_TIERS = [
  { label: '自动随菜单定价', price: null, hint: '随上架菜品与分区自动计算合理价位' },
  { label: '¥148 街坊亲民档', price: 148, hint: '客流极旺，全类型特殊食客皆易光顾，适合薄利多销' },
  { label: '¥228 鲜味品质档', price: 228, hint: '均衡档位，兼顾老宗师、食评家与普通客流' },
  { label: '¥318 轻奢海鲜档', price: 318, hint: '筛选低预算散客，显著提高 VIP、食评家与船王千金概率' },
  { label: '¥418 御膳高定档', price: 418, hint: '高端门槛（≥400 将屏蔽平价老饕如周老灶），高净值 VIP 云集' },
  { label: '¥528 顶奢私宴档', price: 528, hint: '极致顶奢（屏蔽平价与中端奇遇），超级贵宾打赏翻倍' },
];

export const SHOP_LEVEL_CONFIG = [
  {
    level: 1,
    title: '街角鲜锅小馆',
    upgradeCost: 0,
    baseRent: 90,
    maxStaffTier: 1 as StaffTier,
    customerRate: 1.0,
    vipChance: 0.08,
    baseTicket: 24,
    maxStaffCount: 5,
    perk: '可招募1星学徒（含热厨主厨），开启海鲜自助与熟食档经营',
  },
  {
    level: 2,
    title: '潮鲜人气自助店',
    upgradeCost: 480,
    baseRent: 160,
    maxStaffTier: 2 as StaffTier,
    customerRate: 1.32,
    vipChance: 0.16,
    baseTicket: 38,
    maxStaffCount: 7,
    perk: '解锁2星熟练骨干、刺身日料区与金汤/冬阴功锅，客流+32%',
  },
  {
    level: 3,
    title: '海景沸鼎旗舰馆',
    upgradeCost: 1100,
    baseRent: 260,
    maxStaffTier: 3 as StaffTier,
    customerRate: 1.65,
    vipChance: 0.25,
    baseTicket: 60,
    maxStaffCount: 9,
    perk: '解锁3星金牌大师、活捞海鲜区与M9和牛，VIP比例大幅提升',
  },
  {
    level: 4,
    title: '臻选星级海鲜殿堂',
    upgradeCost: 2200,
    baseRent: 400,
    maxStaffTier: 4 as StaffTier,
    customerRate: 2.0,
    vipChance: 0.34,
    baseTicket: 88,
    maxStaffCount: 11,
    perk: '解锁4星传奇名匠与波士顿活龙虾，高净值食客云集',
  },
  {
    level: 5,
    title: '传奇海上御膳火锅城',
    upgradeCost: 3800,
    baseRent: 580,
    maxStaffTier: 4 as StaffTier,
    customerRate: 2.35,
    vipChance: 0.45,
    baseTicket: 128,
    maxStaffCount: 14,
    perk: '解锁帝王蟹顶级品类，顶级客单价与满座人气',
  },
];

export const TABLE_EXPANSION_TIERS = [
  { tables: 4, cost: 0, minShopLevel: 1, label: '4桌 基础大厅' },
  { tables: 6, cost: 280, minShopLevel: 1, label: '6桌 扩建卡座' },
  { tables: 8, cost: 640, minShopLevel: 2, label: '8桌 开放东翼' },
  { tables: 10, cost: 1180, minShopLevel: 3, label: '10桌 雅座升级' },
  { tables: 12, cost: 1950, minShopLevel: 4, label: '12桌 全厅满配' },
];

export const DISHWARE_UPGRADE_TIERS = [
  { maxDishes: 8, cost: 0, label: '8套 标准餐具' },
  { maxDishes: 14, cost: 180, label: '14套 瓷釉加厚餐具' },
  { maxDishes: 22, cost: 420, label: '22套 高温消毒餐具库' },
  { maxDishes: 32, cost: 820, label: '32套 旗舰级餐具周转' },
];

export const BUFFET_CAPACITY_TIERS = [
  { bonus: 0, cost: 0, label: '标准冰槽容量' },
  { bonus: 3, cost: 260, label: '深冷双层冰槽 (+3份/格)' },
  { bonus: 6, cost: 620, label: '豪华恒温海鲜池 (+6份/格)' },
  { bonus: 10, cost: 1200, label: '全自动鲜活展示柜 (+10份/格)' },
];

export const STAFF_ROLE_META: Record<
  StaffRole,
  {
    title: string;
    shortTitle: string;
    color: string;
    badgeBg: string;
    homeX: number;
    homeY: number;
    responsibility: string;
    requiredZone?: BuffetZoneId;
  }
> = {
  HOST: {
    title: '迎宾员',
    shortTitle: '迎宾',
    color: '#E5A93B',
    badgeBg: '#5C4212',
    homeX: 116,
    homeY: 226,
    responsibility: '迎接排队顾客并引导至已摆台餐桌',
  },
  CHEF: {
    title: '热厨主厨',
    shortTitle: '热厨',
    color: '#F97316',
    badgeBg: '#6B280D',
    homeX: 850,
    homeY: 138,
    responsibility: '消耗冷链原料在热厨烹制蒜蓉蒸贝、炒蟹等熟食并补给熟食区',
  },
  STOCKER: {
    title: '摆菜切配师',
    shortTitle: '摆菜',
    color: '#34B3A0',
    badgeBg: '#124D45',
    homeX: 740,
    homeY: 138,
    responsibility: '从生鲜备菜台补货摆满海鲜冰台菜品',
  },
  RUNNER: {
    title: '上锅传菜员',
    shortTitle: '上锅',
    color: '#E85A3C',
    badgeBg: '#5E2012',
    homeX: 540,
    homeY: 136,
    responsibility: '从熬汤灶端出热腾锅底送上餐桌',
  },
  BUSSER: {
    title: '收桌保洁员',
    shortTitle: '收桌',
    color: '#6CA6E8',
    badgeBg: '#1D3E66',
    homeX: 250,
    homeY: 258,
    responsibility: '收拾餐后桌面将脏餐具送入洗碗池，并协助清洁卫生间',
  },
  DISHWASHER: {
    title: '洗碗工',
    shortTitle: '洗碗',
    color: '#9C88F0',
    badgeBg: '#372C69',
    homeX: 165,
    homeY: 130,
    responsibility: '在洗消间清洗脏餐具并补充至消毒柜',
  },
  SETTER: {
    title: '摆台服务员',
    shortTitle: '摆台',
    color: '#73C96E',
    badgeBg: '#224F20',
    homeX: 335,
    homeY: 136,
    responsibility: '取干净餐具为已清洁餐桌完成摆台',
  },
  LIVE_MASTER: {
    title: '活鲜水产师',
    shortTitle: '水产',
    color: '#2DD4BF',
    badgeBg: '#115E59',
    homeX: 650,
    homeY: 138,
    responsibility: '照看冷链库房与活捞海鲜暂养缸，自动补货高价活鲜并降低损耗',
    requiredZone: 'live_seafood',
  },
  SUSHI_CHEF: {
    title: '刺身日料师',
    shortTitle: '日料',
    color: '#FB7185',
    badgeBg: '#7F1D3A',
    homeX: 790,
    homeY: 146,
    responsibility: '负责刺身日料区现切摆盘，自动补货刺身并大幅提升 VIP 满意度与小费',
    requiredZone: 'sashimi_sushi',
  },
  TECHNICIAN: {
    title: '设备维保员',
    shortTitle: '维保',
    color: '#94A3B8',
    badgeBg: '#334155',
    homeX: 210,
    homeY: 136,
    responsibility: '自动巡检设备间制冷/增氧机组并维护卫生间洁净度，防止故障扣分',
  },
  INVENTORY_CLERK: {
    title: '库存采购员',
    shortTitle: '仓管',
    color: '#FBBF24',
    badgeBg: '#6B4810',
    homeX: 904,
    homeY: 130,
    responsibility: '每日闭店后自动按当季成本补购短缺菜品库存与冷链原料（次日闭店到货），并享采购折扣',
  },
};

export const PART_TIME_JOBS: PartTimeJobDef[] = [
  {
    id: 'pt_chef',
    title: '高峰兼职热厨帮工',
    role: 'CHEF',
    dailyWage: 48,
    durationDays: 2,
    tier: 1,
    description: '不占正式编制！连续 2 天协助热厨加工熟食，缓解晚市熟食断档。',
  },
  {
    id: 'pt_runner',
    title: '夜宵兼职传菜生',
    role: 'RUNNER',
    dailyWage: 42,
    durationDays: 2,
    tier: 1,
    description: '不占正式编制！连续 2 天帮端沸腾锅底上桌，避免催锅逃单。',
  },
  {
    id: 'pt_busser',
    title: '兼职收台洗消工',
    role: 'BUSSER',
    dailyWage: 40,
    durationDays: 2,
    tier: 1,
    description: '不占正式编制！连续 2 天协助收脏桌、分拣海鲜壳并保持卫生。',
  },
  {
    id: 'pt_dishwasher',
    title: '晚市兼职洗碗阿姨',
    role: 'DISHWASHER',
    dailyWage: 38,
    durationDays: 3,
    tier: 2,
    description: '不占正式编制！手脚麻利的 2 星效率洗碗兼职，签约 3 天。',
  },
  {
    id: 'pt_stocker',
    title: '周末兼职冰台理货员',
    role: 'STOCKER',
    dailyWage: 45,
    durationDays: 2,
    tier: 2,
    description: '不占正式编制！连续 2 天巡检冰台海鲜，及时补货防断供。',
  },
  {
    id: 'pt_inventory',
    title: '临时冷链仓管采购员',
    role: 'INVENTORY_CLERK',
    dailyWage: 42,
    durationDays: 3,
    tier: 1,
    description: '不占正式编制！连续 3 天负责每日闭店自动核查库存并下单采购（次日闭店入库）。',
  },
];

export const FACILITY_SCENES: FacilitySceneDef[] = [
  {
    id: 'cold_storage',
    name: '粗加工与活鲜 / 冷链库房',
    shortName: '冷链库房',
    accentColor: '#38BDF8',
    description: '紧邻后厨与卸货通道，设冷库、冻库、活鲜暂养池与水产初加工台，减少长距离搬运损耗。',
    linkedRoles: ['LIVE_MASTER', 'STOCKER', 'INVENTORY_CLERK'],
  },
  {
    id: 'hot_kitchen',
    name: '热厨与出品间',
    shortName: '热厨出品',
    accentColor: '#F97316',
    description: '负责熟食加工、熬汤与向取餐台快速补货，独立补货动线避免与顾客取餐线交叉。',
    linkedRoles: ['CHEF', 'RUNNER', 'SUSHI_CHEF'],
  },
  {
    id: 'dish_washroom',
    name: '餐具回收与洗消间',
    shortName: '回收洗消',
    accentColor: '#A78BFA',
    description: '靠近用餐区侧边，便于服务员快速收台、分拣海鲜壳类垃圾与高温集中洗消。',
    linkedRoles: ['DISHWASHER', 'BUSSER'],
  },
  {
    id: 'restroom',
    name: '卫生间与洗手区',
    shortName: '洗手间',
    accentColor: '#2DD4BF',
    description: '海鲜餐厅剥虾拆蟹洗手频率极高，需配置充足洗手台并勤保洁，否则直接影响口碑与卫生。',
    linkedRoles: ['TECHNICIAN', 'BUSSER'],
  },
  {
    id: 'equipment_room',
    name: '设备间（冷机 / 制冰 / 增氧）',
    shortName: '设备间',
    accentColor: '#94A3B8',
    description: '容纳制冷机组、制冰机、水处理增氧泵、强排风机与油水分离器，需定期检修防停机。',
    linkedRoles: ['TECHNICIAN', 'LIVE_MASTER'],
  },
  {
    id: 'dormitory',
    name: '员工宿舍',
    shortName: '员工宿舍',
    accentColor: '#F472B6',
    description: '员工夜班后歇脚休息的温馨宿舍。可慰问团建恢复全员精力，并与特殊店员谈心约会！',
    linkedRoles: ['HOST', 'SETTER', 'CHEF'],
  },
  {
    id: 'office',
    name: '店长办公室',
    shortName: '店长室',
    accentColor: '#E8C97A',
    description: '运营神经中枢：每日考勤核查、当季原料大宗采购、发布兼职任务与核心决策密谈。',
    linkedRoles: ['HOST'],
  },
];

export const TIER_META: Record<
  StaffTier,
  { label: string; stars: string; color: string; costMult: number; wageMult: number }
> = {
  1: { label: '实习学徒', stars: '★', color: '#A3B0C2', costMult: 1, wageMult: 1 },
  2: { label: '熟练骨干', stars: '★★', color: '#45C486', costMult: 2.3, wageMult: 1.7 },
  3: { label: '金牌大师', stars: '★★★', color: '#E5A93B', costMult: 4.8, wageMult: 2.8 },
  4: { label: '传奇名匠', stars: '★★★★', color: '#F26444', costMult: 9.2, wageMult: 4.5 },
};

const STAFF_NAMES: Record<StaffRole, string[][]> = {
  HOST: [
    ['小桃', '林安'],
    ['苏晴', '周礼'],
    ['沈曼丽', '顾承泽'],
    ['白薇·礼宾总监', '陆景明·金牌大堂'],
  ],
  CHEF: [
    ['阿炒', '小灶'],
    ['何铁板', '方炙'],
    ['陈粤明', '段火侯'],
    ['梁鼎天·铁板御厨', '范灼华·炽焰主厨'],
  ],
  STOCKER: [
    ['阿海', '小鱼'],
    ['陈潮生', '林鲜'],
    ['郑海峰', '吴锦涛'],
    ['蔡澜轩·鲜活刀神', '梁海皇·冰台宗师'],
  ],
  RUNNER: [
    ['小火', '阿旺'],
    ['张鼎', '赵烈'],
    ['黄汤正', '刘沸'],
    ['唐百味·汤鼎传人', '宋九鼎·极速火神'],
  ],
  BUSSER: [
    ['阿洁', '小林'],
    ['王净', '李爽'],
    ['许清风', '何明镜'],
    ['方无尘·洁净大师', '叶疾风·闪电收台'],
  ],
  DISHWASHER: [
    ['阿泡', '小水'],
    ['孙浪', '马亮'],
    ['钱晶晶', '高光'],
    ['韩银辉·光洁圣手', '潘玉瓷·极速洗神'],
  ],
  SETTER: [
    ['小雅', '阿敏'],
    ['罗仪', '宋齐'],
    ['秦若云', '江锦绣'],
    ['谢星宴·国宴摆台', '温玉衡·典雅宗师'],
  ],
  LIVE_MASTER: [
    ['阿浪', '渔仔'],
    ['许深海', '蔡养鲜'],
    ['林沧海', '柯泊舟'],
    ['庄海王·活鲜宗师', '郑蛟龙·冷链掌舵'],
  ],
  SUSHI_CHEF: [
    ['小旬', '阿凛'],
    ['藤原明', '江清切'],
    ['佐藤岚', '柳寒刃'],
    ['霜月彻·刺身神手', '白石旬·怀石宗师'],
  ],
  TECHNICIAN: [
    ['小修', '阿机'],
    ['鲁工', '马电'],
    ['墨守成', '公输衡'],
    ['齐百工·冷链神匠', '韩总工·零故障大师'],
  ],
  INVENTORY_CLERK: [
    ['小账', '阿仓'],
    ['周算盘', '沈采采'],
    ['顾货通', '郑冷链'],
    ['范陶朱·海贸大掌柜', '陆万箱·全球直采王'],
  ],
};

export function createStaffCandidate(role: StaffRole, tier: StaffTier, seedIdx: number): StaffCandidate {
  const names = STAFF_NAMES[role][tier - 1];
  const name = names[seedIdx % names.length];

  const baseCost = role === 'CHEF' || role === 'SUSHI_CHEF' || role === 'LIVE_MASTER' ? 165 : 140;
  const baseWage = role === 'CHEF' || role === 'SUSHI_CHEF' ? 44 : 38;
  const tierInfo = TIER_META[tier];

  const hireCost = Math.round(baseCost * tierInfo.costMult);
  const dailyWage = Math.round(baseWage * tierInfo.wageMult);

  const moveSpeed = Math.round(122 + (tier - 1) * 44);
  const workSpeed = Number((0.95 + (tier - 1) * 0.65).toFixed(2));
  const carryCapacity = tier === 1 ? 1 : tier === 2 ? 2 : tier === 3 ? 3 : 4;

  let bonusTitle = '';
  let bonusDetail = '';
  let bonusValue = 0;

  switch (role) {
    case 'HOST':
      bonusValue = tier === 1 ? 0.12 : tier === 2 ? 0.28 : tier === 3 ? 0.45 : 0.65;
      bonusTitle = tier >= 3 ? '礼宾安抚 · 招揽VIP' : '亲和迎宾';
      bonusDetail = `排队耐心衰减-${Math.round(bonusValue * 100)}%，带位自带+${tier * 4}好感${tier >= 3 ? `，VIP率+${tier * 5}%` : ''}`;
      break;
    case 'CHEF':
      bonusValue = tier === 1 ? 2 : tier === 2 ? 3 : tier === 3 ? 4 : 6;
      bonusTitle = tier >= 3 ? '铁板爆炒名厨' : '明档现烹';
      bonusDetail = `自动消耗原料加工熟食，每次出锅 +${bonusValue} 份熟食，熟食客单小费 +${tier * 8}%`;
      break;
    case 'STOCKER':
      bonusValue = tier === 1 ? 0.05 : tier === 2 ? 0.12 : tier === 3 ? 0.22 : 0.35;
      bonusTitle = tier >= 3 ? '米其林冰台摆盘' : '保鲜补菜';
      bonusDetail = `单次补货×${carryCapacity}倍，全店小费+${Math.round(bonusValue * 100)}%，食材损耗-${tier * 8}%`;
      break;
    case 'RUNNER':
      bonusValue = tier === 1 ? 0.08 : tier === 2 ? 0.18 : tier === 3 ? 0.32 : 0.5;
      bonusTitle = tier >= 3 ? '沸鼎飘香加速' : '稳妥上锅';
      bonusDetail = `上锅后小费+${Math.round(bonusValue * 100)}%，顾客就餐满意度+${tier * 5}，翻台提速+${tier * 8}%`;
      break;
    case 'BUSSER':
      bonusValue = tier === 1 ? 1.5 : tier === 2 ? 3.5 : tier === 3 ? 6 : 10;
      bonusTitle = tier >= 3 ? '无痕除味净化' : '细致保洁';
      bonusDetail = `每收一桌恢复卫生+${bonusValue}，同步维护卫生间洁净，减少脏桌扣分${tier * 12}%`;
      break;
    case 'DISHWASHER':
      bonusValue = tier === 1 ? 1 : tier === 2 ? 2 : tier === 3 ? 3 : 5;
      bonusTitle = tier >= 3 ? '高温杀菌闪亮' : '高效洗刷';
      bonusDetail = `单次洗净${bonusValue}套餐具，洗碗额外提升店铺卫生+${tier * 1.2}`;
      break;
    case 'SETTER':
      bonusValue = tier === 1 ? 6 : tier === 2 ? 14 : tier === 3 ? 24 : 38;
      bonusTitle = tier >= 3 ? '星级仪式摆台' : '齐整餐具';
      bonusDetail = `单次可携${carryCapacity}套餐具，该桌顾客初始耐心+${bonusValue}%，好评小费+${tier * 6}%`;
      break;
    case 'LIVE_MASTER':
      bonusValue = tier * 0.08;
      bonusTitle = tier >= 3 ? '深海活鲜掌舵' : '活水暂养';
      bonusDetail = `活捞区自动补货、持续增氧保鲜，全店海鲜原料成本 -${Math.round(bonusValue * 100)}%`;
      break;
    case 'SUSHI_CHEF':
      bonusValue = tier * 0.1;
      bonusTitle = tier >= 3 ? '极上刺身匠心' : '鲜切刺身';
      bonusDetail = `刺身日料区自动补货，VIP 出现率 +${tier * 4}%，全店小费 +${Math.round(bonusValue * 100)}%`;
      break;
    case 'TECHNICIAN':
      bonusValue = tier * 1.5;
      bonusTitle = tier >= 3 ? '零故障冷链总工' : '设施巡检';
      bonusDetail = `自动维护设备间制冷/制冰机与卫生间洁净（每秒恢复耐久与洁净），防设施故障罚款`;
      break;
    case 'INVENTORY_CLERK':
      bonusValue = tier === 1 ? 0.06 : tier === 2 ? 0.12 : tier === 3 ? 0.18 : 0.25;
      bonusTitle = tier >= 3 ? '海港大宗议价师' : '智能闭店补仓';
      bonusDetail = `每日闭店自动补购低库存菜品与原料（次日闭店入库），采购成本 -${Math.round(bonusValue * 100)}%，营业期兼帮冷链搬运`;
      break;
  }

  return {
    candidateId: `${role}_T${tier}_${seedIdx}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name,
    role,
    tier,
    hireCost,
    dailyWage,
    moveSpeed,
    workSpeed,
    carryCapacity,
    bonusTitle,
    bonusDetail,
    bonusValue,
  };
}

export function generateCandidatePool(
  shopLevel: number,
  unlockedZones: BuffetZoneId[] = ['ice_seafood', 'cooked_hot', 'hotpot_sides']
): StaffCandidate[] {
  const maxTier = SHOP_LEVEL_CONFIG[shopLevel - 1].maxStaffTier;
  const roles: StaffRole[] = [
    'HOST',
    'CHEF',
    'STOCKER',
    'RUNNER',
    'BUSSER',
    'DISHWASHER',
    'SETTER',
    'TECHNICIAN',
    'INVENTORY_CLERK',
  ];
  if (unlockedZones.includes('sashimi_sushi')) roles.push('SUSHI_CHEF');
  if (unlockedZones.includes('live_seafood')) roles.push('LIVE_MASTER');

  const pool: StaffCandidate[] = [];
  roles.forEach((role, idx) => {
    pool.push(createStaffCandidate(role, 1, idx));
    if (maxTier >= 2) pool.push(createStaffCandidate(role, 2, idx + 1));
    if (maxTier >= 3) pool.push(createStaffCandidate(role, 3, idx + 2));
    if (maxTier >= 4) pool.push(createStaffCandidate(role, 4, idx + 3));
  });

  return pool;
}

export function getShopConfig(shopLevel: number) {
  return SHOP_LEVEL_CONFIG[Math.min(Math.max(shopLevel, 1), SHOP_LEVEL_CONFIG.length) - 1];
}
