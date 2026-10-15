// 🔴 改动 2026-10-09 · 使用 AE 编号 5 的透明材质动画，支持拖动、暂停和键盘查看。
import { useEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { Pause, Play, RotateCcw } from 'lucide-react'

const mediaRoot = `${import.meta.env.BASE_URL}assets/nft-card-05/`
const forwardDuration = 65 / 30

export function HolographicCard() {
  const video = useRef<HTMLVideoElement>(null)
  const surface = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(false)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [angle, setAngle] = useState(0)
  const desiredPlay = useRef(false)
  const dragging = useRef(false)
  const pendingTime = useRef<number | null>(null)

  useEffect(() => {
    const element = video.current!
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    desiredPlay.current = !motion.matches
    let inView = true
    const sync = () => {
      if (desiredPlay.current && !document.hidden && inView) {
        void element.play().catch(() => { desiredPlay.current = false; setPlaying(false) })
      } else element.pause()
    }
    const onReady = () => { setReady(true); sync() }
    const onMotion = () => { if (motion.matches) desiredPlay.current = false; sync() }
    const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; sync() })
    observer.observe(surface.current!)
    element.addEventListener('canplay', onReady)
    document.addEventListener('visibilitychange', sync)
    motion.addEventListener('change', onMotion)
    if (element.readyState >= 3) onReady()
    return () => {
      observer.disconnect()
      element.removeEventListener('canplay', onReady)
      document.removeEventListener('visibilitychange', sync)
      motion.removeEventListener('change', onMotion)
      element.pause()
    }
  }, [])

  const seek = (value: number) => {
    const element = video.current
    if (!element || !ready || failed) return
    desiredPlay.current = false
    element.pause()
    setAngle(value)
    const time = value / 100 * forwardDuration
    if (element.seeking) pendingTime.current = time
    else element.currentTime = time
  }

  const seekFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    seek(Math.max(0, Math.min(100, (event.clientX - bounds.left) / bounds.width * 100)))
  }

  const toggle = () => {
    const element = video.current!
    desiredPlay.current = !desiredPlay.current
    pendingTime.current = null
    if (desiredPlay.current) void element.play().catch(() => { desiredPlay.current = false; setPlaying(false) })
    else element.pause()
  }

  return (
    <div className="nft-card-player">
      <div
        ref={surface}
        className="nft-card-surface"
        role="group"
        aria-label="编号 5 全息卡片，左右拖动查看材质"
        onPointerDown={(event) => {
          if (!ready || failed) return
          dragging.current = true
          event.currentTarget.setPointerCapture(event.pointerId)
          seekFromPointer(event)
        }}
        onPointerMove={(event) => { if (dragging.current) seekFromPointer(event) }}
        onPointerUp={() => { dragging.current = false }}
        onPointerCancel={() => { dragging.current = false }}
        onLostPointerCapture={() => { dragging.current = false }}
      >
        <img className="nft-card-poster" src={`${mediaRoot}poster.webp`} alt="NFT CARD 05：银色全息卡框、深色展示窗、Atamotion 标题及以太坊标记" />
        <video
          ref={video}
          className={`nft-card-video ${ready && !failed ? 'is-ready' : ''}`}
          src={`${mediaRoot}holographic-05.webm`}
          muted loop playsInline preload="auto"
          aria-label="NFT CARD 05 原始全息材质动画"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onError={() => { setFailed(true); setPlaying(false); desiredPlay.current = false }}
          onSeeked={() => {
            const element = video.current!
            if (pendingTime.current !== null) {
              const time = pendingTime.current
              pendingTime.current = null
              if (Math.abs(element.currentTime - time) > 0.005) element.currentTime = time
            }
          }}
          onTimeUpdate={() => {
            if (!dragging.current && pendingTime.current === null) {
              const time = video.current!.currentTime
              setAngle(Math.max(0, Math.min(100, (time <= forwardDuration ? time : 2 * forwardDuration - time) / forwardDuration * 100)))
            }
          }}
        />
      </div>
      <div className="nft-card-controls">
        <div className="nft-card-buttons">
          <button type="button" onClick={toggle} disabled={!ready || failed} aria-label={playing ? '暂停材质动画' : '播放材质动画'}>
            {playing ? <Pause size={15} /> : <Play size={15} />} {playing ? '暂停' : '播放'}
          </button>
          <button type="button" onClick={() => seek(50)} disabled={!ready || failed} aria-label="重置卡片角度"><RotateCcw size={15} /> 复位</button>
        </div>
        <label className="nft-angle-control">
          <span>材质视角</span>
          <input aria-label="材质视角" type="range" min="0" max="100" step="0.5" value={angle} onChange={(event) => seek(Number(event.target.value))} disabled={!ready || failed} />
        </label>
        <p className="nft-card-help" role="status">{failed ? '动画加载失败，当前显示静态预览' : ready ? '左右拖动卡片，查看全息反射' : '正在加载全息材质…'}</p>
      </div>
    </div>
  )
}
