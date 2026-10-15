import { Component, type ReactNode } from 'react'
import type { AnyWidgetDefinition } from './defineWidget'

/**
 * WidgetHost —— Widget 运行期宿主
 *
 * 职责（架构 §09 / §11 的前端侧）:
 *  1. 错误边界: 单个组件渲染异常不拖垮整个仪表板, 提供重试;
 *  2. 契约标记: data-widget-id / data-widget-type 上 DOM, 供审计、E2E 与
 *     将来的 Binding（数据槽绑定）定位;
 *  3. 数据注入位: 当前渲染 sampleProps（设计稿默认数据）;
 *     接 QueryProvider 后在此把查询结果映射为组件 props。
 *
 * 视觉上零侵入: 容器为 display: contents, 不改变组件的 cqw/cqh 定位上下文。
 */

interface WidgetHostProps {
  def: AnyWidgetDefinition
  /** 覆盖 sampleProps 的数据（未来来自 QueryProvider） */
  data?: Record<string, unknown>
}

interface WidgetHostState {
  error: Error | null
}

export class WidgetHost extends Component<WidgetHostProps, WidgetHostState> {
  state: WidgetHostState = { error: null }

  static getDerivedStateFromError(error: Error): WidgetHostState {
    return { error }
  }

  componentDidCatch(error: Error) {
    // 预留: 接 observability 后上报 widgetId + 错误, 日志不含敏感参数
    console.error(`[widget:${this.props.def.manifest.id}] 渲染失败`, error)
  }

  render(): ReactNode {
    const { def, data } = this.props
    const { manifest } = def

    if (this.state.error) {
      return (
        <div
          data-widget-id={manifest.id}
          className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-[12px] border border-[#fd4438]/40 bg-[#1d1d24] font-sans"
        >
          <span className="text-[13px] text-[#d0d0da]">{manifest.name} 渲染失败</span>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="rounded-md border border-white/15 px-2.5 py-1 text-[12px] text-[#f5f5ff] transition-colors hover:bg-white/10"
          >
            重试
          </button>
        </div>
      )
    }

    return (
      <div
        data-widget-id={manifest.id}
        data-widget-type={manifest.type}
        data-schema-version={manifest.schemaVersion}
        className="contents"
      >
        <def.Component {...def.sampleProps} {...data} />
      </div>
    )
  }
}
