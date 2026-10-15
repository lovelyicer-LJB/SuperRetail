// 🔴 改动 2026-10-09 · 食品原材料数字卡片三卡对比页（龙井/火腿/辣皮子）。
import { Link, useOutletContext } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import type { ShellTheme } from '@/components/shell/TopMenu'
import { FoodCard } from './FoodCard'
// 🔴 改动 2026-10-09 · 接入编号 5 全息镭射材质的三维卡片预览。
import { FoodCardModel } from './FoodCardModel'
// 🔴 改动 2026-10-10 · 演示数据集中到 ./data，页面不再持有数据。
import { demoFoodCards as cards } from './data'
// 🔴 改动 2026-10-10 · 购买按钮的 toast 反馈出口。
import { Toaster } from '@/components/ui/sonner'
import './food-card.css'

export function FoodCardsPage() {
  const { theme } = useOutletContext<{ theme: ShellTheme }>()
  const [holo3d, setHolo3d] = useState(true)
  return (
    <section className={`nft-showcase food-cards-showcase ${theme === 'light' ? 'is-light' : ''}`} aria-label="食品原材料数字卡片对比">
      <header className="nft-showcase-heading">
        <Link to="/workshop" className="nft-back"><ArrowLeft size={14} /> 工坊</Link>
        <div className="nft-eyebrow">FOOD ASSET CARDS / 03</div>
        <h1>原材料数字卡 <span>FOOD NFT</span></h1>
        <p>茶叶 · 火腿 · 辣椒 <span>三卡对比 / 同一全息卡版式</span></p>
      </header>
      <div className="nft-preview-tabs food-cards-tabs">
        <button aria-pressed={holo3d} onClick={() => setHolo3d(true)}>镭射材质 · 三维</button>
        <button aria-pressed={!holo3d} onClick={() => setHolo3d(false)}>平面版 · 信息密度</button>
      </div>
      <div className={holo3d ? 'food-cards-stage is-3d' : 'food-cards-stage'}>
        {cards.map((card) => holo3d
          ? <FoodCardModel key={card.id} data={card} />
          : <FoodCard key={card.id} data={card} />)}
      </div>
      <Toaster position="bottom-right" />
    </section>
  )
}
