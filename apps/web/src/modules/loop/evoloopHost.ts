// 🔴 改动 2026-10-10 · Evoloop（DSH 插件）宿主适配层 —— 把原版 client.js 移植进 SuperRetail 版图侧边栏「循环」。
//
// 适配三件套（UI/功能保持原版）：
//   1. fetch 拦截 —— client.js 的持久化走 DSH 后端路由 /_dsh/evoloop/*，移植版以 localStorage 顶替
//      （画板文档存 'sr.evoloop.board'；推送/更新/打开文件等依赖 DSH 宿主的能力返回友好降级应答）。
//   2. __ModuleLoader__ shim —— client.js 是 lazy-CJS 包装，shim 立即执行 factory 并捕获 exports；
//      require('react/jsx-runtime') 由本应用同版本 React 提供。
//   3. 子模块预载 —— 原版按需在 DSH 路由拉取 8 个 client-modules，移植版从 /evoloop/client-modules/
//      静态目录预载（注册进 window.__EVOLOOP__ 后 getClientModule 同步命中，不再发请求）。

import * as jsxRuntime from 'react/jsx-runtime'

/** client.js 经补丁暴露的画板 app 句柄（见 public/evoloop/client.js apply() 内补丁） */
export interface EvoloopApp {
  open: () => void
  close: () => void
  isOpen: () => boolean
  destroy: () => void
}

interface EvoloopClientExports {
  inject: string[]
  apply: (ctx: unknown) => void
}

declare global {
  interface Window {
    __ModuleLoader__?: { load: (def: { id: string; factory: (require: (name: string) => unknown) => unknown }) => void }
    __EVOLOOP__?: Record<string, (deps: unknown) => unknown>
    __EVOLOOP_CLIENT__?: EvoloopClientExports
    __EVOLOOP_APP__?: EvoloopApp
  }
}

const BOARD_STORAGE_KEY = 'sr.evoloop.board'
const ROUTE_PREFIX = '/_dsh/evoloop/'
/** 原版 CORE_CLIENT_MODULES，保持同序预载 */
const CLIENT_MODULES = [
  'sync',
  'version-menu',
  'process-dock',
  'todo',
  'cards-basic',
  'cards-workflow',
  'context-menu',
  'project-menu',
]

let bootPromise: Promise<EvoloopApp> | null = null
let fetchPatched = false

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** /_dsh/evoloop/* 路由的 localStorage 顶替实现 */
function handleEvoloopRoute(url: string, init: RequestInit | undefined, origFetch: typeof fetch): Promise<Response> {
  const path = url.slice(ROUTE_PREFIX.length)
  const method = (init?.method ?? 'GET').toUpperCase()

  if (path === 'board') {
    if (method === 'GET') {
      let board: unknown = null
      try {
        board = JSON.parse(window.localStorage.getItem(BOARD_STORAGE_KEY) || 'null')
      } catch {
        board = null
      }
      return Promise.resolve(jsonResponse({ ok: true, value: { board } }))
    }
    if (method === 'POST') {
      try {
        const body = JSON.parse(String(init?.body ?? '{}')) as { board?: unknown }
        window.localStorage.setItem(BOARD_STORAGE_KEY, JSON.stringify(body.board ?? null))
        return Promise.resolve(jsonResponse({ ok: true, value: { saved: true } }))
      } catch (e) {
        return Promise.resolve(jsonResponse({ ok: false, error: { message: `保存画板失败: ${String(e)}` } }))
      }
    }
  }
  if (path === 'health') return Promise.resolve(jsonResponse({ ok: true, value: { mode: 'local' } }))
  if (path === 'git-head') return Promise.resolve(jsonResponse({ ok: true, value: null }))
  if (path === 'push') return Promise.resolve(jsonResponse({ ok: false, error: { message: '本地移植版暂未配置 Git 推送' } }))
  if (path === 'update/check' || path === 'update/apply') {
    return Promise.resolve(jsonResponse({ ok: false, error: { message: '本地移植版无更新源' } }))
  }
  if (path === 'open') return Promise.resolve(jsonResponse({ ok: false, error: { message: '本地移植版暂不支持在系统中打开文件' } }))
  // 模块路由兜底：正常不会走到（子模块已预载），真走到就转投静态目录
  if (path.startsWith('module/')) return origFetch(`/evoloop/client-modules/${path.slice('module/'.length)}`, init)
  return Promise.resolve(jsonResponse({ ok: false, error: { message: `未适配的路由: ${path}` } }))
}

function installFetchInterceptor() {
  if (fetchPatched) return
  fetchPatched = true
  const origFetch = window.fetch.bind(window)
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    if (url.startsWith(ROUTE_PREFIX)) return handleEvoloopRoute(url, init, origFetch)
    return origFetch(input, init)
  }) as typeof fetch
}

function installModuleLoaderShim() {
  if (window.__ModuleLoader__) return
  window.__ModuleLoader__ = {
    load({ factory }) {
      const requireShim = (name: string): unknown => {
        if (name === 'react/jsx-runtime') return jsxRuntime
        throw new Error(`[evoloop-host] 未提供的依赖: ${name}`)
      }
      window.__EVOLOOP_CLIENT__ = factory(requireShim) as EvoloopClientExports
    },
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = src
    s.onload = () => resolve()
    s.onerror = () => reject(new Error(`脚本加载失败: ${src}`))
    document.head.appendChild(s)
  })
}

/** DSH 宿主 ctx 的最小替身：slots 头部 pill 不需要（入口在侧边栏「循环」），effect 立即执行并留存 disposer */
function buildCtxShim() {
  return {
    slots: {
      inject: () => undefined,
      register: () => undefined,
    },
    effect: (body: () => () => void) => {
      evoloopDisposer = body()
    },
  }
}

let evoloopDisposer: (() => void) | null = null

/** 销毁 Evoloop 实例（当前未使用菜单退出场景，预留给后续路由级卸载） */
export function disposeEvoloop(): void {
  evoloopDisposer?.()
  evoloopDisposer = null
  bootPromise = null
}

/** 首次调用时引导 Evoloop 客户端（幂等），返回画板 app 句柄 */
export function ensureEvoloop(): Promise<EvoloopApp> {
  if (bootPromise) return bootPromise
  bootPromise = (async () => {
    installFetchInterceptor()
    installModuleLoaderShim()
    const base = import.meta.env.BASE_URL
    for (const name of CLIENT_MODULES) {
      await loadScript(`${base}evoloop/client-modules/${name}.js`)
    }
    await loadScript(`${base}evoloop/client.js`)
    const client = window.__EVOLOOP_CLIENT__
    if (!client || typeof client.apply !== 'function') throw new Error('[evoloop-host] client.js 未注册 exports')
    client.apply(buildCtxShim())
    const app = window.__EVOLOOP_APP__
    if (!app) throw new Error('[evoloop-host] app 句柄未暴露（client.js 补丁缺失？）')
    return app
  })()
  // 引导失败后允许重试
  bootPromise.catch(() => {
    bootPromise = null
  })
  return bootPromise
}

/** 已初始化才返回 app，否则 null（关闭路径不应触发整包引导） */
export function evoloopAppOrNull(): EvoloopApp | null {
  return window.__EVOLOOP_APP__ ?? null
}

/** 侧边栏「循环」开启：引导并按真实状态打开 */
export async function openEvoloop(): Promise<void> {
  const app = await ensureEvoloop()
  if (!app.isOpen()) app.open()
}

/** 关闭（未初始化时静默跳过） */
export function closeEvoloop(): void {
  const app = evoloopAppOrNull()
  if (app && app.isOpen()) app.close()
}

/** 当前是否展开（未初始化视为 false） */
export function evoloopIsOpen(): boolean {
  const app = evoloopAppOrNull()
  return app ? app.isOpen() : false
}
