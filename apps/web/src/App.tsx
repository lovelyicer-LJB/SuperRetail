// 🔴 改动 2026-10-11 · 注册工坊数字资产四种形态的体验入口。
import { Navigate, Route, Routes } from 'react-router'
import { AssetSystemPage } from '@/modules/workshop/asset-system/AssetSystemPage'
import { AppShell } from '@/components/shell/AppShell'
import { ModulePage } from '@/pages/ModulePage'
import { AtlasPage } from '@/modules/atlas/AtlasPage'
// 🔴 改动 2026-10-09 · 注册编号 5 全息卡片独立预览路由。
import { NftCardPage } from '@/modules/workshop/NftCardPage'
// 🔴 改动 2026-10-09 · 注册食品原材料数字卡片对比页路由。
import { FoodCardsPage } from '@/modules/workshop/food-card'
// 🔴 改动 2026-10-12 · 注册收益连线金色状态对比演示页路由。
import { RevenueWiresPage } from '@/modules/workshop/revenue-wires/RevenueWiresPage'
// 🔴 改动 2026-10-13 · 注册收益循环 & 收益线程演示页路由：金色虚线框 + 技能激活动效。
import { RevenueThreadPage } from '@/modules/workshop/revenue-thread/RevenueThreadPage'
// 🔴 改动 2026-10-13 · 互动页 v1：3D 品牌玻璃星球 + 全新无限画板底层。
import { InteractionPage } from '@/modules/interaction/InteractionPage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Navigate to="/atlas" replace />} />
        <Route path="/atlas" element={<AtlasPage />} />
        <Route path="/market" element={<ModulePage id="market" />} />
        {/* 🔴 改动 2026-10-13 · 互动页 v1：3D 品牌玻璃星球（替换原 manifest 占位页） */}
        <Route path="/interaction" element={<InteractionPage />} />
        <Route path="/workshop" element={<ModulePage id="workshop" />} />
        <Route path="/workshop/nft-card-05" element={<NftCardPage />} />
        <Route path="/workshop/food-cards" element={<FoodCardsPage />} />
        <Route path="/workshop/asset-system" element={<AssetSystemPage />} />
        {/* 🔴 改动 2026-10-12 · 收益连线金色状态对比演示页 */}
        <Route path="/workshop/revenue-wires" element={<RevenueWiresPage />} />
        {/* 🔴 改动 2026-10-13 · 收益循环 & 收益线程：金色虚线框 + 技能点击/拖入激活 */}
        <Route path="/workshop/revenue-thread" element={<RevenueThreadPage />} />
        <Route path="/me" element={<ModulePage id="me" />} />
        <Route path="*" element={<Navigate to="/atlas" replace />} />
      </Route>
    </Routes>
  )
}
