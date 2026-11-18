/**
 * dsh-evoloop — browser side.
 *
 * A Evoloop-style visual planning board rendered as a full-screen overlay
 * launched from a floating button in the DSH UI. Infinite canvas with pan/zoom
 * and a grid, an "add" menu mirroring Evoloop's content-type list, and content
 * cards. M0 ships the `note` card: create, edit (double-click), drag to move,
 * select, delete, and persistence to the active workspace through the host
 * route registered in lib/index.js.
 *
 * Deliberately self-contained vanilla JS (a lazy-CJS bundle): the board is a
 * self-consistent DOM tree, so no external React/build step is needed and the
 * whole UI is easy to iterate on by refreshing the page.
 */

window.__ModuleLoader__.load({
  id: '@dsh-external/dsh-evoloop',
  factory: function (require) {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    var ROUTE = '/_dsh/evoloop/board'
    var HEALTH_ROUTE = '/_dsh/evoloop/health'
    var GIT_HEAD_ROUTE = '/_dsh/evoloop/git-head'
    var PUSH_ROUTE = '/_dsh/evoloop/push'
    // 🔴 改动 2026-10-02 · 「项目 → 文件 → 打开」路由（project-menu 子模块用）
    var OPEN_ROUTE = '/_dsh/evoloop/open'
    // 🔴 改动 2026-09-19 · 删除 n8n(Evoloop 2.0) 三条路由常量，新增手动更新机制的两条路由
    // ↳ 改前[js]: var N8N_STATUS_ROUTE/N8N_START_ROUTE/N8N_STOP_ROUTE = '/_dsh/n8n/...'
    // ↳ 改后[js]: var UPDATE_CHECK_ROUTE/UPDATE_APPLY_ROUTE = '/_dsh/bennote/update/...'
    var UPDATE_CHECK_ROUTE = '/_dsh/evoloop/update/check'
    var UPDATE_APPLY_ROUTE = '/_dsh/evoloop/update/apply'
    var CSS_ID = 'dsh-evoloop-css'
    var HEADER_ID = 'dsh-evoloop-header'
    var OVERLAY_ID = 'dsh-evoloop-overlay'
    var MODAL_CLASS = 'mn-modal'
    var STYLE_PREFIX = '--dsh-mn-'

    // ---- runtime error diagnostics ------------------------------------------
    // Intermittent "page went blank / icon grayed" failures are impossible to
    // reproduce on demand, so this trap forwards uncaught errors and unhandled
    // promise rejections that involve this plugin to the server-side health
    // endpoint (see the `errors` ring buffer there). Throttled to one POST per
    // 5s; the newest diagnostic wins. Nothing here may throw.
    var diagLastSent = 0
    var diagPending = null
    var diagTimer = null
    function flushDiag() {
      diagTimer = null
      if (!diagPending) return
      var body = JSON.stringify(diagPending)
      diagPending = null
      diagLastSent = Date.now()
      try { fetch(HEALTH_ROUTE, { method: 'POST', body: body }).catch(function () {}) } catch (e) {}
    }
    function reportDiag(kind, msg) {
      try {
        diagPending = { kind: kind, msg: String(msg).slice(0, 2000), at: new Date().toISOString() }
        var wait = 5000 - (Date.now() - diagLastSent)
        if (wait > 0) {
          if (!diagTimer) diagTimer = setTimeout(flushDiag, wait)
          return
        }
        flushDiag()
      } catch (e) {}
    }
    function diagLooksLikeOurs(msg, filename) {
      var s = String(msg || '') + ' ' + String(filename || '')
      return s.indexOf('evoloop') >= 0 || s.indexOf('mn-') >= 0 || s.indexOf('dsh-mn') >= 0
    }
    try {
      window.addEventListener('error', function (e) {
        try {
          if (!e || !e.message) return
          // Cross-origin scripts report no filename — keep those too.
          if (e.filename && !diagLooksLikeOurs(e.message, e.filename)) return
          reportDiag('error', (e.message || 'error') + ' @ ' + (e.filename || '(inline)') + ':' + (e.lineno || 0) + ':' + (e.colno || 0))
        } catch (x) {}
      })
      window.addEventListener('unhandledrejection', function (e) {
        try {
          var r = e && e.reason
          var m = r && (r.stack || r.message || r)
          if (!diagLooksLikeOurs(m, '')) return
          reportDiag('rejection', m)
        } catch (x) {}
      })
    } catch (e) {}
    var language = 'zh-CN'
    try { if (window.localStorage.getItem('evoloop.language') === 'en') language = 'en' } catch (e) {}
    var ENGLISH = {
      "笔记": "Note",
      "链接": "Link",
      "待办": "To-do",
      "连线": "Line",
      "画板": "Board",
      "分栏": "Column",
      "评论": "Comment",
      "表格": "Table",
      "草图": "Sketch",
      "色块": "Color",
      "文档": "Document",
      "音频": "Audio",
      "地图": "Map",
      "视频": "Video",
      "图片": "Image",
      "上传": "Upload",
      "绘图": "Draw",
      "读取画板失败": "Failed to load board",
      "保存画板失败": "Failed to save board",
      "读取已推送版本失败": "Failed to load pushed version",
      // 🔴 改动 2026-09-19 · 版本下拉 Update 按钮的更新机制词条
      // ↳ 改前[js]: （无）
      // ↳ 改后[js]: 检查更新/正在检查/已是最新/发现新版本/立即更新/正在更新/更新完成/失败/未配置更新源/当前版本/版本
      "版本": "Version",
      "当前版本": "Current version",
      "检查更新": "Update",
      "正在检查更新…": "Checking for updates…",
      "已是最新版本": "Already up to date",
      "发现新版本": "New version available:",
      "立即更新": "Update now",
      "正在更新…": "Updating…",
      "更新完成，请重新打开面板生效": "Update applied — reopen the panel to take effect",
      "检查更新失败": "Update check failed",
      "更新失败": "Update failed",
      "未配置更新源": "No update source configured",
      "推送失败": "Push failed",
      "我的画板": "My board",
      "展开 Evoloop 画布": "Expand Evoloop canvas",
      "拖动调整大小": "Drag to resize",
      "写点什么…": "Write something…",
      "未实现": "Not implemented",
      "待办事项": "To-do item",
      "删除": "Delete",
      "＋ 添加待办": "+ Add to-do",
      "未命名链接": "Untitled link",
      "双击输入链接": "Double-click to add a link",
      "输入链接地址": "Enter link URL",
      "留下评论…": "Leave a comment…",
      "拖动标题栏移动整列": "Drag the header to move this column",
      "列标题": "Column title",
      "拖入卡片，在这里整理内容": "Drag cards here to organize them",
      "＋ 添加笔记": "+ Add note",
      "编写文档…": "Write a document…",
      "双击设置图片地址": "Double-click to set image URL",
      "图片地址": "Image URL",
      "双击设置音频地址": "Double-click to set audio URL",
      "音频地址": "Audio URL",
      "双击设置视频地址": "Double-click to set video URL",
      "视频地址": "Video URL",
      "双击设置地图地址": "Double-click to set map URL",
      "地图地址": "Map URL",
      "点击上传文件": "Double-click to upload a file",
      "上传中…": "Uploading…",
      "上传失败": "Upload failed",
      "子画板": "Sub-board",
      "添加": "Add",
      "添加 ": "Add ",
      "（即将支持）": " (coming soon)",
      "视图": "View",
      "项目": "Project",
      "文件": "File",
      "打开…": "Open…",
      "打开失败": "Open failed",
      "输入文件夹路径（依次尝试其 .bennote/board.json 与 board.json）": "Folder path (tries .bennote/board.json then board.json)",
      "更多卡片": "More cards",
      "删除选中的卡片": "Delete selected cards",
      "类型": "Type",
      "文本": "Text",
      "位置": "Position",
      "尺寸": "Size",
      "属性": "Properties",
      "（空画板）": "(Empty board)",
      "（空）": "(Empty)",
      "（从未推送）": "(Never pushed)",
      "推送到 GitHub": "Push to GitHub",
      "关闭": "Close",
      " 新增": " added",
      " 修改": " modified",
      " 删除": " removed",
      "视图已变化": "View changed",
      "重命名链接": "Rename link",
      "重命名画板": "Rename board",
      "读取失败，仅展示当前状态": "Could not load previous version; showing current state",
      "视图变化对比": "Compare views",
      "推送前 · GitHub": "Before · GitHub",
      "推送后 · 当前": "After · Current",
      "缩放：": "Zoom: ",
      "位置：(": "Position: (",
      "标题：": "Title: ",
      "连线已变化": "Connections changed",
      "卡片变更列表": "Card changes",
      "没有检测到卡片变更": "No card changes detected",
      "GitHub 远程仓库 (https://… 或 git@… .git)": "GitHub remote (https://… or git@… .git)",
      "分支": "Branch",
      "取消": "Cancel",
      "推送中…": "Pushing…",
      "已推送完成": "Push complete",
      "已推送到 GitHub 远程仓库。": "Pushed to the GitHub remote.",
      "已提交到本地 git 历史（未配置远程仓库，仅本地提交）。": "Committed locally (no remote configured).",
      "完成": "Done",
      "正在读取已推送版本…": "Loading pushed version…",
      "画板名称": "Board name",
      "视图缩放": "Canvas zoom",
      "对比变更并推送到 GitHub": "Review changes and push to GitHub",
      "拖动调整宽度": "Drag to adjust panel width",
      "Evoloop 画布": "Evoloop canvas",
      "打开 Evoloop 画布": "Open Evoloop canvas"
}
    function t(key) { return language === 'en' && Object.prototype.hasOwnProperty.call(ENGLISH, key) ? ENGLISH[key] : key }
    var languageListeners = []
    Object.assign(ENGLISH, {
      '返回上级画板': 'Back to parent board',
      '空画板 · 双击打开': 'Empty board · Double-click to open',
      '双击打开画板': 'Double-click to open board',
      '双击名字改名，双击图标打开': 'Double-click name to rename, icon to open',
      // 🔴 改动 2026-09-25 · context-menu 子模块词条
      '锁定位置': 'Lock Position',
      '位置已锁定': 'Position locked',
      '张卡片': 'cards',
      '组件库': 'Component',
      '所有卡片': 'All cards',
      '拖到左侧以固定': 'Drag to the sidebar to pin',
      '固定到侧边栏': 'Pin to sidebar',
      '从侧边栏取消固定': 'Unpin from sidebar',
    })
    function setLanguage(value) {
      if (value !== 'en' && value !== 'zh-CN' || value === language) return
      language = value
      try { window.localStorage.setItem('evoloop.language', language) } catch (e) {}
      languageListeners.slice().forEach(function (refresh) { refresh() })
    }

    // ---------------------------------------------------------------------
    // 🔴 改动 2026-09-19 · 移除 1.0/2.0 版本切换状态机（2.0 Evoloop 已删），
    // 改为固定当前版本号；后续更新走顶部版本下拉里的 Update 按钮，主动点击才更新
    // ↳ 改前[js]: VERSIONS 数组 + version 变量 + setVersion + versionListeners + localStorage bennote.version
    // ↳ 改后[js]: PLUGIN_VERSION / PLUGIN_VERSION_LABEL 常量，无任何自动更新行为
    // ---------------------------------------------------------------------
    var PLUGIN_VERSION = '1.0'
    var PLUGIN_VERSION_LABEL = PLUGIN_VERSION + ' · Evoloop'

    // ---------------------------------------------------------------------
    // Content types — mirror the Evoloop "add" menu order from the reference
    // screenshot. `enabled:true` means implemented in this milestone.
    // ---------------------------------------------------------------------
    var CONTENT_TYPES = [
      { type: 'note',     label: '笔记',   icon: '≡', enabled: true },
      { type: 'link',     label: '链接',   icon: '⌁', enabled: true },
      { type: 'todo',     label: '待办',   icon: '✓', enabled: true },
      // 🔴 改动 2026-09-25 · 侧边栏工作流卡片名改英文 WorkFlow
      // ↳ 改前[js]: label: '工作流'  改后[js]: label: 'WorkFlow'
      { type: 'workflow', label: 'WorkFlow', icon: '◇', enabled: true },
      { type: 'line',     label: '连线',   icon: '↗', enabled: true },
      { type: 'board',    label: '画板',   icon: '▦', enabled: true },
      { type: 'column',   label: '分栏',   icon: '▬', enabled: true },
      { type: 'comment',  label: '评论',   icon: '❯', enabled: true },
      { type: 'table',    label: '表格',   icon: '▤', enabled: true },
      { type: 'sketch',   label: '草图',   icon: '✎', enabled: true },
      { type: 'color',    label: '色块',   icon: '▧', enabled: true },
      { type: 'document', label: '文档',   icon: '▭', enabled: true },
      { type: 'audio',    label: '音频',   icon: '♪', enabled: true },
      { type: 'map',      label: '地图',   icon: '◉', enabled: true },
      { type: 'video',    label: '视频',   icon: '▸', enabled: true },
      { type: 'image',    label: '图片',   icon: '▣', enabled: true },
      { type: 'upload',   label: '上传',   icon: '⇧', enabled: true },
      { type: 'draw',     label: '绘图',   icon: '✏', enabled: true },
    ]

    // ---------------------------------------------------------------------
    // Small helpers
    // ---------------------------------------------------------------------
    function uid() {
      return 'c_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
    }

    function el(tag, attrs, children) {
      var node = document.createElement(tag)
      if (attrs) {
        Object.keys(attrs).forEach(function (k) {
          if (k === 'style' && typeof attrs[k] === 'object') {
            Object.keys(attrs[k]).forEach(function (pk) { node.style[pk] = attrs[k][pk] })
          } else if (k === 'class') {
            node.className = attrs[k]
          } else if (k === 'dataset') {
            Object.keys(attrs[k]).forEach(function (dk) { node.dataset[dk] = attrs[k][dk] })
          } else if (k.indexOf('on') === 0) {
            node.addEventListener(k.slice(2).toLowerCase(), attrs[k])
          } else {
            node.setAttribute(k, attrs[k])
          }
        })
      }
      ;(children || []).forEach(function (c) {
        if (c == null) return
        node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c)
      })
      return node
    }

    function clamp(v, min, max) { return Math.max(min, Math.min(max, v)) }

    // ---------------------------------------------------------------------
    // CSS
    // ---------------------------------------------------------------------
    var CSS = [
      '#' + OVERLAY_ID + '{color-scheme:dark;--mn-canvas:#171717;--mn-grid-dot:#444444;--mn-toolbar:#292929;--mn-surface:#343434;',
        '--mn-column:#2c2c2c;--mn-hover:#404040;--mn-text:#e7e7e7;--mn-muted:#acacac;--mn-border:#484848;',
        '--mn-icon-bg:#414141;--mn-drop:#303e45;--mn-link:#9ec9ed;--mn-danger:#f08d8d;',
        // Placeholder (hint) text size inside cards. Single knob — tune here.
        '--mn-ph-size:12px;--mn-reorder-ms:170ms;--mn-reorder-ease:cubic-bezier(.2,0,0,1)}',
      '.dsh-mn-header-pill{border:1px solid var(--dsw-alias-border-l2);min-width:96px;height:32px;',
        'color:var(--dsw-alias-label-primary);font:400 13px/20px var(--dsw-font-family,system-ui);cursor:pointer;',
        'background:0 0;border-radius:18px;justify-content:center;align-items:center;gap:6px;',
        'padding:6px 12px;display:inline-flex}.dsh-mn-header-pill:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}',
      '.dsh-mn-header-pill span{flex:none;white-space:nowrap}.dsh-mn-dot{width:10px;height:10px;border-radius:3px;',
        'background:#0AB9E6;display:inline-block}',
      '#' + OVERLAY_ID + '{position:fixed;top:0;right:0;bottom:0;width:480px;z-index:1000000;display:none;',
        'flex-direction:column;background:var(--mn-canvas);color:var(--mn-text);font:14px/1.5 system-ui,"Segoe UI",sans-serif;',
        'overflow:hidden;box-shadow:-12px 0 32px rgba(0,0,0,.45);border-left:1px solid var(--mn-border)}',
      '#' + OVERLAY_ID + '.mn-open{display:flex}',
      '#' + OVERLAY_ID + '.mn-modal{box-shadow:none;box-sizing:border-box}',
      '#' + OVERLAY_ID + ' .mn-resize{position:absolute;left:0;top:0;bottom:0;width:5px;cursor:col-resize;z-index:70;',
        'background:transparent;',
        'border-radius:0 3px 3px 0}',
      '#' + OVERLAY_ID + ' .mn-resize:hover{background:#606060}',
      '.dsh-mn-collapse-tab{position:fixed;right:0;top:50%;transform:translateY(-50%);z-index:1000001;width:42px;',
        'min-height:170px;display:none;flex-direction:column;align-items:center;justify-content:center;gap:9px;',
        'padding:16px 0;cursor:pointer;background:#0AB9E6;color:#fff;',
        'border-radius:11px 0 0 11px;box-shadow:-6px 0 24px rgba(10,185,230,.5);font:600 12px/1 system-ui}',
      '.dsh-mn-collapse-tab.mn-visible{display:flex}.dsh-mn-collapse-tab:hover{filter:brightness(1.08)}',
      '.dsh-mn-collapse-tab .dsh-mn-tab-ico{width:22px;height:22px;border-radius:6px;background:#fff;',
        'display:inline-flex;align-items:center;justify-content:center;font:700 14px/1 system-ui;color:#0AB9E6}',
      '.dsh-mn-collapse-tab .dsh-mn-tab-txt{writing-mode:vertical-rl;letter-spacing:.1em;font:600 11px/1.2 system-ui}',
      '#' + OVERLAY_ID + ' .mn-topbar{flex:0 0 76px;display:flex;align-items:center;gap:10px;padding:0 16px;',
        'background:var(--mn-toolbar);border-bottom:1px solid var(--dsw-alias-border-l2);color:var(--mn-muted);box-sizing:border-box}',
      '#' + OVERLAY_ID + ' .mn-main{flex:1;display:flex;flex-direction:row;min-height:0}',
      '#' + OVERLAY_ID + ' .mn-rail{width:66px;flex:none;display:flex;flex-direction:column;align-items:center;',
        'padding:10px 0 8px;box-sizing:border-box;background:#232323;border-right:1px solid #383838;min-height:0}',
      '#' + OVERLAY_ID + ' .mn-rail-tools{width:100%;flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;scrollbar-width:thin;scrollbar-color:#484848 transparent;display:flex;flex-direction:column;align-items:center;gap:8px}',
      '#' + OVERLAY_ID + ' .mn-rail-extra{display:flex;flex-direction:column;align-items:center;gap:8px}',
      '#' + OVERLAY_ID + ' .mn-rail-extra[hidden]{display:none}',
      '#' + OVERLAY_ID + ' .mn-rail-btn{width:44px;height:44px;flex:none;border:0;border-radius:11px;background:transparent;',
        'color:var(--mn-muted);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:20px;line-height:1}',
      '#' + OVERLAY_ID + ' .mn-rail-btn:hover{background:var(--mn-hover);color:var(--mn-text)}',
      '#' + OVERLAY_ID + ' .mn-rail-btn span{pointer-events:none}',
      '#' + OVERLAY_ID + ' .mn-rail-item{width:54px;height:50px;flex:none;border:0;border-radius:3px;background:transparent;',
        'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;cursor:grab;padding:0}',
      '#' + OVERLAY_ID + ' .mn-rail-item:hover{background:#303030}',
      '#' + OVERLAY_ID + ' .mn-rail-item.mn-disabled{opacity:.35;cursor:not-allowed}',
      '#' + OVERLAY_ID + ' .mn-rail-item.mn-disabled:hover{background:transparent}',
      '#' + OVERLAY_ID + ' .mn-rail-item.mn-active{background:#414141;box-shadow:inset 0 0 0 1px #555}',
      '#' + OVERLAY_ID + ' .mn-rail-item-icon{width:30px;height:26px;flex:none;border-radius:2px;display:flex;align-items:center;',
        'justify-content:center;background:linear-gradient(#3c3c3c,#333);box-shadow:0 1px 2px #181818;color:#c8c8c8;font-size:20px;line-height:1}',
      '#' + OVERLAY_ID + ' .mn-rail-item.mn-active .mn-rail-item-icon{color:#fff}',
      '#' + OVERLAY_ID + ' .mn-rail-more{width:30px;height:22px;flex:none;display:flex;align-items:center;justify-content:center;',
        'border:0;border-radius:2px;background:#333;color:#ccc;font-size:20px;line-height:1;cursor:pointer;margin:2px 0 4px}',
      '#' + OVERLAY_ID + ' .mn-rail-more:hover,#' + OVERLAY_ID + ' .mn-rail-more[aria-expanded="true"]{background:#484848;color:#fff}',
      '#' + OVERLAY_ID + ' .mn-rail-item-label{flex:none;font:400 10px/1.2 Arial,"Segoe UI",sans-serif;color:#999;white-space:nowrap;overflow:hidden;',
        'text-overflow:ellipsis;max-width:100%}',
      '#' + OVERLAY_ID + ' .mn-rail-item.mn-active .mn-rail-item-label{color:#fff}',
      '#' + OVERLAY_ID + ' .mn-rail-item.mn-active .mn-rail-item-icon,.mn-rail-item.mn-active .mn-rail-item-label{color:#fff}',
      '#' + OVERLAY_ID + ' .mn-rail-item:hover .mn-rail-item-icon,#' + OVERLAY_ID + ' .mn-component-item:hover .mn-rail-item-icon{color:var(--mn-text)}',
      '#' + OVERLAY_ID + ' .mn-rail-sep{height:1px;width:28px;flex:none;background:var(--mn-border);margin:6px 0}',
      '#' + OVERLAY_ID + ' .mn-rail-spacer{flex:1}',
      '#' + OVERLAY_ID + ' .mn-component-toggle{border-top:1px solid var(--mn-border);margin-top:3px;padding-top:5px}',
      '#' + OVERLAY_ID + ' .mn-component-toggle[aria-expanded="true"]{background:#414141;color:#fff}',
      '#' + OVERLAY_ID + ' .mn-component-pool{width:230px;flex:none;display:flex;flex-direction:column;background:#292929;border-right:1px solid #3c3c3c;box-sizing:border-box;overflow:hidden}',
      '#' + OVERLAY_ID + ' .mn-component-pool[hidden]{display:none}',
      '#' + OVERLAY_ID + ' .mn-component-head{padding:16px 14px 12px;border-bottom:1px solid #3c3c3c}',
      '#' + OVERLAY_ID + ' .mn-component-head strong{display:block;font:600 15px/1.3 system-ui;color:var(--mn-text)}',
      '#' + OVERLAY_ID + ' .mn-component-head span{display:block;margin-top:4px;font:11px/1.4 system-ui;color:var(--mn-muted)}',
      '#' + OVERLAY_ID + ' .mn-component-list{padding:10px;overflow-y:auto;display:grid;grid-template-columns:repeat(3,54px);align-content:start;justify-content:center;gap:8px}',
      '#' + OVERLAY_ID + ' .mn-component-item{width:54px;height:50px;flex:none;border:0;border-radius:3px;background:transparent;color:var(--mn-muted);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;cursor:grab;padding:0}',
      '#' + OVERLAY_ID + ' .mn-component-item:hover{background:#303030}',
      '#' + OVERLAY_ID + ' .mn-rail-pinned{display:flex;flex-direction:column;align-items:center;gap:8px;width:100%}',
      '#' + OVERLAY_ID + ' .mn-rail-item.mn-pin-shifting{transition:transform var(--mn-reorder-ms) var(--mn-reorder-ease)}',
      '#' + OVERLAY_ID + ' .mn-rail-pinned.mn-pin-target{background:rgba(10,185,230,.08)}',
      '#' + OVERLAY_ID + ' .mn-rail-avatar-dot{width:28px;height:28px;border-radius:50%;',
        'background:linear-gradient(135deg,#0AB9E6,#6d5efc);display:inline-block;pointer-events:none}',
      '#' + OVERLAY_ID + ' .mn-title{background:transparent;border:none;outline:none;color:var(--mn-text);font:600 15px/1.4 system-ui;',
        'min-width:0;flex:1;padding:6px 8px;border-radius:4px}',
      '#' + OVERLAY_ID + ' .mn-title:hover{background:var(--mn-hover)}',
      '#' + OVERLAY_ID + ' .mn-heading{display:flex;align-items:center;gap:8px;flex:1;min-width:0}',
      '#' + OVERLAY_ID + ' .mn-heading .mn-title{width:150px;flex:0 1 150px}',
      '#' + OVERLAY_ID + ' .mn-language{display:flex;align-items:center;gap:5px;color:var(--mn-muted);flex-shrink:0}',
      '#' + OVERLAY_ID + ' .mn-language-select{color-scheme:dark;background:var(--mn-surface);color:var(--mn-text);border:1px solid var(--mn-border);border-radius:5px;padding:4px;font:12px system-ui;cursor:pointer}',
      '#' + OVERLAY_ID + ' .mn-language-select:focus-visible{outline:2px solid #0AB9E6;outline-offset:2px}',
      '#' + OVERLAY_ID + ' .mn-btn{display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border-radius:5px;',
        'border:1px solid var(--mn-border);background:var(--mn-surface);color:var(--mn-text);font:600 13px/1 system-ui;cursor:pointer}',
      '#' + OVERLAY_ID + ' .mn-btn:hover{background:var(--mn-hover)}',
      '#' + OVERLAY_ID + ' .mn-btn.mn-primary{background:#6d5efc;border-color:#6d5efc;color:#fff}',
      '#' + OVERLAY_ID + ' .mn-btn.mn-primary:hover{background:#7d6efc}',
      '#' + OVERLAY_ID + ' .mn-view{position:relative;display:inline-flex;flex:none}',
      '#' + OVERLAY_ID + ' .mn-view-btn{display:inline-flex;align-items:center;gap:7px;padding:6px 11px;border-radius:5px;',
        'border:1px solid var(--mn-border);background:var(--mn-surface);color:var(--mn-text);font:600 13px/1 system-ui;cursor:pointer;white-space:nowrap}',
      '#' + OVERLAY_ID + ' .mn-view-btn:hover{background:var(--mn-hover)}',
      '#' + OVERLAY_ID + ' .mn-view-careticon{width:10px;height:10px;flex:none;color:var(--mn-muted);display:inline-flex;',
        'align-items:center;justify-content:center}',
      '#' + OVERLAY_ID + ' .mn-view-menu{position:absolute;top:calc(100% + 6px);right:0;z-index:80;min-width:104px;',
        'max-height:220px;overflow:auto;padding:4px;border-radius:4px;border:1px solid var(--mn-border);',
        'background:var(--mn-surface);box-shadow:0 8px 24px rgba(0,0,0,.4);display:none}',
      '#' + OVERLAY_ID + ' .mn-view-item{display:block;width:100%;text-align:left;padding:6px 10px;border:none;',
        'border-radius:6px;background:transparent;color:var(--mn-text);font:500 12px/1 system-ui;cursor:pointer}',
      '#' + OVERLAY_ID + ' .mn-view-item:hover{background:var(--mn-hover)}',
      '#' + OVERLAY_ID + ' .mn-view-item.mn-active{background:#6d5efc;color:#fff;font-weight:600}',
      '#' + OVERLAY_ID + ' .mn-close{color:var(--mn-text)}',
      // 🔴 改动 2026-09-17 · 画布只裁剪不原生滚动，防止长内容聚焦时推走网格和滚动条
      '#' + OVERLAY_ID + ' .mn-body{flex:1;min-width:0;min-height:0;position:relative;overflow:clip;cursor:default;touch-action:none}',
      '#' + OVERLAY_ID + ' .mn-body.mn-panning{cursor:grabbing}',
      // Scrollbars styled to match dsh's native scrollbar tokens.
      '#' + OVERLAY_ID + ' .mn-scrollbar{position:absolute;z-index:30;opacity:0;transition:opacity .15s ease;pointer-events:none}',
      '#' + OVERLAY_ID + ' .mn-scrollbar.mn-visible{opacity:1;pointer-events:auto}',
      '#' + OVERLAY_ID + ' .mn-scrollbar.mn-v{top:0;right:0;bottom:0;width:8px}',
      '#' + OVERLAY_ID + ' .mn-scrollbar.mn-h{left:0;bottom:0;right:8px;height:8px}',
      '#' + OVERLAY_ID + ' .mn-scrollbar-track{position:absolute;inset:0;overflow:hidden}',
      '#' + OVERLAY_ID + ' .mn-scrollbar-thumb{position:absolute;border-radius:4px;',
        'background:var(--dsw-alias-scrollbar-bg-l2,var(--dsw-alias-scrollbar-bg-l1,#545557));cursor:pointer}',
      '#' + OVERLAY_ID + ' .mn-scrollbar-thumb:hover{',
        'background:var(--dsw-alias-scrollbar-hover-l2,var(--dsw-alias-scrollbar-hover-l1,#65676b))}',
      '#' + OVERLAY_ID + ' .mn-scrollbar.mn-v .mn-scrollbar-thumb{left:0;right:0;top:0}',
      '#' + OVERLAY_ID + ' .mn-scrollbar.mn-h .mn-scrollbar-thumb{top:0;bottom:0;left:0}',
      '#' + OVERLAY_ID + ' .mn-grid{position:absolute;inset:0;background-color:var(--mn-canvas);',
        'background-image:radial-gradient(circle at center,var(--mn-grid-dot) 0 var(--mn-dot-radius,0.5px),transparent var(--mn-dot-edge,0.65px));',
        'background-size:16px 16px;background-position:-16px -8px}',
      '#' + OVERLAY_ID + ' .mn-world{position:absolute;left:0;top:0;transform-origin:0 0;will-change:transform}',
      '#' + OVERLAY_ID + ' .mn-lines{position:absolute;left:0;top:0;overflow:visible;pointer-events:none;z-index:1}',
      '#' + OVERLAY_ID + ' .mn-line{stroke:#6d5efc;stroke-width:2;stroke-linecap:round;pointer-events:stroke;cursor:pointer}',
      '#' + OVERLAY_ID + ' .mn-line:hover{stroke:#0AB9E6;stroke-width:3}',
      '#' + OVERLAY_ID + ' .mn-card{position:absolute;background:var(--mn-surface);border-radius:4px;box-shadow:0 1px 3px rgba(0,0,0,.4),0 0 0 1px var(--mn-border);',
        'color:var(--mn-text);overflow:hidden;cursor:default;box-sizing:border-box;user-select:none}',
      '#' + OVERLAY_ID + ' .mn-card.mn-selected{outline:2px solid #0AB9E6;outline-offset:2px}',
      '#' + OVERLAY_ID + ' .mn-marquee{position:absolute;z-index:40;border:1px solid #0AB9E6;border-radius:2px;',
        'background:rgba(10,185,230,.10);pointer-events:none;display:none}',
      '.mn-text-measure{position:absolute;visibility:hidden;white-space:pre-wrap;word-break:break-word;',
        'left:-9999px;top:0;pointer-events:none}',
      '#' + OVERLAY_ID + ' .mn-card.mn-dragging{cursor:grabbing;box-shadow:0 12px 28px rgba(0,0,0,.45);z-index:50}',
      '#' + OVERLAY_ID + ' .mn-card.mn-column-shifting{transition:left var(--mn-reorder-ms) var(--mn-reorder-ease),top var(--mn-reorder-ms) var(--mn-reorder-ease)}',
      '#' + OVERLAY_ID + ' .mn-card.mn-dragging *{cursor:grabbing!important}',
      '#' + OVERLAY_ID + ' .mn-card.mn-editing{cursor:default}',
      '#' + OVERLAY_ID + ' .mn-card:not(.mn-editing) input,#' + OVERLAY_ID + ' .mn-card:not(.mn-editing) textarea,',
      '#' + OVERLAY_ID + ' .mn-card:not(.mn-editing) button,#' + OVERLAY_ID + ' .mn-card:not(.mn-editing) canvas,',
      '#' + OVERLAY_ID + ' .mn-card:not(.mn-editing) audio,#' + OVERLAY_ID + ' .mn-card:not(.mn-editing) video{cursor:default;user-select:none}',
      '#' + OVERLAY_ID + ' .mn-card.mn-editing textarea,#' + OVERLAY_ID + ' .mn-card.mn-editing input:not([type="checkbox"]):not([type="color"]):not([type="file"]){cursor:text;user-select:text}',
      '#' + OVERLAY_ID + ' .mn-card.mn-editing button,#' + OVERLAY_ID + ' .mn-card.mn-editing input[type="checkbox"],',
      '#' + OVERLAY_ID + ' .mn-card.mn-editing input[type="color"],#' + OVERLAY_ID + ' .mn-card.mn-editing input[type="file"],',
      '#' + OVERLAY_ID + ' .mn-card.mn-editing audio,#' + OVERLAY_ID + ' .mn-card.mn-editing video{cursor:pointer}',
      '#' + OVERLAY_ID + ' .mn-card.mn-editing .mn-draw-canvas{cursor:crosshair}',
      '#' + OVERLAY_ID + ' .mn-card .mn-resize-handle{position:absolute;right:-1px;bottom:-1px;width:16px;height:16px;',
        'cursor:se-resize;z-index:5;opacity:0;transition:opacity .12s ease;',
        'background:linear-gradient(135deg,transparent 50%,#0AB9E6 50%,#0AB9E6 60%,transparent 60%)}',
      '#' + OVERLAY_ID + ' .mn-card:hover .mn-resize-handle,',
      '#' + OVERLAY_ID + ' .mn-card.mn-selected .mn-resize-handle{opacity:.9}',
      // 🔴 改动 2026-09-21 · note 样式随 cards-basic 子模块迁出
      // --- todo (Milanote-style) ---
      // 🔴 改动 2026-09-25 · workflow 卡片/对话框样式（.mn-wf-* 共 13 条）随 cards-workflow 子模块迁出（style#dsh-evoloop-cards-workflow-css）
      // 🔴 改动 2026-09-21 · todo 样式随 todo 子模块迁出（style#dsh-evoloop-todo-css）
      // 🔴 改动 2026-09-21 · 进程条/计数器样式随 process-dock 子模块迁出（style#dsh-evoloop-process-dock-css）
      // 🔴 改动 2026-09-17 · 移除所有卡片内部 Add 按钮、点击添加逻辑及其留白
      // 🔴 改动 2026-09-21 · link/color/comment 样式随 cards-basic 子模块迁出
      // --- table ---
      '#' + OVERLAY_ID + ' .mn-table{width:100%;height:100%;border-collapse:collapse;table-layout:fixed}',
      '#' + OVERLAY_ID + ' .mn-table-cell{border:1px solid var(--mn-border);padding:0;box-sizing:border-box}',
      '#' + OVERLAY_ID + ' .mn-table-input{width:100%;border:none;outline:none;background:transparent;color:var(--mn-text);font:13px/1.5 system-ui;padding:6px 8px;box-sizing:border-box}',
      // --- column ---
      '#' + OVERLAY_ID + ' .mn-card{z-index:2}',
      '#' + OVERLAY_ID + ' .mn-card-column{z-index:0;background:#333;overflow:visible;border:0;border-radius:0;',
        // The column OWNS the vertical rhythm of everything it stacks: one value for
        // the padding of every object and for the gap between two objects. Nothing
        // per-card-type contributes vertical spacing inside a column any more.
        // (--mn-col-side stays the horizontal inset, which this knob does not touch.)
        '--mn-col-pad:12px;--mn-col-side:12px}',
      // Every card type stacked in a column gets its vertical padding from the column, so
      // a note, a comment, a to-do, a board tile … all contribute the same top/bottom
      // space. Horizontal padding keeps each type's own value.
      '#' + OVERLAY_ID + ' .mn-card.mn-in-column .mn-note-ta,'
        + '#' + OVERLAY_ID + ' .mn-card.mn-in-column .mn-comment,'
        + '#' + OVERLAY_ID + ' .mn-card.mn-in-column .mn-document,'
        + '#' + OVERLAY_ID + ' .mn-card.mn-in-column .mn-link,'
        + '#' + OVERLAY_ID + ' .mn-card.mn-in-column .mn-media,'
        + '#' + OVERLAY_ID + ' .mn-card.mn-in-column .mn-upload,'
        + '#' + OVERLAY_ID + ' .mn-card.mn-in-column .mn-board,'
        + '#' + OVERLAY_ID + ' .mn-card.mn-in-column .mn-todo,'
        + '#' + OVERLAY_ID + ' .mn-card.mn-in-column .mn-media-ph{',
        'padding-top:var(--mn-col-pad,12px);padding-bottom:var(--mn-col-pad,12px)}',
      '#' + OVERLAY_ID + ' .mn-card-column.mn-drop-target{outline:3px solid #0AB9E6;background:var(--mn-drop)}',
      '#' + OVERLAY_ID + ' .mn-card-column.mn-dragging{z-index:0}',
      '#' + OVERLAY_ID + ' .mn-column{display:flex;flex-direction:column;height:100%}',
      '#' + OVERLAY_ID + ' .mn-column-header{display:flex;align-items:center;gap:8px;height:44px;padding:0 12px;border-bottom:1px solid var(--mn-border);flex:none}',
      '#' + OVERLAY_ID + ' .mn-column-title{color:var(--mn-text);font:600 14px/1.4 system-ui;border:0;background:transparent;min-width:0;flex:1;outline:none;padding:4px;text-align:center}',
      '#' + OVERLAY_ID + ' .mn-column-title:focus{background:var(--mn-hover);box-shadow:0 0 0 2px #0AB9E6;border-radius:4px}',
      '#' + OVERLAY_ID + ' .mn-column-grip{color:var(--mn-muted);font-size:20px;flex:none;width:20px;text-align:center}',
      '#' + OVERLAY_ID + ' .mn-column-count{font:12px system-ui;color:var(--mn-muted);flex:none;min-width:20px;text-align:center}',
      '#' + OVERLAY_ID + ' .mn-column-empty{padding:22px 12px;color:var(--mn-muted);text-align:center;font:12px system-ui}',
      '#' + OVERLAY_ID + ' .mn-column-list{flex:1}',
      '#' + OVERLAY_ID + ' .mn-column-item{color:var(--mn-text);font:13px/1.6 system-ui;padding:4px 14px;cursor:default}',
      '#' + OVERLAY_ID + ' .mn-column-item:hover{background:var(--mn-hover);color:var(--mn-danger)}',
      // --- document ---
      '#' + OVERLAY_ID + ' .mn-document{display:flex;flex-direction:column;height:100%;padding:12px 16px;box-sizing:border-box}',
      '#' + OVERLAY_ID + ' .mn-document-head{color:var(--mn-muted);font:600 12px/1.6 system-ui;margin-bottom:4px}',
      '#' + OVERLAY_ID + ' .mn-document-ta{flex:1;border:none;outline:none;resize:none;background:transparent;color:var(--mn-text);font:15px/1.7 system-ui;overflow:hidden;box-sizing:border-box}',
      // --- draw ---
      '#' + OVERLAY_ID + ' .mn-draw-canvas{width:100%;height:100%;display:block;border-radius:4px;cursor:default}',
      // --- media (audio / video / map / image) ---
      '#' + OVERLAY_ID + ' .mn-media{display:flex;align-items:center;gap:12px;height:100%;padding:14px 16px}',
      '#' + OVERLAY_ID + ' .mn-media-icon{width:36px;height:36px;flex:none;display:flex;align-items:center;justify-content:center;font-size:18px;background:var(--mn-icon-bg);border-radius:4px}',
      '#' + OVERLAY_ID + ' .mn-media-label{min-width:0;color:var(--mn-text);font:500 14px/1.4 system-ui;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '#' + OVERLAY_ID + ' .mn-media-el{max-width:100%;max-height:150px;margin:0;display:block}',
      // 🔴 改动 2026-09-23 · 图片填满卡片，尺寸由卡片 w/h 驱动（支持四角缩放/Ctrl 自由拉伸）
      '#' + OVERLAY_ID + ' .mn-media-img{width:100%;height:100%;max-height:none;object-fit:fill;display:block;border-radius:4px}',
      // 图片卡片溢出可见：角落缩放点半悬于卡片外不被裁剪
      '#' + OVERLAY_ID + ' .mn-card-image{overflow:visible}',
      // 图片四角缩放点：默认隐藏，鼠标靠近角落 48px 内显示（收进卡片内 3px，避免悬到卡外圆点消失）
      '#' + OVERLAY_ID + ' .mn-img-corner{position:absolute;width:12px;height:12px;border-radius:50%;background:#0AB9E6;border:2px solid #fff;box-shadow:0 0 6px rgba(10,185,230,.8);z-index:6;opacity:0;pointer-events:none;transition:opacity .12s ease;box-sizing:border-box}',
      // 隐形热区外扩 8px（28px 可点范围），按偏一点也不至于变成拖卡片
      '#' + OVERLAY_ID + ' .mn-img-corner::after{content:"";position:absolute;inset:-8px;border-radius:50%}',
      '#' + OVERLAY_ID + ' .mn-img-corner.mn-corner-on{opacity:1;pointer-events:auto}',
      '#' + OVERLAY_ID + ' .mn-img-corner.mn-corner-nw{left:3px;top:3px;cursor:nwse-resize}',
      '#' + OVERLAY_ID + ' .mn-img-corner.mn-corner-ne{right:3px;top:3px;cursor:nesw-resize}',
      '#' + OVERLAY_ID + ' .mn-img-corner.mn-corner-sw{left:3px;bottom:3px;cursor:nesw-resize}',
      '#' + OVERLAY_ID + ' .mn-img-corner.mn-corner-se{right:3px;bottom:3px;cursor:nwse-resize}',
      '#' + OVERLAY_ID + ' .mn-media-ph{color:var(--mn-muted);font:500 13px/1.6 system-ui;padding:14px 16px;text-align:center}',
      // --- upload ---
      '#' + OVERLAY_ID + ' .mn-upload{display:flex;align-items:center;gap:12px;height:100%;padding:14px 16px;cursor:default}',
      '#' + OVERLAY_ID + ' .mn-upload-icon{width:36px;height:36px;flex:none;display:flex;align-items:center;justify-content:center;font-size:18px;background:var(--mn-icon-bg);border-radius:4px}',
      '#' + OVERLAY_ID + ' .mn-upload-label{min-width:0;color:var(--mn-text);font:500 14px/1.4 system-ui;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '#' + OVERLAY_ID + ' .mn-upload-input{position:absolute;opacity:0;width:100%;height:100%;left:0;top:0;cursor:default;border:0;padding:0}',
      // --- board ---
      '#' + OVERLAY_ID + ' .mn-card-board{background:transparent;box-shadow:none;border-radius:0;overflow:visible}',
      '#' + OVERLAY_ID + ' .mn-card-board.mn-selected{outline:none}',
      '#' + OVERLAY_ID + ' .mn-card-board .mn-resize-handle{display:none}',
      '#' + OVERLAY_ID + ' .mn-board{display:flex;flex-direction:column;align-items:center;gap:7px;height:100%;padding:4px 6px;box-sizing:border-box}',
      '#' + OVERLAY_ID + ' .mn-board-badge{position:relative;width:64px;height:64px;flex:none;display:flex;align-items:center;justify-content:center;background:#7cc8c0;color:#174e60;border-radius:16px;cursor:pointer}',
      '#' + OVERLAY_ID + ' .mn-card-board .mn-board-badge svg{width:34px;height:34px}',
      '#' + OVERLAY_ID + ' .mn-board-title{min-width:0;color:var(--mn-text);font:600 15px/1.3 system-ui;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:text}',
      '#' + OVERLAY_ID + ' .mn-board-title-input{width:100%;min-width:0;border:0;background:transparent;outline:none;color:inherit;font:inherit;padding:0;letter-spacing:inherit}',
      '#' + OVERLAY_ID + ' .mn-board-info{min-width:0;width:100%;text-align:center}',
      '#' + OVERLAY_ID + ' .mn-board-count{font:12px/1.4 system-ui;color:var(--mn-muted);margin-top:1px}',
      '#' + OVERLAY_ID + ' .mn-board-preview{display:none}',
      '#' + OVERLAY_ID + ' .mn-card-board.mn-selected:not(.mn-in-column) .mn-board-badge{outline:2px solid #0AB9E6;outline-offset:1px}',
      '#' + OVERLAY_ID + ' .mn-card-board.mn-selected:not(.mn-in-column) .mn-board-badge:after{content:"";position:absolute;width:10px;height:10px;border-radius:50%;right:0;top:0;background:#0AB9E6}',
      '#' + OVERLAY_ID + ' .mn-card-board.mn-in-column{background:#272727;border-radius:0;box-shadow:none}',
      '#' + OVERLAY_ID + ' .mn-card-board.mn-in-column .mn-board{flex-direction:row;gap:14px;padding:14px 18px}',
      '#' + OVERLAY_ID + ' .mn-card-board.mn-in-column .mn-board-badge{width:64px;height:64px;border-radius:16px}',
      '#' + OVERLAY_ID + ' .mn-card-board.mn-in-column .mn-board-badge svg{width:34px;height:34px}',
      '#' + OVERLAY_ID + ' .mn-card-board.mn-in-column .mn-board-title{font-size:15px}',
      '#' + OVERLAY_ID + ' .mn-card-board.mn-in-column .mn-board-count{font-size:12px}',
      '#' + OVERLAY_ID + ' .mn-card-board.mn-in-column .mn-board-info{flex:1;width:auto;text-align:left}',
      '#' + OVERLAY_ID + ' .mn-card-board.mn-in-column .mn-board-count{color:#c6c6c6}',
      '#' + OVERLAY_ID + ' .mn-card-board.mn-in-column.mn-selected{outline:2px solid #0AB9E6;outline-offset:0}',
      '#' + OVERLAY_ID + ' .mn-board-back{max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '#' + OVERLAY_ID + ' .mn-addmenu{position:absolute;top:84px;left:56px;bottom:8px;z-index:60;width:60px;overflow-y:auto;overflow-x:hidden;',
        'background:var(--mn-toolbar);border:1px solid var(--mn-border);border-radius:12px;padding:8px 6px;',
        'display:flex;flex-direction:column;align-items:stretch;gap:6px;box-shadow:0 4px 18px rgba(0,0,0,.4)}',
      '#' + OVERLAY_ID + ' .mn-addmenu h4{margin:2px 4px 2px;font:600 10px/1 system-ui;color:var(--mn-muted);letter-spacing:.06em;text-transform:uppercase}',
      '#' + OVERLAY_ID + ' .mn-additem{display:flex;flex-direction:column;align-items:center;gap:4px;padding:7px 3px 6px;',
        'border-radius:5px;cursor:pointer;box-sizing:border-box;min-width:0}',
      '#' + OVERLAY_ID + ' .mn-additem:hover{background:var(--mn-hover)}',
      '#' + OVERLAY_ID + ' .mn-additem.mn-disabled{opacity:.35;cursor:not-allowed}',
      '#' + OVERLAY_ID + ' .mn-additem.mn-disabled:hover{background:transparent}',
      '#' + OVERLAY_ID + ' .mn-additem .mn-ico{width:26px;height:26px;flex:none;display:flex;align-items:center;justify-content:center;',
        'border-radius:6px;font-size:13px;color:#fff}',
      '#' + OVERLAY_ID + ' .mn-additem .mn-lbl{font:500 9px/1.2 system-ui;color:var(--mn-text);text-align:center;white-space:nowrap;',
        'overflow:hidden;text-overflow:ellipsis;max-width:100%}',
      '#' + OVERLAY_ID + ' .mn-empty-hint{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;',
        'color:#5a5866;font:500 13px/1.6 system-ui;text-align:center;pointer-events:none}',
      '#' + OVERLAY_ID + ' input,#' + OVERLAY_ID + ' textarea{caret-color:var(--mn-text)}',
      '#' + OVERLAY_ID + ' input::placeholder,#' + OVERLAY_ID + ' textarea::placeholder{color:var(--mn-muted);opacity:1}',
      // Card placeholders are hint text only, so they render smaller than the card's
      // own type size (fixed size, not em-based, so every card matches).
      '#' + OVERLAY_ID + ' .mn-card input::placeholder,#' + OVERLAY_ID + ' .mn-card textarea::placeholder{',
        'font-size:var(--mn-ph-size,12px);line-height:1.45}',
      '#' + OVERLAY_ID + ' input::selection,#' + OVERLAY_ID + ' textarea::selection{background:#45637d;color:#fff}',
      '#' + OVERLAY_ID + ' button:focus-visible{outline:2px solid var(--mn-link);outline-offset:2px}',
      '#' + OVERLAY_ID + ' .mn-card input:focus-visible{box-shadow:inset 0 -1px var(--mn-link)}',
      '#' + OVERLAY_ID + ' .mn-card:hover{box-shadow:0 2px 5px rgba(0,0,0,.45),0 0 0 1px #585858}',
      '#' + OVERLAY_ID + ' .mn-table tr:first-child{background:#3b3b3b}',
      '#' + OVERLAY_ID + ' .mn-table-input:focus{background:var(--mn-hover)}',
      '#' + OVERLAY_ID + ' .mn-link,#' + OVERLAY_ID + ' .mn-media,#' + OVERLAY_ID + ' .mn-upload,#' + OVERLAY_ID + ' .mn-board{box-sizing:border-box}',
      '#' + OVERLAY_ID + ' .mn-card-column,#' + OVERLAY_ID + ' .mn-card-column.mn-dragging{box-shadow:none}',
      // 🔴 改动 2026-09-17 · Column 内待办卡片与 Note 共用扁平边框，取消阴影
      '#' + OVERLAY_ID + ' .mn-card-note.mn-in-column,#' + OVERLAY_ID + ' .mn-card-todo.mn-in-column{background:#333;border:1px solid #484848;border-radius:0;box-shadow:none}',
      '#' + OVERLAY_ID + ' .mn-rail-item-label{font-size:10px}',
      '#' + OVERLAY_ID + ' .mn-card svg,#' + OVERLAY_ID + ' .mn-rail svg{width:22px;height:22px;flex:none;pointer-events:none}',
      '#' + OVERLAY_ID + ' .mn-media-el{color-scheme:dark;background:#242424}',
      '#' + OVERLAY_ID + ' .mn-media-img{background:var(--mn-column)}',
      '#' + OVERLAY_ID + ' .mn-media-ph{min-height:72px;display:flex;align-items:center;justify-content:center;gap:10px;box-sizing:border-box}',
      '#' + OVERLAY_ID + ' .mn-document-head,#' + OVERLAY_ID + ' .mn-comment-head{display:flex;align-items:center;gap:6px}',
      '#' + OVERLAY_ID + ' .mn-document-head svg,#' + OVERLAY_ID + ' .mn-comment-head svg{width:14px;height:14px}',
      '#' + OVERLAY_ID + ' .mn-rail .mn-rail-item-icon svg,#' + OVERLAY_ID + ' .mn-component-item .mn-rail-item-icon svg{width:22px;height:22px}',
      '#' + OVERLAY_ID + ' .mn-rail-item[data-type="line"] .mn-rail-item-icon,#' + OVERLAY_ID + ' .mn-component-item[data-type="line"] .mn-rail-item-icon{background:none;box-shadow:none}',
      '#' + OVERLAY_ID + ' .mn-rail-item[data-type="board"] .mn-rail-item-icon,#' + OVERLAY_ID + ' .mn-component-item[data-type="board"] .mn-rail-item-icon{background:#4c80ed;border-radius:6px;color:#dce7ff;height:30px}',
      '#' + OVERLAY_ID + ' .mn-rail-item[data-type="comment"] .mn-rail-item-icon,#' + OVERLAY_ID + ' .mn-component-item[data-type="comment"] .mn-rail-item-icon{color:#91b8ec}',
      '#' + OVERLAY_ID + ' .mn-rail-item[data-type="column"] .mn-rail-item-icon,#' + OVERLAY_ID + ' .mn-component-item[data-type="column"] .mn-rail-item-icon{color:#777}',
      '#' + OVERLAY_ID + ' .mn-rail-trash{margin-top:8px;height:52px;cursor:pointer}',
      '#' + OVERLAY_ID + ' .mn-rail-trash .mn-rail-item-icon{background:none;box-shadow:none;color:#777}',
      // 🔴 改动 2026-09-19 · sync（推送到 GitHub）拆分为独立子模块 lib/client-modules/sync.js（方案A 首块样板）
      // ↳ 改前[css]: 此处内联 .mn-push-*/.mn-preview-*/.mn-diff-* 全部样式（约 87 行）
      // ↳ 改后[css]: 样式随 sync 模块自带注入（style#dsh-evoloop-sync-css，自愈覆盖）
      // Re-center full-viewport centered overlays inside the visible conversation
      // area (sidebar right edge -> evoloop panel left edge) instead of the whole
      // viewport, so the evoloop panel on the right never hides them. Two paths:
      //   • DSH's own Modal (role-based, applies immediately);
      //   • any other fixed/centered overlay (plugin market, future plugins) is
      //     tagged with [data-evoloop-clear] by scanAndTagOverlays().
      // The two CSS variables are set by layoutDshModalRegion().
      '[role="presentation"]:has(> [role="dialog"][aria-modal="true"]),',
      '[data-evoloop-clear="1"]{',
      'left:var(--dsh-modal-left,0px)!important;right:var(--dsh-modal-right,0px)!important}',
      // 🔴 改动 2026-09-19 · 删除 Evoloop (2.0) 面板全部 CSS；版本下拉从 select 改为自定义弹层（当前版本 + Update 按钮）
      // ↳ 改前[css]: .mn-version-select{...} + .mn-evoloop-* 面板约 29 条规则
      // ↳ 改后[css]: .mn-version-btn / .mn-version-menu / .mn-version-row / .mn-version-status
      // 🔴 改动 2026-09-21 · 版本下拉拆分为子模块 lib/client-modules/version-menu.js
      // ↳ 改前[css]: 此处内联 .mn-version* 样式（11 行）  改后[css]: 样式随模块自带注入
    ].join('')

    // 🔴 改动 2026-09-19 · 样式注入自愈：style 元素已存在时比对内容并更新，
    // 修复 SPA 热重载后新 JS 配旧 CSS（版本下拉菜单平铺在顶栏）的问题
    // ↳ 改前[js]: if (!style) { 创建并注入 } —— 已存在则跳过，旧 CSS 永不更新
    // ↳ 改后[js]: 已存在且内容不同则覆盖 textContent
    function injectStyles() {
      var style = document.getElementById(CSS_ID)
      if (!style) {
        style = document.createElement('style')
        style.id = CSS_ID
        style.setAttribute('data-plugin-css', '1')
        document.head.appendChild(style)
      }
      if (style.textContent !== CSS) style.textContent = CSS
    }

    // ---------------------------------------------------------------------
    // Host transport (persistence)
    // ---------------------------------------------------------------------
    var host = {
      load: function () {
        // 🔴 改动 2026-10-02 · 加载带上会话工作区（自定义头，不影响路由匹配）：
        // 保存一直写 DSH_WORKSPACE，读取却猜注册表最近工作区——不对称会导致读到别处的空板
        var loadHeaders = {}
        if (typeof window !== 'undefined' && window.DSH_WORKSPACE) loadHeaders['x-evoloop-workspace'] = String(window.DSH_WORKSPACE)
        return fetch(ROUTE, { method: 'GET', headers: loadHeaders })
          .then(function (r) { return r.json() })
          .then(function (j) { if (!j.ok) throw new Error((j.error && j.error.message) || t('读取画板失败')); return j.value.board })
      },
      save: function (board, workspace) {
        return fetch(ROUTE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workspace: workspace, board: board }),
        }).then(function (r) { return r.json() }).then(function (j) {
          if (!j.ok) throw new Error((j.error && j.error.message) || t('保存画板失败'))
          return j.value
        })
      },
      gitHead: function () {
        return fetch(GIT_HEAD_ROUTE, { method: 'GET' })
          .then(function (r) { return r.json() })
          .then(function (j) { if (!j.ok) throw new Error((j.error && j.error.message) || t('读取已推送版本失败')); return j.value })
      },
      push: function (board, workspace, remote, branch) {
        return fetch(PUSH_ROUTE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workspace: workspace, board: board, remote: remote, branch: branch }),
        }).then(function (r) { return r.json() }).then(function (j) {
          if (!j.ok) throw new Error((j.error && j.error.message) || t('推送失败'))
          return j.value
        })
      },
    }

    // ---------------------------------------------------------------------
    // Board app
    // ---------------------------------------------------------------------
    function emptyBoard() {
      return { title: t('我的画板'), viewport: { x: 0, y: 0, zoom: 1 }, cards: [], lines: [] }
    }

    // ---- remembered panel width -------------------------------------------
    // The width the user drags on the panel's left edge is remembered per device
    // (stored the same way as the language choice), so closing the panel and
    // reopening it restores exactly the same canvas size.
    var PANEL_WIDTH_KEY = 'evoloop.panelWidth'
    // 🔴 改动 2026-09-24 · 按工作区记忆展开状态及视图，刷新/重启后自动恢复
    var SESSION_STATE_KEY = 'evoloop.sessionState:'
    function readSessionState(key) {
      try {
        var state = JSON.parse(window.localStorage.getItem(key) || 'null')
        return state && typeof state === 'object' && !Array.isArray(state) ? state : {}
      } catch (e) { return {} }
    }
    function validViewport(view) {
      return view && Number.isFinite(view.x) && Number.isFinite(view.y) &&
        Number.isFinite(view.zoom) && view.zoom >= 0.25 && view.zoom <= 3
    }
    var PANEL_WIDTH_DEFAULT = 480
    var PANEL_WIDTH_MIN = 100   // below this a drag means "collapse the panel"
    function readStoredPanelWidth() {
      try {
        var v = parseInt(window.localStorage.getItem(PANEL_WIDTH_KEY), 10)
        if (!isNaN(v) && v >= PANEL_WIDTH_MIN) return v
      } catch (e) { /* storage unavailable → fall back to the default */ }
      return PANEL_WIDTH_DEFAULT
    }
    function storePanelWidth(w) {
      try { window.localStorage.setItem(PANEL_WIDTH_KEY, String(Math.round(w))) } catch (e) { /* best effort */ }
    }

    // Minimum width/height per card type (Evoloop-style hug-contents cards:
    // each card starts at these minimums and grows to fit its content, with no
    // maximum — the user can also drag-resize to any size).
    var CARD_MIN = {
      note: { w: 180, h: 60 },
      link: { w: 200, h: 48 },
      todo: { w: 240, h: 96 },
      workflow: { w: 240, h: 138 },
      // The free board is raised to 116px by layoutColumns; the 92px minimum
      // allows the compact horizontal version inside a column to stay exact.
      board: { w: 140, h: 92 },
      column: { w: 264, h: 144 },
      comment: { w: 200, h: 60 },
      table: { w: 220, h: 60 },
      sketch: { w: 160, h: 120 },
      color: { w: 90, h: 90 },
      document: { w: 240, h: 120 },
      audio: { w: 200, h: 48 },
      map: { w: 200, h: 120 },
      video: { w: 240, h: 140 },
      image: { w: 160, h: 120 },
      upload: { w: 200, h: 48 },
      draw: { w: 160, h: 120 },
    }
    function cardMin(type) {
      return CARD_MIN[type] || { w: 180, h: 60 }
    }

// BEGIN GENERATED WORKFLOW CODEC
// Lossless n8n <-> Evoloop document mapping. No engine code runs in the browser.
function importWorkflow(doc, makeId) {
  if (!doc || !Array.isArray(doc.nodes) || !doc.nodes.length) throw new Error('工作流必须包含节点');
  const names = new Map();
  const cards = doc.nodes.map(n => {
    if (!n || typeof n.name !== 'string' || !n.name || typeof n.type !== 'string' || names.has(n.name)) throw new Error('节点名称必须非空且唯一，并包含类型');
    const id = makeId(); names.set(n.name, id);
    const p = n.position || [0, 0];
    if (!Array.isArray(p) || p.length !== 2 || !p.every(Number.isFinite)) throw new Error('节点位置无效');
    return { id, type: 'workflow', x: p[0], y: p[1], w: 240, h: 138, text: n.name, meta: { n8n: structuredClone(n) } };
  });
  const lines = [];
  for (const [source, groups] of Object.entries(doc.connections || {})) {
    if (!names.has(source) || !groups || typeof groups !== 'object') throw new Error('连线源节点不存在');
    for (const [channel, ports] of Object.entries(groups)) {
      if (!Array.isArray(ports)) throw new Error('输出端口格式无效');
      ports.forEach((edges, output) => {
        if (!Array.isArray(edges)) throw new Error('连线格式无效');
        edges.forEach(edge => {
          if (!names.has(edge.node) || !Number.isInteger(edge.index) || edge.index < 0) throw new Error('连线目标或输入端口无效');
          lines.push({ id: makeId(), from: names.get(source), to: names.get(edge.node), workflow: true, channel, output, input: edge.index, targetType: edge.type || channel });
        });
      });
    }
  }
  const template = structuredClone(doc); delete template.nodes; delete template.connections;
  return { cards, lines, template };
}

function exportWorkflow(board) {
  const cards = board.cards.filter(c => c.type === 'workflow');
  if (!cards.length) throw new Error('请先添加工作流节点');
  const byId = new Map(cards.map(c => [c.id, c]));
  const names = new Set();
  const nodes = cards.map(c => {
    const n = structuredClone(c.meta.n8n);
    if (!n || !n.name || names.has(n.name)) throw new Error('节点名称必须非空且唯一');
    names.add(n.name); n.position = [c.x, c.y];
    return n;
  });
  const connections = Object.create(null);
  for (const line of board.lines || []) {
    if (!line.workflow) continue;
    const a = byId.get(line.from), b = byId.get(line.to);
    if (!a || !b) throw new Error('工作流连线包含不存在的节点');
    const channel = line.channel || 'main', output = line.output || 0;
    const source = connections[a.meta.n8n.name] ||= Object.create(null);
    const ports = source[channel] ||= [];
    while (ports.length <= output) ports.push([]);
    ports[output].push({ node: b.meta.n8n.name, type: line.targetType || channel, index: line.input || 0 });
  }
  return { ...(structuredClone(board.workflowTemplate || {})), name: board.workflowTemplate?.name || board.title || 'Evoloop workflow', nodes, connections, active: false };
}

// END GENERATED WORKFLOW CODEC
    function createApp(opts) {
      opts = opts || {}
      var board = opts.board || emptyBoard()
      var isSub = !!opts.board
      var panelOpen = false
      var childApp = null
      var disposed = false
      // Persistence safety: the in-memory `board` starts as an EMPTY default and is
      // only filled in once the host responds. Writing/pushing before that would
      // store (and push) an empty board over the real one — so a save is allowed
      // only after the doc was loaded, or after the user actually changed something.
      // Sub-boards receive their doc synchronously via opts.board → already loaded.
      var boardLoaded = isSub
      var boardDirty = false
      var undoSteps = [], redoSteps = [], historyCurrent = null
      var historyPending = false, historyRestoring = false
      var HISTORY_LIMIT = 50
      function historySnapshot() {
        var copy = Object.assign({}, board)
        delete copy.viewport
        return JSON.stringify(copy)
      }
      function updateHistoryButtons() {
        if (!root) return
        var undo = root.querySelector('.mn-undo'), redo = root.querySelector('.mn-redo')
        if (undo) undo.disabled = !undoSteps.length
        if (redo) redo.disabled = !redoSteps.length
      }
      function resetHistory() {
        var next = historySnapshot()
        if (historyCurrent !== next) { undoSteps = []; redoSteps = [] }
        historyCurrent = next
        updateHistoryButtons()
      }
      function recordHistory() {
        historyPending = false
        if (historyRestoring) return
        var next = historySnapshot()
        if (historyCurrent !== null && next !== historyCurrent) {
          undoSteps.push(historyCurrent)
          if (undoSteps.length > HISTORY_LIMIT) undoSteps.shift()
          redoSteps = []
        }
        historyCurrent = next
        updateHistoryButtons()
      }
      function restoreHistory(redo) {
        if (childApp || historyRestoring) return
        if (historyPending) recordHistory()
        var source = redo ? redoSteps : undoSteps, target = redo ? undoSteps : redoSteps
        if (!source.length) return
        var active = document.activeElement, focusInfo = null
        if (active && root.contains(active)) {
          var owner = active.closest('.mn-card')
          if (owner && /^(INPUT|TEXTAREA)$/.test(active.tagName)) {
            focusInfo = { id: owner.dataset.id, index: Array.prototype.indexOf.call(owner.querySelectorAll('input,textarea'), active), start: active.selectionStart }
          }
        }
        target.push(historyCurrent)
        if (target.length > HISTORY_LIMIT) target.shift()
        var value = JSON.parse(source.pop())
        historyRestoring = true
        blurEditing(); selectedIds = {}; connectMode = false; connectFrom = null
        Object.keys(board).forEach(function (key) { if (key !== 'viewport') delete board[key] })
        Object.assign(board, value)
        reRender(); renderLines(); applyViewport()
        var title = root.querySelector('.mn-title'); if (title) title.value = board.title
        historyCurrent = historySnapshot()
        historyRestoring = false
        boardDirty = true; queueSave(); updateHistoryButtons()
        root.focus({ preventScroll: true })
        if (focusInfo && cardEls[focusInfo.id]) {
          var node = cardEls[focusInfo.id], field = node.querySelectorAll('input,textarea')[focusInfo.index]
          if (field) {
            editingId = focusInfo.id; node.classList.add('mn-editing'); field.focus()
            if (typeof field.setSelectionRange === 'function' && focusInfo.start !== null) {
              try { field.setSelectionRange(Math.min(focusInfo.start, field.value.length), Math.min(focusInfo.start, field.value.length)) } catch (e) {}
            }
          }
        }
      }
      function onHistoryKey(e) {
        // 🔴 改动 2026-09-19 · 移除 version!=='1.0' 判断（版本切换已删，只剩画板）
        // ↳ 改前[js]: if (!panelOpen || childApp || version !== '1.0' || e.isComposing || ...) return
        // ↳ 改后[js]: if (!panelOpen || childApp || e.isComposing || ...) return
        if (!panelOpen || childApp || e.isComposing || !e.ctrlKey || e.metaKey || e.shiftKey || String(e.key).toLowerCase() !== 'z') return
        var target = e.target
        if (target && target !== document.body && target !== document.documentElement && !root.contains(target)) return
        // Unsaved dialog fields retain native text undo; a parent never handles a child board.
        if (target && target.closest && (target.closest('.mn-wf-shade') || (!isSub && target.closest('.' + MODAL_CLASS)))) return
        e.preventDefault(); e.stopPropagation()
        restoreHistory(e.altKey)
      }
      var selectedIds = {}   // multi-select set: cardId -> true
      var editingId = null
      var saveTimer = null
      var root = null
      var worldEl = null
      var gridEl = null
      var bodyEl = null
      var marqueeEl = null
      var scrollbarVEl = null
      var scrollbarHEl = null
      var scrollbarVThumb = null
      var scrollbarHThumb = null
      var addMenuEl = null
      var cardEls = {}
      var collapseTab = null
      // Remembered panel width (the size the user drags on the panel's left edge).
      // Device-local UI preference, stored like the language choice, so closing and
      // reopening the panel restores the exact same canvas size.
      var panelWidth = isSub ? PANEL_WIDTH_DEFAULT : readStoredPanelWidth()
      var workspace = (typeof window !== 'undefined' && window.DSH_WORKSPACE) ? String(window.DSH_WORKSPACE) : undefined
      var sessionKey = SESSION_STATE_KEY + (workspace || 'default')
      var sessionState = isSub ? {} : readSessionState(sessionKey)
      var viewChangedBeforeLoad = false
      if (!isSub && validViewport(sessionState.viewport)) {
        board.viewport = Object.assign({}, sessionState.viewport)
      }
      function rememberSession() {
        if (isSub || disposed) return
        sessionState.open = panelOpen
        if ((boardLoaded || viewChangedBeforeLoad) && validViewport(board.viewport)) {
          sessionState.viewport = { x: board.viewport.x, y: board.viewport.y, zoom: board.viewport.zoom }
        }
        try { window.localStorage.setItem(sessionKey, JSON.stringify(sessionState)) } catch (e) { /* storage unavailable */ }
        if (panelWidth >= PANEL_WIDTH_MIN) storePanelWidth(panelWidth)
      }
      // Page exit is not an explicit close: preserve the expanded state.
      if (!isSub) window.addEventListener('pagehide', rememberSession)

      // ---- client sub-module loader（方案A：注册表模式）----------------------
      // 🔴 改动 2026-09-19 · 新增子模块加载器：client.js 拆分出去的模块（如 sync）经
      // 后端 /_dsh/evoloop/module/<name>.js 路由分发；模块文件只往 window.__EVOLOOP__
      // 注册工厂，这里用依赖注入实例化。测试/预加载场景注册表已就绪时走同步快路径。
      // ↳ 改前: （无，全部功能内联在 client.js）
      // ↳ 改后[js]: getClientModule / ensureClientModule / clientModuleDeps
      var clientModuleCache = {}
      function clientModuleDeps() {
        return {
          el: el, elNS: elNS, t: t,
          colorForType: colorForType, contentIcon: contentIcon,
          typeLabel: typeLabel, cardLabel: cardLabel,
          api: host, emptyBoard: emptyBoard,
          // 🔴 改动 2026-09-21 · version-menu 子模块所需依赖
          overlayId: OVERLAY_ID, versionLabel: PLUGIN_VERSION_LABEL,
          updateCheckRoute: UPDATE_CHECK_ROUTE, updateApplyRoute: UPDATE_APPLY_ROUTE,
          // 🔴 改动 2026-10-02 · project-menu 子模块所需依赖
          openBoardRoute: OPEN_ROUTE, loadBoard: loadBoard,
          // 🔴 改动 2026-09-21 · process-dock 子模块所需依赖
          getBodyEl: function () { return bodyEl },
          scheduleSave: scheduleSave, burstAtInto: burstAtInto,
          // 🔴 改动 2026-09-21 · todo 卡片子模块所需依赖 + 兄弟模块取用器
          cardMin: cardMin, updateScrollbars: updateScrollbars,
          columnFor: columnFor, measureOneLine: measureOneLine,
          getModule: getClientModule,
          // 🔴 改动 2026-09-21 · cards-basic 子模块所需依赖
          fitTextCard: fitTextCard, startEdit: startEdit, stopEdit: stopEdit,
          setEditingId: function (id) { editingId = id },
          getBoard: function () { return board },
          getWorkspace: function () { return workspace },
          // 🔴 改动 2026-09-25 · cards-workflow 子模块所需依赖
          uid: uid, getRootEl: function () { return root },
          createCard: createCard, renderCard: renderCard,
          renderLines: renderLines, reRender: reRender,
          applyViewport: applyViewport, openN8n: openN8n,
          importWorkflow: importWorkflow, exportWorkflow: exportWorkflow,
        }
      }
      // 同步获取：注册表已有该模块时立即实例化并缓存；否则返回 null
      function getClientModule(name) {
        if (clientModuleCache[name]) return clientModuleCache[name]
        var registry = window.__EVOLOOP__
        if (!registry || typeof registry[name] !== 'function') return null
        clientModuleCache[name] = registry[name](clientModuleDeps())
        return clientModuleCache[name]
      }
      // 异步确保：先查注册表；没有就从后端路由拉脚本，加载后实例化
      function ensureClientModule(name) {
        var m = getClientModule(name)
        if (m) return Promise.resolve(m)
        return new Promise(function (resolve, reject) {
          var s = document.createElement('script')
          s.src = '/_dsh/evoloop/module/' + encodeURIComponent(name) + '.js'
          s.onload = function () {
            var mod = getClientModule(name)
            if (mod) resolve(mod)
            else reject(new Error('模块已加载但未注册: ' + name))
          }
          s.onerror = function () { reject(new Error('模块加载失败: ' + name)) }
          document.head.appendChild(s)
        })
      }

      // 进程条调用包装：经 process-dock 子模块 API（模块未就绪时静默跳过）
      // 🔴 改动 2026-09-21 · spawn/cancel 改走模块
      // ↳ 改前[js]: spawnProcessMission/cancelProcessMission 直接调内联函数
      // ↳ 改后[js]: dockSpawn/dockCancel → getClientModule('process-dock')
      function dockSpawn(opts) { var d = getClientModule('process-dock'); return d && d.spawn(opts) }
      function dockCancel(entry) { var d = getClientModule('process-dock'); if (d) d.cancel(entry) }
      // 🔴 改动 2026-09-25 · 工作流连线编辑改走 cards-workflow 子模块（模块未就绪时静默跳过）
      // ↳ 改前[js]: editWorkflowLine(line) 直接调内联函数  改后[js]: wfEditLine → getClientModule('cards-workflow')
      function wfEditLine(line) { var m = getClientModule('cards-workflow'); if (m) m.editWorkflowLine(line) }

      // ---- collapse tab (panel shrinks to a small Evoloop icon at the edge) ----
      // Only the MAIN panel collapses to an edge tab. A sub-board is a modal opened
      // from the main panel, so it must never create its own tab: doing so used to
      // leave a stray blue "Evoloop" tab on screen while the main panel was open.
      function ensureCollapseTab() {
        if (isSub) return null
        if (collapseTab) return collapseTab
        collapseTab = el('button', {
          id: 'dsh-evoloop-tab',
          class: 'dsh-mn-collapse-tab',
          title: t('展开 Evoloop 画布'),
          type: 'button',
          onclick: function () { open() },
        }, [
          // 🔴 改动 2026-09-19 · 折叠条图标字母 B → E（插件改名 Evoloop）
          // ↳ 改前: ['B']  改后: ['E']
          el('span', { class: 'dsh-mn-tab-ico' }, ['E']),
          el('span', { class: 'dsh-mn-tab-txt' }, ['Evoloop']),
        ])
        ;(document.documentElement || document.body).appendChild(collapseTab)
        return collapseTab
      }
      // Hide EVERY collapse tab in the document, not just this instance's own, so a
      // stray/legacy tab can never stay visible on top of an open panel.
      function hideCollapseTab() {
        if (collapseTab) collapseTab.classList.remove('mn-visible')
        var nodes = document.querySelectorAll('.dsh-mn-collapse-tab')
        for (var i = 0; i < nodes.length; i++) nodes[i].classList.remove('mn-visible')
      }
      function showCollapseTab() {
        if (isSub) return
        var tab = ensureCollapseTab()
        if (tab) tab.classList.add('mn-visible')
      }

      // ---- responsive push: the panel reserves space, so the conversation area
      //      reflows to the LEFT (shrinks) until it reaches a minimum width. ----
      var CONV_MIN_WIDTH = 420
      function conversationRoot() {
        // The conversation root class is stable in this build; fall back to a
        // lookup by the composer's ancestor chain.
        var c = document.querySelector('[class*="wSkVaW_root"]')
        if (c) return c
        var ta = document.querySelector('textarea')
        var n = ta
        while (n) {
          if (n.className && String(n.className).indexOf('_root') >= 0) return n
          n = n.parentElement || null
        }
        return null
      }
      // Largest panel the window can host while keeping the conversation usable.
      function maxPanelWidth() {
        var SIDEBAR_EST = 240
        return Math.max(280, window.innerWidth - SIDEBAR_EST - CONV_MIN_WIDTH)
      }
      function applyResponsivePush() {
        if (!root || !panelOpen) return
        if (isSub) {
          root.style.width = (opts.parentWidth ? opts.parentWidth() : Math.min(panelWidth, maxPanelWidth())) + 'px'
          return
        }
        // Base the layout on the REMEMBERED width (the user's intent), never on the
        // currently applied width — otherwise a one-off clamp on a narrow window
        // would permanently shrink the panel.
        var w = Math.min(panelWidth || PANEL_WIDTH_DEFAULT, maxPanelWidth())
        root.style.width = w + 'px'
        // Reserve room for the panel on the conversation area's right, when the
        // conversation root is present in this build.
        var conv = conversationRoot()
        if (conv) conv.style.marginRight = w + 'px'
        layoutDshModalRegion()
      }
      function clearResponsivePush() {
        if (isSub) return
        var conv = conversationRoot()
        if (conv) conv.style.marginRight = ''
        layoutDshModalRegion()
      }

      // ---- keep DSH dialogs clear of the evoloop panel ----
      // DSH centers its Modal overlays on the whole viewport; when the evoloop
      // panel is open on the right (with a far higher z-index) those dialogs are
      // hidden underneath it. Expose the visible conversation area as CSS
      // variables so the injected rule above re-centers the dialog inside it:
      //   --dsh-modal-left  = sidebar right edge (conversation root's left)
      //   --dsh-modal-right = evoloop panel width (0 when closed/collapsed)
      function layoutDshModalRegion() {
        if (isSub) return
        var left = 0
        var conv = conversationRoot()
        if (conv) {
          var cr = conv.getBoundingClientRect()
          if (cr.width > 0) left = Math.round(cr.left)
        }
        var right = 0
        if (root && panelOpen && !isSub) {
          var pr = root.getBoundingClientRect()
          if (pr.width > 0) right = Math.round(pr.width)
        }
        var html = document.documentElement
        if (html) {
          html.style.setProperty('--dsh-modal-left', left + 'px')
          html.style.setProperty('--dsh-modal-right', right + 'px')
        }
      }

      // ---- general overlay re-centering (any fixed full-viewport popup) ----
      // DSH's own Modal is handled by the role-based CSS rule above, but other
      // plugins (e.g. the plugin market) render their own centered fixed overlays
      // with hashed class names. Detect them structurally and tag them with
      // [data-evoloop-clear], which the injected rule re-centers via the same CSS
      // variables. The scan only walks plausible overlay hosts (direct children of
      // <body> plus the shell.overlay subtree), so it stays cheap.
      function scanAndTagOverlays() {
        var prev = document.querySelectorAll('[data-evoloop-clear]')
        for (var i = 0; i < prev.length; i++) prev[i].removeAttribute('data-evoloop-clear')

        var candidates = []
        var body = document.body
        if (body) {
          var kids = body.children
          for (var j = 0; j < kids.length; j++) candidates.push(kids[j])
        }
        var shells = document.querySelectorAll('[data-shell-overlay]')
        for (var s = 0; s < shells.length; s++) {
          var shell = shells[s]
          candidates.push(shell)
          var desc = shell.querySelectorAll('*')
          for (var d = 0; d < desc.length; d++) candidates.push(desc[d])
        }

        var vw = window.innerWidth
        var vh = window.innerHeight
        for (var k = 0; k < candidates.length; k++) {
          var el = candidates[k]
          if (el.id === OVERLAY_ID || el.id === 'dsh-evoloop-tab') continue
          var cs = window.getComputedStyle(el)
          if (cs.position !== 'fixed') continue
          if (cs.display !== 'flex') continue
          if (cs.justifyContent !== 'center') continue
          var r = el.getBoundingClientRect()
          if (r.width < vw * 0.85 || r.height < vh * 0.85) continue
          var z = parseInt(cs.zIndex, 10)
          if (!isFinite(z)) z = 0
          if (z >= 1000000) continue
          el.setAttribute('data-evoloop-clear', '1')
        }
      }

      var overlayScanPending = false
      function scheduleOverlayScan() {
        if (overlayScanPending) return
        overlayScanPending = true
        if (typeof requestAnimationFrame === 'function') {
          requestAnimationFrame(function () {
            overlayScanPending = false
            try { scanAndTagOverlays() } catch (e) { reportDiag('error', 'scanOverlays: ' + (e && (e.stack || e.message) || e)) }
          })
        } else {
          overlayScanPending = false
          try { scanAndTagOverlays() } catch (e) { reportDiag('error', 'scanOverlays: ' + (e && (e.stack || e.message) || e)) }
        }
      }

      var overlayObserver = null
      function ensureOverlayObserver() {
        if (overlayObserver) return
        overlayObserver = new MutationObserver(function (muts) {
          if (!panelOpen) return
          var hasNodes = false
          for (var i = 0; i < muts.length; i++) {
            if (muts[i].addedNodes.length || muts[i].removedNodes.length) { hasNodes = true; break }
          }
          if (hasNodes) scheduleOverlayScan()
        })
        overlayObserver.observe(document.documentElement, { childList: true, subtree: true })
      }
      function teardownOverlayObserver() {
        if (overlayObserver) { overlayObserver.disconnect(); overlayObserver = null }
        overlayScanPending = false
      }

      // Re-apply the push whenever the DSH app re-renders the conversation area,
      // so a React remount never leaves the panel overlapping the content.
      var convObserver = null
      var convObserverTimer = null
      function ensureConvObserver() {
        if (convObserver) return
        convObserver = new MutationObserver(function () {
          if (!panelOpen) return
          clearTimeout(convObserverTimer)
          convObserverTimer = setTimeout(function () {
            try { applyResponsivePush() } catch (e) { reportDiag('error', 'applyResponsivePush: ' + (e && (e.stack || e.message) || e)) }
          }, 60)
        })
        convObserver.observe(document.documentElement, { childList: true, subtree: true, attributes: true })
      }
      function teardownConvObserver() {
        if (convObserver) { convObserver.disconnect(); convObserver = null }
        clearTimeout(convObserverTimer)
      }
      function onResizePush() { if (panelOpen) applyResponsivePush(); else layoutDshModalRegion() }

      // ---- persistence ----
      // scheduleSave() marks the board dirty: it is only called for real CONTENT
      // changes (edit / move / resize / create / delete / title), so it makes the
      // board safe to persist even if the initial load never completed.
      function scheduleSave() {
        boardDirty = true
        queueSave()
        if (!historyRestoring && !historyPending) {
          historyPending = true
          Promise.resolve().then(function () { if (historyPending) recordHistory() })
        }
      }
      // View-only changes (zoom / scrollbar / fit) carry no content. They must NOT
      // mark the board dirty: persisting them before the load lands would still
      // replace the stored board with the empty default.
      function scheduleViewSave() {
        viewChangedBeforeLoad = true
        rememberSession()
        queueSave()
      }
      function queueSave() {
        if (!draggingCards) layoutColumns()
        clearTimeout(saveTimer)
        saveTimer = setTimeout(function () { persist() }, 700)
      }
      // True once it is safe to write: the doc was loaded, or the user changed it.
      function canPersist() { return boardLoaded || boardDirty }
      function persist() {
        if (opts.save) {
          try { opts.save(board) } catch (e) {}
          return
        }
        if (!canPersist()) return
        host.save(board, workspace).then(function () {
        }).catch(function (e) {
          console.warn('[evoloop] save failed:', e)
        })
      }
      // On close: write the board AND push to GitHub immediately (autosave
      // debounces, but closing the panel should flush right away). Empty
      // remote/branch keeps whatever git.json already has configured.
      function flushAndPush() {
        if (opts.save) {
          try { opts.save(board) } catch (e) {}
          return
        }
        // Never push a board that was never loaded (and never edited): that would
        // replace the stored board with the empty default.
        if (!canPersist()) return
        host.push(board, workspace, '', '').then(function () {
        }).catch(function (e) {
          console.warn('[evoloop] push-on-close failed:', e)
          // Fall back to a plain save so the board is still persisted locally.
          host.save(board, workspace).catch(function (e2) {
            console.warn('[evoloop] save failed:', e2)
          })
        })
      }

      // ---- canvas transforms ----
      function applyViewport() {
        if (!worldEl) return
        worldEl.style.transform = 'translate(' + board.viewport.x + 'px,' + board.viewport.y + 'px) scale(' + board.viewport.zoom + ')'
        if (gridEl) {
          // n8n-style 16-unit grid, anchored to world origin at every zoom.
          var gap = 16 * board.viewport.zoom
          var radius = 0.5 * board.viewport.zoom
          gridEl.style.backgroundSize = gap + 'px ' + gap + 'px'
          // Dots are shifted 8px further to the LEFT than the plain half-cell
          // anchor (a fixed screen-space offset, so it reads the same at any zoom).
          gridEl.style.backgroundPosition = (board.viewport.x - gap / 2 - 8) + 'px ' + (board.viewport.y - gap / 2) + 'px'
          gridEl.style.setProperty('--mn-dot-radius', radius + 'px')
          gridEl.style.setProperty('--mn-dot-edge', (radius + 0.15) + 'px')
        }
        updateScrollbars()
      }
      function screenToWorld(sx, sy) {
        // Relative to the body element origin.
        var rect = bodyEl.getBoundingClientRect()
        var vx = sx - rect.left
        var vy = sy - rect.top
        return {
          x: (vx - board.viewport.x) / board.viewport.zoom,
          y: (vy - board.viewport.y) / board.viewport.zoom,
        }
      }

      // ---- content bounds + scrollbars ----
      function contentBounds() {
        // Union of card bounding boxes in world coordinates, plus a small margin.
        var PAD = 60
        if (!board.cards.length) return { x: -PAD, y: -PAD, w: 0, h: 0 }
        var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
        board.cards.forEach(function (c) {
          var w = c.w || 240, h = c.h || 150
          if (c.x < minX) minX = c.x
          if (c.y < minY) minY = c.y
          if (c.x + w > maxX) maxX = c.x + w
          if (c.y + h > maxY) maxY = c.y + h
        })
        return { x: minX - PAD, y: minY - PAD, w: (maxX - minX) + PAD * 2, h: (maxY - minY) + PAD * 2 }
      }
      // Scrollable extent and whether content overflows the viewport, measured
      // in SCREEN space against the current viewport window (position-aware):
      // a scrollbar shows whenever the content's on-screen bounding box is not
      // fully contained by the viewport, i.e. it sticks out past any edge.
      function scrollMetrics() {
        var rect = bodyEl.getBoundingClientRect()
        var vw = rect.width, vh = rect.height
        var b = contentBounds()
        var z = board.viewport.zoom
        var cw = b.w * z, ch = b.h * z
        var cx = board.viewport.x + b.x * z   // content box left on screen
        var cy = board.viewport.y + b.y * z   // content box top on screen

        // Allowed range of the content box's top/left so the box stays reachable.
        var minCy = Math.min(0, vh - ch)      // content top at viewport bottom
        var maxCy = Math.max(0, vh - ch)      // content top at viewport top
        var minCx = Math.min(0, vw - cw)
        var maxCx = Math.max(0, vw - cw)

        var showV = ch > vh || cy < minCy || cy > maxCy
        var showH = cw > vw || cx < minCx || cx > maxCx
        // Scroll fraction: 0 = content at the top/left, 1 = content at the
        // bottom/right. Correct in both cases (content fits, or overflows).
        var dv = vh - ch, dx = vw - cw
        return {
          vw: vw, vh: vh, cw: cw, ch: ch, cx: cx, cy: cy,
          minCy: minCy, maxCy: maxCy, minCx: minCx, maxCx: maxCx,
          showV: showV, showH: showH,
          dv: dv, dx: dx,
          posY: dv !== 0 ? cy / dv : 0,
          posX: dx !== 0 ? cx / dx : 0,
        }
      }
      function updateScrollbars() {
        if (!scrollbarVEl || !scrollbarHEl) return
        var s = scrollMetrics()
        scrollbarVEl.classList.toggle('mn-visible', s.showV)
        scrollbarHEl.classList.toggle('mn-visible', s.showH)

        // Size + position the thumb on a track given the scroll fraction (0..1).
        function thumbFor(trackEl, thumbEl, contentSize, viewportSize, frac) {
          var isV = trackEl.classList.contains('mn-v')
          var track = trackEl.getBoundingClientRect()
          var trackLen = isV ? track.height : track.width
          // When content fits in viewport, size >= 1 clamps to a full-length thumb.
          var thumbLen = clamp(viewportSize / contentSize * trackLen, 24, trackLen)
          if (isV) {
            thumbEl.style.height = thumbLen + 'px'
            thumbEl.style.top = (frac * Math.max(0, trackLen - thumbLen)) + 'px'
          } else {
            thumbEl.style.width = thumbLen + 'px'
            thumbEl.style.left = (frac * Math.max(0, trackLen - thumbLen)) + 'px'
          }
        }
        if (s.showV) thumbFor(scrollbarVEl, scrollbarVThumb, s.ch, s.vh, clamp(s.posY, 0, 1))
        if (s.showH) thumbFor(scrollbarHEl, scrollbarHThumb, s.cw, s.vw, clamp(s.posX, 0, 1))
      }

      // Drag a scrollbar thumb to scroll the content in its axis.
      function attachScrollbarDrag(barEl, thumbEl, vertical) {
        thumbEl.addEventListener('pointerdown', function (e) {
          if (e.button !== 0) return
          e.preventDefault()
          e.stopPropagation()
          var startPx = vertical ? e.clientY : e.clientX
          var startFrac = vertical ? scrollMetrics().posY : scrollMetrics().posX
          function onMove(ev) {
            var track = barEl.getBoundingClientRect()
            var trackLen = vertical ? track.height : track.width
            var thumbLen = vertical ? thumbEl.offsetHeight : thumbEl.offsetWidth
            var maxTravel = Math.max(0, trackLen - thumbLen)
            var delta = (vertical ? ev.clientY : ev.clientX) - startPx
            var frac = clamp(startFrac + delta / Math.max(1, maxTravel), 0, 1)
            scrollToOffset(vertical, frac)
          }
          function onUp() {
            document.removeEventListener('pointermove', onMove)
            document.removeEventListener('pointerup', onUp)
          }
          document.addEventListener('pointermove', onMove)
          document.addEventListener('pointerup', onUp)
        })
      }
      // Set the scroll fraction (0..1) and place the content box accordingly.
      function scrollToOffset(vertical, frac) {
        var s = scrollMetrics()
        var z = board.viewport.zoom
        var b = contentBounds()
        frac = clamp(frac, 0, 1)
        if (vertical) {
          board.viewport.y = (s.dv * frac) - b.y * z
        } else {
          board.viewport.x = (s.dx * frac) - b.x * z
        }
        applyViewport()
        scheduleViewSave()
      }

      // ---- rendering cards ----
      function renderCard(card) {
        var prev = cardEls[card.id]
        if (prev) { prev.remove(); delete cardEls[card.id] }
        var element = buildCard(card)
        cardEls[card.id] = element
        worldEl.appendChild(element)
        // 🔴 改动 2026-09-25 · 重建卡片后恢复锁定徽标（context-menu 子模块）
        var cm = getClientModule('context-menu')
        if (cm) cm.applyLockState(element, card)
        layoutColumns()
        renderLines()
        return element
      }

      function buildCard(card) {
        var node = el('div', { class: 'mn-card mn-card-' + card.type, dataset: { id: card.id } })
        var min = cardMin(card.type)
        node.style.left = card.x + 'px'
        node.style.top = card.y + 'px'
        // Render at minimum size; the builder measures content and grows from here.
        node.style.minWidth = min.w + 'px'
        node.style.minHeight = min.h + 'px'
        node.style.width = Math.max(card.w || min.w, min.w) + 'px'
        node.style.height = Math.max(card.h || min.h, min.h) + 'px'
        var builder = CARD_BUILDERS[card.type]
        if (builder) builder(node, card)
        else buildGeneric(node, card)
        attachCardInteraction(node, card)
        // 🔴 改动 2026-09-23 · 图片卡片用四角缩放点（靠近显示，默认按比例，Ctrl 自由拉伸）
        if (card.type === 'image') attachImageCornerResize(node, card, min)
        else attachResizeHandle(node, card, min)
        return node
      }

      // Drag the bottom-right handle to resize the card to any width/height
      // (no maximum); width/height never shrink below the type's minimum.
      function attachResizeHandle(node, card, min) {
        var handle = el('div', { class: 'mn-resize-handle', title: t('拖动调整大小') })
        node.appendChild(handle)
        handle.addEventListener('pointerdown', function (e) {
          if (e.button !== 0) return
          // 🔴 改动 2026-09-25 · Lock Position：锁定的卡片禁用右下角缩放
          if (card.meta && card.meta.locked) return
          e.preventDefault()
          e.stopPropagation()
          var startX = e.clientX, startY = e.clientY
          var startW = card.w || min.w
          var startH = card.h || min.h
          var z = board.viewport.zoom || 1
          function onMove(ev) {
            var w = Math.max(min.w, startW + (ev.clientX - startX) / z)
            var h = Math.max(min.h, startH + (ev.clientY - startY) / z)
            card.w = w
            card.h = h
            // 🔴 改动 2026-09-26 · todo 手动调宽标记：有标记后不再 hug headline，标题按手动宽度折行
            if (card.type === 'todo' && card.meta) card.meta.manualW = true
            node.style.width = w + 'px'
            node.style.height = h + 'px'
            if (card.type === 'column') card.meta.minHeight = h
            scheduleSave()
          }
          function onUp() {
            document.removeEventListener('pointermove', onMove)
            document.removeEventListener('pointerup', onUp)
            if (card.type === 'todo' && typeof node.__todoGrow === 'function') node.__todoGrow()
            renderLines()
            updateScrollbars()
          }
          document.addEventListener('pointermove', onMove)
          document.addEventListener('pointerup', onUp)
        })
      }

      // 🔴 改动 2026-09-23 · 图片四角缩放：鼠标靠近角落 48px 内显示缩放点；
      // 拖动默认按比例缩放（锁定对角），按住 Ctrl 切换为非比例自由拉伸。
      function attachImageCornerResize(node, card, min) {
        var CORNERS = ['nw', 'ne', 'sw', 'se']
        var PROX = 48
        var handles = {}
        var activeCorner = null
        function hideCorners() {
          CORNERS.forEach(function (c) { handles[c].classList.remove('mn-corner-on') })
        }
        CORNERS.forEach(function (corner) {
          var h = el('div', { class: 'mn-img-corner mn-corner-' + corner })
          handles[corner] = h
          node.appendChild(h)
          h.addEventListener('pointerdown', function (e) {
            if (e.button !== 0) return
            // 🔴 改动 2026-09-25 · Lock Position：锁定的图片禁用四角缩放
            if (card.meta && card.meta.locked) return
            e.preventDefault()
            e.stopPropagation()
            activeCorner = corner
            var startX = e.clientX, startY = e.clientY
            var w0 = card.w || min.w, h0 = card.h || min.h
            var x0 = card.x, y0 = card.y
            var z = board.viewport.zoom || 1
            // 东/南角向外为正；西/北角反向，位移同时平移卡片保持对角锁定
            var fx = corner.indexOf('e') >= 0 ? 1 : -1
            var fy = corner.indexOf('s') >= 0 ? 1 : -1
            function onMove(ev) {
              var dx = (ev.clientX - startX) / z
              var dy = (ev.clientY - startY) / z
              var w = w0 + dx * fx
              var h = h0 + dy * fy
              if (ev.ctrlKey) {
                // Ctrl：非比例自由拉伸
                w = Math.max(min.w, w)
                h = Math.max(min.h, h)
              } else {
                // 默认按比例：取两轴相对变化更大者作为统一缩放比
                var s = Math.max(w / w0, h / h0, min.w / w0, min.h / h0)
                w = w0 * s
                h = h0 * s
              }
              card.w = Math.round(w)
              card.h = Math.round(h)
              card.x = Math.round(fx === 1 ? x0 : x0 + (w0 - w))
              card.y = Math.round(fy === 1 ? y0 : y0 + (h0 - h))
              node.style.width = card.w + 'px'
              node.style.height = card.h + 'px'
              node.style.left = card.x + 'px'
              node.style.top = card.y + 'px'
              scheduleSave()
            }
            function onUp() {
              document.removeEventListener('pointermove', onMove)
              document.removeEventListener('pointerup', onUp)
              activeCorner = null
              hideCorners()
              renderLines()
              updateScrollbars()
            }
            document.addEventListener('pointermove', onMove)
            document.addEventListener('pointerup', onUp)
          })
        })
        // 靠近某个角落 48px 内 → 只显示该角的缩放点（屏幕像素，与缩放无关）
        node.addEventListener('pointermove', function (e) {
          if (activeCorner) return
          if (card.meta && card.meta.locked) return   // 🔴 锁定卡不显示缩放角点
          var r = node.getBoundingClientRect()
          var px = { nw: [r.left, r.top], ne: [r.right, r.top], sw: [r.left, r.bottom], se: [r.right, r.bottom] }
          CORNERS.forEach(function (c) {
            var dx = e.clientX - px[c][0], dy = e.clientY - px[c][1]
            handles[c].classList.toggle('mn-corner-on', dx * dx + dy * dy <= PROX * PROX)
          })
        })
        node.addEventListener('pointerleave', function () {
          if (!activeCorner) hideCorners()
        })
      }

      // Size a text-card (note/comment/document) to hug its content: width fits
      // the longest line, height fits the wrapped text. Grows/shrinks on every
      // input, bounded only by the type minimum (no maximum). Uses a hidden
      // measurer so width tracking is accurate across font/zoom.
      var textMeasurer = null
      // 🔴 改动 2026-09-25 · 文本卡只随内容长高、不再随内容变宽：宽度保持卡片
      // 当前值（角点可手动拖改，列内跟随列宽）；note 高度改用 textarea 自身
      // scrollHeight 按真实折行/行高测量；comment/document 用补回 line-height 的测量器
      function fitTextCard(node, card, ta, type, font) {
        var min = cardMin(type)
        var parentColumn = columnFor(card.id)
        // Inside a column the column owns the horizontal inset (--mn-col-side),
        // so read it back instead of duplicating the number here.
        var colSide = parentColumn ? columnSidePx(parentColumn) : 0
        // 宽度：列内跟随列宽；自由画布保持卡片当前宽度（min 兜底），与内容无关
        var w = parentColumn ? Math.max(min.w, parentColumn.w - colSide * 2) : Math.max(min.w, card.w || min.w)
        // 先落宽度再量高度，折行结果才真实
        node.style.width = w + 'px'
        var h
        var sh = 0
        if (type === 'note' && node.isConnected) {
          // scrollHeight 已含 note-ta 自身垂直 padding（14px*2，列内为 col-pad*2）；
          // 首次渲染时卡片尚未挂载、或无布局环境（domino 测试）scrollHeight 为 0/NaN，
          // 这两种情况都走下方测量器兜底
          var prevTaH = ta.style.height
          ta.style.height = '0px'
          sh = ta.scrollHeight || 0
          ta.style.height = prevTaH
        }
        if (type === 'note' && sh > 0) {
          h = Math.max(min.h, sh)
        } else {
          // 测量器量纯文本高度；font 简写会把 line-height 重置为 normal，按类型补回
          if (!textMeasurer) {
            textMeasurer = el('div', { class: 'mn-text-measure' })
            ;(document.body || document.documentElement).appendChild(textMeasurer)
          }
          textMeasurer.style.font = font
          textMeasurer.style.lineHeight = type === 'document' ? '1.7' : '1.6'
          textMeasurer.style.whiteSpace = 'pre-wrap'
          // note-ta padding 16px*2；document 容器 16px*2；comment 容器 14px*2
          var padX = type === 'comment' ? 28 : 32
          textMeasurer.textContent = ta.value || ''
          textMeasurer.style.width = (w - padX) + 'px'
          // note 补自身垂直 padding（自由画布 28 / 列内 col-pad*2）；
          // comment/document 的头部与容器 padding 在 textarea 之外，补 56
          var padY = type === 'note'
            ? (parentColumn ? columnPadPx(parentColumn) * 2 : 28)
            : 56
          h = Math.max(min.h, textMeasurer.offsetHeight + padY)
        }
        node.style.height = h + 'px'
        card.w = w
        card.h = h
        updateScrollbars()
      }

      // Width of ONE un-wrapped line of text in a given font, using the shared
      // measurer. Used to size a card so its header hugs its own text.
      function measureOneLine(text, font) {
        if (!textMeasurer) {
          textMeasurer = el('div', { class: 'mn-text-measure' })
          ;(document.body || document.documentElement).appendChild(textMeasurer)
        }
        textMeasurer.style.font = font
        textMeasurer.style.whiteSpace = 'pre'
        textMeasurer.style.width = 'auto'
        textMeasurer.textContent = text == null ? '' : String(text)
        return textMeasurer.offsetWidth
      }

      // 🔴 改动 2026-09-21 · note 建造器拆入子模块 lib/client-modules/cards-basic.js

      function buildGeneric(node, card) {
        var inner = el('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6b7280', fontSize: '12px' } }, [t('未实现')])
        node.appendChild(inner)
      }

      // ---- content-type renderers (all card gestures use attachCardInteraction) ----

      // Milanote-style to-do card: editable title + done counter on top,
      // custom square checkboxes, hover-revealed drag grip and delete button,
      // Enter/Backspace list flow, and a "+ add" footer. Items persist in
      // card.meta.items ([{text, done}]) — the same shape as the M1 stub.
      // 🔴 改动 2026-09-21 · 进程条 dock + 任务计数器整体拆分为子模块 lib/client-modules/process-dock.js
      // ↳ 改前[js]: 此处内联 dock/进程条/吸收/计数器约 175 行  改后[js]: getClientModule('process-dock') 调模块 API

      // 粒子爆发 + 冲击波环：host 为定位容器，elm 为爆发中心（元素或伪 rect 对象），
      // cls 可指定火花变体（如 'mn-green' 绿色吸收火花）
      function burstAtInto(host, elm, n, spread, cls) {
        try {
          if (!elm.getBoundingClientRect || !document.body.animate) return
          var hr = host.getBoundingClientRect()
          var r = elm.getBoundingClientRect()
          var cx = r.left - hr.left + r.width / 2
          var cy = r.top - hr.top + r.height / 2
          var ring = el('i', { class: 'mn-ring' })
          var rw = Math.max(r.width, 18)
          ring.style.width = rw + 'px'; ring.style.height = rw + 'px'
          ring.style.left = (cx - rw / 2) + 'px'; ring.style.top = (cy - rw / 2) + 'px'
          host.appendChild(ring)
          ring.animate([
            { transform: 'scale(.4)', opacity: .9 },
            { transform: 'scale(2.2)', opacity: 0 }
          ], { duration: 480, easing: 'cubic-bezier(.2,.7,.3,1)' }).onfinish = function () { ring.remove() }
          for (var i = 0; i < n; i++) {
            (function () {
              var p = el('i', { class: 'mn-spark' + (cls ? ' ' + cls : '') })
              p.style.left = (cx - 2.5) + 'px'; p.style.top = (cy - 2.5) + 'px'
              host.appendChild(p)
              var a = Math.random() * Math.PI * 2
              var d = spread * (0.55 + Math.random() * 0.75)
              var dx = Math.cos(a) * d, dy = Math.sin(a) * d - 6
              p.animate([
                { transform: 'translate(0,0) scale(1)', opacity: 1 },
                { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.15)', opacity: 0 }
              ], { duration: 420 + Math.random() * 320, easing: 'cubic-bezier(.15,.8,.3,1)' }).onfinish = function () { p.remove() }
            })()
          }
        } catch (err) { /* 动画失败不影响功能 */ }
      }

      // 🔴 改动 2026-09-21 · todo 卡片整体拆分为子模块 lib/client-modules/todo.js（约 340 行 + 43 行样式）
      // ↳ 改前[js]: 此处内联 buildTodo  改后[js]: builders 表经 getClientModule('todo') 调模块

      // 🔴 改动 2026-09-21 · link/color/comment 建造器拆入子模块 lib/client-modules/cards-basic.js

      function buildTable(node, card) {
        var meta = card.meta || (card.meta = {})
        if (!meta.rows) meta.rows = [['', ''], ['', ''], ['', '']]
        var table = el('table', { class: 'mn-table' })
        node.appendChild(table)
        function render() {
          table.textContent = ''
          meta.rows.forEach(function (row, ri) {
            var tr = el('tr', {})
            row.forEach(function (cell, ci) {
              var td = el('td', { class: 'mn-table-cell' })
              var inp = el('input', { class: 'mn-table-input' })
              inp.addEventListener('input', function () { meta.rows[ri][ci] = inp.value; scheduleSave() })
              inp.value = cell || ''
              td.appendChild(inp)
              tr.appendChild(td)
            })
            table.appendChild(tr)
          })
        }
        render()
        node.__edit = function (e) {
          var target = e && e.target
          var input = target && target.classList.contains('mn-table-input') ? target : node.querySelector('.mn-table-input')
          if (input) { input.focus(); if (input.select) input.select() }
        }
      }

      function buildColumn(node, card) {
        var meta = card.meta || (card.meta = {})
        if (typeof meta.title !== 'string') meta.title = t('分栏')
        if (!Array.isArray(meta.cardIds)) meta.cardIds = []
        var wrap = el('div', { class: 'mn-column' })
        var header = el('div', { class: 'mn-column-header', title: t('拖动标题栏移动整列') })
        var title = el('input', { class: 'mn-column-title', 'aria-label': t('列标题'), placeholder: t('分栏') })
        title.value = meta.title
        title.addEventListener('input', function () { meta.title = title.value; scheduleSave() })
        title.addEventListener('keydown', function (e) {
          e.stopPropagation()
          if (e.key === 'Enter' || e.key === 'Escape') title.blur()
        })
        // 🔴 改动 2026-09-24 · 去掉列标题栏左侧的六点拖拽图标（整列仍可按住标题栏拖动）
        header.appendChild(title)
        header.appendChild(el('span', { class: 'mn-column-count' }, ['0']))
        wrap.appendChild(header)
        wrap.appendChild(el('div', { class: 'mn-column-empty' }, [t('拖入卡片，在这里整理内容')]))
        node.appendChild(wrap)
        node.__edit = function () { title.focus(); if (typeof title.select === 'function') title.select() }
        node.__rename = node.__edit
      }

      // Children remain ordinary board cards, with world coordinates for lines,
      // selection and persistence. Only the ordered IDs belong to the column.
      var draggingCards = false
      var layingOutColumns = false
      function columnFor(id) {
        return board.cards.find(function (c) {
          return c.type === 'column' && c.meta && Array.isArray(c.meta.cardIds) && c.meta.cardIds.indexOf(id) >= 0
        })
      }
      function columnChildren(column) {
        return ((column.meta && column.meta.cardIds) || []).map(function (id) {
          return board.cards.find(function (c) { return c.id === id && c.type !== 'column' })
        }).filter(Boolean)
      }
      // One vertical value for a column, owned by the column's own CSS knob
      // (--mn-col-pad). The gap between two stacked objects, the padding above the
      // first one and each object's own top/bottom padding all come from it, so no
      // card type can inject its own vertical spacing. Falls back to 12px when
      // computed styles are unavailable (headless).
      function columnPadPx(column) {
        var node = cardEls[column.id]
        if (node) {
          try {
            var v = parseFloat(window.getComputedStyle(node).getPropertyValue('--mn-col-pad'))
            if (!isNaN(v) && v > 0) return v
          } catch (e) { /* no computed styles → fall through */ }
        }
        return 12
      }
      function columnSidePx(column) {
        var node = cardEls[column.id]
        if (node) {
          try {
            var v = parseFloat(window.getComputedStyle(node).getPropertyValue('--mn-col-side'))
            if (!isNaN(v) && v > 0) return v
          } catch (e) { /* no computed styles → fall through */ }
        }
        return 12
      }
      function layoutColumns() {
        if (layingOutColumns || draggingCards || !worldEl) return
        layingOutColumns = true
        try {
          var COLUMN_HEADER_H = 44   // .mn-column-header height
          var COLUMN_FOOTER = 0     // the final child already includes bottom padding
          board.cards.forEach(function (card) {
            var inColumn = !!columnFor(card.id)
            var tile = cardEls[card.id]
            if (tile) tile.classList.toggle('mn-in-column', inColumn)
            if (card.type !== 'board') return
            card.h = inColumn ? 92 : 116
            if (!inColumn) card.w = 140
            if (tile) {
              if (!inColumn) tile.style.width = card.w + 'px'
              tile.style.height = card.h + 'px'
            }
          })
          board.cards.filter(function (c) { return c.type === 'column' }).forEach(function (column) {
            var children = columnChildren(column)
            var pad = columnPadPx(column)      // the column's one vertical value
            var side = columnSidePx(column)    // horizontal inset (unchanged by the knob)
            column.w = Math.max(cardMin('column').w, column.w || 0)
            children.forEach(function (child) { column.w = Math.max(column.w, (child.type === 'board' ? 240 : cardMin(child.type).w) + side * 2) })
            var y = column.y + COLUMN_HEADER_H + pad
            children.forEach(function (child) {
              child.x = column.x + side
              child.y = y
              child.w = column.w - side * 2
              var n = cardEls[child.id]
              if (n) {
                var ta = n.querySelector('.mn-note-ta, .mn-comment-ta, .mn-document-ta')
                if (ta) fitTextCard(n, child, ta, child.type, child.type === 'note' ? '15px system-ui' : '14px system-ui')
                n.style.left = child.x + 'px'; n.style.top = child.y + 'px'
                n.style.width = child.w + 'px'
              }
              // Vertical distance between two objects = the same column-owned value.
              y += (child.h || cardMin(child.type).h) + pad
            })
            column.h = Math.max(cardMin('column').h, column.meta.minHeight || 0, y - column.y + COLUMN_FOOTER)
            var node = cardEls[column.id]
            if (node) {
              node.style.width = column.w + 'px'; node.style.height = column.h + 'px'
              node.querySelector('.mn-column-count').textContent = String(children.length)
              node.querySelector('.mn-column-empty').style.display = children.length ? 'none' : 'block'
            }
          })
          renderLines(); updateScrollbars()
        } finally { layingOutColumns = false }
      }
      function detachFromColumn(id) {
        board.cards.forEach(function (c) {
          if (c.type === 'column' && c.meta && Array.isArray(c.meta.cardIds)) {
            c.meta.cardIds = c.meta.cardIds.filter(function (childId) { return childId !== id })
          }
        })
      }
      function columnAt(x, y, excluded) {
        return board.cards.slice().reverse().find(function (c) {
          return c.type === 'column' && !(excluded && excluded[c.id]) &&
            x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h
        })
      }
      function putInColumn(cards, column, y) {
        cards.forEach(function (c) { detachFromColumn(c.id) })
        if (!column) return
        var children = columnChildren(column)
        var index = children.findIndex(function (c) { return y < c.y + c.h / 2 })
        if (index < 0) index = children.length
        column.meta.cardIds.splice.apply(column.meta.cardIds, [index, 0].concat(cards.map(function (c) { return c.id })))
      }
      // 🔴 改动 2026-09-23 · 预览落点的只读计算（不改动 cardIds），
      // 供拖动时做「列+位置」去重，避免每次 pointermove 都重排导致列高抖动
      function previewIndexOf(column, cards, y) {
        if (!column) return -1
        var movingIds = {}
        cards.forEach(function (c) { movingIds[c.id] = true })
        var children = columnChildren(column).filter(function (c) { return !movingIds[c.id] })
        var index = y <= column.y + 54 ? 0 : children.findIndex(function (c) { return y < c.y + c.h / 2 })
        if (index < 0) index = children.length
        return index
      }
      function previewColumnDrop(cards, column, y) {
        var movingIds = {}
        cards.forEach(function (c) { movingIds[c.id] = true; detachFromColumn(c.id) })
        if (column) {
          var children = columnChildren(column)
          var index = y <= column.y + 54 ? 0 : children.findIndex(function (c) { return y < c.y + c.h / 2 })
          if (index < 0) index = children.length
          column.meta.cardIds.splice.apply(column.meta.cardIds, [index, 0].concat(cards.map(function (c) { return c.id })))
        }
        // Keep the dragged object under the pointer while siblings animate into
        // their new auto-layout slots, like Figma's vertical Auto Layout.
        // 🔴 改动 2026-09-23 · 预览高度公式与 layoutColumns 对齐（44 头 + pad 间距），
        // 预览开始/结束时列高不再突变
        board.cards.filter(function (c) { return c.type === 'column' }).forEach(function (col) {
          var pad = columnPadPx(col)
          var side = columnSidePx(col)
          var nextY = col.y + 44 + pad
          columnChildren(col).forEach(function (child) {
            if (!movingIds[child.id]) {
              child.x = col.x + side; child.y = nextY; child.w = col.w - side * 2
              var childEl = cardEls[child.id]
              if (childEl) {
                childEl.classList.add('mn-column-shifting')
                childEl.style.left = child.x + 'px'; childEl.style.top = child.y + 'px'; childEl.style.width = child.w + 'px'
              }
            }
            nextY += (child.h || cardMin(child.type).h) + pad
          })
          col.h = Math.max(cardMin('column').h, col.meta.minHeight || 0, nextY - col.y)
          if (cardEls[col.id]) cardEls[col.id].style.height = col.h + 'px'
        })
      }

      function buildDocument(node, card) {
        // A larger text card (like a note but with a "document" header).
        var wrap = el('div', { class: 'mn-document' })
        var head = el('div', { class: 'mn-document-head' }, [contentIcon('document'), t('文档')])
        var ta = el('textarea', { class: 'mn-document-ta', placeholder: t('编写文档…') }, [card.text || ''])
        ta.addEventListener('input', function () {
          card.text = ta.value
          fitTextCard(node, card, ta, 'document', '15px/1.7 system-ui,"Segoe UI",sans-serif')
          scheduleSave()
        })
        wrap.appendChild(head); wrap.appendChild(ta)
        node.appendChild(wrap)
        node.__edit = function (e) { editingId = card.id; ta.focus() }
        fitTextCard(node, card, ta, 'document', '15px/1.7 system-ui,"Segoe UI",sans-serif')
      }

      function buildDraw(node, card) {
        var meta = card.meta || (card.meta = {})
        // Preserve existing raster artwork; new sketches use the dark surface.
        if (!meta.image) meta.canvasTheme = 'dark'
        var canvas = el('canvas', { class: 'mn-draw-canvas' })
        canvas.width = card.w || 240
        canvas.height = card.h || 150
        node.appendChild(canvas)
        var ctx = null
        try { ctx = canvas.getContext && canvas.getContext('2d') } catch (err) { ctx = null }
        if (!ctx) return
        function blank() {
          ctx.fillStyle = meta.canvasTheme === 'dark' ? '#343434' : '#ffffff'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
        }
        blank()
        // Draw any previously-saved sketch.
        if (meta.image) {
          var img = new Image()
          img.onload = function () { ctx.drawImage(img, 0, 0, canvas.width, canvas.height) }
          img.src = meta.image
        }
        ctx.strokeStyle = meta.canvasTheme === 'dark' ? '#e7e7e7' : '#1f1f26'
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        var drawing = false
        function point(e) {
          var r = canvas.getBoundingClientRect()
          return {
            x: (e.clientX - r.left) * (canvas.width / (r.width || canvas.width)),
            y: (e.clientY - r.top) * (canvas.height / (r.height || canvas.height)),
          }
        }
        canvas.addEventListener('pointerdown', function (e) {
          e.stopPropagation()
          drawing = true
          var p = point(e)
          ctx.beginPath(); ctx.moveTo(p.x, p.y)
        })
        canvas.addEventListener('pointermove', function (e) {
          if (!drawing) return
          var p = point(e)
          ctx.lineTo(p.x, p.y); ctx.stroke()
        })
        canvas.addEventListener('pointerup', function () {
          drawing = false
          try { meta.image = canvas.toDataURL('image/png'); scheduleSave() } catch (err) {}
        })
        node.__edit = function () {
          canvas.setAttribute('tabindex', '0')
          canvas.focus()
        }
      }

      // Media-ish cards: accept a URL via double-click and render the media/placeholder.
      function setUrlMeta(node, card, meta, key, promptLabel, labelEl) {
        function edit() {
          var v = window.prompt(promptLabel, meta[key] || '')
          if (v && v.trim()) {
            meta[key] = v.trim()
            if (labelEl) labelEl.textContent = v.trim()
            scheduleSave()
          }
        }
        node.__edit = function (e) { edit() }
      }

      function buildImage(node, card) {
        var meta = card.meta || (card.meta = {})
        meta.url = meta.url || ''
        var img = el('img', { class: 'mn-media-img', draggable: 'false' })
        if (meta.url) img.src = meta.url
        // 🔴 改动 2026-09-23 · 高度由卡片 h 驱动（拖入时已按高度定档），不再 auto
        node.appendChild(img)
        if (!meta.url) {
          var ph = el('div', { class: 'mn-media-ph' }, [contentIcon('image'), t('双击设置图片地址')])
          node.appendChild(ph)
        }
        setUrlMeta(node, card, meta, 'url', t('图片地址'), null)
      }

      function buildAudio(node, card) {
        var meta = card.meta || (card.meta = {})
        var wrap = el('div', { class: 'mn-media' })
        wrap.appendChild(el('div', { class: 'mn-media-icon' }, [contentIcon('audio')]))
        var label = el('div', { class: 'mn-media-label' }, [meta.url ? t('音频') : t('双击设置音频地址')])
        wrap.appendChild(label)
        node.appendChild(wrap)
        if (meta.url) {
          var au = el('audio', { class: 'mn-media-el', controls: 'controls' })
          au.src = meta.url
          node.appendChild(au)
        }
        setUrlMeta(node, card, meta, 'url', t('音频地址'), label)
      }

      function buildVideo(node, card) {
        var meta = card.meta || (card.meta = {})
        var wrap = el('div', { class: 'mn-media' })
        wrap.appendChild(el('div', { class: 'mn-media-icon' }, [contentIcon('video')]))
        var label = el('div', { class: 'mn-media-label' }, [meta.url ? t('视频') : t('双击设置视频地址')])
        wrap.appendChild(label)
        node.appendChild(wrap)
        if (meta.url) {
          var vd = el('video', { class: 'mn-media-el', controls: 'controls' })
          vd.src = meta.url
          node.appendChild(vd)
        }
        setUrlMeta(node, card, meta, 'url', t('视频地址'), label)
      }

      function buildMap(node, card) {
        var meta = card.meta || (card.meta = {})
        var wrap = el('div', { class: 'mn-media' })
        wrap.appendChild(el('div', { class: 'mn-media-icon' }, [contentIcon('map')]))
        var label = el('div', { class: 'mn-media-label' }, [meta.url ? t('地图') : t('双击设置地图地址')])
        wrap.appendChild(label)
        node.appendChild(wrap)
        setUrlMeta(node, card, meta, 'url', t('地图地址'), label)
      }

      // Upload a file into the workspace (reuses the drop-to-path import route)
      // and remembers its path/name.
      function buildUpload(node, card) {
        var meta = card.meta || (card.meta = {})
        var wrap = el('div', { class: 'mn-upload mn-view-click' })
        wrap.appendChild(el('div', { class: 'mn-upload-icon' }, [contentIcon('upload')]))
        var label = el('div', { class: 'mn-upload-label' }, [meta.name || t('点击上传文件')])
        wrap.appendChild(label)
        node.appendChild(wrap)
        var file = el('input', { type: 'file', class: 'mn-upload-input' })
        file.addEventListener('change', function (e) {
          var f = file.files[0]
          if (!f) return
          var form = new FormData()
          form.append('name', f.name)
          form.append('file', f, f.name)
          label.textContent = t('上传中…')
          try {
            fetch('/_dsh/drop-to-path/import', { method: 'POST', body: form })
              .then(function (r) { return r.json() })
              .then(function (j) {
                if (j && j.ok && j.value) {
                  meta.path = j.value.path
                  meta.name = f.name
                  label.textContent = f.name + ' ✓'
                  scheduleSave()
                } else { label.textContent = t('上传失败') }
              })
              .catch(function () { label.textContent = t('上传失败') })
          } catch (err) { label.textContent = t('上传失败') }
        })
        node.appendChild(file)
        // 🔴 改动 2026-09-24 · 单击直接打开文件选择器（mn-view-action 视图态直通），双击同样可用
        node.__edit = function () { file.click() }
        wrap.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); file.click() })
      }

      // Board: opens a nested sub-board canvas on double-click.
      function buildBoard(node, card) {
        var meta = card.meta || (card.meta = {})
        if (!meta.title) meta.title = t('子画板')
        if (!meta.sub) meta.sub = { title: meta.title, viewport: { x: 0, y: 0, zoom: 1 }, cards: [], lines: [] }
        var wrap = el('div', { class: 'mn-board' })
        wrap.appendChild(el('div', { class: 'mn-board-badge' }, [contentIcon('board')]))
        var title = el('div', { class: 'mn-board-title' }, [meta.title])
        var info = el('div', { class: 'mn-board-info' }, [title])
        var count = el('div', { class: 'mn-board-count' })
        var preview = el('div', { class: 'mn-board-preview' })
        info.appendChild(count)
        info.appendChild(preview)
        wrap.appendChild(info)
        // 🔴 改动 2026-09-25 · Board 卡片双击分流：双击名字=改名，双击图标=进入子画板（其余区域不动作）
        // ↳ 改前[js]: 双击卡片任意位置都 __edit 直接进子画板
        // ↳ 改后[js]: __edit 按 e.target 分流 → .mn-board-title 走 __rename，.mn-board-badge 走 openSubBoard
        wrap.title = t('双击名字改名，双击图标打开')
        function refreshPreview() {
          title.textContent = meta.title
          var cards = meta.sub.cards || []
          count.textContent = cards.length + ' ' + t('张卡片')
          preview.textContent = cards.slice(0, 3).map(cardLabel).join(' · ')
        }
        refreshPreview()
        node.appendChild(wrap)
        node.__rename = function () {
          // Inline headline editing — no prompt dialog. Enter commits, Escape
          // cancels; dblclick stays local so it never opens the sub-board.
          if (title.querySelector('input')) return
          var inp = el('input', { class: 'mn-board-title-input', 'aria-label': t('重命名画板') })
          inp.value = meta.title || ''
          title.textContent = ''
          title.appendChild(inp)
          inp.focus(); inp.select()
          inp.addEventListener('dblclick', function (e) { e.stopPropagation() })
          inp.addEventListener('keydown', function (e) {
            e.stopPropagation()
            if (e.key === 'Enter') { e.preventDefault(); inp.blur() }
            else if (e.key === 'Escape') { inp.value = meta.title || ''; inp.blur() }
          })
          inp.addEventListener('blur', function () {
            var v = inp.value.trim()
            if (v && v !== meta.title) { meta.title = v; scheduleSave() }
            refreshPreview()
          })
        }
        function openSubBoard(e) {
          if (e) e.stopPropagation()
          if (childApp) return
          blurEditing()
          var sub = meta.sub
          var subApp = createApp({
            board: sub,
            parentTitle: board.title,
            parentWidth: function () { return root.getBoundingClientRect().width },
            onClose: function () {
              childApp = null
              subApp.destroy()
              if (root) { root.removeAttribute('inert'); root.focus({ preventScroll: true }) }
              var tile = cardEls[card.id]
              if (tile) {
                var oldPreview = tile.querySelector('.mn-board')
                if (oldPreview) oldPreview.remove()
                buildBoard(tile, card)
              }
            },
            save: function (b) {
              meta.sub = b
              meta.title = (b && b.title) || meta.title
              card.meta = meta
              refreshPreview()
              scheduleSave()
            },
          })
          childApp = subApp
          if (root) root.setAttribute('inert', '')
          subApp.open()
        }
        // 双击分流：名字→改名，图标→进入；无事件（程序化调用）时保持旧行为直接打开
        node.__edit = function (e) {
          var hit = e && e.target
          if (hit && hit.closest && hit.closest('.mn-board-title')) { node.__rename(); return }
          if (hit && hit.closest && hit.closest('.mn-board-badge')) { openSubBoard(e); return }
          if (!hit) openSubBoard(e)
        }
      }


      // 🔴 改动 2026-09-25 · workflow 卡片整体拆分为子模块 lib/client-modules/cards-workflow.js
      // （WORKFLOW_TYPES/workflowDialog/newWorkflowNode/buildWorkflow/editWorkflowNode/
      //  editWorkflowLine/showWorkflowTools，约 130 行 + 13 条 .mn-wf-* 样式）
      // ↳ 改前[js]: 此处内联 GENERATED WORKFLOW UI 块  改后[js]: 经 getClientModule('cards-workflow') 调模块
      // Dispatch table: content-type -> renderer.
      // 🔴 改动 2026-09-21 · note/link/color/comment 建造器改由 cards-basic 子模块提供（缺失时退化通用卡片）
      // ↳ 改前[js]: note: buildNote, link: buildLink, color: buildColor, comment: buildComment
      // ↳ 改后[js]: basic(name) 模块包装
      function basicBuilder(name) {
        return function (node, card) {
          var m = getClientModule('cards-basic')
          if (m) m[name](node, card)
          else buildGeneric(node, card)
        }
      }
      var CARD_BUILDERS = {
        note: basicBuilder('buildNote'), link: basicBuilder('buildLink'), color: basicBuilder('buildColor'),
        // 🔴 改动 2026-09-25 · workflow 建造器改由 cards-workflow 子模块提供（模块缺失时退化为通用卡片）
        // ↳ 改前[js]: workflow: buildWorkflow  改后[js]: workflow: 模块包装
        workflow: function (node, card) {
          var m = getClientModule('cards-workflow')
          if (m) m.buildWorkflow(node, card)
          else buildGeneric(node, card)
        },
        // 🔴 改动 2026-09-21 · todo 建造器改由 todo 子模块提供（模块缺失时退化为通用卡片）
        // ↳ 改前[js]: todo: buildTodo  改后[js]: todo: 模块包装
        todo: function (node, card) {
          var m = getClientModule('todo')
          if (m) m.buildTodo(node, card)
          else buildGeneric(node, card)
        },
        comment: basicBuilder('buildComment'), table: buildTable, column: buildColumn,
        document: buildDocument, draw: buildDraw, sketch: buildDraw,
        image: buildImage, audio: buildAudio, video: buildVideo, map: buildMap,
        upload: buildUpload, board: buildBoard,
      }

      // ---- line connector (between two cards) ----
      var SVG_NS = 'http://www.w3.org/2000/svg'
      var connectMode = false
      var connectFrom = null
      var linesSvg = null
      function elNS(name, attrs) {
        var n = document.createElementNS(SVG_NS, name)
        Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]) })
        return n
      }
      function chevronDownIcon() {
        var s = elNS('svg', { viewBox: '0 0 24 24', width: '12', height: '12', fill: 'none',
          'aria-hidden': 'true' })
        s.appendChild(elNS('path', { d: 'M6 9l6 6 6-6', stroke: 'currentColor', 'stroke-width': '2.2',
          'stroke-linecap': 'round', 'stroke-linejoin': 'round' }))
        return s
      }
      function contentIcon(type) {
        var paths = {
          note: 'M5 4h14v16H5z M8 8h8 M8 12h8 M8 16h5',
          workflow: 'M3 9h6v6H3z M15 2h6v6h-6z M15 16h6v6h-6z M9 12h3 M12 5v14 M12 5h3 M12 19h3',
          link: 'M10 14l4-4 M8 16l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0 M13 17a4 4 0 0 0 6 0l4-4a4 4 0 0 0-6-6l-1 1',
          todo: 'M4 12l5 5L20 6', line: 'M4 20L20 4 M11 4h9v9',
          board: 'M3 6h7l2 2h9v12H3z M3 6V4h7l2 2h7v2',
          column: 'M4 3h16v18H4z M4 8h16',
          comment: 'M4 4h16v12H9l-5 4z M8 8h8 M8 12h5',
          table: 'M3 4h18v16H3z M3 9h18 M3 14h18 M9 4v16 M15 4v16',
          sketch: 'M4 20l1-6L16 3l5 5L10 19z M13 6l5 5 M5 14l5 5',
          color: 'M12 3L4 14a5 5 0 0 0 4 7h8a5 5 0 0 0 4-7z M7 13h10',
          document: 'M5 3h9l5 5v13H5z M14 3v5h5 M8 12h8 M8 16h8',
          audio: 'M9 18V5l11-2v13 M9 9l11-2 M9 18c0 4-7 4-7 0s7-4 7 0 M20 16c0 4-7 4-7 0s7-4 7 0',
          map: 'M12 21s7-7 7-12a7 7 0 0 0-14 0c0 5 7 12 7 12z M15 9a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
          video: 'M4 4h16v16H4z M10 8l6 4-6 4z',
          image: 'M3 4h18v16H3z M3 16l6-6 5 5 3-3 4 4 M17 8h.01',
          upload: 'M12 16V3 M6 9l6-6 6 6 M4 15v6h16v-6',
          draw: 'M3 19c4-10 5-14 8-13s-5 12-2 13 5-11 8-10-4 7-1 8 4-3 5-2',
          trash: 'M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7'
        }
        var icon = elNS('svg', {viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', 'stroke-width':'1.6',
          'stroke-linecap':'round', 'stroke-linejoin':'round', 'aria-hidden':'true'})
        icon.appendChild(elNS('path', {d:paths[type] || paths.note}))
        return icon
      }
      function renderLines() {
        if (!worldEl) return
        if (!linesSvg) {
          linesSvg = elNS('svg', { class: 'mn-lines' })
          worldEl.appendChild(linesSvg)
        }
        linesSvg.textContent = ''
        var defs = elNS('defs', {})
        var marker = elNS('marker', { id: 'wf-arrow-' + (isSub ? 'sub' : 'main'), viewBox: '0 0 10 10', refX: '9', refY: '5', markerWidth: '6', markerHeight: '6', orient: 'auto-start-reverse' })
        marker.appendChild(elNS('path', { d: 'M0 0L10 5L0 10z', fill: '#f28b70' })); defs.appendChild(marker); linesSvg.appendChild(defs)
        ;(board.lines || []).forEach(function (line) {
          var a = board.cards.find(function (c) { return c.id === line.from })
          var b = board.cards.find(function (c) { return c.id === line.to })
          if (!a || !b) return
          var x1 = a.x + (a.w || 240) / 2, y1 = a.y + (a.h || 150) / 2
          var x2 = b.x + (b.w || 240) / 2, y2 = b.y + (b.h || 150) / 2
          var l = elNS('line', { x1: x1, y1: y1, x2: x2, y2: y2, class: 'mn-line' })
          if (line.workflow) {
            x1 = a.x + (a.w || 240); y1 = a.y + (a.h || 138) / 2
            x2 = b.x; y2 = b.y + (b.h || 138) / 2
            var bend = Math.max(60, Math.abs(x2 - x1) / 2)
            l = elNS('path', { d: 'M' + x1 + ',' + y1 + ' C' + (x1 + bend) + ',' + y1 + ' ' + (x2 - bend) + ',' + y2 + ' ' + x2 + ',' + y2, class: 'mn-line', fill: 'none', 'marker-end': 'url(#wf-arrow-' + (isSub ? 'sub' : 'main') + ')' })
            l.style.stroke = '#f28b70'
            var label = elNS('text', { x: (x1 + x2) / 2, y: (y1 + y2) / 2 - 8, fill: '#f28b70', 'font-size': '11', 'text-anchor': 'middle', 'pointer-events': 'none' })
            label.textContent = (line.channel || 'main') + ' ' + (line.output || 0) + ' → ' + (line.input || 0); linesSvg.appendChild(label)
          }
          l.addEventListener('dblclick', function (e) {
            e.stopPropagation()
            if (line.workflow) { wfEditLine(line); return }
            board.lines = (board.lines || []).filter(function (x) { return x.id !== line.id })
            renderLines(); scheduleSave()
          })
          linesSvg.appendChild(l)
        })
      }
      function enterConnectMode() {
        blurEditing()
        connectMode = true
        connectFrom = null
        hideAddMenu()
      }
      function handleConnect(cardId) {
        if (!connectFrom) {
          connectFrom = cardId
          return
        }
        if (connectFrom === cardId) {
          connectFrom = null
          enterConnectMode()
          return
        }
        board.lines = board.lines || []
        var source = board.cards.find(function (c) { return c.id === connectFrom })
        var target = board.cards.find(function (c) { return c.id === cardId })
        var isWorkflow = source.type === 'workflow' && target.type === 'workflow'
        var line = { id: uid(), from: connectFrom, to: cardId }
        if (isWorkflow) Object.assign(line, { workflow: true, channel: 'main', output: 0, input: 0 })
        board.lines.push(line)
        connectFrom = null
        connectMode = false
        renderLines()
        scheduleSave()
        if (isWorkflow) wfEditLine(line)
      }

      function reRender() {
        // Migrate the original text-only placeholder entries without losing text.
        var claimed = {}
        board.cards.slice().forEach(function (c) {
          if (c.type !== 'column') return
          c.meta = c.meta || {}
          c.meta.cardIds = (Array.isArray(c.meta.cardIds) ? c.meta.cardIds : []).filter(function (id) {
            var child = board.cards.find(function (x) { return x.id === id && x.type !== 'column' })
            if (!child || claimed[id]) return false
            claimed[id] = true
            return true
          })
          if (Array.isArray(c.meta.items)) {
            c.meta.items.forEach(function (item) {
              var child = { id: uid(), type: 'note', x: c.x, y: c.y, w: 240, h: 60,
                text: typeof item === 'string' ? item : String((item && item.text) || ''), meta: {} }
              board.cards.push(child); c.meta.cardIds.push(child.id)
            })
            delete c.meta.items
          }
        })
        // Remove all then re-add, preserving order/positions.
        Object.keys(cardEls).forEach(function (id) { cardEls[id].remove() })
        cardEls = {}
        board.cards.forEach(renderCard)
        layoutColumns()
        updateScrollbars()
      }

      // ---- edit lifecycle ----
      function startEdit(card, ta) {
        editingId = card.id
        var node = cardEls[card.id]
        if (node) node.classList.add('mn-editing')
        ta.focus()
        if (typeof ta.select === 'function') ta.select()
      }
      function stopEdit(card) {
        if (editingId !== card.id) return
        editingId = null
        var node = cardEls[card.id]
        if (node) node.classList.remove('mn-editing')
      }

      // ---- selection ----
      function blurEditing() {
        var active = document.activeElement
        if (active && typeof active.blur === 'function') active.blur()
        if (editingId && cardEls[editingId]) cardEls[editingId].classList.remove('mn-editing')
        editingId = null
      }
      function enterCardEdit(node, card, event, hook) {
        blurEditing()
        var next = {}; next[card.id] = true
        applySelection(next)
        editingId = card.id
        node.classList.add('mn-editing')
        var fn = node[hook || '__edit']
        if (typeof fn === 'function') fn(event)
      }
      function applySelection(ids) {
        // `ids` is the full set of currently-selected card ids.
        Object.keys(selectedIds).forEach(function (id) {
          if (!(id in ids) && cardEls[id]) cardEls[id].classList.remove('mn-selected')
        })
        Object.keys(ids).forEach(function (id) {
          if (cardEls[id]) cardEls[id].classList.add('mn-selected')
        })
        selectedIds = ids
      }
      function select(id) {
        blurEditing()
        var next = {}
        if (id) next[id] = true
        applySelection(next)
      }
      function selectMany(idsArr) {
        blurEditing()
        var next = {}
        ;(idsArr || []).forEach(function (id) { next[id] = true })
        applySelection(next)
      }
      function clearSelection() { select(null) }
      function deleteSelected() {
        var ids = Object.keys(selectedIds)
        if (ids.length === 0) return
        ids.forEach(function (id) {
          // Deleting a column releases its contents onto the board.
          detachFromColumn(id)
          var idx = board.cards.findIndex(function (c) { return c.id === id })
          if (idx >= 0) board.cards.splice(idx, 1)
          var node = cardEls[id]
          if (node) node.remove()
          delete cardEls[id]
        })
        applySelection({})
        board.lines = (board.lines || []).filter(function (l) { return ids.indexOf(l.from) < 0 && ids.indexOf(l.to) < 0 })
        renderLines()
        scheduleSave()
        updateScrollbars()
      }

      // ---- unified card interaction controller ----
      // Every card in every board uses the same three gestures:
      //   click = select, press-and-drag = move, double-click = edit/open.
      // Internal inputs/buttons/canvas/media stay inert until edit mode begins.
      function isResizeGesture(target, node) {
        var current = target
        while (current && current !== node) {
          // 🔴 改动 2026-09-23 · 图片角点（mn-img-corner）也算缩放手势：
          // 压住角点绝不触发卡片移动/列预览
          if (current.classList && (current.classList.contains('mn-resize-handle') || current.classList.contains('mn-img-corner'))) return true
          current = current.parentElement
        }
        return false
      }
      // 🔴 改动 2026-09-24 · 视图态动作豁免：卡片内标记 mn-view-action 的控件
      // （如 todo 的勾选/删除/排序把手）在非编辑状态也可直接操作，
      // 不被卡片的捕获拦截（选中/拖动/双击进编辑）吞掉
      function isViewAction(target, node) {
        var current = target
        while (current && current !== node) {
          if (current.classList && current.classList.contains('mn-view-action')) return true
          // audio/video 媒体控件视图态直通（播放/进度条可直接操作）
          if (current.tagName === 'AUDIO' || current.tagName === 'VIDEO') return true
          current = current.parentElement
        }
        return false
      }
      // 🔴 改动 2026-09-24 · Ctrl 动作豁免：标记 mn-ctrl-action 的元素（如 todo 文字里的
      // URL span）仅在按住 Ctrl 时绕过视图态捕获拦截（Ctrl+点击打开链接）；
      // 不按 Ctrl 时普通点击仍是选中卡片，不产生死区
      // 🔴 改动 2026-09-24 · 视图态仅点击豁免：标记 mn-view-click 的区域（如 upload 卡）
      // 单击直接触发自身功能，但仍可按住拖动卡片（pointerdown 不豁免）
      function isViewClick(target, node) {
        var current = target
        while (current && current !== node) {
          if (current.classList && current.classList.contains('mn-view-click')) return true
          current = current.parentElement
        }
        return false
      }
      function isCtrlAction(target, node) {
        var current = target
        while (current && current !== node) {
          if (current.classList && current.classList.contains('mn-ctrl-action')) return true
          current = current.parentElement
        }
        return false
      }
      function attachCardInteraction(node, card) {
        var gesture = null

        // 🔴 改动 2026-09-24 · Ctrl+左键 URL 通过配套扩展在 DSH 以外的窗口打开
        function ctrlUrl(e) {
          if (!e.ctrlKey || e.button !== 0) return null
          var target = e.target
          var raw = target && target.__evoloopUrlAt ? target.__evoloopUrlAt(e) : null
          var todoLink = target && target.closest ? target.closest('.mn-todo-url') : null
          if (!raw && todoLink) raw = todoLink.textContent
          if (!raw && card.type === 'link' && target.closest && target.closest('.mn-link-url')) raw = card.meta && card.meta.url
          if (!raw) return null
          try {
            var url = new URL(/^https?:\/\//i.test(raw) ? raw : 'https://' + raw)
            return /^(https?:)$/.test(url.protocol) ? url.href : null
          } catch (error) { return null }
        }

        node.addEventListener('pointerdown', function (e) {
          if (e.button !== 0) return
          if (ctrlUrl(e)) return
          if (isResizeGesture(e.target, node)) return
          if (isViewAction(e.target, node)) return
          if (e.ctrlKey && isCtrlAction(e.target, node)) return
          // In connect mode a click selects the card for a line, not a drag.
          if (connectMode) return
          // Once editing, all controls inside this card receive native behavior.
          if (editingId === card.id) return
          e.preventDefault()
          e.stopPropagation()
          // If this card isn't selected yet, start a fresh single selection; if it
          // already is (e.g. via a box selection), keep the group so we drag it all.
          if (!selectedIds[card.id]) select(card.id)
          // 🔴 改动 2026-09-25 · Lock Position：锁定的卡片可选中但不可拖拽（自身起手）
          if (card.meta && card.meta.locked) return
          var startX = e.clientX, startY = e.clientY
          var startPos = {}   // cardId -> {x,y} at drag start, for all selected cards
          var startColumnOrders = {}
          board.cards.forEach(function (c) {
            if (c.type === 'column' && c.meta && Array.isArray(c.meta.cardIds)) startColumnOrders[c.id] = c.meta.cardIds.slice()
          })
          Object.keys(selectedIds).forEach(function (id) {
            var c = board.cards.find(function (x) { return x.id === id })
            if (c) startPos[id] = { x: c.x, y: c.y }
            if (c && c.type === 'column') columnChildren(c).forEach(function (child) {
              startPos[child.id] = { x: child.x, y: child.y }
            })
          })
          // 🔴 改动 2026-09-26 · Alt+拖拽复制卡片：按下时或越过阈值瞬间按住 Alt 均触发
          var altDupArmed = e.altKey
          var dupIds = null        // null=未尝试；[]=无副本；[id..]=本次复制出的卡片
          var origSelIds = Object.keys(selectedIds)
          gesture = { moved: false }
          // 🔴 改动 2026-09-23 · 列预览去抖：滞回目标列 + 落点不变时不重复重排
          var lastPreviewTarget = null
          var lastPreviewKey = ''

          // 🔴 改动 2026-09-26 · Alt+拖拽复制：深拷贝当前选中的非列卡片并改拖副本。
          // todo 副本是一张全新清单：勾选状态与进程条标志都清零（done/mission=false），
          // 只复制文字与层级；副本不加入任何列；列卡片不参与复制（含子卡引用）
          function duplicateSelectionForDrag() {
            var srcIds = Object.keys(selectedIds).filter(function (id) {
              var c = board.cards.find(function (x) { return x.id === id })
              return c && c.type !== 'column'
            })
            if (!srcIds.length) return null
            var created = []
            var nextSel = {}
            srcIds.forEach(function (id) {
              var c = board.cards.find(function (x) { return x.id === id })
              if (!c) return
              var copy = JSON.parse(JSON.stringify(c))
              copy.id = uid()
              if (copy.meta && Array.isArray(copy.meta.items)) {
                copy.meta.items.forEach(function (it) { if (it) { it.mission = false; it.done = false } })
              }
              board.cards.push(copy)
              renderCard(copy)
              created.push(copy.id)
              nextSel[copy.id] = true
              startPos[copy.id] = { x: copy.x, y: copy.y }
              delete startPos[id]   // 原件不再随拖移动
            })
            Object.keys(selectedIds).forEach(function (id) {
              var c = board.cards.find(function (x) { return x.id === id })
              if (c && c.type === 'column') nextSel[id] = true
            })
            applySelection(nextSel)
            renderLines()
            return created
          }
          function onMove(ev) {
            var dx = ev.clientX - startX
            var dy = ev.clientY - startY
            if (!gesture.moved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
              gesture.moved = true
              draggingCards = true
              node.classList.add('mn-dragging')
              // Alt+拖拽：越过阈值时复制选区，之后拖的是副本，原件留原地
              if ((altDupArmed || ev.altKey) && dupIds === null) dupIds = duplicateSelectionForDrag() || []
            }
            if (gesture.moved) {
              // Move in world space, divided by zoom so it stays under the cursor.
              var w = screenToWorld(ev.clientX, ev.clientY)
              var s = screenToWorld(startX, startY)
              var dWX = w.x - s.x, dWY = w.y - s.y
              Object.keys(startPos).forEach(function (id) {
                var c = board.cards.find(function (x) { return x.id === id })
                var el = cardEls[id]
                if (!c || !el) return
                if (c.meta && c.meta.locked) return   // Lock Position：整组拖拽也跳过锁定卡
                c.x = startPos[id].x + dWX
                c.y = startPos[id].y + dWY
                el.style.left = c.x + 'px'
                el.style.top = c.y + 'px'
              })
              var target = columnAt(w.x, w.y, selectedIds)
              // 滞回：光标刚滑出列边界 24px（世界坐标）内仍瞄准上一目标列，
              // 否则边界来回穿越会让卡片反复插入/移出 → 列高抖动
              if (!target && lastPreviewTarget) {
                var lt = lastPreviewTarget
                if (w.x >= lt.x - 24 && w.x <= lt.x + lt.w + 24 && w.y >= lt.y - 24 && w.y <= lt.y + lt.h + 24) target = lt
              }
              var moving = board.cards.filter(function (c) {
                var parent = columnFor(c.id)
                return selectedIds[c.id] && c.type !== 'column' && !(parent && selectedIds[parent.id])
              }).sort(function (a, b) { return startPos[a.id].y - startPos[b.id].y })
              if (moving.length) {
                // 落点（列 + 插入位）没变就不重排，避免每次 pointermove 都 splice 一遍
                var previewKey = (target ? target.id : '-') + ':' + previewIndexOf(target, moving, w.y)
                if (previewKey !== lastPreviewKey) {
                  previewColumnDrop(moving, target, w.y)
                  lastPreviewKey = previewKey
                }
                lastPreviewTarget = target
              }
              board.cards.forEach(function (c) {
                if (c.type === 'column' && cardEls[c.id]) cardEls[c.id].classList.toggle('mn-drop-target', c === target && card.type !== 'column')
              })
              renderLines()
            }
          }
          function onUp(ev) {
            node.classList.remove('mn-dragging')
            document.removeEventListener('pointermove', onMove)
            document.removeEventListener('pointerup', onUp)
            document.removeEventListener('pointercancel', onCancel)
            if (gesture.moved) {
              var point = screenToWorld(ev.clientX, ev.clientY)
              var target = columnAt(point.x, point.y, selectedIds)
              var moving = board.cards.filter(function (c) {
                var parent = columnFor(c.id)
                return selectedIds[c.id] && c.type !== 'column' && !(parent && selectedIds[parent.id])
              }).sort(function (a, b) { return startPos[a.id].y - startPos[b.id].y })
              if (moving.length) previewColumnDrop(moving, target, point.y)
            }
            finishDrag()
          }
          function finishDrag() {
            draggingCards = false
            board.cards.forEach(function (c) {
              if (cardEls[c.id]) cardEls[c.id].classList.remove('mn-drop-target', 'mn-column-shifting')
            })
            layoutColumns()
            if (gesture && gesture.moved) scheduleSave()
            renderLines()
            gesture = null
          }
          function onCancel() {
            // Alt 复制出的副本随取消一并撤掉，选区还原到原件
            if (dupIds && dupIds.length) {
              dupIds.forEach(function (id) {
                var ci = board.cards.findIndex(function (c) { return c.id === id })
                if (ci >= 0) board.cards.splice(ci, 1)
                if (cardEls[id]) { cardEls[id].remove(); delete cardEls[id] }
                delete startPos[id]
              })
              applySelection(origSelIds.reduce(function (acc, id) { acc[id] = true; return acc }, {}))
            }
            board.cards.forEach(function (c) {
              if (c.type === 'column' && startColumnOrders[c.id]) c.meta.cardIds = startColumnOrders[c.id].slice()
            })
            Object.keys(startPos).forEach(function (id) {
              var c = board.cards.find(function (x) { return x.id === id })
              if (c) { c.x = startPos[id].x; c.y = startPos[id].y }
              if (c && cardEls[id]) { cardEls[id].style.left = c.x + 'px'; cardEls[id].style.top = c.y + 'px' }
            })
            node.classList.remove('mn-dragging')
            document.removeEventListener('pointermove', onMove)
            document.removeEventListener('pointerup', onUp)
            document.removeEventListener('pointercancel', onCancel)
            finishDrag()
          }
          document.addEventListener('pointermove', onMove)
          document.addEventListener('pointerup', onUp)
          document.addEventListener('pointercancel', onCancel)
        }, true)

        // Capture view-mode clicks before nested form controls can act. In edit
        // mode the event passes through and the card's bubble listener below only
        // keeps it from reaching the canvas.
        node.addEventListener('click', function (e) {
          var url = ctrlUrl(e)
          if (url) {
            e.preventDefault()
            e.stopPropagation()
            var request = new CustomEvent('evoloop:open-other-window', { detail: { url: url }, cancelable: true })
            if (document.dispatchEvent(request)) {
              window.alert('请先加载 Evoloop Window Bridge 浏览器扩展，然后刷新 DSH 页面。')
            }
            return
          }
          if (editingId === card.id || isResizeGesture(e.target, node) || isViewAction(e.target, node)) return
          if (e.ctrlKey && isCtrlAction(e.target, node)) return
          e.preventDefault()
          e.stopPropagation()
          if (connectMode) handleConnect(card.id)
          else if (!selectedIds[card.id]) select(card.id)
        }, true)

        node.addEventListener('dblclick', function (e) {
          if (editingId === card.id || isResizeGesture(e.target, node) || isViewAction(e.target, node)) return
          if (e.ctrlKey && isCtrlAction(e.target, node)) return
          if (isViewClick(e.target, node)) return
          e.preventDefault()
          e.stopPropagation()
          enterCardEdit(node, card, e)
        }, true)

        // Right-click selects the card and opens its context menu.
        // 🔴 改动 2026-09-25 · 右键菜单由 context-menu 子模块提供（首个功能 Lock Position）
        // ↳ 改前[js]: 右键仅选中卡片并 suppress 原生菜单（菜单未实现）
        // ↳ 改后[js]: getClientModule('context-menu').open(card, node, clientX, clientY)
        node.addEventListener('contextmenu', function (e) {
          e.preventDefault()
          e.stopPropagation()
          select(card.id)
          var cm = getClientModule('context-menu')
          if (cm) cm.open(card, node, e.clientX, e.clientY)
        })

        // Editing controls may bubble; never let them trigger the canvas.
        node.addEventListener('click', function (e) {
          e.stopPropagation()
        })
      }

      // ---- add menu (always-visible left toolbar) ----
      function buildAddMenu() {
        var menu = el('div', { class: 'mn-addmenu', style: { display: 'flex' } }, [ el('h4', {}, [t('添加')]) ])
        CONTENT_TYPES.forEach(function (item) {
          var row = el('div', {
            class: 'mn-additem' + (item.enabled ? '' : ' mn-disabled'),
            title: item.enabled ? t('添加 ') + t(item.label) : t(item.label) + t('（即将支持）'),
          }, [
            el('span', { class: 'mn-ico', style: { background: colorForType(item.type) } }, [item.icon]),
            el('span', { class: 'mn-lbl' }, [t(item.label)]),
          ])
          if (item.enabled) {
            row.addEventListener('click', function (e) {
              e.stopPropagation()
              if (item.type === 'line') enterConnectMode()
              else createCard(item.type)
              hideAddMenu()
            })
            // Drag a menu item onto the canvas to create a card there.
            row.setAttribute('draggable', 'true')
            row.addEventListener('dragstart', function (e) {
              try { e.dataTransfer.setData('text/plain', item.type); e.dataTransfer.effectAllowed = 'copy' } catch (err) {}
            })
          }
          menu.appendChild(row)
        })
        return menu
      }

      function colorForType(type) {
        var map = {
          note: '#c6c6c6', link: '#92b9db', todo: '#9cc69f', line: '#b8b8b8',
          board: '#9ab9e0', column: '#b9b9b9', comment: '#d5b58b', table: '#baa9d4',
          sketch: '#c8c8c8', color: '#d3a7bb', document: '#c6c6c6', audio: '#9cc5b5',
          map: '#cdbd8c', video: '#a1c4d1', image: '#bbc6d4', upload: '#c6c6c6', draw: '#c8c8c8',
        }
        return map[type] || '#6d5efc'
      }

      function createCard(type, sx, sy, targetColumn) {
        if (!type) return
        // Default: center in the panel body (this is a right-side panel, not the viewport).
        var rect = bodyEl ? bodyEl.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight }
        var cx = (typeof sx === 'number') ? sx : rect.left + rect.width / 2
        var cy = (typeof sy === 'number') ? sy : rect.top + rect.height / 2
        var c = screenToWorld(cx, cy)
        var min = cardMin(type)
        var card = { id: uid(), type: type, x: Math.round(c.x - min.w / 2), y: Math.round(c.y - min.h / 2), w: min.w, h: min.h, text: '', meta: {} }
        board.cards.push(card)
        if (targetColumn && type !== 'column') {
          targetColumn.meta.cardIds.push(card.id)
        }
        renderCard(card)
        select(card.id)
        // Selected, not editing: the user can press Delete to remove it, or
        // double-click to start editing text.
        scheduleSave()
        updateScrollbars()
        return card
      }

      // ---- menu (always visible left toolbar) ----
      function showAddMenu() {
        if (addMenuEl) { addMenuEl.style.display = 'flex' }
      }
      function hideAddMenu() {
        // The card menu is a permanent left toolbar; keep it visible.
      }

      // ---- background interaction ----
      function attachBodyEvents() {
        bodyEl.addEventListener('pointerdown', function (e) {
          if (e.button !== 0) return
          hideAddMenu()
          // Box (marquee) select only when starting on the background (not a card).
          if (e.target !== bodyEl && e.target !== gridEl) return
          var rect = bodyEl.getBoundingClientRect()
          var startSX = e.clientX - rect.left
          var startSY = e.clientY - rect.top
          var additive = e.ctrlKey || e.metaKey || e.shiftKey
          var baseIds = Object.keys(selectedIds).filter(function (id) { return cardEls[id] })
          var moved = false

          function updateMarquee() {
            var x1 = Math.min(startSX, marqueeEl._x), y1 = Math.min(startSY, marqueeEl._y)
            var x2 = Math.max(startSX, marqueeEl._x), y2 = Math.max(startSY, marqueeEl._y)
            marqueeEl.style.left = x1 + 'px'
            marqueeEl.style.top = y1 + 'px'
            marqueeEl.style.width = (x2 - x1) + 'px'
            marqueeEl.style.height = (y2 - y1) + 'px'
          }
          function computeSelection() {
            var x1 = Math.min(startSX, marqueeEl._x), y1 = Math.min(startSY, marqueeEl._y)
            var x2 = Math.max(startSX, marqueeEl._x), y2 = Math.max(startSY, marqueeEl._y)
            var sel = additive ? baseIds.slice() : []
            board.cards.forEach(function (c) {
              var el = cardEls[c.id]
              if (!el) return
              // Card's on-screen box (screen coords relative to body origin).
              var cx = board.viewport.x + c.x * board.viewport.zoom
              var cy = board.viewport.y + c.y * board.viewport.zoom
              var cw = (c.w || 240) * board.viewport.zoom
              var chh = (c.h || 150) * board.viewport.zoom
              if (x1 < cx + cw && x2 > cx && y1 < cy + chh && y2 > cy) {
                if (sel.indexOf(c.id) < 0) sel.push(c.id)
              }
            })
            selectMany(sel)
          }
          function onMove(ev) {
            marqueeEl._x = ev.clientX - rect.left
            marqueeEl._y = ev.clientY - rect.top
            if (!moved && (Math.abs(marqueeEl._x - startSX) > 3 || Math.abs(marqueeEl._y - startSY) > 3)) {
              moved = true
            }
            if (moved) {
              marqueeEl.style.display = 'block'
              updateMarquee()
              computeSelection()
            }
          }
          function onUp() {
            marqueeEl.style.display = 'none'
            marqueeEl._x = 0; marqueeEl._y = 0
            document.removeEventListener('pointermove', onMove)
            document.removeEventListener('pointerup', onUp)
            // A plain click (no drag) on empty background clears the selection.
            if (!moved && !additive) clearSelection()
          }
          document.addEventListener('pointermove', onMove)
          document.addEventListener('pointerup', onUp)
        })

        // Middle-button drag pans the canvas, from anywhere inside it
        // (including over cards — their own handlers only claim button 0).
        // preventDefault also stops the browser's middle-click autoscroll.
        bodyEl.addEventListener('pointerdown', function (e) {
          if (e.button !== 1) return
          e.preventDefault()
          hideAddMenu()
          var startX = e.clientX, startY = e.clientY
          var moved = false
          bodyEl.classList.add('mn-panning')
          function onMove(ev) {
            if ((ev.buttons & 4) === 0) { onUp(); return }
            var dx = ev.clientX - startX, dy = ev.clientY - startY
            startX = ev.clientX; startY = ev.clientY
            if (!board.cards.length || (!dx && !dy)) return
            if (dx || dy) moved = true
            var s = scrollMetrics()
            board.viewport.x += clamp(s.cx + dx, s.minCx, s.maxCx) - s.cx
            board.viewport.y += clamp(s.cy + dy, s.minCy, s.maxCy) - s.cy
            applyViewport()
          }
          function onUp() {
            document.removeEventListener('pointermove', onMove)
            document.removeEventListener('pointerup', onUp)
            bodyEl.classList.remove('mn-panning')
            if (moved) { scheduleViewSave(); updateScrollbars() }
          }
          document.addEventListener('pointermove', onMove)
          document.addEventListener('pointerup', onUp)
        })

        bodyEl.addEventListener('wheel', function (e) {
          e.preventDefault()
          if (e.ctrlKey || e.metaKey) {
            // Ctrl/Cmd + wheel → zoom about the cursor, with snapping near 100%.
            var rect = bodyEl.getBoundingClientRect()
            var mx = e.clientX - rect.left
            var my = e.clientY - rect.top
            var old = board.viewport.zoom
            var next = snapZoom(old, clamp(old * (e.deltaY < 0 ? 1.1 : 0.9), 0.25, 3))
            var wx = (mx - board.viewport.x) / old
            var wy = (my - board.viewport.y) / old
            board.viewport.x = mx - wx * next
            board.viewport.y = my - wy * next
            board.viewport.zoom = next
            applyViewport()
            scheduleViewSave()
            updateZoomLabel()
          } else {
            // Plain wheel → scroll the canvas vertically (Shift → horizontally).
            var s = scrollMetrics()
            var vertical = !e.shiftKey
            var frac = vertical ? s.posY : s.posX
            var shown = vertical ? s.showV : s.showH
            if (shown) {
              // Scrolling down (deltaY>0) moves the view toward the bottom/right
              // of the content, so increase the fraction.
              frac = clamp(frac + e.deltaY / 600, 0, 1)
              scrollToOffset(vertical, frac)
            }
          }
        }, { passive: false })

        // Drop a content-type from the add menu onto the canvas → create it there.
        bodyEl.addEventListener('dragover', function (e) { e.preventDefault() })
        bodyEl.addEventListener('drop', function (e) {
          e.preventDefault()
          // 🔴 改动 2026-09-23 · 拖入本地图片文件 → 读为 dataURL 建图片卡片（按高度定档）
          var files = []
          try { files = e.dataTransfer && e.dataTransfer.files ? Array.prototype.slice.call(e.dataTransfer.files) : [] } catch (err) {}
          var images = files.filter(function (f) { return /^image\//.test(f.type) })
          if (images.length) {
            images.forEach(function (f, i) { importImageFile(f, e.clientX, e.clientY, i) })
            return
          }
          var type = ''
          try { type = e.dataTransfer ? (e.dataTransfer.getData('text/plain') || '') : '' } catch (err) {}
          if (type && CONTENT_TYPES.some(function (c) { return c.type === type })) {
            var point = screenToWorld(e.clientX, e.clientY)
            var target = columnAt(point.x, point.y)
            if (type === 'line') { enterConnectMode(); return }
            var child = createCard(type, e.clientX, e.clientY)
            if (target && type !== 'column') { putInColumn([child], target, point.y); scheduleSave() }
            hideAddMenu()
          }
        })
      }

      // 🔴 改动 2026-09-23 · 拖入图片：以高度为准按比例定档 ——
      // 高 <200px 放大到 200；200~540 保持原尺寸；>540 缩小到 540，宽度随比例缩放。
      // 多图依次错开 24px 落点，卡片中心对准拖放位置。
      function importImageFile(file, sx, sy, offsetIdx) {
        var reader = new FileReader()
        reader.onload = function () {
          var url = String(reader.result || '')
          if (!url) return
          var probe = new Image()
          probe.onload = function () {
            var nw = probe.naturalWidth || 0, nh = probe.naturalHeight || 0
            if (!nw || !nh) return
            var h = nh < 200 ? 200 : (nh > 540 ? 540 : nh)
            var w = Math.round(nw * (h / nh))
            var card = createCard('image', sx, sy)
            card.meta.url = url
            card.w = w
            card.h = h
            var c = screenToWorld(sx, sy)
            var off = (offsetIdx || 0) * 24
            card.x = Math.round(c.x - w / 2) + off
            card.y = Math.round(c.y - h / 2) + off
            renderCard(card)
            scheduleSave()
            updateScrollbars()
          }
          probe.src = url
        }
        reader.readAsDataURL(file)
      }

      function currentZoomPct() { return Math.round(board.viewport.zoom * 100) }
      // Snap a candidate zoom to 100% when it lands within 90%–120% and is
      // moving toward 100% (so it's easy to land exactly on 100%).
      function snapZoom(old, next) {
        var pct = next * 100
        if (pct >= 90 && pct <= 120 && Math.abs(next - 1) <= Math.abs(old - 1)) return 1
        return next
      }
      function setZoom(percent) {
        var next = clamp(percent / 100, 0.25, 3)
        var rect = bodyEl.getBoundingClientRect()
        var mx = rect.width / 2, my = rect.height / 2
        var old = board.viewport.zoom
        var wx = (mx - board.viewport.x) / old
        var wy = (my - board.viewport.y) / old
        board.viewport.x = mx - wx * next
        board.viewport.y = my - wy * next
        board.viewport.zoom = next
        applyViewport()
        updateZoomLabel()
        scheduleViewSave()
      }

      function fitView() {
        // Reset the viewport to the top-left origin at 100% (simple "Home" fit).
        board.viewport = { x: 0, y: 0, zoom: 1 }
        applyViewport()
        updateZoomLabel()
        scheduleViewSave()
      }
      var viewBtnLabelEl = null
      var viewMenuEl = null
      var viewDocHandler = null
      function buildViewMenuItems() {
        if (!viewMenuEl) return
        viewMenuEl.innerHTML = ''
        var cur = currentZoomPct()
        for (var p = 25; p <= 300; p++) {
          ;(function (pct) {
            var item = el('button', {
              class: 'mn-view-item' + (pct === cur ? ' mn-active' : ''),
              type: 'button',
              onclick: function (e) { e.stopPropagation(); setZoom(pct); closeViewMenu() },
            }, [pct + '%'])
            viewMenuEl.appendChild(item)
            if (pct === cur) item.scrollIntoView({ block: 'nearest' })
          })(p)
        }
      }
      function updateZoomLabel() {
        if (viewBtnLabelEl) {
          var pct = currentZoomPct()
          viewBtnLabelEl.textContent = (pct === 100) ? t('视图') : pct + '%'
        }
      }
      function openViewMenu() {
        buildViewMenuItems()
        if (viewMenuEl) viewMenuEl.style.display = 'block'
      }
      function closeViewMenu() {
        if (viewMenuEl) viewMenuEl.style.display = 'none'
      }
      function toggleViewMenu() {
        if (viewMenuEl && viewMenuEl.style.display === 'block') { closeViewMenu() } else { openViewMenu() }
      }

      // ---- keyboard ----
      function onKey(e) {
        if (childApp || !panelOpen) return
        // Scope the key handling to this board surface.
        if (isSub) {
          // Sub-board modal: handle keys only inside my own modal.
          if (e.target && root && !root.contains(e.target)) return
        } else {
          // Main panel: ignore keys that belong to a nested board modal on top.
          if (e.target && e.target.closest && e.target.closest('.' + MODAL_CLASS)) return
        }
        // 🔴 改动 2026-09-29 · 选中卡片方向键移动位置：箭头 10px，Shift+箭头 50px（大步幅）；
        // 编辑态/文本框内让位给光标；锁定卡与列内子卡不动（列内位置由 layoutColumns 管理）
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          var arrowTarget = e.target
          if (arrowTarget && (arrowTarget.tagName === 'TEXTAREA' || arrowTarget.tagName === 'INPUT')) return
          if (editingId) return
          var arrowIds = Object.keys(selectedIds)
          if (!arrowIds.length) return
          var step = e.shiftKey ? 50 : 10
          var dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
          var dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0
          var movedAny = false
          arrowIds.forEach(function (id) {
            if (columnFor(id)) return
            var c = null
            for (var ai = 0; ai < board.cards.length; ai++) {
              if (board.cards[ai].id === id) { c = board.cards[ai]; break }
            }
            if (!c || (c.meta && c.meta.locked)) return
            c.x += dx; c.y += dy
            var n = cardEls[id]
            if (n) { n.style.left = c.x + 'px'; n.style.top = c.y + 'px' }
            movedAny = true
          })
          if (!movedAny) return
          e.preventDefault()
          layoutColumns()
          renderLines()
          scheduleSave()
          updateScrollbars()
          return
        }
        if (e.key === 'Escape') {
          if (isSub && !editingId && !Object.keys(selectedIds).length) { close(); return }
          hideAddMenu()
          clearSelection()
          return
        }
        if (e.key === 'F2') {
          // Rename the selected card's headline. Cards without a dedicated
          // headline fall back to their default edit action.
          var kt = e.target
          if (kt && (kt.tagName === 'TEXTAREA' || kt.tagName === 'INPUT')) return
          var sel = Object.keys(selectedIds)
          if (sel.length !== 1) return
          var f2node = cardEls[sel[0]]
          var f2card = null
          for (var fi = 0; fi < board.cards.length; fi++) {
            if (board.cards[fi].id === sel[0]) { f2card = board.cards[fi]; break }
          }
          if (!f2node || !f2card) return
          if (typeof f2node.__rename !== 'function' && typeof f2node.__edit !== 'function') return
          e.preventDefault()
          enterCardEdit(f2node, f2card, e, typeof f2node.__rename === 'function' ? '__rename' : '__edit')
          return
        }
        if (e.key === 'Delete' || e.key === 'Backspace') {
          // Typing in any text field — the DSH session dialog/composer or a note
          // being edited — must edit text, never delete a board card. The key's
          // target is the focused element, so a composer/textarea keypress is
          // never turned into a card deletion.
          var t = e.target
          if (t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT')) return
          if (Object.keys(selectedIds).length > 0) { e.preventDefault(); deleteSelected() }
        }
      }

      // ---- narrow left icon rail (Evoloop-style: Home / content types / Trash) ----
      // Mirrors Evoloop's rail: Home at the top, the content-type icons in the
      // middle (Note→Sketch, then a "more" toggle, then Add image/Upload/Draw),
      // and Trash at the bottom. The current type is highlighted (blue tile).
      var RAIL_MAIN = ['note', 'link', 'todo', 'workflow', 'line', 'board', 'column', 'comment', 'table']
      var RAIL_MORE = ['sketch', 'color', 'document', 'audio', 'map', 'video']
      var RAIL_TAIL = ['image', 'upload', 'draw']
      var PINNED_KEY = 'evoloop.pinnedComponents'
      var DEFAULT_PINNED = RAIL_MAIN.concat(RAIL_TAIL)
      var pinnedTypes = DEFAULT_PINNED.slice()
      try {
        var storedPins = JSON.parse(window.localStorage.getItem(PINNED_KEY) || 'null')
        if (Array.isArray(storedPins)) pinnedTypes = storedPins.filter(function (type, i, all) {
          return all.indexOf(type) === i && CONTENT_TYPES.some(function (c) { return c.type === type && c.enabled })
        })
      } catch (e) {}
      var railActiveType = null
      var railDragType = null
      var railDragSource = null
      var pinnedListEl = null
      var componentPoolEl = null
      function railTile(type) {
        var item = null
        CONTENT_TYPES.some(function (c) { if (c.type === type) { item = c; return true } return false })
        var tile = el('button', { class: 'mn-rail-item' + (item && item.enabled ? '' : ' mn-disabled') +
          (railActiveType === type ? ' mn-active' : ''), title: item ? t(item.label) : type, dataset: { type: type } },
          [ el('span', { class: 'mn-rail-item-icon' }, [railIcon(type)]),
            el('span', { class: 'mn-rail-item-label' }, [item ? t(item.label) : type]) ])
        if (item && item.enabled) {
          tile.setAttribute('draggable', 'true')
          tile.addEventListener('dragstart', function (e) {
            railDragType = type
            railDragSource = 'rail'
            try { e.dataTransfer.setData('text/plain', type); e.dataTransfer.effectAllowed = 'copy' } catch (err) {}
          })
          tile.addEventListener('dragend', function () { railDragType = null; railDragSource = null; storePinnedTypes() })
        }
        return tile
      }
      function setRailActive(type) {
        railActiveType = type
        if (railEl) {
          Array.prototype.forEach.call(railEl.querySelectorAll('.mn-rail-item'), function (t) {
            var active = t.dataset.type === type
            t.classList.toggle('mn-active', active)
          })
        }
      }
      var railEl = null
      function railIcon(type) {
        var icon = contentIcon(type)
        var paths = {
          note: 'M3 6h18 M3 10h18 M3 14h18 M3 18h13',
          todo: 'M3 7l2 2 3-4 M11 7h10 M3 16l2 2 3-4 M11 16h10',
          board: 'M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h6v6h-6z',
          comment: 'M3 6h18 M3 10h18 M3 14h18 M10 18h4',
          column: 'M3 3h18v18H3z M3 8h18'
        }
        if (paths[type]) icon.firstChild.setAttribute('d', paths[type])
        if (type === 'board') { icon.setAttribute('fill','currentColor'); icon.setAttribute('stroke','none') }
        return icon
      }
      function storePinnedTypes() {
        try { window.localStorage.setItem(PINNED_KEY, JSON.stringify(pinnedTypes)) } catch (e) {}
      }
      function renderPinned() {
        if (!pinnedListEl) return
        pinnedListEl.textContent = ''
        pinnedTypes.forEach(function (type) { pinnedListEl.appendChild(railTile(type)) })
      }
      function movePinnedLive(type, index) {
        if (!pinnedListEl) return
        var before = new Map()
        Array.prototype.forEach.call(pinnedListEl.children, function (node) { before.set(node.dataset.type, node.getBoundingClientRect().top) })
        var old = pinnedTypes.indexOf(type)
        if (old >= 0) { pinnedTypes.splice(old, 1); if (old < index) index-- }
        index = Math.max(0, Math.min(index, pinnedTypes.length))
        pinnedTypes.splice(index, 0, type)
        var nodes = {}
        Array.prototype.forEach.call(pinnedListEl.children, function (node) { nodes[node.dataset.type] = node })
        if (!nodes[type]) nodes[type] = railTile(type)
        pinnedTypes.forEach(function (id) { pinnedListEl.appendChild(nodes[id]) })
        Array.prototype.forEach.call(pinnedListEl.children, function (node) {
          var oldTop = before.get(node.dataset.type)
          if (oldTop == null || node.dataset.type === railDragType) return
          var delta = oldTop - node.getBoundingClientRect().top
          if (!delta) return
          node.classList.remove('mn-pin-shifting'); node.style.transition = 'none'
          node.style.transform = 'translateY(' + delta + 'px)'; void node.offsetHeight
          node.classList.add('mn-pin-shifting'); node.style.transition = ''; node.style.transform = ''
        })
      }
      function buildComponentPool() {
        componentPoolEl = el('aside', { class: 'mn-component-pool', hidden: 'hidden' })
        componentPoolEl.appendChild(el('div', { class: 'mn-component-head' }, [
          el('strong', {}, [t('所有卡片')]), el('span', {}, [t('拖到左侧以固定')]),
        ]))
        var list = el('div', { class: 'mn-component-list' })
        CONTENT_TYPES.forEach(function (item) {
          if (!item.enabled) return
          var row = el('button', { class: 'mn-component-item', type: 'button', draggable: 'true', dataset: { type: item.type }, title: t(item.label) }, [
            el('span', { class: 'mn-rail-item-icon' }, [railIcon(item.type)]),
            el('span', { class: 'mn-rail-item-label' }, [t(item.label)]),
          ])
          row.addEventListener('dragstart', function (e) {
            railDragType = item.type
            railDragSource = 'pool'
            try { e.dataTransfer.setData('text/plain', item.type); e.dataTransfer.effectAllowed = 'copy' } catch (err) {}
          })
          row.addEventListener('dragend', function () { railDragType = null; railDragSource = null; storePinnedTypes() })
          list.appendChild(row)
        })
        componentPoolEl.appendChild(list)
        componentPoolEl.addEventListener('dragover', function (e) {
          if (railDragSource === 'rail' && railDragType) e.preventDefault()
        })
        componentPoolEl.addEventListener('drop', function (e) {
          if (railDragSource !== 'rail' || !railDragType) return
          e.preventDefault()
          var index = pinnedTypes.indexOf(railDragType)
          if (index >= 0) pinnedTypes.splice(index, 1)
          renderPinned(); storePinnedTypes()
          railDragType = null; railDragSource = null
        })
        return componentPoolEl
      }
      function buildRail() {
        railEl = el('div', { class: 'mn-rail' })
        var tools = el('div', { class: 'mn-rail-tools' })
        pinnedListEl = el('div', { class: 'mn-rail-pinned' })
        tools.appendChild(pinnedListEl)
        pinnedListEl.addEventListener('dragover', function (e) {
          // Reordering pinned tools is a customization action and is available
          // only while the Component pool is visibly open. With it closed, a
          // rail drag remains exclusively a drag-to-canvas creation gesture.
          if (!railDragType || !componentPoolEl || componentPoolEl.hasAttribute('hidden')) return
          e.preventDefault(); pinnedListEl.classList.add('mn-pin-target')
          var target = e.target.closest && e.target.closest('.mn-rail-item')
          var index = target ? pinnedTypes.indexOf(target.dataset.type) : pinnedTypes.length
          if (target && e.clientY > target.getBoundingClientRect().top + target.offsetHeight / 2) index++
          movePinnedLive(railDragType, index)
        })
        pinnedListEl.addEventListener('dragleave', function (e) { if (!pinnedListEl.contains(e.relatedTarget)) pinnedListEl.classList.remove('mn-pin-target') })
        pinnedListEl.addEventListener('drop', function (e) {
          if (!componentPoolEl || componentPoolEl.hasAttribute('hidden')) return
          e.preventDefault(); pinnedListEl.classList.remove('mn-pin-target'); storePinnedTypes()
        })
        renderPinned()
        var components = el('button', { class:'mn-rail-item mn-component-toggle', type:'button', title:t('组件库'), 'aria-label':t('组件库'), 'aria-expanded':'false' }, [
          el('span', { class:'mn-rail-item-icon' }, ['＋']), el('span', { class:'mn-rail-item-label' }, [t('组件库')]),
        ])
        components.addEventListener('click', function () {
          var expanded = components.getAttribute('aria-expanded') !== 'true'
          components.setAttribute('aria-expanded', String(expanded))
          if (expanded) componentPoolEl.removeAttribute('hidden'); else componentPoolEl.setAttribute('hidden', 'hidden')
        })
        tools.appendChild(components)
        railEl.appendChild(tools)
        var trash = el('button', { class: 'mn-rail-item mn-rail-trash', title: t('删除选中的卡片'), type:'button' }, [
          el('span', {class:'mn-rail-item-icon'}, [contentIcon('trash')]),
          el('span', {class:'mn-rail-item-label'}, [t('删除')])])
        trash.addEventListener('click', function () { deleteSelected() })
        railEl.appendChild(trash)
        buildComponentPool()
        return railEl
      }

      // ---------------------------------------------------------------------
      // 🔴 改动 2026-09-19 · sync（推送到 GitHub）整体拆分为子模块 lib/client-modules/sync.js
      // ↳ 改前[js]: 此处内联 FIELD_LABELS + changedFields/computeCardDiff/viewportChanged/titleChanged/
      //   githubIcon/renderBoardPreview/push 对话框状态/openPushDialog/doPush/renderPushDialog 等约 290 行
      // ↳ 改后[js]: 由 ensureClientModule('sync') 注册表模式挂载；共享助手 typeLabel/cardLabel 留在宿主
      // ---------------------------------------------------------------------
      function typeLabel(type) {
        var label = type
        CONTENT_TYPES.some(function (c) { if (c.type === type) { label = c.label; return true } return false })
        return t(label)
      }
      function cardLabel(card) {
        var t = String((card.text || '') || '').trim()
        if (t) return t.length > 24 ? t.slice(0, 24) + '…' : t
        var m = card.meta || {}
        if (m.title) return String(m.title).slice(0, 24)
        if (m.url) return String(m.url).slice(0, 24)
        if (m.name) return String(m.name).slice(0, 24)
        return typeLabel(card.type)
      }

      // 🔴 改动 2026-09-19 · 删除 Evoloop (2.0) 面板全部逻辑（n8n 状态轮询/启停/iframe 嵌入/路线图）；
      // 保留 openN8n 供工作流导出对话框「在 n8n 中运行」使用；新增手动更新机制（Update 按钮，主动点击才检查/应用）
      // ↳ 改前[js]: evoloopStatus + evoloopTimer + refreshEvoloopStatus + startStopN8n + buildEvoloopBody/Overlay + roadmapText，8 秒轮询后台刷新
      // ↳ 改后[js]: openN8n（固定地址）+ runUpdateCheck/runUpdateApply/buildVersionMenu，无定时器、无后台请求
      function openN8n() {
        try { window.open('http://127.0.0.1:5678', '_blank', 'noopener') } catch (e) {}
      }

      // 🔴 改动 2026-09-21 · 版本下拉 + Update 整体拆分为子模块 lib/client-modules/version-menu.js
      // ↳ 改前[js]: 此处内联 runUpdateCheck/runUpdateApply/buildVersionMenu（约 85 行）
      // ↳ 改后[js]: getClientModule('version-menu').buildMenu()；打开面板时统一预载
      function buildVersionMenuMount() {
        var m = getClientModule('version-menu')
        return m ? m.buildMenu() : el('span', {})
      }

      // 🔴 改动 2026-10-02 · 顶栏「项目」下拉改由 project-menu 子模块挂载（同 version-menu 模式）
      function buildProjectMenuMount() {
        var m = getClientModule('project-menu')
        return m ? m.buildMenu() : el('span', {})
      }

      // ---- assemble the overlay ----
      // 🔴 改动 2026-09-19 · 移除 version==='2.0' 的 Evoloop 渲染分支（面板已删，只有 1.0 画板）
      // ↳ 改前[js]: if (version === '2.0') return buildEvoloopOverlay()
      // ↳ 改后[js]: 直接构建画板 overlay
      function build() {
        root = el('div', { id: OVERLAY_ID, lang: language, tabindex: '-1' })
        // Sub-boards occupy the same right-hand panel as their parent.
        if (!isSub && panelWidth) root.style.width = Math.min(panelWidth, maxPanelWidth()) + 'px'
        var topbar = el('div', { class: 'mn-topbar' })
        if (isSub) topbar.appendChild(el('button', {
          class: 'mn-btn mn-board-back', title: t('返回上级画板'), type: 'button',
          onclick: function () { close() },
        }, ['← ' + (opts.parentTitle || t('返回上级画板'))]))
        var titleInput = el('input', { class: 'mn-title', value: board.title, placeholder: t('画板名称') })
        titleInput.addEventListener('input', function () { board.title = titleInput.value; scheduleSave() })
        // View dropdown button: shows "View" at 100%, else the current zoom %.
        var viewBtn = el('button', {
          class: 'mn-view-btn',
          title: t('视图缩放'),
          type: 'button',
          onclick: function (e) { e.stopPropagation(); toggleViewMenu() },
        }, [
          (viewBtnLabelEl = el('span', { class: 'mn-view-label' }, [t('视图')])),
          el('span', { class: 'mn-view-careticon' }, [chevronDownIcon()]),
        ])
        var viewWrap = el('div', { class: 'mn-view' }, [viewBtn])
        viewMenuEl = el('div', { class: 'mn-view-menu' })
        viewWrap.appendChild(viewMenuEl)
        if (!viewDocHandler) {
          viewDocHandler = function (e) {
            if (viewMenuEl && viewMenuEl.style.display === 'block' && !viewWrap.contains(e.target)) {
              closeViewMenu()
            }
          }
          document.addEventListener('click', viewDocHandler)
        }
        var closeBtn = el('button', { class: 'mn-btn mn-close', title: t('关闭'), onclick: function () { close() } }, ['✕'])
        // 🔴 改动 2026-09-19 · sync 按钮改由子模块提供：占位槽 + 异步挂载
        // ↳ 改前[js]: pushBtn 内联创建（githubIcon + openPushDialog 均在本文件）
        // ↳ 改后[js]: pushSlot 占位，ensureClientModule('sync') 就绪后替换为 mod.createButton()
        var pushSlot = el('span', { class: 'mn-push-slot', style: { display: 'contents' } })
        // 🔴 改动 2026-09-21 · 注册表已就绪时同步挂按钮（避免微任务延迟导致按钮短暂缺席/测试时序敏感）
        // ↳ 改前: 一律走 ensureClientModule().then 异步替换槽位
        // ↳ 改后: getClientModule 命中则直接创建按钮；未命中才异步拉取后替换
        var syncModReady = getClientModule('sync')
        var pushBtn = syncModReady ? syncModReady.createButton() : pushSlot
        if (!syncModReady) {
          ensureClientModule('sync').then(function (mod) {
            if (!pushSlot.parentNode) return  // 面板已重建/关闭，旧槽位作废
            pushSlot.parentNode.replaceChild(mod.createButton(), pushSlot)
          }).catch(function (e) {
            console.warn('[evoloop] sync 模块加载失败：', e)
            if (pushSlot.parentNode) pushSlot.parentNode.removeChild(pushSlot)
          })
        }
        var languageSelect = el('select', { class: 'mn-language-select', 'aria-label': language === 'en' ? 'Language' : '语言' }, [
          el('option', { value: 'zh-CN' }, ['简体中文']),
          el('option', { value: 'en' }, ['English']),
        ])
        languageSelect.value = language
        languageSelect.addEventListener('change', function () { setLanguage(languageSelect.value) })
        var globe = elNS('svg', { width: '16', height: '16', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.5', 'aria-hidden': 'true' })
        globe.appendChild(elNS('circle', { cx: '12', cy: '12', r: '9' }))
        globe.appendChild(elNS('ellipse', { cx: '12', cy: '12', rx: '4', ry: '9' }))
        globe.appendChild(elNS('path', { d: 'M3 12h18' }))
        // 🔴 改动 2026-09-19 · 版本 select 改为自定义弹层：当前版本 + Update 按钮（手动更新机制入口）
        // ↳ 改前[js]: el('select',{class:'mn-version-select'}, VERSIONS.map(...)) + setVersion 切换
        // ↳ 改后[js]: buildVersionMenu() 弹层，点 Update 才检查/应用更新
        topbar.appendChild(el('div', { class: 'mn-heading' }, [
          titleInput, el('label', { class: 'mn-language' }, [globe, languageSelect]),
          // 🔴 改动 2026-09-21 · 版本下拉改由 version-menu 子模块挂载
          // ↳ 改前[js]: buildVersionMenu()  改后[js]: buildVersionMenuMount()
          buildVersionMenuMount(),
        ]))
        // 🔴 改动 2026-09-21 · 计数器改由 process-dock 子模块创建（模块未就绪时跳过，预载保证正常路径就绪）
        // ↳ 改前[js]: 内联创建 missionCounterEl/Num 并 append
        // ↳ 改后[js]: getClientModule('process-dock').createCounter()
        var dockModForCounter = getClientModule('process-dock')
        if (dockModForCounter) topbar.appendChild(dockModForCounter.createCounter())
        // 🔴 改动 2026-10-02 · 顶栏挂「项目」下拉（文件 → 打开…），放计数器与视图之间避开重叠
        topbar.appendChild(buildProjectMenuMount())
        topbar.appendChild(viewWrap)
        topbar.appendChild(el('button', { class: 'mn-btn mn-undo', type: 'button', title: '撤销 (Ctrl+Z)', 'aria-label': '撤销', onclick: function () { restoreHistory(false) } }, ['↶']))
        topbar.appendChild(el('button', { class: 'mn-btn mn-redo', type: 'button', title: '重做 (Ctrl+Alt+Z)', 'aria-label': '重做', onclick: function () { restoreHistory(true) } }, ['↷']))
        updateHistoryButtons()
        if (!isSub) topbar.appendChild(pushBtn)
        topbar.appendChild(closeBtn)

        var body = el('div', { class: 'mn-body' })
        bodyEl = body
        // overlay 重建（语言/版本切换等）→ 进程条 dock 一并重置，todo 重建时重新注册
        // 🔴 改动 2026-09-21 · resetProcessDock 改走 process-dock 子模块 API
        // ↳ 改前[js]: resetProcessDock()  改后[js]: getClientModule('process-dock')?.resetDock()
        var dockModForReset = getClientModule('process-dock')
        if (dockModForReset) dockModForReset.resetDock()
        gridEl = el('div', { class: 'mn-grid' })
        worldEl = el('div', { class: 'mn-world' })
        body.appendChild(gridEl)
        body.appendChild(worldEl)
        marqueeEl = el('div', { class: 'mn-marquee' })
        body.appendChild(marqueeEl)

        // Scrollbars (right/bottom), only shown when content overflows the viewport.
        function makeScrollbar(orient) {
          var track = el('div', { class: 'mn-scrollbar-track' })
          var thumb = el('div', { class: 'mn-scrollbar-thumb' })
          track.appendChild(thumb)
          var bar = el('div', { class: 'mn-scrollbar mn-' + orient })
          bar.appendChild(track)
          body.appendChild(bar)
          attachScrollbarDrag(bar, thumb, orient === 'v')
          return { bar: bar, thumb: thumb }
        }
        var sv = makeScrollbar('v')
        scrollbarVEl = sv.bar; scrollbarVThumb = sv.thumb
        var sh = makeScrollbar('h')
        scrollbarHEl = sh.bar; scrollbarHThumb = sh.thumb

        // Drag handle to resize the panel (col-resize) on its left edge.
        var resizeHandle = el('div', { class: 'mn-resize', title: t('拖动调整宽度') })
        resizeHandle.addEventListener('pointerdown', function (e) {
          if (e.button !== 0) return
          e.preventDefault()
          var startX = e.clientX
          // Drag from what is actually on screen, so the edge follows the cursor.
          var startW = root.getBoundingClientRect().width
          // Remembered width before this drag, restored if the drag is a collapse.
          var prevWidth = panelWidth
          function onMove(ev) {
            // Track the user's INTENDED width; applyResponsivePush() only clamps what
            // is rendered, so a narrow window never destroys the remembered value.
            panelWidth = clamp(startW + (startX - ev.clientX), 60, Math.round(window.innerWidth * 0.78))
            root.style.width = panelWidth + 'px'
            applyResponsivePush()
            if (panelWidth >= PANEL_WIDTH_MIN) storePanelWidth(panelWidth)
          }
          function onUp() {
            document.removeEventListener('pointermove', onMove)
            document.removeEventListener('pointerup', onUp)
            // Pushed near the screen edge → collapse to the little Evoloop icon.
            if (panelWidth < PANEL_WIDTH_MIN) {
              // A collapse gesture must not shrink the remembered size.
              panelWidth = prevWidth
              storePanelWidth(panelWidth)
              root.style.width = ''
              close()
              return
            }
            storePanelWidth(panelWidth)
            applyResponsivePush()
            applyViewport()
          }
          document.addEventListener('pointermove', onMove)
          document.addEventListener('pointerup', onUp)
        })
        root.appendChild(topbar)
        var main = el('div', { class: 'mn-main' })
        main.appendChild(buildRail())
        main.appendChild(componentPoolEl)
        main.appendChild(body)
        root.appendChild(main)
        if (!isSub) root.appendChild(resizeHandle)

        attachBodyEvents()
        applyViewport()
        updateZoomLabel()
        return root
      }

      function loadBoard(doc) {
        if (doc && typeof doc === 'object') {
          board.title = doc.title || t('我的画板')
          board.viewport = doc.viewport || { x: 0, y: 0, zoom: 1 }
          board.cards = Array.isArray(doc.cards) ? doc.cards : []
          board.lines = Array.isArray(doc.lines) ? doc.lines : []
          board.workflowTemplate = doc.workflowTemplate || null
        }
        // The host answered, so the in-memory board now reflects the store and is
        // safe to persist (even when the answer is an empty board).
        boardLoaded = true
        if (!isSub && validViewport(sessionState.viewport)) {
          board.viewport = Object.assign({}, sessionState.viewport)
        }
        rememberSession()
        reRender()
        renderLines()
        resetHistory()
        if (root) {
          var ti = root.querySelector('.mn-title')
          if (ti) ti.value = board.title
        }
        applyViewport()
        updateZoomLabel()
      }

      // 🔴 改动 2026-09-21 · 打开面板前并行预载全部核心子模块，保证 build() 内 getClientModule 同步命中
      // ↳ 改前[js]: function open() { if (!root) root = build() ... }
      // ↳ 改后[js]: open() = preloadCoreModules().then(openImpl)；单个模块失败只警告不阻断面板
      var CORE_CLIENT_MODULES = ['sync', 'version-menu', 'process-dock', 'todo', 'cards-basic', 'cards-workflow', 'context-menu', 'project-menu']
      function preloadCoreModules() {
        return Promise.all(CORE_CLIENT_MODULES.map(function (m) {
          return ensureClientModule(m).catch(function (e) { console.warn('[evoloop] 模块预载失败 ' + m + '：', e) })
        }))
      }
      function open() {
        // 🔴 改动 2026-09-21 · 注册表已就绪时同步打开（测试/二次打开零延迟），否则先异步预载
        // ↳ 改前: 一律 preloadCoreModules().then(openImpl)（微任务延迟导致同步调用方拿不到 overlay）
        // ↳ 改后: 全部模块可同步实例化时直接 openImpl()
        var allReady = CORE_CLIENT_MODULES.every(function (m) { return !!getClientModule(m) })
        if (allReady) { openImpl(); return }
        preloadCoreModules().then(openImpl)
      }
      function openImpl() {
        if (disposed) return
        if (!root) root = build()
        if (!root.parentNode) (document.documentElement || document.body).appendChild(root)
        root.classList.add('mn-open')
        if (isSub) root.focus({ preventScroll: true })
        if (isSub) root.classList.add('mn-modal')
        hideCollapseTab()
        if (!panelOpen) {
        panelOpen = true
          rememberSession()
          applyResponsivePush()
          document.addEventListener('keydown', onKey)
          document.addEventListener('keydown', onHistoryKey, true)
          ensureConvObserver()
          window.addEventListener('resize', onResizePush)
          // Re-apply transform now that the element is visible.
          requestAnimationFrame(function () {
            applyViewport()
            applyResponsivePush()
            scheduleOverlayScan()
          })
          // 🔴 改动 2026-09-19 · 移除版本分支：Evoloop 已删，打开面板一律走画板加载
          // ↳ 改前[js]: if (version === '1.0') { ... } else { refreshEvoloopStatus() }
          // ↳ 改后[js]: 无条件执行画板加载分支
          if (!isSub) {
            // First open: load the persisted board (falls back to empty). The save
            // runs only AFTER the doc arrives — scheduling it up-front would write
            // the still-empty in-memory board over the stored one (turning the
            // debounced autosave into a cloud wipe of the empty board).
            host.load().then(function (doc) {
              if (disposed) return
              loadBoard(doc)
              scheduleSave()
            }).catch(function () { /* keep the empty board; nothing is persisted until an edit */ })
          } else {
            // Sub-board: render the cards already stored in the parent card.
            reRender()
            renderLines()
            resetHistory()
            scheduleSave()
          }
        }
      }
      function close() {
        // 🔴 改动 2026-09-25 · 画板关闭时清理根节点上的右键菜单
        var contextMenuOnClose = getClientModule('context-menu')
        if (contextMenuOnClose) contextMenuOnClose.close()
        if (childApp) childApp.close()
        // Whether the panel was actually open decides if we may flush: tearing down
        // a panel that was never opened must never write/push the empty default
        // board over the stored one.
        var wasOpen = panelOpen
        if (root) root.classList.remove('mn-open', 'mn-modal')
        panelOpen = false
        rememberSession()
        hideAddMenu()
        // 🔴 改动 2026-09-19 · closePushDialog 已迁入 sync 子模块，这里经模块 API 调用
        // ↳ 改前[js]: closePushDialog()  改后[js]: getClientModule('sync')?.closeDialog()
        var syncModOnClose = getClientModule('sync')
        if (syncModOnClose) syncModOnClose.closeDialog()
        document.removeEventListener('keydown', onKey)
        document.removeEventListener('keydown', onHistoryKey, true)
        if (wasOpen) {
          // Cancel any pending debounced autosave; we flush + push now.
          clearTimeout(saveTimer)
          saveTimer = null
          flushAndPush()
        }
        // Release the conversation area and collapse to the small edge icon.
        clearResponsivePush()
        showCollapseTab()
        if (wasOpen && opts.onClose) opts.onClose()
      }
      function isBoardOpen() { return panelOpen }
      // 🔴 改动 2026-09-19 · refresh 只处理语言切换重建（版本切换与 evoloop 轮询已删）
      // ↳ 改前[js]: if (version === '1.0') { reRender... } else { refreshEvoloopStatus() } + versionListeners 注册/清理 + evoloopTimer 清理
      // ↳ 改后[js]: 无条件重建画板；只剩 languageListeners
      // Rebuild presentation only; keep the loaded document and never close/push.
      function refresh() {
        if (collapseTab) collapseTab.title = t('展开 Evoloop 画布')
        if (!root) return
        blurEditing()
        var previous = root
        var selection = selectedIds
        if (viewDocHandler) document.removeEventListener('click', viewDocHandler)
        viewDocHandler = null
        hideAddMenu()
        // 🔴 改动 2026-09-19 · 同上：sync 对话框关闭走模块 API
        // ↳ 改前[js]: closePushDialog()  改后[js]: getClientModule('sync')?.closeDialog()
        var syncModOnRefresh = getClientModule('sync')
        if (syncModOnRefresh) syncModOnRefresh.closeDialog()
        cardEls = {}
        linesSvg = null
        build()
        root.className = previous.className
        root.style.cssText = previous.style.cssText
        if (childApp) root.setAttribute('inert', '')
        if (previous.parentNode) previous.parentNode.replaceChild(root, previous)
        reRender()
        applySelection(selection)
        applyViewport()
        updateZoomLabel()
        if (panelOpen) applyResponsivePush()
      }
      languageListeners.push(refresh)
      function destroy() {
        if (disposed) return
        rememberSession()
        disposed = true
        window.removeEventListener('pagehide', rememberSession)
        languageListeners = languageListeners.filter(function (fn) { return fn !== refresh })
        close()
        teardownConvObserver()
        teardownOverlayObserver()
        window.removeEventListener('resize', onResizePush)
        if (viewDocHandler) { document.removeEventListener('click', viewDocHandler); viewDocHandler = null }
        if (root && root.parentNode) root.parentNode.removeChild(root)
        root = null
        cardEls = {}
        // Remove this instance's tab plus any stray tab left in the document.
        if (collapseTab && collapseTab.parentNode) collapseTab.parentNode.removeChild(collapseTab)
        collapseTab = null
        var strayTabs = isSub ? [] : document.querySelectorAll('.dsh-mn-collapse-tab')
        for (var t = 0; t < strayTabs.length; t++) {
          if (strayTabs[t].parentNode) strayTabs[t].parentNode.removeChild(strayTabs[t])
        }
      }

      return {
        build: build,
        open: open,
        close: close,
        isOpen: isBoardOpen,
        destroy: destroy,
        // The panel starts closed, so the edge tab must exist from the very first
        // render (otherwise a fresh page load shows no way to open the board).
        showEdgeTab: function () { if (!panelOpen) showCollapseTab() },
        restoreSession: function () { if (sessionState.open === true) open(); else showCollapseTab() },
        // Recompute the DSH modal centering region on demand (also used once at
        // load, after the React shell has mounted the conversation area).
        layoutModalRegion: layoutDshModalRegion,
        // General overlay tagging (see scanAndTagOverlays) + its observer.
        scanOverlays: scheduleOverlayScan,
        ensureOverlayScan: ensureOverlayObserver,
      }
    }

    // ---------------------------------------------------------------------
    // Entry point: register a real DSH header action via the slot system.
    // The slot renders it with DSH's own React, so the button is part of the
    // app tree and is never wiped by re-renders (unlike raw DOM injection).
    // ---------------------------------------------------------------------
    function apply(ctx) {
      injectStyles()

      var app = createApp()
      // 🔴 改动 2026-10-10 · SuperRetail 移植：暴露 app 句柄，供版图侧边栏「循环」按钮驱动（原 DSH 头部 pill 由 slots 注入，移植版为空实现）
      try { window.__EVOLOOP_APP__ = app } catch (e) {}
      // Restore the last open/collapsed state; first use still starts collapsed.
      app.restoreSession()
      // Measure the conversation area once the React shell has mounted, so DSH
      // dialogs are centered in the conversation column from the first render
      // (not only after the panel has been opened/closed at least once).
      app.ensureOverlayScan()
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { app.layoutModalRegion(); app.scanOverlays() })
      })
      function toggle() {
        if (app.isOpen()) app.close()
        else app.open()
      }

      // Signal activation to the host (also serves as a heartbeat).
      try { fetch(HEALTH_ROUTE, { method: 'POST', body: JSON.stringify({ evt: 'activated' }) }).catch(function () {}) } catch (e) {}

      // Shared modules from the DSH module graph (React + UI primitives are
      // baseline-seeded, the same way the session-log-export bundle uses them).
      var jsx
      try {
        jsx = require('react/jsx-runtime')
      } catch (e) {
        try { fetch(HEALTH_ROUTE, { method: 'POST', body: JSON.stringify({ moduleErr: String(e && (e.message || e) || e) }) }).catch(function () {}) } catch (x) {}
        throw e
      }

      // Header action pill, styled to match the built-in "Session log" pill.
      function EvoloopHeaderAction(props) {
        var p = props || {}
        return jsx.jsxs('button', {
          type: 'button',
          className: 'dsh-mn-header-pill',
          'aria-label': t('Evoloop 画布'),
          title: t('打开 Evoloop 画布'),
          onClick: function () { if (p.open) p.open() },
          children: [ jsx.jsx('span', { className: 'dsh-mn-dot' }), jsx.jsx('span', { children: 'Evoloop' }) ],
        })
      }

      ctx.slots.inject('conversation.session.header.utilities', function () {
        return ctx.slots.register({
          name: 'conversation.session.header.utilities',
          id: 'evoloop-open',
          inject: function () {
            return { open: toggle }
          },
        }, EvoloopHeaderAction)
      })

      // `ctx.effect(body)` runs `body` IMMEDIATELY and registers whatever it
      // RETURNS as the disposer, so the body must return the teardown instead of
      // calling it. (Calling destroy() here ran it at load time, which wiped the
      // edge tab right after it was created — and fired a push on every refresh.)
      // `ctx.effect(body)` runs `body` IMMEDIATELY and registers whatever it
      // RETURNS as the disposer, so the body must return the teardown instead of
      // calling it. (Calling destroy() here ran it at load time, which wiped the
      // edge tab right after it was created — and fired a push on every refresh.)
      ctx.effect(function () {
        return function () { app.destroy() }
      }, 'evoloop: board')
    }

    exports.inject = ['slots', 'locale']
    exports.apply = apply
    return module.exports
  },
})
