// 🔴 改动 2026-10-09 · 食品原材料卡复用编号 5 全息三维模型：替换主视觉贴图与文字层。
// 🔴 改动 2026-10-10 · 三维卡支持点击翻面：左右半区分别向左/右整卡翻转，背面为溯源档案。
import { useEffect, useRef, useState } from 'react'
import * as T from 'three'
import QRCode from 'qrcode'
import { toast } from 'sonner'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { createCardModel, CARD } from '../cardModel'
import { brandTokens } from './tokens'
import type { BrandTokens } from './tokens'
import type { FoodCardData } from './data'

// 🔴 改动 2026-10-10 · 本地圆角矩形 Shape（与共享引擎 cardModel 的圆角参数一致，不改写共享代码）。
function roundedRect(w: number, h: number, r: number) {
  const s = new T.Shape(), x = -w / 2, y = -h / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y)
  return s
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/** 主视觉窗贴图：产品图 + 右上角认证徽章。 */
async function buildArtworkTexture(data: FoodCardData, b: BrandTokens) {
  const canvas = document.createElement('canvas')
  // 🔴 改动 2026-10-10 · 主视觉窗改为正方形（273x273 世界单位），圆角不变。
  canvas.width = 546; canvas.height = 546
  const ctx = canvas.getContext('2d')!
  const photo = await loadImage(data.image)
  const scale = Math.max(canvas.width / photo.width, canvas.height / photo.height)
  const w = photo.width * scale, h = photo.height * scale
  ctx.drawImage(photo, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h)
  // 徽章（圆形白底，与平面版一致）
  const badgeSize = 62
  let bx = canvas.width - 18 - badgeSize
  for (const badge of data.badges) {
    try {
      const icon = await loadImage(badge.src)
      ctx.save()
      ctx.beginPath(); ctx.arc(bx + badgeSize / 2, 18 + badgeSize / 2, badgeSize / 2, 0, Math.PI * 2); ctx.closePath()
      ctx.fillStyle = 'rgba(255,255,255,.88)'; ctx.fill(); ctx.clip()
      ctx.drawImage(icon, bx + 4, 22, badgeSize - 8, badgeSize - 8)
      ctx.restore()
      bx -= badgeSize + 12
    } catch { /* 徽标缺失时跳过 */ }
  }
  // 追加徽章（如「有机」），品牌 CTA 蓝紫圆形字标。
  if (data.extraBadge) {
    ctx.beginPath(); ctx.arc(bx + badgeSize / 2, 18 + badgeSize / 2, badgeSize / 2, 0, Math.PI * 2); ctx.closePath()
    ctx.fillStyle = b.cta; ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2; ctx.stroke()
    ctx.fillStyle = '#ffffff'; ctx.font = '24px "Noto Sans SC", sans-serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(data.extraBadge, bx + badgeSize / 2, 18 + badgeSize / 2)
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
  }
  // 🔴 改动 2026-10-10 · 移除稀有等级角标，不再绘制 SSR/SR/R。
  const texture = new T.CanvasTexture(canvas)
  texture.colorSpace = T.SRGBColorSpace
  // ShapeGeometry 的 UV 等于顶点坐标（-273/2..273/2），需归一化到 0-1。
  texture.repeat.set(1 / 273, 1 / 273)
  texture.offset.set(.5, .5)
  return texture
}
function buildTextTexture(data: FoodCardData, b: BrandTokens) {
  // 🔴 改动 2026-10-10 · 信息条重新排版：适配正方形图窗，加宽加高、拉开行距、突出卡名与估值。
  // 🔴 改动 2026-10-10 · 色值迁移到超零售品牌 token（银色全息膜为亮底，用亮色系 + 品牌强调色）。
  const canvas = document.createElement('canvas')
  canvas.width = 1120; canvas.height = 560
  const ctx = canvas.getContext('2d')!
  const pct = ((data.owned / data.total) * 100).toFixed(3)
  // 银色全息底上用深色文字，保持可读性（与编号 5 原版一致）。
  // 第一行：年份·版本（左） + 状态灯（右）。
  ctx.fillStyle = b.inkSub; ctx.font = '30px Inter, sans-serif'
  ctx.fillText(`${data.vintage} · ${data.edition}`, 8, 62)
  ctx.textAlign = 'right'
  ctx.fillStyle = b.navActive; ctx.font = '28px "Noto Sans SC", sans-serif'
  ctx.fillText(`● ${data.status}`, 1112, 62)
  ctx.textAlign = 'left'
  // 第二行：卡名（左，大字号） + 估值（右，品牌 CTA 色）。
  ctx.fillStyle = b.inkStrong; ctx.font = '600 76px "Noto Sans SC", sans-serif'
  ctx.fillText(data.name, 8, 158)
  ctx.textAlign = 'right'
  ctx.fillStyle = b.cta; ctx.font = '650 56px Inter, sans-serif'
  ctx.fillText(data.value, 1112, 158)
  ctx.textAlign = 'left'
  // 第三行：产地（左） + 单价（右）。
  ctx.fillStyle = b.inkSub; ctx.font = '28px "Noto Sans SC", sans-serif'
  ctx.fillText(data.origin, 8, 222)
  ctx.textAlign = 'right'
  ctx.fillStyle = b.inkFaint
  ctx.fillText(data.unitPrice, 1112, 222)
  ctx.textAlign = 'left'
  // 第四行：持有量/总量·占比。
  ctx.fillStyle = b.inkStrong; ctx.font = '600 46px Inter, sans-serif'
  ctx.fillText(`${data.owned.toLocaleString()}`, 8, 304)
  ctx.fillStyle = b.inkSub; ctx.font = '28px Inter, sans-serif'
  ctx.fillText(`/ ${data.total.toLocaleString()} ${data.unit} · ${pct}%`, 8 + ctx.measureText(`${data.owned.toLocaleString()} `).width + 22, 304)
  // 持有占比进度条：品牌青紫渐变。
  const barY = 336, barH = 14, barW = 1104
  ctx.fillStyle = 'rgba(7,7,12,.14)'
  ctx.beginPath(); ctx.roundRect(8, barY, barW, barH, 7); ctx.fill()
  const grad = ctx.createLinearGradient(8, 0, 8 + barW, 0)
  grad.addColorStop(0, b.gradStart); grad.addColorStop(.5, b.gradEnd); grad.addColorStop(1, b.purple)
  ctx.fillStyle = grad
  ctx.beginPath(); ctx.roundRect(8, barY, Math.max(barW * data.owned / data.total, 10), barH, 7); ctx.fill()
  // 🔴 改动 2026-10-10 · 品牌行移除，资产编号下移到底部锚点收尾。
  ctx.fillStyle = b.inkFaint; ctx.font = '26px Consolas, monospace'
  ctx.fillText(data.assetNo, 8, 508)
  const texture = new T.CanvasTexture(canvas)
  texture.colorSpace = T.SRGBColorSpace
  return texture
}

// 🔴 改动 2026-10-10 · 三维卡背贴图：溯源档案（二维码/批次/证书/发行价/流转记录），与平面版卡背字段口径一致。
// 🔴 改动 2026-10-10 · 色值迁移到超零售品牌 token（卡背为暗底，用暗色系灰阶 + 品牌强调色）。
async function buildBackTexture(data: FoodCardData, b: BrandTokens) {
  const canvas = document.createElement('canvas')
  canvas.width = 1110; canvas.height = 1620 // 对应 300x437 世界单位
  const ctx = canvas.getContext('2d')!
  // 深色渐变底（品牌暗色面板灰阶）。
  const bg = ctx.createLinearGradient(0, 0, 0, 1620)
  bg.addColorStop(0, b.dPanel); bg.addColorStop(.58, b.dPage); bg.addColorStop(1, b.dPanel)
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 1110, 1620)
  const toneColor = ({ gold: b.cyan, silver: b.dSub, red: b.red } as const)[data.editionTone]
  // 顶行：溯源档案角标（左） + 资产编号（右）。
  ctx.strokeStyle = toneColor; ctx.fillStyle = toneColor; ctx.lineWidth = 2
  ctx.beginPath(); ctx.roundRect(40, 48, 190, 64, 32); ctx.stroke()
  ctx.font = '30px "Noto Sans SC", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText('溯源档案', 135, 82)
  ctx.textAlign = 'right'; ctx.fillStyle = b.dGhost; ctx.font = '26px Consolas, monospace'
  ctx.fillText(data.assetNo, 1070, 84)
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
  // 溯源二维码：白底圆角承载，居中。
  const qrDataUrl = await QRCode.toDataURL(data.back.traceUrl, { margin: 1, width: 320, color: { dark: b.dPanel, light: '#ffffff' } })
  const qr = await loadImage(qrDataUrl)
  ctx.fillStyle = '#ffffff'
  ctx.beginPath(); ctx.roundRect(375, 170, 360, 360, 24); ctx.fill()
  ctx.drawImage(qr, 395, 190, 320, 320)
  ctx.fillStyle = b.cyan; ctx.font = '26px "Noto Sans SC", sans-serif'; ctx.textAlign = 'center'
  ctx.fillText('扫码溯源 · 全程可查', 555, 596)
  // 卡名。
  ctx.fillStyle = b.dText; ctx.font = '600 64px "Noto Sans SC", sans-serif'
  ctx.fillText(data.name, 555, 700)
  ctx.textAlign = 'left'
  // 批次 / 证书 / 发行价。
  const rows: [string, string][] = [['批次号', data.back.batchNo], ['证书编号', data.back.certNo], ['发行', data.back.issuePrice]]
  rows.forEach(([label, value], i) => {
    const y = 806 + i * 96
    ctx.fillStyle = b.dFaint; ctx.font = '28px "Noto Sans SC", sans-serif'
    ctx.fillText(label, 60, y)
    ctx.fillStyle = b.dText; ctx.font = '30px Consolas, monospace'; ctx.textAlign = 'right'
    ctx.fillText(value, 1050, y)
    ctx.textAlign = 'left'
    ctx.strokeStyle = 'rgba(255,255,255,.09)'; ctx.setLineDash([6, 8]); ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(60, y + 32); ctx.lineTo(1050, y + 32); ctx.stroke(); ctx.setLineDash([])
  })
  // 流转记录时间线：品牌青紫渐变圆点。
  data.back.circulation.forEach((record, i) => {
    const y = 1150 + i * 108
    const dot = ctx.createLinearGradient(60, y, 80, y); dot.addColorStop(0, b.gradStart); dot.addColorStop(1, b.gradEnd)
    ctx.fillStyle = dot; ctx.beginPath(); ctx.arc(70, y - 10, 9, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = b.dGhost; ctx.font = '24px Consolas, monospace'
    ctx.fillText(record.date, 104, y)
    ctx.fillStyle = b.dSub; ctx.font = '28px "Noto Sans SC", sans-serif'
    ctx.fillText(record.event, 300, y)
  })
  // 底部提示行。
  ctx.fillStyle = b.dFaint; ctx.font = '24px Inter, sans-serif'
  ctx.fillText('TRACEABILITY', 60, 1550)
  ctx.textAlign = 'right'; ctx.fillText('点击翻回', 1050, 1550)
  ctx.textAlign = 'left'
  const texture = new T.CanvasTexture(canvas)
  texture.colorSpace = T.SRGBColorSpace
  // ShapeGeometry 的 UV 等于顶点坐标，需归一化到 0-1。
  texture.repeat.set(1 / 300, 1 / 437)
  texture.offset.set(.5, .5)
  return texture
}

export function FoodCardModel({ data }: { data: FoodCardData }) {
  const host = useRef<HTMLDivElement>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    const mount = host.current!
    let renderer: T.WebGLRenderer
    try { renderer = new T.WebGLRenderer({ alpha: true, antialias: true }) }
    catch { queueMicrotask(() => setError(true)); return }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0, 0)
    renderer.toneMapping = T.ACESFilmicToneMapping
    renderer.toneMappingExposure = .8
    mount.appendChild(renderer.domElement)
    const scene = new T.Scene()
    const camera = new T.PerspectiveCamera(35, 1, 500, 2000)
    camera.position.set(0, 0, 1200)
    const pmrem = new T.PMREMGenerator(renderer)
    const room = new RoomEnvironment()
    const environment = pmrem.fromScene(room, .04)
    scene.environment = environment.texture
    room.dispose(); pmrem.dispose()
    scene.add(new T.HemisphereLight('#f5f7ff', '#52658f', 2))
    const light = new T.DirectionalLight('#ffffff', 3); light.position.set(-300, 400, 600); scene.add(light)
    const model = createCardModel()
    // 🔴 改动 2026-10-10 · 翻面挂在父级 Group 上，与拖动旋转（model 自身四元数）互不干扰。
    const flip = new T.Group()
    flip.add(model)
    scene.add(flip)

    let disposed = false
    const textures: T.Texture[] = []
    void (async () => {
      // 🔴 改动 2026-10-10 · 贴图色值统一走超零售品牌 token。
      const brand = brandTokens()
      const [artwork, text, backTex] = await Promise.all([buildArtworkTexture(data, brand), Promise.resolve(buildTextTexture(data, brand)), buildBackTexture(data, brand)])
      if (disposed) return
      textures.push(artwork, text, backTex)
      const imageMesh = model.getObjectByName('replaceable-image') as T.Mesh
      ;(imageMesh.material as T.MeshBasicMaterial).dispose()
      imageMesh.material = new T.MeshBasicMaterial({ map: artwork })
      // 🔴 改动 2026-10-10 · 主视觉窗改正方形：顶边不动（y=214），下缘上推，圆角不变。
      imageMesh.geometry.dispose()
      imageMesh.geometry = new T.ShapeGeometry(roundedRect(273, 273, 6), 24)
      imageMesh.position.set(0, 77.5, .04)
      const rimMesh = model.getObjectByName('display-window-rim') as T.Mesh
      rimMesh.geometry.dispose()
      rimMesh.geometry = new T.ShapeGeometry(roundedRect(277, 277, 8), 24)
      rimMesh.position.set(0, 77.5, .025)
      // 边框 shader 的光谱按 frameSize 归一化，同步为方形尺寸。
      ;((rimMesh.material as T.ShaderMaterial).uniforms.frameSize.value as T.Vector2).set(277, 277)
      const textMesh = model.getObjectByName('replaceable-text') as T.Mesh
      const textMaterial = textMesh.material as T.MeshBasicMaterial
      textMaterial.map?.dispose()
      textMaterial.map = text
      textMaterial.needsUpdate = true
      // 🔴 改动 2026-10-10 · 信息条上移至正方形图窗下方，加宽到 300、加高到 150，容纳新排版。
      textMesh.geometry.dispose()
      textMesh.geometry = new T.PlaneGeometry(300, 150)
      textMesh.position.set(0, -142, .055)
      // 隐藏原以太坊图标，让位给信息条。
      const icon = model.getObjectByName('replaceable-icon')
      if (icon) icon.visible = false
      // 🔴 改动 2026-10-10 · 卡背溯源档案层：挂在 back 面组上（该组已绕 Y 旋转 180°，文字方向自然正确）。
      const backFace = model.getObjectByName('back')!
      const backMaterial = new T.MeshBasicMaterial({ map: backTex })
      // 与共享引擎相同的分层渲染参数，避免与全息底膜深度冲突。
      backMaterial.depthTest = false
      backMaterial.polygonOffset = true; backMaterial.polygonOffsetFactor = -1; backMaterial.polygonOffsetUnits = -8
      const backMesh = new T.Mesh(new T.ShapeGeometry(roundedRect(300, 437, 14), 24), backMaterial)
      backMesh.position.set(0, 0, .04)
      backMesh.renderOrder = 3
      backMesh.name = 'food-card-back-info'
      backFace.add(backMesh)
    })()

    // 拖动旋转（与编号 5 预览一致的手感）。
    const canvas = renderer.domElement
    let pointer: number | null = null
    let lastX = 0, lastY = 0
    // 🔴 改动 2026-10-10 · 点击翻面：位移小于阈值视为点击；左半区向左翻、右半区向右翻。
    let downX = 0, downY = 0
    let flipTarget = 0, flipCurrent = 0
    mount.dataset.flipped = 'false'
    const axis = new T.Vector3()
    const delta = new T.Quaternion()
    const stopDrag = () => { if (pointer !== null && canvas.hasPointerCapture(pointer)) canvas.releasePointerCapture(pointer); pointer = null }
    const down = (event: PointerEvent) => {
      if (pointer !== null || !event.isPrimary || event.button !== 0) return
      pointer = event.pointerId; lastX = event.clientX; lastY = event.clientY
      downX = event.clientX; downY = event.clientY
      canvas.setPointerCapture(pointer); event.preventDefault()
    }
    const move = (event: PointerEvent) => {
      if (event.pointerId !== pointer) return
      const dx = event.clientX - lastX, dy = event.clientY - lastY
      lastX = event.clientX; lastY = event.clientY
      const distance = Math.hypot(dx, dy)
      if (!distance) return
      axis.set(dy, dx, 0).normalize()
      delta.setFromAxisAngle(axis, distance * Math.PI / Math.max(240, mount.clientHeight))
      model.quaternion.premultiply(delta).normalize()
      event.preventDefault()
    }
    const up = (event: PointerEvent) => {
      if (event.pointerId !== pointer) return
      // 位移小于 6px 视为点击：左半区向左转 180°、右半区向右转 180°，正背面均适用。
      if (Math.hypot(event.clientX - downX, event.clientY - downY) < 6) {
        const rect = canvas.getBoundingClientRect()
        flipTarget += event.clientX < rect.left + rect.width / 2 ? -Math.PI : Math.PI
        mount.dataset.flipped = Math.abs(Math.round(flipTarget / Math.PI)) % 2 === 1 ? 'true' : 'false'
      }
      stopDrag()
    }
    canvas.addEventListener('pointerdown', down)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerup', up)
    canvas.addEventListener('pointercancel', up)
    canvas.addEventListener('lostpointercapture', up)
    window.addEventListener('blur', stopDrag)

    const resize = new ResizeObserver(() => {
      const w = mount.clientWidth, h = mount.clientHeight
      renderer.setSize(w, h)
      camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix()
      const worldPerPixel = 2 * camera.position.z * Math.tan(T.MathUtils.degToRad(camera.fov / 2)) / Math.max(1, h)
      model.scale.setScalar(Math.min((w - 16) / CARD.width, (h - 16) / CARD.height) * worldPerPixel * .9)
    })
    resize.observe(mount)
    let visible = true
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting }); observer.observe(mount)
    renderer.setAnimationLoop(() => {
      if (document.hidden || !visible) return
      // 翻面动画：缓动逼近目标角度（0 正面 / ±π 背面）。
      flipCurrent += (flipTarget - flipCurrent) * .12
      if (Math.abs(flipTarget - flipCurrent) < .002) flipCurrent = flipTarget
      flip.rotation.y = flipCurrent
      renderer.render(scene, camera)
      mount.dataset.ready = 'true'
    })
    const lost = (e: Event) => { e.preventDefault(); setError(true); renderer.setAnimationLoop(null) }
    canvas.addEventListener('webglcontextlost', lost)
    return () => {
      disposed = true
      renderer.setAnimationLoop(null); resize.disconnect(); observer.disconnect(); stopDrag()
      canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', up)
      canvas.removeEventListener('lostpointercapture', up); window.removeEventListener('blur', stopDrag)
      canvas.removeEventListener('webglcontextlost', lost)
      const materials = new Set<T.Material>()
      model.traverse(o => { if (o instanceof T.Mesh) { o.geometry.dispose(); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => materials.add(m)) } })
      materials.forEach(m => { if ('map' in m && m.map instanceof T.Texture) m.map.dispose(); m.dispose() })
      textures.forEach(t => t.dispose())
      environment.dispose(); renderer.dispose(); renderer.domElement.remove()
    }
  }, [data])

  return (
    <figure className="food-card-model" aria-label={`${data.name}镭射材质三维卡片`}>
      <div className="food-card-model-canvas" ref={host}>
        {error && <p role="alert">3D 显示不可用，请启用浏览器图形加速。</p>}
      </div>
      {/* 🔴 改动 2026-10-10 · 购买按钮：卡片右下角 HTML 覆盖层，翻到背面时隐藏。 */}
      <button
        type="button"
        className="food-card-buy"
        aria-label={`购买${data.name}`}
        onClick={() => toast.success(`${data.name} 已加入采购清单`, { description: `${data.unitPrice} · ${data.assetNo}` })}
      >购买</button>
      <figcaption>{data.name} · 拖动旋转 · 点击翻面查看溯源</figcaption>
    </figure>
  )
}
