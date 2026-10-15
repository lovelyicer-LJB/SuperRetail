// 🔴 改动 2026-10-11 · 同一个资产的列表、图标与商城展示，共享既有原材料资料。
import { ArrowUpRight, BadgeCheck, Box, MapPin, RotateCw } from 'lucide-react'
import { useState } from 'react'
import type { FoodCardData } from '../food-card/data'
import { chiliAsset } from './graph'
// 🔴 改动 2026-10-11 · 图标加入符文镶嵌外框和选中微光，资产信息组件保持原样。
import { RuneOrnament } from './RuneOrnament'

// 🔴 改动 2026-10-12 · AssetIcon 数据口径放宽为结构子集：原材料 / 角色 / 配方卡数据均可直接传入。
export type AssetIconSource = Pick<FoodCardData, 'name' | 'image' | 'imageAlt' | 'owned' | 'unit' | 'editionTone' | 'status'>

// 🔴 改动 2026-10-12 · 数量玻璃标签移入图标内部底部，保持内容自适应宽度。
export function AssetIcon({ asset = chiliAsset, size = 64, variant = 'list', rune = variant === 'board', energized = false }: { asset?: AssetIconSource; size?: number; variant?: 'list' | 'board'; rune?: boolean; energized?: boolean }) {
  const icon = <span className={`asset-icon ${variant === 'board' ? 'asset-icon-board' : ''} ${rune ? 'asset-rune' : ''} ${energized ? 'is-energized' : ''}`} data-rune-tone={asset.editionTone} data-mini={size < 48 || undefined} style={{ width: size, height: size }}>
    <img src={asset.image} alt={asset.imageAlt} draggable={false} />
    {variant === 'board' && <span className="asset-icon-glass"><span>{asset.name}</span></span>}
    {variant === 'board' && <span className="asset-quantity-glass" aria-label={`资产数量 ${asset.owned.toLocaleString()} ${asset.unit}`}><strong>{asset.owned.toLocaleString()}</strong><span>{asset.unit}</span></span>}
    {rune && <RuneOrnament />}
    <span className="asset-icon-dot" title={asset.status} />
  </span>
  return variant === 'board' ? <span className="asset-board-token" style={{ width: size }}>
    {icon}
  </span> : icon
}

export function AssetInfo({ onDetails }: { onDetails: () => void }) {
  return <button className="asset-info-row" onClick={onDetails} aria-label="查看安集海辣皮子资产档案">
    <AssetIcon size={44} />
    <span className="asset-info-name"><strong>{chiliAsset.name}</strong><small>原材料 · 新疆沙湾</small></span>
    <span className="asset-info-value"><strong>{chiliAsset.value}</strong><small>{chiliAsset.owned} {chiliAsset.unit} · {chiliAsset.status}</small></span>
    <ArrowUpRight size={16} />
  </button>
}

export function AssetMarketCard({ onDetails }: { onDetails: () => void }) {
  const [back, setBack] = useState(false)
  return <article className="asset-market-card">
    <div className="asset-market-art">
      {back ? <div className="asset-market-trace"><span>ASSET PASSPORT</span><h3>一份有来处的资产</h3><p>{chiliAsset.origin}</p>{chiliAsset.back.circulation.map((item) => <p key={item.date}><small>{item.date}</small>{item.event}</p>)}<small>样本溯源记录 · 演示资料</small></div>
        : <><img src={chiliAsset.image} alt={chiliAsset.imageAlt} /><span className="asset-market-edition">{chiliAsset.edition}</span><span className="asset-market-origin"><MapPin size={12} /> 新疆 · 沙湾</span></>}
      <button className="asset-flip" onClick={() => setBack(!back)} aria-label={back ? '查看资产正面' : '翻转查看溯源'}><RotateCw size={15} /></button>
    </div>
    <div className="asset-market-body"><div className="asset-market-kicker">原材料资产 <span><BadgeCheck size={13} /> 地理标志</span></div>
      <h3>{chiliAsset.name}</h3><p>{chiliAsset.vintage} · 香辛料</p>
      <div className="asset-market-price"><strong>{chiliAsset.unitPrice.replace(/^单价\s*/, '').split('/')[0]}<small> / {chiliAsset.unit}</small></strong><span><Box size={12} /> {chiliAsset.status}</span></div>
      <button className="asset-primary" onClick={onDetails}>查看资产 <ArrowUpRight size={15} /></button>
    </div>
  </article>
}
