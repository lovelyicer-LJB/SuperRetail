/**
 * 模块清单契约 —— 对应架构文档 §09「内置模块注册 manifest」
 * 每个业务模块通过 manifest 声明自身, 应用外壳(TopMenu/路由)按清单装配,
 * 新增板块只需新增一个 manifest, 不改动外壳代码。
 *
 * capabilities 预留的是「应用能力接口」用例 ID (架构 §08),
 * 将来同时暴露给 Web BFF 与 MCP tools, 前端只引用 ID, 不实现业务。
 */

export type ModuleId = 'atlas' | 'market' | 'interaction' | 'workshop' | 'me'

export interface ModuleManifest {
  /** 模块 ID, 全局唯一 */
  id: ModuleId
  /** 模块名(中文) */
  name: string
  /** 模块名(英文, 用于副标题/国际化) */
  nameEn: string
  /** 路由基路径 */
  basePath: string
  /** 顶部导航声明; 缺省表示不出现在 TopMenu (如用户中心) */
  navigation?: {
    label: string
    order: number
  }
  /** 一句话定位 */
  tagline: string
  /** 能力接口占位 (未来 BFF/MCP 用例 ID) */
  capabilities: {
    queries: string[]
    commands: string[]
  }
  /** 该模块引入的权限点占位 */
  permissions: string[]
}
