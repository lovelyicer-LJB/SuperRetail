// 🔴 改动 2026-10-09 · 工坊增加 NFT CARD 05 材质展示页。
import { Link, useOutletContext } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import type { ShellTheme } from '@/components/shell/TopMenu'
import { HolographicCard } from './HolographicCard'
import './nft-card.css'
// 🔴 改动 2026-10-09 · 第二步模型验收与原始 AE 参考并列保留。
import { useState } from 'react'
import { CardModelPreview } from './CardModelPreview'

export function NftCardPage() {
  const { theme } = useOutletContext<{ theme: ShellTheme }>()
  const [model, setModel] = useState(true)
  return (
    <section className={`nft-showcase ${theme === 'light' ? 'is-light' : ''}`} aria-label="全息卡片展示">
      <header className="nft-showcase-heading">
        <Link to="/workshop" className="nft-back"><ArrowLeft size={14} /> 工坊</Link>
        <div className="nft-eyebrow">MATERIAL STUDY / 05</div>
        <h1>NFT CARD <span>05</span></h1>
        <p>Holographic <span>全息材质</span></p>
      </header>
      {/* 🔴 改动 2026-10-09 · 第三步全息材质验收入口。 */}
      <div className="nft-preview-tabs"><button aria-pressed={model} onClick={() => setModel(true)}>第 3 步 · 全息材质</button><button aria-pressed={!model} onClick={() => setModel(false)}>AE 原版参考</button></div>
      <div className={`nft-stage ${model ? 'is-model' : ''}`}>{model ? <CardModelPreview /> : <HolographicCard />}</div>
    </section>
  )
}
