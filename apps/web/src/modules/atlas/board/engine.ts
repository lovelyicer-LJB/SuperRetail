// 🔴 改动 2026-10-10 · 画板引擎：复刻 Evoloop client.js 无限画布核心
// （点阵网格 / 平移缩放 / Note·To-do·Board 卡片 / 连线 / 嵌套子画板 / 800ms 防抖持久化）。
// 🔴 改动 2026-10-12 · food 实物卡四形态（icon/node/info/card，Tab+Q/W/E/R 切换，新建默认节点形态）。
// 🔴 改动 2026-10-12 · 连线参照工坊资产节点示例：输出端口按住拖拽出「待定连线」跟随光标，
// 落到目标卡输入端口（或卡身）即建立连线，Esc 取消；连线改为端口锚定的贝塞尔曲线。
// 🔴 改动 2026-10-12 ·【框架约定 · Del 删除】一切可拖入画板的东西都必须支持 Del/Backspace 快捷键删除：
// ① 引擎卡片（note/todo/board/food/character/recipe/dish/market/revenue）：点选/框选进入
// selectedIds，document keydown 命中即 deleteSelected（连线双击删除，收益分支随卖出连线一并清除）；
// ② 页面层放置物（AtlasPage 从图表浮窗拖入的组件/图表，不走引擎卡片模型）：点击选中后由页面层的
// window keydown 监听删除。两层选择互斥——选中放置物时经 BoardEngine.clearSelection() 清空卡片选择，
// 点卡片/空白时页面层清空放置物选择，按一次 Del 永远只删一边。
// 守卫统一：输入框/多行文本/可编辑区/输入法合成中不响应；作用域内才生效（页面本体/画板/壳层浮窗）。
// 后续新增任何「可拖入画板」的元素类型时，必须同时接入其中一套删除路径，否则视为功能不完整。
// 🔴 改动 2026-10-13 ·【框架约定 · 画板坐标 + 屏幕钉】一切放在画板上的东西都必须使用画板世界坐标
// （随画布平移/缩放），并提供右键「屏幕钉」——钉住后不随画布移动，取消钉原地回到世界坐标系：
// ① 引擎卡片：x/y 本即世界坐标；钉 = meta.pinned + pinX/pinY/pinZoom（钉位为引擎根相对屏幕像素、
// 尺寸冻结在钉住时缩放），applyViewport 时对钉卡写 counter-transform 抵消世界变换，连线锚点经
// pinEffectiveWorld 换算跟随；钉态随文档持久化。右键卡片 →「屏幕钉/取消屏幕钉」切换。
// ② 页面层放置物：wx/wy 存世界坐标（拖放落点经 BoardEngine.clientToWorld 换算），渲染按
// view.x + wx×zoom 定位（挂画板区容器，与引擎根同原点）；钉 = pinned + sx/sy/pinZoom（容器内屏幕像素）。
// 两层均不叠加任何钉态提示/状态图标（用户明确要求）。后续新增可拖入画板的元素类型时，
// 必须接入世界坐标 + 屏幕钉其中一套实现，否则视为功能不完整。
// 🔴 改动 2026-10-13 ·【框架约定 · 画板与 Tab 一体】版图的画板与 Tab 坞标签是一体的，
// 类似 Chrome 的标签页与浏览器窗口：Tab 不是独立对象，只是画板在坞中的把手。激活 Tab = 把对应
// 画板带到前台；重命名 Tab = 改画板名（随画板文档持久化）；新建 Tab = 新建空白画板；删除 Tab =
// 删除画板。反向同理：画板侧状态必须如实反映到 Tab——屏幕钉浮动窗口在 Tab 上显示钉点、被覆盖
// 收起的画板点 Tab 即复位、「成为主画板」后 Tab 保留画板随迁。不允许出现「Tab 有而画板没有」
// 或反向的幽灵状态。实现：主画板 = 拆分树 tab:-1 叶子（框架写死必须存在一个；删除走安全弹窗，
// 删除后右侧第一个画板自动接任并全展开）；拆分画板 = splitStore boards 数组与 Tab 坞标签
// 一一对应（下标即身份，删除后重排）。后续新增任何画板级/Tab 级操作时，必须同时落到两侧，
// 否则视为功能不完整。
// Tab 拖拽复刻 Chrome 撕离（AtlasPage 页面层实现，SplitDockTab 指针拖拽超过 8px 进入）：
// 拖到另一块画板上 = 钉为浮动子画板（画中画，多窗口并存，各 Tab 独立位置；钉住时原窗格叶子收起，
// 同组兄弟画板自动填充剩余空间，点 Tab 复位）；拖出浏览器窗口 =
// 拆出为独立浏览器窗口（?boardwin=<detachId>，可拖到另一台显示器）。拆出后文档仍为一体——
// detachId 挂在 BoardDoc 上（随文档走完 boards 数组增删换位，身份不丢），同源 localStorage 共享
// 拆分状态 + storage 事件双向跟随（后写胜出，回声经串行化比对吞掉）；拆出 Tab 显示 ⇗，点击挂回
// （清除 detachId，拆出窗口随即显示提示页）。主画板标签不可拖出——它是窗口本体。
// 架构：纯 DOM 引擎（vanilla 闭包），React 只负责挂载——视口与卡片位置全部经
// ref + 直接 transform/left/top 写入，拖拽缩放不触发任何 React 重渲染。
import type { BoardCard, BoardDoc, BoardLine, CardMeta, CardType, FoodForm, TodoItem, Viewport } from './types'
import { assetFormSize, cardMin, clamp, DEFAULT_FOOD_FORM, emptyBoard, isAssetCard, REVENUE_SIZE, uid, ZOOM_MAX, ZOOM_MIN } from './types'
import { loadBoard, saveBoard } from './storage'
// 🔴 改动 2026-10-11 · food 实物卡：内容建造器（侧栏「实物」浮窗共用同一渲染）
import { buildFoodCard } from './foodCardContent'
import { demoFoodCards } from '@/modules/workshop/food-card/data'
// 🔴 改动 2026-10-12 · character 角色卡 / recipe 配方卡：内容建造器（与侧栏「角色」「配方」浮窗共用同一渲染）
import { buildCharacterCard } from './characterCardContent'
import { buildRecipeCard } from './recipeCardContent'
import { demoCharacters } from '@/modules/workshop/character-card/data'
import { demoRecipes } from '@/modules/workshop/recipe-card/data'
// 🔴 改动 2026-10-12 · dish 菜品卡：内容建造器（与侧栏「菜品」浮窗共用同一渲染）
import { buildDishCard } from './dishCardContent'
import { demoDishes } from '@/modules/workshop/dish-card/data'
// 🔴 改动 2026-10-12 · market 市场卡：内容建造器（与侧栏「市场」浮窗共用同一渲染）
import { buildMarketCard } from './marketCardContent'
import { demoMarkets } from '@/modules/workshop/market-card/data'
// 🔴 改动 2026-10-12 · revenue 收益节点（卖出连线成立后自动生成）+ 资产卡展示名
import { assetCardName, buildRevenueCard } from './revenueCardContent'
// 🔴 改动 2026-10-12 · 收益节点直连线的自动直角布线（移植工坊 revenueRouting 障碍网格 A* + 圆角）
import { roundedPath, routeWire } from './wireRouting'
// 🔴 改动 2026-10-16 · 活跃引擎追踪：本引擎根节点 pointerdown 时上报 bridge，侧边栏「加入画板」
// 优先落到用户最近交互的画板（画中画子画板浮窗在最上层时不再误加进被遮住的父画板）
import { setActiveBoardEngine } from './bridge'

/** 引擎对外句柄：主题切换 + 销毁 + 添加卡片（侧边栏「循环」浮窗工具入口） */
export interface BoardEngine {
  setTheme: (dark: boolean) => void
  dispose: () => void
  /** 🔴 改动 2026-10-10 · 在画布中心添加卡片（line 进入连线模式，note 直接进编辑） */
  addCard: (type: 'note' | 'todo' | 'line' | 'board') => void
  /** 🔴 改动 2026-10-11 · 在画布中心添加 food 实物卡（侧栏「实物」浮窗入口，foodId 锚定工坊数据契约） */
  addFoodCard: (foodId: string) => void
  /** 🔴 改动 2026-10-12 · 在画布中心添加 character 角色卡（侧栏「角色」浮窗入口，characterId 锚定工坊数据契约） */
  addCharacterCard: (characterId: string) => void
  /** 🔴 改动 2026-10-12 · 在画布中心添加 recipe 配方卡（侧栏「配方」浮窗入口，recipeId 锚定工坊数据契约） */
  addRecipeCard: (recipeId: string) => void
  /** 🔴 改动 2026-10-12 · 在画布中心添加 dish 菜品卡（侧栏「菜品」浮窗入口，dishId 锚定工坊数据契约） */
  addDishCard: (dishId: string) => void
  /** 🔴 改动 2026-10-12 · 在画布中心添加 market 市场卡（侧栏「市场」浮窗入口，marketId 锚定工坊数据契约） */
  addMarketCard: (marketId: string) => void
  /** 🔴 改动 2026-10-11 · 取当前画板文档（拆分视图共享同一引用；标题浮窗读取名称） */
  getDoc: () => BoardDoc
  /** 🔴 改动 2026-10-11 · 设置画板名称（标题浮窗编辑） */
  setTitle: (title: string) => void
  /** 🔴 改动 2026-10-11 · 共享文档被另一窗格修改后清卡重渲（拆分视图同步） */
  syncFromDoc: () => void
  /** 🔴 改动 2026-10-11 · 当前缩放比（顶栏 View 百分比） */
  getZoom: () => number
  /** 🔴 改动 2026-10-11 · 按百分比缩放到画布中心（90–120% 吸附 100%，复刻 Evoloop setZoom） */
  setZoomPct: (percent: number) => void
  /** 🔴 改动 2026-10-11 · 立即落盘（顶栏 sync 按钮：绕过 800ms 防抖） */
  flushSave: () => void
  /** 🔴 改动 2026-10-11 · 用外部画板文件整体替换当前文档（顶栏 Project 打开画板文件）；返回是否接受 */
  loadDoc: (doc: unknown) => boolean
  /** 🔴 改动 2026-10-13 · 技能释放：命中技能对应的未激活收益链路外框 → 激活。
   *  'play' 运行 → 未循环链路（虚线框）→ 收益线程；'operate' 运转 → 已循环链路（实线框）→ 收益循环；
   *  屏幕坐标 → 世界坐标 → 命中链路外框（含收益节点，FRAME_PAD 同渲染口径）；返回是否命中并激活 */
  activateChainAt: (screenX: number, screenY: number, skillKey: 'play' | 'operate') => boolean
  /** 🔴 改动 2026-10-13 · 技能选中态通知（HUD 技能栏调用）：选中「运行」时高亮可激活的金色虚线框，
   *  同时拦截画板手势（点击技能后，下一次左键点击是技能释放，不触发平移/框选/卡片拖动） */
  setSkillArmed: (skillKey: string | null) => void
  /** 🔴 改动 2026-10-12 · 清空画板卡片选择（页面层选中已放置组件/图表时调用，避免 Del 同时删两边） */
  clearSelection: () => void
  /** 🔴 改动 2026-10-13 · 当前视口快照（x/y/zoom，副本）：页面层放置物按画板坐标换算屏幕位置用 */
  getView: () => Viewport
  /** 🔴 改动 2026-10-13 · 屏幕坐标（clientX/Y）→ 画板世界坐标（页面层拖放落点换算用） */
  clientToWorld: (clientX: number, clientY: number) => { x: number; y: number }
  /** 🔴 改动 2026-10-13 · 画板世界坐标 → 屏幕坐标（client 系；页面层放置物渲染定位用） */
  worldToClient: (worldX: number, worldY: number) => { x: number; y: number }
  /** 🔴 改动 2026-10-16 · 引擎是否已销毁（bridge 活跃引擎追踪回落判定用） */
  isDisposed: () => boolean
}

/**
 * 引擎配置。
 * 主画板：仅传 dark —— 文档从 localStorage 读、写回 localStorage；
 * 子画板：传 doc（父卡片 meta.sub，引用共享，mutation 直接落在父文档上）
 *         + isSub + onClose（返回上级）+ onPersist（通知父级该保存了）。
 */
export interface BoardEngineOptions {
  dark: boolean
  doc?: BoardDoc
  isSub?: boolean
  onClose?: () => void
  onPersist?: (doc: BoardDoc) => void
  /** 🔴 改动 2026-10-10 · 是否挂载画板自带「添加」工具栏（默认 false：入口在侧边栏「循环」浮窗） */
  showAddMenu?: boolean
  /** 🔴 改动 2026-10-11 · 拆分视图：使用独立视口副本（配合 doc 共享实现一文档两视口） */
  localViewport?: boolean
  /** 🔴 改动 2026-10-11 · 文档变更通知（拆分窗格间互相同步；scheduleSave 时触发） */
  onDocChange?: (doc: BoardDoc) => void
  /** 🔴 改动 2026-10-11 · 当前拆分状态（右键菜单据此显示 拆分/取消拆分） */
  splitState?: 'vertical' | 'horizontal' | null
  /** 🔴 改动 2026-10-11 · 右键菜单「拆分画板」动作回调（null = 取消拆分） */
  onSplitRequest?: (dir: 'vertical' | 'horizontal' | null) => void
  /** 🔴 改动 2026-10-13 · 画板空白右键菜单：拆分所在画板（就拆这块画板，方向由页面层按所在分组决定） */
  onBoardSplit?: () => void
  /** 🔴 改动 2026-10-13 · 画板空白右键菜单：收起画板（本窗格进入收起/被覆盖状态） */
  onCollapseBoard?: () => void
  /** 🔴 改动 2026-10-13 · 画板空白右键菜单：成为主画板（仅非主画板窗格显示） */
  onBecomeMain?: () => void
  /** 🔴 改动 2026-10-13 · 画板空白右键菜单：删除画板（页面层弹确认/安全弹窗） */
  onDeleteBoard?: () => void
  /** 🔴 改动 2026-10-13 · 本窗格是否主画板（是 → 隐藏「成为主画板」菜单项） */
  isMainBoard?: boolean
  /** 🔴 改动 2026-10-13 · 收益工作流被技能激活后：框线范围内的链路已抽取为子画板文档（并从本画板移除），
   *  经此回调交给页面层在 Tab 坞挂新 Tab（默认屏幕钉） */
  onChainActivated?: (sub: { doc: BoardDoc; title: string; kind: 'thread' | 'loop' }) => void
  /** 🔴 改动 2026-10-13 · 视口每次应用时广播全量视口（顶栏 View 百分比取 zoom；页面层放置物取 x/y/zoom 换算定位） */
  onViewChange?: (view: Viewport) => void
  /** 🔴 改动 2026-10-13 · 画中画（屏幕钉浮动窗口）标记：Ctrl+A 时与所在大画板连带全选（视为一体） */
  pip?: boolean
}

interface MinSize {
  w: number
  h: number
}

type EditHook = (e?: MouseEvent) => void

/** 本次实现的卡片类型（其余内容类型以禁用态陈列，复刻 Evoloop 的「即将支持」占位） */
const ENABLED_TYPES: ReadonlySet<string> = new Set(['note', 'todo', 'line', 'board'])

/** 内容类型色板（1:1 复刻 Evoloop colorForType；workflow 在 Evoloop 走 fallback #6d5efc） */
const TYPE_COLORS: Record<string, string> = {
  note: '#c6c6c6', link: '#92b9db', todo: '#9cc69f', workflow: '#6d5efc', line: '#b8b8b8',
  board: '#9ab9e0', column: '#b9b9b9', comment: '#d5b58b', table: '#baa9d4',
  sketch: '#c8c8c8', color: '#d3a7bb', document: '#c6c6c6', audio: '#9cc5b5',
  map: '#cdbd8c', video: '#a1c4d1', image: '#bbc6d4', upload: '#c6c6c6', draw: '#c8c8c8',
}

/** 添加菜单内容类型（1:1 复刻 Evoloop CONTENT_TYPES 全量 18 项与排列顺序） */
const MENU_ITEMS: ReadonlyArray<{ type: string; label: string; icon: string }> = [
  { type: 'note', label: '笔记', icon: '≡' },
  { type: 'link', label: '链接', icon: '⌁' },
  { type: 'todo', label: '待办', icon: '✓' },
  { type: 'workflow', label: 'WorkFlow', icon: '◇' },
  { type: 'line', label: '连线', icon: '↗' },
  { type: 'board', label: '画板', icon: '▦' },
  { type: 'column', label: '分栏', icon: '▬' },
  { type: 'comment', label: '评论', icon: '❯' },
  { type: 'table', label: '表格', icon: '▤' },
  { type: 'sketch', label: '草图', icon: '✎' },
  { type: 'color', label: '色块', icon: '▧' },
  { type: 'document', label: '文档', icon: '▭' },
  { type: 'audio', label: '音频', icon: '♪' },
  { type: 'map', label: '地图', icon: '◉' },
  { type: 'video', label: '视频', icon: '▸' },
  { type: 'image', label: '图片', icon: '▣' },
  { type: 'upload', label: '上传', icon: '⇧' },
  { type: 'draw', label: '绘图', icon: '✏' },
]

/** 画板实例序号：收益金色渐变的 SVG id 按实例唯一（主/子画板、拆分窗格同文档共存时避免 id 冲突） */
let instanceSeq = 0

// 🔴 改动 2026-10-13 · Ctrl+A 多画板定向：分屏多窗格 / 画中画（屏幕钉浮动窗口）各自持有引擎，
// 且每个引擎都在 document 上监听 keydown——不定向会导致 Ctrl+A 把所有画板同时全选。
// 这里登记全部存活引擎，按键时按「指针下的最上层画板」定向（elementFromPoint 天然含 z 序）；
// 画中画窗口（pip）与所在大画板视为一体：命中任一方，双方连带全选。
interface LiveBoardEntry {
  root: HTMLElement
  isMain: boolean
  pip: boolean
  /** 是否子画板覆盖层（isSub）：覆盖层不参与跨画板拖放（全屏遮罩，父画板在其下不可作为落点） */
  isSub: boolean
  selectAll: () => void
  /** 🔴 改动 2026-10-14 · 跨画板拖放：把一组卡片（含内部连线）移入本画板。
   *  落点按「被按住的卡」的抓取偏移对齐（pressedId + grabX/grabY），使落点与拖动幽灵视觉一致、不跳位 */
  receiveCards: (
    cards: BoardCard[],
    lines: BoardLine[],
    clientX: number,
    clientY: number,
    pressedId: string,
    grabX: number,
    grabY: number,
  ) => void
}
const liveBoards = new Set<LiveBoardEntry>()
/** 🔴 改动 2026-10-14 · 画板剪贴板（复制/剪切 → 粘贴）：卡片 + 其内部连线，跨引擎共享——
 *  在任意一块画板复制/剪切，可在任意画板的空白处或卡片上粘贴 */
let clipboard: { cards: BoardCard[]; lines: BoardLine[] } | null = null
let mainBoardEntry: LiveBoardEntry | null = null
let lastPointerX = -1
let lastPointerY = -1
let pointerTrackerArmed = false
function armPointerTracker() {
  if (pointerTrackerArmed) return
  pointerTrackerArmed = true
  const track = (e: PointerEvent) => {
    lastPointerX = e.clientX
    lastPointerY = e.clientY
  }
  document.addEventListener('pointermove', track, { capture: true, passive: true })
  document.addEventListener('pointerdown', track, { capture: true, passive: true })
}
/** Ctrl+A 目标画板：指针下的引擎根 → 焦点所在画板 → 主画板兜底 */
function selectAllTarget(): LiveBoardEntry | null {
  const el = lastPointerX >= 0 ? document.elementFromPoint(lastPointerX, lastPointerY) : null
  if (el) for (const en of liveBoards) if (en.root.contains(el)) return en
  const ae = document.activeElement
  if (ae) for (const en of liveBoards) if (en.root.contains(ae)) return en
  return mainBoardEntry
}
/** 🔴 改动 2026-10-14 · 跨画板拖放落点判定：几何命中存活画板根（getBoundingClientRect，
 *  不受 body 层拖动幽灵影响）；重叠时取面积最小者（画中画浮层悬浮于主画板之上，优先命中画中画）。
 *  子画板覆盖层（isSub）不参与。
 *  🔴 改动 2026-10-16 · 自身也参与面积比较：指针几何上仍落在自身窗口内时，最小面积者就是
 *  自己 → 返回 null（浮窗内拖卡不转移）。修复：画中画浮窗悬浮于全屏父画板之上，指针同时
 *  几何命中两者，旧逻辑排除自身后把父画板误判为落点，浮窗里拖动/ reposition 卡片即被
 *  「转移」进父画板（父画板在浮窗底层看不见，用户误以为没发生；重新拖入又产生第二张，
 *  刷新后两张同时出现 = 「父画板也多了一个」） */
function boardAtPoint(clientX: number, clientY: number, selfRoot: HTMLElement): LiveBoardEntry | null {
  let best: LiveBoardEntry | null = null
  let bestArea = Infinity
  for (const en of liveBoards) {
    if (en.isSub) continue
    const r = en.root.getBoundingClientRect()
    if (clientX < r.left || clientX > r.right || clientY < r.top || clientY > r.bottom) continue
    const area = r.width * r.height
    if (area < bestArea) {
      bestArea = area
      best = en
    }
  }
  // 指针仍落在自身（或没有任何其它画板命中）→ 不跨板转移
  if (best === null || best.root === selfRoot) return null
  return best
}

export function createBoardEngine(root: HTMLElement, opts: BoardEngineOptions): BoardEngine {
  const svgSeq = ++instanceSeq
  const isSub = opts.isSub === true
  const board: BoardDoc = opts.doc ?? loadBoard()
  // 🔴 改动 2026-10-11 · 拆分视图：localViewport 实例用独立视口副本（不写回共享文档）；否则直接引用文档视口（原行为）
  const view = opts.localViewport ? { ...board.viewport } : board.viewport
  view.zoom = clamp(view.zoom, ZOOM_MIN, ZOOM_MAX)

  let disposed = false
  let saveTimer = 0
  // 🔴 改动 2026-10-16 · 视口独立防抖落盘计时器（与 saveTimer 分离：applyViewport 高频触发，不进历史栈）
  let viewSaveTimer = 0
  // 🔴 改动 2026-10-16 · 自身句柄晚绑定（pointerdown 上报 bridge 活跃引擎用；事件触发时早已构造完成）
  let apiRef = null as unknown as BoardEngine
  const cardEls = new Map<string, HTMLElement>()
  let selectedIds = new Set<string>()
  let editingId: string | null = null
  let connectMode = false
  let connectFrom: string | null = null
  /** 🔴 改动 2026-10-13 · 技能栏当前选中的技能（'play' = 运行）：选中期间拦截画板手势并高亮可激活虚线框 */
  let armedSkill: string | null = null
  /** 🔴 改动 2026-10-13 · 刚释放过技能的短窗口：拦截双击建卡等手势误触 */
  let recentCast = false
  /** 打开中的子画板关闭函数（存在期间父引擎的键盘/外点手势让位给子画板） */
  let childClose: (() => void) | null = null
  /** 打开中的子画板引擎句柄（主题切换时联动换肤） */
  let childEngine: BoardEngine | null = null
  /** 双击编辑钩子（note 聚焦文本 / todo 聚焦标题 / board 分流改名或进入子画板） */
  const editHooks = new Map<string, EditHook>()
  /** 挂载后拟合钩子（note/todo 的内容高度自适应需要布局环境，首次渲染在挂载后补一次） */
  const postFitHooks = new Map<string, () => void>()
  /** board 卡计数刷新钩子（子画板关闭后回刷「N 张卡片」） */
  const countRefreshHooks = new Map<string, () => void>()
  /** 所有常驻监听挂在一个 AbortController 上，dispose 一次注销 */
  const ac = new AbortController()
  const on = <E extends Event>(
    target: EventTarget,
    type: string,
    listener: (e: E) => void,
    options?: AddEventListenerOptions,
  ) => {
    target.addEventListener(type, listener as EventListener, { ...options, signal: ac.signal })
  }

  // ---------- 小工具 ----------
  function div(cls: string): HTMLDivElement {
    const n = document.createElement('div')
    n.className = cls
    return n
  }
  function span(cls: string): HTMLSpanElement {
    const n = document.createElement('span')
    n.className = cls
    return n
  }
  function svgEl<K extends keyof SVGElementTagNameMap>(
    tag: K,
    attrs: Record<string, string | number>,
  ): SVGElementTagNameMap[K] {
    const n = document.createElementNS('http://www.w3.org/2000/svg', tag)
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v))
    return n
  }
  /** target 沿父链向上（止于 node）是否带某 class —— 复刻 Evoloop 的手势豁免判断 */
  function classWithin(target: EventTarget | null, node: HTMLElement, cls: string): boolean {
    let cur = target instanceof HTMLElement ? target : null
    while (cur && cur !== node) {
      if (cur.classList.contains(cls)) return true
      cur = cur.parentElement
    }
    return false
  }
  /** 🔴 改动 2026-10-12 · target 是否落在卡片端口上（连线拖拽手势的入口/落点判定） */
  function portWithin(target: EventTarget | null, node: HTMLElement): HTMLElement | null {
    const cur = target instanceof Element ? target : null
    const port = cur?.closest<HTMLElement>('[data-port-side]')
    return port && node.contains(port) ? port : null
  }
  /** 🔴 改动 2026-10-12 · 元素相对卡片外壳的偏移（offset 链累加；不受世界 transform 影响，
   *  因此视口未应用/缩放任意状态下量出的都是正确的世界坐标 —— 修复切页返回后连线跑偏） */
  function offsetWithin(el: HTMLElement, ancestor: HTMLElement): { x: number; y: number } {
    let x = 0
    let y = 0
    let cur: HTMLElement | null = el
    while (cur && cur !== ancestor) {
      x += cur.offsetLeft
      y += cur.offsetTop
      cur = cur.offsetParent as HTMLElement | null
    }
    return { x, y }
  }
  /** 🔴 改动 2026-10-12 · 贝塞尔连线路径（1:1 复刻工坊资产节点 graph.ts 的 curve 公式） */
  function wirePath(a: { x: number; y: number }, b: { x: number; y: number }): string {
    const reach = Math.max(65, Math.abs(b.x - a.x) * 0.45)
    return `M ${a.x} ${a.y} C ${a.x + reach} ${a.y}, ${b.x - reach} ${b.y}, ${b.x} ${b.y}`
  }
  /** 🔴 改动 2026-10-12 · 端口锚点（世界坐标）：节点形态的 asset-port 是整行元素，视觉端口是行内
   *  的 <i> 小圆点 —— 必须量圆点而非行，否则线会聚到节点中部；卡片形态端口本身即圆点。
   *  无端口或端口 id 失效时退化为该侧边缘中点（参照工坊 graph.ts portPosition 的语义）。
   *  🔴 改动 2026-10-13 · 屏幕钉：钉卡的锚点基点取钉位换算回的等效世界坐标（连线跟随钉卡视觉位置） */
  function portAnchor(card: BoardCard, side: 'in' | 'out', portId?: string): { x: number; y: number } {
    const base = isPinned(card) ? pinEffectiveWorld(card) : { x: card.x, y: card.y }
    const el = cardEls.get(card.id)
    if (el) {
      const portEl =
        (portId ? el.querySelector<HTMLElement>(`[data-port="${portId}"]`) : null) ??
        el.querySelector<HTMLElement>(`[data-port-side="${side}"]`)
      if (portEl) {
        const dot = portEl.querySelector<HTMLElement>('i') ?? portEl
        const p = offsetWithin(dot, el)
        return { x: base.x + p.x + dot.offsetWidth / 2, y: base.y + p.y + dot.offsetHeight / 2 }
      }
      return { x: base.x + (side === 'out' ? el.offsetWidth : 0), y: base.y + el.offsetHeight / 2 }
    }
    return { x: base.x + (side === 'out' ? card.w : 0), y: base.y + card.h / 2 }
  }

  // ---------- DOM 装配 ----------
  root.classList.add('sr-board')
  root.classList.toggle('sr-board-dark', opts.dark)
  const gridEl = div('sr-board-grid')
  const worldEl = div('sr-board-world')
  const marqueeEl = div('sr-board-marquee')
  // 🔴 改动 2026-10-13 · 吸附对齐辅助线层（Figma 风格）：根层屏幕坐标，随拖动实时重画，不吃指针事件
  const guideLayer = div('sr-snap-guides')
  // 🔴 改动 2026-10-11 · 移除画板底部提示文字（双击空白新建笔记 · …）：用户要求画布保持干净
  const menuEl = buildAddMenu()
  const connectHintEl = div('sr-board-connect-hint')
  connectHintEl.textContent = '连线模式：依次点击两张卡片建立连线（Esc 取消）；也可直接按住卡片的输出端口拖向目标'
  root.append(gridEl, worldEl, marqueeEl, guideLayer, connectHintEl)
  // 🔴 改动 2026-10-10 · 画板自带「添加」工具栏默认撤下（showAddMenu: true 可恢复）：笔记/待办/连线/画板入口在侧边栏「循环」浮窗
  if (opts.showAddMenu) root.appendChild(menuEl)
  const linesSvg = svgEl('svg', { class: 'sr-board-lines' })
  worldEl.appendChild(linesSvg)
  if (isSub) {
    const back = document.createElement('button')
    back.type = 'button'
    back.className = 'sr-board-back'
    back.textContent = '‹ 返回上级画板'
    back.addEventListener('click', () => opts.onClose?.())
    root.appendChild(back)
  }

  // ---------- 持久化（800ms 防抖；dispose 时 flush，子画板转交父级） ----------
  function scheduleSave() {
    if (disposed) return
    recordHistory()
    // 🔴 改动 2026-10-11 · 拆分窗格同步：任何落盘前的变更先广播给共享同一文档的其他引擎实例
    opts.onDocChange?.(board)
    window.clearTimeout(saveTimer)
    saveTimer = window.setTimeout(() => persist(), 800)
  }
  function persist() {
    window.clearTimeout(saveTimer)
    saveTimer = 0
    if (disposed) return
    if (opts.onPersist) opts.onPersist(board)
    else saveBoard(board)
  }

  // ---------- 🔴 改动 2026-10-11 · 撤销/重做（复刻 Evoloop history：JSON 快照栈、上限 50、不含视口） ----------
  // 所有文档变更都过 scheduleSave → recordHistory；500ms 内的连续变更合并为一步（打字连击不炸栈）。
  // 视口（平移/缩放）不进历史，与原版一致。
  const HISTORY_LIMIT = 50
  const HISTORY_COALESCE_MS = 500
  const undoSteps: string[] = []
  const redoSteps: string[] = []
  let historyRestoring = false
  let lastPushAt = 0
  /** 当前已入栈基线（始终等于最后一次记录时的文档快照） */
  let historyCurrent = ''
  function historySnapshot(): string {
    return JSON.stringify({ title: board.title, cards: board.cards, lines: board.lines })
  }
  function resetHistory() {
    undoSteps.length = 0
    redoSteps.length = 0
    historyCurrent = historySnapshot()
    lastPushAt = 0
  }
  function recordHistory() {
    if (historyRestoring || disposed) return
    const next = historySnapshot()
    if (next === historyCurrent) return
    const now = Date.now()
    if (historyCurrent !== '' && now - lastPushAt > HISTORY_COALESCE_MS) {
      undoSteps.push(historyCurrent)
      if (undoSteps.length > HISTORY_LIMIT) undoSteps.shift()
      redoSteps.length = 0
      lastPushAt = now
    }
    historyCurrent = next
  }
  /** 用快照覆盖文档内容（保持 board 对象引用：拆分视图/子画板共享同一引用）；视口不动 */
  function applySnapshot(snap: string) {
    const value = JSON.parse(snap) as Pick<BoardDoc, 'title' | 'cards' | 'lines'>
    board.title = value.title
    board.cards = value.cards
    board.lines = value.lines
    // 🔴 改动 2026-10-12 · 撤销/重做后级联清理：卖出连线消失时收益节点及其直连连线一并删除
    pruneRevenue()
    blurEditing()
    clearSelection()
    for (const el of cardEls.values()) el.remove()
    cardEls.clear()
    for (const card of board.cards) renderCard(card)
    renderLines()
    applyViewport()
  }
  function restoreHistory(redo: boolean) {
    if (disposed || childClose || historyRestoring) return
    const source = redo ? redoSteps : undoSteps
    const target = redo ? undoSteps : redoSteps
    if (!source.length) return
    target.push(historySnapshot())
    if (target.length > HISTORY_LIMIT) target.shift()
    const snap = source.pop()!
    historyRestoring = true
    applySnapshot(snap)
    historyCurrent = snap
    lastPushAt = 0
    historyRestoring = false
    scheduleSave()
  }
  resetHistory()

  // ---------- 视口变换（复刻 Evoloop applyViewport：世界 transform + 网格背景联动） ----------
  function applyViewport() {
    worldEl.style.transform = `translate(${view.x}px,${view.y}px) scale(${view.zoom})`
    // n8n 风格 16 单位网格，任意缩放下锚定世界原点
    const gap = 16 * view.zoom
    const radius = 0.5 * view.zoom
    gridEl.style.backgroundSize = `${gap}px ${gap}px`
    gridEl.style.backgroundPosition = `${view.x - gap / 2 - 8}px ${view.y - gap / 2}px`
    gridEl.style.setProperty('--bd-dot-radius', `${radius}px`)
    gridEl.style.setProperty('--bd-dot-edge', `${radius + 0.15}px`)
    // 🔴 改动 2026-10-13 · 屏幕钉：视口每次应用后重刷钉卡的 counter-transform（钉位不随画布移动）
    applyPins()
    // 🔴 改动 2026-10-13 · 视口广播全量化（顶栏 View 百分比取 zoom；页面层放置物取 x/y/zoom 换算定位）
    opts.onViewChange?.({ ...view })
    // 🔴 改动 2026-10-16 · 视口（平移/缩放）持久化：view 即文档视口引用（非 localViewport 实例），
    // 这里只排轻量防抖直写（不走 scheduleSave，避免 recordHistory 每帧污染撤销栈）
    if (!opts.localViewport) {
      window.clearTimeout(viewSaveTimer)
      viewSaveTimer = window.setTimeout(() => {
        viewSaveTimer = 0
        if (disposed) return
        if (opts.onPersist) opts.onPersist(board)
        else saveBoard(board)
      }, 600)
    }
  }
  /** 屏幕坐标（clientX/Y）→ 画板世界坐标（逻辑像素） */
  function screenToWorld(sx: number, sy: number) {
    const rect = root.getBoundingClientRect()
    return {
      x: (sx - rect.left - view.x) / view.zoom,
      y: (sy - rect.top - view.y) / view.zoom,
    }
  }

  // ---------- 🔴 改动 2026-10-13 · 屏幕钉（右键卡片「屏幕钉」切换；钉住的卡片不随画布平移/缩放） ----------
  // 实现：卡片 DOM 仍在世界层内，钉卡每次视口应用时写 counter-transform（平移抵消 + 缩放冻结），
  // 视觉固定在钉位 pinX/pinY（相对引擎根的屏幕 CSS 像素）；连线锚点经 pinEffectiveWorld 换算回世界坐标。
  /** 是否处于钉住状态（meta.pinned 且钉位坐标齐全） */
  function isPinned(card: BoardCard): boolean {
    return card.meta.pinned === true && typeof card.meta.pinX === 'number' && typeof card.meta.pinY === 'number'
  }
  /** 钉卡当前视觉位置换算回的世界坐标（连线锚点等需要「它在世界里的等效位置」的场景用） */
  function pinEffectiveWorld(card: BoardCard): { x: number; y: number } {
    return { x: ((card.meta.pinX ?? 0) - view.x) / view.zoom, y: ((card.meta.pinY ?? 0) - view.y) / view.zoom }
  }
  /** 钉卡的 counter-transform：抵消世界 transform（钉位固定），并冻结钉住时刻的视觉尺寸 */
  function applyPinTransform(card: BoardCard) {
    const el = cardEls.get(card.id)
    if (!el) return
    if (!isPinned(card)) {
      if (el.style.transform) el.style.transform = ''
      return
    }
    const pz = card.meta.pinZoom ?? view.zoom
    const eff = pinEffectiveWorld(card)
    el.style.transformOrigin = '0 0'
    el.style.transform = `translate(${eff.x - card.x}px, ${eff.y - card.y}px) scale(${pz / view.zoom})`
  }
  /** 视口应用后刷新所有钉卡；钉卡连有连线时同步重算连线（锚点随钉位换算，跟随钉卡视觉位置） */
  function applyPins() {
    let hasPins = false
    for (const card of board.cards) {
      if (!isPinned(card)) continue
      hasPins = true
      applyPinTransform(card)
    }
    if (!hasPins) return
    const pinnedIds = new Set(board.cards.filter(isPinned).map((c) => c.id))
    if (board.lines.some((l) => pinnedIds.has(l.from) || pinnedIds.has(l.to))) renderLines()
  }
  /** 切换卡片的屏幕钉状态：钉住 = 冻结在当前屏幕位置与视觉尺寸；取消 = 回到世界坐标系（保持当前视觉位置） */
  function togglePin(card: BoardCard) {
    const el = cardEls.get(card.id)
    if (isPinned(card)) {
      // 取消钉：把当前视觉位置换算回世界坐标，卡片原地回到世界系（不跳位）
      const eff = pinEffectiveWorld(card)
      card.x = eff.x
      card.y = eff.y
      card.meta.pinned = false
      delete card.meta.pinX
      delete card.meta.pinY
      delete card.meta.pinZoom
      if (el) {
        el.style.left = `${card.x}px`
        el.style.top = `${card.y}px`
        el.style.transform = ''
      }
    } else {
      // 钉住：记录当前视觉位置（世界坐标 → 相对引擎根的屏幕像素）与当前缩放
      if (!el) return
      card.meta.pinX = view.x + card.x * view.zoom
      card.meta.pinY = view.y + card.y * view.zoom
      card.meta.pinZoom = view.zoom
      card.meta.pinned = true
      applyPinTransform(card)
    }
    renderLines()
    scheduleSave()
  }

  // ---------- 选择（复刻 applySelection / select / clearSelection / deleteSelected） ----------
  function applySelection(ids: Set<string>) {
    for (const id of selectedIds) {
      if (!ids.has(id)) cardEls.get(id)?.classList.remove('sr-selected')
    }
    for (const id of ids) {
      cardEls.get(id)?.classList.add('sr-selected')
    }
    selectedIds = ids
  }
  function select(id: string | null) {
    blurEditing()
    applySelection(id ? new Set([id]) : new Set())
  }
  function selectMany(ids: Set<string>) {
    blurEditing()
    applySelection(ids)
  }
  function clearSelection() {
    select(null)
  }
  function deleteSelected() {
    if (!selectedIds.size) return
    const ids = new Set(selectedIds)
    for (const id of ids) {
      const idx = board.cards.findIndex((c) => c.id === id)
      if (idx >= 0) board.cards.splice(idx, 1)
      cardEls.get(id)?.remove()
      cardEls.delete(id)
      editHooks.delete(id)
      postFitHooks.delete(id)
      countRefreshHooks.delete(id)
    }
    applySelection(new Set())
    // 级联删除指向已删卡片的连线
    board.lines = board.lines.filter((l) => !ids.has(l.from) && !ids.has(l.to))
    // 🔴 改动 2026-10-12 · 卖出连线的两端卡片被删时，收益节点一并清理
    pruneRevenue()
    renderLines()
    scheduleSave()
  }

  // ---------- 🔴 改动 2026-10-14 · Ctrl+A 全选 + 复制/剪切/粘贴/删除（画板内剪贴板） ----------
  /** 全选：画板中所有卡片（不含自动派生的收益节点？——收益节点属派生内容，仍纳入全选便于整体删除） */
  function selectAll() {
    blurEditing()
    applySelection(new Set(board.cards.map((c) => c.id)))
  }
  /** 深拷贝一张卡片（meta.sub 递归克隆；卡片数据均为 JSON 安全） */
  function cloneCard(card: BoardCard): BoardCard {
    return JSON.parse(JSON.stringify(card)) as BoardCard
  }
  /** 收集可复制内容：选中的非收益卡 + 两端都在选中集内的连线（收益节点为自动派生，不参与复制） */
  function collectCopyable(): { cards: BoardCard[]; lines: BoardLine[] } {
    const cards = board.cards.filter((c) => selectedIds.has(c.id) && c.type !== 'revenue')
    const ids = new Set(cards.map((c) => c.id))
    const lines = board.lines.filter((l) => ids.has(l.from) && ids.has(l.to))
    return { cards, lines }
  }
  /** 复制：选中内容深拷贝进内部剪贴板（不落盘，不改文档） */
  function copySelected() {
    const { cards, lines } = collectCopyable()
    if (!cards.length) return
    clipboard = { cards: cards.map(cloneCard), lines: lines.map((l) => ({ ...l })) }
  }
  /** 剪切：先复制再删除选中（收益节点不复制但随删除清理） */
  function cutSelected() {
    copySelected()
    deleteSelected()
  }
  /** 粘贴：把剪贴板内容以新 id 复制进画板，连线经 id 映射重连；未给坐标时按原包围盒左上 +24 偏移 */
  function pasteClipboard(worldX?: number, worldY?: number) {
    if (!clipboard || !clipboard.cards.length) return
    const cardIdMap = new Map<string, string>()
    const newCards = clipboard.cards.map((src) => {
      const nid = uid()
      cardIdMap.set(src.id, nid)
      const card = cloneCard(src)
      card.id = nid
      return card
    })
    const newLines = clipboard.lines.map((l) => ({
      ...l,
      id: uid(),
      from: cardIdMap.get(l.from) ?? l.from,
      to: cardIdMap.get(l.to) ?? l.to,
    }))
    // 落点：指定世界坐标（右键粘贴）或剪贴板原包围盒左上 + 24 的级联偏移
    const minX = Math.min(...newCards.map((c) => c.x))
    const minY = Math.min(...newCards.map((c) => c.y))
    const ox = (worldX ?? minX + 24) - minX
    const oy = (worldY ?? minY + 24) - minY
    for (const c of newCards) {
      c.x += ox
      c.y += oy
    }
    board.cards.push(...newCards)
    board.lines.push(...newLines)
    for (const c of newCards) renderCard(c)
    selectMany(new Set(newCards.map((c) => c.id)))
    renderLines()
    scheduleSave()
  }

  // ---------- 编辑生命周期（复刻 startEdit / stopEdit / blurEditing / enterCardEdit） ----------
  function blurEditing() {
    const active = document.activeElement
    if (active instanceof HTMLElement && root.contains(active)) active.blur()
    if (editingId) {
      cardEls.get(editingId)?.classList.remove('sr-editing')
      editingId = null
    }
  }
  function stopEdit(card: BoardCard) {
    if (editingId !== card.id) return
    editingId = null
    cardEls.get(card.id)?.classList.remove('sr-editing')
  }
  function enterCardEdit(node: HTMLElement, card: BoardCard, e?: MouseEvent) {
    blurEditing()
    applySelection(new Set([card.id]))
    editingId = card.id
    node.classList.add('sr-editing')
    editHooks.get(card.id)?.(e)
  }

  // ---------- 连线（🔴 改动 2026-10-12 · 参照工坊资产节点示例重写：
  //    端口锚定的贝塞尔曲线，无箭头（工坊 asset-wire 同款）；端口圆点实测定位，拖动/换形态自动跟随；双击删除） ----------
  /** 🔴 改动 2026-10-13 · 收益链路状态机（参照工坊收益循环/收益线程语义）：
   *  出现收益节点（卖出连线成立）→ 链路相关连线全部静态金 + 金色虚线框 =「已形成收益，具备激活条件」（运行技能）；
   *  收益节点连线到产生收益之前资产（链路内节点）的买入端口 → 判定形成循环，外框转实线（运转技能）；
   *  「运行」/「运转」技能在框内释放 → 激活为「收益线程」/「收益循环」：连线叠加 UE5 执行流脉冲 + 徽标 */
  type WireState = 'gold' | 'thread'
  /** 🔴 改动 2026-10-13 · 收益链路分组（金色连线状态机、链路外框与技能命中判定共用）：
   *  cone = 卖方及其全部上游 + 买方 + 收益节点；loop = 收益节点回流到链路内资产的买入端口（形成循环）；
   *  activated = 已激活（收益线程 / 收益循环）；rect = 框住链路全部相关节点的外框；
   *  depths = 链路内各连线的拓扑深度（执行流脉冲错峰用） */
  interface ChainGroup {
    revenue: BoardCard
    cone: Set<string>
    loop: boolean
    activated: boolean
    rect: { x: number; y: number; w: number; h: number }
    depths: Map<string, number>
  }
  const FRAME_PAD = 28
  /** 🔴 改动 2026-10-13 · 买入/资金输入端口判定：节点形态统一为 'buy'；food 节点形态与 food/market 卡片形态沿用 'in' */
  function isBuyPort(card: BoardCard | undefined, portId: string | undefined): boolean {
    if (!card || !portId) return false
    if (portId === 'buy') return true
    return portId === 'in' && (card.type === 'food' || card.type === 'market')
  }
  function computeChains(): ChainGroup[] {
    const forward = new Map<string, string[]>()
    const reverse = new Map<string, string[]>()
    for (const l of board.lines) {
      forward.set(l.from, [...(forward.get(l.from) ?? []), l.to])
      reverse.set(l.to, [...(reverse.get(l.to) ?? []), l.from])
    }
    const reach = (start: string, adj: Map<string, string[]>): Set<string> => {
      const seen = new Set<string>([start])
      const stack = [start]
      while (stack.length) {
        const cur = stack.pop()!
        for (const n of adj.get(cur) ?? []) {
          if (!seen.has(n)) {
            seen.add(n)
            stack.push(n)
          }
        }
      }
      return seen
    }
    const chains: ChainGroup[] = []
    for (const r of board.cards) {
      if (r.type !== 'revenue' || !r.meta.sale) continue
      const sale = board.lines.find((l) => l.id === r.meta.sale)
      if (!sale) continue
      // 相关节点 = 卖方及其全部上游（供应链路）+ 买方 + 收益节点自身
      const cone = reach(sale.from, reverse)
      cone.add(sale.to)
      cone.add(r.id)
      // 🔴 改动 2026-10-13 · 循环判定：收益节点连线到「产生收益之前」链路内资产的买入端口
      const loop = board.lines.some((l) => {
        if (l.from !== r.id || l.to === r.id || !cone.has(l.to)) return false
        return isBuyPort(board.cards.find((c) => c.id === l.to), l.toPort)
      })
      const members = board.cards.filter((c) => cone.has(c.id))
      const fx = Math.min(...members.map((c) => c.x)) - FRAME_PAD
      const fy = Math.min(...members.map((c) => c.y)) - FRAME_PAD
      const fw = Math.max(...members.map((c) => c.x + c.w)) - fx + FRAME_PAD
      const fh = Math.max(...members.map((c) => c.y + c.h)) - fy + FRAME_PAD
      // 🔴 改动 2026-10-13 · 执行流脉冲的拓扑深度：正向线（链路内、非收益节点出发）自源头 BFS，
      //  收益节点的回流线排在最末（波前抵达最终节点后回流）
      const depths = new Map<string, number>()
      const forwardLines = board.lines.filter((l) => cone.has(l.from) && cone.has(l.to) && l.from !== r.id)
      const indeg = new Map<string, number>()
      const fwdAdj = new Map<string, { to: string; id: string }[]>()
      for (const l of forwardLines) {
        indeg.set(l.to, (indeg.get(l.to) ?? 0) + 1)
        fwdAdj.set(l.from, [...(fwdAdj.get(l.from) ?? []), { to: l.to, id: l.id }])
      }
      const nodeDepth = new Map<string, number>()
      const queue = [...cone].filter((id) => !(indeg.get(id) ?? 0))
      for (const id of queue) nodeDepth.set(id, 0)
      let maxDepth = 0
      while (queue.length) {
        const cur = queue.shift()!
        for (const { to, id } of fwdAdj.get(cur) ?? []) {
          const d = (nodeDepth.get(cur) ?? 0)
          depths.set(id, d)
          maxDepth = Math.max(maxDepth, d)
          if (nodeDepth.has(to)) continue
          nodeDepth.set(to, d + 1)
          queue.push(to)
        }
      }
      for (const l of board.lines) {
        if (l.from === r.id && cone.has(l.to)) depths.set(l.id, maxDepth + 1)
      }
      chains.push({ revenue: r, cone, loop, activated: r.meta.activated === true, rect: { x: fx, y: fy, w: fw, h: fh }, depths })
    }
    return chains
  }
  function computeWireStates(chains: ChainGroup[]): Map<string, WireState> {
    const states = new Map<string, WireState>()
    for (const ch of chains) {
      for (const l of board.lines) {
        const related = ch.cone.has(l.from) && ch.cone.has(l.to)
        // 收益节点回流进链路的连线同样计入链路
        const feedback = l.from === ch.revenue.id && ch.cone.has(l.to)
        if (!related && !feedback) continue
        if (ch.activated) states.set(l.id, 'thread')
        else if (states.get(l.id) !== 'thread') states.set(l.id, 'gold')
      }
    }
    return states
  }
  /** 🔴 改动 2026-10-13 · UE5 执行流脉冲固定世界尺寸（脉冲不随连线长度缩放；实测长度反推 dash 占比） */
  const THREAD_PULSE_CORE = 26
  const THREAD_PULSE_HALO = 40
  /** 给连线组附加收益线程脉冲（光晕 + 亮核），按拓扑深度错峰（执行波前自源头流向最终节点） */
  function attachThreadPulse(g: SVGGElement, d: string, depth: number) {
    const halo = svgEl('path', { d, class: 'sr-board-thread-halo', pathLength: 100 })
    const pulse = svgEl('path', { d, class: 'sr-board-thread-pulse', pathLength: 100 })
    g.appendChild(halo)
    g.appendChild(pulse)
    // getTotalLength 需要元素已挂入文档（Chromium 对游离 SVG 元素返回 0）；挂载后实测长度反推 dash 占比
    const size = (el: SVGPathElement, units: number) => {
      const len = el.getTotalLength()
      if (len > 0) {
        const pct = (units / len) * 100
        el.setAttribute('stroke-dasharray', `${pct.toFixed(2)} ${Math.max(0, 100 - pct).toFixed(2)}`)
      } else {
        el.setAttribute('stroke-dasharray', '20 80')
      }
      el.style.animationDelay = `${depth * 0.3}s`
    }
    size(halo, THREAD_PULSE_HALO)
    size(pulse, THREAD_PULSE_CORE)
  }
  function renderLines() {
    linesSvg.replaceChildren()
    const chains = computeChains()
    const wireStates = computeWireStates(chains)
    // 🔴 改动 2026-10-13 · 收益链路外框（先画框垫底，再画连线）：框住链路全部相关节点（含收益节点）。
    //  已形成收益（未循环、未激活）= 金色虚线框（运行技能激活条件）；
    //  收益节点回流到链路内资产买入端口 = 形成循环 → 外框转金色实线框（运转技能激活条件）；
    //  技能选中时对应类型外框高亮呼吸（is-castable）；
    //  🔴 改动 2026-10-13 · 已激活（收益线程 / 收益循环）= 框线删除，只保留连线的脉冲动效
    //  （框线随激活被移除：激活的链路会作为子画板独立出去，画板内不再画外框与徽标）。
    for (const ch of chains) {
      if (ch.activated) continue
      const { x: fx, y: fy, w: fw, h: fh } = ch.rect
      const frameCls = ch.loop ? 'sr-board-frame-loop' : 'sr-board-frame-gold'
      const castable = (armedSkill === 'play' && !ch.loop) || (armedSkill === 'operate' && ch.loop)
      const cls = `sr-board-frame ${frameCls}${castable ? ' is-castable' : ''}`
      linesSvg.appendChild(svgEl('rect', { class: cls, x: fx, y: fy, width: fw, height: fh, rx: 18 }))
    }
    // 🔴 改动 2026-10-12 · 直角布线的障碍盒（所有卡片外扩 18，同工坊 AssetGraph 的 obstacles 构造）
    const obstacles = board.cards.map((c) => ({ left: c.x - 18, right: c.x + c.w + 18, top: c.y - 18, bottom: c.y + c.h + 18 }))
    for (const line of board.lines) {
      const a = board.cards.find((c) => c.id === line.from)
      const b = board.cards.find((c) => c.id === line.to)
      if (!a || !b) continue
      // 两端锚在输出/输入端口上（无端口卡退化为右缘/左缘中点），曲线公式同工坊 graph.ts curve()
      const pa = portAnchor(a, 'out', line.fromPort)
      const pb = portAnchor(b, 'in', line.toPort)
      // 🔴 改动 2026-10-12 · 与收益节点直连的连线改用自动直角布线（圆角正交 + 障碍避让，
      // 移植工坊数字资产节点示例）；其余连线保持贝塞尔曲线
      const d = a.type === 'revenue' || b.type === 'revenue'
        ? roundedPath(routeWire(pa, pb, obstacles, 'horizontal'))
        : wirePath(pa, pb)
      const state = wireStates.get(line.id)
      const g = svgEl('g', { class: `sr-board-wire${state ? ` sr-wire-${state}` : ''}` })
      if (state) {
        // 收益链路金色：渐变描边（userSpaceOnUse 沿路径走向）+ 光晕；收益线程再加执行流脉冲
        const gid = `srwg-${svgSeq}-${line.id}`
        const defs = svgEl('defs', {})
        const grad = svgEl('linearGradient', {
          id: gid,
          gradientUnits: 'userSpaceOnUse',
          x1: pa.x,
          y1: pa.y,
          x2: pb.x + 0.001,
          y2: pb.y + 0.001,
        })
        // stop-color 经 style 写入以支持 CSS 变量（presentation attribute 不支持 var()）
        for (const [offset, color] of [
          ['0%', 'var(--bd-gold-mid)'],
          ['32%', 'var(--bd-gold-light)'],
          ['65%', 'var(--bd-gold-deep)'],
          ['100%', 'var(--bd-gold-mid)'],
        ] as const) {
          grad.appendChild(svgEl('stop', { offset, style: `stop-color:${color}` }))
        }
        defs.appendChild(grad)
        g.appendChild(defs)
        g.appendChild(svgEl('path', { d, class: 'sr-board-wire-aura' }))
        g.appendChild(svgEl('path', { d, class: 'sr-board-line sr-board-wire-gold', style: `stroke:url(#${gid})` }))
      } else {
        g.appendChild(svgEl('path', { d, class: 'sr-board-line' }))
      }
      // 加宽的透明命中层：2px 曲线难以点中，双击删除落在它上面（复刻工坊 asset-wire-hit 的思路）
      const hit = svgEl('path', { d, class: 'sr-board-wire-hit' })
      hit.addEventListener('dblclick', (e) => {
        e.stopPropagation()
        board.lines = board.lines.filter((x) => x.id !== line.id)
        // 🔴 改动 2026-10-12 · 移除卖出连线时连同其收益分支一起移除
        pruneRevenueForSale(line.id)
        renderLines()
        scheduleSave()
      })
      g.appendChild(hit)
      // 先挂入文档再附加脉冲（实测长度需要布局环境）
      linesSvg.appendChild(g)
      if (state === 'thread') {
        const chain = chains.find((c) => wireStates.get(line.id) === 'thread' && (c.cone.has(line.from) || line.from === c.revenue.id))
        attachThreadPulse(g, d, chain?.depths.get(line.id) ?? 0)
      }
    }
    // 🔴 改动 2026-10-12 · 收益分支（金色）：卖出连线中点 → 收益节点顶边中点，随两端位置动态重算
    for (const r of board.cards) {
      if (r.type !== 'revenue' || !r.meta.sale) continue
      const sale = board.lines.find((l) => l.id === r.meta.sale)
      if (!sale) continue
      const a = board.cards.find((c) => c.id === sale.from)
      const b = board.cards.find((c) => c.id === sale.to)
      if (!a || !b) continue
      const pa = portAnchor(a, 'out', sale.fromPort)
      const pb = portAnchor(b, 'in', sale.toPort)
      const mid = { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 }
      const end = { x: r.x + r.w / 2, y: r.y }
      const g = svgEl('g', { class: 'sr-board-revenue' })
      // 🔴 改动 2026-10-12 · 收益分支改直角布线（工坊原版：从上方进入收益节点顶边，圆角 + 障碍避让）
      const d = roundedPath(routeWire(mid, end, obstacles, 'vertical'))
      g.appendChild(svgEl('path', { d, class: 'sr-board-revenue-aura' }))
      g.appendChild(svgEl('path', { d, class: 'sr-board-revenue-wire' }))
      g.appendChild(svgEl('circle', { class: 'sr-board-revenue-junction', cx: mid.x, cy: mid.y, r: 3.5 }))
      linesSvg.appendChild(g)
      // 🔴 改动 2026-10-13 · 收益线程：分支同样叠加执行流脉冲（深度 = 卖出连线深度 + 1）
      if (r.meta.activated === true) {
        const chain = chains.find((c) => c.revenue.id === r.id)
        attachThreadPulse(g, d, (chain?.depths.get(sale.id) ?? 0) + 1)
      }
    }
  }

  // ---------- 🔴 改动 2026-10-12 · 收益分支（参考工坊 graph.ts 卖出→收益） ----------
  /** 卖出连线成立后：在连线中点下方自动生成金色收益节点（分支线在 renderLines 里随中点动态绘制） */
  function spawnRevenue(line: BoardLine) {
    const source = board.cards.find((c) => c.id === line.from)
    if (!source) return
    const a = portAnchor(source, 'out', line.fromPort)
    const target = board.cards.find((c) => c.id === line.to)
    const b = target ? portAnchor(target, 'in', line.toPort) : { x: a.x + 240, y: a.y }
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
    const card: BoardCard = {
      id: uid(),
      type: 'revenue',
      x: Math.round(mid.x - REVENUE_SIZE.w / 2),
      y: Math.round(mid.y + 120),
      w: REVENUE_SIZE.w,
      h: REVENUE_SIZE.h,
      text: '',
      meta: { sale: line.id, title: `${assetCardName(source)} · 收益` },
    }
    board.cards.push(card)
    renderCard(card)
  }
  /** 清理失效收益节点：其卖出连线（或连线两端卡片）已不存在时，删除该节点及其相连线 */
  function pruneRevenue() {
    const stale = new Set<string>()
    for (const c of board.cards) {
      if (c.type !== 'revenue' || !c.meta.sale) continue
      const sale = board.lines.find((l) => l.id === c.meta.sale)
      const a = sale ? board.cards.find((x) => x.id === sale.from) : null
      const b = sale ? board.cards.find((x) => x.id === sale.to) : null
      if (!sale || !a || !b) stale.add(c.id)
    }
    if (!stale.size) return
    board.cards = board.cards.filter((c) => !stale.has(c.id))
    board.lines = board.lines.filter((l) => !stale.has(l.from) && !stale.has(l.to))
    for (const id of stale) {
      cardEls.get(id)?.remove()
      cardEls.delete(id)
      editHooks.delete(id)
      postFitHooks.delete(id)
    }
  }
  /** 移除指定卖出连线对应的全部收益节点（含其相连线） */
  function pruneRevenueForSale(saleId: string) {
    const stale = new Set(board.cards.filter((c) => c.type === 'revenue' && c.meta.sale === saleId).map((c) => c.id))
    if (!stale.size) return
    board.cards = board.cards.filter((c) => !stale.has(c.id))
    board.lines = board.lines.filter((l) => !stale.has(l.from) && !stale.has(l.to))
    for (const id of stale) {
      cardEls.get(id)?.remove()
      cardEls.delete(id)
      editHooks.delete(id)
      postFitHooks.delete(id)
    }
  }
  /** 连线模式：依次点击两张卡片建立连线（复刻 enterConnectMode / handleConnect） */
  function enterConnectMode() {
    blurEditing()
    clearSelection()
    connectMode = true
    connectFrom = null
    root.classList.add('sr-connecting')
  }
  function exitConnectMode() {
    connectMode = false
    connectFrom = null
    root.classList.remove('sr-connecting')
  }
  function handleConnect(cardId: string) {
    if (!connectFrom) {
      connectFrom = cardId
      applySelection(new Set([cardId]))
      return
    }
    if (connectFrom === cardId) {
      connectFrom = null
      return
    }
    board.lines.push({ id: uid(), from: connectFrom, to: cardId })
    connectFrom = null
    exitConnectMode()
    clearSelection()
    renderLines()
    scheduleSave()
  }

  // ---------- 🔴 改动 2026-10-12 · 端口拖拽连线（参照工坊资产节点示例 AssetGraph）：
  //    按住输出端口拖出「待定连线」跟随光标，落到目标卡输入端口（或卡身）即建立连线；
  //    Esc / 落空 / pointercancel 取消。与点击两卡的连线模式并存，互不干扰。 ----------
  let wireDrag: { from: string; port?: string; path: SVGPathElement; cleanup: () => void } | null = null
  function cancelWireDrag() {
    if (!wireDrag) return
    wireDrag.cleanup()
    wireDrag.path.remove()
    wireDrag = null
  }
  function startWireDrag(card: BoardCard, portId: string | undefined) {
    cancelWireDrag()
    blurEditing()
    clearSelection()
    const a = portAnchor(card, 'out', portId)
    const path = svgEl('path', { class: 'sr-board-wire-pending', d: wirePath(a, a) })
    linesSvg.appendChild(path)
    const onMove = (ev: PointerEvent) => {
      path.setAttribute('d', wirePath(a, screenToWorld(ev.clientX, ev.clientY)))
    }
    const onUp = (ev: PointerEvent) => {
      const drag = wireDrag
      cancelWireDrag()
      if (!drag || disposed) return
      // 落点判定（复刻工坊 AssetGraph 的 elementFromPoint 命中）：优先输入端口，其次卡身
      const t = document.elementFromPoint(ev.clientX, ev.clientY)
      if (!(t instanceof Element)) return
      const portEl = t.closest<HTMLElement>('[data-port-side="in"]')
      const cardEl = (portEl ?? t).closest<HTMLElement>('.sr-board-card')
      const targetId = cardEl?.dataset.id
      if (!targetId || targetId === drag.from) return // 落空 / 连向自身 = 取消
      const toPort = portEl?.dataset.port
      // 同一对端口不重复连线
      if (board.lines.some((l) => l.from === drag.from && l.to === targetId
        && (l.fromPort ?? '') === (drag.port ?? '') && (l.toPort ?? '') === (toPort ?? ''))) return
      board.lines.push({ id: uid(), from: drag.from, to: targetId, fromPort: drag.port, toPort })
      // 🔴 改动 2026-10-12 · 资产卖出连线成立 → 在连线中点自动生成金色分支连线 + 收益节点
      if (drag.port === 'sell') spawnRevenue(board.lines[board.lines.length - 1])
      renderLines()
      scheduleSave()
    }
    const onCancel = () => cancelWireDrag()
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    document.addEventListener('pointercancel', onCancel)
    wireDrag = {
      from: card.id,
      port: portId,
      path,
      cleanup: () => {
        document.removeEventListener('pointermove', onMove)
        document.removeEventListener('pointerup', onUp)
        document.removeEventListener('pointercancel', onCancel)
      },
    }
  }

  // ---------- Note 卡（复刻 cards-basic.js buildNote：双击编辑、失焦保存、高度随内容） ----------
  function fitNote(node: HTMLElement, card: BoardCard, ta: HTMLTextAreaElement) {
    const min = cardMin('note')
    // 宽度保持卡片当前值（min 兜底），不随内容变宽——与 Evoloop 2026-09-25 后的行为一致
    const w = Math.max(min.w, card.w || min.w)
    node.style.width = `${w}px`
    card.w = w
    const prevH = ta.style.height
    ta.style.height = '0px'
    const sh = ta.scrollHeight || 0
    ta.style.height = prevH
    // scrollHeight 已含 textarea 自身垂直 padding；未挂载（首次渲染）时量不出，
    // 保留 buildCard 写入的持久化高度，挂载后经 postFitHooks 再补一次
    if (sh > 0) {
      const h = Math.max(min.h, sh)
      node.style.height = `${h}px`
      card.h = h
    }
  }
  function buildNote(node: HTMLElement, card: BoardCard) {
    const wrap = div('sr-note')
    const ta = document.createElement('textarea')
    ta.className = 'sr-note-ta'
    ta.placeholder = '写点什么…'
    ta.value = card.text || ''
    wrap.appendChild(ta)
    node.appendChild(wrap)
    const fit = () => fitNote(node, card, ta)
    ta.addEventListener('input', () => {
      card.text = ta.value
      fit()
      scheduleSave()
    })
    ta.addEventListener('blur', () => stopEdit(card))
    editHooks.set(card.id, () => {
      ta.focus()
      ta.select()
    })
    postFitHooks.set(card.id, fit)
    fit()
  }

  // ---------- To-do 卡（复刻 todo.js buildTodo 核心：标题/复选框清单/计数/回车流转；
  //    取舍：不做进程条、URL 镜像、行拖拽排序与子层级） ----------
  function buildTodo(node: HTMLElement, card: BoardCard) {
    const meta = card.meta
    if (typeof meta.title !== 'string') meta.title = ''
    if (!Array.isArray(meta.items)) meta.items = [{ text: '', done: false }]
    const items = meta.items

    const wrap = div('sr-todo')
    const head = div('sr-todo-head')
    const title = document.createElement('textarea')
    title.className = 'sr-todo-title'
    title.placeholder = 'To-do list'
    title.rows = 1
    title.value = meta.title
    const count = span('sr-todo-count')
    head.append(title, count)
    const list = div('sr-todo-list')
    wrap.append(head, list)
    node.appendChild(wrap)

    function renderCount() {
      const done = items.filter((it) => it.done).length
      count.textContent = items.length ? `${done}/${items.length}` : ''
    }
    /** 高度随内容自适应（chrome 常量与 board.css 的 .sr-todo 垂直节奏同步：6 + 21 + 21） */
    function grow() {
      title.style.height = 'auto'
      title.style.height = `${title.scrollHeight}px`
      const min = cardMin('todo')
      card.w = Math.max(min.w, card.w || min.w)
      node.style.width = `${card.w}px`
      if (!node.isConnected) return // 未挂载时量不出行高，保留持久化高度，挂载后 postFit 补量
      let h = 6 + 21 + head.offsetHeight + 21
      const rows = Array.from(list.children) as HTMLElement[]
      for (const row of rows) {
        const ta = row.querySelector('textarea')
        if (ta) {
          ta.style.height = 'auto'
          ta.style.height = `${ta.scrollHeight}px`
        }
        h += row.offsetHeight
      }
      h += Math.max(0, rows.length - 1) * 8
      card.h = Math.max(min.h, h)
      node.style.height = `${card.h}px`
      renderLines()
    }
    function focusItem(index: number) {
      const row = list.children[index] as HTMLElement | undefined
      row?.querySelector('textarea')?.focus()
    }
    function buildRow(item: TodoItem): HTMLElement {
      const row = div('sr-todo-row')
      row.classList.toggle('sr-done', item.done)
      // 复选框（sr-view-action：视图态也可直接点击，不经卡片编辑）
      const check = document.createElement('button')
      check.type = 'button'
      check.className = 'sr-todo-check sr-view-action'
      check.setAttribute('aria-checked', String(item.done))
      check.setAttribute('aria-label', '勾选待办')
      check.appendChild(span('sr-todo-dot'))
      check.addEventListener('click', (e) => {
        e.stopPropagation()
        item.done = !item.done
        check.setAttribute('aria-checked', String(item.done))
        row.classList.toggle('sr-done', item.done)
        renderCount()
        scheduleSave()
      })
      // 条目标题
      const ta = document.createElement('textarea')
      ta.className = 'sr-todo-text'
      ta.rows = 1
      ta.placeholder = '待办事项'
      ta.value = item.text
      ta.addEventListener('input', () => {
        item.text = ta.value
        grow()
        scheduleSave()
      })
      ta.addEventListener('keydown', (e) => {
        e.stopPropagation() // 按键止于条目，绝不冒泡成画板级删除
        if (e.key === 'Enter' && !e.isComposing) {
          e.preventDefault()
          const at = items.indexOf(item)
          items.splice(at + 1, 0, { text: '', done: false })
          render()
          scheduleSave()
          focusItem(at + 1)
        } else if (e.key === 'Backspace' && !ta.value && items.length > 1) {
          e.preventDefault()
          const at = items.indexOf(item)
          items.splice(at, 1)
          render()
          scheduleSave()
          focusItem(Math.max(0, at - 1))
        } else if (e.key === 'Escape') {
          ta.blur()
        }
      })
      // 悬停显示的删除按钮（sr-view-action）
      const del = document.createElement('button')
      del.type = 'button'
      del.className = 'sr-todo-del sr-view-action'
      del.textContent = '×'
      del.setAttribute('aria-label', '删除待办')
      del.addEventListener('click', (e) => {
        e.stopPropagation()
        const at = items.indexOf(item)
        if (at >= 0) items.splice(at, 1)
        if (!items.length) items.push({ text: '', done: false })
        render()
        scheduleSave()
      })
      row.append(check, ta, del)
      return row
    }
    function render() {
      list.replaceChildren()
      for (const item of items) list.appendChild(buildRow(item))
      renderCount()
      grow()
    }
    title.addEventListener('input', () => {
      meta.title = title.value
      grow()
      scheduleSave()
    })
    title.addEventListener('keydown', (e) => {
      e.stopPropagation()
      if (e.key === 'Enter' && !e.isComposing) {
        e.preventDefault()
        if (!items.length) {
          items.push({ text: '', done: false })
          render()
          scheduleSave()
        }
        focusItem(0)
      } else if (e.key === 'Escape') {
        title.blur()
      }
    })
    title.addEventListener('blur', () => stopEdit(card))
    editHooks.set(card.id, () => title.focus())
    postFitHooks.set(card.id, grow)
    render()
  }

  // ---------- Board 卡（复刻 buildBoard：徽章 + 标题 + 计数；双击标题改名、双击徽章进入子画板） ----------
  const BOARD_BADGE_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
    '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>' +
    '<rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>'
  function buildBoardCard(node: HTMLElement, card: BoardCard) {
    const meta = card.meta
    if (!meta.title) meta.title = '子画板'
    if (!meta.sub) meta.sub = emptyBoard(meta.title)
    const wrap = div('sr-boardcard')
    const badge = div('sr-boardcard-badge')
    badge.innerHTML = BOARD_BADGE_SVG
    // 🔴 改动 2026-10-14 · 提示补全：拖任意卡片到这张画板卡上松手可移入其子画板
    badge.title = '双击打开子画板 · 拖卡片到上面可移入'
    const info = div('sr-boardcard-info')
    const titleEl = div('sr-boardcard-title')
    titleEl.title = '双击改名'
    const countEl = div('sr-boardcard-count')
    info.append(titleEl, countEl)
    wrap.append(badge, info)
    node.appendChild(wrap)
    function refresh() {
      titleEl.textContent = meta.title ?? ''
      countEl.textContent = `${meta.sub?.cards.length ?? 0} 张卡片`
    }
    refresh()
    countRefreshHooks.set(card.id, refresh)
    /** 行内改名（复刻 __rename：Enter 提交 / Escape 取消 / 失焦保存） */
    function startRename() {
      if (titleEl.querySelector('input')) return
      const inp = document.createElement('input')
      inp.className = 'sr-boardcard-rename'
      inp.setAttribute('aria-label', '重命名画板')
      inp.value = meta.title ?? ''
      titleEl.textContent = ''
      titleEl.appendChild(inp)
      inp.focus()
      inp.select()
      inp.addEventListener('dblclick', (ev) => ev.stopPropagation())
      inp.addEventListener('keydown', (ev) => {
        ev.stopPropagation()
        if (ev.key === 'Enter') {
          ev.preventDefault()
          inp.blur()
        } else if (ev.key === 'Escape') {
          inp.value = meta.title ?? ''
          inp.blur()
        }
      })
      inp.addEventListener('blur', () => {
        const v = inp.value.trim()
        if (v && v !== meta.title) {
          meta.title = v
          if (meta.sub) meta.sub.title = v
          scheduleSave()
        }
        refresh()
      })
    }
    // 双击分流（复刻 Evoloop 2026-09-25 改动）：双击标题改名，双击其余区域（徽章）进入子画板
    editHooks.set(card.id, (e) => {
      const t = e?.target
      if (t instanceof Node && titleEl.contains(t)) {
        startRename()
        return
      }
      openSubBoard(card)
    })
  }

  // ---------- 子画板（全屏覆盖层 + 递归引擎实例；文档存于父卡 meta.sub，与父共享引用） ----------
  function openSubBoard(card: BoardCard) {
    const meta = card.meta
    if (!meta.sub) return
    blurEditing()
    clearSelection()
    const overlay = div('sr-subboard-overlay')
    const host = div('sr-subboard-host')
    overlay.appendChild(host)
    document.body.appendChild(overlay)
    let closed = false
    function close() {
      if (closed) return
      closed = true
      engine.dispose()
      overlay.remove()
      if (childClose === close) childClose = null
      if (childEngine === engine) childEngine = null
      countRefreshHooks.get(card.id)?.()
      scheduleSave()
    }
    const engine = createBoardEngine(host, {
      dark: root.classList.contains('sr-board-dark'),
      doc: meta.sub,
      isSub: true,
      onClose: () => close(),
      // 子文档是父卡 meta.sub 的引用，mutation 已共享；这里只需通知父级「该保存了」
      onPersist: () => scheduleSave(),
    })
    childClose = close
    childEngine = engine
  }

  // ---------- 卡片建造（复刻 buildCard：min 尺寸 + builder + 交互 + 缩放手柄） ----------
  function buildCard(card: BoardCard): HTMLElement {
    const node = div(`sr-board-card sr-card-${card.type}`)
    node.dataset.id = card.id
    // 🔴 改动 2026-10-12 · food 卡尺寸按形态取（icon/node/info/card 各自固定尺寸）
    // 🔴 改动 2026-10-12 · character / recipe 卡同样按形态取尺寸（recipe 节点端口多，高度 232）
    const min = isAssetCard(card.type) ? assetFormSize(card.type, card.meta.form) : cardMin(card.type)
    node.style.left = `${card.x}px`
    node.style.top = `${card.y}px`
    node.style.minWidth = `${min.w}px`
    node.style.minHeight = `${min.h}px`
    node.style.width = `${Math.max(card.w || min.w, min.w)}px`
    node.style.height = `${Math.max(card.h || min.h, min.h)}px`
    if (card.type === 'note') buildNote(node, card)
    else if (card.type === 'todo') buildTodo(node, card)
    else if (card.type === 'board') buildBoardCard(node, card)
    // 🔴 改动 2026-10-11 · food 实物卡分支（内容建造器独立文件，与侧栏浮窗共用）
    else if (card.type === 'food') buildFoodCard(node, card)
    // 🔴 改动 2026-10-12 · character 角色卡 / recipe 配方卡分支（内容建造器独立文件，与侧栏浮窗共用）
    else if (card.type === 'character') buildCharacterCard(node, card)
    else if (card.type === 'recipe') buildRecipeCard(node, card)
    // 🔴 改动 2026-10-12 · dish 菜品卡分支（内容建造器独立文件，与侧栏浮窗共用）
    else if (card.type === 'dish') buildDishCard(node, card)
    // 🔴 改动 2026-10-12 · market 市场卡分支（内容建造器独立文件，与侧栏「市场」浮窗共用）
    else if (card.type === 'market') buildMarketCard(node, card)
    // 🔴 改动 2026-10-12 · revenue 收益节点（金色，自动生成）分支
    // 🔴 改动 2026-10-13 · 传入循环判定（回流到链路内买入端口 = 收益循环，否则 = 收益线程）
    else if (card.type === 'revenue') buildRevenueCard(node, card, computeChains().find((c) => c.revenue.id === card.id)?.loop === true)
    attachCardInteraction(node, card)
    // 🔴 改动 2026-10-11 · food 卡固定 200×280 比例，与 board 卡一样不提供缩放手柄
    // 🔴 改动 2026-10-12 · character / recipe 卡同为固定尺寸资产卡，同样不提供缩放手柄
    // 🔴 改动 2026-10-12 · revenue 收益节点同样固定尺寸，不提供缩放手柄
    if (card.type !== 'board' && !isAssetCard(card.type) && card.type !== 'revenue') attachResizeHandle(node, card, min)
    return node
  }
  function renderCard(card: BoardCard) {
    const prev = cardEls.get(card.id)
    if (prev) prev.remove()
    const element = buildCard(card)
    cardEls.set(card.id, element)
    worldEl.appendChild(element)
    // 挂载后补一次内容拟合（scrollHeight/offsetHeight 需要布局环境）
    postFitHooks.get(card.id)?.()
    // 🔴 改动 2026-10-13 · 屏幕钉：钉卡渲染后立即写 counter-transform（含撤销/重做/载入文档的重渲染路径）
    applyPinTransform(card)
    renderLines()
  }

  /** 右下角拖拽缩放（复刻 attachResizeHandle：不小于类型最小尺寸，位移除以 zoom） */
  function attachResizeHandle(node: HTMLElement, card: BoardCard, min: MinSize) {
    const handle = div('sr-resize-handle')
    handle.title = '拖动调整大小'
    node.appendChild(handle)
    handle.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return
      e.preventDefault()
      e.stopPropagation()
      const startX = e.clientX
      const startY = e.clientY
      const startW = card.w || min.w
      const startH = card.h || min.h
      const z = view.zoom || 1
      const onMove = (ev: PointerEvent) => {
        const w = Math.max(min.w, startW + (ev.clientX - startX) / z)
        const h = Math.max(min.h, startH + (ev.clientY - startY) / z)
        card.w = w
        card.h = h
        if (card.type === 'todo') card.meta.manualW = true
        node.style.width = `${w}px`
        node.style.height = `${h}px`
        scheduleSave()
      }
      const onUp = () => {
        document.removeEventListener('pointermove', onMove)
        document.removeEventListener('pointerup', onUp)
        document.removeEventListener('pointercancel', onUp)
        renderLines()
      }
      document.addEventListener('pointermove', onMove)
      document.addEventListener('pointerup', onUp)
      document.addEventListener('pointercancel', onUp)
    })
  }

  // ---------- 🔴 改动 2026-10-13 · 吸附对齐（Figma 风格参考线） ----------
  // 拖动卡片与其他卡片处于顶/底/左/右、水平中心、垂直中心对齐，或输出↔输入端口同高
  // （可直线连线）时，进入吸附范围即出现对齐辅助线并吸附。阈值以屏幕像素计，除以 zoom
  // 换算成世界坐标，保证任意缩放比例下观感一致。
  const SNAP_PX = 8

  interface SnapGuide {
    kind: 'h' | 'v' | 'port'
    /** h / port 的辅助线世界 Y，v 的辅助线世界 X */
    pos: number
    /** port 类型：两端口连线段的左右端点世界 X */
    x1?: number
    x2?: number
  }

  let snapGuides: SnapGuide[] = []

  /** 卡片某一侧（in/out）全部端口的当前世界坐标（无端口返回空；端口对齐判定用） */
  function cardPorts(card: BoardCard, side: 'in' | 'out'): { id: string; x: number; y: number }[] {
    const el = cardEls.get(card.id)
    if (!el) return []
    const out: { id: string; x: number; y: number }[] = []
    for (const p of Array.from(el.querySelectorAll<HTMLElement>(`[data-port-side="${side}"]`))) {
      const dot = (p.querySelector<HTMLElement>('i') ?? p) as HTMLElement
      const off = offsetWithin(dot, el)
      out.push({
        id: p.dataset.port ?? '',
        x: card.x + off.x + dot.offsetWidth / 2,
        y: card.y + off.y + dot.offsetHeight / 2,
      })
    }
    return out
  }

  /** 世界坐标 → 根层（屏幕）坐标：与 screenToWorld 互逆，供辅助线按固定屏幕像素宽绘制 */
  function worldToScreen(wx: number, wy: number): { x: number; y: number } {
    return { x: view.x + wx * view.zoom, y: view.y + wy * view.zoom }
  }

  function clearSnapGuides() {
    snapGuides = []
    guideLayer.replaceChildren()
  }

  function renderSnapGuides() {
    guideLayer.replaceChildren()
    for (const g of snapGuides) {
      const line = div(
        g.kind === 'v'
          ? 'sr-snap-guide sr-snap-guide-v'
          : g.kind === 'port'
            ? 'sr-snap-guide sr-snap-guide-port'
            : 'sr-snap-guide sr-snap-guide-h',
      )
      if (g.kind === 'v') {
        line.style.left = `${worldToScreen(g.pos, 0).x}px`
      } else if (g.kind === 'h') {
        line.style.top = `${worldToScreen(0, g.pos).y}px`
      } else {
        const a = worldToScreen(g.x1 ?? 0, g.pos)
        const b = worldToScreen(g.x2 ?? 0, g.pos)
        line.style.left = `${Math.min(a.x, b.x)}px`
        line.style.top = `${a.y}px`
        line.style.width = `${Math.abs(a.x - b.x)}px`
      }
      guideLayer.appendChild(line)
    }
  }

  /**
   * 计算拖动组的吸附修正量并填充辅助线列表。
   * 移动组包围盒与其余卡片的 top/bottom/left/right/水平中心/垂直中心对齐，
   * 以及移动组输出端口 ↔ 静态卡输入端口（或反向）同高（可直线连线）对齐。
   * 返回整组统一平移的 { dx, dy }（世界坐标）；无对齐时为 0。
   */
  function computeSnap(moving: BoardCard[]): { dx: number; dy: number } {
    const thr = SNAP_PX / (view.zoom || 1)
    const movingIds = new Set(moving.map((c) => c.id))
    const statics = board.cards.filter((c) => !movingIds.has(c.id))
    if (!moving.length || !statics.length) return { dx: 0, dy: 0 }

    const minX = Math.min(...moving.map((c) => c.x))
    const minY = Math.min(...moving.map((c) => c.y))
    const maxX = Math.max(...moving.map((c) => c.x + c.w))
    const maxY = Math.max(...moving.map((c) => c.y + c.h))
    const m = {
      left: minX,
      right: maxX,
      top: minY,
      bottom: maxY,
      cx: (minX + maxX) / 2,
      cy: (minY + maxY) / 2,
    }

    let bestDx = 0
    let bestDy = 0
    let bestDxAbs = Infinity
    let bestDyAbs = Infinity
    const hGuides = new Set<number>()
    const vGuides = new Set<number>()
    const portGuides = new Map<string, { y: number; x1: number; x2: number; d: number }>()

    for (const c of statics) {
      const s = {
        left: c.x,
        right: c.x + c.w,
        top: c.y,
        bottom: c.y + c.h,
        cx: c.x + c.w / 2,
        cy: c.y + c.h / 2,
      }

      // 水平辅助线（Y 轴对齐）：顶 / 垂直中心 / 底
      const hPairs = [
        { mv: m.top, sv: s.top, pos: s.top },
        { mv: m.cy, sv: s.cy, pos: s.cy },
        { mv: m.bottom, sv: s.bottom, pos: s.bottom },
      ]
      for (const p of hPairs) {
        const d = p.sv - p.mv
        if (Math.abs(d) <= thr) {
          hGuides.add(p.pos)
          if (Math.abs(d) < bestDyAbs) {
            bestDyAbs = Math.abs(d)
            bestDy = d
          }
        }
      }
      // 垂直辅助线（X 轴对齐）：左 / 水平中心 / 右
      const vPairs = [
        { mv: m.left, sv: s.left, pos: s.left },
        { mv: m.cx, sv: s.cx, pos: s.cx },
        { mv: m.right, sv: s.right, pos: s.right },
      ]
      for (const p of vPairs) {
        const d = p.sv - p.mv
        if (Math.abs(d) <= thr) {
          vGuides.add(p.pos)
          if (Math.abs(d) < bestDxAbs) {
            bestDxAbs = Math.abs(d)
            bestDx = d
          }
        }
      }

      // 端口对齐（可直线连线）：moving 输出 ↔ 静态输入；静态输出 ↔ moving 输入
      for (const mc of moving) {
        const mOut = cardPorts(mc, 'out')
        const mIn = cardPorts(mc, 'in')
        const sOut = cardPorts(c, 'out')
        const sIn = cardPorts(c, 'in')
        const pairCandidates: { d: number; y: number; x1: number; x2: number }[] = []
        for (const mo of mOut) {
          for (const si of sIn) {
            pairCandidates.push({ d: si.y - mo.y, y: si.y, x1: Math.min(mo.x, si.x), x2: Math.max(mo.x, si.x) })
          }
        }
        for (const so of sOut) {
          for (const mi of mIn) {
            pairCandidates.push({ d: so.y - mi.y, y: so.y, x1: Math.min(so.x, mi.x), x2: Math.max(so.x, mi.x) })
          }
        }
        for (const cand of pairCandidates) {
          if (Math.abs(cand.d) <= thr) {
            const key = `p:${cand.y.toFixed(2)}`
            const existing = portGuides.get(key)
            if (!existing || Math.abs(cand.d) < Math.abs(existing.d)) {
              portGuides.set(key, { y: cand.y, x1: cand.x1, x2: cand.x2, d: cand.d })
            } else {
              // 同高多对端口：合并为跨两端最宽的提示段
              existing.x1 = Math.min(existing.x1, cand.x1)
              existing.x2 = Math.max(existing.x2, cand.x2)
            }
            if (Math.abs(cand.d) < bestDyAbs) {
              bestDyAbs = Math.abs(cand.d)
              bestDy = cand.d
            }
          }
        }
      }
    }

    const guides: SnapGuide[] = []
    for (const pos of hGuides) guides.push({ kind: 'h', pos })
    for (const pos of vGuides) guides.push({ kind: 'v', pos })
    for (const g of portGuides.values()) guides.push({ kind: 'port', pos: g.y, x1: g.x1, x2: g.x2 })

    snapGuides = guides
    return { dx: bestDxAbs === Infinity ? 0 : bestDx, dy: bestDyAbs === Infinity ? 0 : bestDy }
  }

  // ---------- 🔴 改动 2026-10-14 · 卡片拖入画板卡：一个画板里的任意卡片（画板卡/笔记/待办/资产卡等）
  //    拖到另一张画板卡上松手 → 整卡移入目标画板的子画板，并从当前画板移除（画板卡之间即「嵌套」）。
  //    收益节点为自动派生、依赖本画板卖出连线，不参与拖入。 ----------
  /** 命中判定：屏幕坐标 → 世界坐标 → 与其余 board 卡求交（钉卡按等效世界坐标；排除被拖卡片自身） */
  function hitBoardCard(clientX: number, clientY: number, excludeId: string): BoardCard | null {
    const w = screenToWorld(clientX, clientY)
    for (let i = board.cards.length - 1; i >= 0; i--) {
      const c = board.cards[i]
      if (c.id === excludeId || c.type !== 'board') continue
      const base = isPinned(c) ? pinEffectiveWorld(c) : { x: c.x, y: c.y }
      if (w.x >= base.x && w.x <= base.x + c.w && w.y >= base.y && w.y <= base.y + c.h) return c
    }
    return null
  }
  /** 把 source 卡移入 target 画板卡的子画板：source 从当前画板移除（含其相连线），
   *  清掉屏幕钉态后以新坐标挂进 target.meta.sub.cards，并回刷目标计数。
   *  画板卡作为 source 时保留其 meta.sub（即嵌套）；其余卡类型整体搬入。 */
  function moveCardIntoBoard(source: BoardCard, target: BoardCard) {
    if (source === target || target.type !== 'board' || source.type === 'revenue') return
    if (source.type === 'board' && !source.meta.sub) source.meta.sub = emptyBoard(source.meta.title || '子画板')
    if (!target.meta.sub) target.meta.sub = emptyBoard(target.meta.title || '子画板')
    const sub = target.meta.sub!
    // 落点：目标子画板内容区左上留边，按已有卡片数轻微级联错位（避免完全重叠）
    const n = sub.cards.length
    source.x = 48 + (n % 6) * 28
    source.y = 48 + (n % 6) * 28
    // 清掉钉态：进入新文档后按普通世界坐标卡渲染（旧 pinX/pinY 相对旧引擎根，已失效）
    source.meta.pinned = false
    delete source.meta.pinX
    delete source.meta.pinY
    delete source.meta.pinZoom
    // 从当前画板移除 source，并级联删除与它相连的连线
    board.cards = board.cards.filter((c) => c.id !== source.id)
    board.lines = board.lines.filter((l) => l.from !== source.id && l.to !== source.id)
    pruneRevenue()
    // 清理 source 在本画板的 DOM 与钩子
    cardEls.get(source.id)?.remove()
    cardEls.delete(source.id)
    editHooks.delete(source.id)
    postFitHooks.delete(source.id)
    countRefreshHooks.delete(source.id)
    // 并入目标子画板并回刷目标计数
    sub.cards.push(source)
    countRefreshHooks.get(target.id)?.()
    clearSelection()
    renderLines()
    scheduleSave()
  }

  // ---------- 🔴 改动 2026-10-14 · 跨画板拖放：卡片从本画板拖到另一块并列画板（拆分窗格 / 画中画窗口） ----------
  /** 源侧：把一组被拖卡片（含两端都在组内的连线）从本画板移除，交给目标画板落卡。
   *  透传「被按住的卡 + 抓取偏移」，目标据此对齐落点，避免松手时右下跳位 */
  function transferCardsToBoard(
    movedIds: Set<string>,
    target: LiveBoardEntry,
    clientX: number,
    clientY: number,
    pressedId: string,
    grabX: number,
    grabY: number,
  ) {
    const cards = board.cards.filter((c) => movedIds.has(c.id))
    if (!cards.length) return
    const lines = board.lines.filter((l) => movedIds.has(l.from) && movedIds.has(l.to))
    board.cards = board.cards.filter((c) => !movedIds.has(c.id))
    board.lines = board.lines.filter((l) => !movedIds.has(l.from) && !movedIds.has(l.to))
    pruneRevenue()
    for (const c of cards) {
      cardEls.get(c.id)?.remove()
      cardEls.delete(c.id)
      editHooks.delete(c.id)
      postFitHooks.delete(c.id)
      countRefreshHooks.delete(c.id)
    }
    clearSelection()
    renderLines()
    scheduleSave()
    target.receiveCards(cards, lines, clientX, clientY, pressedId, grabX, grabY)
  }
  /** 目标侧：接收跨画板拖入的卡片——按「被按住的卡」抓取偏移对齐落点（与拖动幽灵视觉一致，不跳位），
   *  清掉屏幕钉态，重渲并选中、落盘；内部连线 id 重生成避免与目标画板冲突 */
  function receiveCards(
    cards: BoardCard[],
    lines: BoardLine[],
    clientX: number,
    clientY: number,
    pressedId: string,
    grabX: number,
    grabY: number,
  ) {
    if (!cards.length) return
    const pressed = cards.find((c) => c.id === pressedId) ?? cards[0]
    // 被按住的卡左上角应对齐「指针 - 抓取偏移」（屏幕像素）换算出的目标世界坐标
    const anchor = screenToWorld(clientX - grabX, clientY - grabY)
    const ox = anchor.x - pressed.x
    const oy = anchor.y - pressed.y
    for (const c of cards) {
      c.x += ox
      c.y += oy
      c.meta.pinned = false
      delete c.meta.pinX
      delete c.meta.pinY
      delete c.meta.pinZoom
      board.cards.push(c)
      renderCard(c)
    }
    for (const l of lines) board.lines.push({ ...l, id: uid() })
    selectMany(new Set(cards.map((c) => c.id)))
    renderLines()
    scheduleSave()
  }

  /**
   * 统一卡片手势（复刻 attachCardInteraction 核心）：
   * 点击 = 选中，按住拖拽 = 移动（多选整组），双击 = 编辑/打开；
   * 卡内控件在编辑态恢复原生行为，sr-resize-handle / sr-view-action 全程豁免。
   */
  function attachCardInteraction(node: HTMLElement, card: BoardCard) {
    node.addEventListener(
      'pointerdown',
      (e) => {
        if (e.button !== 0) return // 中键冒泡到画布做平移
        if (classWithin(e.target, node, 'sr-resize-handle')) return
        // 🔴 改动 2026-10-12 · 端口手势优先于卡片拖拽：按住输出端口拖出待定连线（工坊资产节点同款）；
        // 输入端口按下不拖卡（它是连线的落点）。连线模式下端口让位给点击两卡的既有流程。
        const portEl = portWithin(e.target, node)
        if (portEl && !connectMode) {
          e.preventDefault()
          e.stopPropagation()
          if (portEl.dataset.portSide === 'out') startWireDrag(card, portEl.dataset.port)
          return
        }
        if (classWithin(e.target, node, 'sr-view-action')) return
        if (connectMode) return // 连线模式下点击归 click 处理
        if (editingId === card.id) return // 编辑态卡内控件原生行为
        e.preventDefault()
        e.stopPropagation()
        if (!selectedIds.has(card.id)) select(card.id)
        const startX = e.clientX
        const startY = e.clientY
        // 🔴 改动 2026-10-14 · 拖动幽灵：记录抓取偏移与视觉缩放，供 body 层幽灵跟随指针（越过隔线/其他画板仍可见）
        const cardRect0 = node.getBoundingClientRect()
        const grabX = startX - cardRect0.left
        const grabY = startY - cardRect0.top
        const dragZoom = isPinned(card) ? (card.meta.pinZoom ?? view.zoom) : view.zoom
        // 记录整组选中卡的起始位置，拖拽时整组移动
        // 🔴 改动 2026-10-13 · 屏幕钉：钉卡记录钉位起点（屏幕像素），拖动钉卡 = 移动钉位（不回到世界系）
        const startPos = new Map<string, { x: number; y: number; pinned: boolean }>()
        for (const id of selectedIds) {
          const c = board.cards.find((x) => x.id === id)
          if (!c) continue
          if (isPinned(c)) startPos.set(id, { x: c.meta.pinX ?? 0, y: c.meta.pinY ?? 0, pinned: true })
          else startPos.set(id, { x: c.x, y: c.y, pinned: false })
        }
        let moved = false
        // 🔴 改动 2026-10-14 · 卡片拖入画板卡：仅「单个非收益卡」拖动时启用（多选整组拖动只平移；收益节点为派生内容）
        const canDropIntoBoard = card.type !== 'revenue' && startPos.size === 1
        let dropTarget: BoardCard | null = null
        // 🔴 改动 2026-10-14 · 跨画板拖放：拖到另一块并列画板上的落点目标
        let crossTarget: LiveBoardEntry | null = null
        // 🔴 改动 2026-10-14 · 拖动幽灵（body 层固定定位，不被本画板 overflow 裁剪）
        let ghostHost: HTMLElement | null = null
        let ghostEl: HTMLElement | null = null
        const onMove = (ev: PointerEvent) => {
          const dx = ev.clientX - startX
          const dy = ev.clientY - startY
          if (!moved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
            moved = true
            node.classList.add('sr-dragging')
            // 🔴 改动 2026-10-14 · 创建 body 层拖动幽灵：越过画板隔线/其他画板时仍跟随指针可见
            ghostHost = document.createElement('div')
            ghostHost.className = 'sr-board' + (root.classList.contains('sr-board-dark') ? ' sr-board-dark' : '')
            ghostHost.style.position = 'fixed'
            ghostHost.style.inset = 'auto'
            ghostHost.style.top = '0'
            ghostHost.style.left = '0'
            ghostHost.style.width = '0'
            ghostHost.style.height = '0'
            ghostHost.style.overflow = 'visible'
            ghostHost.style.zIndex = '99999'
            ghostHost.style.pointerEvents = 'none'
            ghostEl = node.cloneNode(true) as HTMLElement
            // cloneNode 不复制 textarea/input 当前值，逐项同步，保证 note/todo 卡幽灵内容正确
            const srcFields = node.querySelectorAll('textarea, input')
            const dstFields = ghostEl.querySelectorAll('textarea, input')
            srcFields.forEach((f, i) => {
              const dst = dstFields[i]
              if (dst instanceof HTMLTextAreaElement || dst instanceof HTMLInputElement) {
                dst.value = (f as HTMLTextAreaElement | HTMLInputElement).value
              }
            })
            ghostEl.style.transformOrigin = '0 0'
            ghostEl.style.pointerEvents = 'none'
            ghostEl.style.opacity = '0.96'
            ghostEl.style.left = `${ev.clientX - grabX}px`
            ghostEl.style.top = `${ev.clientY - grabY}px`
            ghostEl.style.transform = `scale(${dragZoom})`
            ghostHost.appendChild(ghostEl)
            document.body.appendChild(ghostHost)
            document.body.classList.add('sr-board-grabbing')
          }
          if (!moved) return
          // 世界坐标差（除以 zoom），卡片始终贴在光标下
          const w = screenToWorld(ev.clientX, ev.clientY)
          const s = screenToWorld(startX, startY)
          const dWX = w.x - s.x
          const dWY = w.y - s.y
          for (const [id, p] of startPos) {
            const c = board.cards.find((x) => x.id === id)
            const el = cardEls.get(id)
            if (!c || !el) continue
            if (p.pinned) {
              // 钉卡：钉位按屏幕像素直改（光标 1:1），counter-transform 立即重算
              c.meta.pinX = p.x + dx
              c.meta.pinY = p.y + dy
              applyPinTransform(c)
            } else {
              c.x = p.x + dWX
              c.y = p.y + dWY
              el.style.left = `${c.x}px`
              el.style.top = `${c.y}px`
            }
          }
          // 🔴 改动 2026-10-13 · 吸附对齐：计算修正量并整组平移，随后渲染对齐辅助线
          // 屏幕钉卡不参与吸附（屏幕系与世界系不可同轴对齐），只对未钉的移动卡生效
          const movingCards = board.cards.filter((c) => startPos.has(c.id) && !startPos.get(c.id)?.pinned)
          const { dx: snapDx, dy: snapDy } = movingCards.length ? computeSnap(movingCards) : { dx: 0, dy: 0 }
          if (snapDx !== 0 || snapDy !== 0) {
            for (const c of movingCards) {
              c.x += snapDx
              c.y += snapDy
              const el = cardEls.get(c.id)
              if (el) {
                el.style.left = `${c.x}px`
                el.style.top = `${c.y}px`
              }
            }
          }
          renderSnapGuides()
          renderLines()
          // 🔴 改动 2026-10-14 · 幽灵跟随指针（抓取偏移不变）
          if (ghostEl) {
            ghostEl.style.left = `${ev.clientX - grabX}px`
            ghostEl.style.top = `${ev.clientY - grabY}px`
          }
          // 🔴 改动 2026-10-14 · 跨画板拖放：越过边界命中另一块画板 → 高亮目标画板根（子画板覆盖层不参与）
          const cross = isSub ? null : boardAtPoint(ev.clientX, ev.clientY, root)
          if (cross) {
            if (crossTarget !== cross) {
              if (crossTarget) crossTarget.root.classList.remove('sr-board-cross-target')
              crossTarget = cross
              crossTarget.root.classList.add('sr-board-cross-target')
            }
            // 光标已离开本画板：清掉画板内 board 卡命中高亮
            if (dropTarget) {
              cardEls.get(dropTarget.id)?.classList.remove('sr-board-drop-target')
              dropTarget = null
            }
          } else {
            if (crossTarget) {
              crossTarget.root.classList.remove('sr-board-cross-target')
              crossTarget = null
            }
            // 🔴 改动 2026-10-14 · 卡片拖入画板卡：实时命中目标 board 卡并高亮（松手移入提示）
            if (canDropIntoBoard) {
              const next = hitBoardCard(ev.clientX, ev.clientY, card.id)
              if (next !== dropTarget) {
                if (dropTarget) cardEls.get(dropTarget.id)?.classList.remove('sr-board-drop-target')
                dropTarget = next
                if (dropTarget) cardEls.get(dropTarget.id)?.classList.add('sr-board-drop-target')
              }
            }
          }
        }
        const onUp = (ev: PointerEvent) => {
          node.classList.remove('sr-dragging')
          // 🔴 改动 2026-10-14 · 移除拖动幽灵与全局 grabbing 光标
          ghostEl?.remove()
          ghostEl = null
          ghostHost?.remove()
          ghostHost = null
          document.body.classList.remove('sr-board-grabbing')
          clearSnapGuides()
          document.removeEventListener('pointermove', onMove)
          document.removeEventListener('pointerup', onUp)
          document.removeEventListener('pointercancel', onUp)
          // 清理高亮
          if (dropTarget) cardEls.get(dropTarget.id)?.classList.remove('sr-board-drop-target')
          if (crossTarget) crossTarget.root.classList.remove('sr-board-cross-target')
          // 🔴 改动 2026-10-14 · 跨画板拖放：松手落在另一块画板上 → 移入目标画板
          if (moved && crossTarget) {
            transferCardsToBoard(new Set(startPos.keys()), crossTarget, ev.clientX, ev.clientY, card.id, grabX, grabY)
            return
          }
          // 🔴 改动 2026-10-14 · 卡片拖入画板卡：松手落在另一张画板卡上 → 移入其子画板
          if (moved && dropTarget) {
            moveCardIntoBoard(card, dropTarget)
            return
          }
          if (moved) {
            scheduleSave()
            renderLines()
          }
        }
        document.addEventListener('pointermove', onMove)
        document.addEventListener('pointerup', onUp)
        document.addEventListener('pointercancel', onUp)
      },
      true,
    )
    node.addEventListener(
      'click',
      (e) => {
        if (editingId === card.id) return
        if (classWithin(e.target, node, 'sr-resize-handle')) return
        if (classWithin(e.target, node, 'sr-view-action')) return
        e.preventDefault()
        e.stopPropagation()
        if (connectMode) handleConnect(card.id)
        else if (!selectedIds.has(card.id)) select(card.id)
      },
      true,
    )
    node.addEventListener(
      'dblclick',
      (e) => {
        if (editingId === card.id) return
        if (classWithin(e.target, node, 'sr-resize-handle')) return
        if (classWithin(e.target, node, 'sr-view-action')) return
        // 🔴 改动 2026-10-11 · food 卡无文本编辑态（双击进入伪编辑会锁住拖拽与 Del），双击暂不响应；后续接详情抽屉
        // 🔴 改动 2026-10-12 · character / recipe 卡同为资产卡，双击同样不响应
        // 🔴 改动 2026-10-12 · revenue 收益节点同样不响应双击（自动生成，无编辑内容）
        if (isAssetCard(card.type) || card.type === 'revenue') return
        e.preventDefault()
        e.stopPropagation()
        enterCardEdit(node, card, e)
      },
      true,
    )
    // 编辑态控件的事件可冒泡到卡片，但绝不再传到画布（复刻 Evoloop 尾部 click 拦截）
    node.addEventListener('click', (e) => {
      e.stopPropagation()
    })
  }

  /** 新建卡片（默认画布中心；edit=true 立即进入编辑——双击空白建卡的体验） */
  // 🔴 改动 2026-10-11 · createCard 支持初始 meta（food 卡写入 foodId）
  function createCard(type: CardType, sx?: number, sy?: number, edit = false, meta: CardMeta = {}): BoardCard {
    const rect = root.getBoundingClientRect()
    // 🔴 改动 2026-10-10 · 默认落点改到中央地球方块左侧的可见带：
    // 画板是页面最底层，中心正好被 .atlas-earth（620px 方块，pointer-events:auto）盖住，
    // 建在中心的新卡既看不见也点不到；横向取 [96, 280] 内且在地球左缘之外的可见点。
    const cx =
      typeof sx === 'number' ? sx : rect.left + Math.max(96, Math.min((rect.width - 620) / 2 - 20, 280))
    const cy = typeof sy === 'number' ? sy : rect.top + rect.height / 2
    const c = screenToWorld(cx, cy)
    // 🔴 改动 2026-10-12 · food 卡按形态尺寸居中落点（meta.form 由 createFoodCard 写入）
    // 🔴 改动 2026-10-12 · character / recipe 卡同样按形态尺寸居中落点
    const min = isAssetCard(type) ? assetFormSize(type, meta.form) : cardMin(type)
    const card: BoardCard = {
      id: uid(),
      type,
      x: Math.round(c.x - min.w / 2),
      y: Math.round(c.y - min.h / 2),
      w: min.w,
      h: min.h,
      text: '',
      meta,
    }
    board.cards.push(card)
    renderCard(card)
    select(card.id)
    scheduleSave()
    if (edit) {
      const node = cardEls.get(card.id)
      if (node) enterCardEdit(node, card)
    }
    return card
  }

  // 🔴 改动 2026-10-11 · food 实物卡创建入口：校验 foodId 落在工坊数据契约内（未知 id 拒绝建卡）
  // 🔴 改动 2026-10-12 · 新建默认节点形态（实物列表点击/拖入画板）；形态可用 Tab+Q/W/E/R 切换
  function createFoodCard(foodId: string, sx?: number, sy?: number): BoardCard | null {
    if (!demoFoodCards.some((d) => d.id === foodId)) return null
    return createCard('food', sx, sy, false, { foodId, form: DEFAULT_FOOD_FORM })
  }

  // 🔴 改动 2026-10-12 · character 角色卡创建入口：校验 characterId 落在工坊数据契约内（未知 id 拒绝建卡）
  function createCharacterCard(characterId: string, sx?: number, sy?: number): BoardCard | null {
    if (!demoCharacters.some((d) => d.id === characterId)) return null
    return createCard('character', sx, sy, false, { characterId, form: DEFAULT_FOOD_FORM })
  }

  // 🔴 改动 2026-10-12 · recipe 配方卡创建入口：校验 recipeId 落在工坊数据契约内（未知 id 拒绝建卡）
  function createRecipeCard(recipeId: string, sx?: number, sy?: number): BoardCard | null {
    if (!demoRecipes.some((d) => d.id === recipeId)) return null
    return createCard('recipe', sx, sy, false, { recipeId, form: DEFAULT_FOOD_FORM })
  }

  // 🔴 改动 2026-10-12 · dish 菜品卡创建入口：校验 dishId 落在工坊数据契约内（未知 id 拒绝建卡）
  function createDishCard(dishId: string, sx?: number, sy?: number): BoardCard | null {
    if (!demoDishes.some((d) => d.id === dishId)) return null
    return createCard('dish', sx, sy, false, { dishId, form: DEFAULT_FOOD_FORM })
  }

  // 🔴 改动 2026-10-12 · market 市场卡创建入口：校验 marketId 落在工坊数据契约内（未知 id 拒绝建卡）
  function createMarketCard(marketId: string, sx?: number, sy?: number): BoardCard | null {
    if (!demoMarkets.some((d) => d.id === marketId)) return null
    return createCard('market', sx, sy, false, { marketId, form: DEFAULT_FOOD_FORM })
  }

  /** 🔴 改动 2026-10-12 · 切换资产卡形态（food/character/recipe 通用）：保持中心点不变改尺寸，重渲内容并落盘（经 scheduleSave 进撤销栈） */
  function setAssetForm(card: BoardCard, form: FoodForm) {
    if (!isAssetCard(card.type)) return
    if ((card.meta.form ?? 'card') === form) return
    const size = assetFormSize(card.type, form)
    card.meta.form = form
    card.x = Math.round(card.x + (card.w - size.w) / 2)
    card.y = Math.round(card.y + (card.h - size.h) / 2)
    card.w = size.w
    card.h = size.h
    renderCard(card)
    // renderCard 重建节点会丢选中态，补回
    if (selectedIds.has(card.id)) cardEls.get(card.id)?.classList.add('sr-selected')
    scheduleSave()
  }

  // ---------- 添加菜单（点击在画布中心创建；HTML5 拖放到落点创建，复刻 Evoloop；
  //    未实现类型禁用陈列，不可点不可拖，复刻 mn-disabled + 「（即将支持）」提示） ----------
  function buildAddMenu(): HTMLElement {
    const menu = div('sr-addmenu')
    const h4 = document.createElement('h4')
    h4.textContent = '添加'
    menu.appendChild(h4)
    for (const item of MENU_ITEMS) {
      const enabled = ENABLED_TYPES.has(item.type)
      const row = div(enabled ? 'sr-additem' : 'sr-additem sr-disabled')
      row.title = enabled ? `添加${item.label}（点击在中心创建，可拖放到画布）` : `${item.label}（即将支持）`
      const ico = span('sr-additem-ico')
      ico.textContent = item.icon
      ico.style.background = TYPE_COLORS[item.type] ?? '#6d5efc'
      const lbl = span('sr-additem-lbl')
      lbl.textContent = item.label
      row.append(ico, lbl)
      if (enabled) {
        row.addEventListener('click', (e) => {
          e.stopPropagation()
          if (item.type === 'line') enterConnectMode()
          else createCard(item.type as CardType)
        })
        row.setAttribute('draggable', 'true')
        row.addEventListener('dragstart', (e) => {
          try {
            e.dataTransfer?.setData('text/plain', item.type)
            if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy'
          } catch {
            /* dataTransfer 不可用时静默 */
          }
        })
      }
      menu.appendChild(row)
    }
    return menu
  }

  // ---------- 🔴 改动 2026-10-11 · 画布手势：平移只保留中键（任意位置）；左键拖空白改为框选 ----------
  function startPan(e: PointerEvent, keepSelection = false) {
    if (!keepSelection) {
      blurEditing()
      clearSelection()
    }
    const startX = e.clientX
    const startY = e.clientY
    const startVX = view.x
    const startVY = view.y
    let moved = false
    root.classList.add('sr-panning')
    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX
      const dy = ev.clientY - startY
      if (!moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) moved = true
      if (!moved) return
      view.x = startVX + dx
      view.y = startVY + dy
      applyViewport()
    }
    const onUp = () => {
      root.classList.remove('sr-panning')
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointercancel', onUp)
      if (moved) scheduleSave()
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    document.addEventListener('pointercancel', onUp)
  }
  /** 框选（复刻 marquee：屏幕坐标矩形与世界卡片盒求交；Ctrl/Cmd 追加选择） */
  function startMarquee(e: PointerEvent) {
    const rect = root.getBoundingClientRect()
    const startSX = e.clientX - rect.left
    const startSY = e.clientY - rect.top
    const additive = e.ctrlKey || e.metaKey
    const base = new Set(selectedIds)
    // 🔴 改动 2026-10-11 · 左键空白手势从平移改为框选：非追加时先失焦编辑（原位点击在 onUp 里清空选区）
    if (!additive) blurEditing()
    let moved = false
    const onMove = (ev: PointerEvent) => {
      const x = ev.clientX - rect.left
      const y = ev.clientY - rect.top
      if (!moved && (Math.abs(x - startSX) > 3 || Math.abs(y - startSY) > 3)) moved = true
      if (!moved) return
      const x1 = Math.min(startSX, x)
      const y1 = Math.min(startSY, y)
      const x2 = Math.max(startSX, x)
      const y2 = Math.max(startSY, y)
      marqueeEl.style.display = 'block'
      marqueeEl.style.left = `${x1}px`
      marqueeEl.style.top = `${y1}px`
      marqueeEl.style.width = `${x2 - x1}px`
      marqueeEl.style.height = `${y2 - y1}px`
      const z = view.zoom
      const sel = additive ? new Set(base) : new Set<string>()
      for (const c of board.cards) {
        const cx = view.x + c.x * z
        const cy = view.y + c.y * z
        const cw = (c.w || 240) * z
        const ch = (c.h || 150) * z
        if (x1 < cx + cw && x2 > cx && y1 < cy + ch && y2 > cy) sel.add(c.id)
      }
      selectMany(sel)
    }
    const onUp = () => {
      marqueeEl.style.display = 'none'
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointercancel', onUp)
      // 🔴 改动 2026-10-11 · 原位单击空白（未拖出框）= 清空选区，顶替原左键平移 startPan 的副作用
      if (!moved && !additive) clearSelection()
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    document.addEventListener('pointercancel', onUp)
  }

  // ---------- 事件注册（全部经 AbortController，dispose 一次注销） ----------
  // 🔴 改动 2026-10-13 · 技能选中期间：捕获阶段吞掉画板左键按下（不启动框选/卡片拖动/端口连线），
  // 本次点击是「技能释放」，释放动作由 HUD 技能栏在 pointerup 时按坐标命中虚线框完成；
  // preventDefault 同时抑制后续 click（避免释放点下方的卡片被顺手选中）
  on<PointerEvent>(
    root,
    'pointerdown',
    (e) => {
      if (disposed || childClose) return
      if (armedSkill && e.button === 0) {
        e.preventDefault()
        e.stopPropagation()
        recentCast = true
        window.setTimeout(() => {
          recentCast = false
        }, 600)
      }
    },
    { capture: true },
  )
  on<PointerEvent>(root, 'pointerdown', (e) => {
    if (disposed || childClose) return
    // 中键：任意位置平移（卡片只声明左键手势，事件自然冒泡到画布）
    if (e.button === 1) {
      e.preventDefault() // 同时阻止浏览器中键自动滚动
      startPan(e, true)
      return
    }
    if (e.button !== 0) return
    // 左键只响应空白背景；卡片手势已自行 stopPropagation，不会走到这里
    const t = e.target
    const onBackground = t === root || t === gridEl || t === worldEl || t === linesSvg
    if (!onBackground) return
    e.preventDefault()
    // 🔴 改动 2026-10-11 · 左键拖空白 = 框选（平移只留中键）；Ctrl/Cmd 按下时框选为追加选择
    startMarquee(e)
  })

  // 🔴 改动 2026-10-12 · 缩放改为 Ctrl/Cmd + 滚轮（以光标为锚，复刻 Evoloop 的锚点算法）；
  // 普通滚轮不再缩放、也不拦截——预留给后续用途（用户要求）
  on<WheelEvent>(
    root,
    'wheel',
    (e) => {
      if (disposed || childClose) return
      if (!e.ctrlKey && !e.metaKey) return
      // 阻止浏览器自身的 Ctrl+滚轮页面缩放
      e.preventDefault()
      const rect = root.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const old = view.zoom
      const unit = e.deltaMode === 1 ? 16 : 1 // 兼容按行滚动的浏览器
      const factor = Math.pow(1.0015, -e.deltaY * unit)
      const next = snapZoom(clamp(old * factor, ZOOM_MIN, ZOOM_MAX))
      const wx = (mx - view.x) / old
      const wy = (my - view.y) / old
      view.x = mx - wx * next
      view.y = my - wy * next
      view.zoom = next
      applyViewport()
      scheduleSave()
    },
    { passive: false },
  )
  /** 接近 100% 时吸附（复刻 Evoloop snapZoom） */
  function snapZoom(z: number): number {
    return Math.abs(z - 1) < 0.06 ? 1 : z
  }

  // 双击空白 = 在点击处新建 Note 并立即进入编辑
  on<MouseEvent>(root, 'dblclick', (e) => {
    if (disposed || childClose || connectMode) return
    // 🔴 改动 2026-10-13 · 技能刚释放后的双击不建卡（双击连放技能/误触双击时避免在释放点冒出新笔记）
    if (recentCast) return
    const t = e.target
    const onBackground = t === root || t === gridEl || t === worldEl || t === linesSvg
    if (!onBackground) return
    e.preventDefault()
    createCard('note', e.clientX, e.clientY, true)
  })

  // 🔴 改动 2026-10-10 · 页面离开前 flush：防抖未到 800ms 时刷新/切页不丢最后几次改动
  on<PageTransitionEvent>(window, 'pagehide', () => persist())

  // ---------- 🔴 改动 2026-10-11 · 画布右键菜单：拆分画板（垂直/水平），已拆分时显示取消拆分 ----------
  let ctxMenuEl: HTMLElement | null = null
  function closeCtxMenu() {
    ctxMenuEl?.remove()
    ctxMenuEl = null
  }
  function ctxItem(label: string, onClick: () => void, disabled = false): HTMLElement {
    const item = div('sr-board-ctxitem')
    item.textContent = label
    if (disabled) item.classList.add('sr-board-ctxdisabled')
    item.addEventListener('click', (e) => {
      e.stopPropagation()
      if (disabled) return
      closeCtxMenu()
      onClick()
    })
    return item
  }
  function openCtxMenu(sx: number, sy: number) {
    closeCtxMenu()
    const menu = div('sr-board-ctxmenu')
    // 🔴 改动 2026-10-14 · 空白右键新增「粘贴」（剪贴板有内容时可用，落在右键位置）
    const world = screenToWorld(sx, sy)
    menu.appendChild(ctxItem('粘贴', () => pasteClipboard(world.x, world.y), !clipboard || !clipboard.cards.length))
    // 🔴 改动 2026-10-13 · 画板空白右键菜单：拆分画板 / 收起画板 / 成为主画板 / 删除画板
    menu.appendChild(ctxItem('拆分画板', () => {
      if (opts.onBoardSplit) opts.onBoardSplit()
      else opts.onSplitRequest?.('vertical')
    }))
    // 🔴 改动 2026-10-15 · 「收起画板」仅在提供回调时出现（独占全屏视图无收起语义，直接不渲染该项）
    if (opts.onCollapseBoard) menu.appendChild(ctxItem('收起画板', () => opts.onCollapseBoard?.()))
    if (!opts.isMainBoard) menu.appendChild(ctxItem('成为主画板', () => opts.onBecomeMain?.()))
    const del = ctxItem('删除画板', () => opts.onDeleteBoard?.())
    del.classList.add('sr-board-ctxdanger')
    menu.appendChild(del)
    const rect = root.getBoundingClientRect()
    menu.style.left = `${sx - rect.left}px`
    menu.style.top = `${sy - rect.top}px`
    root.appendChild(menu)
    if (sx - rect.left + menu.offsetWidth > rect.width - 4) {
      menu.style.left = `${Math.max(4, rect.width - menu.offsetWidth - 4)}px`
    }
    if (sy - rect.top + menu.offsetHeight > rect.height - 4) {
      menu.style.top = `${Math.max(4, rect.height - menu.offsetHeight - 4)}px`
    }
    ctxMenuEl = menu
  }
  /** 🔴 改动 2026-10-14 · 卡片右键菜单：复制 / 剪切 / 粘贴 / 删除 + 屏幕钉。
   *  复制/剪切/删除作用于当前选中集（右键非选中的卡会先单选它）；粘贴落在右键位置 */
  function openCardCtxMenu(sx: number, sy: number, card: BoardCard) {
    closeCtxMenu()
    const menu = div('sr-board-ctxmenu')
    const world = screenToWorld(sx, sy)
    menu.appendChild(ctxItem('复制', () => copySelected()))
    menu.appendChild(ctxItem('剪切', () => cutSelected()))
    menu.appendChild(ctxItem('粘贴', () => pasteClipboard(world.x, world.y), !clipboard || !clipboard.cards.length))
    const del = ctxItem('删除', () => deleteSelected())
    del.classList.add('sr-board-ctxdanger')
    menu.appendChild(del)
    menu.appendChild(ctxItem(isPinned(card) ? '取消屏幕钉' : '屏幕钉', () => togglePin(card)))
    const rect = root.getBoundingClientRect()
    menu.style.left = `${sx - rect.left}px`
    menu.style.top = `${sy - rect.top}px`
    root.appendChild(menu)
    if (sx - rect.left + menu.offsetWidth > rect.width - 4) {
      menu.style.left = `${Math.max(4, rect.width - menu.offsetWidth - 4)}px`
    }
    if (sy - rect.top + menu.offsetHeight > rect.height - 4) {
      menu.style.top = `${Math.max(4, rect.height - menu.offsetHeight - 4)}px`
    }
    ctxMenuEl = menu
  }
  on<MouseEvent>(root, 'contextmenu', (e) => {
    if (disposed || childClose) return
    const t = e.target
    // 🔴 改动 2026-10-13 · 卡片右键 → 卡片菜单（复制/剪切/粘贴/删除 + 屏幕钉）；背景右键 → 拆分画板菜单；其余（连线等）仅关菜单
    const cardEl = t instanceof Element ? t.closest<HTMLElement>('.sr-board-card') : null
    if (cardEl && root.contains(cardEl)) {
      const card = board.cards.find((c) => c.id === cardEl.dataset.id)
      if (card) {
        e.preventDefault()
        // 🔴 改动 2026-10-14 · 右键未选中的卡 → 先单选它，让复制/剪切/删除作用于这张卡
        if (!selectedIds.has(card.id)) select(card.id)
        openCardCtxMenu(e.clientX, e.clientY, card)
        return
      }
    }
    const onBackground = t === root || t === gridEl || t === worldEl || t === linesSvg
    if (!onBackground) {
      closeCtxMenu()
      return
    }
    e.preventDefault()
    openCtxMenu(e.clientX, e.clientY)
  })
  on<MouseEvent>(root, 'pointerdown', (e) => {
    // 🔴 改动 2026-10-16 · 上报「最近交互的画板引擎」：侧边栏「加入画板」经 bridge 优先落到本画板
    if (!disposed) setActiveBoardEngine(apiRef)
    if (ctxMenuEl && e.target instanceof Node && !ctxMenuEl.contains(e.target)) closeCtxMenu()
  })
  on<KeyboardEvent>(document, 'keydown', (e) => {
    if (e.key === 'Escape') closeCtxMenu()
  })

  // 添加菜单项拖放到画布落点创建
  on<DragEvent>(root, 'dragover', (e) => {
    e.preventDefault()
  })
  on<DragEvent>(root, 'drop', (e) => {
    e.preventDefault()
    if (disposed || childClose) return
    const type = e.dataTransfer?.getData('text/plain') ?? ''
    // 🔴 改动 2026-10-11 · 侧栏「实物」浮窗拖放协议：text/plain = food:<foodId>
    if (type.startsWith('food:')) {
      createFoodCard(type.slice(5), e.clientX, e.clientY)
      return
    }
    // 🔴 改动 2026-10-12 · 侧栏「角色」/「配方」浮窗拖放协议：text/plain = character:<id> / recipe:<id>
    if (type.startsWith('character:')) {
      createCharacterCard(type.slice(10), e.clientX, e.clientY)
      return
    }
    if (type.startsWith('recipe:')) {
      createRecipeCard(type.slice(7), e.clientX, e.clientY)
      return
    }
    // 🔴 改动 2026-10-12 · 侧栏「菜品」浮窗拖放协议：text/plain = dish:<dishId>
    if (type.startsWith('dish:')) {
      createDishCard(type.slice(5), e.clientX, e.clientY)
      return
    }
    // 🔴 改动 2026-10-12 · 侧栏「市场」浮窗拖放协议：text/plain = market:<marketId>
    if (type.startsWith('market:')) {
      createMarketCard(type.slice(7), e.clientX, e.clientY)
      return
    }
    if (type === 'line') {
      enterConnectMode()
      return
    }
    if (type === 'note' || type === 'todo' || type === 'board') createCard(type, e.clientX, e.clientY)
  })

  // 键盘：Ctrl+Z 撤销 / Ctrl+Shift+Z 重做 / Del 删除选中 / Esc 逐级退出（连线 → 编辑 → 选中 → 子画板返回）
  on<KeyboardEvent>(document, 'keydown', (e) => {
    if (disposed || childClose) return
    // 🔴 改动 2026-10-11 · 撤销/重做快捷键（复刻 Evoloop onHistoryKey 守卫：输入法合成中跳过、文本框内归原生撤销）
    if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 'z' || e.key === 'Z')) {
      if (e.isComposing) return
      const t = e.target
      if (t instanceof HTMLElement && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT')) return
      if (editingId) return
      // 与 Del 同规则：焦点在页面本体/画板/壳层浮窗内才响应
      const active = document.activeElement
      const inOverlay = active instanceof HTMLElement && active.closest('[data-board-overlay]') !== null
      const inScope = active === document.body || active === null || inOverlay || (active instanceof Node && root.contains(active))
      if (!inScope) return
      e.preventDefault()
      restoreHistory(e.shiftKey)
      return
    }
    // 🔴 改动 2026-10-14 · Ctrl/Cmd+A 全选画板中的所有卡片（作用域守卫与撤销/重做一致）
    if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 'a' || e.key === 'A')) {
      if (e.isComposing) return
      const t = e.target
      if (t instanceof HTMLElement && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT' || t.isContentEditable)) return
      if (editingId) return
      const active = document.activeElement
      const inOverlay = active instanceof HTMLElement && active.closest('[data-board-overlay]') !== null
      const inScope = active === document.body || active === null || inOverlay || (active instanceof Node && root.contains(active))
      if (!inScope) return
      // 🔴 改动 2026-10-13 · 分屏/画中画并存时只全选「指针下的画板」：所有引擎都收到本事件，
      // 非目标引擎直接放行；画中画（屏幕钉）与大画板一体——命中任一方，双方连带全选
      const target = selectAllTarget()
      if (!target || target !== liveEntry) return
      e.preventDefault()
      selectAll()
      for (const en of liveBoards) {
        if (en === target) continue
        if ((target.isMain && en.pip) || (target.pip && en.isMain)) en.selectAll()
      }
      return
    }
    if (e.key === 'Escape') {
      // 🔴 改动 2026-10-12 · Esc 逐级退出：待定连线 → 连线模式 → 编辑 → 选中 → 子画板返回
      if (wireDrag) {
        cancelWireDrag()
        return
      }
      if (connectMode) {
        exitConnectMode()
        return
      }
      if (editingId) {
        blurEditing()
        return
      }
      if (selectedIds.size) {
        clearSelection()
        return
      }
      if (isSub) opts.onClose?.()
      return
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      // 文本框内的按键永远归文本编辑（复刻 Evoloop 的作用域检查）
      const t = e.target
      if (t instanceof HTMLElement && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT')) return
      if (editingId) return
      // 焦点必须在页面本体或画板内，避免劫持全局 Delete
      // 🔴 改动 2026-10-11 · 侧边栏浮窗（循环/图表/品牌/实物）打开后焦点留在面板按钮上，
      // 原作用域检查判定焦点在画板外 → Del 被吞、卡片删不掉；带 data-board-overlay 的浮窗视为作用域内
      const active = document.activeElement
      const inOverlay = active instanceof HTMLElement && active.closest('[data-board-overlay]') !== null
      const inScope = active === document.body || active === null || inOverlay || (active instanceof Node && root.contains(active))
      if (!inScope) return
      if (selectedIds.size) {
        e.preventDefault()
        deleteSelected()
      }
    }
  })

  // 🔴 改动 2026-10-12 · food 卡形态切换：按住 Tab 作修饰键，Q 图标 / W 节点 / E 组件 / R 卡片。
  // 🔴 改动 2026-10-12 · 形态切换扩展到 character / recipe 卡（同一套四形态体系，快捷键一致）。
  // Tab 只在「选中资产卡且焦点在画板作用域」时 preventDefault 接管（否则保留原生焦点导航）；
  // 作用域判定与 Del 同规则（页面本体 / 画板内 / data-board-overlay 浮窗）。
  let tabHeld = false
  const FOOD_FORM_KEYS: Record<string, FoodForm> = { q: 'icon', w: 'node', e: 'info', r: 'card' }
  const selectedAssetCards = () => board.cards.filter((c) => isAssetCard(c.type) && selectedIds.has(c.id))
  const foodKeyInScope = (e: KeyboardEvent): boolean => {
    const t = e.target
    if (t instanceof HTMLElement && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT')) return false
    if (editingId) return false
    const active = document.activeElement
    const inOverlay = active instanceof HTMLElement && active.closest('[data-board-overlay]') !== null
    return active === document.body || active === null || inOverlay || (active instanceof Node && root.contains(active))
  }
  on<KeyboardEvent>(document, 'keydown', (e) => {
    if (disposed || childClose) return
    if (e.key === 'Tab') {
      if (!selectedAssetCards().length || !foodKeyInScope(e)) return
      e.preventDefault()
      tabHeld = true
      return
    }
    if (!tabHeld || e.repeat || e.isComposing) return
    const form = FOOD_FORM_KEYS[e.key.toLowerCase()]
    if (!form) return
    e.preventDefault()
    for (const c of selectedAssetCards()) setAssetForm(c, form)
  })
  on<KeyboardEvent>(document, 'keyup', (e) => {
    if (e.key === 'Tab') tabHeld = false
  })
  on<FocusEvent>(window, 'blur', () => {
    tabHeld = false
  })

  // 点击画板外（卷轴/地球/顶栏…）→ 失焦并清空选择，随后 Del 不会误删卡片
  on<PointerEvent>(
    document,
    'pointerdown',
    (e) => {
      if (disposed || childClose) return
      if (e.target instanceof Node && !root.contains(e.target)) {
        blurEditing()
        clearSelection()
      }
    },
    { capture: true },
  )

  // ---------- 初始渲染 ----------
  // 🔴 改动 2026-10-12 · 挂载时先级联清理：卖出连线已消失的失效收益节点连同其直连连线一并删除
  pruneRevenue()
  for (const card of board.cards) renderCard(card)
  renderLines()
  applyViewport()

  // ---------- 对外句柄 ----------
  function setTheme(dark: boolean) {
    root.classList.toggle('sr-board-dark', dark)
    // 子画板打开期间切换主题时联动换肤（复刻 Evoloop 单一深色画板的语义扩展）
    childEngine?.setTheme(dark)
  }
  function dispose() {
    if (disposed) return
    // 🔴 改动 2026-10-12 · 销毁前取消进行中的端口拖拽连线（document 级监听一并摘除）
    cancelWireDrag()
    // 先关闭子画板（子的最终修改经 onPersist 回流到父级），再 flush 父文档
    if (childClose) childClose()
    persist()
    disposed = true
    // 🔴 改动 2026-10-13 · 注销 Ctrl+A 定向登记
    liveBoards.delete(liveEntry)
    if (mainBoardEntry === liveEntry) mainBoardEntry = null
    window.clearTimeout(saveTimer)
    window.clearTimeout(viewSaveTimer)
    ac.abort()
    root.replaceChildren()
    root.classList.remove('sr-board', 'sr-board-dark', 'sr-panning', 'sr-connecting')
  }
  // 🔴 改动 2026-10-10 · 对外暴露「添加卡片」：侧边栏循环浮窗的工具入口（line 进连线模式，note 直接进编辑，其余在画布中心建卡）
  function addCard(type: 'note' | 'todo' | 'line' | 'board') {
    if (disposed || childClose) return
    if (type === 'line') enterConnectMode()
    else createCard(type, undefined, undefined, type === 'note')
  }
  // 🔴 改动 2026-10-11 · 对外暴露「添加实物卡」：侧栏「实物」浮窗点击入口（画布中心落卡）
  function addFoodCard(foodId: string) {
    if (disposed || childClose) return
    createFoodCard(foodId)
  }
  // 🔴 改动 2026-10-12 · 对外暴露「添加角色卡 / 配方卡」：侧栏「角色」「配方」浮窗点击入口（画布中心落卡）
  function addCharacterCard(characterId: string) {
    if (disposed || childClose) return
    createCharacterCard(characterId)
  }
  function addRecipeCard(recipeId: string) {
    if (disposed || childClose) return
    createRecipeCard(recipeId)
  }
  // 🔴 改动 2026-10-12 · 对外暴露「添加菜品卡」：侧栏「菜品」浮窗点击入口（画布中心落卡）
  function addDishCard(dishId: string) {
    if (disposed || childClose) return
    createDishCard(dishId)
  }
  // 🔴 改动 2026-10-12 · 对外暴露「添加市场卡」：侧栏「市场」浮窗点击入口（画布中心落卡）
  function addMarketCard(marketId: string) {
    if (disposed || childClose) return
    createMarketCard(marketId)
  }
  // 🔴 改动 2026-10-11 · 画板文档访问（拆分视图共享同一引用 / 标题浮窗读写名称）
  function getDoc(): BoardDoc {
    return board
  }
  function setTitle(title: string) {
    board.title = title
    scheduleSave()
  }
  // 🔴 改动 2026-10-11 · 拆分视图同步：共享文档被另一窗格修改后清卡重渲
  function syncFromDoc() {
    if (disposed) return
    // 🔴 改动 2026-10-12 · 另一窗格删掉卖出连线时，本窗格同步级联清理收益节点及其直连连线
    pruneRevenue()
    blurEditing()
    clearSelection()
    for (const el of cardEls.values()) el.remove()
    cardEls.clear()
    for (const card of board.cards) renderCard(card)
    renderLines()
    applyViewport()
  }
  // 🔴 改动 2026-10-11 · 顶栏 View：读取当前缩放 / 按百分比缩放到画布中心（复刻 Evoloop setZoom 的 90–120% 吸附）
  function getZoom(): number {
    return view.zoom
  }
  function setZoomPct(percent: number) {
    if (disposed || childClose) return
    let next = clamp(percent / 100, ZOOM_MIN, ZOOM_MAX)
    const pct = next * 100
    if (pct >= 90 && pct <= 120 && Math.abs(next - 1) <= Math.abs(view.zoom - 1)) next = 1
    const rect = root.getBoundingClientRect()
    const mx = rect.width / 2
    const my = rect.height / 2
    const wx = (mx - view.x) / view.zoom
    const wy = (my - view.y) / view.zoom
    view.x = mx - wx * next
    view.y = my - wy * next
    view.zoom = next
    applyViewport()
    scheduleSave()
  }
  // 🔴 改动 2026-10-13 · 技能释放：「运行」激活未循环链路为收益线程；「运转」激活已循环链路为收益循环。
  // 屏幕坐标 → 世界坐标 → 命中对应类型的外框（含收益节点，FRAME_PAD 同渲染口径）；返回是否命中并激活。
  // 激活后：框线范围内的链路抽取为子画板文档（从本画板移除），经 onChainActivated 交给页面层挂 Tab。
  function activateChainAt(screenX: number, screenY: number, skillKey: 'play' | 'operate'): boolean {
    if (disposed || childClose) return false
    const w = screenToWorld(screenX, screenY)
    const chain = computeChains().find((c) => {
      if (c.activated) return false
      // 已形成循环的链路只接受「运转」；未循环的链路只接受「运行」
      if (skillKey === 'play' ? c.loop : !c.loop) return false
      return w.x >= c.rect.x && w.x <= c.rect.x + c.rect.w && w.y >= c.rect.y && w.y <= c.rect.y + c.rect.h
    })
    if (!chain) return false
    chain.revenue.meta.activated = true
    const kind: 'thread' | 'loop' = chain.loop ? 'loop' : 'thread'
    // 🔴 改动 2026-10-13 · 命名：卖出资产名称 + 买入方资产名称 + 收益 + 线程/循环
    const sale = board.lines.find((l) => l.id === chain.revenue.meta.sale)
    const seller = sale ? assetCardName(board.cards.find((c) => c.id === sale.from)!) : '资产'
    const buyer = sale ? assetCardName(board.cards.find((c) => c.id === sale.to)!) : '采购方'
    const title = `${seller}+${buyer}收益${kind === 'loop' ? '循环' : '线程'}`
    // 抽取子画板文档：链路成员 + 链路内连线，坐标平移到画板原点（外框左上角）
    const PAD = 40
    const memberIds = new Set(chain.cone)
    const subCards = board.cards
      .filter((c) => memberIds.has(c.id))
      .map((c) => ({ ...c, x: c.x - chain.rect.x + PAD, y: c.y - chain.rect.y + PAD }))
    const subLines = board.lines
      .filter((l) => memberIds.has(l.from) && memberIds.has(l.to))
      .map((l) => ({ ...l }))
    // 🔴 改动 2026-10-13 · 初始视口按浮动窗口尺寸（≈640×480）自适应：整条链路完整可见、留边不贴边
    const maxW = Math.max(...subCards.map((c) => c.x + c.w)) + PAD
    const maxH = Math.max(...subCards.map((c) => c.y + c.h)) + PAD
    const fitZoom = clamp(Math.min(1, 600 / maxW, 440 / maxH), ZOOM_MIN, ZOOM_MAX)
    const subDoc: BoardDoc = {
      title,
      viewport: { x: Math.max(8, (640 - maxW * fitZoom) / 2), y: 12, zoom: fitZoom },
      cards: subCards,
      lines: subLines,
    }
    // 从本画板移除链路（卡片 DOM + 数据）
    for (const c of board.cards) {
      if (!memberIds.has(c.id)) continue
      cardEls.get(c.id)?.remove()
      cardEls.delete(c.id)
      editHooks.delete(c.id)
      postFitHooks.delete(c.id)
    }
    board.cards = board.cards.filter((c) => !memberIds.has(c.id))
    board.lines = board.lines.filter((l) => !memberIds.has(l.from) && !memberIds.has(l.to))
    renderLines()
    scheduleSave()
    opts.onChainActivated?.({ doc: subDoc, title, kind })
    return true
  }
  // 🔴 改动 2026-10-13 · 技能栏选中态通知：'play'（运行）时高亮可激活的金色虚线框；任何技能选中都拦截画板手势
  function setSkillArmed(skill: string | null) {
    if (disposed) return
    armedSkill = skill
    root.classList.toggle('sr-skill-armed', skill !== null)
    renderLines()
  }
  // 🔴 改动 2026-10-11 · 顶栏 sync：立即落盘（绕过防抖）
  function flushSave() {
    persist()
  }
  // 🔴 改动 2026-10-11 · 顶栏 Project：外部画板文件整体替换当前文档（保持 board 引用；历史栈重置）
  function loadDoc(doc: unknown): boolean {
    if (disposed) return false
    const d = doc as Partial<BoardDoc> | null
    if (!d || typeof d !== 'object' || !Array.isArray(d.cards) || !Array.isArray(d.lines)) return false
    // 打开新文件前先退回上级（子画板文档属于旧文件）
    if (childClose) childClose()
    board.title = typeof d.title === 'string' && d.title.trim() ? d.title : '画板'
    board.cards = d.cards as BoardDoc['cards']
    board.lines = d.lines as BoardDoc['lines']
    const vp = d.viewport
    view.x = typeof vp?.x === 'number' ? vp.x : 0
    view.y = typeof vp?.y === 'number' ? vp.y : 0
    view.zoom = clamp(typeof vp?.zoom === 'number' ? vp.zoom : 1, ZOOM_MIN, ZOOM_MAX)
    // 🔴 改动 2026-10-12 · 打开外部文件后级联清理失效收益节点（卖出连线缺失时连同其直连连线删除）
    pruneRevenue()
    blurEditing()
    clearSelection()
    for (const el of cardEls.values()) el.remove()
    cardEls.clear()
    for (const card of board.cards) renderCard(card)
    renderLines()
    applyViewport()
    resetHistory()
    scheduleSave()
    return true
  }
  // 🔴 改动 2026-10-13 · 视口 API：页面层放置物（组件/图表）的画板坐标换算三件套
  function getView(): Viewport {
    return { x: view.x, y: view.y, zoom: view.zoom }
  }
  function worldToClient(wx: number, wy: number): { x: number; y: number } {
    const rect = root.getBoundingClientRect()
    return { x: rect.left + view.x + wx * view.zoom, y: rect.top + view.y + wy * view.zoom }
  }
  function isDisposed(): boolean {
    return disposed
  }
  // 🔴 改动 2026-10-13 · 登记存活引擎（Ctrl+A 定向用；dispose 时注销）
  armPointerTracker()
  const liveEntry: LiveBoardEntry = { root, isMain: opts.isMainBoard === true, pip: opts.pip === true, isSub, selectAll, receiveCards }
  liveBoards.add(liveEntry)
  if (liveEntry.isMain) mainBoardEntry = liveEntry
  // 🔴 改动 2026-10-16 · 晚绑定自身句柄（pointerdown 上报 bridge 活跃引擎的闭包引用）
  apiRef = { setTheme, dispose, addCard, addFoodCard, addCharacterCard, addRecipeCard, addDishCard, addMarketCard, getDoc, setTitle, syncFromDoc, getZoom, setZoomPct, flushSave, loadDoc, activateChainAt, setSkillArmed, clearSelection, getView, clientToWorld: screenToWorld, worldToClient, isDisposed }
  return apiRef
}
