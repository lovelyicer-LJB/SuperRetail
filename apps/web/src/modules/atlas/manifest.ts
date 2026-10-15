import type { ModuleManifest } from '../types'

/** 版图 —— 图表、表格、地图、资产操作的工作空间 */
export const atlasManifest: ModuleManifest = {
  id: 'atlas',
  name: '版图',
  nameEn: 'Atlas',
  basePath: '/atlas',
  navigation: { label: '版图', order: 1 },
  tagline: '工作空间 · 动态图表 · 虚拟表格 · 地图 · 资产详情与操作',
  capabilities: {
    queries: ['atlas.query_dashboard', 'atlas.query_asset', 'marketdata.query_series'],
    commands: ['atlas.save_dashboard', 'atlas.create_view', 'atlas.save_watchlist'],
  },
  permissions: ['atlas.view', 'atlas.edit', 'marketdata.subscribe'],
}
