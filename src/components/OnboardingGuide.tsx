import { useState } from 'react';
import {
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Compass,
  HelpCircle,
  Play,
  Sparkles,
  X,
} from 'lucide-react';
import { getCharacterDef } from '../data/storyConfig';
import { GameWorld } from '../types/game';

interface OnboardingGuideProps {
  world: GameWorld;
  forceOpen?: boolean;
  showIntroModal?: boolean;
  onConfirmStartGuide?: () => void;
  onSetStep: (step: number) => void;
  onSkipAll: () => void;
  onOpenConfig: () => void;
  onEnterBackstage: () => void;
  onOpenBusiness: () => void;
}

type GuideStage = 'PREP' | 'PLAYING' | 'CLOSING';

interface GuideStepDef {
  stage: GuideStage;
  stageLabel: string;
  title: string;
  whereTag: string;
  body: string;
  checklist: string[];
  actionKey?: 'CONFIG' | 'BACKSTAGE' | 'BUSINESS';
  actionLabel?: string;
}

const GUIDE_STEPS: GuideStepDef[] = [
  // STAGE 1: PREP (0..2)
  {
    stage: 'PREP',
    stageLabel: '一、开店前准备',
    title: '1/9 · 认识屏幕核心按钮分布',
    whereTag: '左上角圆章 + 顶部状态栏',
    body: '先快速熟悉店长界面，开店前时间暂停，可放心逐个点开查看：',
    checklist: [
      '左上角「门店配置 [C]」：换店面类型、装菜单策略卡、点 5 阶段发展树、招雇员',
      '左上角「进入后场 [M]」：巡视 7 大后场功能房（冷库闭店采购、办公室发兼职/急采、保洁检修、宿舍招特聘伙伴，点上方「4.后场七房」可查全图解）',
      '左上角「主线见闻 / 商战经营 [B] / 堂口记事」：查剧情支线、搞营销贷款装潢、看红线',
      '顶部状态栏：实时盯紧资金、口碑、卫生、净/脏盘与熟食，右侧可随时手动存档或查图鉴',
    ],
  },
  {
    stage: 'PREP',
    stageLabel: '一、开店前准备',
    title: '2/9 · 开店前要做的 3 件筹备事',
    whereTag: '左侧金框高亮「门店配置 [C]」· 底部键 7',
    body: '正式迎客前，把菜品、人手与明档热菜检查妥当，开市后就能从容应对高峰：',
    checklist: [
      '点击左侧高亮的「门店配置 [C]」查看今日上架海鲜与锅底，有余钱可去发展树排队解锁新档口/菜品',
      '看底部「7 烹制熟食」存量，想提前热锅出菜可直接点击现烹几份备用',
      '准备期与闭店期均可直接点击画面里的员工交谈，恢复士气并触发日常互动',
    ],
    actionKey: 'CONFIG',
    actionLabel: '点开「门店配置」看看',
  },
  {
    stage: 'PREP',
    stageLabel: '一、开店前准备',
    title: '3/9 · 点击右下角印玺正式开店',
    whereTag: '右下角金圈高亮「正式开店」按钮',
    body: '一切就绪后，点击画面右下角发光提示的金色圆形「正式开店」印玺，挂牌进入 11:00~22:00 正式营业！',
    checklist: [
      '点击右下角「正式开店」后，顾客会陆续来到左侧红毯排队候餐',
      '营业期间可随时用顶部「1x/2x」切换倍速，或按 [P] 键暂停思考',
    ],
  },

  // STAGE 2: PLAYING (3..6)
  {
    stage: 'PLAYING',
    stageLabel: '二、正式经营中',
    title: '4/9 · 迎宾带位与端锅上桌',
    whereTag: '底部高亮快捷栏「1 迎宾带位」「2 端锅上桌」',
    body: '经营中最核心的前半段流程：先让排队的客人坐下，再立刻端上热气腾腾的锅底！',
    checklist: [
      '客人排队时点底部「1 迎宾带位」（或直接点左侧迎宾台）把客人领到已摆好餐具的空桌',
      '客人落座后会举牌等锅底，立刻点底部「2 端锅上桌」（或点上方锅底灶台）端锅开涮',
      '注意：排队或等锅底耐心归零会离场扣口碑，累计 4 次逃单会记 1 次违规（前 2 日新店扶持免记违规）。',
    ],
  },
  {
    stage: 'PLAYING',
    stageLabel: '二、正式经营中',
    title: '5/9 · 冰台补菜与熟食出锅',
    whereTag: '底部高亮快捷栏「3 冰台补菜」「7 烹制熟食」',
    body: '顾客开涮后会不断拿取前场自助冰台的海鲜和熟食热菜，必须时刻防止断货！',
    checklist: [
      '冰台某格泛红低存时，点「3 冰台补菜」（或点冰台）从后场冷库搬鲜货补满',
      '熟食明档告急时，点「7 烹制熟食」消耗生鲜原料现场烹制热菜补台',
      '提示：冰台全空断货会向顾客折让赔付，累计 5 次断供记 1 次违规（前 2 日免记）。',
    ],
  },
  {
    stage: 'PLAYING',
    stageLabel: '二、正式经营中',
    title: '6/9 · 收桌、洗碗与摆台卫生循环',
    whereTag: '底部高亮快捷栏「4 收桌」「5 洗碗」「6 摆台」',
    body: '客人满意买单后会留下脏桌，必须走完「收 → 洗 → 摆」闭环才能接待下一桌：',
    checklist: [
      '点「4 收拾脏桌」把脏碗收走 → 点「5 洗碗清洗」在水池洗净送入消毒柜',
      '点「6 摆放餐具」把干净餐具摆回空桌，桌子亮绿即可继续迎客',
      '红线提醒：脏桌脏碗堆积过久会拉低卫生值，低于 35 会触发食安突击整改并记 +1 违规（前 2 日仅罚款免记违规）。',
    ],
  },
  {
    stage: 'PLAYING',
    stageLabel: '二、正式经营中',
    title: '7/9 · 应对营业突发意外与支线奇遇',
    whereTag: '营业中途随机弹窗 · 商战经营 [B]',
    body: '开店过程中会不定时爆发突发意外（纠纷、制冰机故障、暗访记者、避雨老船长等），需要你当机立断：',
    checklist: [
      '弹出突发事件时营业会自动暂停，仔细阅读每个处理方案的利弊',
      '带有「营业突发支线」标签的事件会记住你的选择，数日后触发截然不同的后续剧情与结局！',
      '想查看天气、投放营销、应急贷款或看全城排名，随时点左上角「商战经营 [B]」',
    ],
    actionKey: 'BUSINESS',
    actionLabel: '查看「商战经营」总台',
  },

  // STAGE 3: CLOSING (7..8)
  {
    stage: 'CLOSING',
    stageLabel: '三、闭店收尾',
    title: '8/9 · 闭店清场与后场冷链采购',
    whereTag: '左侧金框高亮「进入后场 [M]」· 冷链库房',
    body: '22:00 停止迎新进入闭店收尾！系统不会强行自动结算，请先做好这两件关键收尾事：',
    checklist: [
      '等店内余客买单离席，用 4/5/6 清光所有脏桌与脏碗（全清可白赚卫生 +6 奖励！）',
      '点左侧高亮的「进入后场 [M]」走进「冷链活鲜库」或「店长办公室」，点击「闭店冷链补货」为低库存海鲜与熟食原料下单（次日闭店入库；雇佣库存采购员可自动补单）',
      '顺手巡视「卫生间（保洁）」「机电设备间（¥30 检修）」「员工宿舍（¥40 宵夜回士气）」；办公室还可发兼职或加急直采原料，点上方「4.后场七房」查看全部房间用途',
    ],
    actionKey: 'BACKSTAGE',
    actionLabel: '进入后场巡视七房',
  },
  {
    stage: 'CLOSING',
    stageLabel: '三、闭店收尾',
    title: '9/9 · 手动点击右下角打烊结算',
    whereTag: '右下角金圈高亮「手动结算」印玺',
    body: '余客离场且补货清扫都完成后，点击右下角发光的金色圆形「手动结算 / 打烊结算」印玺即可结清本日账本！',
    checklist: [
      '打烊结算会汇总今日营收、薪资租金、成就解锁，并自动保存进度至「自动存档」',
      '每逢第 15、30 天等半月节点，闭店结算时会迎来联合检查组查验设备、卫生与备货',
      '随时可点击顶部栏右侧「? 引导」再次翻看三阶段流程与「4.后场七房」功能详解！',
    ],
  },
];

interface BackstageRoomGuideDef {
  id: string;
  name: string;
  pos: string;
  accent: string;
  action: string;
  detail: string;
  npc?: string;
}

const BACKSTAGE_ROOM_GUIDES: BackstageRoomGuideDef[] = [
  {
    id: 'cold_storage',
    name: '冷链活鲜库',
    pos: '后排最左',
    accent: '#38BDF8',
    action: '换水增氧巡检 · 闭店冷链补货',
    detail: '闭店收尾时可在此给上架海鲜与熟食原料下单补货（次日闭店入库，价格随四季行情浮动）；日常换水增氧维护鲜度。',
    npc: '神秘访客：林汐（活鲜专精，2 段招募支线免费入队）',
  },
  {
    id: 'hot_kitchen',
    name: '热厨出品间',
    pos: '后排中左',
    accent: '#FB923C',
    action: '加急现烹熟食 (+3)',
    detail: '快速消耗冷链原料批量加急出锅 3 份熟食，缓解前厅明档高峰断供压力。',
    npc: '神秘访客：沈知微（热厨主厨，2 段招募支线免费入队）',
  },
  {
    id: 'dish_washroom',
    name: '餐具洗消间',
    pos: '后排中右',
    accent: '#67E8F9',
    action: '集中高温洗消',
    detail: '批量高温清洗积压脏盘送入消毒柜，并显著拉升门店整体卫生评分。',
  },
  {
    id: 'office',
    name: '店长办公室',
    pos: '后排最右',
    accent: '#E8C97A',
    action: '核查考勤 · 闭店补货 · 加急原料 · 发布兼职',
    detail: '后勤总控室：免费核查考勤回士气、可远程下闭店冷链单、可「加急直采熟食原料（即时入库救急）」，还可发布「灵活用工兼职（不占编制、即刻上岗，上限 3 人）」。',
    npc: '神秘访客：苏星遥（运营迎宾专精，2 段招募支线免费入队）',
  },
  {
    id: 'restroom',
    name: '卫生间洗手区',
    pos: '前排最左',
    accent: '#86EFAC',
    action: '全面保洁补耗材',
    detail: '洁净度随客流持续下降，低于 55% 会拖累口碑并在半月检查扣分，定期入房保洁即可回满。',
  },
  {
    id: 'equipment_room',
    name: '机电设备间',
    pos: '前排中下',
    accent: '#FBBF24',
    action: '机电例行检修 (¥30)',
    detail: '冷链主机与油水分离器会随营业损耗，状态低于 60% 易发故障与检查扣分，检修 ¥30 可维稳（后期可雇技术员自动维保）。',
  },
  {
    id: 'dormitory',
    name: '员工宿舍与茶室',
    pos: '前排最右',
    accent: '#F472B6',
    action: '宵夜慰问 (¥40) · 伴侣陪伴/心愿',
    detail: '花 ¥40 安排宵夜慰问大幅恢复全体员工士气；与特聘伙伴好感 ≥80 表白/求婚结缘后，可在此陪伴或 ¥50 满足心愿维系亲密。',
  },
];

const BUTTON_CHEATSHEET = [
  { area: '左上角 5 枚圆章', desc: '门店配置[C] · 进入后场[M] · 主线见闻 · 商战经营[B] · 堂口记事' },
  { area: '顶部状态与工具栏', desc: '资金/口碑/卫生/净脏盘/熟食/违规点 · 天气节庆 · 1x/2x · 暂停[P] · 存档 · 图鉴 · 设置' },
  { area: '底部 1~7 快捷调度', desc: '1迎宾 · 2上锅 · 3冰台补菜 · 4收脏桌 · 5洗碗 · 6摆餐具 · 7烹熟食（也可直接点画面工位）' },
  { area: '后场 [M] 七房巡视', desc: 'WASD/点房间或底部快捷栏进房 · 标「!」有可招募特聘伙伴 · 标「补」提示闭店冷链补货 · 每房每日 1 次巡视剧情' },
  { area: '右下角金色大印玺', desc: '准备期点「正式开店」 · 营业中看倒计时 · 闭店后手动点「打烊结算」' },
];

export function OnboardingGuide({
  world,
  forceOpen = false,
  showIntroModal = false,
  onConfirmStartGuide,
  onSetStep,
  onSkipAll,
  onOpenConfig,
  onEnterBackstage,
  onOpenBusiness,
}: OnboardingGuideProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [showCheatsheet, setShowCheatsheet] = useState(false);
  const [showBackstageTab, setShowBackstageTab] = useState(false);

  // Immediately pop up the Day-1 Welcome Guide dialog right after choosing a character in a New Game
  if (showIntroModal) {
    const charDef = getCharacterDef(world.characterId);
    return (
      <div className="fixed inset-0 z-50 bg-[#0d0604]/82 backdrop-blur-[2px] flex items-center justify-center p-4 pointer-events-auto">
        <div className="game-panel w-full max-w-[700px] rounded-2xl border-2 border-[#E8C97A] shadow-[0_24px_60px_rgba(0,0,0,0.9)] overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr]">
            {/* Left: Chosen Manager Portrait Frame */}
            <div className="relative bg-[#160c08] border-b sm:border-b-0 sm:border-r border-[#593b25] flex flex-col">
              <div className="relative h-44 sm:h-full min-h-[220px] w-full overflow-hidden">
                <img
                  src={charDef.portraitUrl}
                  alt={charDef.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-top"
                />
                <div
                  className="absolute inset-x-0 bottom-0 h-28"
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(22,12,8,0) 0%, rgba(22,12,8,0.96) 100%)',
                  }}
                />
                <div className="absolute bottom-3 left-3 right-3">
                  <div className="font-display text-xl font-bold text-[#FFF7E8] leading-tight">
                    {charDef.name}
                  </div>
                  <div className="text-[11px] font-semibold mt-0.5" style={{ color: charDef.accentColor }}>
                    {charDef.title} · 第 1 天上任
                  </div>
                  <div className="mt-1.5 text-[10px] text-[#E8C97A] bg-[#24140d]/90 border border-[#6e4c2a] rounded px-2 py-1 leading-snug">
                    专属绝技：{charDef.perkSummary}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Opening Guide Briefing */}
            <div className="p-5 flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-[#E8C97A] text-xs font-bold">
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>新店长首日开店引导</span>
                </div>
                <h2 className="font-display text-xl sm:text-2xl font-bold text-[#FFF6E5] mt-1">
                  欢迎接掌《潮鲜沸鼎》！
                </h2>
                <p className="text-xs text-[#DFCDB6] leading-relaxed mt-1.5">
                  今天是开张第 1 天，目前处于<strong className="text-[#F6DA8D]">「开店前准备期」（时间已暂停）</strong>。
                  接下来我会配合画面金色高亮提示，一步步带你完成首日全流程：
                </p>

                {/* 3-Stage Day-1 Roadmap */}
                <div className="mt-3.5 space-y-2">
                  <div className="game-inset rounded-lg px-3 py-2 flex items-start gap-2.5">
                    <span className="font-mono-num text-xs font-black text-[#211208] bg-[#E8C97A] w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <div className="text-[11px] leading-snug">
                      <div className="font-bold text-[#FFF6E5]">开店前准备（熟悉按钮 · 检查菜单 · 挂牌营业）</div>
                      <div className="text-[#C5AE92] mt-0.5">
                        先认清左上角圆章与「门店配置 [C]」，确认菜品锅底与熟食后，点击右下角金色「正式开店」印玺。
                      </div>
                    </div>
                  </div>

                  <div className="game-inset rounded-lg px-3 py-2 flex items-start gap-2.5">
                    <span className="font-mono-num text-xs font-black text-[#211208] bg-[#E8C97A] w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <div className="text-[11px] leading-snug">
                      <div className="font-bold text-[#FFF6E5]">正式经营中（1~7 快捷调度 · 处理突发奇遇）</div>
                      <div className="text-[#C5AE92] mt-0.5">
                        按底部 1→2 迎宾上锅、3/7 补冰台与熟食、4→5→6 收桌洗碗摆台，并临机决断营业突发意外。
                      </div>
                    </div>
                  </div>

                  <div className="game-inset rounded-lg px-3 py-2 flex items-start gap-2.5">
                    <span className="font-mono-num text-xs font-black text-[#211208] bg-[#E8C97A] w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <div className="text-[11px] leading-snug">
                      <div className="font-bold text-[#FFF6E5]">闭店收尾（清场 · 进后场冷库补货 · 手动结算）</div>
                      <div className="text-[#C5AE92] mt-0.5">
                        22:00 闭店后不会自动结账：先清光脏桌并进后场冷库采购次日海鲜，最后手动点击右下角「手动结算」。
                      </div>
                    </div>
                  </div>

                  <div className="game-inset rounded-lg px-3 py-2 flex items-start gap-2.5 border border-[#4EAFA2]/45">
                    <span className="font-mono-num text-[10px] font-black text-[#0f2424] bg-[#67E8F9] w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5">
                      M
                    </span>
                    <div className="text-[11px] leading-snug">
                      <div className="font-bold text-[#99F6E4]">后场七大功能区（按 [M] 随时巡视）</div>
                      <div className="text-[#C5AE92] mt-0.5">
                        含冷链库（闭店补货/林汐）、热厨（加急熟食/沈知微）、洗消间、办公室（发兼职/急采/苏星遥）、卫生间保洁、机电检修与宿舍慰问。
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-[#4a2f1d] flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onSkipAll}
                  className="game-btn-wood px-4 py-2.5 rounded-lg text-xs font-semibold text-[#D6C3A8] cursor-pointer text-center"
                >
                  我是老店长，跳过引导
                </button>
                <button
                  type="button"
                  onClick={() => onConfirmStartGuide?.()}
                  className="game-btn-gold px-5 py-2.5 rounded-lg text-xs font-black inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-lg"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  开始首日开店指引（推荐）
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isVisible = forceOpen || (world.onboardingStep < GUIDE_STEPS.length && world.day <= 2);
  if (!isVisible) return null;

  const stepIdx = Math.max(0, Math.min(GUIDE_STEPS.length - 1, world.onboardingStep));
  const step = GUIDE_STEPS[stepIdx];

  const handleAction = () => {
    if (step.actionKey === 'CONFIG') onOpenConfig();
    else if (step.actionKey === 'BACKSTAGE') onEnterBackstage();
    else if (step.actionKey === 'BUSINESS') onOpenBusiness();
  };

  if (collapsed) {
    return (
      <div className="absolute top-[62px] right-3 z-30 pointer-events-auto">
        <button
          onClick={() => setCollapsed(false)}
          className="hud-float backdrop-blur-md px-3.5 py-2 rounded-lg border-[#E8C97A]/80 flex items-center gap-2 cursor-pointer hover:border-[#F6DA8D] transition-colors"
        >
          <Compass className="w-4 h-4 text-[#E8C97A]" />
          <span className="font-display font-bold text-xs text-[#F6DA8D]">
            新店长引导 ({stepIdx + 1}/{GUIDE_STEPS.length})
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-[#E8C97A]" />
        </button>
      </div>
    );
  }

  return (
    <div className="absolute top-[62px] right-3 z-30 w-[352px] max-w-[92vw] pointer-events-auto">
      <div className="hud-float backdrop-blur-md rounded-xl p-3.5 border-[#E8C97A]/85">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#593b25]">
          <div className="flex items-center gap-1.5 min-w-0">
            <Compass className="w-4 h-4 text-[#E8C97A] shrink-0" />
            <span className="font-display font-bold text-xs text-[#F6DA8D] truncate">
              {showBackstageTab
                ? '后场七大功能区指南'
                : `首日全程引导 (${stepIdx + 1}/${GUIDE_STEPS.length})`}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setCollapsed(true)}
              title="暂时收起引导栏"
              className="text-[11px] text-[#C5AE92] hover:text-[#FFF6E5] inline-flex items-center gap-0.5 cursor-pointer"
            >
              收起
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <span className="text-[#593b25]">|</span>
            <button
              onClick={onSkipAll}
              title="关闭引导（随时可在顶部「引导」按钮重开）"
              className="text-[11px] text-[#C5AE92] hover:text-[#FCA5A5] inline-flex items-center gap-0.5 cursor-pointer"
            >
              跳过
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 4-Tab Navigation: 3 Day Stages + Dedicated Backstage 7-Room Guide */}
        <div className="grid grid-cols-4 gap-1 mt-2.5">
          {[
            { id: 'PREP' as GuideStage, label: '1.开店前', jumpIdx: 0 },
            { id: 'PLAYING' as GuideStage, label: '2.营业中', jumpIdx: 3 },
            { id: 'CLOSING' as GuideStage, label: '3.闭店收尾', jumpIdx: 7 },
          ].map((st) => {
            const active = !showBackstageTab && step.stage === st.id;
            const currentPhaseMatch =
              world.activeScene !== 'BACKSTAGE' &&
              ((world.phase === 'PREP' && st.id === 'PREP') ||
                (world.phase === 'PLAYING' && st.id === 'PLAYING') ||
                (world.phase === 'CLOSING' && st.id === 'CLOSING'));
            return (
              <button
                key={st.id}
                onClick={() => {
                  setShowBackstageTab(false);
                  onSetStep(st.jumpIdx);
                }}
                className={`py-1 px-1 rounded text-[10px] font-bold cursor-pointer border transition-colors ${
                  active
                    ? 'bg-[#3b2214] border-[#E8C97A] text-[#FFF6E5]'
                    : currentPhaseMatch
                      ? 'bg-[#26160e] border-[#8f6734] text-[#F6DA8D]'
                      : 'bg-[#170d09] border-[#4a2f1d] text-[#A88E74] hover:text-[#DFCDB6]'
                }`}
              >
                {st.label}
              </button>
            );
          })}
          <button
            onClick={() => setShowBackstageTab(true)}
            className={`py-1 px-1 rounded text-[10px] font-bold cursor-pointer border transition-colors ${
              showBackstageTab
                ? 'bg-[#163438] border-[#67E8F9] text-[#ECFEFF]'
                : world.activeScene === 'BACKSTAGE'
                  ? 'bg-[#14282b] border-[#4EAFA2] text-[#99F6E4]'
                  : 'bg-[#170d09] border-[#4a2f1d] text-[#99F6E4]/80 hover:text-[#ECFEFF]'
            }`}
          >
            4.后场七房
          </button>
        </div>

        {showBackstageTab ? (
          <div className="mt-2.5 space-y-2">
            <div className="game-inset rounded-lg px-2.5 py-2 text-[10.5px] text-[#D7ECEB] leading-snug border border-[#3a6868]/60">
              <div className="font-bold text-[#99F6E4] mb-0.5">
                如何巡视后场（按 [M] 或点左上角「进入后场」）
              </div>
              <div>
                使用 <strong className="text-[#F6DA8D]">WASD / 方向键</strong> 或直接点击画面/底部房间栏走入对应房间。
                房间名带 <strong className="text-[#FACC15]">!</strong> 表示有可免费招募的神秘访客，带{' '}
                <strong className="text-[#7DD3FC]">补</strong> 表示闭店待补货；每房每日还可触发 1 次「巡视互动剧情」。
              </div>
            </div>

            <div className="max-h-[268px] overflow-y-auto pr-1 space-y-1.5">
              {BACKSTAGE_ROOM_GUIDES.map((room) => (
                <div
                  key={room.id}
                  className="bg-[#160d09]/92 border border-[#4f3320] rounded-lg px-2.5 py-2 text-[10.5px] leading-snug"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display font-bold text-xs" style={{ color: room.accent }}>
                      {room.name}
                    </span>
                    <span className="text-[9.5px] text-[#B59876] shrink-0">{room.pos}</span>
                  </div>
                  <div className="text-[10px] font-semibold text-[#F6DA8D] mt-0.5">
                    功能：{room.action}
                  </div>
                  <div className="text-[#D8C5AD] mt-0.5">{room.detail}</div>
                  {room.npc && (
                    <div className="text-[10px] text-[#99F6E4] mt-1 font-medium">★ {room.npc}</div>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-[#4a2f1d] flex items-center justify-between gap-2">
              <button
                onClick={() => setShowBackstageTab(false)}
                className="game-btn-wood px-2.5 py-1 rounded text-[11px] font-semibold inline-flex items-center gap-0.5 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                返回三阶段指引
              </button>
              {world.activeScene !== 'BACKSTAGE' && (
                <button
                  onClick={onEnterBackstage}
                  className="game-btn-gold px-3 py-1 rounded text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  立即进入后场 [M]
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Current Step Content */}
            <div className="mt-2.5 space-y-2">
              <div>
                <div className="font-display font-bold text-xs text-[#FFF6E5]">{step.title}</div>
                <div className="text-[10px] text-[#E8C97A] mt-0.5 font-medium">
                  操作位置：{step.whereTag}
                </div>
              </div>

              <p className="text-[11px] text-[#EFE2D0] leading-relaxed">{step.body}</p>

              <ul className="space-y-1.5 game-inset rounded-lg p-2.5 text-[11px] text-[#DFCDB6] leading-snug">
                {step.checklist.map((line, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-[#E8C97A] font-bold shrink-0">•</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>

              {(stepIdx === 0 || stepIdx === 7) && (
                <button
                  onClick={() => setShowBackstageTab(true)}
                  className="w-full py-1.5 px-2.5 rounded-lg bg-[#142a2d] hover:bg-[#1a373b] border border-[#4EAFA2]/70 text-[#99F6E4] text-[11px] font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  查看后场七大功能房详解（采购 / 兼职 / 维保 / 特聘伙伴）
                </button>
              )}
            </div>

            {/* Toggleable Button Cheatsheet */}
            <div className="mt-2">
              <button
                onClick={() => setShowCheatsheet((v) => !v)}
                className="w-full flex items-center justify-between text-[11px] text-[#C5AE92] hover:text-[#F6DA8D] py-1 cursor-pointer"
              >
                <span className="inline-flex items-center gap-1 font-semibold">
                  <HelpCircle className="w-3.5 h-3.5 text-[#E8C97A]" />
                  全界面按钮功能速查表
                </span>
                <span>{showCheatsheet ? '收起 ▲' : '展开 ▼'}</span>
              </button>
              {showCheatsheet && (
                <div className="mt-1 space-y-1.5 bg-[#150b08] border border-[#4a2f1d] rounded-lg p-2.5 text-[10px] text-[#DFCDB6]">
                  {BUTTON_CHEATSHEET.map((row) => (
                    <div key={row.area}>
                      <span className="font-bold text-[#F6DA8D]">{row.area}：</span>
                      <span>{row.desc}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Controls */}
            <div className="mt-2.5 pt-2.5 border-t border-[#4a2f1d] flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {stepIdx > 0 && (
                  <button
                    onClick={() => onSetStep(stepIdx - 1)}
                    className="game-btn-wood px-2 py-1 rounded text-[11px] font-semibold inline-flex items-center gap-0.5 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    上一步
                  </button>
                )}
                {step.actionKey && step.actionLabel && (
                  <button
                    onClick={handleAction}
                    className="game-btn-gold px-2.5 py-1 rounded text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <BookOpen className="w-3 h-3" />
                    {step.actionLabel}
                  </button>
                )}
              </div>

              {stepIdx < GUIDE_STEPS.length - 1 ? (
                <button
                  onClick={() => onSetStep(stepIdx + 1)}
                  className="game-btn-wood px-2.5 py-1 rounded text-[11px] font-bold text-[#F6DA8D] inline-flex items-center gap-0.5 cursor-pointer ml-auto"
                >
                  下一步
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={onSkipAll}
                  className="game-btn-gold px-3 py-1 rounded text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer ml-auto"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  掌握完毕
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
