/**
 * 版图 Widget 契约 —— 对应架构文档 §09「组件与模块扩展规范」
 *
 * 契约字段: type / schemaVersion / dataRequirements / settingsSchema /
 *           permissionRequirements / renderMode / supportedActions
 *
 * 数据来源纪律（架构 §09）:
 *  - 组件数据通过 QueryProvider / SubscriptionProvider 注入;
 *    组件不得直接连数据库、持有数据源密钥或随意发起支付。
 *  - 本层只做「声明 + 注入点」: manifest.dataRequirements 描述需要什么数据,
 *    运行期由 WidgetHost 提供注入位（当前为 sampleProps 兜底, 接 BFF 后换成真实查询）。
 */

/** 渲染模式: client 浏览器渲染（当前全部）; server/static 为 SSR/静态快照预留 */
export type WidgetRenderMode = 'client' | 'server' | 'static'

/** 数据形态: 决定 QueryProvider 返回结构与组件 props 的映射方式 */
export type WidgetDataShape =
  | 'scalar' // 标量: 单个数值/状态
  | 'timeseries' // 时序: 折线/柱/趋势点
  | 'categorical' // 分类: 饼图份额、类目列表
  | 'ohlc' // K线: 开高低收
  | 'distribution' // 分布: 气泡/蜂窝等位置+权重数据

/** 数据时效: snapshot 一次性查询; realtime 订阅推送（走 SubscriptionProvider） */
export type WidgetDataMode = 'snapshot' | 'realtime'

/** 一项数据需求 —— 对应一个能力接口用例（架构 §08） */
export interface WidgetDataRequirement {
  /** 能力/查询 ID, 与模块 manifest capabilities 对齐, 如 marketdata.query_series */
  capability: string
  shape: WidgetDataShape
  mode: WidgetDataMode
  /** 语义字段清单（文档化, 正式接入时升级为 JSON Schema 校验） */
  fields: string[]
}

/** 设置项字段（settingsSchema 的 lite 版, 足够驱动设置面板与持久化校验） */
export type WidgetSettingField =
  | { type: 'string'; label: string; default: string }
  | { type: 'number'; label: string; default: number; min?: number; max?: number }
  | { type: 'boolean'; label: string; default: boolean }
  | { type: 'select'; label: string; default: string; options: Array<{ value: string; label: string }> }

/** 组件对外动作: 点击/下钻/导出等, 由宿主（仪表板）统一路由到领域服务 */
export interface WidgetAction {
  id: string
  label: string
  /** 执行该动作需要的权限点; 缺省表示跟随 permissionRequirements */
  permission?: string
}

/** Widget 清单 —— 注册即合规, 缺字段不允许进 registry */
export interface WidgetManifest {
  /** 全局唯一 ID, 如 atlas.income-l */
  id: string
  /** 组件类型（渲染分桶）: stat-card / trend-card / ring / progress / line-chart / candle-chart / pie-chart / bubble-chart / hex-heatmap */
  type: string
  /** 契约版本, 结构变更时 +1 并配迁移器（架构 §09 视图 schema 迁移） */
  schemaVersion: 1
  /** 中文名（列表/设置面板展示） */
  name: string
  /** 设计溯源: 1:1 还原出处 */
  design?: { tool: 'Pixso'; nodeId: string }
  /** 设计稿原始尺寸（px）, 也是预览与仪表板落位的初始尺寸 */
  defaultSize: { w: number; h: number }
  /** 数据需求清单; 空数组 = 纯装饰组件 */
  dataRequirements: WidgetDataRequirement[]
  /** 用户可配项（标题/开关等）, 数据不放在这里 */
  settingsSchema: Record<string, WidgetSettingField>
  /** 渲染该组件所需权限点 */
  permissionRequirements: string[]
  renderMode: WidgetRenderMode
  supportedActions: WidgetAction[]
}
