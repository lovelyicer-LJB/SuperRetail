// 🔴 改动 2026-10-10 · 画板 React 外壳：挂载/销毁画板引擎并跟随页面明暗主题
// 🔴 改动 2026-10-11 · 拆分视图支持：引擎选项全量透传（doc 共享 / localViewport / 拆分右键回调），
// primary 实例才把句柄注册进桥接模块；onEngine 回调供父级持有引擎引用（拆分窗格互同步）。
import { useEffect, useRef } from 'react'
import { createBoardEngine, type BoardEngine, type BoardEngineOptions } from './engine'
import { notifyBoardDocChanged, notifyBoardView, registerBoardEngine } from './bridge'
import './board.css'

export interface BoardCanvasProps extends Omit<BoardEngineOptions, 'dark'> {
  dark: boolean
  /** 主实例（默认 true）：注册进 bridge 供侧边栏浮窗（循环/实物）调用 addCard；拆分次窗格传 false */
  primary?: boolean
  /** 挂载/卸载时回调引擎句柄（拆分视图父级据此互调 syncFromDoc / 取共享文档） */
  onEngine?: (engine: BoardEngine | null) => void
}

/**
 * 版图页最底层的无限画板（复刻 Evoloop）。
 * 视口/卡片/连线全部由引擎以 ref + 直接 DOM transform 驱动，不经 React 重渲染；
 * React 只负责挂载、销毁与主题同步（StrictMode 双跑下引擎 dispose 幂等，安全）。
 * 引擎选项在挂载时定型 —— 文档/拆分方向切换由父级经 key 重挂载本组件。
 */
export function BoardCanvas({ dark, primary = true, onEngine, ...opts }: BoardCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<BoardEngine | null>(null)
  // 最新 props 经 ref 供给引擎回调（onDocChange/onSplitRequest 挂载后可能换闭包），挂载期快照只取文档类定型字段
  const liveRef = useRef({ onEngine, ...opts })
  liveRef.current = { onEngine, ...opts }

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const snap = liveRef.current
    // 主题初值先给 false，由下方主题 effect 在同一帧内同步为真实值，无闪烁
    const engine = createBoardEngine(host, {
      dark: false,
      doc: snap.doc,
      isSub: snap.isSub,
      onClose: snap.onClose,
      onPersist: snap.onPersist,
      showAddMenu: snap.showAddMenu,
      localViewport: snap.localViewport,
      splitState: snap.splitState,
      onDocChange: (doc) => {
        liveRef.current.onDocChange?.(doc)
        // 🔴 改动 2026-10-11 · 主实例变更广播给顶栏订阅者（process 计数等）
        if (primary) notifyBoardDocChanged()
      },
      onSplitRequest: (dir) => liveRef.current.onSplitRequest?.(dir),
      // 🔴 改动 2026-10-13 · 画板空白右键（拆分/收起/成为主画板/删除）与技能激活子画板回调
      onBoardSplit: () => liveRef.current.onBoardSplit?.(),
      onCollapseBoard: () => liveRef.current.onCollapseBoard?.(),
      onBecomeMain: () => liveRef.current.onBecomeMain?.(),
      onDeleteBoard: () => liveRef.current.onDeleteBoard?.(),
      isMainBoard: snap.isMainBoard,
      onChainActivated: (sub) => liveRef.current.onChainActivated?.(sub),
      // 🔴 改动 2026-10-13 · 画中画（屏幕钉）标记透传：Ctrl+A 与所在大画板连带全选
      pip: snap.pip,
      // 🔴 改动 2026-10-13 · 主实例视口广播全量化（顶栏 View 百分比 + 页面层放置物画板坐标换算）
      onViewChange: (v) => {
        liveRef.current.onViewChange?.(v)
        if (primary) notifyBoardView(v)
      },
    })
    engineRef.current = engine
    if (primary) registerBoardEngine(engine)
    liveRef.current.onEngine?.(engine)
    return () => {
      liveRef.current.onEngine?.(null)
      if (primary) registerBoardEngine(null)
      engine.dispose()
      engineRef.current = null
    }
    // 引擎仅在挂载时创建一次；选项变更一律由父级 key 重挂载
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 主题跟随：挂载与每次切换时把 dark 同步进引擎（CSS 变量经 sr-board-dark 类整体换肤）
  useEffect(() => {
    engineRef.current?.setTheme(dark)
  }, [dark])

  return <div ref={hostRef} className="absolute inset-0 overflow-hidden" />
}
