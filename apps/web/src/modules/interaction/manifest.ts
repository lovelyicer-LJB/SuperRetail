import type { ModuleManifest } from '../types'

/** 互动 —— 活动、演出、赛事、游戏四大频道 */
export const interactionManifest: ModuleManifest = {
  id: 'interaction',
  name: '互动',
  nameEn: 'Interaction',
  basePath: '/interaction',
  navigation: { label: '互动', order: 3 },
  tagline: '活动 · 演出 · 赛事 · 游戏的发布与参与',
  capabilities: {
    queries: ['interaction.list_events', 'interaction.get_session'],
    commands: ['interaction.publish_event', 'interaction.join_event', 'interaction.issue_ticket'],
  },
  permissions: ['interaction.view', 'interaction.join', 'interaction.organize'],
}
