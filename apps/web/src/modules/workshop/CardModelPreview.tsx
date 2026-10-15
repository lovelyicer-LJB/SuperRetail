// 🔴 改动 2026-10-09 · 真实三维模型的正面、反面和玻璃侧边验收预览。
import { useEffect, useRef, useState } from 'react'
import * as T from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { createCardModel, CARD } from './cardModel'
import './card-model.css'
// 🔴 改动 2026-10-09 · 不重建模型即可实时更新材质与灯光。
import { MaterialControls, type MaterialState } from './MaterialControls'

type View = 'front' | 'back' | 'side' | 'perspective'
export function CardModelPreview() {
  const host = useRef<HTMLDivElement>(null)
  const changeView = useRef<(view: View) => void>(() => {})
  const [error, setError] = useState(false)
  const updateMaterials = useRef<(values: MaterialState) => void>(() => {})
  useEffect(() => {
    const mount = host.current!
    let renderer: T.WebGLRenderer
    try { renderer = new T.WebGLRenderer({ alpha: true, antialias: true }) }
    catch { queueMicrotask(() => setError(true)); return }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0, 0)
    renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = .8
    mount.appendChild(renderer.domElement)
    const scene = new T.Scene()
    // 🔴 改动 2026-10-09 · 收紧深度范围，避免薄卡面层在斜视时闪烁。
    // 🔴 改动 2026-10-09 · 透视投影让靠近的一侧明显放大，消除正交投影的旋转方向歧义。
    const camera = new T.PerspectiveCamera(35, 1, 500, 2000)
    camera.position.set(0, 0, 1200)
    const pmrem = new T.PMREMGenerator(renderer)
    const room = new RoomEnvironment()
    const environment = pmrem.fromScene(room, .04)
    scene.environment = environment.texture
    room.dispose(); pmrem.dispose()
    const ambient = new T.HemisphereLight('#f5f7ff', '#52658f', 2); scene.add(ambient)
    const light = new T.DirectionalLight('#ffffff', 3); light.position.set(-300, 400, 600); scene.add(light)
    const model = createCardModel(); scene.add(model)
    updateMaterials.current = values => {
      model.traverse(object => {
        if (!(object instanceof T.Mesh)) return
        if (object.name === 'material-surface') {
          const material = object.material as T.MeshPhysicalMaterial
          for (const [key, value] of Object.entries(values.foil)) material.userData.foilUniforms[key].value = value
          const p = values.physical
          material.color.setRGB(p.red, p.green, p.blue)
          material.metalness = p.metalness; material.roughness = p.roughness
          material.clearcoat = p.clearcoat; material.clearcoatRoughness = p.clearcoatRoughness
          material.iridescence = p.iridescence; material.iridescenceIOR = p.iridescenceIOR
          material.iridescenceThicknessRange = [p.thicknessMin, p.thicknessMax]
          // Keep physical shader features enabled even when their strength is zero.
          material.clearcoat = Math.max(.00001, material.clearcoat)
          material.iridescence = Math.max(.00001, material.iridescence)
        }
        if (object.name === 'outer-laser-frame' || object.name === 'display-window-rim') {
          const material = object.material as T.ShaderMaterial
          const group = object.name === 'outer-laser-frame' ? values.outer : values.inner
          for (const [key, value] of Object.entries(group)) material.uniforms[key].value = value
        }
        if (object.name === 'glass-body-2px') {
          const material = (object.material as T.Material[])[1] as T.MeshPhysicalMaterial
          const g = values.glass
          material.color.setRGB(g.red, g.green, g.blue)
          material.roughness = g.roughness; material.transmission = Math.max(.00001, g.transmission)
          material.ior = g.ior; material.thickness = g.thickness
          material.clearcoat = Math.max(.00001, g.clearcoat); material.attenuationDistance = g.attenuationDistance
        }
      })
      renderer.toneMappingExposure = values.light.exposure
      ambient.intensity = values.light.ambient; light.intensity = values.light.direct
      light.position.set(values.light.x, values.light.y, values.light.z)
      mount.dataset.materialValues = JSON.stringify(values)
    }
    mount.dataset.geometry = JSON.stringify({ ...CARD, backParts: model.getObjectByName('back')!.children.map(c => c.name) })
    // 🔴 改动 2026-10-09 · 固定相机，按屏幕轴增量旋转卡片；翻面不反向，无惯性回拉。
    const canvas = renderer.domElement
    let pointer: number | null = null
    let lastX = 0, lastY = 0
    const axis = new T.Vector3()
    const delta = new T.Quaternion()
    const publishRotation = () => { mount.dataset.rotation = JSON.stringify(model.quaternion.toArray()) }
    const stopDrag = () => {
      if (pointer !== null && canvas.hasPointerCapture(pointer)) canvas.releasePointerCapture(pointer)
      pointer = null
    }
    const down = (event: PointerEvent) => {
      if (pointer !== null || !event.isPrimary || event.button !== 0) return
      pointer = event.pointerId; lastX = event.clientX; lastY = event.clientY
      canvas.setPointerCapture(pointer); event.preventDefault()
    }
    const move = (event: PointerEvent) => {
      if (event.pointerId !== pointer) return
      const dx = event.clientX - lastX, dy = event.clientY - lastY
      lastX = event.clientX; lastY = event.clientY
      const distance = Math.hypot(dx, dy)
      if (!distance) return
      // 🔴 改动 2026-10-09 · 向右拖左边靠近、右边远离；向下拖上边靠近、下边远离。
      axis.set(dy, dx, 0).normalize()
      delta.setFromAxisAngle(axis, distance * Math.PI / Math.max(240, mount.clientHeight))
      model.quaternion.premultiply(delta).normalize()
      publishRotation(); event.preventDefault()
    }
    const up = (event: PointerEvent) => { if (event.pointerId === pointer) stopDrag() }
    canvas.addEventListener('pointerdown', down)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerup', up)
    canvas.addEventListener('pointercancel', up)
    canvas.addEventListener('lostpointercapture', up)
    window.addEventListener('blur', stopDrag)
    changeView.current = (view) => {
      stopDrag()
      const positions = { front: [0, 0, 1200], back: [0, 0, -1200], side: [1200, 0, 0], perspective: [800, 260, 1100] }
      const reference = new T.Object3D()
      reference.position.fromArray(positions[view]); reference.lookAt(0, 0, 0)
      // Camera's forward axis is -Z, unlike Object3D's +Z.
      const presetCamera = new T.PerspectiveCamera()
      presetCamera.position.copy(reference.position); presetCamera.lookAt(0, 0, 0)
      model.quaternion.copy(presetCamera.quaternion).invert()
      publishRotation(); mount.dataset.view = view
    }
    changeView.current('front')
    const resize = new ResizeObserver(() => {
      const w = mount.clientWidth, h = mount.clientHeight
      renderer.setSize(w, h)
      camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix()
      const worldPerPixel = 2 * camera.position.z * Math.tan(T.MathUtils.degToRad(camera.fov / 2)) / Math.max(1, h)
      model.scale.setScalar(Math.min((w - 32) / CARD.width, (h - 28) / CARD.height) * worldPerPixel * .9)
    })
    resize.observe(mount)
    let visible = true
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting }); observer.observe(mount)
    renderer.setAnimationLoop(() => {
      if (document.hidden || !visible) return
      renderer.render(scene, camera)
      mount.dataset.ready = 'true'
    })
    const lost = (e: Event) => { e.preventDefault(); setError(true); renderer.setAnimationLoop(null) }
    renderer.domElement.addEventListener('webglcontextlost', lost)
    return () => {
      renderer.setAnimationLoop(null); resize.disconnect(); observer.disconnect(); stopDrag()
      canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', up)
      canvas.removeEventListener('lostpointercapture', up); window.removeEventListener('blur', stopDrag)
      const materials = new Set<T.Material>()
      model.traverse(o => { if (o instanceof T.Mesh) { o.geometry.dispose(); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => materials.add(m)) } })
      materials.forEach(m => { if ('map' in m && m.map instanceof T.Texture) m.map.dispose(); m.dispose() })
      environment.dispose(); renderer.dispose(); renderer.domElement.removeEventListener('webglcontextlost', lost); renderer.domElement.remove()
      changeView.current = () => {}
      updateMaterials.current = () => {}
    }
  }, [])
  return <div className="card-model-preview">
    <div className="card-model-workspace"><div className="card-model-viewer">
    <div className="card-model-canvas" ref={host} aria-label="NFT 卡片三维模型，拖动查看正反面和厚度">{error && <p role="alert">3D 显示不可用，请刷新页面或启用浏览器图形加速。</p>}</div>
    <div className="card-model-views">{([['front','正面'],['back','反面'],['side','侧面 · 2px'],['perspective','立体视角']] as const).map(([view,label]) => <button key={view} disabled={error} onClick={() => changeView.current(view)}>{label}</button>)}</div>
    {/* 🔴 改动 2026-10-09 · 第三步材质验收提示。 */}
    <p className="card-model-note">透视拖拽 v2 · 向右拖：左边靠近、右边远离 · 松手即停</p>
    </div><MaterialControls onChange={values => updateMaterials.current(values)} /></div>
  </div>
}

