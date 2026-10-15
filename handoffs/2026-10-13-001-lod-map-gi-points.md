# Handoff · 版图 LOD 地图 + GI 地理标志点位层（已完成，待下一步指令）
- 生成时间：2026-10-13 01:15
- 源会话：版图画板/地图工作长会话（上下文占用约 88%，触发原因：用户主动 handoff，阶段性收尾留档）

## 1. 任务目标
SuperRetail 前端（Vite + React + TS，工作区 `D:\LJB_Plan\GitHub_ProjectManager\SuperRetail`，**非 git 仓库**）：
- 画板：工作流「收益」节点链自动生成金色虚线框、「循环」链生成金色实线框 ✅（更早完成，9/9 断言）
- 图表「LOD 地图」组件：三层 LOD（世界 3D 展开 → 国家（高德真底图）→ 省（可缩放至市级，缩到最小 2.5D 俯视））✅（此前完成）
- **GI 点位层（本次任务，已全部完成）**：GI/AGI 地理标志产品点位落到 LOD2/LOD3，缩放联动聚合，12 款工坊在册资产 ✦ 特殊标记 ✅（14/14 端到端断言通过）

## 2. 已完成工作（均已验证）
- GI 数据管线 → `D:\LJB_Plan\GitHub_ProjectManager\SuperRetail\tools\build-gi-points.mjs`（Node 脚本，重跑即可重建）
  - 名录源：`tools\gi-source-cnipa.txt`（CNIPA 821 条）+ `tools\gi-source-agi.txt`（AGI 236 条），均转写自维基百科整理名录（真实数据，非编造）
  - 手工落点表：`tools\gi-manual-alias.json`（约 280 条 产品名→区县名）
  - 区划中心点：`tmp_shots\adcode-all.json`（DataV areas_v3/bound/all.json，3238 条，脚本依赖它）
  - 产物：`apps\web\public\assets\atlas\gi-points.json`（1057 点，0 省级兜底，schema：`[{n,t:'GI'|'AGI',c:adcode,p:[lng,lat],sr?:1,sid?:工坊id,f?:1}]`）
- 渲染代码（地图模块 `apps\web\src\modules\atlas\map\`）
  - `gi.ts`（新）：loadGiPoints / giProvinceOf / clusterGiPoints（两引擎共用）
  - `AmapView.tsx`：AMap.MarkerCluster 金色聚合泡（数据驱动 API，详见§5）+ ✦ 在册资产 + 点击资产卡 + 图例
  - `ChinaMap.tsx`：SVG 兜底 LOD2 省级计数泡（31 泡合计 1057，✦ 角标 10 省）
  - `ProvinceMap.tsx`：SVG 兜底 LOD3 网格聚合（cell=52/k 缩放联动）+ ✦ 金标 + 悬停名称；**顺手修复存量 bug：滚轮监听器挂载时机早于 stage 渲染导致 SVG 模式滚轮缩放从未生效**（effect 依赖 `[]` → `[amap, shapes]`）
  - `atlas-map.css`：GI 层全部样式（SVG + 高德 DOM 标记）
- 验证：`tmp_shots\gi-verify.mjs` → **14/14 PASS**（双引擎：高德真底图 + route 拦截强制的 SVG 兜底）；截图 `tmp_shots\gi-amap-2-china.png`、`gi-amap-3-shandong.png`、`gi-amap-4-sr-card.png`、`gi-svg-2-china.png`、`gi-svg-3-heilongjiang.png`、`gi-svg-4-zoomed.png`
- 类型检查：地图模块定向 tsc 零错误（命令见§7）；全量 `tsc -b` 被并发编辑卡住（见§6）

## 3. 当前断点
无断点——GI 任务已闭环。等待用户决定的下一步（已向用户提议、尚未答复）：
- 候选 A：LOD 地图挂到「Hello World」看板做常驻小组件（需先 `Skill` 调 `canvas`）
- 候选 B：接入全量 5000+ GI 名录后重跑 `node tools/build-gi-points.mjs` 替换 `gi-points.json`（schema 已兼容，无需改代码）
- 候选 C：用户新指令

## 4. 关键约束与偏好
- 工作区 `D:\LJB_Plan\GitHub_ProjectManager\SuperRetail`，**不是 git 仓库**，不要尝试 commit；不得在工作区外写交付文件
- 禁止使用 Agent 子代理工具；外部文件先复制进工作区再操作
- 代码注释仓库惯例：改动处加 `// 🔴 改动 YYYY-MM-DD · 说明`
- 下载一律优先国内直连源（DataV 阿里云 CDN 已多次用，无需再问）
- 数据诚实原则：名录只落真实数据，不造假凑数（当前 1057 条为公开可得整理版，已向用户说明非全量 5000+）
- 验证固定模式：`cd apps\web && (npx vite --port 7100 --strictPort &)` → Playwright（`apps\web\node_modules\playwright`，channel: 'msedge'）→ 结束必须杀端口进程：`PID=$(netstat -ano | grep ":7100" | grep LISTENING | awk '{print $NF}' | head -1); taskkill //PID $PID //F`
- 验证细节：页面有缩略图+预览 dialog 两个地图实例，选择器必须限定 `page.getByRole('dialog')`；dialog 里入口是 `button[title*="LOD 地图"]`；高德瓦片慢，截图前等 7–8 秒；`page.evaluate` 内不能写 TS 语法（如 `!`）；带 CSS 脉冲动画的元素 Playwright 点击要 `{ force: true }`
- 高德 JS API Key：个人开发者 key 写在 `apps\web\src\modules\atlas\map\amap.ts` 顶部常量（`<redacted>`，已在仓库内，勿外泄）；localStorage `sr.amap.key`/`sr.amap.sec` 可覆盖

## 5. 已排除方案（勿重蹈）
- 维基「中国地理标志商标注册列表」：FetchURL 代理连续 4 次网络错误，放弃；AGI 完整 3600+ 名录全网无公开结构化数据（搜过 3 轮）→ 采用维基两份整理名录（CNIPA+AGI 共 1057）
- curl 直连 zh.wikipedia.org 被墙（返回 000）；维基内容只能走 FetchURL 代理
- **AMap.MarkerCluster 传 Marker 实例会被静默丢弃**（`getUserDataLen()=0`、DOM 零渲染）：该版本是**数据驱动** API，必须传 `[{lnglat, n, t, ...}]` 数组；散点样式在 `renderMarker(ctx)`（数据经 `ctx.data` 或 `ctx.indexs` 回查，两通道都可能缺，须防御 + try/catch，拿不到也统一画金点，否则残留高德默认蓝水滴）；聚合泡在 `renderClusterMarker(ctx)`（`{clusterData,count,marker,indexs}`）
- 测 SVG 兜底引擎不能用 localStorage 清 Key（空串会回退到代码常量）：正确做法是 Playwright `page.route('**/webapi.amap.com/**', abort)` 让脚本 onerror → resolve(null)
- 派发合成 WheelEvent 测滚轮缩放必须带 `clientX/clientY`（否则锚点算到 (0,0)，k 增大后地图飞出视野呈全黑）
- 地理编码 strip() 曾踩三个正则坑（均已修）：后缀含裸「州」误剥（通州→通）、民族族称惰性量词回剥过度（延边朝鲜族→延朝/乳源瑶族→""）、「新区」左优先误剥（清新区→清）；现行实现=后缀最长优先且剩余≥2 字 + 56 民族显式名单

## 6. 当前故障（与本任务无关，但影响 build）
- `apps\web\src\modules\atlas\AtlasPage.tsx` 与 `apps\web\src\modules\atlas\board\splitStore.ts` 在 2026-10-13 00:56–00:58 被**并发编辑**（疑似用户或另一会话在做分屏/钉住画板功能），`npx tsc -b` 报 12 个类型错误（splitWrapRef 未用、AtlasSplitState.active 不存在、PinnedBoardWindow/renderPane/ConfirmModal 未定义等）。**不要替对方收尾**；等其完成后跑全量 tsc 复核即可
- 页面控制台有一条既存 React hydration 警告（SideRail 区域 button 嵌套 button），与本次改动无关，未修

## 7. 启动动作（新会话第一步）
1. 阅读本交接文档（你正在做）
2. 验证 GI 数据管线可重跑：`cd D:\LJB_Plan\GitHub_ProjectManager\SuperRetail && node tools/build-gi-points.mjs` → 应输出「总点位 1057（GI 821 / AGI 236），在册资产 12 款」且无省级兜底
3. 验证地图模块类型：`cd apps\web && npx tsc --noEmit --strict --jsx react-jsx --module esnext --target es2022 --moduleResolution bundler --lib es2022,dom --types vite/client --skipLibCheck src/modules/atlas/map/gi.ts src/modules/atlas/map/AmapView.tsx src/modules/atlas/map/ChinaMap.tsx src/modules/atlas/map/ProvinceMap.tsx` → 应零错误
4. 全量 `npx tsc -b` 查看§6 的并发编辑是否已收尾
5. 询问用户下一步（候选 A/B/C 见§3）

## 参考材料（引用，勿复制全文）
- `D:\LJB_Plan\GitHub_ProjectManager\SuperRetail\apps\web\src\modules\atlas\map\`：LOD 地图全部代码（AtlasMap/WorldMap/ChinaMap/ProvinceMap/AmapView/geo/amap/gi/atlas-map.css）
- `D:\LJB_Plan\GitHub_ProjectManager\SuperRetail\tools\build-gi-points.mjs`：GI 点位生成脚本（重跑即重建数据）
- `D:\LJB_Plan\GitHub_ProjectManager\SuperRetail\apps\web\src\modules\workshop\food-card\data.ts`：12 款在册资产定义（id 与 gi-points.json 的 sid 对应）
- `D:\LJB_Plan\GitHub_ProjectManager\SuperRetail\tmp_shots\gi-verify.mjs`：GI 端到端验证脚本（14 断言，可复跑）
