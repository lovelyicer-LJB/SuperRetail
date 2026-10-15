import type { ComponentType } from 'react'
import type { WidgetManifest } from './contract'

/**
 * Widget 定义 = 契约清单 + 渲染组件 + 样例数据。
 *
 * P = 组件 props（数据注入面）。约定:
 *  - 组件所有数据字段均为可选 props, 缺省时渲染设计稿默认数据;
 *  - sampleProps 即「设计稿默认数据」的显式快照, 也是接 QueryProvider 前的兜底;
 *  - 正式接入后由宿主把 QueryProvider 返回的数据映射为 P 传给 Component,
 *    组件本身不感知数据来源（架构 §09: 数据通过 Provider 注入）。
 */
export interface WidgetDefinition<P extends object = Record<string, never>> {
  manifest: WidgetManifest
  Component: ComponentType<P>
  sampleProps: P
}

/** 注册辅助: 仅做类型收窄与空值防御, 不引入运行期逻辑 */
export function defineWidget<P extends object>(def: WidgetDefinition<P>): WidgetDefinition<P> {
  if (!def.manifest.id) throw new Error('Widget manifest 缺少 id')
  if (def.manifest.schemaVersion !== 1) throw new Error(`Widget ${def.manifest.id} 使用了未知 schemaVersion`)
  return def
}

/**
 * registry 里异构 WidgetDefinition 的擦除类型。
 * 只在「按 id 取定义、用 sampleProps 渲染」的通用路径上使用;
 * 需要按具体 props 传数据时, 从 defineWidget 的调用处拿到带 P 的类型。
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyWidgetDefinition = WidgetDefinition<any>
