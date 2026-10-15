// 🔴 改动 2026-10-09 · 第二步：独立卡身、正反面、外框、展示窗与文字层。
import * as T from 'three'
// 🔴 改动 2026-10-09 · 正反底材及框线使用全息薄膜。
import { createHolographicMaterial, createLaserFrameMaterial } from './holographicMaterial'

export const CARD = { width: 325, height: 475, thickness: 2, radius: 18 }

function rounded(w: number, h: number, r: number) {
  const s = new T.Shape(), x = -w / 2, y = -h / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y)
  return s
}

export function createCardModel() {
  const card = new T.Group()
  card.name = 'NFT Card 05'
  const bodyShape = rounded(CARD.width - .5, CARD.height - .5, CARD.radius - .25)
  const bodyGeometry = new T.ExtrudeGeometry(bodyShape, { depth: 1.5, bevelEnabled: true, bevelThickness: .25, bevelSize: .25, bevelSegments: 3, curveSegments: 24, steps: 1 })
  bodyGeometry.translate(0, 0, -.75)
  const glass = new T.MeshPhysicalMaterial({ color: '#d2efff', roughness: .08, metalness: 0, transmission: .95, thickness: 2, ior: 1.5, clearcoat: 1, attenuationColor: new T.Color('#ccecff'), attenuationDistance: 12 })
  // 玻璃只覆盖挤出侧边，正反面由不透明全息膜承担。
  const cap = new T.MeshBasicMaterial({ visible: false })
  const body = new T.Mesh(bodyGeometry, [cap, glass])
  body.name = 'glass-body-2px'; card.add(body)

  const base = createHolographicMaterial()
  // 🔴 改动 2026-10-09 · 内外框分别按自身尺寸生成高亮光谱彩条。
  const line = createLaserFrameMaterial(309, 459)
  const front = new T.Group(); front.name = 'front'; front.position.z = 1.002
  const back = new T.Group(); back.name = 'back'; back.position.z = -1.002; back.rotation.y = Math.PI
  for (const face of [front, back]) {
    const surface = new T.Mesh(new T.ShapeGeometry(rounded(324.5, 474.5, 17.75), 24), base)
    surface.name = 'material-surface'; face.add(surface)
    const border = rounded(309, 459, 11)
    border.holes.push(new T.Path(rounded(305, 455, 9).getPoints(24).reverse()))
    const rim = new T.Mesh(new T.ShapeGeometry(border, 24), line)
    rim.position.z = .012; rim.name = 'outer-laser-frame'; face.add(rim)
    card.add(face)
  }
  const windowRim = new T.Mesh(new T.ShapeGeometry(rounded(277, 340, 8), 24), createLaserFrameMaterial(277, 340))
  windowRim.position.set(0, 46, .025); windowRim.name = 'display-window-rim'; front.add(windowRim)
  const window = new T.Mesh(new T.ShapeGeometry(rounded(273, 336, 6), 24), new T.MeshBasicMaterial({ color: '#090c16' }))
  window.position.set(0, 46, .04); window.name = 'replaceable-image'; front.add(window)

  const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 300
  const context = canvas.getContext('2d')!
  context.fillStyle = '#12151f'; context.font = '76px Georgia'; context.fillText('Atamotion', 8, 100)
  context.font = '48px Georgia'; context.fillText('NFT Cards Visualizer', 8, 194)
  const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace
  const text = new T.Mesh(new T.PlaneGeometry(225, 62.5), new T.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }))
  text.name = 'replaceable-text'; text.position.set(-10, -175, .055); front.add(text)
  const icon = new T.Group(); icon.name = 'replaceable-icon'; icon.position.set(119, -163, .07)
  icon.add(new T.Mesh(new T.CircleGeometry(12, 48), new T.MeshBasicMaterial({ color: '#e2e4f4' })))
  const diamond = new T.Shape(); diamond.moveTo(0, 9); diamond.lineTo(5, 0); diamond.lineTo(0, -4); diamond.lineTo(-5, 0); diamond.closePath()
  const symbol = new T.Mesh(new T.ShapeGeometry(diamond), new T.MeshBasicMaterial({ color: '#4b52ec' })); symbol.position.z = .01; icon.add(symbol); front.add(icon)
  card.userData.dimensions = CARD
  // 🔴 改动 2026-10-09 · 薄膜层独立深度偏移，防止软件渲染器斜视深度冲突。
  for (const face of [front, back]) face.traverse(object => {
    if (!(object instanceof T.Mesh)) return
    const material = object.material as T.Material
    object.renderOrder = object.name === 'material-surface' ? 1 : object.name === 'replaceable-image' ? 3 : 2
    material.depthTest = false
    material.polygonOffset = true
    material.polygonOffsetFactor = -1
    material.polygonOffsetUnits = object.name === 'material-surface' ? -2 : object.name === 'replaceable-image' ? -8 : -4
  })
  return card
}

