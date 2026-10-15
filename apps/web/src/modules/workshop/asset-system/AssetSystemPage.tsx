// 🔴 改动 2026-10-11 · 工坊四态数字资产体验页，以安集海辣皮子贯穿四种形态。
import { useEffect, useRef, useState } from 'react'
import { Link, useOutletContext } from 'react-router'
import { ArrowLeft, ArrowUpRight, Box, Check, ChevronRight, Layers3, LayoutList, Network, Scan, X } from 'lucide-react'
import type { ShellTheme } from '@/components/shell/TopMenu'
import { demoFoodCards } from '../food-card/data'
import { AssetIcon, AssetInfo, AssetMarketCard } from './AssetForms'
import { AssetGraph } from './AssetGraph'
import { chiliAsset } from './graph'
import './asset-system.css'
// 🔴 改动 2026-10-11 · 图标与节点引入同一套克制的符文镶嵌美术语言。
import { RuneOrbit } from './RuneOrnament'
import './asset-runes.css'

const tabs = [{ id: 'all', label: '全部形态', icon: Layers3 }, { id: 'info', label: '信息组件', icon: LayoutList }, { id: 'icon', label: '图标形态', icon: Scan }, { id: 'card', label: '资产卡片', icon: Box }, { id: 'node', label: '资产节点', icon: Network }]

export function AssetSystemPage() {
  const { theme } = useOutletContext<{ theme: ShellTheme }>()
  const [active, setActive] = useState('all')
  const [details, setDetails] = useState(false)
  const [selectedIcon, setSelectedIcon] = useState(chiliAsset.id)
  // 🔴 改动 2026-10-11 · 图标形态分为列表与画板，默认展示新增的玻璃名称子形态。
  const [iconVariant, setIconVariant] = useState<'list' | 'board'>('board')
  const [compact, setCompact] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => { if (details) dialog.current?.showModal(); else dialog.current?.close() }, [details])
  const visible = (id: string) => active === 'all' || active === id
  const selectedAsset = demoFoodCards.find((asset) => asset.id === selectedIcon)!
  return <div className={`asset-lab ${theme === 'light' ? 'is-light' : ''}`}>
    <div className="asset-lab-inner">
      <div className="asset-breadcrumb"><Link to="/workshop"><ArrowLeft size={14} /> 工坊</Link><ChevronRight size={12} /><span>数字资产系统</span><span className="asset-version">DESIGN STUDY / 01</span></div>
      <header className="asset-lab-hero"><div><p className="asset-eyebrow">ONE ASSET. FOUR FORMS.</p><h1>同一资产，<span>四种形态。</span></h1><p className="asset-lab-intro">从信息呈现到资产协作，让每一种形态都各司其职。</p></div><div className="asset-sample"><AssetIcon size={60} /><div><small>本次样本 / 原材料资产</small><strong>{chiliAsset.name}</strong><span>{chiliAsset.origin}</span></div><span className="asset-sample-status"><i /> 在仓</span></div></header>
      <div className="asset-navigation" role="tablist" aria-label="资产形态"><div>{tabs.map(({ id, label, icon: Icon }) => <button role="tab" aria-selected={active === id} aria-controls={`asset-panel-${id}`} id={`asset-tab-${id}`} key={id} onClick={() => setActive(id)}><Icon size={15} />{label}{id !== 'all' && <small>0{tabs.findIndex((tab) => tab.id === id)}</small>}</button>)}</div><span>同一身份 · 按场景呈现</span></div>
      <div role="tabpanel" id={`asset-panel-${active}`} aria-labelledby={`asset-tab-${active}`}>
        <div className={`asset-forms-grid ${active !== 'all' ? 'single-form' : ''}`}>
          {visible('info') && <section className="asset-form-section"><div className="asset-section-heading"><span>01</span><div><h2>信息组件</h2><p>用于列表、图表与资产概览</p></div><LayoutList size={18} /></div>
            <div className="asset-form-surface asset-info-surface"><div className="asset-surface-label"><span>我的资产</span><button aria-pressed={compact} onClick={() => setCompact(!compact)}>{compact ? '舒适密度' : '紧凑密度'}</button></div><div className={compact ? 'asset-density-compact' : ''}><AssetInfo onDetails={() => setDetails(true)} /></div>
              <div className="asset-stat-pair"><div><span>持有数量</span><strong>{chiliAsset.owned} <small>{chiliAsset.unit}</small></strong></div><div><span>参考价值</span><strong>{chiliAsset.value}</strong></div></div>
              <div className="asset-distribution"><span>发行总量中的持有比例 <strong>{(chiliAsset.owned / chiliAsset.total * 100).toFixed(2)}%</strong></span><div><i style={{ width: `${chiliAsset.owned / chiliAsset.total * 100}%` }} /></div><small>持有 {chiliAsset.owned} / 总量 {chiliAsset.total.toLocaleString()} {chiliAsset.unit}</small></div>
              <p className="asset-surface-note">身份、数量与价值，一眼可比较。</p>
            </div><p className="asset-form-caption"><b>比较优先</b> 保留关键指标，完整资料按需展开。</p>
          </section>}
          {visible('icon') && <section className="asset-form-section"><div className="asset-section-heading"><span>02</span><div><h2>图标形态</h2><p>列表与画板，两种子形态</p></div><Scan size={18} /></div>
            <div className="asset-form-surface asset-icon-surface">
              <div className="asset-icon-subtypes" role="group" aria-label="图标子形态">
                <button aria-pressed={iconVariant === 'list'} onClick={() => setIconVariant('list')}><LayoutList size={13} /> 列表图标</button>
                <button aria-pressed={iconVariant === 'board'} onClick={() => setIconVariant('board')}><Scan size={13} /> 画板图标</button>
              </div>
              {/* 🔴 改动 2026-10-12 · 木质圆角图标：名称在内部顶部，数量玻璃在内部底部。 */}
              {iconVariant === 'board' && <div className="asset-board-icon-stage" aria-label="画板图标预览"><div className="rune-display-socket"><RuneOrbit /><AssetIcon asset={selectedAsset} size={128} variant="board" energized /></div><span>木质镶边 · 顶部名称 · 资产数量</span></div>}
              <div className={`asset-picker ${iconVariant === 'board' ? 'asset-board-icon-picker' : ''}`}>{[chiliAsset, ...demoFoodCards.filter((asset) => asset.id !== chiliAsset.id)].map((asset) => <button key={asset.id} aria-label={`选择${asset.name}`} aria-pressed={selectedIcon === asset.id} onClick={() => setSelectedIcon(asset.id)}><AssetIcon asset={asset} size={iconVariant === 'board' ? 96 : 64} variant={iconVariant} rune energized={selectedIcon === asset.id} />{iconVariant === 'list' && <strong>{asset.name}</strong>}{selectedIcon === asset.id && <span className="asset-picker-check"><Check size={10} /></span>}</button>)}</div>
              <div className="asset-selected-summary"><span>已选资产</span><strong>{selectedAsset.name}</strong><small>{selectedAsset.owned} {selectedAsset.unit} 可用</small></div>
              {iconVariant === 'list' && <div className="asset-icon-sizes">{[32, 48, 64].map((size) => <div key={size}><AssetIcon size={size} rune /><small>{size} px</small></div>)}</div>}
              <p className="asset-surface-note">{iconVariant === 'board' ? '木纹沿圆角围合，数量标签随内容收缩。' : '圆角木质镶边，小尺寸收起刻纹细节。'}</p>
            </div><p className="asset-form-caption"><b>识别优先</b>{iconVariant === 'board' ? '图内顶部读名称，图内底部读数量。' : '同一木质镶嵌语言，适配轻量资产列表。'}</p>
          </section>}
          {visible('card') && <section className="asset-form-section"><div className="asset-section-heading"><span>03</span><div><h2>资产卡片</h2><p>用于商城浏览与资产发现</p></div><Box size={18} /></div>
            <div className="asset-card-surface"><AssetMarketCard onDetails={() => setDetails(true)} /></div><p className="asset-form-caption"><b>价值优先</b> 大图、产地与价格；翻面查看溯源。</p>
          </section>}
        </div>
        {/* Keep the graph mounted while switching forms so in-progress work survives tab changes. */}
        <section className="asset-node-section" hidden={!visible('node')}><div className="asset-section-heading"><span>04</span><div><h2>资产节点 <em>符文相连，能力成形</em></h2><p>用于无限画板 · 镶嵌输入，组合激活</p></div><span className="asset-interactive-tag"><i /> 可交互体验</span></div>
          <AssetGraph />
          <div className="asset-node-principles"><p><span>01 / 依赖</span>原料 → 配方，配方 + 厨师 → 食品。<br /><small>星号标注必备输入，缺少上游时保持待就绪。</small></p><p><span>02 / 交易</span>买入与卖出独立于制作依赖。<br /><small>卖出连向交易输入时，自然生成收益分支。</small></p><p><span>03 / 循环</span>收益回流到原料、厨师与配方。<br /><small>配方完全持有时，无需连接许可费。</small></p></div>
        </section>
      </div>
      <footer className="asset-lab-footer"><span><Layers3 size={14} /> 同一份资产资料，不同的信息层级。</span><span>工坊交互样本 · 数据为演示 · 未接入实际交易</span><Link to="/atlas">返回版图 <ArrowUpRight size={13} /></Link></footer>
    </div>
    <dialog ref={dialog} className="asset-details" onCancel={() => setDetails(false)} onClose={() => setDetails(false)} onClick={(event) => { if (event.target === event.currentTarget) setDetails(false) }} aria-labelledby="asset-details-title">
      <div className="asset-details-content"><button className="asset-details-close" aria-label="关闭资产档案" onClick={() => setDetails(false)}><X size={20} /></button><AssetIcon size={72} /><p className="asset-eyebrow">ASSET PASSPORT / 演示档案</p><h2 id="asset-details-title">{chiliAsset.name}</h2><p>{chiliAsset.origin} · {chiliAsset.vintage}</p><dl>{[['资产编号', chiliAsset.assetNo], ['持有数量', `${chiliAsset.owned} ${chiliAsset.unit}`], ['参考单价', chiliAsset.unitPrice.replace('单价 ', '')], ['参考价值', chiliAsset.value], ['批次', chiliAsset.back.batchNo], ['状态', chiliAsset.status]].map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl><p className="asset-details-note">四种形态共享这份资产身份。此页用于验证展示与连接方式，不产生实际买卖或资金结算。</p><button className="asset-primary" onClick={() => { setDetails(false); setActive('node') }}>查看节点关系 <Network size={16} /></button></div>
    </dialog>
  </div>
}
