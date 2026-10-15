// 🔴 改动 2026-10-12 · 图表「地图」总装。
// 🔴 改动 2026-10-14 · 去掉三级 LOD 设定（华为云风格世界封面 / 点击下钻省级）：不再有任何层级状态机，
//  单层原生高德底图（AmapView），缩放级别全部交给高德 API；底部常驻 GI 点位图例。
import { AmapView } from './AmapView'
import './atlas-map.css'

export function AtlasMap({ dark }: { dark: boolean }) {
  return (
    <div className={`sr-map${dark ? ' is-dark' : ' is-light'}`}>
      <div className="sr-map-stage">
        <AmapView dark={dark} />
      </div>
      {/* 🔴 改动 2026-10-13 · GI 点位图例（底部居中常驻）：
         金点=GI 地理标志产品、绿点=AGI 农产品地理标志、金泡=聚合点位（数字=该范围点位数，缩放联动）、
         ✦=平台在册资产（不参与聚合，悬停看信息，点击查看资产卡）
         🔴 改动 2026-10-14 · 追加浮窗条目可点击提示（悬停浮窗内点任一产品 = 缩放到该产品区域层级） */}
      <div className="sr-map-gi-legend" aria-hidden="true">
        <span className="sr-map-gi-lg"><i className="dot" />GI 地理标志产品</span>
        <span className="sr-map-gi-lg"><i className="dot agi" />AGI 农产品地理标志</span>
        <span className="sr-map-gi-lg"><i className="bub">N</i>聚合点位 · 数字为该范围点位数，放大自动散开</span>
        <span className="sr-map-gi-lg"><i className="sr">✦</i>平台在册资产 · 悬停看信息，点击查看</span>
        {/* 🔴 改动 2026-10-14 · 新增：悬停浮窗内条目可点击跳转 */}
        <span className="sr-map-gi-lg"><i className="go">›</i>悬停浮窗条目可点击 · 跳转到该产品区域层级</span>
      </div>
    </div>
  )
}
