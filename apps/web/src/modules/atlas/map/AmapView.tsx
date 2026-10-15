// 🔴 改动 2026-10-12 · 高德真底图视图（配置 Key 后启用）。
// 🔴 改动 2026-10-14 · 去掉三级 LOD（华为云风格世界封面 / 点击下钻省级）：单图原生高德底图，
//  缩放级别完全交给高德 API 默认值（滚轮缩放 / 拖拽平移均为高德原生手势）。
//  2.5D 俯视为独立功能保留（原 LOD3 省级层能力上浮到单层地图）：右侧 2.5D 按钮 / 鼠标中键切换。
// 🔴 改动 2026-10-14 · GI 点位聚合改为自绘网格聚合（64px 屏格，zoomend/moveend 重算）：
//  高德 MarkerCluster 插件在程序化缩放后内部状态与 DOM 渲染脱节（实测 clustersCount=1 但零 DOM，
//  moveEnd/setData/setMap 重挂均不恢复），自绘聚合对悬停/点击/缩放全链路可控。
//  聚合泡与单个散点悬停均弹液态玻璃信息面板；单击散点按注册行政级别自动缩放
//  （省级 6 / 市级 9 / 区县级 11，见 gi.ts）；单击聚合泡放大两级自动散开。
// 🔴 改动 2026-10-14 · 悬停浮窗内的条目亦可点击：面板成员直接携带点位（n/t 展示 + p/c 跳转），
//  点条目 = 点该产品散点，同样按注册行政级别 setZoomAndCenter 到该产品区域层级（聚合泡内逐个可选）。
//  12 款在册资产（sr=1）不参与聚合，独立 ✦ 金标：悬停弹面板、点击弹资产小卡。
import { useEffect, useRef, useState } from 'react'
import { GI_LEVEL_ZOOM, giLevelOf, loadGiPoints, type GiPoint } from './gi'
import { loadAmap } from './amap'
import './atlas-map.css'

/** AMap JS API 2.0 的最小结构（运行期注入，无官方类型包，按 any 处理） */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AMapNS = any

/** 🔴 改动 2026-10-14 · 地图实例句柄（自动化验证取缩放级别用） */
const mapRef: { current: AMapNS } = { current: null }

export function AmapView({ dark }: { dark: boolean }) {
  const host = useRef<HTMLDivElement>(null)
  // 🔴 改动 2026-10-14 · 浮窗独立覆盖层：作为地图容器的兄弟节点（不在地图容器内），
  //  否则高德在地图容器上按下的拖拽/点击处理会吃掉面板内的指针事件（点击条目时地图先被拖动）。
  const overlay = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'loading' | 'failed' | 'ready'>('loading')
  // 🔴 改动 2026-10-14 · 2.5D 俯视（从 LOD3 省级层恢复到单层地图）：俯视态（按钮高亮/角标文案）
  const [tilted, setTilted] = useState(false)
  // 用 ref 镜像俯视态，供原生 mousedown 监听读最新值（避免陈旧闭包）
  const tiltedRef = useRef(false)
  // 中键切换的延迟定时器句柄：cleanup 里 clearTimeout，避免卸载后残留
  const middleTiltTimer = useRef<number | null>(null)

  // 🔴 改动 2026-10-14 · 2.5D 显式入口：任意缩放级直接压/抬 pitch（按钮 / 中键共用）
  const applyTilt = (next: boolean) => {
    const map = mapRef.current
    if (!map) return
    map.setPitch(next ? 55 : 0)
    tiltedRef.current = next
    setTilted(next)
  }
  const toggleTilt = () => applyTilt(!tiltedRef.current)

  // 🔴 改动 2026-10-14 · 原由 ChinaMap 外壳负责的高德 JS API 加载收进本组件（LOD 外壳已删除）
  useEffect(() => {
    let alive = true
    loadAmap().then((a) => {
      if (!alive) return
      setStatus(a ? 'ready' : 'failed')
    })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (status !== 'ready') return
    const AMap = window.AMap as AMapNS
    if (!AMap || !host.current || !overlay.current) return
    // 原生高德：不限制 zooms、不覆盖 skyColor，缩放级别用 API 默认。
    // viewMode '3D' + pitch 0 平面呈现，同时允许 setPitch 进入 2.5D 俯视；
    // pitchEnable/rotateEnable 关闭高德自身俯仰/旋转手势（中键改为「切换俯视」快捷键，见下方监听）。
    const map = new AMap.Map(host.current, {
      viewMode: '3D',
      zoom: 4,
      center: [104.5, 36.5],
      mapStyle: dark ? 'amap://styles/darkblue' : 'amap://styles/normal',
      pitch: 0,
      pitchEnable: false,
      rotateEnable: false,
    })
    mapRef.current = map
    // 深浅主题切换重建地图后恢复俯视态
    if (tiltedRef.current) map.setPitch(55)

    // 🔴 改动 2026-10-14 · 中键切换 2.5D/顶视（从 LOD3 恢复到单层地图）：捕获阶段监听 host 容器，
    // button===1 时 preventDefault 阻止浏览器中键自动滚动（Windows Chrome/Edge autoscroll 圆盘）。
    const hostEl = host.current
    const onMiddleMouseDown = (e: MouseEvent) => {
      if (e.button !== 1) return
      e.preventDefault()
      // 高德把中键绑定为俯仰手势，本次 mousedown 尚未处理完时若同步发起带缓动的 setPitch(55)，
      // 动画会被高德的中键手势处理掐断、停在首帧；推迟到下一个宏任务，等高德收尾后再走缓动才能到位。
      // 意图 next 必须在事件当下算好并闭包捕获——若在定时器里再读 tiltedRef，连点两次会算出同一个值导致不翻转。
      const next = !tiltedRef.current
      middleTiltTimer.current = window.setTimeout(() => applyTilt(next), 0)
    }
    hostEl?.addEventListener('mousedown', onMiddleMouseDown, true)

    // 🔴 改动 2026-10-13 · 悬停液态玻璃浮窗：单个共享面板元素挂在地图容器内，
    // 聚合泡 / 单个散点 / ✦ 在册资产 mouseenter 时按成员列表填充并定位到点位右侧（贴右缘自动翻转）。
    const panelEl = document.createElement('div')
    panelEl.className = 'sr-gi-panel'
    panelEl.setAttribute('role', 'tooltip')
    panelEl.style.display = 'none'
    // 🔴 改动 2026-10-14 · 挂到覆盖层（地图容器的兄弟节点），坐标仍按地图容器换算（两盒完全重合）
    overlay.current.appendChild(panelEl)
    let panelHover = false
    let panelHideTimer: number | null = null
    // 🔴 改动 2026-10-14 · 浮窗条目点击跳转：记录当前面板成员（与 innerHTML 的 data-idx 一一对应），
    //  点击回调在 GI 数据就绪后注入（复用散点单击的 zoomToPoint，保证两处跳转行为完全一致）。
    let panelMembers: GiPoint[] = []
    let pickPanelMember: ((p: GiPoint) => void) | null = null
    const hideGiPanel = () => { panelEl.style.display = 'none' }
    const esc = (s: string) =>
      s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string)
    const showGiPanel = (lnglat: [number, number], head: string, members: GiPoint[]) => {
      if (panelHideTimer !== null) { window.clearTimeout(panelHideTimer); panelHideTimer = null }
      const hostW = host.current!.clientWidth
      const hostH = host.current!.clientHeight
      const p = map.lngLatToContainer(new AMap.LngLat(lnglat[0], lnglat[1]))
      // 估算面板高（行高约 26px、上限 10 行 + 头部），垂直向钳制在容器内（CSS translateY(-50%) 居中）
      const estH = Math.min(members.length, 10) * 26 + 44
      const flip = p.x + 16 + 240 > hostW
      panelMembers = members
      // 🔴 改动 2026-10-14 · 条目改为可点击：data-idx 定位成员，悬停显金色跳转箭头，title 说明点击行为
      panelEl.innerHTML =
        `<div class="sr-gi-panel-head">${esc(head)}</div>` +
        `<ul class="sr-gi-panel-list">${members
          .map((m, i) =>
            `<li class="pick" role="button" tabindex="0" data-idx="${i}" title="点击跳转到「${esc(m.n)}」的区域层级">` +
            `<i class="chip${m.t === 'AGI' ? ' agi' : ''}">${esc(m.t)}</i>` +
            `<span class="nm" title="${esc(m.n)}">${esc(m.n)}</span>` +
            `<i class="go" aria-hidden="true">›</i></li>`)
          .join('')}</ul>`
      panelEl.style.left = flip ? 'auto' : `${p.x + 16}px`
      panelEl.style.right = flip ? `${Math.max(0, hostW - p.x + 16)}px` : 'auto'
      panelEl.style.top = `${Math.min(Math.max(p.y, estH / 2 + 6), Math.max(estH / 2 + 6, hostH - estH / 2 - 6))}px`
      panelEl.style.display = 'block'
    }
    // 面板本身可悬停（滚动列表不消失）；滚轮停住传播，避免滚动列表时连带缩放地图
    panelEl.addEventListener('mouseenter', () => {
      panelHover = true
      if (panelHideTimer !== null) { window.clearTimeout(panelHideTimer); panelHideTimer = null }
    })
    panelEl.addEventListener('mouseleave', () => { panelHover = false; hideGiPanel() })
    panelEl.addEventListener('wheel', (e) => e.stopPropagation(), { passive: true })
    // 🔴 改动 2026-10-14 · 面板内按下（pointerdown/mousedown/touchstart）一律不冒泡：
    //  浮窗虽已挂到覆盖层（地图容器之外），但高德仍会在 document/window 级别监听拖拽收尾，
    //  拦住冒泡可确保「拖动浮窗滚动条 / 按下条目时手抖 1–2px」不会被底图当成拖拽平移
    //  （一旦平移就会 moveend → renderGi 重算并收起面板，鼠标抬起时不再命中条目 → 点击丢失）。
    //  中键放行，保留「中键切换 2.5D」在浮窗上同样可用。
    const onPanelDown = (e: MouseEvent) => { if (e.button !== 1) e.stopPropagation() }
    panelEl.addEventListener('pointerdown', onPanelDown)
    panelEl.addEventListener('mousedown', onPanelDown)
    panelEl.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true })
    // 🔴 改动 2026-10-14 · 条目点击委托：命中的地理标志产品 → 缩放到其注册行政级别层级（与单击散点同路径）
    const pickTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return null
      const li = target.closest('li[data-idx]') as HTMLElement | null
      if (!li) return null
      return panelMembers[Number(li.dataset.idx)] ?? null
    }
    const onPanelClick = (e: MouseEvent) => {
      const pick = pickPanelMember
      const m = pick && pickTarget(e.target)
      if (!pick || !m) return
      // 阻止冒泡到地图容器：否则高德会同时按底图点击处理（收起面板 / 关闭资产信息窗）
      e.stopPropagation()
      pick(m)
    }
    // 键盘等价入口：面板条目 tabindex="0"，Enter / Space 与点击等效
    const onPanelKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== ' ') return
      const pick = pickPanelMember
      const m = pick && pickTarget(e.target)
      if (!pick || !m) return
      e.preventDefault()
      e.stopPropagation()
      pick(m)
    }
    panelEl.addEventListener('click', onPanelClick)
    panelEl.addEventListener('keydown', onPanelKeyDown)
    map.on('zoomstart', hideGiPanel)
    // 🔴 改动 2026-10-14 · 标记悬停面板绑定辅助：enter 显示 / leave 延时收起（面板自身可悬停衔接）
    const bindPanelHover = (el: HTMLElement, lnglat: [number, number], head: string, members: GiPoint[]) => {
      el.addEventListener('mouseenter', () => showGiPanel(lnglat, head, members))
      el.addEventListener('mouseleave', () => {
        panelHideTimer = window.setTimeout(() => { if (!panelHover) hideGiPanel() }, 120)
      })
    }

    let cancelled = false
    let offGi: (() => void) | null = null

    loadGiPoints().then((pts) => {
      if (cancelled || !pts.length) return
      const normal = pts.filter((p) => !p.sr)

      // 🔴 改动 2026-10-14 · 单击散点：按点位注册行政级别缩放到对应级别（市级到市级、县级到县级）
      const zoomToPoint = (p: GiPoint) => {
        hideGiPanel()
        map.setZoomAndCenter(GI_LEVEL_ZOOM[giLevelOf(p.c)], [p.p[0], p.p[1]])
      }

      // 🔴 改动 2026-10-14 · 自绘 64px 屏格聚合：zoomend/moveend 重算（MarkerCluster 插件在程序化缩放后
      // 内部计数与 DOM 渲染脱节，弃用）。单格 1 点=散点、≥2 点=金色聚合泡；视野外 ±1 格边距跳过。
      const GRID = 64
      const giMarkers: AMapNS[] = []
      const renderGi = () => {
        for (const m of giMarkers) m.setMap(null)
        giMarkers.length = 0
        hideGiPanel()
        const size = map.getSize()
        const W = size.width, H = size.height
        const cells = new Map<string, GiPoint[]>()
        for (const p of normal) {
          const c = map.lngLatToContainer(new AMap.LngLat(p.p[0], p.p[1]))
          if (c.x < -GRID || c.y < -GRID || c.x > W + GRID || c.y > H + GRID) continue
          const key = `${Math.floor(c.x / GRID)}_${Math.floor(c.y / GRID)}`
          const b = cells.get(key)
          if (b) b.push(p)
          else cells.set(key, [p])
        }
        for (const members of cells.values()) {
          if (members.length === 1) {
            const p = members[0]
            const el = document.createElement('div')
            el.className = `sr-gi-dot${p.t === 'AGI' ? ' is-agi' : ''}`
            // 🔴 改动 2026-10-14 · 单个散点悬停同样弹液态玻璃信息面板（此前仅聚合泡有）
            bindPanelHover(el, [p.p[0], p.p[1]],
              p.t === 'AGI' ? 'AGI 农产品地理标志' : 'GI 地理标志产品', [p])
            el.addEventListener('click', () => zoomToPoint(p))
            const m = new AMap.Marker({ position: p.p, content: el, offset: new AMap.Pixel(-4, -4), title: p.n, zIndex: 110 })
            m.setMap(map)
            giMarkers.push(m)
          } else {
            const lng = members.reduce((a, q) => a + q.p[0], 0) / members.length
            const lat = members.reduce((a, q) => a + q.p[1], 0) / members.length
            const count = members.length
            const px = count >= 100 ? 46 : count >= 30 ? 40 : count >= 10 ? 33 : 27
            const el = document.createElement('div')
            el.className = 'sr-gi-cluster'
            el.style.width = `${px}px`
            el.style.height = `${px}px`
            el.textContent = String(count)
            bindPanelHover(el, [lng, lat], `聚合点位 · ${count} 个`, members)
            // 单击聚合泡：向质心放大两级，成员自动散开
            el.addEventListener('click', () => {
              hideGiPanel()
              map.setZoomAndCenter(Math.min(map.getZoom() + 2, 19), [lng, lat])
            })
            const m = new AMap.Marker({ position: [lng, lat], content: el, offset: new AMap.Pixel(-px / 2, -px / 2), zIndex: 100 })
            m.setMap(map)
            giMarkers.push(m)
          }
        }
      }
      renderGi()
      map.on('zoomend', renderGi)
      map.on('moveend', renderGi)
      offGi = () => {
        map.off('zoomend', renderGi)
        map.off('moveend', renderGi)
        for (const m of giMarkers) m.setMap(null)
        giMarkers.length = 0
      }

      const info = new AMap.InfoWindow({ isCustom: true, offset: new AMap.Pixel(0, -16), autoMove: true })
      // 🔴 改动 2026-10-14 · ✦ 在册资产小卡（点 ✦ 标记 / 点浮窗里的 ✦ 条目共用同一份内容与锚点逻辑）
      const openSrCard = (p: GiPoint, anchor: AMapNS) => {
        info.setContent(
          `<div class="sr-gi-card"><div class="sr-gi-card-name">✦ ${esc(p.n)}</div>` +
            `<div class="sr-gi-card-meta">${p.t === 'AGI' ? '农产品地理标志' : '地理标志产品'} · 平台在册资产</div></div>`,
        )
        info.open(map, anchor)
      }
      // 🔴 改动 2026-10-14 · 注入浮窗条目点击回调（info 已就绪）：点浮窗里的产品 = 点该产品点位，
      //  按注册行政级别跳转；✦ 在册资产与点 ✦ 标记等价，跳转后仍弹出资产小卡。
      //  浮窗已移出地图容器、不再经过 map click 的「收起小卡」路径，故先显式收起旧卡再按需重开。
      pickPanelMember = (p) => {
        info.close()
        zoomToPoint(p)
        if (p.sr) openSrCard(p, new AMap.LngLat(p.p[0], p.p[1]))
      }
      for (const p of pts) {
        if (!p.sr) continue
        const el = document.createElement('div')
        el.className = 'sr-gi-sr'
        el.textContent = '✦'
        // 🔴 改动 2026-10-14 · ✦ 在册资产悬停同样弹信息面板（此前仅原生 title 提示）
        bindPanelHover(el, [p.p[0], p.p[1]], '✦ 平台在册资产', [p])
        const m = new AMap.Marker({ position: p.p, content: el, offset: new AMap.Pixel(-9, -9), title: `${p.n} · 在册资产`, zIndex: 130 })
        // 🔴 改动 2026-10-14 · ✦ 在册资产点击复用 zoomToPoint 跳到注册行政层级，再弹资产小卡（跳转 + 弹卡两者都要）
        m.on('click', () => {
          zoomToPoint(p)
          openSrCard(p, m.getPosition())
        })
        map.add(m)
      }
      map.on('click', () => { info.close(); hideGiPanel() })
    })

    // 🔴 开发态暴露地图实例（自动化验证取坐标/缩放级别用）
    if (import.meta.env.DEV) (window as unknown as { __srAmap?: unknown }).__srAmap = map
    return () => {
      cancelled = true
      if (middleTiltTimer.current !== null) window.clearTimeout(middleTiltTimer.current)
      if (panelHideTimer !== null) window.clearTimeout(panelHideTimer)
      map.off('zoomstart', hideGiPanel)
      if (offGi) offGi()
      panelEl.remove()
      hostEl?.removeEventListener('mousedown', onMiddleMouseDown, true)
      map.destroy()
      mapRef.current = null
    }
  }, [status, dark])

  if (status === 'loading') {
    return <div className="sr-map-state">高德地图加载中…</div>
  }
  if (status === 'failed') {
    return <div className="sr-map-state">高德地图加载失败，请检查网络或 Key 配置后重试</div>
  }
  return (
    <>
      <div ref={host} className="sr-map-amap" aria-label="中国地图（高德底图）" />
      {/* 🔴 改动 2026-10-14 · 悬停浮窗覆盖层：默认 pointer-events:none 不挡地图手势，
          仅 .sr-gi-panel 自身 auto；与地图容器同级，面板点击不会被高德底图处理吞掉 */}
      <div ref={overlay} className="sr-map-overlay" />
      {/* 🔴 改动 2026-10-14 · 2.5D 俯视显式入口（右侧悬浮钮；俯视态高亮，再点返回平面） */}
      <div className="sr-map-zoom">
        <button
          type="button"
          className={`is-wide${tilted ? ' is-on' : ''}`}
          aria-label={tilted ? '退出 2.5D 俯视' : '进入 2.5D 俯视'}
          aria-pressed={tilted}
          title={tilted ? '返回平面视图' : '进入 2.5D 俯视'}
          onClick={toggleTilt}
        >
          2.5D
        </button>
      </div>
      {/* 提示角标：只提示手动切换俯视/顶视 */}
      <div className="sr-map-badge">{tilted ? '点 2.5D 或按中键返回顶视' : '点 2.5D 或按中键进入俯视'}</div>
    </>
  )
}
