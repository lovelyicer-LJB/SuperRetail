import type { ModuleManifest } from '../types'

/** 工坊 —— 设计、制作、提交实体产品 / 数字资产 / IP */
export const workshopManifest: ModuleManifest = {
  id: 'workshop',
  name: '工坊',
  nameEn: 'Workshop',
  basePath: '/workshop',
  navigation: { label: '工坊', order: 4 },
  tagline: '项目 · 设计稿 · 版本 · 协作 · 提交审核与发布',
  capabilities: {
    queries: ['workshop.list_projects', 'workshop.get_revision'],
    commands: ['workshop.create_draft', 'workshop.submit', 'workshop.release'],
  },
  permissions: ['workshop.view', 'workshop.create', 'workshop.review'],
}
