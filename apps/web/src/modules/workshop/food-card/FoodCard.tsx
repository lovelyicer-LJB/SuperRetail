// 🔴 改动 2026-10-10 · 食品原材料数字卡片平面版；数据契约见 ./data。
// 🔴 改动 2026-10-10 · 新增卡背翻转：点击卡片查看溯源档案（二维码/批次/证书/发行价/流转记录）。
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { toast } from 'sonner'
import { brandTokens } from './tokens'
import type { FoodCardData } from './data'

function TraceQr({ url, name }: { url: string; name: string }) {
  const [src, setSrc] = useState('')
  useEffect(() => {
    let on = true
    // 🔴 改动 2026-10-10 · 二维码深色模块用品牌 token（--sr-d-gray-10）。
    QRCode.toDataURL(url, { margin: 1, width: 148, color: { dark: brandTokens().dPanel, light: '#ffffff' } })
      .then((dataUrl) => { if (on) setSrc(dataUrl) })
      .catch(() => {})
    return () => { on = false }
  }, [url])
  if (!src) return <span className="food-card-qr is-loading" aria-hidden="true" />
  return <img className="food-card-qr" src={src} alt={`${name}溯源二维码`} />
}

export function FoodCard({ data }: { data: FoodCardData }) {
  const ratio = data.owned / data.total
  const pct = (ratio * 100).toFixed(3)
  const [flipped, setFlipped] = useState(false)
  return (
    <article
      className={`food-card${flipped ? ' is-flipped' : ''}`}
      aria-label={`${data.name}数字卡片`}
      role="button"
      tabIndex={0}
      aria-pressed={flipped}
      title={flipped ? '点击翻回正面' : '点击查看溯源档案'}
      onClick={() => setFlipped((v) => !v)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFlipped((v) => !v) } }}
    >
      <div className="food-card-holo" aria-hidden="true" />
      <div className="food-card-flip">
        <div className="food-card-inner food-card-front">
          <header className="food-card-top">
            <span className={`food-card-edition tone-${data.editionTone}`}>{data.edition}</span>
            <span className="food-card-status">{data.status}</span>
          </header>
          <figure className="food-card-art">
            <img src={data.image} alt={data.imageAlt} />
            <figcaption className="food-card-badges" aria-label="认证徽章">
              {data.badges.map((badge) => (
                <img key={badge.label} src={badge.src} alt={badge.label} title={badge.label} />
              ))}
              {data.extraBadge && <span className="food-card-badge-extra" title={data.extraBadge}>{data.extraBadge}</span>}
            </figcaption>
          </figure>
          <div className="food-card-info">
            <p className="food-card-vintage">{data.vintage}</p>
            <h3 className="food-card-name">{data.name}</h3>
            <p className="food-card-origin">{data.origin}</p>
            <div className="food-card-qty">
              <div className="food-card-qty-row">
                <strong>{data.owned.toLocaleString()}</strong>
                <span>/ {data.total.toLocaleString()} {data.unit}</span>
                <em>{pct}%</em>
              </div>
              <div className="food-card-qty-bar" role="img" aria-label={`持有占比 ${pct}%`}>
                <i style={{ width: `${Math.max(ratio * 100, 0.6)}%` }} />
              </div>
            </div>
            <div className="food-card-price">
              <span>{data.unitPrice}</span>
              <strong>{data.value}</strong>
            </div>
            <p className="food-card-asset">{data.assetNo}</p>
          </div>
          {/* 🔴 改动 2026-10-10 · 购买按钮：正面右下角绝对定位（不占文档流），点击不触发翻面。 */}
          <button
            type="button"
            className="food-card-buy"
            aria-label={`购买${data.name}`}
            onClick={(e) => {
              e.stopPropagation()
              toast.success(`${data.name} 已加入采购清单`, { description: `${data.unitPrice} · ${data.assetNo}` })
            }}
          >购买</button>
        </div>
        <div className="food-card-inner food-card-back" aria-hidden={!flipped}>
          <header className="food-card-top">
            <span className={`food-card-edition tone-${data.editionTone}`}>溯源档案</span>
            <span className="food-card-status">{data.assetNo}</span>
          </header>
          <div className="food-card-back-body">
            <div className="food-card-back-qr">
              <TraceQr url={data.back.traceUrl} name={data.name} />
              <p>扫码溯源 · 全程可查</p>
            </div>
            <h3 className="food-card-name">{data.name}</h3>
            <dl className="food-card-back-rows">
              <div><dt>批次号</dt><dd>{data.back.batchNo}</dd></div>
              <div><dt>证书编号</dt><dd>{data.back.certNo}</dd></div>
              <div><dt>发行</dt><dd>{data.back.issuePrice}</dd></div>
            </dl>
            <ul className="food-card-back-flow" aria-label="流转记录">
              {data.back.circulation.map((record) => (
                <li key={record.date}><time>{record.date}</time><span>{record.event}</span></li>
              ))}
            </ul>
          </div>
          <footer className="food-card-foot">
            <span>TRACEABILITY</span>
            <span>点击翻回</span>
          </footer>
        </div>
      </div>
    </article>
  )
}
