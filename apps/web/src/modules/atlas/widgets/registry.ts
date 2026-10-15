import type { WidgetAction, WidgetDataRequirement, WidgetManifest, WidgetSettingField } from '@/widgets/contract'
import { defineWidget, type AnyWidgetDefinition } from '@/widgets/defineWidget'
import { IncomeLW } from '../components/IncomeLW'
import { ExpenseLW } from '../components/ExpenseLW'
import { CashbackLW } from '../components/CashbackLW'
import { TransfersLW } from '../components/TransfersLW'
import { ProgressLW } from '../components/ProgressLW'
import { CryptoLW } from '../components/CryptoLW'
import { PortfolioMW } from '../components/PortfolioMW'
import { SpendThisWeekMW } from '../components/SpendThisWeekMW'
import { TotalCashbackMW } from '../components/TotalCashbackMW'
import { IncomeMW } from '../components/IncomeMW'
import { ExpenseMW } from '../components/ExpenseMW'
import { TotalMW } from '../components/TotalMW'
import { ProgressSW } from '../components/ProgressSW'
import { ExpenseSW } from '../components/ExpenseSW'
import { IncomeSW } from '../components/IncomeSW'
import { CashbackSW } from '../components/CashbackSW'
import { CategorySW } from '../components/CategorySW'
import { CreditLimitSW } from '../components/CreditLimitSW'
import { Income2XSW } from '../components/Income2XSW'
import { IncomeXSW } from '../components/IncomeXSW'
import { LastTransferXSW } from '../components/LastTransferXSW'
import { OverallBalanceXLW } from '../components/OverallBalanceXLW'
import { SpendingTrendXLW } from '../components/SpendingTrendXLW'
import { SpendingTrendWidget } from '../components/SpendingTrendWidget'
import { MiniIndicatorC } from '../components/MiniIndicatorC'
import { IndicatorC } from '../components/IndicatorC'
import { PieChartC } from '../components/PieChartC'
import { ProgressChartC } from '../components/ProgressChartC'
import { BubbleChartC } from '../components/BubbleChartC'
import { HexChartC } from '../components/HexChartC'
import { LineChartV2C } from '../components/LineChartV2C'
import { CandleChartC } from '../components/CandleChartC'
import { LineChartV1C } from '../components/LineChartV1C'

/**
 * 版图 Widget 注册表 —— 架构 §09 契约的落地清单（33 个组件）
 *
 * 每个 defineWidget 登记:
 *  - manifest: type / schemaVersion / dataRequirements / settingsSchema /
 *    permissionRequirements / renderMode / supportedActions（契约必备字段）
 *  - Component: 已 props 化的渲染组件（缺省渲染设计稿默认数据）
 *  - sampleProps: 样例数据快照 = QueryProvider 接入前的兜底数据
 *
 * 展示层（卷轴/预览）通过 getAtlasWidget 取定义, 经 WidgetHost 渲染;
 * 新增组件只需在此追加一条 defineWidget。
 */

/* ---- 契约公共片段 -------------------------------------------------------- */

/** 通用动作: 预览不需要额外权限; 详情/导出按权限点收紧 */
const ACT_PREVIEW: WidgetAction = { id: 'preview', label: '放大预览' }
const ACT_DETAIL: WidgetAction = { id: 'open-detail', label: '查看资产详情', permission: 'atlas.view' }
const ACT_EXPORT: WidgetAction = { id: 'export', label: '导出数据', permission: 'atlas.data.export' }

/** 标量指标（卡片数值类） */
const reqScalar = (...fields: string[]): WidgetDataRequirement => ({
  capability: 'atlas.query_asset',
  shape: 'scalar',
  mode: 'snapshot',
  fields,
})
/** 时序（趋势/柱/折线） */
const reqSeries = (...fields: string[]): WidgetDataRequirement => ({
  capability: 'marketdata.query_series',
  shape: 'timeseries',
  mode: 'snapshot',
  fields,
})
/** 实时时序（行情类, 走 SubscriptionProvider） */
const reqRealtime = (...fields: string[]): WidgetDataRequirement => ({
  capability: 'marketdata.query_series',
  shape: 'timeseries',
  mode: 'realtime',
  fields,
})

/** 标题设置项（所有卡片通用） */
const titleSetting = (def: string): Record<string, WidgetSettingField> => ({
  title: { type: 'string', label: '标题', default: def },
})

/** manifest 构造辅助: 补全契约缺省（schemaVersion/renderMode/基础权限/预览动作） */
function manifest(m: {
  id: string
  type: string
  name: string
  nodeId: string
  w: number
  h: number
  dataRequirements?: WidgetDataRequirement[]
  settingsSchema?: Record<string, WidgetSettingField>
  permissions?: string[]
  actions?: WidgetAction[]
}): WidgetManifest {
  return {
    schemaVersion: 1,
    renderMode: 'client',
    design: { tool: 'Pixso', nodeId: m.nodeId },
    defaultSize: { w: m.w, h: m.h },
    dataRequirements: m.dataRequirements ?? [],
    settingsSchema: m.settingsSchema ?? {},
    permissionRequirements: m.permissions ?? ['atlas.view'],
    supportedActions: m.actions ?? [ACT_PREVIEW, ACT_DETAIL],
    id: m.id,
    type: m.type,
    name: m.name,
  }
}

/* ---- Widgets & Indicator 页（24 个统计/指标组件） ------------------------ */

const incomeL = defineWidget({
  manifest: manifest({
    id: 'atlas.income-l', type: 'stat-card', name: '收入组件 / L', nodeId: '65:3554', w: 188, h: 254,
    dataRequirements: [reqScalar('value'), reqSeries('bars')],
    settingsSchema: titleSetting('收入'),
  }),
  Component: IncomeLW,
  sampleProps: {},
})

const expenseL = defineWidget({
  manifest: manifest({
    id: 'atlas.expense-l', type: 'stat-card', name: '支出组件 / L', nodeId: '65:3576', w: 188, h: 254,
    dataRequirements: [reqScalar('value'), reqSeries('cols')],
    settingsSchema: titleSetting('支出'),
  }),
  Component: ExpenseLW,
  sampleProps: {},
})

const cashbackL = defineWidget({
  manifest: manifest({
    id: 'atlas.cashback-l', type: 'stat-card', name: '返现组件 / L', nodeId: '65:3595', w: 188, h: 254,
    dataRequirements: [reqScalar('value', 'progress'), { capability: 'atlas.query_asset', shape: 'categorical', mode: 'snapshot', fields: ['categories'] }],
    settingsSchema: titleSetting('返现'),
  }),
  Component: CashbackLW,
  sampleProps: {},
})

const transfersL = defineWidget({
  manifest: manifest({
    id: 'atlas.transfers-l', type: 'stat-card', name: '转账组件 / L', nodeId: '65:3619', w: 188, h: 254,
    dataRequirements: [reqScalar('value', 'percent')],
    settingsSchema: titleSetting('转账'),
  }),
  Component: TransfersLW,
  sampleProps: {},
})

const progressL = defineWidget({
  manifest: manifest({
    id: 'atlas.progress-l', type: 'progress', name: '进度组件 / L', nodeId: '65:3634', w: 296, h: 184,
    dataRequirements: [reqScalar('percent', 'ratio', 'attachments', 'tasks', 'avatars')],
    settingsSchema: titleSetting('金融应用'),
  }),
  Component: ProgressLW,
  sampleProps: {},
})

const cryptoL = defineWidget({
  manifest: manifest({
    id: 'atlas.crypto-l', type: 'stat-card', name: '加密货币 / L', nodeId: '65:3658', w: 216, h: 310,
    dataRequirements: [reqRealtime('value', 'amount', 'trend', 'symbol', 'name', 'date')],
    settingsSchema: titleSetting('加密货币'),
  }),
  Component: CryptoLW,
  sampleProps: {},
})

const portfolioM = defineWidget({
  manifest: manifest({
    id: 'atlas.portfolio-m', type: 'stat-card', name: '投资组合 / M', nodeId: '65:3675', w: 184, h: 220,
    dataRequirements: [reqScalar('value', 'trend', 'trendValue')],
    settingsSchema: titleSetting('投资组合'),
  }),
  Component: PortfolioMW,
  sampleProps: {},
})

const spendWeekM = defineWidget({
  manifest: manifest({
    id: 'atlas.spend-week-m', type: 'stat-card', name: '本周消费 / M', nodeId: '65:3685', w: 182, h: 220,
    dataRequirements: [reqScalar('value', 'trend'), reqSeries('bars')],
    settingsSchema: titleSetting('本周消费'),
  }),
  Component: SpendThisWeekMW,
  sampleProps: {},
})

const totalCashbackM = defineWidget({
  manifest: manifest({
    id: 'atlas.total-cashback-m', type: 'stat-card', name: '累计返现 / M', nodeId: '65:3712', w: 182, h: 220,
    dataRequirements: [reqScalar('value', 'trend', 'progress'), { capability: 'atlas.query_asset', shape: 'categorical', mode: 'snapshot', fields: ['categories'] }],
    settingsSchema: titleSetting('累计返现'),
  }),
  Component: TotalCashbackMW,
  sampleProps: {},
})

const incomeM = defineWidget({
  manifest: manifest({
    id: 'atlas.income-m', type: 'stat-card', name: '收入 / M', nodeId: '65:3746', w: 197, h: 214,
    dataRequirements: [reqScalar('value', 'trend'), reqSeries('bars')],
    settingsSchema: titleSetting('收入'),
  }),
  Component: IncomeMW,
  sampleProps: {},
})

const expenseM = defineWidget({
  manifest: manifest({
    id: 'atlas.expense-m', type: 'stat-card', name: '支出 / M', nodeId: '65:3763', w: 197, h: 214,
    dataRequirements: [reqScalar('value', 'trend'), reqSeries('bars')],
    settingsSchema: titleSetting('支出'),
  }),
  Component: ExpenseMW,
  sampleProps: {},
})

const totalM = defineWidget({
  manifest: manifest({
    id: 'atlas.total-m', type: 'stat-card', name: '总计 / M', nodeId: '65:3780', w: 197, h: 214,
    dataRequirements: [reqScalar('value', 'trend', 'percent')],
    settingsSchema: titleSetting('去年'),
  }),
  Component: TotalMW,
  sampleProps: {},
})

const progressS = defineWidget({
  manifest: manifest({
    id: 'atlas.progress-s', type: 'ring', name: '进度 / S', nodeId: '65:3791', w: 106, h: 141,
    dataRequirements: [reqScalar('value', 'label')],
    settingsSchema: titleSetting('住房'),
  }),
  Component: ProgressSW,
  sampleProps: {},
})

const expenseS = defineWidget({
  manifest: manifest({
    id: 'atlas.expense-s', type: 'stat-card', name: '支出 / S', nodeId: '65:3798', w: 165, h: 138,
    dataRequirements: [reqScalar('value'), reqSeries('bars')],
    settingsSchema: titleSetting('支出'),
  }),
  Component: ExpenseSW,
  sampleProps: {},
})

const categoryS = defineWidget({
  manifest: manifest({
    id: 'atlas.category-s', type: 'stat-card', name: '分类 / S', nodeId: '65:3811', w: 166, h: 157,
    dataRequirements: [reqScalar('value', 'icon')],
    settingsSchema: titleSetting('餐饮'),
  }),
  Component: CategorySW,
  sampleProps: {},
})

const incomeS = defineWidget({
  manifest: manifest({
    id: 'atlas.income-s', type: 'stat-card', name: '收入 / S', nodeId: '65:3818', w: 165, h: 137,
    dataRequirements: [reqScalar('value'), reqSeries('cols')],
    settingsSchema: titleSetting('收入'),
  }),
  Component: IncomeSW,
  sampleProps: {},
})

const cashbackS = defineWidget({
  manifest: manifest({
    id: 'atlas.cashback-s', type: 'stat-card', name: '返现 / S', nodeId: '65:3830', w: 165, h: 138,
    dataRequirements: [reqScalar('value'), reqSeries('bars')],
    settingsSchema: titleSetting('返现'),
  }),
  Component: CashbackSW,
  sampleProps: {},
})

const creditLimitS = defineWidget({
  manifest: manifest({
    id: 'atlas.credit-limit-s', type: 'stat-card', name: '信用额度 / S', nodeId: '65:3843', w: 165, h: 137,
    dataRequirements: [reqScalar('value'), reqSeries('bars')],
    settingsSchema: titleSetting('信用额度'),
  }),
  Component: CreditLimitSW,
  sampleProps: {},
})

const income2XS = defineWidget({
  manifest: manifest({
    id: 'atlas.income2-xs', type: 'stat-card', name: '收入 2 / XS', nodeId: '65:3855', w: 238, h: 74,
    dataRequirements: [reqScalar('value', 'delta')],
    settingsSchema: titleSetting('收入'),
  }),
  Component: Income2XSW,
  sampleProps: {},
})

const incomeXS = defineWidget({
  manifest: manifest({
    id: 'atlas.income-xs', type: 'stat-card', name: '收入 / XS', nodeId: '65:3864', w: 216, h: 68,
    dataRequirements: [reqScalar('value')],
    settingsSchema: titleSetting('收入'),
  }),
  Component: IncomeXSW,
  sampleProps: {},
})

const lastTransferXS = defineWidget({
  manifest: manifest({
    id: 'atlas.last-transfer-xs', type: 'stat-card', name: '最近转账 / XS', nodeId: '65:3872', w: 216, h: 68,
    dataRequirements: [reqScalar('value', 'avatarSrc', 'hasUnread')],
    settingsSchema: {
      ...titleSetting('最近转账'),
      hasUnread: { type: 'boolean', label: '未读徽标', default: true },
    },
  }),
  Component: LastTransferXSW,
  sampleProps: {},
})

const overallBalanceXL = defineWidget({
  manifest: manifest({
    id: 'atlas.overall-balance-xl', type: 'bar-chart', name: '总余额 / XL', nodeId: '65:3880', w: 1162, h: 308,
    dataRequirements: [reqSeries('columns', 'axisLabels'), { capability: 'atlas.query_asset', shape: 'categorical', mode: 'snapshot', fields: ['legends'] }],
    settingsSchema: {
      ...titleSetting('总余额'),
      periodLabel: { type: 'string', label: '周期按钮', default: '上个月' },
    },
    actions: [ACT_PREVIEW, ACT_DETAIL, ACT_EXPORT],
  }),
  Component: OverallBalanceXLW,
  sampleProps: {},
})

const spendingTrendXL = defineWidget({
  manifest: manifest({
    id: 'atlas.spending-trend-xl', type: 'bar-chart', name: '消费趋势 / XL', nodeId: '65:4019', w: 582, h: 582,
    dataRequirements: [reqSeries('columns', 'dates'), { capability: 'atlas.query_asset', shape: 'categorical', mode: 'snapshot', fields: ['categories'] }],
    settingsSchema: {
      ...titleSetting('消费趋势'),
      legendDesc: { type: 'string', label: '图例描述', default: '本月支出比上月增加 20%' },
    },
    actions: [ACT_PREVIEW, ACT_DETAIL, ACT_EXPORT],
  }),
  Component: SpendingTrendXLW,
  sampleProps: {},
})

const spendingTrendM = defineWidget({
  manifest: manifest({
    id: 'atlas.spending-trend-m', type: 'trend-card', name: '消费趋势 / M', nodeId: '65:3732', w: 184, h: 220,
    dataRequirements: [reqSeries('points', 'value', 'trend')],
    settingsSchema: {
      ...titleSetting('消费趋势'),
      showLabels: { type: 'boolean', label: '端点标签', default: true },
    },
  }),
  Component: SpendingTrendWidget,
  sampleProps: { title: '消费趋势', value: 87, trend: '+4.5%', timeLabel: '6月24日', valueLabel: '¥39' },
})

/* ---- Charts | 图表页（9 个图表组件） ------------------------------------- */

const miniIndicatorC = defineWidget({
  manifest: manifest({
    id: 'atlas.chart-mini-indicator', type: 'ring', name: '迷你指标环', nodeId: '63:450', w: 240, h: 50,
    dataRequirements: [reqScalar('value', 'trend')],
    settingsSchema: titleSetting('跑车'),
  }),
  Component: MiniIndicatorC,
  sampleProps: {},
})

const indicatorC = defineWidget({
  manifest: manifest({
    id: 'atlas.chart-indicator', type: 'ring', name: '指标环', nodeId: '63:460', w: 190, h: 80,
    dataRequirements: [reqScalar('percent', 'value', 'label')],
  }),
  Component: IndicatorC,
  sampleProps: {},
})

const pieChartC = defineWidget({
  manifest: manifest({
    id: 'atlas.chart-pie', type: 'pie-chart', name: '饼图', nodeId: '63:469', w: 208, h: 208,
    dataRequirements: [{ capability: 'atlas.query_asset', shape: 'categorical', mode: 'snapshot', fields: ['value', 'description'] }],
  }),
  Component: PieChartC,
  sampleProps: {},
})

const progressChartC = defineWidget({
  manifest: manifest({
    id: 'atlas.chart-progress', type: 'progress', name: '进度图', nodeId: '63:478', w: 388, h: 73,
    dataRequirements: [reqScalar('value', 'target', 'ratio')],
    settingsSchema: titleSetting('信用额度'),
  }),
  Component: ProgressChartC,
  sampleProps: {},
})

const bubbleChartC = defineWidget({
  manifest: manifest({
    id: 'atlas.chart-bubble', type: 'bubble-chart', name: '气泡图', nodeId: '63:485', w: 740, h: 711,
    dataRequirements: [{ capability: 'marketdata.query_series', shape: 'distribution', mode: 'snapshot', fields: ['percents'] }],
  }),
  Component: BubbleChartC,
  sampleProps: {},
})

const hexChartC = defineWidget({
  manifest: manifest({
    id: 'atlas.chart-hex', type: 'hex-heatmap', name: '蜂窝图', nodeId: '63:1187', w: 1063, h: 134,
    dataRequirements: [{ capability: 'marketdata.query_series', shape: 'distribution', mode: 'snapshot', fields: ['rows', 'palette'] }],
    actions: [ACT_PREVIEW, ACT_EXPORT],
  }),
  Component: HexChartC,
  sampleProps: {},
})

const lineChartV2C = defineWidget({
  manifest: manifest({
    id: 'atlas.chart-line-v2', type: 'line-chart', name: '折线图 v2', nodeId: '63:543', w: 1536, h: 457,
    dataRequirements: [reqSeries('curves', 'columns', 'months', 'yLabels')],
    permissions: ['atlas.view', 'marketdata.subscribe'],
    actions: [ACT_PREVIEW, ACT_EXPORT],
  }),
  Component: LineChartV2C,
  sampleProps: {},
})

const candleChartC = defineWidget({
  manifest: manifest({
    id: 'atlas.chart-candle', type: 'candle-chart', name: 'K 线图', nodeId: '63:658', w: 1460, h: 438.5,
    // 接入说明: candles 为预计算几何; 接行情时由适配器把 OHLC 映射为该元组数组
    dataRequirements: [{ capability: 'marketdata.query_series', shape: 'ohlc', mode: 'snapshot', fields: ['candles', 'columns', 'months'] }],
    permissions: ['atlas.view', 'marketdata.subscribe'],
    actions: [ACT_PREVIEW, ACT_EXPORT],
  }),
  Component: CandleChartC,
  sampleProps: {},
})

const lineChartV1C = defineWidget({
  manifest: manifest({
    id: 'atlas.chart-line-v1', type: 'line-chart', name: '折线图 v1', nodeId: '63:1067', w: 1063, h: 546,
    dataRequirements: [reqSeries('curves', 'dots')],
    actions: [ACT_PREVIEW, ACT_EXPORT],
  }),
  Component: LineChartV1C,
  sampleProps: {},
})

/* ---- 注册表与查询 --------------------------------------------------------- */

/** 组件与指标组（24） */
export const ATLAS_WIDGET_CARDS = [
  incomeL, expenseL, cashbackL, transfersL, progressL, cryptoL,
  portfolioM, spendWeekM, totalCashbackM, incomeM, expenseM, totalM,
  progressS, expenseS, categoryS, incomeS, cashbackS, creditLimitS,
  income2XS, incomeXS, lastTransferXS,
  overallBalanceXL, spendingTrendXL, spendingTrendM,
] satisfies AnyWidgetDefinition[]

/** 图表组（9） */
export const ATLAS_WIDGET_CHARTS = [
  miniIndicatorC, indicatorC, pieChartC, progressChartC,
  bubbleChartC, hexChartC, lineChartV2C, candleChartC, lineChartV1C,
] satisfies AnyWidgetDefinition[]

/** 全部 33 个版图 Widget */
export const ATLAS_WIDGETS: AnyWidgetDefinition[] = [...ATLAS_WIDGET_CARDS, ...ATLAS_WIDGET_CHARTS]

const BY_ID = new Map(ATLAS_WIDGETS.map((w) => [w.manifest.id, w]))

/** 按契约 id 取定义; 未登记即抛错（注册即合规, 不允许裸组件进页面） */
export function getAtlasWidget(id: string): AnyWidgetDefinition {
  const def = BY_ID.get(id)
  if (!def) throw new Error(`版图 Widget 未登记契约: ${id}`)
  return def
}
