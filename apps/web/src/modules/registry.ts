import type { ModuleId, ModuleManifest } from './types'
import { atlasManifest } from './atlas/manifest'
import { marketManifest } from './market/manifest'
import { interactionManifest } from './interaction/manifest'
import { workshopManifest } from './workshop/manifest'
import { meManifest } from './me/manifest'

/** 模块注册表 —— 外壳按此装配导航与路由 */
export const moduleRegistry: Record<ModuleId, ModuleManifest> = {
  atlas: atlasManifest,
  market: marketManifest,
  interaction: interactionManifest,
  workshop: workshopManifest,
  me: meManifest,
}

/** TopMenu 中央导航项, 按 order 排序 */
export const navigationModules = Object.values(moduleRegistry)
  .filter((m) => m.navigation)
  .sort((a, b) => a.navigation!.order - b.navigation!.order)

export function getModule(id: ModuleId): ModuleManifest {
  return moduleRegistry[id]
}
