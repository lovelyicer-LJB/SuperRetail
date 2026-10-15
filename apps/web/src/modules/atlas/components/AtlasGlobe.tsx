// 🔴 改动 2026-10-01 · 停止自转，初始视角始终对准中国区域（以北京标注点为朝向基准）。
// 🔴 改动 2026-10-01 · 新增滚轮隐藏热区：上滚放大地球、下滚缩小，阻尼平滑过渡。
// 🔴 改动 2026-10-01 · 华为云风格的可旋转地球，独立管理渲染与资源释放。
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import locationsJson from './earth-locations.json'
import './atlas-globe.css'

interface EarthBrand { n: string; a: string; c: string; x: number; logo?: string }
interface EarthLocation {
  name: string
  lat: number
  lon: number
  state: string | null
  direction: string | null
  line: string | null
  /** 同城门店数（决定标签等级配色与 xN 后缀），无则普通标注 */
  count?: number
  /** 悬浮弹层里的品牌图标列表 */
  brands?: EarthBrand[]
}
const locations = locationsJson as EarthLocation[]

// 🔴 改动 2026-10-07 · 暂时隐藏没有餐饮品牌图标的城市（仅保留广州/库尔勒/乌鲁木齐/济南），
// 恢复显示时把开关改回 false 即可。
const HIDE_NO_BRAND_CITIES = true

const asset = (name: string) => `${import.meta.env.BASE_URL}assets/atlas/${name}`

export function AtlasGlobe({ dark }: { dark: boolean }) {
  const host = useRef<HTMLDivElement>(null)
  const labels = useRef<HTMLDivElement>(null)
  const zoomLayer = useRef<HTMLDivElement>(null)
  const ocean = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const container = host.current!
    const labelRoot = labels.current!
    const hotZone = zoomLayer.current!
    const oceanDisc = ocean.current!
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    } catch {
      // 无 WebGL 时仍展示本地静态地球。
      queueMicrotask(() => setFailed(true))
      return
    }
    let disposed = false
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    renderer.domElement.setAttribute('aria-label', '3D 地球，可拖动旋转，滚轮缩放')
    container.appendChild(renderer.domElement)
    const scene = new THREE.Scene()
    const FRUSTUM = 1.14
    const camera = new THREE.OrthographicCamera(-FRUSTUM, FRUSTUM, FRUSTUM, -FRUSTUM, 0.1, 100)
    camera.position.set(1.8, 1, 2)
    // 拖拽与滚轮都落在透明热区上，画布只负责渲染。
    const controls = new OrbitControls(camera, hotZone)
    controls.enableZoom = false
    controls.enablePan = false
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    // 🔴 改动 2026-10-01 · 滚轮缩放：上滚放大、下滚缩小，指数步进 + 阻尼逼近目标值。
    const ZOOM_MIN = 0.6
    const ZOOM_MAX = 2.6
    let targetZoom = 1
    const wheel = (event: WheelEvent) => {
      event.preventDefault()
      const unit = event.deltaMode === 1 ? 16 : 1
      targetZoom = THREE.MathUtils.clamp(targetZoom * Math.exp(-event.deltaY * unit * 0.0012), ZOOM_MIN, ZOOM_MAX)
      fitCanvas()
    }
    hotZone.addEventListener('wheel', wheel, { passive: false })
    const geometry = new THREE.SphereGeometry(1, 96, 64)
    const material = new THREE.MeshBasicMaterial({ transparent: true })
    const globe = new THREE.Mesh(geometry, material)
    scene.add(globe)
    const texture = new THREE.TextureLoader().load(asset('earth-map.png'), (map) => {
      if (disposed) { map.dispose(); return }
      map.colorSpace = THREE.SRGBColorSpace
      map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
      material.map = map
      material.needsUpdate = true
      container.dataset.ready = 'true'
    }, undefined, () => { if (!disposed) setFailed(true) })
    // 🔴 改动 2026-10-01 · 标签防重叠改为 8 方向动态选位：冲突时绕标记点 360° 找空位，不再直接隐藏。
    // 候选位为相对 10×10 节点盒的 [left, top]：右 / 左 / 上 / 下 / 右上 / 右下 / 左上 / 左下。
    const LABEL_DIRS: Array<(w: number, h: number) => [number, number]> = [
      (_w, h) => [10, (10 - h) / 2],
      (w, h) => [-w, (10 - h) / 2],
      (w, h) => [(10 - w) / 2, -h - 6],
      (w) => [(10 - w) / 2, 16],
      (_w, h) => [10, -h - 4],
      () => [10, 14],
      (w, h) => [-w, -h - 4],
      (w) => [-w, 14],
    ]
    const PREF_DIR: Record<string, number> = {
      serverright: 0, serverleft: 1, left: 1, servertop: 2, serverbottom: 3, bottom: 3,
      'line-right': 0, 'line-right-top': 4, 'line-right-top1': 4, 'line-left': 6, 'line-bottom': 3,
    }
    const nodes = locations.map((location) => {
      // 原站贴图带有经度偏移，沿用对应地点坐标确保标注落在陆地上。
      const longitude = new THREE.Object3D()
      const latitude = new THREE.Object3D()
      const point = new THREE.Object3D()
      longitude.add(latitude)
      latitude.add(point)
      longitude.rotation.y = THREE.MathUtils.degToRad(location.lon) + 1.5 * Math.PI
      latitude.rotation.x = THREE.MathUtils.degToRad(location.lat) + Math.PI
      point.position.z = 1.005
      point.updateWorldMatrix(true, false)
      const position = point.getWorldPosition(new THREE.Vector3())
      const element = document.createElement('div')
      element.className = `atlas-earth-node ${location.state === 'iec' ? 'is-iec' : ''}`
      // 🔴 改动 2026-10-07 · 开关开启时，没有餐饮品牌图标的城市整体隐藏（标记点、标签与弹层）。
      if (HIDE_NO_BRAND_CITIES && !location.brands?.length) element.style.display = 'none'
      // 🔴 改动 2026-10-01 · 餐饮城市：标签按同城门店数上等级色并追加 xN 后缀，悬浮弹层列品牌图标。
      const tier = location.count ? Math.min(Math.max(location.count, 1), 7) : 0
      if (tier) element.classList.add(`tier-${tier}`)
      const text = document.createElement('span')
      text.className = `atlas-earth-label ${location.direction || 'serverright'} ${location.line || ''}${tier ? ` tier-${tier}` : ''}`
      text.textContent = location.count ? `${location.name} x${location.count}` : location.name
      element.appendChild(text)
      if (location.brands?.length) {
        element.classList.add('has-brands')
        const pop = document.createElement('div')
        pop.className = 'brand-pop'
        for (const brand of location.brands) {
          const col = document.createElement('div')
          col.className = 'bp'
          col.title = brand.n
          const icon = document.createElement('span')
          icon.className = 'bp-icon'
          // 🔴 改动 2026-10-01 · 有品牌 SVG 时用真 LOGO，否则退回品牌色 + 简称占位。
          if (brand.logo) {
            icon.classList.add('has-logo')
            const img = document.createElement('img')
            img.src = asset(`brands/${brand.logo}`)
            img.alt = brand.n
            icon.appendChild(img)
          } else {
            icon.style.background = brand.c
            icon.textContent = brand.a
          }
          const x = document.createElement('span')
          x.className = 'bp-x'
          x.textContent = `x${brand.x}`
          col.append(icon, x)
          pop.appendChild(col)
        }
        element.appendChild(pop)
      }
      labelRoot.appendChild(element)
      // 偏好方向优先，其余 7 个方向按序兜底；wh 首帧实测后缓存，cur 记录已应用的候选位。
      const pref = PREF_DIR[location.line ?? ''] ?? PREF_DIR[location.direction ?? ''] ?? 0
      const order = [pref, ...[0, 1, 2, 3, 4, 5, 6, 7].filter((i) => i !== pref)]
      return { position, element, text, order, wh: null as [number, number] | null, cur: -1 }
    })
    // 字体换载后标签宽度可能变化，使缓存失效以便重测。
    document.fonts?.ready.then(() => { for (const n of nodes) n.wh = null })
    // 🔴 改动 2026-10-01 · 不自转，相机朝向北京标注点的方向，即始终对准中国区域。
    // 注意先缓存原距离再设置方向，避免归一化后 length() 恒为 1 把相机压到球面上。
    const focus = nodes[locations.findIndex((location) => location.name === '北京')]
    if (focus) {
      const distance = camera.position.length()
      camera.position.copy(focus.position).normalize().multiplyScalar(distance)
    }
    let size = 1
    let canvasSize = 0
    let canvasOffset = 0
    // 🔴 改动 2026-10-01 · 画布随缩放级别动态扩大并居中，球面不再被方形画布裁剪。
    // 尺寸取目标值与当前值的较大者，避免缩小动画进行中画布提前收缩造成瞬时裁剪。
    // 🔴 改动 2026-10-01 · 视锥范围随画布倍数同步放宽，保持世界坐标到容器像素的比例恒定，
    // 陆地层放大倍率与 CSS 圆盘严格一致（此前画布放大导致陆地层多放大了一个画布倍数）。
    const fitCanvas = () => {
      const wanted = Math.max(1, Math.ceil(size * Math.max(1, targetZoom, camera.zoom)))
      if (wanted === canvasSize) return
      canvasSize = wanted
      canvasOffset = (canvasSize - size) / 2
      renderer.setSize(canvasSize, canvasSize)
      renderer.domElement.style.left = `${-canvasOffset}px`
      renderer.domElement.style.top = `${-canvasOffset}px`
      const extent = FRUSTUM * (canvasSize / size)
      camera.left = -extent
      camera.right = extent
      camera.top = extent
      camera.bottom = -extent
      camera.updateProjectionMatrix()
    }
    const resize = new ResizeObserver(() => {
      size = Math.max(1, container.clientWidth)
      canvasSize = 0
      fitCanvas()
    })
    resize.observe(container)
    let visible = true
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting })
    observer.observe(container)
    const projected = new THREE.Vector3()
    const direction = new THREE.Vector3()
    let previous = 0
    renderer.setAnimationLoop((time) => {
      const delta = previous ? Math.min((time - previous) / 1000, 0.05) : 0
      previous = time
      if (!visible || document.hidden) return
      controls.update(delta)
      // 阻尼逼近目标缩放，滚轮连续滚动时保持顺滑。
      if (Math.abs(camera.zoom - targetZoom) > 0.001) {
        const next = camera.zoom + (targetZoom - camera.zoom) * Math.min(1, delta * 10)
        camera.zoom = Math.abs(next - targetZoom) < 0.005 ? targetZoom : next
        camera.updateProjectionMatrix()
        // 🔴 改动 2026-10-01 · CSS 海洋圆盘与球体同步缩放，避免球面溢出底座。
        oceanDisc.style.transform = `scale(${camera.zoom})`
      }
      fitCanvas()
      camera.updateMatrixWorld()
      direction.copy(camera.position).normalize()
      const occupied: Array<{ l: number; t: number; r: number; b: number }> = []
      for (const node of nodes) {
        const { position, element, text, order } = node
        const facing = position.dot(direction)
        element.style.visibility = facing > 0.08 ? 'visible' : 'hidden'
        if (facing <= 0.08) continue
        projected.copy(position).project(camera)
        const tx = (projected.x * 0.5 + 0.5) * canvasSize - canvasOffset
        const ty = (-projected.y * 0.5 + 0.5) * canvasSize - canvasOffset
        element.style.transform = `translate(${tx}px, ${ty}px)`
        element.style.opacity = String(Math.min(1, (facing - 0.08) * 8))
        element.style.zIndex = String(Math.round(facing * 100))
        // 🔴 改动 2026-10-01 · 360° 动态选位：偏好方向冲突时绕标记点找第一个不重叠的方位，全部冲突才隐藏。
        if (!node.wh) node.wh = [text.offsetWidth, text.offsetHeight]
        const [w, h] = node.wh
        let placed = -1
        for (const ci of order) {
          const [cl, ct] = LABEL_DIRS[ci](w, h)
          const l = tx - 5 + cl
          const t = ty - 5 + ct
          const hit = occupied.some((o) => l < o.r + 3 && l + w + 3 > o.l && t < o.b + 3 && t + h + 3 > o.t)
          if (!hit) {
            occupied.push({ l, t, r: l + w, b: t + h })
            placed = ci
            break
          }
        }
        if (placed >= 0) {
          text.style.opacity = '1'
          if (placed !== node.cur) {
            const [cl, ct] = LABEL_DIRS[placed](w, h)
            text.style.left = `${cl}px`
            text.style.top = `${ct}px`
            text.style.right = 'auto'
            text.style.bottom = 'auto'
            node.cur = placed
          }
        } else {
          text.style.opacity = '0'
        }
      }
      renderer.render(scene, camera)
    })
    const lost = (event: Event) => { event.preventDefault(); setFailed(true); renderer.setAnimationLoop(null) }
    renderer.domElement.addEventListener('webglcontextlost', lost)
    return () => {
      disposed = true
      renderer.setAnimationLoop(null)
      resize.disconnect()
      observer.disconnect()
      controls.dispose()
      texture.dispose()
      geometry.dispose()
      material.dispose()
      renderer.dispose()
      hotZone.removeEventListener('wheel', wheel)
      renderer.domElement.removeEventListener('webglcontextlost', lost)
      renderer.domElement.remove()
      labelRoot.replaceChildren()
    }
  }, [])

  return (
    <section className={`atlas-globe ${dark ? 'is-dark' : ''}`} aria-label="全球版图">
      <div className={`atlas-earth ${failed ? 'is-fallback' : ''}`} ref={host}>
        <div className="atlas-earth-ocean" ref={ocean} />
        <div className="atlas-earth-labels" ref={labels} aria-hidden="true" />
        <div className="atlas-earth-zoom" ref={zoomLayer} aria-hidden="true" />
        {failed && <img className="atlas-earth-fallback" src={asset('earth-fallback.png')} alt="全球版图地球" />}
      </div>
    </section>
  )
}
