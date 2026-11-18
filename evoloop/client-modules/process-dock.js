// ============================================================================
// Evoloop 客户端子模块：process-dock（进程条 dock + 任务完成计数器 + 粒子）
//
// 加载方式同 sync.js（方案A · 注册表模式，详见该文件头注释）。
// deps：el / t / overlayId / getBoard / getBodyEl / scheduleSave / burstAtInto
// ============================================================================
;(function () {
  var registry = window.__EVOLOOP__ = window.__EVOLOOP__ || {}
  if (registry['process-dock']) return

  // ---- 样式（自注入 + 自愈）----
  // 与 client.js 主常量保持一致（注册期注入样式时 deps 尚不存在，故硬编码）
  var OVERLAY_ID = 'dsh-evoloop-overlay'
  var CSS_ID = 'dsh-evoloop-process-dock-css'
  var CSS = [
      // --- 进程条 dock：画布右上角浮动状态栏（SLG 部队委派式）---
      // 每条对应一个 done 的 todo item：字符左对齐、默认 6 字符截断，
      // hover 时整条自适应内容总高度；完成后飞入顶部绿色计数器销毁。
      '#' + OVERLAY_ID + ' .mn-process-dock{position:absolute;top:12px;right:16px;left:71px;z-index:150;display:flex;flex-direction:column;align-items:flex-end;gap:8px;pointer-events:none}',
      // 🔴 改动 2026-09-22 · entry 改为容器（列）+ .mn-process-row 行结构：
      // 子项进程条并入父项容器，作为追加行共享同一个 entry 外壳
      '#' + OVERLAY_ID + ' .mn-process-entry{pointer-events:auto;position:relative;display:flex;flex-direction:column;gap:6px;max-width:100%;box-sizing:border-box;padding:7px 10px;border-radius:10px;background:rgba(22,25,30,.92);border:1px solid rgba(10,185,230,.35);box-shadow:0 4px 16px rgba(0,0,0,.4);backdrop-filter:blur(6px)}',
      '#' + OVERLAY_ID + ' .mn-process-row{display:flex;align-items:flex-start;gap:8px}',
      // 🔴 改动 2026-09-24 · 同组进程行 0.5px 分隔线只分隔 item：
      // parent item 与 subitem 之间不加分隔线（subitem 行带 mn-process-sub 类）
      '#' + OVERLAY_ID + ' .mn-process-entry .mn-process-row + .mn-process-row:not(.mn-process-sub){border-top:.5px solid rgba(255,255,255,.16);padding-top:6px}',
      // 收起态：只显示摘要（todo 标题 + 进程条数量）
      '#' + OVERLAY_ID + ' .mn-process-summary{display:none;align-items:center;gap:8px;font:700 11px/1.3 system-ui;color:#8FE6FF;letter-spacing:.04em}',
      '#' + OVERLAY_ID + ' .mn-process-summary-title{max-width:180px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}',
      '#' + OVERLAY_ID + ' .mn-process-summary-count{flex:none;color:var(--mn-muted);font-variant-numeric:tabular-nums}',
      '#' + OVERLAY_ID + ' .mn-process-entry.mn-collapsed .mn-process-summary{display:flex}',
      '#' + OVERLAY_ID + ' .mn-process-entry.mn-collapsed .mn-process-row{display:none}',
      // 伸缩条（类 iPhone 底部横条）：hover 容器时出现于底部，点击收起/展开
      '#' + OVERLAY_ID + ' .mn-process-fold{display:none;justify-content:center;padding:2px 0 0;cursor:pointer}',
      '#' + OVERLAY_ID + ' .mn-process-fold::before{content:"";width:36px;height:4px;border-radius:999px;background:rgba(255,255,255,.45);transition:background .15s ease}',
      '#' + OVERLAY_ID + ' .mn-process-fold:hover::before{background:#8FE6FF}',
      '#' + OVERLAY_ID + ' .mn-process-entry:hover .mn-process-fold{display:flex}',
      // 🔴 改动 2026-09-22 · 进程条宽缩为 2/3（150→100px），省出的 50px 让给文字（6em+6px → 6em+56px）
      '#' + OVERLAY_ID + ' .mn-process-bar{position:relative;width:100px;min-width:64px;height:16px;flex:0 1 auto;border-radius:999px;overflow:hidden;background:rgba(255,255,255,.07);border:1.5px solid rgba(10,185,230,.55);box-sizing:border-box;transition:width .4s cubic-bezier(.22,1.4,.36,1),height .25s ease}',
      '#' + OVERLAY_ID + ' .mn-process-fill{position:absolute;top:1px;bottom:1px;left:1px;width:0%;border-radius:999px;background-image:repeating-linear-gradient(115deg,rgba(255,255,255,.38) 0 5px,rgba(255,255,255,0) 5px 10px),linear-gradient(180deg,#6FE3FF 0%,#0AB9E6 48%,#0090C2 100%);background-size:15px 100%,100% 100%;animation:mnManaFlow .9s linear infinite;transition:width .5s cubic-bezier(.22,1.5,.36,1)}',
      '@keyframes mnManaFlow{from{background-position:0 0,0 0}to{background-position:15px 0,0 0}}',
      // 任务文字移出进程条放左侧：固定 6 字符宽、溢出省略号；hover 换行展开、条与圆钮垂直居中
      '#' + OVERLAY_ID + ' .mn-process-text{flex:none;width:calc(6em + 56px);max-width:calc(6em + 56px);align-self:center;font:700 11px/1.3 system-ui;letter-spacing:calc(.04em + 1px);color:#8FE6FF;text-shadow:0 1px 2px rgba(0,20,30,.6);text-align:left;pointer-events:none;user-select:none;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}',
      '#' + OVERLAY_ID + ' .mn-process-entry.mn-expanded .mn-process-row{align-items:center}',
      '#' + OVERLAY_ID + ' .mn-process-entry.mn-expanded .mn-process-text{white-space:normal;word-break:break-all;overflow:visible;text-overflow:clip;line-height:1.5}',
      '#' + OVERLAY_ID + ' .mn-process-entry.mn-expanded .mn-process-check{align-self:center}',
      // 🔴 改动 2026-09-30 · 桌面端全局 button 样式会把圆撑成椭圆：宽高锁死 + aspect-ratio:1 + appearance:none
      '#' + OVERLAY_ID + ' .mn-process-check{position:relative;width:17px;height:17px;min-width:17px;min-height:17px;max-width:17px;max-height:17px;aspect-ratio:1/1;box-sizing:border-box;appearance:none;-webkit-appearance:none;flex:none;border:1.5px solid var(--mn-muted);border-radius:50%;background:transparent;display:flex;align-items:center;justify-content:center;padding:0;cursor:pointer;transition:border-color .18s ease,transform .12s ease}',
      '#' + OVERLAY_ID + ' .mn-process-check:hover{border-color:#0AB9E6;transform:scale(1.12)}',
      '#' + OVERLAY_ID + ' .mn-process-check:active{transform:scale(.86)}',
      '#' + OVERLAY_ID + ' .mn-process-check[aria-checked="true"]{border-color:#0AB9E6}',
      '#' + OVERLAY_ID + ' .mn-process-check[aria-checked="true"] .mn-todo-dot{transform:scale(1)}',
      // 待命脉冲：::after 扩散环（合成器动画，零常驻重绘）
      '@keyframes mnReadyRing{0%{transform:scale(.75);opacity:.8}100%{transform:scale(1.9);opacity:0}}',
      '#' + OVERLAY_ID + ' .mn-process-row.mn-ready .mn-process-check{border-color:#0AB9E6}',
      '#' + OVERLAY_ID + ' .mn-process-row.mn-ready .mn-process-check::after{content:"";position:absolute;inset:-2px;border-radius:50%;border:2px solid rgba(10,185,230,.75);pointer-events:none;animation:mnReadyRing 1.1s ease-out infinite}',
      '#' + OVERLAY_ID + ' .mn-spark{position:absolute;width:5px;height:5px;border-radius:50%;background:#0AB9E6;box-shadow:0 0 6px rgba(10,185,230,.9);pointer-events:none;z-index:60}',
      '#' + OVERLAY_ID + ' .mn-spark.mn-green{background:#2FD573;box-shadow:0 0 6px rgba(47,213,115,.9)}',
      '#' + OVERLAY_ID + ' .mn-ring{position:absolute;border-radius:50%;border:2px solid rgba(10,185,230,.85);pointer-events:none;z-index:60}',
      // 🔴 改动 2026-09-24 · 去掉完成（checked）时的抖动动画，保留蓝点弹出/闪光/飞入计数器
      '@keyframes mnMcPop{0%{transform:scale(.5)}55%{transform:scale(1.22)}100%{transform:scale(1)}}',
      '@keyframes mnBarFlash{0%,100%{border-color:rgba(10,185,230,.55)}50%{border-color:#6FE3FF}}',
      '#' + OVERLAY_ID + ' .mn-process-row.mn-mc .mn-process-bar{width:127px;animation:mnBarFlash .4s ease 3}',
      '#' + OVERLAY_ID + ' .mn-process-row.mn-mc .mn-process-fill{animation-duration:.35s}',
      '#' + OVERLAY_ID + ' .mn-process-row.mn-mc .mn-process-text{animation:mnMcPop .45s cubic-bezier(.3,1.7,.4,1);color:#fff;width:auto;max-width:none;white-space:nowrap;overflow:visible;text-overflow:clip;font:700 11px/1.3 system-ui;letter-spacing:.04em}',
      // --- 任务完成计数器（顶部绿色 widget）：吸收完成的进程条 +1 ---
      '#' + OVERLAY_ID + ' .mn-mission-counter{position:relative;display:flex;align-items:center;gap:6px;padding:4px 12px;border-radius:999px;background:linear-gradient(165deg,#2FD573 0%,#12A150 100%);color:#fff;font:700 12px/1.2 system-ui;box-shadow:0 4px 12px rgba(18,161,80,.35);user-select:none}',
      '#' + OVERLAY_ID + ' .mn-mission-counter-icon{font-size:12px;font-weight:800}',
      '#' + OVERLAY_ID + ' .mn-mission-counter-num{font-variant-numeric:tabular-nums;min-width:10px;text-align:center}',
      '@keyframes mnCounterPop{0%{transform:scale(1)}40%{transform:scale(1.28)}100%{transform:scale(1)}}',
      '#' + OVERLAY_ID + ' .mn-mission-counter.mn-bump{animation:mnCounterPop .42s cubic-bezier(.3,1.6,.4,1)}',
  ].join('')

  function injectStyles() {
      var tag = document.getElementById(CSS_ID)
      if (tag) {
        if (tag.textContent !== CSS) tag.textContent = CSS
        return
      }
      tag = document.createElement('style')
      tag.id = CSS_ID
      tag.textContent = CSS
      document.head.appendChild(tag)
  }

  injectStyles()  // 注册即注入样式（幂等自愈），无需等实例化

  registry['process-dock'] = function (deps) {
    var el = deps.el, t = deps.t
    var getBoard = deps.getBoard, getBodyEl = deps.getBodyEl
    var scheduleSave = deps.scheduleSave
    var burstAtInto = deps.burstAtInto


    // ---- 进程条 dock：画布右上角的浮动状态栏（SLG 部队委派式）----
    // 任务委派制：勾选单个 todo item 才派发一条进程条（蓝条行军 0→100%），
    // 点右侧圆钮立即完成；完成后整条飞入顶部绿色计数器销毁（吸收 +1）。
    var processDockEl = null
    var processEntries = {}
    // 🔴 改动 2026-09-24 · 分组容器：同一 todo list 的所有进程条共用一个容器
    // groupId -> { root, summaryTitle, summaryCount, fold, entries[], title }
    var processGroups = {}
    var processObserver = null
    var processRefreshQueued = false
    var missionSeq = 0
    var missionCounterEl = null
    var missionCounterNum = null
    function ensureProcessDock() {
      var bodyEl = getBodyEl()
      if (processDockEl || !bodyEl) return
      processDockEl = el('div', { class: 'mn-process-dock' })
      bodyEl.appendChild(processDockEl)
      // 卡片增删都会落在 body 子树；只监听 childList，节流合并刷新。
      if (typeof MutationObserver === 'function') {
        processObserver = new MutationObserver(function () { queueProcessRefresh() })
        processObserver.observe(bodyEl, { childList: true, subtree: true })
      }
    }
    function resetProcessDock() {
      if (processObserver) { try { processObserver.disconnect() } catch (e) {} processObserver = null }
      if (processDockEl && processDockEl.parentNode) processDockEl.parentNode.removeChild(processDockEl)
      processDockEl = null
      processEntries = {}
      processGroups = {}
      processRefreshQueued = false
    }
    function queueProcessRefresh() {
      if (processRefreshQueued) return
      processRefreshQueued = true
      setTimeout(function () { processRefreshQueued = false; refreshProcessDock() }, 60)
    }
    function removeProcessEntry(id) {
      var e = processEntries[id]
      if (!e) return
      if (e.marchTimer) clearTimeout(e.marchTimer)
      // 🔴 改动 2026-09-24 · 分组容器：撤行并更新摘要；组空了撤掉整个容器
      var g = e.group
      if (g) {
        var gi = g.entries.indexOf(e)
        if (gi >= 0) g.entries.splice(gi, 1)
      }
      if (e.root.parentNode) e.root.parentNode.removeChild(e.root)
      delete processEntries[id]
      if (g) {
        updateGroupSummary(g)
        if (!g.entries.length) {
          if (g.root.parentNode) g.root.parentNode.removeChild(g.root)
          delete processGroups[g.id]
        }
      }
    }
    function refreshProcessDock() {
      if (!processDockEl) return
      Object.keys(processEntries).forEach(function (id) {
        var e = processEntries[id]
        // 源卡片被删（DOM 脱离文档）→ 同步撤掉这条进程（不计数）
        if (!e.flying && e.sourceNode && !document.contains(e.sourceNode)) removeProcessEntry(id)
      })
    }
    // 🔴 改动 2026-09-22 · 拆出行构建：一条进程 = [文字, 进程条, 圆钮] 一行，
    // 子项进程条作为追加行并入父项 entry 容器（共用外壳）
    function buildProcessRow(textStr) {
      var row = el('div', { class: 'mn-process-row' })
      var text = el('span', { class: 'mn-process-text' }, [textStr])
      var bar = el('div', { class: 'mn-process-bar' })
      var fill = el('i', { class: 'mn-process-fill' })
      bar.appendChild(fill)
      var check = el('button', {
        class: 'mn-process-check', type: 'button', role: 'checkbox',
        'aria-checked': 'false', 'aria-label': t('完成任务'),
      })
      check.appendChild(el('span', { class: 'mn-todo-dot' }))
      row.appendChild(text); row.appendChild(bar); row.appendChild(check)
      return { row: row, text: text, bar: bar, fill: fill, check: check }
    }
    // 🔴 改动 2026-09-24 · 同一 todo list 的进程条共用一个分组容器：
    // item 与 subitem 的行都在一起，行间 0.5px 分隔线；容器底部有伸缩条可收起/展开
    function updateGroupSummary(g) {
      g.summaryCount.textContent = String(g.entries.length)
    }
    function toggleGroupCollapsed(g) {
      g.root.classList.toggle('mn-collapsed')
    }
    // 🔴 改动 2026-09-25 · 同步列表 headline；展开时保留数据但由摘要样式隐藏
    function updateGroupTitle(groupId, title) {
      var g = processGroups[groupId]
      if (!g || typeof title !== 'string') return
      g.title = title || t('To-do list')
      g.summaryTitle.textContent = g.title
    }
    function ensureGroup(groupId, title) {
      var g = processGroups[groupId]
      if (g) {
        updateGroupTitle(groupId, title)
        return g
      }
      var root = el('div', { class: 'mn-process-entry' })
      var summaryTitle = el('span', { class: 'mn-process-summary-title' }, [title || t('待办')])
      var summaryCount = el('span', { class: 'mn-process-summary-count' }, ['0'])
      var summary = el('div', { class: 'mn-process-summary' }, [summaryTitle, summaryCount])
      var fold = el('div', { class: 'mn-process-fold', role: 'button', title: t('收起 / 展开') })
      root.appendChild(summary)
      root.appendChild(fold)
      g = { id: groupId, root: root, summary: summary, summaryTitle: summaryTitle, summaryCount: summaryCount,
        fold: fold, entries: [], title: title || t('待办') }
      fold.addEventListener('click', function (e) {
        e.stopPropagation()
        toggleGroupCollapsed(g)
      })
      // 悬浮展开：hover 时文字换行展开，进程条自适应文字总行高（容器级，覆盖所有行）
      attachExpandHandlers(root)
      processGroups[groupId] = g
      if (processDockEl) processDockEl.appendChild(root)
      return g
    }
    // 🔴 改动 2026-09-25 · 按 todo 列表顺序（opts.order = item 下标）定位行：
    // 插到第一个 order 更大的行之前，保证 parent 始终在 sub 上方，与勾选先后无关
    function insertRowSorted(g, entry) {
      var before = null
      if (typeof entry.order === 'number') {
        for (var i = 0; i < g.entries.length; i++) {
          var other = g.entries[i]
          if (other !== entry && typeof other.order === 'number' && other.order > entry.order) { before = other.row; break }
        }
      }
      g.root.insertBefore(entry.row, before || g.fold)
    }
    // 勾选 todo item → 派发一条任务进程条：蓝条行军充能，点圆钮立即完成
    // opts.groupId：同一 todo list（卡片）的进程条并入同一容器；opts.groupTitle 供收起态摘要显示
    function spawnProcessMission(opts) {
      ensureProcessDock()
      var id = 'm' + (++missionSeq)
      var fullText = (opts && opts.text) || t('待办')
      var duration = (opts && opts.duration) || 3500
      var parts = buildProcessRow(fullText)
      // 🔴 改动 2026-09-24 · subitem 行标记 mn-process-sub：与 parent 之间不画分隔线
      if (opts && (opts.depth || 0) > 0) parts.row.classList.add('mn-process-sub')
      var g = ensureGroup((opts && opts.groupId) || ('solo:' + id), opts && opts.groupTitle)
      var entry = { id: id, root: parts.row, row: parts.row, bar: parts.bar, fill: parts.fill, text: parts.text, check: parts.check,
        sourceNode: opts && opts.sourceNode, item: opts && opts.item, fullText: fullText,
        group: g, order: opts && typeof opts.order === 'number' ? opts.order : null,
        celebrating: false, flying: false, marchTimer: 0 }
      g.entries.push(entry)
      // 行按 todo 列表顺序插入；无 order 的调用追加在伸缩条之前，分隔线由 CSS 兄弟选择器负责
      insertRowSorted(g, entry)
      updateGroupSummary(g)
      parts.check.addEventListener('click', function (ev) {
        ev.stopPropagation(); completeProcessMission(entry)
      })
      processEntries[id] = entry
      // 行军充能：0 → 100%；充满只是「抵达」，不自动完成，
      // 进入待确认态（圆钮脉冲），必须点击圆钮确认任务才完成、进程条才销毁
      parts.fill.style.transitionDuration = duration + 'ms'
      setTimeout(function () {
        if (!entry.celebrating && !entry.flying) parts.fill.style.width = '100%'
      }, 60)
      entry.marchTimer = setTimeout(function () {
        if (!entry.celebrating && !entry.flying) entry.row.classList.add('mn-ready')
      }, duration + 150)
      return entry
    }
    function attachExpandHandlers(container) {
      container.addEventListener('mouseenter', function () {
        container.classList.add('mn-expanded')
      })
      container.addEventListener('mouseleave', function () {
        container.classList.remove('mn-expanded')
      })
    }
    // 取消勾选：未完成的任务淡出撤下，不计数（同组其他行不受影响）
    function cancelProcessMission(entry) {
      if (!entry || entry.celebrating || entry.flying) return
      entry.flying = true
      if (entry.marchTimer) { clearTimeout(entry.marchTimer); entry.marchTimer = 0 }
      var done = function () { entry.flying = false; removeProcessEntry(entry.id) }
      try {
        entry.root.animate([
          { opacity: 1, transform: 'translateX(0)' },
          { opacity: 0, transform: 'translateX(24px)' }
        ], { duration: 200, easing: 'ease-in' }).onfinish = done
      } catch (err) { done() }
    }
    // 完成：蓝点弹出、mission complete! 闪现，随后飞入计数器被吸收；
    // 父条目完成前先把仍在行军的孩子提升为独立条目（不被一起吸收）
    function completeProcessMission(entry) {
      if (entry.celebrating || entry.flying) return
      entry.celebrating = true
      // 完成时清掉 item.mission 标志：任务已确认，重开面板不再复活该进程条
      if (entry.item) entry.item.mission = false
      if (entry.marchTimer) { clearTimeout(entry.marchTimer); entry.marchTimer = 0 }
      entry.root.classList.remove('mn-expanded')
      entry.row.classList.remove('mn-ready')
      entry.row.classList.add('mn-mc')
      entry.check.setAttribute('aria-checked', 'true')
      entry.fill.style.transitionDuration = '.25s'
      entry.fill.style.width = '100%'
      entry.text.textContent = 'mission complete!'
      burstAtInto(entry.row, entry.check, 12, 40)
      setTimeout(function () { absorbProcessEntry(entry) }, 750)
    }
    // 吸收动画：整条缩小飞入顶部绿色计数器，销毁后计数 +1
    function absorbProcessEntry(entry) {
      if (entry.flying) return
      entry.flying = true
      var counter = missionCounterEl
      var ghost = entry.root
      if (counter && document.body.animate) {
        var r = ghost.getBoundingClientRect()
        var cr = counter.getBoundingClientRect()
        ghost.style.position = 'fixed'
        ghost.style.left = r.left + 'px'
        ghost.style.top = r.top + 'px'
        ghost.style.width = r.width + 'px'
        ghost.style.margin = '0'
        ghost.style.zIndex = '500'
        document.body.appendChild(ghost)
        var dx = cr.left + cr.width / 2 - (r.left + r.width / 2)
        var dy = cr.top + cr.height / 2 - (r.top + r.height / 2)
        ghost.animate([
          { transform: 'translate(0,0) scale(1)', opacity: 1 },
          { transform: 'translate(' + dx * 0.55 + 'px,' + (dy - 36) + 'px) scale(.72)', opacity: .95, offset: .5 },
          { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.12)', opacity: 0 }
        ], { duration: 620, easing: 'cubic-bezier(.5,-.05,.3,1)' }).onfinish = function () {
          removeProcessEntry(entry.id)
          bumpMissionCounter()
        }
      } else {
        removeProcessEntry(entry.id)
        bumpMissionCounter()
      }
    }
    // 计数器 +1：数字弹跳 + 绿色火花，并随画板持久化
    function bumpMissionCounter() {
      var board = getBoard()
      board.completedMissions = (typeof board.completedMissions === 'number' ? board.completedMissions : 0) + 1
      if (missionCounterNum) missionCounterNum.textContent = String(board.completedMissions)
      if (missionCounterEl) {
        missionCounterEl.classList.remove('mn-bump')
        void missionCounterEl.offsetWidth
        missionCounterEl.classList.add('mn-bump')
        burstAtInto(missionCounterEl, missionCounterEl, 8, 24, 'mn-green')
      }
      scheduleSave()
    }

    // 顶部绿色任务完成计数器：吸收完成的进程条 +1，随画板持久化
    function createMissionCounter() {
      var board = getBoard()
      if (typeof board.completedMissions !== 'number') board.completedMissions = 0
      missionCounterNum = el('span', { class: 'mn-mission-counter-num' }, [String(board.completedMissions)])
      missionCounterEl = el('div', { class: 'mn-mission-counter', title: t('已完成任务') }, [
        el('span', { class: 'mn-mission-counter-icon' }, ['✓']),
        missionCounterNum,
      ])
      return missionCounterEl
    }

    // 🔴 改动 2026-09-24 · 单向同步：todo 文字变更 → 进程条文本实时更新
    // （庆祝/飞行中的条目不更新，反正即将销毁）
    function updateProcessMission(entry, opts) {
      if (!entry || entry.celebrating || entry.flying) return
      if (opts && typeof opts.text === 'string') {
        entry.fullText = opts.text
        entry.text.textContent = opts.text
      }
      // 🔴 改动 2026-09-24 · 缩进层级变化时同步 mn-process-sub 类（分隔线规则随之生效）
      if (opts && typeof opts.depth === 'number') {
        entry.row.classList.toggle('mn-process-sub', opts.depth > 0)
      }
      // 🔴 改动 2026-09-25 · 列表内拖拽排序后同步 order 并重排行位置
      if (opts && typeof opts.order === 'number') {
        entry.order = opts.order
        if (entry.group) insertRowSorted(entry.group, entry)
      }
    }

    // 模块对外 API
    return {
      createCounter: createMissionCounter,
      resetDock: resetProcessDock,
      spawn: spawnProcessMission,
      cancel: cancelProcessMission,
      update: updateProcessMission,
      updateGroupTitle: updateGroupTitle,
    }
  }
})()
