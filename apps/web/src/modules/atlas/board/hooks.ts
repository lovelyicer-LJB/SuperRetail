// 🔴 改动 2026-10-11 · 画板 React hooks：顶栏控件（process 计数 / View 百分比 / sync / Project）读取引擎状态的订阅封装
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import type { BoardEngine } from './engine'
import { getBoardEngine, subscribeBoardDoc, subscribeBoardView, subscribeEngineRegistry } from './bridge'

/** 当前主画板引擎（注册/注销时自动更新；不在版图页或未挂载为 null） */
export function useBoardEngine(): BoardEngine | null {
  return useSyncExternalStore(subscribeEngineRegistry, getBoardEngine)
}

/** 文档版本号：主画板每次变更 +1（派生计数器、标题等经此重读文档） */
export function useBoardDocVersion(): number {
  const [version, setVersion] = useState(0)
  useEffect(() => subscribeBoardDoc(() => setVersion((v) => v + 1)), [])
  return version
}

/** 主画板当前缩放比（引擎未挂载为 null；滚轮/按钮缩放实时跟随） */
export function useBoardZoom(): number | null {
  const engine = useBoardEngine()
  const subscribe = useCallback((onStoreChange: () => void) => subscribeBoardView(() => onStoreChange()), [])
  return useSyncExternalStore(subscribe, () => (engine ? engine.getZoom() : null))
}
