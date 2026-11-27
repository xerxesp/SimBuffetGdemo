import {
  BROTH_CATALOG,
  getSeasonDef,
  getShopConfig,
  STAFF_ROLE_META,
} from './gameConfig';
import { getCharacterDef, getSpecialStaffDef } from './storyConfig';
import { awardPlayerXpFromCash } from '../engine/playerProgression';
import {
  CustomerParty,
  DialogueLine,
  GameWorld,
  HiredStaff,
  InspectionMetricItem,
  InspectionReportCard,
  SpecialStaffId,
  StoryChoiceOption,
  StoryModalEvent,
} from '../types/game';

export const INSPECTION_INTERVAL_DAYS = 15;

let dlgUid = 80000;
function nextDlgId(prefix: string): string {
  dlgUid += 1;
  return `${prefix}_${dlgUid}`;
}

// ============================================================================
// 1. ORDINARY & MASTER STAFF PRE-OPEN / CLOSING DIALOGUES
// ============================================================================

export function buildOrdinaryStaffChatEvent(
  world: GameWorld,
  staff: HiredStaff,
  isFirstToday: boolean
): StoryModalEvent {
  const charDef = getCharacterDef(world.characterId);
  const meta = STAFF_ROLE_META[staff.role];
  const seasonDef = getSeasonDef(world.season);
  const isPrep = world.phase === 'PREP';
  const lowWarehouseCount = world.buffetSlots.filter(
    (s) => (world.warehouseStock[s.itemId] ?? 0) <= 8
  ).length;
  const dirtyTables = world.tables.filter((t) => t.status === 'DIRTY').length;

  // Special non-romance legendary masters (周老灶 & 阿镜)
  if (staff.name.includes('周老灶')) {
    const lines: DialogueLine[] = isPrep
      ? [
          {
            speaker: '周老灶',
            title: '特聘国宴汤锅宗师',
            text: `“${charDef.name}店长起得早啊！${seasonDef.name}湿寒/燥热有别，我刚把今天的高汤底火调匀，待会儿第一锅牛油与清汤端上去，保准香飘半条街！”`,
            accentColor: '#2DD4BF',
          },
          {
            speaker: charDef.name,
            title: '店长',
            text: '“有周老爷子坐镇锅灶，客人们进门闻到香味就走不动道了，您也要注意别累着腰！”',
            accentColor: charDef.accentColor,
          },
        ]
      : [
          {
            speaker: '周老灶',
            title: '特聘国宴汤锅宗师',
            text: `“呼——今天端了这么多滚锅，看着客人们喝汤抹嘴直夸赞，老头子我比当年在国宴厅还舒坦！明天咱们再把火候拿捏得更绝些。”`,
            accentColor: '#2DD4BF',
          },
          {
            speaker: charDef.name,
            title: '店长',
            text: '“您辛苦啦！收完灶火我给您沏一壶老普洱解解乏。”',
            accentColor: charDef.accentColor,
          },
        ];
    return {
      id: nextDlgId('staff_chat_zhou'),
      category: 'STAFF_CHAT',
      badge: isPrep ? '开店前寒暄 · 传锅宗师' : '闭店后谈心 · 传锅宗师',
      speakerName: '周老灶',
      speakerTitle: '特聘国宴汤锅宗师',
      accentColor: '#2DD4BF',
      headline: isPrep ? '开炉前的汤头叮嘱' : '熄火后的灶台闲话',
      body: lines[0].text,
      lines,
      rewardHighlight: isFirstToday
        ? '与宗师谈心鼓舞士气：周老灶士气 +15、疲劳 -15！'
        : '周老灶笑呵呵地拍了拍大铜勺，干劲满满。',
    };
  }

  if (staff.name.includes('阿镜')) {
    const lines: DialogueLine[] = isPrep
      ? [
          {
            speaker: '阿镜',
            title: '特聘纳米洗消专员',
            text: `“店长早！消毒柜里的 ${world.cleanDishes} 套净盘我都用高温蒸汽复检了一遍，镜面反光零水渍——哪怕检查组突击抽查也挑不出半点毛病！”`,
            accentColor: '#38BDF8',
          },
          {
            speaker: charDef.name,
            title: '店长',
            text: '“有你在洗消间把关，全店的卫生评分稳如泰山！”',
            accentColor: charDef.accentColor,
          },
        ]
      : [
          {
            speaker: '阿镜',
            title: '特聘纳米洗消专员',
            text:
              world.dirtyDishes > 0
                ? `“闭店啦！池子里还剩 ${world.dirtyDishes} 套脏盘，我三两下就能刷得锃亮，绝不让隔夜腥味留在后厨！”`
                : '“今天所有碗碟都已经彻底消毒归位啦！听着消毒柜干爽的蜂鸣声，强迫症简直太治愈了。”',
            accentColor: '#38BDF8',
          },
        ];
    return {
      id: nextDlgId('staff_chat_ajing'),
      category: 'STAFF_CHAT',
      badge: isPrep ? '开店前交流 · 洗消专员' : '闭店后交流 · 洗消专员',
      speakerName: '阿镜',
      speakerTitle: '特聘纳米洗消专员',
      accentColor: '#38BDF8',
      headline: isPrep ? '开市前的洁净复核' : '闭店后的洗消收尾',
      body: lines[0].text,
      lines,
      rewardHighlight: isFirstToday
        ? '细致沟通提升团队默契：阿镜士气 +15、疲劳 -15！'
        : '阿镜认真点点头，继续擦拭着锃亮的瓷盘。',
    };
  }

  // Contextual tips + role-flavored lines for all 11 standard staff roles
  const roleLinesPrep: Record<HiredStaff['role'], string[]> = {
    HOST: [
      `“店长早！门口的红灯笼和排号牌我都摆齐了，${seasonDef.name}来吃海鲜锅的客人多，待会儿我一定笑容满面迎客！”`,
      '“昨天有几位老客夸咱们带位麻利，今天开业我准备把靠窗雅座优先留给带长辈的家庭客。”',
    ],
    STOCKER: [
      lowWarehouseCount > 0
        ? `“店长，刚才盘点冷库时发现有 ${lowWarehouseCount} 道在售菜品后仓偏紧，今晚闭店记得去后场冷链库房补订一批哦！”`
        : '“碎冰台已经铺满新打的雪花冰啦，虾蟹摆盘晶莹剔透，开店一准让人挪不开眼！”',
      `“${seasonDef.name}海鲜行情变动快，我特意把最新鲜的那一批摆在最显眼的位置！”`,
    ],
    RUNNER: [
      '“炉灶那边沸汤已经咕嘟冒香啦，待会儿只要客人一落座，我准保稳稳当当把锅端上桌！”',
      '“新换的防烫托盘真趁手，今天高峰期也能跑出残影来！”',
    ],
    BUSSER: [
      world.hygiene < 75
        ? `“店长，咱们现在卫生分只有 ${Math.round(world.hygiene)}，待会儿营业我一定紧盯脏桌，绝不让苍蝇和腥味坏了口碑！”`
        : '“前厅地面和餐椅我都用柠檬去腥水擦过一遍了，空气清清爽爽，随时可以开市！”',
      '“海鲜壳篮我都套好了加厚袋子，收台翻桌保证利索！”',
    ],
    DISHWASHER: [
      world.dirtyDishes > 0
        ? `“洗消间里还有 ${world.dirtyDishes} 套昨晚留下的碗碟，开店前我马上冲净消毒！”`
        : '“净盘架摞得整整齐齐，高温消毒灯也亮着，今天尽管放开迎客！”',
      '“新调的去油洗洁精真好用，牛油锅底的碗也能一冲就亮！”',
    ],
    SETTER: [
      '“筷架、骨碟、湿巾和围裙都按标准摆正啦，客人一坐下就能感受到仪式感！”',
      '“只要收台那边一清空，我立刻冲过去把新餐具摆上，绝不耽误翻台！”',
    ],
    CHEF: [
      world.rawIngredients < 10
        ? `“店长提醒一句，冷链原料只剩 ${world.rawIngredients} 份啦！熟食明档客流量大，记得去后场补些原料。”`
        : '“铁板已经预热到最佳温度，蒜蓉粉丝与避风塘金蒜都备齐了，一开店就让熟食区香气四溢！”',
      '“我又微调了烤生蚝的蒜蓉酱比例，待会儿店长有空也尝一口！”',
    ],
    LIVE_MASTER: [
      world.oxygenLevel < 70
        ? '“活鲜暂养池含氧量偏低了，店长有空可以去冷链库房换水增氧，免得波龙和鲍鱼没精神！”'
        : '“海鲜缸里盐度和充氧都稳稳的，龙虾个个生猛挥钳子，客人看着肯定过瘾！”',
      '“活捞区的捞网我都洗净晾干了，今天保证每一只都是现捞鲜活！”',
    ],
    SUSHI_CHEF: [
      '“刺身冰板温度稳在零度，柳刃刀也刚磨得吹毛断发，待会儿厚切三文鱼绝不手软！”',
      '“醋饭焖得粒粒分明，海苔脆香，今天日料档一定能帮店里多赚好评！”',
    ],
    TECHNICIAN: [
      world.equipmentHealth < 72 || world.restroomCleanliness < 72
        ? `“店长注意啦：设备耐久 ${Math.round(world.equipmentHealth)}%、卫生间洁净 ${Math.round(world.restroomCleanliness)}%，半月检查组最看重这两项，有空记得巡检维护！”`
        : '“制冷机组、油水分离器和洗手台感应龙头我都巡查过啦，一切运转正常，放心开店！”',
      '“后场强排风机的滤网刚清完，今天热厨油烟肯定抽得干干净净！”',
    ],
    INVENTORY_CLERK: [
      lowWarehouseCount > 0
        ? `“店长早，账本显示有 ${lowWarehouseCount} 道菜后仓库存偏低，放心吧，今晚闭店我会按成本最优批量自动帮您补单！”`
        : '“各菜品后仓库存和冷链在途单我都核对清楚了，今日货源充裕，无断供之忧！”',
      `“${seasonDef.name}批发行情略有波动，我会盯着冷链价差替店里精打细算的。”`,
    ],
  };

  const roleLinesClosing: Record<HiredStaff['role'], string[]> = {
    HOST: [
      `“打烊啦！今天一共招待了 ${world.todayStats.guestsServed} 桌客人，好几位离店时还说下回要带家人来呢！”`,
      '“站了一天腿有点酸，不过听见客人夸咱们服务周到，心里特别甜！”',
    ],
    STOCKER: [
      lowWarehouseCount > 0
        ? `“闭店盘点了下冷库，有 ${lowWarehouseCount} 道在售菜后仓告急，趁着现在闭店赶紧去冷链库房下单，明晚闭店就能到货！”`
        : '“冰台余货都覆膜收回冷库保鲜啦，零浪费！”',
      '“今晚海鲜卖得飞快，感觉客人们对咱们的鲜度越来越认可了！”',
    ],
    RUNNER: [
      '“最后一锅也稳稳收尾啦！满身火锅香味回去，室友肯定又馋得不行。”',
      '“今天高峰期一桌接一桌，虽然忙得脚不沾地，但配合得真痛快！”',
    ],
    BUSSER: [
      dirtyTables > 0
        ? `“大厅里还有 ${dirtyTables} 张脏桌没收完呢，咱们赶紧一起清干净，还能拿打烊洁净奖励呢！”`
        : '“全厅桌子擦得锃亮，海鲜壳也全部打包清运了，明天开市准保清爽！”',
      '“收完最后一张台子，看着安静下来的红灯笼大厅，真有成就感。”',
    ],
    DISHWASHER: [
      world.dirtyDishes > 0
        ? `“洗碗池里还堆着 ${world.dirtyDishes} 套脏碗，趁着闭店我加把劲刷干净再收工！”`
        : '“所有餐具都刷净入柜消毒啦，今晚可以踏踏实实睡个好觉！”',
      '“手泡了一晚上热水有点发白，好在看着一摞摞干干净净的瓷盘特别解压。”',
    ],
    SETTER: [
      '“擦完最后一批蘸料碟，明天开店前摆台就能更快一步啦！”',
      '“今天有桌小客人把折纸小船留在了桌角，写着谢谢姐姐，真暖心。”',
    ],
    CHEF: [
      '“熄了铁板火，把灶台油槽刷干净，这是厨师每天最不能省的收档规矩！”',
      `“今晚熟食档出了 ${world.todayStats.cookedDishesServed} 份热菜，铁板滋滋响的时候最有烟火气了。”`,
    ],
    LIVE_MASTER: [
      '“闭店前又测了一遍暂养池水温与溶氧，明早开缸照样活蹦乱跳！”',
      '“伺候好这群娇气的波龙和鲍鱼，它们才能替咱们挣大钱嘛。”',
    ],
    SUSHI_CHEF: [
      '“把柳刃刀擦干上油收进木鞘，今晚的刺身切配圆满收官！”',
      '“有几位识货的老饕连夸咱们三文鱼油脂漂亮，听得我干劲倍增。”',
    ],
    TECHNICIAN: [
      world.equipmentHealth < 70
        ? `“店长，今天高负荷运转后设备健康降到了 ${Math.round(world.equipmentHealth)}%，闭店后去设备间花 ¥30 检修保养一下最稳妥！”`
        : '“已关闭大厅辅灯，只保留冷库和活鲜增氧机低噪运行，水电安全无虞！”',
      '“卫生间我也刚用除味喷雾清理完，明天开门又是五星级标准。”',
    ],
    INVENTORY_CLERK: [
      '“今晚在途的冷链货单和明日采购清单都已经入账核验啦，店长查账一目了然！”',
      '“跟着店长把小店冷链越做越规范，我觉得自己也快成供应链行家了。”',
    ],
  };

  const pool = isPrep ? roleLinesPrep[staff.role] : roleLinesClosing[staff.role];
  const lineText = pool[(world.day + staff.tasksCompleted) % pool.length];
  const managerReply = isPrep
    ? `“辛苦啦，${staff.name}！今天也拜托你一起守好岗位，咱们把口碑做响！”`
    : `“今天表现太棒了，${staff.name}！收尾完早点回宿舍歇息，别太累着自己。”`;

  const lines: DialogueLine[] = [
    {
      speaker: staff.name,
      title: `${meta.title}${staff.isPartTime ? ' · 兼职' : ''}`,
      text: lineText,
      accentColor: meta.color,
    },
    {
      speaker: charDef.name,
      title: '店长',
      text: managerReply,
      accentColor: charDef.accentColor,
    },
  ];

  return {
    id: nextDlgId('staff_chat'),
    category: 'STAFF_CHAT',
    badge: isPrep ? `开店前交流 · ${meta.title}` : `闭店后慰问 · ${meta.title}`,
    speakerName: staff.name,
    speakerTitle: `${meta.title} · Lv.${staff.tier}`,
    accentColor: meta.color,
    headline: isPrep ? `与「${staff.name}」开店前沟通` : `与「${staff.name}」闭店后寒暄`,
    body: lineText,
    lines,
    rewardHighlight: isFirstToday
      ? `今日首次谈心鼓励：${staff.name} 士气 +12（当前 ${Math.min(100, Math.round(staff.morale + 12))}），疲劳 -10！`
      : `与 ${staff.name} 闲聊了一会儿，店里氛围格外融洽。`,
  };
}

// ============================================================================
// 2. SPECIAL STAFF DAILY DIALOGUES + SPECIFIC TRIGGERED EVENTS + ROMANCE DRAMA
// ============================================================================

interface SpecialStaffSpecialEventDef {
  eventId: string;
  staffId: SpecialStaffId;
  minAffection: number;
  requiredRelationship?: Array<'COLLEAGUE' | 'CLOSE' | 'DATING' | 'MARRIED'>;
  preferredPhase?: 'PREP' | 'CLOSING';
  badge: string;
  headline: string;
  lines: (mgrName: string) => DialogueLine[];
  choices: StoryChoiceOption[];
}

const SPECIAL_STAFF_TRIGGER_EVENTS: SpecialStaffSpecialEventDef[] = [
  {
    eventId: 'evt_lin_midnight_tide',
    staffId: 'lin_xi',
    minAffection: 35,
    preferredPhase: 'CLOSING',
    badge: '特殊事件 · 港湾夜潮',
    headline: '闭店后的冷库炭烤宵夜',
    lines: (mgr) => [
      {
        speaker: '林汐',
        title: '冷链切配师',
        text: '“喂，店长，别急着关闸门呀！刚才整理冷库时多了几尾没法隔夜的嫩鱿鱼，我偷偷在后门小炭炉烤好了，撒了海盐和七味粉！”',
        accentColor: '#38BDF8',
      },
      {
        speaker: mgr,
        title: '店长',
        text: '“哇，焦香扑鼻！你什么时候练出这么一手烧烤绝活的？”',
        accentColor: '#E8C97A',
      },
      {
        speaker: '林汐',
        title: '冷链切配师',
        text: '“小时候跟着老爸守夜潮，渔船靠岸冷得发抖，大家就围着炭盆烤鲜鱿鱼吃。那时候我就想，以后要找一家真正懂海鲜的店，和志同道合的人一起吃宵夜。”',
        accentColor: '#38BDF8',
      },
      {
        speaker: '林汐',
        title: '冷链切配师',
        text: '“快趁热咬一口吧！要是凉了变韧，我可要笑话你不懂吃啦！”',
        accentColor: '#38BDF8',
      },
    ],
    choices: [
      {
        id: 'evt_lin_tide_a',
        label: '“鲜甜弹牙！以后每周闭店咱们都留一小炉，专做属于店里的深夜海味！”',
        hint: '林汐好感 +14 · 烟火温情 +1 · 全体疲劳 -15',
        affectionDelta: { staffId: 'lin_xi', amount: 14 },
        philosophyDelta: { WARMTH: 1 },
        outcomeText: '林汐笑得眉眼弯弯，又塞给你一串滋滋冒油的烤鱿鱼须：“一言为定，拉钩！”',
      },
      {
        id: 'evt_lin_tide_b',
        label: '“这火候和海盐配方太绝了，明天加进熟食区当限量彩蛋肯定爆火！”',
        hint: '林汐好感 +10 · 匠心 +1 · 口碑 +3',
        affectionDelta: { staffId: 'lin_xi', amount: 10 },
        philosophyDelta: { CRAFT: 1 },
        reputationDelta: 3,
        outcomeText: '林汐得意地扬起下巴：“哼，算你识货！那我明早多留两斤最嫩的透抽！”',
      },
    ],
  },
  {
    eventId: 'evt_lin_shell_chime',
    staffId: 'lin_xi',
    minAffection: 82,
    requiredRelationship: ['DATING', 'MARRIED'],
    badge: '恋人专属事件 · 潮汐风铃',
    headline: '冷库门前的贝壳风铃',
    lines: (mgr) => [
      {
        speaker: '林汐',
        title: '深海刀神 · 挚爱',
        text: '“店长，你看冷库门廊上面——我趁着休班去老码头退潮的礁石滩捡了一整兜珍珠贝，串了一串风铃挂在那儿。”',
        accentColor: '#F472B6',
      },
      {
        speaker: mgr,
        title: '店长',
        text: '“叮叮当当的，听起来就像把海风搬进了店里。怎么突然想做风铃？”',
        accentColor: '#E8C97A',
      },
      {
        speaker: '林汐',
        title: '深海刀神 · 挚爱',
        text: '“因为你在大厅忙的时候，我在冷库听不见你的声音嘛。挂上这个，以后你每次推门进来找我，风铃一响，我就知道是你来啦！”',
        accentColor: '#F472B6',
      },
    ],
    choices: [
      {
        id: 'evt_lin_chime_a',
        label: '轻轻把她拥入怀中：“以后每次风铃响，我都给你带一杯热姜茶。”',
        hint: '林汐好感拉满 +15 · 亲密度恢复 100%',
        affectionDelta: { staffId: 'lin_xi', amount: 15 },
        philosophyDelta: { WARMTH: 1 },
        outcomeText: '贝壳风铃在穿堂微风里清脆作响，林汐把脸轻轻贴在你胸口：“那你可不许让我等太久呀。”',
      },
      {
        id: 'evt_lin_chime_b',
        label: '“这串风铃太美了，咱们在每张海鲜缸旁都点缀一枚你挑的贝壳吧！”',
        hint: '林汐好感 +12 · 口碑 +4',
        affectionDelta: { staffId: 'lin_xi', amount: 12 },
        reputationDelta: 4,
        outcomeText: '林汐眼睛亮晶晶的：“好呀！让整座餐厅都藏着咱们俩的小秘密！”',
      },
    ],
  },
  {
    eventId: 'evt_shen_secret_tasting',
    staffId: 'shen_zhiwei',
    minAffection: 35,
    badge: '特殊事件 · 星厨私房试味',
    headline: '熄灯后的法式黄油蒜蓉实验',
    lines: (mgr) => [
      {
        speaker: '沈知微',
        title: '归国热厨主厨',
        text: '“店长，正好撞见你！我刚拿海鲜高汤混了一点焦化黄油与手剁金蒜，淋在刚开口的鲜贝上——还没给任何人尝过，你来当第一位评审吧？”',
        accentColor: '#F97316',
      },
      {
        speaker: mgr,
        title: '店长',
        text: '“中西合璧的蒜蓉烤贝？刚端近就闻到一股浓醇奶香与蒜香交织的味道！”',
        accentColor: '#E8C97A',
      },
      {
        speaker: '沈知微',
        title: '归国热厨主厨',
        text: '“以前在海外做菜总觉得孤单，但在这里，每回琢磨出新味道，第一个想端给看表情的人就是你。快尝尝，会不会太腻？”',
        accentColor: '#F97316',
      },
    ],
    choices: [
      {
        id: 'evt_shen_taste_a',
        label: '“鲜甜里带着焦香奶韵，完全不腻！这手艺简直把熟食档抬到了星级水准！”',
        hint: '沈知微好感 +14 · 匠心 +1 · 熟食区直接补满',
        affectionDelta: { staffId: 'shen_zhiwei', amount: 14 },
        philosophyDelta: { CRAFT: 1 },
        outcomeText: '沈知微松了口气，眼尾弯起温柔笑意：“那我明天开市前就多备两盘，专供熟食明档！”',
      },
      {
        id: 'evt_shen_taste_b',
        label: '“再挤几滴青柠汁提鲜，就叫『知微招牌金蒜贝』，绝对成为网红爆款！”',
        hint: '沈知微好感 +12 · 商业帝国 +1 · 口碑 +3',
        affectionDelta: { staffId: 'shen_zhiwei', amount: 12 },
        philosophyDelta: { EMPIRE: 1 },
        reputationDelta: 3,
        outcomeText: '沈知微愣了一下，耳根微红：“用我的名字命名菜品……那我可得拿出十二分功力才行。”',
      },
    ],
  },
  {
    eventId: 'evt_shen_starlight_menu',
    staffId: 'shen_zhiwei',
    minAffection: 82,
    requiredRelationship: ['DATING', 'MARRIED'],
    badge: '恋人专属事件 · 专属双人晚宴',
    headline: '热厨里的双人星光菜单',
    lines: (mgr) => [
      {
        speaker: '沈知微',
        title: '热厨总主厨 · 挚爱',
        text: '“嘘——今晚热厨不对外出菜啦。我借了大厅角落的两盏小蜡烛，做了前菜、主汤和一道焦糖海盐布丁，全都是按你平时最爱的口味配的。”',
        accentColor: '#F472B6',
      },
      {
        speaker: mgr,
        title: '店长',
        text: '“忙完一整天还能吃到星级主厨私房定制套餐，我这个店长也太幸福了吧？”',
        accentColor: '#E8C97A',
      },
      {
        speaker: '沈知微',
        title: '热厨总主厨 · 挚爱',
        text: '“这可不是给『店长』的员工餐，而是只属于你一个人的星光菜单。往后哪怕餐厅再忙，我也要替你留出这一桌热腾腾的烟火气。”',
        accentColor: '#F472B6',
      },
    ],
    choices: [
      {
        id: 'evt_shen_star_a',
        label: '举起桂花汽水碰杯：“谢谢你，知微。有你在的地方，每一顿饭都是盛宴。”',
        hint: '沈知微好感 +15 · 亲密度恢复 100%',
        affectionDelta: { staffId: 'shen_zhiwei', amount: 15 },
        philosophyDelta: { WARMTH: 1 },
        outcomeText: '烛光倒映在沈知微清亮的眼眸里，他笑着替你切好龙虾肉：“慢慢吃，今晚时间都归我们。”',
      },
    ],
  },
  {
    eventId: 'evt_su_rainy_tea',
    staffId: 'su_xingyao',
    minAffection: 35,
    preferredPhase: 'CLOSING',
    badge: '特殊事件 · 檐下桂香',
    headline: '闭店时的桂花乌龙与记事笺',
    lines: (mgr) => [
      {
        speaker: '苏星遥',
        title: '大堂礼宾官',
        text: '“店长，外面起海雾了，空气凉丝丝的。我刚在茶水间泡了一壶热桂花乌龙，特意给你留了第一杯暖暖嗓子。”',
        accentColor: '#F472B6',
      },
      {
        speaker: mgr,
        title: '店长',
        text: '“谢谢星遥！你今天迎宾站了一整天，怎么还惦记着给我泡茶？”',
        accentColor: '#E8C97A',
      },
      {
        speaker: '苏星遥',
        title: '大堂礼宾官',
        text: '“因为看你在大厅里奔前跑后，连喝口水都顾不上嘛。对了，你看我还在客谱里偷偷记下了你每天最容易皱眉的时刻，想帮着分担一点呢。”',
        accentColor: '#F472B6',
      },
    ],
    choices: [
      {
        id: 'evt_su_tea_a',
        label: '“你也坐下喝一杯吧！有你在前厅撑着，我已经轻松太多了。”',
        hint: '苏星遥好感 +14 · 烟火温情 +1 · 口碑 +2',
        affectionDelta: { staffId: 'su_xingyao', amount: 14 },
        philosophyDelta: { WARMTH: 1 },
        reputationDelta: 2,
        outcomeText: '苏星遥轻啜一口热茶，嘴角绽出温柔酒窝：“能陪你一起守着这家小店，再累也觉得踏实。”',
      },
      {
        id: 'evt_su_tea_b',
        label: '“把桂花乌龙也加进迎宾候位茶水吧，客人等位时一定倍感贴心！”',
        hint: '苏星遥好感 +10 · 资金 +¥80 · 口碑 +3',
        affectionDelta: { staffId: 'su_xingyao', amount: 10 },
        cashDelta: 80,
        reputationDelta: 3,
        outcomeText: '苏星遥眼睛一亮：“好主意！明天我就备上古风茶壶，让等位的客人都舍不得走！”',
      },
    ],
  },
  {
    eventId: 'evt_su_guestbook_page',
    staffId: 'su_xingyao',
    minAffection: 82,
    requiredRelationship: ['DATING', 'MARRIED'],
    badge: '恋人专属事件 · 秘密夹页',
    headline: '《潮鲜客谱》里的压花书签',
    lines: (mgr) => [
      {
        speaker: '苏星遥',
        title: '星级礼宾 · 挚爱',
        text: '“店长，刚才整理办公室抽屉时不小心把《潮鲜客谱》翻开了……啊、那枚压着洋桔梗花瓣的书签被你看见啦！”',
        accentColor: '#F472B6',
      },
      {
        speaker: mgr,
        title: '店长',
        text: '“上面写着『最特别的贵宾：店长——喜好：海鲜鲜汤、怕冷的时候爱搓手』……你连我都记进客谱了？”',
        accentColor: '#E8C97A',
      },
      {
        speaker: '苏星遥',
        title: '星级礼宾 · 挚爱',
        text: '“谁让你老是只记得客人的喜好，却不记得照顾自己呀！别人是我工作要记住的客人，而你……是我一辈子都想偏心照顾的人嘛。”',
        accentColor: '#F472B6',
      },
    ],
    choices: [
      {
        id: 'evt_su_book_a',
        label: '接过钢笔在书签背面写下回信：“那我也把星遥的所有心愿，一笔一划记在心里。”',
        hint: '苏星遥好感 +15 · 亲密度恢复 100%',
        affectionDelta: { staffId: 'su_xingyao', amount: 15 },
        philosophyDelta: { WARMTH: 1 },
        outcomeText: '苏星遥捧着书签笑得双颊飞红，轻轻靠在你肩头：“这页以后就是咱们的定情证物啦。”',
      },
    ],
  },
];

export function buildSpecialStaffChatOrEvent(
  world: GameWorld,
  staffId: SpecialStaffId,
  isFirstToday: boolean
): StoryModalEvent {
  const charDef = getCharacterDef(world.characterId);
  const def = getSpecialStaffDef(staffId);
  const bond = world.specialStaffBonds[staffId];
  const isPrep = world.phase === 'PREP';
  const seasonDef = getSeasonDef(world.season);

  // 1. Check if a specific special milestone event can trigger now!
  const eligibleEvent = SPECIAL_STAFF_TRIGGER_EVENTS.find((evt) => {
    if (evt.staffId !== staffId) return false;
    if (world.triggeredSpecialEventIds.includes(evt.eventId)) return false;
    if (bond.affection < evt.minAffection) return false;
    if (evt.requiredRelationship && !evt.requiredRelationship.includes(bond.relationship)) {
      return false;
    }
    if (evt.preferredPhase && world.phase !== evt.preferredPhase) {
      return false;
    }
    return true;
  });

  if (eligibleEvent) {
    world.triggeredSpecialEventIds.push(eligibleEvent.eventId);
    const lines = eligibleEvent.lines(charDef.name);
    return {
      id: nextDlgId(eligibleEvent.eventId),
      category: 'SPECIAL_STAFF',
      badge: `${eligibleEvent.badge} · ${def.name}`,
      speakerName: def.name,
      speakerTitle: def.title,
      accentColor: def.color,
      headline: eligibleEvent.headline,
      body: lines[0]?.text ?? '',
      lines,
      choices: eligibleEvent.choices,
    };
  }

  // 2. Rich daily conversations tailored to staff, phase, season, and relationship stage!
  const relLabel =
    bond.relationship === 'MARRIED'
      ? '结发伴侣'
      : bond.relationship === 'DATING'
        ? '挚爱恋人'
        : bond.relationship === 'CLOSE'
          ? '知己拍档'
          : def.title;

  const dailyPool: Record<SpecialStaffId, { prep: string[]; closing: string[]; romance: string[] }> = {
    lin_xi: {
      prep: [
        `“早啊店长！${seasonDef.name}凌晨的渔船比平时早靠岸半小时，我挑的这批海货鲜得能掐出水来，今天冰台一定大卖！”`,
        '“别光盯着账本皱眉啦，来冰台这边闻闻海风味！待会儿开店前记得检查下菜品卡有没有换季哦。”',
        '“我刚把柳刃刀磨亮，今天不管是切配还是补货，只要你喊一声，我三秒冲到冰台！”',
      ],
      closing: [
        `“总算打烊啦！今天客人夹海鲜的手速简直像抢宝，不过有我盯紧补货，没丢咱们的招牌吧？”`,
        '“闭店后库房冷飕飕的，店长记得多加件外套。明天想进什么稀罕海货，趁现在咱们一块列进冷链采购单？”',
        '“听着外面港口的汽笛声收尾，觉得每天虽然累，却比在任何大酒楼都痛快！”',
      ],
      romance: [
        bond.relationship === 'MARRIED'
          ? '“咳咳，在员工面前叫你店长，打烊了就该叫家里那位了吧？今晚回家我给你煮海鲜泡饭，不许偷偷熬夜看账本哦！”'
          : '“喂……刚才闭店时我偷偷留了两只最肥的鲜虾，别人问就说损耗，其实我是专门留给你的，笨蛋。”',
        '“不管外面风浪多大，只要回头看见你在灯笼底下忙活，我就觉得心里安稳极了。”',
      ],
    },
    shen_zhiwei: {
      prep: [
        `“早安，店长。${seasonDef.name}气温变了，我把热厨蒸烤的时间微调了十秒，保证扇贝入口鲜嫩多汁。”`,
        '“刚冲了一壶黑咖啡，给你留了半杯。开店前咱们把热厨原料清点一遍，高峰期就能稳稳接住所有熟食订单。”',
        '“听说过几天会有联合检查组巡查？放心，热厨的抽油烟和台面洁净标准我一直按星级厨房执行的。”',
      ],
      closing: [
        '“收档啦！今晚铁板滋滋作响的时候，我看见前排那桌小朋友眼睛都亮了——这就是我留在你这家店的意义。”',
        '“闭店后厨房安静下来，倒挺适合复盘菜品。店长觉得今天哪道熟食最受欢迎，明天咱们重点备货？”',
        '“手腕有点酸？站过来，我教你一套厨师专用的肩颈放松手法，别硬扛着。”',
      ],
      romance: [
        bond.relationship === 'MARRIED'
          ? '“今天也辛苦我的另一半啦。等把最后一口锅刷净，咱们牵手沿着海滨路慢慢走回家吧。”'
          : '“店长，明天开店前能不能早来十分钟？我想在谁都还没到的时候，单独给你煎一份海胆滑蛋当早餐。”',
        '“能把热爱的厨艺和最爱的人放在同一盏灯火下，我觉得自己已经拿到了人生的米其林三星。”',
      ],
    },
    su_xingyao: {
      prep: [
        `“店长早安！${seasonDef.name}的迎宾音乐和香氛我都换成清爽的柑橘海盐调了，客人一进门就会心情大好呢。”`,
        '“我已经把今天的桌位动线和VIP偏好看了一遍，开店后只要客流一上来，迎宾台交给我绝不乱阵脚！”',
        '“对了店长，记得偶尔去后场看看卫生间和设备间，细节到位，回头客才会越来越多呀。”',
      ],
      closing: [
        `“终于闭店啦！今晚招待了 ${world.todayStats.guestsServed} 桌客人，我记了满满两页客谱心得，明天能把服务做得更贴心！”`,
        '“站了一天把高跟鞋换下来真舒服……店长也别一直站着，来办公室坐会儿，我给你倒杯温热的红枣茶吧？”',
        '“红灯笼一盏盏关掉的时候，看着咱们亲手打理出来的餐厅，真的好有归属感。”',
      ],
      romance: [
        bond.relationship === 'MARRIED'
          ? '“亲爱的店长，今天忙完可别忘了咱们的约定——周末关门半天，只属于我们俩的婚后海滨漫步哦！”'
          : '“刚才有位阿姨悄悄问我，店长是不是还没对象呢。我笑着跟她说——『抱歉阿姨，已经被我先预定啦！』”',
        '“每回在门口迎宾时余光瞥见你的身影，我连微笑都会不自觉变得更甜几分呢。”',
      ],
    },
  };

  const bank = dailyPool[staffId];
  const useRomance =
    (bond.relationship === 'DATING' || bond.relationship === 'MARRIED') &&
    (world.day % 2 === 0 || !isPrep);
  const chosenPool = useRomance ? bank.romance : isPrep ? bank.prep : bank.closing;
  const npcLine = chosenPool[(world.day + bond.affection) % chosenPool.length];

  const mgrReply =
    bond.relationship === 'MARRIED'
      ? `“有你在身边并肩守着这家店，每天开店闭店都是最幸福的时光，${def.name}。”`
      : bond.relationship === 'DATING'
        ? `“听你这么说瞬间就不累了！等忙完这阵，我一定好好陪你实现心愿。”`
        : isPrep
          ? `“今天也靠你多费心了，${def.name}！咱们一起把今天做出彩！”`
          : `“今天辛苦你了，${def.name}！收拾完早点歇着，明儿见！”`;

  const lines: DialogueLine[] = [
    {
      speaker: def.name,
      title: relLabel,
      text: npcLine,
      accentColor: def.color,
    },
    {
      speaker: charDef.name,
      title: '店长',
      text: mgrReply,
      accentColor: charDef.accentColor,
    },
  ];

  return {
    id: nextDlgId(`special_chat_${staffId}`),
    category: 'STAFF_CHAT',
    badge: isPrep ? `开店前日常 · ${def.name}` : `闭店后日常 · ${def.name}`,
    speakerName: def.name,
    speakerTitle: relLabel,
    accentColor: bond.relationship === 'DATING' || bond.relationship === 'MARRIED' ? '#F472B6' : def.color,
    headline:
      bond.relationship === 'MARRIED'
        ? `与伴侣「${def.name}」的温馨日常`
        : bond.relationship === 'DATING'
          ? `与恋人「${def.name}」的甜蜜闲谈`
          : `与「${def.name}」的${isPrep ? '开店前' : '闭店后'}日常`,
    body: npcLine,
    lines,
    rewardHighlight: isFirstToday
      ? `倾心交谈增进羁绊：${def.name} 好感度 +5（当前 ${Math.min(100, bond.affection + 5)}/100）${
          bond.relationship === 'DATING' || bond.relationship === 'MARRIED' ? ' · 伴侣亲密度 +10%' : ''
        }！`
      : `与 ${def.name} 聊得十分投机，店里的灯火愈发温暖。`,
  };
}

export function buildConfessionDramaModal(
  world: GameWorld,
  staffId: SpecialStaffId
): StoryModalEvent {
  const charDef = getCharacterDef(world.characterId);
  const def = getSpecialStaffDef(staffId);
  const mgr = charDef.name;

  const scripts: Record<SpecialStaffId, DialogueLine[]> = {
    lin_xi: [
      {
        speaker: mgr,
        title: '店长',
        text: '“林汐，先放下手里的碎冰铲吧。今晚打烊后海风很柔，我有件比盘点冷库重要一万倍的事想对你说。”',
        accentColor: charDef.accentColor,
      },
      {
        speaker: '林汐',
        title: '深海刀神',
        text: '“诶？你突然这么正经干嘛……是不是哪批龙虾验收出岔子了？不对，你手里藏着什么？”',
        accentColor: '#38BDF8',
      },
      {
        speaker: mgr,
        title: '店长',
        text: '“是你一直念叨的那款手工银贝手链。从凌晨五点的冷库霜花，到并肩扛过一次次高峰期，我早就离不开你了——林汐，做我的恋人吧？”',
        accentColor: charDef.accentColor,
      },
      {
        speaker: '林汐',
        title: '深海刀神',
        text: '“……！你、你这个笨蛋店长，挑在冷库门口表白，害我脸热得冰块都要化了！”',
        accentColor: '#F472B6',
      },
      {
        speaker: '林汐',
        title: '深海刀神 · 恋人',
        text: '“把手链替我戴上呀！从今天起，不光是你的冷链王牌，也是要和你一起走过春夏秋冬的恋人了，不许反悔！”',
        accentColor: '#F472B6',
      },
    ],
    shen_zhiwei: [
      {
        speaker: mgr,
        title: '店长',
        text: '“知微，灶台熄火了，今晚换我给你端一碗亲手煮的宵夜吧——顺便，想把藏在心里很久的话说给你听。”',
        accentColor: charDef.accentColor,
      },
      {
        speaker: '沈知微',
        title: '归国热厨主厨',
        text: '“难得见你这么紧张。怎么，连咱们雷厉风行的店长也有不敢开口的时候？”',
        accentColor: '#F97316',
      },
      {
        speaker: mgr,
        title: '店长',
        text: '“因为这一次不是谈生意，而是谈一辈子的心动。知微，每次看见你在炉火前认真试味的样子，我都想一直陪在你身旁。愿不愿意和我正式交往？”',
        accentColor: charDef.accentColor,
      },
      {
        speaker: '沈知微',
        title: '归国热厨主厨',
        text: '“……真巧，我辞掉巴黎的邀约留在港城，本来就不是只为了这口铁板。”',
        accentColor: '#F472B6',
      },
      {
        speaker: '沈知微',
        title: '热厨主厨 · 恋人',
        text: '“我愿意。以后这家店的三餐四季，还有我的余生烟火，都交给你这位专属评审了。”',
        accentColor: '#F472B6',
      },
    ],
    su_xingyao: [
      {
        speaker: mgr,
        title: '店长',
        text: '“星遥，别急着合上《潮鲜客谱》啦。今天大厅空无一人，我特意买了一束你最喜欢的洋桔梗，想送给全店最温柔的人。”',
        accentColor: charDef.accentColor,
      },
      {
        speaker: '苏星遥',
        title: '大堂礼宾官',
        text: '“呀……是我最爱的浅香槟洋桔梗！店长怎么突然准备这么浪漫的惊喜？”',
        accentColor: '#F472B6',
      },
      {
        speaker: mgr,
        title: '店长',
        text: '“你总记得每位客人的喜好，却不知道我每天最期待的，就是推开门看见你在红灯笼下冲我笑。星遥，我想不只是做你的店长，我想名正言顺牵你的手。”',
        accentColor: charDef.accentColor,
      },
      {
        speaker: '苏星遥',
        title: '大堂礼宾官',
        text: '“店长……其实我在客谱扉页早就偷偷写过你的名字了，只是不敢说破。”',
        accentColor: '#F472B6',
      },
      {
        speaker: '苏星遥',
        title: '星级礼宾 · 恋人',
        text: '“我答应你！往后营业时我是你的得力大堂，闭店后……请多抽空陪陪你的女朋友哦。”',
        accentColor: '#F472B6',
      },
    ],
  };

  const lines = scripts[staffId];
  return {
    id: nextDlgId(`romance_confess_${staffId}`),
    category: 'ROMANCE',
    badge: '情定海港 · 告白剧情演绎',
    speakerName: def.name,
    speakerTitle: `${def.title} · 恋人`,
    accentColor: '#F472B6',
    headline: `红灯笼下的告白：与「${def.name}」正式交往！`,
    body: lines[lines.length - 1].text,
    lines,
    rewardHighlight: '激活伴侣维护系统！保持伴侣亲密度 ≥ 70 可获全店「情投意合」小费 +12% 加成！',
  };
}

export function buildWeddingDramaModal(
  world: GameWorld,
  staffId: SpecialStaffId
): StoryModalEvent {
  const charDef = getCharacterDef(world.characterId);
  const def = getSpecialStaffDef(staffId);
  const mgr = charDef.name;

  const scripts: Record<SpecialStaffId, DialogueLine[]> = {
    lin_xi: [
      {
        speaker: '老街坊陈伯',
        title: '港湾证婚人',
        text: '“各位熟客、伙计们静一静！今儿个『潮鲜沸鼎』暂停收钱，红绸挂满梁，鲜花铺满台——咱们要见证店长与林汐姑娘的港湾大喜之日！”',
        accentColor: '#F59E0B',
      },
      {
        speaker: mgr,
        title: '新郎 / 店长',
        text: '“林汐，还记得我们第一次在冷库门口分喝那杯热姜茶吗？从那一刻起，我就认定你是陪我乘风破浪一辈子的人。”',
        accentColor: charDef.accentColor,
      },
      {
        speaker: '林汐',
        title: '新娘 · 深海刀神',
        text: '“你这家伙，平时催我补货的时候挺利索，怎么拿戒指的手反倒抖起来啦？……不过，我今天穿礼服的样子，还算不辜负你吧？”',
        accentColor: '#F472B6',
      },
      {
        speaker: mgr,
        title: '店长',
        text: '“比港湾最亮的灯塔还要耀眼。林汐，把这枚海蓝宝婚戒戴上，以后潮涨潮落，这家店与这个家，我们一辈子共同守护！”',
        accentColor: charDef.accentColor,
      },
      {
        speaker: '林汐',
        title: '结发伴侣',
        text: '“我愿意！听见了吗各位熟客——今晚全场沸鼎欢庆，我和我最爱的店长，正式结为夫妻啦！”',
        accentColor: '#F472B6',
      },
    ],
    shen_zhiwei: [
      {
        speaker: '老街坊陈伯',
        title: '港湾证婚人',
        text: '“红灯笼高高挂，满堂皆贺喜！今天『潮鲜沸鼎』香气赛过佳节，大家举起杯，共同祝福店长与沈知微主厨喜结连理！”',
        accentColor: '#F59E0B',
      },
      {
        speaker: '沈知微',
        title: '星厨伴侣',
        text: '“我曾走过半个地球寻找完美的一餐，直到遇见你，才明白世上最好的珍馐，是清晨为你熬的一碗粥、深夜同守的一盏灯。”',
        accentColor: '#F97316',
      },
      {
        speaker: mgr,
        title: '店长',
        text: '“知微，谢谢你把星辰大海般的才华与温柔都留在了这方烟火里。今天在满堂亲友与熟客面前，我想替你戴上这枚戒指——余生三餐四季，请多指教。”',
        accentColor: charDef.accentColor,
      },
      {
        speaker: '沈知微',
        title: '结发伴侣',
        text: '“余生请多指教，我最亲爱的店长。从此以后，锅灶长明，爱意永沸，我永远只为你一人掌勺。”',
        accentColor: '#F472B6',
      },
    ],
    su_xingyao: [
      {
        speaker: '老街坊陈伯',
        title: '港湾证婚人',
        text: '“花瓣飘香，宾客满座！昔日靠一本《潮鲜客谱》暖遍整条街的苏星遥姑娘，今天终于要和咱们的店长携手迈入婚姻殿堂啦！”',
        accentColor: '#F59E0B',
      },
      {
        speaker: mgr,
        title: '店长',
        text: '“星遥，你把客谱的最后一页留给了我们。今天我想在全店所有伙伴和海风的见证下，把这枚婚戒戴在你无名指上——愿往后岁月，我来为你遮风挡雨。”',
        accentColor: charDef.accentColor,
      },
      {
        speaker: '苏星遥',
        title: '新娘 · 首席礼宾',
        text: '“眼泪都要掉下来啦……还好今天特意选了防水的妆容。店长，谢谢你把最盛大又最踏实的温柔都给了我。”',
        accentColor: '#F472B6',
      },
      {
        speaker: '苏星遥',
        title: '结发伴侣',
        text: '“我愿意！从今往后，这盏红灯笼照亮的不只是客人们的笑脸，还有我们两个人的永恒归途。”',
        accentColor: '#F472B6',
      },
    ],
  };

  const lines = scripts[staffId];
  const choices: StoryChoiceOption[] = [
    {
      id: `wedding_vow_feast_${staffId}`,
      label: '“今晚全场大摆喜宴，给所有员工发大红包同乐！”',
      hint: '全员士气拉满 100% · 口碑 +4 · 烟火温情 +2',
      reputationDelta: 4,
      philosophyDelta: { WARMTH: 2 },
      storyFlag: { key: `wedding_style_${staffId}`, value: 'GRAND_FEAST' },
      outcomeText: `欢呼声掀翻屋顶，宾客与伙计们齐齐举杯高呼百年好合，你与${def.name}的港湾婚礼成为整座城市传颂的佳话！`,
    },
    {
      id: `wedding_vow_quiet_${staffId}`,
      label: '在海风露台轻吻彼此额头：“待宾客散去，我们去听一晚只属于两人的潮声。”',
      hint: '匠心与温情 +1 · 伴侣亲密度永驻满值 · 专属誓言记录',
      philosophyDelta: { CRAFT: 1, WARMTH: 1 },
      storyFlag: { key: `wedding_style_${staffId}`, value: 'HARBOR_VOW' },
      outcomeText: `夜潮轻拍堤岸，红灯笼映着两枚紧靠的婚戒，${def.name}笑着握紧你的手，这一刻成为一生最珍贵的回忆。`,
    },
  ];

  return {
    id: nextDlgId(`romance_wedding_${staffId}`),
    category: 'ROMANCE',
    badge: '百年好合 · 港湾婚礼大典',
    speakerName: def.name,
    speakerTitle: `${def.title} · 结发伴侣`,
    accentColor: '#F472B6',
    headline: `百年好合：与「${def.name}」的红灯笼港湾婚礼！`,
    body: lines[lines.length - 1].text,
    lines,
    choices,
    rewardHighlight: '解锁专属婚礼结局分支 · 口碑 +8 · 亲密度 ≥ 70 时全店「珠联璧合」小费 +20%！',
  };
}

export function buildPartnerDateModal(
  world: GameWorld,
  staffId: SpecialStaffId,
  wishText: string
): StoryModalEvent {
  const charDef = getCharacterDef(world.characterId);
  const def = getSpecialStaffDef(staffId);
  const bond = world.specialStaffBonds[staffId];
  const roleLabel = bond.relationship === 'MARRIED' ? '结发伴侣' : '挚爱恋人';

  const lines: DialogueLine[] = [
    {
      speaker: charDef.name,
      title: '店长',
      text: `“走吧，${def.name}！今天我把店里安排妥当了，专门来兑现你的心愿——${wishText}。”`,
      accentColor: charDef.accentColor,
    },
    {
      speaker: def.name,
      title: roleLabel,
      text: '“哇，你居然真的记在心上了！海风吹过来好舒服……只要和你待在一起，哪怕什么都不做也觉得好幸福。”',
      accentColor: '#F472B6',
    },
    {
      speaker: def.name,
      title: roleLabel,
      text: '“歇够啦，咱们回去继续把『潮鲜沸鼎』做大做强吧！不过下次心愿，你也要记得陪我实现哦。”',
      accentColor: '#F472B6',
    },
  ];

  return {
    id: nextDlgId(`partner_date_${staffId}`),
    category: 'ROMANCE',
    badge: '伴侣陪伴 · 甜蜜约会',
    speakerName: def.name,
    speakerTitle: roleLabel,
    accentColor: '#F472B6',
    headline: `完成了「${def.name}」的伴侣心愿`,
    body: lines[1].text,
    lines,
    rewardHighlight: '伴侣亲密度恢复至 100% · 好感 +8 · 伴侣小费加成全满！',
  };
}

// ============================================================================
// 3. CUSTOMER DINING SPEECH BUBBLES (REGULAR + SPECIAL NPC SIGNATURE TOPICS)
// ============================================================================

export function pickCustomerSpeech(world: GameWorld, cust: CustomerParty): string {
  const broth = BROTH_CATALOG.find((b) => b.id === cust.brothId);
  const activeDishes = new Set(world.activeSeafoodIds);
  const activeBroths = new Set(world.activeBrothIds);

  // 1) Special Story NPCs discuss their signature favorite dishes & broths!
  if (cust.specialStoryId === 'critic_shen') {
    const lines: string[] = [];
    if (activeDishes.has('bluefin_toro')) {
      lines.push('蓝鳍大腹入口即化，绝品！');
    } else if (activeDishes.has('salmon')) {
      lines.push('这厚切三文鱼油脂够甘甜！');
    } else {
      lines.push('若能配份鲜切刺身就更绝了…');
    }
    if (activeBroths.has('golden_maw')) {
      lines.push('金汤花胶锅底火候见真章！');
    } else {
      lines.push('我最偏爱金汤花胶那口醇鲜');
    }
    lines.push('嗯，先记进本期美食专栏里~');
    return lines[Math.floor(Math.random() * lines.length)];
  }

  if (cust.specialStoryId === 'master_zhou') {
    const lines: string[] = [];
    if (activeBroths.has('winter_mutton')) {
      lines.push('古法海参老汤，熬得真地道！');
    } else if (cust.brothId === 'spicy_tallow') {
      lines.push('这口牛油麻辣锅真有江湖气！');
    } else {
      lines.push('汤底鲜亮，配手打丸滑正好~');
    }
    if (world.cookedStock > 0) {
      lines.push('蒜蓉蒸扇贝火候足，老头子爱吃！');
    }
    lines.push('海鲜就得现涮现吃才过瘾呐！');
    return lines[Math.floor(Math.random() * lines.length)];
  }

  if (cust.specialStoryId === 'heiress_gu') {
    const lines: string[] = [];
    if (activeDishes.has('lobster') || activeDishes.has('king_crab')) {
      lines.push('波士顿龙虾配沸锅太奢华啦~');
    } else if (activeDishes.has('wagyu')) {
      lines.push('M9雪花和牛涮三秒绝赞！');
    } else {
      lines.push('下次真想尝尝活捞大龙虾呀~');
    }
    if (activeBroths.has('tomyum_royal')) {
      lines.push('冬阴功海鲜皇锅酸辣开胃！');
    } else if (activeDishes.has('durian_craft')) {
      lines.push('金枕榴莲甜品配海鲜太绝了！');
    } else {
      lines.push('要是能配上冬阴功锅底就完美~');
    }
    return lines[Math.floor(Math.random() * lines.length)];
  }

  if (cust.specialStoryId === 'inspector_cheng') {
    const lines: string[] = [];
    if (cust.brothId === 'seafood_clear' || cust.brothId === 'spring_bamboo') {
      lines.push('清汤锅底最考海鲜本味，合格！');
    } else {
      lines.push('我平时更爱清甜海鲜原汤锅~');
    }
    if (activeDishes.has('oysters')) {
      lines.push('乳山生蚝冷链鲜度完全达标！');
    }
    lines.push(world.hygiene >= 80 ? '餐具洁净、台面清爽，值得加分。' : '卫生细节还得再绷紧些啊…');
    return lines[Math.floor(Math.random() * lines.length)];
  }

  // 2) Negative context reactions take priority when something went wrong
  if (cust.stockoutHits > 0) {
    const complaintPool = ['冰台怎么空了呀，快补货！', '想拿虾结果空盘了…', '自助餐断菜可不太行哦'];
    return complaintPool[Math.floor(Math.random() * complaintPool.length)];
  }
  if (world.hygiene < 55) {
    return Math.random() < 0.5 ? '周围好像有点海鲜腥味呢…' : '地上油渍得赶紧擦擦呀';
  }

  // 3) VIP / Super Customer chatter
  if (cust.isSuperCustomer || cust.isVip) {
    const vipPool = [
      broth ? `这${broth.name.slice(0, 5)}确实够高级！` : '这锅底鲜香扑鼻，值回票价！',
      '鲜度不输五星酒店，多留小费！',
      activeDishes.has('lobster') ? '活捞龙虾现下锅太爽啦！' : '食材挑得讲究，下回带客户来！',
      '服务利索，吃得舒心！',
    ];
    return vipPool[Math.floor(Math.random() * vipPool.length)];
  }

  // 4) Regular NPC casual dining chatter
  const seasonChat: Record<GameWorld['season'], string> = {
    SPRING: '春天吃口鲜虾真水灵~',
    SUMMER: '吹着空调涮海鲜绝了！',
    AUTUMN: '秋风起，贴秋膘正当时！',
    WINTER: '冬天围着沸锅太暖和啦~',
  };

  const regularPool: string[] = [
    broth ? `${broth.name.slice(0, 6)}越煮越香！` : '这锅底香得我口水直流！',
    seasonChat[world.season],
    '肥牛配鲜虾，今天必回本！',
    '蘸料再加勺蒜泥和小米辣~',
    '哈哈，扶墙进扶墙出！',
    '虾肉弹牙，肯定很新鲜！',
    '待会儿再去拿两盘贝类！',
    '下周末还要带朋友来吃！',
  ];

  if (cust.prefersCooked && world.cookedStock > 0) {
    regularPool.push('熟食区的蒜蓉扇贝太香了！', '烤海鲜不用等煮，真方便~');
  }
  if (activeDishes.has('durian_craft')) {
    regularPool.push('饭后炫两块榴莲甜品美滋滋！');
  }

  return regularPool[Math.floor(Math.random() * regularPool.length)];
}

// ============================================================================
// 4. HALF-MONTH PERIODIC INSPECTION (EVERY 15 DAYS AFTER CLOSING)
// ============================================================================

export function getDaysUntilNextInspection(world: GameWorld): number {
  const mod = world.day % INSPECTION_INTERVAL_DAYS;
  if (mod === 0 && world.lastInspectionDay !== world.day) return 0;
  return INSPECTION_INTERVAL_DAYS - mod;
}

export function runHalfMonthInspection(world: GameWorld): StoryModalEvent {
  const charDef = getCharacterDef(world.characterId);
  world.lastInspectionDay = world.day;

  // 1) Equipment Score (设备运行：设备健康 + 活鲜增氧)
  const equipScore = Math.round(world.equipmentHealth * 0.7 + world.oxygenLevel * 0.3);
  const equipMetric: InspectionMetricItem = {
    label: '设备与冷链运行',
    score: equipScore,
    passed: equipScore >= 65,
    statusText: equipScore >= 82 ? '运转优良' : equipScore >= 65 ? '轻度损耗' : '存在隐患',
    feedback:
      equipScore >= 82
        ? `制冷机组、强排风机与增氧设备状态极佳（设备 ${Math.round(world.equipmentHealth)}% / 溶氧 ${Math.round(world.oxygenLevel)}%），噪音与温控均达标。`
        : equipScore >= 65
          ? `制冷与排风尚可维持（设备 ${Math.round(world.equipmentHealth)}%），但部分机组已有积垢磨损，建议尽快在设备间例行维护。`
          : `设备老化严重（设备仅 ${Math.round(world.equipmentHealth)}%），冷链温控与油水分离器亮起黄灯，责令立即检修！`,
  };

  // 2) Hygiene Score (卫生环境：前厅卫生 + 卫生间洁净 - 闭店未清理脏桌/脏碗扣分)
  const dirtyTables = world.tables.filter((t) => t.status === 'DIRTY').length;
  const cleanupPenalty = Math.min(24, dirtyTables * 7 + Math.floor(world.dirtyDishes * 1.5));
  const hygieneScore = Math.max(
    0,
    Math.min(100, Math.round(world.hygiene * 0.62 + world.restroomCleanliness * 0.38 - cleanupPenalty))
  );
  const hygieneMetric: InspectionMetricItem = {
    label: '前厅与卫生间洁净',
    score: hygieneScore,
    passed: hygieneScore >= 65,
    statusText: hygieneScore >= 84 ? '明厨标杆' : hygieneScore >= 65 ? '基本整洁' : '卫生不达标',
    feedback:
      hygieneScore >= 84
        ? `前厅洁净（${Math.round(world.hygiene)}分）、洗手间无异味（${Math.round(world.restroomCleanliness)}分），打烊收台彻底，堪称海鲜自助卫生示范！`
        : hygieneScore >= 65
          ? `整体符合餐饮规范（卫生 ${Math.round(world.hygiene)} / 洗手间 ${Math.round(world.restroomCleanliness)}）${
              cleanupPenalty > 0 ? `，闭店尚留少量未收桌盘（扣${cleanupPenalty}分）` : ''
            }，仍有提升空间。`
          : `前厅或洗手间清洁度偏低（卫生 ${Math.round(world.hygiene)} / 洗手间 ${Math.round(world.restroomCleanliness)}）${
              cleanupPenalty > 0 ? `，且打烊残留 ${dirtyTables} 脏桌 / ${world.dirtyDishes} 脏碗` : ''
            }，存在食安滋生隐患！`,
  };

  // 3) Stock & Cold-Chain Preparedness Score (备货情况：在售菜品后仓库存 + 原料库 + 在途补货单)
  const activeSlotIds = world.buffetSlots.map((s) => s.itemId);
  const pendingItemIds = new Set(world.pendingDeliveries.map((d) => d.itemId));
  let stockPoints = 0;
  let lowDishCount = 0;
  for (const id of activeSlotIds) {
    const qty = world.warehouseStock[id] ?? 0;
    const hasIncoming = pendingItemIds.has(id);
    const effectiveQty = qty + (hasIncoming ? 14 : 0);
    if (effectiveQty < 10) lowDishCount += 1;
    stockPoints += Math.min(100, (effectiveQty / 22) * 100);
  }
  const avgDishStockScore =
    activeSlotIds.length > 0 ? stockPoints / activeSlotIds.length : 80;
  const rawScore = Math.min(
    100,
    ((world.rawIngredients + (pendingItemIds.has('__RAW__') ? 15 : 0)) /
      Math.max(12, world.rawIngredientsMax * 0.6)) *
      100
  );
  const stockScore = Math.round(avgDishStockScore * 0.72 + rawScore * 0.28);
  const stockMetric: InspectionMetricItem = {
    label: '冷链备货与货源',
    score: stockScore,
    passed: stockScore >= 60,
    statusText: stockScore >= 80 ? '货源充沛' : stockScore >= 60 ? '勉强周转' : '备货告急',
    feedback:
      stockScore >= 80
        ? `在售菜品冷库储备充足、在途冷链衔接有序（冷链原料 ${world.rawIngredients}/${world.rawIngredientsMax}），绝无缺货断供之虞！`
        : stockScore >= 60
          ? `备货基本满足次日周转，但有 ${lowDishCount} 道菜品后仓偏紧，建议闭店时及时在冷链库房补单。`
          : `冷库备货严重不足（${lowDishCount} 道菜品面临断供、原料仅 ${world.rawIngredients} 份），极易引发客诉与虚假宣传举报！`,
  };

  const overallScore = Math.round((equipScore + hygieneScore + stockScore) / 3);

  let grade: InspectionReportCard['grade'];
  let cashDelta = 0;
  let repDelta = 0;
  let strikeDelta = 0;
  let summaryRewardText = '';
  let inspectorVerdict = '';
  let accentColor = '#34D399';

  if (overallScore >= 85) {
    grade = '优秀';
    cashDelta = 320 + world.shopLevel * 60;
    repDelta = 10;
    if (world.penaltyStrikes > 0) {
      strikeDelta = -1;
    }
    accentColor = '#34D399';
    summaryRewardText = `评定「优秀」：获食安示范表彰奖金 +¥${cashDelta} · 口碑 +${repDelta}${
      strikeDelta < 0 ? ' · 撤销 1 次违规记点' : ''
    }！`;
    inspectorVerdict = `“太出色了，${charDef.name}店长！综合得分 ${overallScore} 分，设备、卫生、冷链备货三项齐优！检查组一致授予贵店『半月食安示范红榜门店』表彰！”`;
  } else if (overallScore >= 72) {
    grade = '良好';
    cashDelta = 120;
    repDelta = 5;
    accentColor = '#38BDF8';
    summaryRewardText = `评定「良好」：口碑 +${repDelta} · 达标奖励 +¥${cashDelta}！`;
    inspectorVerdict = `“整体经营规范有序，综合得分 ${overallScore} 分，评定为『良好』！继续补强薄弱项，下个半月有望冲刺示范红榜。”`;
  } else if (overallScore >= 55) {
    grade = '合格';
    cashDelta = 0;
    repDelta = 1;
    accentColor = '#FBBF24';
    summaryRewardText = `评定「合格」：口碑 +1 · 请针对偏低项尽快整改。`;
    inspectorVerdict = `“本次检查综合得分 ${overallScore} 分，勉强达到『合格』线。检查组已将整改意见列明在下方，下个半月复查可要多上点心！”`;
  } else {
    grade = '不合格';
    const fine = 280 + world.shopLevel * 100;
    cashDelta = -fine;
    repDelta = -8;
    strikeDelta = 1;
    accentColor = '#F87171';
    summaryRewardText = `评定「不合格」：整改罚款 -¥${fine} · 口碑 ${repDelta} · 违规红线 +1！`;
    inspectorVerdict = `“综合得分仅 ${overallScore} 分，检查评定『不合格』！设备维护、卫生洁净或冷链备货存在明显漏洞，依法开具整改罚单并记违规一次，务必高度重视！”`;
  }

  // Apply rewards or penalties directly to world
  world.cash += cashDelta;
  if (cashDelta > 0) {
    world.totalCashEarned += cashDelta;
    awardPlayerXpFromCash(world, cashDelta);
  } else if (cashDelta < 0) {
    const fineAmt = Math.abs(cashDelta);
    world.todayStats.penaltyFines += fineAmt;
    world.totalPenaltyFines += fineAmt;
    world.todayStats.healthInspectionsFailed += 1;
  }
  world.reputation = Math.max(0, Math.min(100, world.reputation + repDelta));
  world.todayStats.reputationChange += repDelta;
  if (strikeDelta !== 0) {
    world.penaltyStrikes = Math.max(0, world.penaltyStrikes + strikeDelta);
  }

  const scorecard: InspectionReportCard = {
    grade,
    overallScore,
    metrics: [equipMetric, hygieneMetric, stockMetric],
    summaryRewardText,
  };

  const roundNum = Math.max(1, Math.floor(world.day / INSPECTION_INTERVAL_DAYS));
  const lines: DialogueLine[] = [
    {
      speaker: '食安督查组长',
      title: '市场监管与食安联合检查组',
      text: `“${charDef.name}店长您好，今日已满第 ${world.day} 天，例行开展第 ${roundNum} 次半月闭店联合核查。我们将重点查验贵店的设备运行、前厅与洗手间卫生、以及冷链备货三大指标。”`,
      accentColor,
    },
    {
      speaker: charDef.name,
      title: '店长',
      text: '“欢迎检查组各位老师莅临指导，前厅大厅与后场七大功能间已全部敞开，请您逐项核验！”',
      accentColor: charDef.accentColor,
    },
    {
      speaker: '食安督查组长',
      title: `核查评定：${grade}（${overallScore}分）`,
      text: inspectorVerdict,
      accentColor,
    },
  ];

  return {
    id: nextDlgId(`half_month_inspect_${world.day}`),
    category: 'INSPECTION',
    badge: `半月定期联合检查 · 第 ${roundNum} 期（评定：${grade}）`,
    speakerName: '食安督查组长',
    speakerTitle: '市场监管与食安联合检查组',
    accentColor,
    headline: `第 ${world.day} 天闭店核查报告：综合 ${overallScore} 分 · ${grade}`,
    body: inspectorVerdict,
    lines,
    inspectionScorecard: scorecard,
    rewardHighlight: summaryRewardText,
    finishDayAfterClose: true,
  };
}

// ============================================================================
// 5. NEAR-FAILURE DANGER WARNING EVALUATOR
// ============================================================================

export interface NearFailureWarningState {
  level: 'NONE' | 'WARNING' | 'CRITICAL';
  reasons: Array<{ title: string; tip: string }>;
}

export function getNearFailureStatus(world: GameWorld): NearFailureWarningState {
  if (world.phase === 'MAIN_MENU' || world.phase === 'CHARACTER_SELECT' || world.phase === 'GAME_OVER') {
    return { level: 'NONE', reasons: [] };
  }

  const reasons: Array<{ title: string; tip: string; critical: boolean }> = [];

  // 1) Penalty strikes near max (5)
  if (world.penaltyStrikes >= world.maxPenaltyStrikes - 1) {
    reasons.push({
      title: `违规红线告急（${world.penaltyStrikes}/${world.maxPenaltyStrikes}）`,
      tip: '再记 1 次违规即吊销执照！切勿断菜、逃单或卫生低于 35（单日逃单≤1 且卫生≥78 可撤 1 点）',
      critical: true,
    });
  } else if (world.penaltyStrikes >= world.maxPenaltyStrikes - 2) {
    reasons.push({
      title: `违规记点偏高（${world.penaltyStrikes}/${world.maxPenaltyStrikes}）`,
      tip: '请注意保持卫生≥78并避免顾客逃单/断供',
      critical: false,
    });
  }

  // 2) Reputation near 0
  if (world.reputation <= 14) {
    reasons.push({
      title: `门店口碑濒临崩盘（仅剩 ${Math.round(world.reputation)} 分）`,
      tip: '口碑归零立即停业！请及时上锅补菜、清扫脏桌挽回好评',
      critical: true,
    });
  } else if (world.reputation <= 24) {
    reasons.push({
      title: `门店口碑跌破警戒线（${Math.round(world.reputation)} 分）`,
      tip: '请提升出餐速度与洁净度，避免差评继续扣分',
      critical: false,
    });
  }

  // 3) Cash near bankruptcy (-600)
  const projectedDailyCost =
    world.staff.reduce((s, st) => s + st.dailyWage, 0) + getShopConfig(world.shopLevel).baseRent;
  if (world.cash <= -380 || (world.phase === 'CLOSING' && world.cash - projectedDailyCost < -520)) {
    reasons.push({
      title: `资金濒临断裂（当前 ¥${Math.round(world.cash)}）`,
      tip: '资金低于 -¥600 将宣告破产！请谨慎采购支出并尽快盈利回血',
      critical: true,
    });
  } else if (world.cash <= -180) {
    reasons.push({
      title: `门店现金流透支（¥${Math.round(world.cash)}）`,
      tip: '注意预留今日租金与员工日薪（约 ¥' + projectedDailyCost + '）',
      critical: false,
    });
  }

  // 4) Hygiene critically low during open business hours (penalty strike triggers at <35)
  if (world.phase === 'PLAYING' && world.hygiene < 42) {
    reasons.push({
      title: `卫生严重告急（${Math.round(world.hygiene)} 分）`,
      tip: '低于 35 分将触发食安突击整改！快收脏桌、洗脏碗！',
      critical: world.hygiene < 38,
    });
  }

  if (reasons.length === 0) {
    return { level: 'NONE', reasons: [] };
  }

  const hasCritical = reasons.some((r) => r.critical);
  return {
    level: hasCritical ? 'CRITICAL' : 'WARNING',
    reasons: reasons.map(({ title, tip }) => ({ title, tip })),
  };
}
