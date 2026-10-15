// 🔴 改动 2026-10-13 · 互动页 3D 品牌星球场景（极简 Blender 风）。
// v2 重做：半透玻璃材质 + 品牌 LOGO「冻结」在玻璃星球内部（用户参考图：彩色玻璃弹珠观感）——
// 去掉实心发光内芯，外壳改为高透射/轻吸收的玻璃；LOGO 以十字交叉双面片悬浮球心，
// 经玻璃折射呈现「冻在琥珀里」的效果；SVG 提清到 512px 再贴图，高分屏不糊。
// 与框架解耦的纯 three.js 类：
// - 星球摆放在「画板世界坐标」中，setViewport 与底层无限画板视口同步（平移/缩放严格跟随点阵网格）
// - 容器捕获阶段自行处理指针：命中星球 = 拖动星球 / 点击选中；未命中 = 放行给画板（平移/缩放/右键）
// - 悬停/选中经回调交给 React 层渲染 HTML 浮层；选中卡锚点由场景逐帧投影定位（60Hz 不经 React）
import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { BRANDS, brandLogoUrl } from '@/lib/brands'
import type { Viewport } from '@/modules/atlas/board/types'

export interface PlanetSceneCallbacks {
  /** 悬停星球变化（null = 离开星球）；x/y 为相对容器的指针坐标（供光标跟随气泡） */
  onHoverChange?: (key: string | null, x: number, y: number) => void
  /** 选中星球变化（点击星球 = 选中；点击空白 = null） */
  onSelectChange?: (key: string | null) => void
}

/** 星球定义：画板世界坐标（zoom=1 时的 CSS 像素）+ 视觉半径（同单位） */
interface PlanetDef {
  key: string
  color: string
  /** logo 文件名（public/assets/atlas/brands 下） */
  logo: string
  wx: number
  wy: number
  /** 深度（世界单位，越大越靠近相机，产生微视差） */
  z: number
  r: number
}

/** 9 星球布局：辣子鸡居中（主品牌），其余 8 个环绕两圈；按用户要求所有星球统一为辣子鸡大小。
 *  外圈半径/纵向压扁按 1600×900 视口全收进首屏标定（无限画板本可平移，但首屏九星齐聚观感更好） */
const PLANETS: PlanetDef[] = BRANDS.map((b, i) => {
  if (i === 0) return { key: b.key, color: b.color, logo: b.logo, wx: 0, wy: 0, z: 40, r: 96 }
  const ring = i <= 4 ? 0 : 1
  const idxInRing = ring === 0 ? i - 1 : i - 5
  const count = ring === 0 ? 4 : 4
  const baseR = ring === 0 ? 300 : 450
  const angle = (idxInRing / count) * Math.PI * 2 + (ring === 0 ? -Math.PI / 2 : -Math.PI / 4)
  // 每颗星球固定抖动（按序号伪随机，稳定不漂移）
  const jitter = ((i * 2654435761) % 1000) / 1000 - 0.5
  const rad = baseR + jitter * 60
  return {
    key: b.key,
    color: b.color,
    logo: b.logo,
    wx: Math.cos(angle) * rad,
    wy: Math.sin(angle) * rad * 0.64, // 纵向压扁：椭圆轨道观感
    z: (jitter * 240) | 0,
    r: 96, // 🔴 改动 2026-10-14 · 统一为辣子鸡星球半径
  }
})

// 🔴 改动 2026-10-13 · 相机改长焦窄视角（FOV 40°→12°，距离 1200→4000 同比拉远）：
// 透视广角下球体离开画面中心会被投影拉成椭圆（拖到画板两侧变形），长焦 = 极简 Blender
// 产品图惯例（50mm+），边缘拉伸降到不可感知；可视高度公式不变，画板视口同步不受影响。
const CAMERA_Z = 4000
const FOV = 12

export class BrandPlanetScene {
  private container: HTMLElement
  private cb: PlanetSceneCallbacks
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera: THREE.PerspectiveCamera
  private boardGroup = new THREE.Group() // 画板世界层：scale=zoom，position 随视口
  private raycaster = new THREE.Raycaster()
  private raf = 0
  private disposed = false
  private resizeObs: ResizeObserver
  private ac = new AbortController()

  private view: Viewport = { x: 0, y: 0, zoom: 1 }
  private wpp = 1 // 1 屏幕像素对应的世界单位（z=0 平面）
  private planets: Array<{
    def: PlanetDef
    group: THREE.Group
    outer: THREE.Mesh<THREE.SphereGeometry, THREE.MeshPhysicalMaterial>
    /** 品牌色内衬（BackSide 远半球，玻璃纸镇的彩色内芯） */
    inner: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>
    /** 冻结在球内的弧形 LOGO 片（贴合前半球内壁，静止） */
    logoGroup: THREE.Group
    logoGeo: THREE.BufferGeometry
    logoMats: THREE.MeshBasicMaterial[]
    logoTex: THREE.Texture | null
    phase: number
    scaleCur: number
    scaleTarget: number
  }> = []
  private hitMeshes: THREE.Object3D[] = []
  private hoverKey: string | null = null
  private selectKey: string | null = null

  /** 选中卡锚点（React 层传入的绝对定位 div，场景逐帧写入 left/top） */
  anchorEl: HTMLElement | null = null

  constructor(container: HTMLElement, cb: PlanetSceneCallbacks = {}) {
    this.container = container
    this.cb = cb

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setClearColor(0x000000, 0) // 透明底：底层画板点阵透出来
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.1
    const el = this.renderer.domElement
    el.style.position = 'absolute'
    el.style.inset = '0'
    el.style.pointerEvents = 'none' // 指针事件一律穿透到画板，命中判定由容器捕获监听 + 射线完成
    el.style.zIndex = '1'
    container.appendChild(el)

    this.camera = new THREE.PerspectiveCamera(FOV, 1, 1, CAMERA_Z * 4)
    this.camera.position.set(0, 0, CAMERA_Z)
    this.scene.add(this.boardGroup)

    // 环境反射（玻璃质感的关键）+ 三点柔光
    const pmrem = new THREE.PMREMGenerator(this.renderer)
    const envScene = new RoomEnvironment()
    // 🔴 改动 2026-10-14 · 反射光斑挪到星球顶部（原光斑在球面正中，正好盖住 LOGO）：
    // 球面高光位置 = 光线方向与视线方向的半角方向，只有把光源抬到前上方/后上方，高光才会上移——
    // ① 环境主点光（强度 900，光斑主来源）从头顶正上方移向后上方，反射光斑随之移到球顶；
    // ② +z 面光（原在镜头方向正前方，反射在球面正中）抬高并压暗，只留柔和的上部亮度
    envScene.traverse((o) => {
      if ((o as THREE.PointLight).isPointLight) {
        o.position.set(0.4, 16.2, -8)
      } else if (o instanceof THREE.Mesh && Math.abs(o.position.z - 14.52) < 0.01) {
        o.position.set(0, 13.5, -3)
        ;(o.material as THREE.MeshLambertMaterial).emissiveIntensity = 16
      }
    })
    this.scene.environment = pmrem.fromScene(envScene, 0.04).texture
    pmrem.dispose()
    const ambient = new THREE.AmbientLight(0xffffff, 0.55)
    // 主光移到后上方：对可见面只贡献玻璃镜面高光（位置移到球顶），前向漫射交给环境光
    const key = new THREE.DirectionalLight(0xffffff, 1.6)
    key.position.set(0, 2600, -800)
    const rim = new THREE.DirectionalLight(0xdfe8ff, 0.7)
    rim.position.set(-700, -400, 500)
    this.scene.add(ambient, key, rim)

    this.buildPlanets()
    this.applyTheme(false)
    this.bindPointer()
    this.resizeObs = new ResizeObserver(() => this.resize())
    this.resizeObs.observe(container)
    this.resize()
    this.loop()
  }

  /** 主题跟随：浅色 = 近白摄影棚（参考视频），深色 = 压低曝光 + 冷色补光 */
  setTheme(dark: boolean) {
    this.applyTheme(dark)
  }

  private applyTheme(dark: boolean) {
    this.renderer.toneMappingExposure = dark ? 0.92 : 1.12
    this.scene.environmentIntensity = dark ? 0.7 : 1.0
  }

  /** 加载品牌 LOGO 贴图：原始 SVG 仅 108×108，先放大到 512 再栅格化（高分屏/放大后不糊） */
  private async loadLogoTexture(file: string): Promise<THREE.Texture | null> {
    try {
      const res = await fetch(brandLogoUrl(file))
      const svg = (await res.text())
        .replace('width="108"', 'width="512"')
        .replace('height="108"', 'height="512"')
      // 🔴 改动 2026-10-14 · 只把品牌图形/文字向 SVG 中心缩小 15%；首个圆形是品牌底色，必须保持原尺寸
      const shrinkTo85Percent = 'translate(54 54) scale(0.85) translate(-54 -54)'
      const scaledSvg = svg
        .replace(/<circle\b[^>]*\/>/, (circle) => `${circle}<g transform="${shrinkTo85Percent}">`)
        .replace('</svg>', '</g></svg>')
      const url = URL.createObjectURL(new Blob([scaledSvg], { type: 'image/svg+xml' }))
      const tex = await new THREE.TextureLoader().loadAsync(url)
      URL.revokeObjectURL(url)
      tex.colorSpace = THREE.SRGBColorSpace
      tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy()
      return tex
    } catch {
      return null // logo 加载失败不致命：玻璃球体仍在
    }
  }

  /**
   * 生成贴合玻璃前内壁的弧形 LOGO 片。
   * 平放大平面会在球面边缘形成突变折射（轮廓扭曲）；弧形片跟随球面曲率，
   * 既保留约 94% 球径的大 LOGO，又不会把玻璃外壳的边缘扭变形。
   */
  private buildLogoGeometry(r: number): THREE.BufferGeometry {
    const logoRadius = r * 0.94
    const shellRadius = r * 0.98
    const radialSegments = 32
    const angularSegments = 96
    const edgeZ = Math.sqrt(shellRadius * shellRadius - logoRadius * logoRadius)
    const positions: number[] = []
    const uvs: number[] = []
    const indices: number[] = []

    for (let ring = 0; ring <= radialSegments; ring += 1) {
      const rho = (ring / radialSegments) * logoRadius
      const z = Math.sqrt(Math.max(0, shellRadius * shellRadius - rho * rho)) - edgeZ
      for (let seg = 0; seg <= angularSegments; seg += 1) {
        const angle = (seg / angularSegments) * Math.PI * 2
        const x = Math.cos(angle) * rho
        const y = Math.sin(angle) * rho
        positions.push(x, y, z)
        uvs.push(0.5 + x / (logoRadius * 2), 0.5 + y / (logoRadius * 2))
      }
    }

    const stride = angularSegments + 1
    for (let ring = 0; ring < radialSegments; ring += 1) {
      for (let seg = 0; seg < angularSegments; seg += 1) {
        const a = ring * stride + seg
        const b = a + 1
        const c = (ring + 1) * stride + seg
        const d = c + 1
        indices.push(a, d, b, a, c, d)
      }
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    return geometry
  }

  private buildPlanets() {
    for (const def of PLANETS) {
      const group = new THREE.Group()
      const brand = new THREE.Color(def.color)

      // 半透玻璃外壳（🔴 改动 2026-10-13 · 「玻璃纸镇」结构：透明水晶壳 + 品牌色内衬）：
      // 吸收染色退役（会把球内白色 LOGO 文字也染成色块）；壳体不再吸收着色，低 IOR 压折射扭曲
      const outerMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0,
        roughness: 0.05,
        transmission: 1,
        thickness: def.r * 0.4,
        ior: 1.18,
        dispersion: 0, // 色散已按用户要求去掉
        iridescence: 0.15,
        iridescenceIOR: 1.3,
        attenuationColor: 0xffffff,
        attenuationDistance: 10000,
        clearcoat: 1,
        clearcoatRoughness: 0.06,
        envMapIntensity: 1.2,
        specularIntensity: 1,
      })
      const outer = new THREE.Mesh(new THREE.SphereGeometry(def.r, 64, 64), outerMat)
      outer.userData.planetKey = def.key

      // 品牌色内衬：只渲染远半球内壁（BackSide），像玻璃纸镇里的彩色内芯——
      // 球体读品牌色，同时挡住环境光直接透穿（低 IOR 奶白问题的根因）；
      // 必须是不透明队列才能进 transmission 缓冲被玻璃壳折射显示（transparent 会隐身）
      const inner = new THREE.Mesh(
        new THREE.SphereGeometry(def.r * 0.96, 48, 48),
        new THREE.MeshStandardMaterial({
          color: brand,
          roughness: 0.42,
          metalness: 0,
          side: THREE.BackSide,
          envMapIntensity: 0.55,
        }),
      )

      // 冻结在玻璃内的品牌 LOGO：弧形片正对镜头并贴合前半球内壁（相机固定不环绕，正面恒可读）。
      // 不能用放大的平直面片：平面边缘会在玻璃外壳处形成突变折射，把球体轮廓扭歪；
      // 弧形片跟随球面曲率，可避免边缘扭曲。无光照材质保持 SVG 原色（toneMapped:false 不被 ACES 压色）。
      // 注意必须用 alphaTest 裁切而非 transparent：three.js 的 transmission 缓冲只收录不透明物体，
      // transparent 物体进不了透射通道，会被玻璃壳的深度挡掉（LOGO 隐身）；alphaTest 属于不透明队列。
      const logoGroup = new THREE.Group()
      const logoMat = new THREE.MeshBasicMaterial({
        transparent: false,
        alphaTest: 0.4,
        side: THREE.DoubleSide,
        toneMapped: false,
      })
      // 🔴 改动 2026-10-13 · LOGO 保持约 94% 球径，但载体由平面改为贴合球面的弧形片
      const logoGeo = this.buildLogoGeometry(def.r)
      const logoMesh = new THREE.Mesh(logoGeo, logoMat)
      logoGroup.add(logoMesh)
      const rec = {
        def,
        group,
        outer,
        inner,
        logoGroup,
        logoGeo,
        logoMats: [logoMat],
        logoTex: null as THREE.Texture | null,
        phase: Math.random() * Math.PI * 2,
        scaleCur: 1,
        scaleTarget: 1,
      }
      this.loadLogoTexture(def.logo).then((tex) => {
        if (this.disposed || !tex) return
        rec.logoTex = tex
        logoMat.map = tex
        logoMat.needsUpdate = true
      })

      group.add(outer, inner, logoGroup)
      this.planets.push(rec)
      this.hitMeshes.push(outer)
      this.boardGroup.add(group)
    }
    this.layout()
  }

  /** 按画板世界坐标摆放（世界单位 = px × wpp；z 为独立深度） */
  private layout() {
    for (const p of this.planets) {
      p.group.position.set(p.def.wx * this.wpp, -p.def.wy * this.wpp, p.def.z * this.wpp)
      const s = this.wpp // 几何半径按 px 建模，缩放到世界单位
      p.group.scale.setScalar(s * p.scaleCur)
    }
  }

  /** 画板视口同步：world*s + view = 屏幕（原点在容器左上，故减去容器中心偏移） */
  setViewport(view: Viewport) {
    this.view = { ...view }
    this.applyViewport()
  }

  private applyViewport() {
    const rect = this.container.getBoundingClientRect()
    const { x, y, zoom } = this.view
    this.boardGroup.scale.setScalar(zoom)
    this.boardGroup.position.set((x - rect.width / 2) * this.wpp, -(y - rect.height / 2) * this.wpp, 0)
  }

  private resize() {
    const rect = this.container.getBoundingClientRect()
    const w = Math.max(1, Math.round(rect.width))
    const h = Math.max(1, Math.round(rect.height))
    this.renderer.setSize(w, h)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    // z=0 平面可视高度 = 2·d·tan(fov/2) → 每像素世界单位
    this.wpp = (2 * CAMERA_Z * Math.tan(THREE.MathUtils.degToRad(FOV / 2))) / h
    this.layout()
    this.applyViewport()
  }

  private pick(clientX: number, clientY: number): string | null {
    const rect = this.container.getBoundingClientRect()
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    )
    this.raycaster.setFromCamera(ndc, this.camera)
    const hits = this.raycaster.intersectObjects(this.hitMeshes, false)
    return hits.length ? (hits[0].object.userData.planetKey as string) : null
  }

  private bindPointer() {
    const el = this.container
    const opt: AddEventListenerOptions = { capture: true, signal: this.ac.signal }

    el.addEventListener('pointermove', (e) => {
      const key = this.pick(e.clientX, e.clientY)
      if (key !== this.hoverKey) {
        this.hoverKey = key
        el.style.cursor = key ? 'pointer' : ''
        for (const p of this.planets) {
          p.scaleTarget = p.def.key === this.selectKey ? 1.16 : p.def.key === key ? 1.1 : 1
        }
      }
      const rect = el.getBoundingClientRect()
      this.cb.onHoverChange?.(key, e.clientX - rect.left, e.clientY - rect.top)
    }, opt)

    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return
      const key = this.pick(e.clientX, e.clientY)
      if (!key) {
        // 空白处：取消选中，事件放行给画板（平移/框选）
        this.setSelect(null)
        return
      }
      // 命中星球：拦截事件（画板不进入平移），拖动 = 移动星球，点击 = 选中
      e.stopPropagation()
      e.preventDefault()
      const planet = this.planets.find((p) => p.def.key === key)
      if (!planet) return
      const startX = e.clientX
      const startY = e.clientY
      let moved = false
      let lastX = e.clientX
      let lastY = e.clientY
      const move = (ev: PointerEvent) => {
        const dx = ev.clientX - lastX
        const dy = ev.clientY - lastY
        lastX = ev.clientX
        lastY = ev.clientY
        if (!moved && Math.hypot(ev.clientX - startX, ev.clientY - startY) < 4) return
        moved = true
        // 屏幕增量 → 画板世界增量（除以 zoom）
        planet.def.wx += dx / this.view.zoom
        planet.def.wy += dy / this.view.zoom
        this.layout()
      }
      const up = () => {
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
        if (!moved) this.setSelect(key) // 点击（未拖动）= 选中
      }
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
    }, opt)
  }

  private setSelect(key: string | null) {
    if (this.selectKey === key) return
    this.selectKey = key
    for (const p of this.planets) {
      p.scaleTarget = p.def.key === key ? 1.16 : p.def.key === this.hoverKey ? 1.1 : 1
      // 选中态：玻璃高光增强（玻璃无自发光，用环境反射强度做反馈）
      p.outer.material.envMapIntensity = p.def.key === key ? 1.7 : 1.2
    }
    this.cb.onSelectChange?.(key)
  }

  /** 当前选中星球 key（React 层渲染信息卡用） */
  getSelected(): string | null {
    return this.selectKey
  }

  private loop = () => {
    if (this.disposed) return
    this.raf = requestAnimationFrame(this.loop)
    for (const p of this.planets) {
      // 🔴 改动 2026-10-13 · 星球静止（按用户要求）：去掉呼吸浮动与 LOGO 自转，
      // 位置只随拖拽/视口变化；循环里仅保留悬停/选中的缩放缓动
      p.scaleCur += (p.scaleTarget - p.scaleCur) * 0.12
      p.group.scale.setScalar(this.wpp * p.scaleCur)
    }
    // 选中卡锚点逐帧投影（60Hz 直写 DOM，不经 React）
    if (this.anchorEl) {
      const sel = this.planets.find((p) => p.def.key === this.selectKey)
      if (sel) {
        const v = new THREE.Vector3()
        sel.group.getWorldPosition(v)
        v.project(this.camera)
        const rect = this.container.getBoundingClientRect()
        this.anchorEl.style.left = `${((v.x + 1) / 2) * rect.width}px`
        this.anchorEl.style.top = `${((1 - v.y) / 2) * rect.height}px`
        this.anchorEl.style.opacity = '1'
      } else {
        this.anchorEl.style.opacity = '0'
      }
    }
    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.raf)
    this.ac.abort()
    this.resizeObs.disconnect()
    for (const p of this.planets) {
      p.outer.geometry.dispose()
      p.outer.material.dispose()
      p.inner.geometry.dispose()
      p.inner.material.dispose()
      p.logoGeo.dispose()
      for (const m of p.logoMats) m.dispose()
      p.logoTex?.dispose()
    }
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
