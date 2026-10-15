import type { ModuleManifest } from '../types'

/** 用户中心 —— 资料、组织、持有与授权、订单、参与记录、作品、安全 */
export const meManifest: ModuleManifest = {
  id: 'me',
  name: '用户中心',
  nameEn: 'Account',
  basePath: '/me',
  tagline: '资料 · 组织切换 · 持有与授权 · 订单 · 参与记录 · 安全与偏好',
  capabilities: {
    queries: ['identity.get_profile', 'identity.list_memberships', 'assets.list_holdings'],
    commands: ['identity.update_profile', 'identity.switch_organization'],
  },
  permissions: ['me.view', 'me.edit'],
}
