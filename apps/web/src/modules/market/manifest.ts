import type { ModuleManifest } from '../types'

/** 商城 —— 实体产品、数字资产、股权资产、IP 资产的交易与交付 */
export const marketManifest: ModuleManifest = {
  id: 'market',
  name: '商城',
  nameEn: 'Market',
  basePath: '/market',
  navigation: { label: '商城', order: 2 },
  tagline: '实体产品 · 数字资产 · 股权资产 · IP 资产的发现与交易',
  capabilities: {
    queries: ['commerce.search_products', 'commerce.get_offer', 'orders.list'],
    commands: ['commerce.create_order', 'commerce.pay_order', 'fulfillment.grant_entitlement'],
  },
  permissions: ['market.browse', 'market.purchase', 'market.sell'],
}
