# 超零售 · 产品与技术架构 v0.1

日期：2026-10-01。状态：供产品与技术评审的建议方案，尚未实现、压测或投入生产。

## 01 · 核心决策

超零售是围绕资产的发现、分析、交易交付、参与和创作协作的平台。版图、商城、互动、工坊是四个产品入口；资产、身份、权限、数据和业务流程构成共同底座。

已确认：Web 优先，用 Chrome review；第一阶段接入行情做展示与分析，暂不做撮合交易。商城购买与订单履约属于正常业务范围；证券式订单簿、撮合、清算不进入第一阶段。

建议从“模块化业务单体 + 独立数据采集与实时推送 + 契约优先”起步。业务内按领域分模块，实时负载独立部署；以后依据负载、团队和可靠性要求逐步拆服务。模块化不等于第一天部署几十个微服务。

先定义能力接口，再确定展示组件；先明确数据正确性，再追求更新频率；先做一条跨模块闭环，再扩充四个板块。所有容量数字是待验证的设计假设，不是性能承诺。

## 02 · 产品结构与用户路径

- 版图 /atlas：个人及组织工作空间、仪表板、动态图表、虚拟表格、地图、资产详情、关注列表、预警、资产操作入口、视图保存与分享。操作入口调用资产/商城等领域服务，不在图表组件里实现业务。
- 商城 /market：搜索、类目、商品详情、商家、SKU/报价、购物车、订单、支付、发货/授权交付、售后。实体商品、数字商品、IP许可采用不同履约策略；股权资产先做信息展示及受控申请入口，是否开放购买另立项目决策。
- 互动 /interaction：活动、演出、赛事、游戏四类频道；共享发布、报名/票务、日程、参与身份、通知。赛事独有赛制与成绩；演出独有场次与座席；游戏独有规则与会话。高频实时游戏后端后期独立，不挤占行情通道。
- 工坊 /workshop：项目、设计稿、素材、版本、协作、制作任务、提交、审核、发布、收益记录。设计编辑器采用适配接口，首期先实现文件/版本/评审流程，按需接专业编辑器。
- 用户中心 /me：个人资料、组织切换、收藏、持有与授权、订单、参与记录、作品、通知、安全、隐私和偏好。
- 运营后台 /admin：商品/作品审核、内容举报、商家管理、数据源健康、权益授权、订单异常、审计与配置。后台与用户端独立入口和权限。

推荐主路径：工坊创建作品 → 提交审核 → 登记资产 → 商城发布销售项 → 购买与交付权益 → 版图聚合展示 → 互动推广或组织参与。作品不是商品、商品不是权益，三者通过 ID 和业务事件连接。

## 03 · 分层总图

```text
Chrome Web：应用外壳 / 四大板块 / 用户中心        外部 AI 与自动化
                    │ HTTPS                         │ MCP
               Web BFF/API                     MCP 适配层
                    └──────────┬────────────────────┘
                      身份、策略、限流、审计
                               │
            应用用例与能力接口：查询 / 命令 / 长任务
                               │
     版图 │ 资产 │ 商品 │ 订单履约 │ 互动 │ 工坊 │ 身份与组织
                               │
           PostgreSQL + Outbox → 业务任务 / 事件投影

授权数据源 → 采集适配器 → 校验与归一化 → 持久事件流
                                      ├→ 历史/聚合库 → 查询 API
                                      ├→ 快照/实时投影 → WS 网关 → Chrome
                                      └→ 对象存储 → 回放 / 重算
```

部署上允许初期 BFF/API 与应用用例同一进程，MCP 以独立入口/进程封装同一套应用接口；实时网关、采集 worker 与业务 API 分开。长耗时转换、媒体处理、导入与导出都异步执行。

## 04 · 领域边界与数据所有权

- Identity：User、Organization、Membership、Role、Policy；唯一负责身份、成员和授权策略。组织不是用户属性字符串，必须可多对多加入。
- Asset Registry：Asset、AssetVersion、RightsDefinition；统一资产身份、来源、类型和权利定义。实体库存、商品价格、实时行情分别由自己的领域管理。
- Atlas：Workspace、Dashboard、Widget、SavedQuery、Watchlist、AlertRule；只拥有视图配置与分析偏好，不拥有行情源数据。
- Market Data：DataSource、Instrument、SymbolMapping、Dataset、Entitlement、Snapshot、Tick、Bar；负责标的映射、来源授权、行情质量、历史查询和聚合。
- Commerce：Product、Variant、Offer、InventoryReservation；管理可售项、定价及库存预占。Product 引用 assetId，允许一个资产对应多种销售方案。
- Orders & Fulfillment：Order、OrderLine、PaymentAttempt、Refund、Delivery、EntitlementGrant；负责订单状态、支付适配、交付和权益。订单保存成交时的价格、条款和资产版本快照。
- Interaction：Event、Session、Participation、Ticket；采用 activities、performances、competitions、games 子模块，各自扩展规则，不用巨型万能 Event 表装全部逻辑。
- Workshop：Project、Artifact、Revision、Submission、Review、Release；管理创作与发布版本，通过发布用例调用资产登记，不能直接写资产表。
- Platform：文件、搜索投影、通知、任务、审计、功能开关；是基础能力集合，不可成为收纳所有业务规则的通用模块。

模块拥有自己的数据库 schema、迁移和 repository。外部模块不得直接写其表，默认也不跨域直接读表；组合查询用接口或专用读模型。组织级数据携带 tenantId，公共目录明确 public scope；从认证上下文推导租户，不接受客户端任意覆盖。

每个模块采用 domain / application / infrastructure / presentation 四层。domain 不依赖 React、数据库或 MCP SDK；外部支付、存储、行情源通过端口和适配器替换。CI 校验依赖方向，shared 仅放 ID、货币、时间和契约，不放共享业务大对象。

## 05 · 多类型资产与一致性

Asset 公共字段建议为 id、kind、title、ownerOrgId、status、version、provenanceRef；类型细节放各自结构化扩展，并提供版本化 schema 校验。不要把所有东西塞进没有约束的 JSON 字段。

- Physical：规格、产地与物料信息；仓库库存归 Commerce，物流归 Fulfillment。
- Digital：文件版本、校验摘要、访问期限、下载/使用授权；文件在对象存储，下载按权益签发短时地址。
- IP：权利人、许可范围、地域、期限、排他性与合同引用；交易交付的是具体授权，不等于转移作品所有权。
- Equity：发行主体与权益描述、凭证及资格信息；首期不启用二级交易或撮合。登记记录不自动代表法律上的所有权证明。

资产状态建议 draft → under_review → published → suspended/archived；作品版本和公开资产版本分开，已售版本不可静默替换。订单支付采用状态机，并以服务端已核验的支付结果更新状态。

同域关键写入用数据库事务，库存采用条件更新/预占和过期释放；跨域用 Outbox + 幂等消费者 + 补偿流程。支付回调按 providerEventId 去重，主动查单做对账；支付成功但交付失败进入可重试任务，不能再扣一次款。库存预占过期后才到达的付款需重新确认供给或退款，不得自动超卖。

需要余额、分润和退款记账时，建立不可变分录及对账机制；不把 Redis 余额或分析数据库当财务事实。第一期优先接支付服务商，无必要不自建托管钱包。

## 06 · 实时数据与动态图表

数据入口统一适配：历史拉取、WebSocket 订阅、文件导入分别实现 SourceAdapter；保留原始消息、sourceId、instrumentId、sourceSequence、eventTime、ingestTime、schemaVersion。价格/数量使用定点十进制，时间统一 UTC，显示时按市场时区和交易日历转换。

处理顺序：接收 → 校验/隔离异常 → 标的映射 → 去重 → 分区有序处理 → 原始归档与投影 → 多分辨率聚合 → 用户授权后的查询/推送。每个源有配额、重试退避、心跳、新鲜度与断流告警。来源标识不混用，符号变更和公司行动等历史调整必须可追踪版本。

同一 source+instrument 使用相同分区键，并保留源序列；不宣称跨标的全局有序。采用至少一次投递和业务幂等，不把消息平台的局部 exactly-once 能力误认为数据库、支付和外部系统端到端自动去重。[Kafka 设计依据](https://kafka.apache.org/41/design/design/)

缺号时暂停发布可信增量并回补；无源序列时使用源定义的去重键和时间窗口，明确其正确性限制。乱序设置允许迟到窗口，修订 K 线带 revision；原始历史可重算，日线按交易日历生成，不简单按本地午夜切分。

Web 订阅协议建议：先创建订阅并缓冲增量 → 获取带 sequence 的一致性快照 → 应用更大 sequence 的缓冲消息 → 持续增量。重连传 resumeToken/lastSequence；保留窗口内补发，超窗或缺号则重新快照。多标的快照采用各流游标，不假设一个全局序号。鉴权撤销必须终止既有订阅。

客户端订阅按可视组件合并，页面隐藏时降频；Worker 负责解析/计算，图表按帧或 100–250ms 批次更新，避免每个 tick 引发 React 全树更新。查询随时间跨度切换原始、秒、分钟、小时、日聚合；默认限制单图返回点数，例如 2,000–10,000 点，详细钻取再取细粒度。

折线可按像素桶降采样，K 线按 OHLC 与成交量语义聚合，不能直接抽点冒充 K 线；地图使用瓦片、视口过滤和聚类；表格同时做服务端筛选排序/游标分页和前端行列虚拟化。

慢客户端实行有界发送队列，最新报价可按标的合并，趋势可降频；逐笔成交或要求完整回放的流不可静默丢弃，改为断开并提示补齐。前端明显标记实时、延迟、过期、断线、回补中和数据来源，旧数据不可伪装成实时。

## 07 · 数据存储与技术选型

以下是本项目建议，最终版本在开工时锁定并验证兼容性；并非所有组件首日部署。

- Web：TypeScript + React；建议 Next.js 管理路由与公开商城页面，版图/工坊采用客户端交互区域。图表组件内的高频状态独立维护。采用统一设计 token、基础组件、错误边界和路由级加载。
- 业务 API：TypeScript + NestJS，优先与 Web 共享契约；BFF 负责页面聚合，领域逻辑只存在应用服务中。接口 REST + OpenAPI，实时订阅用 WebSocket；复杂跨域查询有实际需求时再考虑 GraphQL。
- 前端数据：TanStack Query 管服务器查询缓存，轻量状态库管视图布局；行情外部 store 管高频变化。不要在三者中重复保存同一份完整行情。
- 图表/地图：ECharts、金融图表适配器、MapLibre 候选；用自有 ChartAdapter/MapAdapter 隔离。地图数据、组件授权和导出能力在选库 spike 中确认，避免商业扩展成为隐性依赖。
- PostgreSQL：用户、组织、资产、订单、作品和视图等事务事实；需要地理查询时加 PostGIS。按模块 schema 隔离，重要表加租户索引/约束，可用 RLS 作为第二道防线。
- Redis：缓存、短期快照、限流、连接路由和失效信息；丢失后能从事实库/日志恢复，不承担永久账本。
- 对象存储：作品、媒体、原始数据归档、批量导出，配 CDN 与签名访问。敏感媒体和公开媒体分访问策略。
- ClickHouse：高吞吐行情历史、聚合和分析候选；达到实际大规模接入阶段使用。初期小数据验证可使用 PostgreSQL 分区读模型，但必须限制范围并保留 HistoryStore 接口。它面向分析，订单事务仍留在 PostgreSQL。[官方时序用途](https://clickhouse.com/docs/guides/use-cases/real-time-analytics/time-series)
- Kafka：真实多源大流量或需要持久回放时引入；首个小流量验证可先由采集进程持久化并推送，但上线大规模接入前必须补齐可恢复日志。业务任务队列与行情流分开，避免相互阻塞。
- 搜索：首期 PostgreSQL 搜索；跨商品、作品、活动的复杂检索达到需求后引入 OpenSearch 等投影索引。搜索结果仍做租户与权益过滤。
- Go：采集/实时网关若经基准测试确认 Node 的吞吐或内存成为瓶颈，再替换具体进程，业务层保持不变。第一天不为“先进”同时引入多套语言。

前端选型和具体库为工程建议；正式采用前需按实际版本核对许可证、维护状态及兼容性，不在本方案中声明其为最新版本。

## 08 · API、事件与 MCP

应用能力以用例定义：QueryAsset、QuerySeries、SaveDashboard、SubmitArtifact、CreateOrder、GrantEntitlement。Web、后台、任务 worker、MCP 都经同一应用服务进行授权和校验。API 返回 requestId、数据版本、新鲜度信息与可识别错误码。

HTTP 示例：GET /api/v1/assets/{id}；POST /api/v1/series/query；POST /api/v1/dashboards；POST /api/v1/submissions；POST /api/v1/orders。查询必须约束范围、字段、点数及执行预算；命令携带 idempotencyKey，更新使用 expectedVersion 防止覆盖他人修改。

事件契约：eventId、eventType、schemaVersion、tenantId、aggregateId、aggregateVersion、occurredAt、traceId、payload。示例 workshop.submission.approved.v1、asset.published.v1、commerce.order.paid.v1、fulfillment.entitlement.granted.v1。业务数据和 Outbox 同事务写入，消费者 inbox 去重，重试超限进死信队列；回放不得再次发短信或扣款。

MCP 对外 Server 提供 resources（资产、视图、数据集元信息）、tools（受控查询和写入）、prompts（可选的分析工作模板）。对内 Client 只连接登记过的第三方 MCP 服务，按组织授予最小权限；第三方结果作为不可信数据，不接受其指令覆盖本地策略。

建议首期工具：assets.get、marketdata.query_series、atlas.create_view、workshop.create_draft、workshop.submit。所有工具定义 JSON Schema、输出 schema、scope、超时、分页与数据预算。marketdata.query_series 返回聚合结果或受控导出任务，不通过 MCP 输送逐笔高频行情。

对外远程 MCP 建议采用 Streamable HTTP，按协商结果固定兼容协议版本；本方案依据 2025-11-25 规范，实施时做兼容性验证。其传输与业务 WebSocket 各自独立。[MCP 传输规范](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)

MCP 按官方 HTTP 授权模型设计 OAuth、PKCE、资源元信息发现、audience 与 scope 校验；每次工具调用继续执行租户/对象/数据授权。禁止凭一个有效会话 ID 代替鉴权，禁止把客户端令牌透传给其他上游服务。[MCP 授权规范](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization)

写工具与查询工具分权。草稿可直接保存；付款、资产权利转移、正式发布等高影响动作采用 prepare → 人在可信 UI 确认 → commit。确认令牌绑定用户、租户、参数摘要、有效期和单次使用，commit 再验权限和资源版本；工具描述的“只读”标签不是安全边界。

长任务返回 jobId，可查询进度、取消和领取授权结果；任务结果链接不能绕过数据源的再分发限制。审计保存调用者、代理客户端、实际被代理用户、目标对象和结果，敏感参数脱敏。

## 09 · 组件与模块扩展规范

版图 Widget 契约包含 type、schemaVersion、dataRequirements、settingsSchema、permissionRequirements、renderMode、supportedActions。数据通过 QueryProvider/SubscriptionProvider 注入；组件不得直接连数据库、持有数据源密钥或随意发起支付。

内置模块注册 manifest：id、routes、navigation、capabilities、permissions、events、migrations。仅加载可信构建产物；第三方代码未来放隔离 iframe/独立源并通过限定消息接口交互，不允许任意远程 JavaScript 进入主应用。

仪表板保存布局、查询引用和参数，不保存无限增长的行情数据。视图 schema 带迁移器，旧视图升级可回滚；分享时重新核验访问者的数据权益，不把创建者的权限打包进分享链接。

建议仓库布局：

```text
apps/web                 用户 Web
apps/admin               运营后台（需要时独立）
apps/api                 BFF 与应用服务入口
apps/realtime            订阅、快照与推送
apps/ingestion           外部数据采集
apps/worker              业务长任务
apps/mcp                 MCP 协议适配
modules/identity assets atlas market-data commerce orders interaction workshop
packages/contracts       OpenAPI / JSON Schema / 事件与生成客户端
packages/ui              设计 token 与基础组件
packages/visualization   图表、表格、地图适配
packages/observability   指标与链路上下文
infra                    本地服务、部署与监控配置
docs/adr                 架构决策及变更依据
```

Monorepo 建议 pnpm workspace；按影响范围构建和测试。此处是目标结构，不表示上述应用已经生成或需要同时上线。

### 09.1 · 前端实例：原材料数字卡模块（food-card）

工坊下的原材料数字卡是首个前端模块样板，代码位于 `apps/web/src/modules/workshop/food-card/`，对外只经 `index.ts` 暴露 `FoodCard`（平面版）、`FoodCardModel`（镭射三维版）、`FoodCardsPage`（对比页）、`FoodCardData` 数据契约与 `demoFoodCards` 演示数据；路由仅在 `App.tsx` 登记 `/workshop/food-cards`，工坊首页入口卡片在 `pages/ModulePage.tsx`。

模块内部分工：`data.ts` 持有数据契约与演示数据（名称、年份、版本、产地、认证徽章、持有量/总量、单价、估值、资产编号、状态，以及卡背 `back` 子对象：批次号、证书编号、发行价、溯源链接、流转记录），页面与组件不持有业务数据；`FoodCard.tsx` + `food-card.css` 为纯 DOM/CSS 平面渲染，支持点击翻转查看卡背溯源档案（二维码由 `qrcode` 库按 `back.traceUrl` 即时生成 dataURL，支持键盘 Enter/Space 触发）；`FoodCardModel.tsx` 复用编号 5 的全息材质引擎（`workshop/cardModel.ts`、`holographicMaterial.ts`、`materialSettings.ts`），只替换模型预留的 `replaceable-image` 主视觉贴图与 `replaceable-text` 文字层，不复制材质代码；三维版主视觉窗为正方形（273×273 世界单位，顶边对齐原窗顶边），信息条贴图随之为 300×150 排版。两个版本由同一 `FoodCardData` 驱动，字段口径一致；2026-10-10 起稀有等级（SSR/SR/R）字段与展示整体移除，全息边框统一为默认渐变。

材质复用约定：卡体几何（650:950、2px 厚度、圆角 18）与银色全息薄膜、镭射内外框 Shader 为共享资产，新卡种不得改写；差异化只允许通过贴图、文字层与后续注册的材质参数覆盖实现。`ShapeGeometry` 的 UV 等于顶点坐标，自定义贴图必须做 0-1 归一化（见 `FoodCardModel` 中 repeat/offset 处理）。色值约定：模块全部使用超零售品牌 token（`--sr-*`，`src/design/tokens.css`），DOM/CSS 直接引用变量；canvas 贴图与二维码经 `tokens.ts` 的 `brandTokens()` 运行时解析（亮底银膜用 `--sr-l-*`，深色卡背用 `--sr-d-*`，强调色用 `--sr-cta` / `--sr-accent-*`，全息光谱为品牌青紫系 #0fedff → #8f5bff → persian-blue）。

资源与验收：卡面图片与认证徽标放 `public/assets/food-cards/`；徽标使用官方公告原图（国知局第 332 号公告、农业农村部《农产品地理标志使用规范》附件），不得二次创作。验收脚本 `apps/web/tools/verify-food-cards.mjs`（平面版三端主题）、`verify-food-cards-3d.mjs`（三维渲染、拖动、双模式切换）、`verify-food-cards-flip.mjs`（平面版卡背翻转、溯源字段、二维码渲染、翻回）与 `verify-food-cards-3d-flip.mjs`（三维版点击翻面、卡背渲染、拖动不误触、翻回）纳入回归；`measure-food-card-layout.mjs` 可量取平面版排版坐标供对齐参考。三维版翻面：点击位移小于 6px 判定为点击，左半区永远向左转 180°、右半区永远向右转 180°（正面翻面与背面翻回均双向可行，翻面挂在父级 Group，与拖动旋转互不干扰）；卡背为 `buildBackTexture` 绘制的溯源档案层（二维码/批次/证书/发行价/流转记录），挂在共享引擎的 back 面组上。两版卡片右下角均有 Azure 蓝色「购买」按钮（`--sr-accent-azure` #0062FF 纯色，参照 NFT 市场主流购买按钮色取 token 中最接近值，hover 经 `color-mix` 加深；平面版为正面绝对定位、三维版为 HTML 覆盖层，点击 toast 反馈且不触发翻面，三维版翻到背面时自动隐藏），toast 出口 `Toaster` 挂在 `FoodCardsPage`。

后续扩展位：卡背翻转已落地（平面版 DOM 翻转 + 镭射三维版整卡翻转均已实现）；稀有度分级已随字段移除而取消，如需恢复请先回补数据契约再加渲染。

### 09.2 · 设计令牌（Design Tokens）

设计令牌是全部 UI 模块的色值与字体唯一来源，任何新模块先接 token 再写样式，禁止散落硬编码色值。

来源与维护：`apps/web/src/design/tokens.css` 由 Figma「All Win Harmony SuperRetail Platform | 和与合超零售平台」项目 Variables 经 Figma Dev Mode MCP 提取（2026-10-01 提取 Collection 1 灰阶与品牌色，节点 0:2 / 93:2236；2026-10-10 补全 Colors 全集——暗/亮灰阶剩余档位、互动蓝/红、Accents 十色、Blue/Black 等，遍历全部 34 个顶层页面合并去重，原始结果存档 `docs/figma/colors-full-2026-10-10.json`）；设计侧更新变量后整体替换该文件，不手改单个色值。

两层体系：第一层为超零售品牌 token（`--sr-*`）——暗/亮双套灰阶（`--sr-d-gray-0~11` 文字与面板、`--sr-l-gray-0~11` 亮色主题）、品牌强调色（`--sr-accent-persian-blue` / `frosty-skies` / `alizarin-red`，2026-10-10 补全 Accents 全集：azure / amethyst / sea-green / spring-green / verdepom / shiny-orange / mango-tango / dark-amber / red-orange / strawberry-red）、品牌互动色（`--sr-brand-interact-blue` / `red` / `black`）、语义色（`--sr-nav-active`、`--sr-cta`、`--sr-logo-bg`、`--sr-blue`、`--sr-black`）与字体栈（`--sr-font-ui` / `--sr-font-display`，HarmonyOS Sans SC 优先）；第二层为 shadcn/ui 语义 token（`--background` / `--primary` / `--muted` / `--radius` 等 HSL 变量，`src/index.css` 中亮/暗双套），服务于通用组件库。两层都在 `tailwind.config.js` 桥接为工具类（`bg-sr-cta`、`text-muted-foreground` 等）。

使用规则：DOM/CSS 直接 `var(--sr-*)` 引用，半透明衍生色用 `color-mix(in srgb, var(--sr-*) N%, transparent)` 而非写死 rgba；canvas 贴图、二维码等无法读 CSS 变量的场景，经模块级运行时解析（参照 `food-card/tokens.ts` 的 `brandTokens()`，fallback 与 token 当前值保持一致）；品牌渐变（`--sr-logo-gradient` 的 #0fedff → #8f5bff）在 canvas 中需离散 stop，由解析层导出。亮/暗主题切换由外壳 theme 驱动（`.is-light` / `.dark`），模块只做映射不持有主题状态。落地实例见 09.1 food-card 模块的色值约定。

### 09.3 · 版图画板框架约定

画板（`apps/web/src/modules/atlas/board/`，纯 DOM 引擎 + React 挂载）有三条框架级约定，全文以 `engine.ts` 头注为准，此处提炼归档；任何向画板新增元素类型或画板级/Tab 级操作的需求，先对照这三条验收。

一、Del 删除。一切可拖入画板的东西都必须支持 Del/Backspace 快捷键删除，两条路径按对象类型各接其一：引擎卡片（note/todo/board/food/character/recipe/dish/market/revenue）点选/框选进入 selectedIds，document keydown 命中即 deleteSelected（连线双击删除）；页面层放置物（从图表浮窗拖入的组件/图表，不走引擎卡片模型）点击选中后由页面层 window keydown 监听删除。两层选择互斥——选中放置物时经 BoardEngine.clearSelection() 清空卡片选择，点卡片/空白时页面层清空放置物选择，按一次 Del 永远只删一边。守卫统一：输入框/多行文本/可编辑区/输入法合成中不响应。

二、画板坐标 + 屏幕钉。一切放在画板上的东西都必须使用画板世界坐标（随画布平移/缩放），并提供右键「屏幕钉」——钉住后不随画布移动，取消钉原地回到世界坐标系。引擎卡片：x/y 本即世界坐标，钉 = meta.pinned + pinX/pinY/pinZoom，applyViewport 时对钉卡写 counter-transform 抵消世界变换，连线锚点经 pinEffectiveWorld 换算跟随，钉态随文档持久化。页面层放置物：wx/wy 存世界坐标（拖放落点经 BoardEngine.clientToWorld 换算），渲染按 view.x + wx×zoom 定位；钉 = pinned + sx/sy/pinZoom（容器内屏幕像素）。两层均不叠加任何钉态提示/状态图标。

三、画板与 Tab 一体。版图的画板与 Tab 坞标签是一体的，类似 Chrome 的标签页与浏览器窗口：Tab 不是独立对象，只是画板在坞中的把手。激活 Tab = 把对应画板带到前台；重命名 Tab = 改画板名（随画板文档持久化）；新建 Tab = 新建空白画板；删除 Tab = 删除画板。反向同理：画板侧状态必须如实反映到 Tab——屏幕钉浮动窗口在 Tab 上显示钉点、被覆盖收起的画板点 Tab 即复位、「成为主画板」后 Tab 保留画板随迁。不允许出现「Tab 有而画板没有」或反向的幽灵状态。实现上主画板 = 拆分树 tab:-1 叶子（框架写死必须存在一个；删除走安全弹窗，删除后右侧第一个画板自动接任并全展开），拆分画板 = splitStore boards 数组与 Tab 坞标签一一对应（下标即身份，删除后重排）。

Tab 拖拽复刻 Chrome 撕离：拖到另一块画板上 = 钉为浮动子画板（画中画，多窗口并存，各 Tab 独立屏幕位置；钉住时原窗格叶子收起，同组兄弟画板自动填充剩余空间，点 Tab 复位；窗内原地右键 = 子画板右键菜单，右键拖动 = 移动窗口）；拖出浏览器窗口 = 拆出为独立浏览器窗口（`?boardwin=<detachId>`，可拖到另一台显示器）。拆出后文档仍为一体：detachId 挂在 BoardDoc 上（随文档走完 boards 数组增删换位，身份不丢），同源 localStorage 共享拆分状态 + storage 事件双向跟随（后写胜出，回声经串行化比对吞掉）；拆出 Tab 显示 ⇗ 标记，点击挂回（清除 detachId，拆出窗口随即显示提示页）。主画板标签不可拖出——它是窗口本体。

凡新增「可拖入画板」的元素类型，必须同时接入约定一的一条删除路径与约定二的一套坐标/钉实现；凡新增画板级/Tab 级操作，必须同时落到两侧。缺一视为功能不完整。

## 10 · 容量假设与性能验收

先定义输入速率、峰值、订阅扇出、消息字节数、查询扫描量和保存期，再谈“交易所级”。真实撮合延迟不属于此方案目标。

基准场景 A（首期验收建议）：2,000 个活跃标的 × 平均 2 条/秒 = 4,000 条/秒输入；模拟 5 倍峰值即 20,000 条/秒。若每条 200B，持续 24 小时约 69.12GB/天原始载荷，未含索引、副本和协议开销；交易时段较短时按实际活跃秒数计算。

基准场景 B（扩容测试，不是已承诺能力）：50,000 标的 × 10 条/秒 = 500,000 条/秒；200B/条为 100MB/秒，持续 24 小时约 8.64TB/天。到这个量级，授权范围、保留策略、压缩、分区和预算会决定方案，需要专项 PoC。

推送扇出单独算：10,000 在线用户 × 20 个订阅 × 2 次/秒 × 80B 增量 ≈ 32MB/秒载荷，尚未含协议、加密和重连开销。共享计算能降低上游重复查询，不能消除每个客户端的网络发送成本。

建议首期 SLO：普通 API p95 < 300ms；命中聚合的常用分析 p95 < 1s；平台接收到浏览器可见更新 p95 < 500ms；典型版图交互尽量保持 50–60fps。验收必须附机器配置、网络、浏览器版本、数据规模、并发和测试时长；外部源延迟单独记录，不与平台延迟混算。

Chrome 基准页面：12 个动态图表 + 1 个逻辑上 100,000 行的虚拟表格 + 1 个聚合地图；固定数据回放下测 CPU、内存、长任务、帧率和可见更新延迟。测试 30 分钟稳态、5 分钟 5 倍峰值、断线重连风暴和慢消费者；内存不得持续线性增长，恢复后快照与历史对账一致。

## 11 · 可靠性、安全与运维

API/网关无状态水平扩展，采集任务通过租约避免重复占用源配额，消费按分区扩展；连接网关排空再发布。连接恢复加抖动退避，超载先限制昂贵查询，再降非关键刷新频率；订单和授权链路保留独立资源预算。

指标：源新鲜度、序列缺口、重复比例、消费 lag、队列长度、推送延迟、活跃连接、查询成本、错误率、库存异常、支付对账差异、权益交付延迟。统一 OpenTelemetry 上下文串联 HTTP/任务/事件；日志不可记录令牌、全量身份材料和支付秘密。

权限采用角色 + 对象属性策略，至少覆盖组织、所有权、数据订阅、动作类型；敏感写入支持二次认证。上传做 MIME/大小/恶意文件校验，外部连接器有出站域名限制和 SSRF 防护。备份加密、恢复演练、密钥托管、数据库最小权限进入上线清单。

生产可用性目标暂设月度 99.9%；事务库建议 PITR，初始恢复目标 RPO ≤ 5 分钟、RTO ≤ 1 小时，必须经演练确认。已确认支付以外部对账恢复，不能把 RPO 当可接受的资金丢失；行情原始归档和重放作为另一套恢复路径。多地域双活暂不纳入首期。

行情权益不仅是登录权限：按来源、标的、实时/延迟级别、历史范围、导出/再分发授权控制。正式接源前逐一确认数据提供方的使用条款；这里定义工程授权边界，不提供具体市场的法律结论。

## 12 · 分阶段落地与退出条件

P0 · 架构与数据 spike：确定首个用户角色、数据源及授权、部署区域、预算、预期负载。选择 1 个真实源，验证 symbol 映射、历史接口、序列/补齐方式、限频和样本大小；用固定回放测试选定图表库。退出条件是取得可重复报告及成本估算，不是只画完架构图。

P1 · 可用 Web 骨架与版图：统一外壳、身份/组织、资产详情、仪表板保存、折线/K线/表格/地图各一类、来源与新鲜度显示、单源采集与断线恢复、只读 MCP。Chrome 验收角色切换、越权拒绝、保存重开、数据重连和性能基准。

P2 · 跨模块闭环：工坊提交审核 → 资产登记 → 商城发布 → 支付沙箱下单 → 数字授权交付 → 版图持有记录；互动先落地活动发布和报名。四板块均有真实路径，演出/赛事/游戏专属复杂机制后续增量实现。验收重复回调不重复交付、失败可补偿、发布版本可追溯。

P3 · 规模化：按实测引入 Kafka/ClickHouse、更多数据源、历史重算、导出、预警、分润、完整互动子模块及受控 MCP 写入。达成负载目标、故障演练、授权撤销和成本上限后才扩大开放。

P4 · 有证据的拆分：当某模块持续独立扩容、发布互相阻塞、有独立团队或故障域要求时，沿现有接口迁为服务。微前端、服务网格、多地域双活、通用插件市场都按真实需求启用。

## 13 · 架构决策记录

ADR-001：业务模块化单体，实时平面独立。理由：减少初期分布式复杂度，同时隔离持续高吞吐负载。重审条件：团队/发布节奏或资源需求明显分化。

ADR-002：事务事实与分析读模型分开，局部使用 CQRS；不对所有业务全面事件溯源。理由：订单一致性与行情吞吐的约束不同；Outbox 保证事实变化可投影。

ADR-003：统一资产身份，独立商品、权益与内容版本。理由：多资产类型复用导航/权限，但不抹平库存、许可和证券权益的差异。

ADR-004：MCP 是应用能力适配层。理由：AI 与 Web 共享校验和审计，避免建立旁路；高频流仍使用专用数据协议。

ADR-005：先单体 Web + 模块化组件，暂不微前端。理由：四板块共享登录、设计语言和资产上下文；独立团队交付需求出现后再重审。

ADR-006：第一阶段没有撮合引擎。理由：用户已确认行情展示与分析；未来若开启撮合，应独立评估订单序列、风控、清算、对账及相应业务准入。

## 14 · 尚待确定

- 首批核心用户是消费者、创作者、商家还是资产分析人员？建议第一条闭环优先创作者与购买者，版图同时服务关注与持有分析。
- 首个真实数据源、市场/资产范围、更新频率、订阅费用与可再分发范围。
- 预计日活/同时在线、标的数量、历史保存期、部署地区、团队规模和月度基础设施预算。
- 商城首发以实体还是数字/IP 为主，是否多商家、是否需要平台分账；这决定履约与支付集成复杂度。

以上不阻止先构建模块边界与单源版图验证，但会影响正式上线范围及容量配置。此版本交付的是架构与评审资料，不是已实现的产品。
