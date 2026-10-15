// 🔴 改动 2026-10-11 · 中/英语言切换 —— 移植 Evoloop 顶栏语言下拉的 SuperRetail 形态（入口在顶栏「设置」菜单）。
// 覆盖范围：外壳 chrome（顶栏 / 侧边栏 / 浮窗 / 画板工具控件）；页面深层内容暂不做翻译。
// 偏好持久化 localStorage('sr.lang')，并同步 <html lang>。
/* eslint-disable react-refresh/only-export-components -- Context Provider 与 useLang hook 同文件是 React 惯用组织方式 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Lang = 'zh' | 'en'

const STORAGE_KEY = 'sr.lang'

/** 外壳 chrome 文案字典（key → 中 / 英） */
const DICT = {
  // ---- TopMenu ----
  'nav.atlas': ['版图', 'Atlas'],
  'nav.market': ['商城', 'Market'],
  'nav.interaction': ['互动', 'Interact'],
  'nav.workshop': ['工坊', 'Workshop'],
  'top.searchPlaceholder': ['搜索', 'Search'],
  'top.notifications': ['通知', 'Notifications'],
  'top.settings': ['设置', 'Settings'],
  'top.login': ['登录', 'Sign in'],
  'top.join': ['免费加入', 'Join free'],
  'top.toLight': ['切换到浅色模式', 'Switch to light mode'],
  'top.toDark': ['切换到深色模式', 'Switch to dark mode'],
  // ---- 设置菜单 ----
  'settings.language': ['语言', 'Language'],
  'settings.update': ['检查更新', 'Check for updates'],
  'settings.currentVersion': ['当前版本', 'Current version'],
  'settings.checking': ['正在检查更新…', 'Checking for updates…'],
  'settings.upToDate': ['已是最新版本（本地移植版）', "You're up to date (local build)"],
  // ---- process 计数（铃铛左侧） ----
  'counter.title': ['已完成任务', 'Completed tasks'],
  // ---- 画板工具（顶栏右侧） ----
  'project.title': ['项目 · 打开画板文件', 'Project · Open board file'],
  'project.invalid': ['文件不是有效的画板 JSON', 'Not a valid board JSON file'],
  'project.openFailed': ['打开失败', 'Failed to open'],
  'view.title': ['视图缩放', 'View zoom'],
  'sync.title': ['同步 · 立即保存', 'Sync · Save now'],
  'sync.done': ['已同步', 'Synced'],
  // ---- SideRail ----
  'rail.overview': ['概览', 'Overview'],
  'rail.charts': ['图表', 'Charts'],
  'rail.brands': ['品牌', 'Brands'],
  'rail.news': ['新闻', 'News'],
  'rail.loop': ['循环', 'Loop'],
  // 🔴 改动 2026-10-11 · 「实物」侧栏入口 + 浮窗文案（食品原材料卡）
  'rail.physical': ['实物', 'Goods'],
  // 🔴 改动 2026-10-12 · 「角色」「配方」侧栏入口 + 浮窗文案（工坊角色卡 / 配方卡）
  'rail.characters': ['角色', 'Roles'],
  'rail.recipes': ['配方', 'Recipes'],
  // 🔴 改动 2026-10-12 · 「菜品」侧栏入口 + 浮窗文案（工坊菜品卡）
  'rail.dishes': ['菜品', 'Dishes'],
  // 🔴 改动 2026-10-12 · 「市场」侧栏入口 + 浮窗文案（工坊市场卡：用户 / 采购方）
  'rail.market': ['市场', 'Market'],
  // 🔴 改动 2026-10-11 · 「工具」侧栏入口（模块仓库）+ 栏内模块右键移除/空栏落点文案
  'rail.tools': ['工具', 'Tools'],
  'rail.remove': ['从侧边栏移除', 'Remove from sidebar'],
  'rail.dropHere': ['从「工具」面板拖模块到这里', 'Drag modules here from the Tools panel'],
  'rail.search': ['检索', 'Search'],
  'rail.feedback': ['反馈', 'Feedback'],
  'rail.help': ['帮助', 'Help'],
  'rail.settings': ['设置', 'Settings'],
  // ---- 浮窗 ----
  'panel.loop': ['循环', 'Loop'],
  'panel.loopSub': ['点击在中心创建 · 拖放到画板', 'Click to create at center · Drag onto board'],
  'panel.loopClose': ['收起循环面板', 'Collapse Loop panel'],
  'panel.physical': ['实物', 'Goods'],
  'panel.physicalSub': ['地理标志与农产品原材料 · 点击创建 · 拖入画板', 'GI & farm ingredients · Click to create · Drag onto board'],
  'panel.physicalClose': ['收起实物面板', 'Collapse Goods panel'],
  // 🔴 改动 2026-10-12 · 实物列表顶部形态筛选（默认资产图标形态，可切卡片形态）
  'panel.physicalView': ['展示形态', 'View mode'],
  'panel.physicalViewIcon': ['图标', 'Icons'],
  'panel.physicalViewCard': ['卡片', 'Cards'],
  // 🔴 改动 2026-10-12 · 「角色」「配方」浮窗文案（形态筛选复用 panel.physicalView* 键）
  'panel.characters': ['角色', 'Roles'],
  'panel.charactersSub': ['厨师与服务角色 · 点击创建 · 拖入画板', 'Chefs & service roles · Click to create · Drag onto board'],
  'panel.charactersClose': ['收起角色面板', 'Collapse Roles panel'],
  'panel.recipes': ['配方', 'Recipes'],
  'panel.recipesSub': ['食品配方资产 · 点击创建 · 拖入画板', 'Food recipe assets · Click to create · Drag onto board'],
  'panel.recipesClose': ['收起配方面板', 'Collapse Recipes panel'],
  // 🔴 改动 2026-10-12 · 「菜品」浮窗文案（形态筛选复用 panel.physicalView* 键）
  'panel.dishes': ['菜品', 'Dishes'],
  'panel.dishesSub': ['成品菜品资产 · 点击创建 · 拖入画板', 'Finished dish assets · Click to create · Drag onto board'],
  'panel.dishesClose': ['收起菜品面板', 'Collapse Dishes panel'],
  // 🔴 改动 2026-10-12 · 「市场」浮窗文案（形态筛选复用 panel.physicalView* 键）
  'panel.market': ['市场', 'Market'],
  'panel.marketSub': ['用户与采购方资产 · 点击创建 · 拖入画板', 'User & buyer assets · Click to create · Drag onto board'],
  'panel.marketClose': ['收起市场面板', 'Collapse Market panel'],
  'panel.brands': ['品牌', 'Brands'],
  'panel.brandsClose': ['收起品牌面板', 'Collapse Brands panel'],
  // 🔴 改动 2026-10-11 · 「工具」浮窗（侧边栏模块仓库）文案
  'panel.tools': ['工具', 'Tools'],
  // 🔴 改动 2026-10-13 · 工具浮窗支持「栏内按钮拖回本列表移除」，补充拖回提示文案
  'panel.toolsSub': ['未上栏的拖到侧边栏添加 · 栏内图标可拖拽排序、右键移除 · 拖回本列表移除', 'Drag onto the sidebar to add · drag icons to reorder · right-click or drag back here to remove'],
  'panel.toolsClose': ['收起工具面板', 'Collapse Tools panel'],
  'panel.toolsAdded': ['已添加', 'Added'],
  'panel.toolsDrag': ['按住拖到侧边栏', 'Hold and drag onto the sidebar'],
  'panel.toolsOnRail': ['已在侧边栏，不可重复添加', 'Already on the sidebar'],
  'panel.toolsDropOut': ['放手移出侧边栏', 'Drop to remove from sidebar'],
  'panel.toolsDragging': ['即将移出侧边栏', 'Will be removed'],
  'panel.charts': ['图表', 'Charts'],
  'panel.chartsClose': ['收起图表面板', 'Collapse Charts panel'],
  // ---- 画板标题栏 ----
  'board.path': ['版图', 'Atlas'],
  'board.nameAria': ['画板名称（可编辑）', 'Board name (editable)'],
  // ---- 画板工具 / 内容类型（循环浮窗；🔴 改动 2026-10-11 · 规划浮窗已随侧边栏入口删除） ----
  'tool.note': ['笔记', 'Note'],
  'tool.todo': ['待办', 'To-do'],
  'tool.line': ['连线', 'Line'],
  'tool.board': ['画板', 'Board'],
  'type.link': ['链接', 'Link'],
  'type.workflow': ['WorkFlow', 'WorkFlow'],
  'type.column': ['分栏', 'Columns'],
  'type.comment': ['评论', 'Comment'],
  'type.table': ['表格', 'Table'],
  'type.sketch': ['草图', 'Sketch'],
  'type.color': ['色块', 'Color'],
  'type.document': ['文档', 'Document'],
  'type.audio': ['音频', 'Audio'],
  'type.map': ['地图', 'Map'],
  'type.video': ['视频', 'Video'],
  'type.image': ['图片', 'Image'],
  'type.upload': ['上传', 'Upload'],
  'type.draw': ['绘图', 'Draw'],
  'loop.tipCreate': ['点击在中心创建，可拖放到画板', 'Click to create at center · drag onto board'],
  'loop.tipSoon': ['即将支持', 'Coming soon'],
  // ---- 图表浮窗 ----
  'charts.sub': ['拖到画板放置 · 点击放大预览', 'Drag onto the board to place · click to preview'],
  'charts.groupWidgets': ['组件与指标', 'Widgets & Metrics'],
  'charts.groupCharts': ['图表', 'Charts'],
  'charts.items': ['组件', 'items'],
  // 🔴 改动 2026-10-13 · 互动页（3D 品牌星球）文案
  'interaction.hint': ['拖动空白平移 · 滚轮缩放 · 拖动星球移位 · 点击星球查看品牌', 'Drag empty space to pan · scroll to zoom · drag planets to move · click a planet for details'],
  'interaction.selected': ['已选中品牌星球', 'Selected brand planet'],
  'interaction.closeCard': ['收起品牌卡片', 'Close brand card'],
} as const

export type DictKey = keyof typeof DICT

interface LangContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: DictKey) => string
}

const LangContext = createContext<LangContextValue | null>(null)

function readInitialLang(): Lang {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'zh'
  } catch {
    return 'zh'
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readInitialLang)

  const setLang = (next: Lang) => {
    setLangState(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* localStorage 不可用时仅内存态 */
    }
  }

  useEffect(() => {
    document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN'
  }, [lang])

  const t = (key: DictKey): string => DICT[key][lang === 'en' ? 1 : 0]

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>
}

/** 取语言上下文；必须在 LanguageProvider 内使用 */
export function useLang(): LangContextValue {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang 必须在 <LanguageProvider> 内使用')
  return ctx
}
