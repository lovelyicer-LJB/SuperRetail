// ============================================================================
// Evoloop 客户端子模块：sync（对比变更并推送到 GitHub）
//
// 加载方式（方案A · 注册表模式）：
//   本文件由后端路由 GET /_dsh/evoloop/module/sync.js 以经典脚本分发，
//   只往 window.__EVOLOOP__ 注册一个工厂函数，不直接执行任何 UI 逻辑；
//   client.js 的 ensureClientModule('sync') 负责拉取并用依赖注入实例化。
//
// 工厂收到的 deps（宿主 client.js 注入）：
//   el / elNS          创建 DOM / SVG 元素
//   t                  中英互译
//   colorForType       卡片类型 → 颜色
//   contentIcon        卡片类型 → 图标
//   typeLabel/cardLabel 卡片标题文案
//   api                后端接口（gitHead / push）
//   emptyBoard()       空画板文档
//   getBoard()         当前画板（live getter，画板会被替换所以必须现取）
//   getWorkspace()     当前工作区路径（同上）
// ============================================================================
;(function () {
  var registry = window.__EVOLOOP__ = window.__EVOLOOP__ || {}
  if (registry['sync']) return  // 重复注入（HMR/多次 script）直接跳过

  // ---- 样式（自注入 + 自愈：内容不一致就重写，同 client.js 主样式策略）----
  var CSS_ID = 'dsh-evoloop-sync-css'
  var CSS = [
      // ---- push-to-github review dialog (self-contained dark modal) ----
      '.mn-push-backdrop{position:fixed;inset:0;z-index:1000010;display:flex;align-items:center;justify-content:center;',
        'background:rgba(0,0,0,.6);color-scheme:dark;font:14px/1.5 system-ui,"Segoe UI",sans-serif;color:#e7e7e7;',
        'padding:24px;box-sizing:border-box}',
      '.mn-push-dialog{width:min(920px,100%);max-height:calc(100vh - 48px);display:flex;flex-direction:column;',
        'background:#1c1c1c;border:1px solid #3a3a3a;border-radius:14px;box-shadow:0 24px 64px rgba(0,0,0,.55);overflow:hidden}',
      '.mn-push-loading{min-height:180px;align-items:center;justify-content:center;gap:14px;flex-direction:column}',
      '.mn-push-spinner{width:30px;height:30px;border-radius:50%;border:3px solid #3a3a3a;border-top-color:#6d5efc;',
        'animation:mn-spin 0.8s linear infinite}',
      '@keyframes mn-spin{to{transform:rotate(360deg)}}',
      '.mn-push-loading-txt{color:#9a9a9a;font-size:13px}',
      '.mn-push-head{display:flex;align-items:center;gap:10px;padding:16px 20px;border-bottom:1px solid #2e2e2e;flex:none}',
      '.mn-push-title{flex:1;display:flex;align-items:center;gap:9px;font:600 15px/1.3 system-ui;color:#fff}',
      '.mn-push-title svg{width:17px;height:17px;color:#c8c8c8;flex:none}',
      '.mn-push-x{width:30px;height:30px;border:0;border-radius:7px;background:transparent;color:#9a9a9a;font-size:16px;',
        'line-height:1;cursor:pointer;flex:none}',
      '.mn-push-x:hover{background:#2e2e2e;color:#fff}',
      '.mn-push-summary{display:flex;flex-wrap:wrap;gap:8px;padding:12px 20px;border-bottom:1px solid #2e2e2e;flex:none}',
      '.mn-push-chip{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:999px;',
        'font:600 12px/1.5 system-ui;background:#2a2a2a;border:1px solid #3a3a3a;color:#d5d5d5}',
      '.mn-chip-added{background:rgba(76,175,125,.14);border-color:rgba(76,175,125,.4);color:#7bd8a4}',
      '.mn-chip-modified{background:rgba(217,164,65,.14);border-color:rgba(217,164,65,.4);color:#e6c179}',
      '.mn-chip-removed{background:rgba(229,115,115,.14);border-color:rgba(229,115,115,.4);color:#ef9a9a}',
      '.mn-chip-view{background:rgba(109,94,252,.14);border-color:rgba(109,94,252,.45);color:#a99dff}',
      '.mn-chip-warn{background:rgba(229,115,115,.14);border-color:rgba(229,115,115,.4);color:#ef9a9a}',
      '.mn-push-body{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:18px;',
        'padding:18px 20px;overflow:auto}',
      '.mn-push-section{min-width:0}',
      '.mn-push-section-title{font:600 12px/1.4 system-ui;color:#9a9a9a;text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px}',
      '.mn-push-previews{display:flex;align-items:stretch;gap:10px}',
      '.mn-push-preview-box{flex:1;min-width:0;display:flex;flex-direction:column;gap:6px}',
      '.mn-preview-label{font:600 12px/1.4 system-ui;color:#c8c8c8}',
      '.mn-preview{position:relative;height:200px;overflow:hidden;background:#141414;border:1px solid #303030;border-radius:8px}',
      '.mn-preview-stage{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}',
      '.mn-preview-world{position:relative;transform-origin:50% 50%;background:radial-gradient(circle,#333 1px,transparent 1.2px);',
        'background-size:20px 20px}',
      '.mn-preview-card{position:absolute;background:#2a2a2a;border:1px solid #414141;border-left:3px solid #6d5efc;',
        'border-radius:4px;display:flex;align-items:center;gap:6px;padding:5px 7px;box-sizing:border-box;overflow:hidden;min-width:0}',
      '.mn-preview-ico{flex:none;display:inline-flex}',
      '.mn-preview-ico svg{width:14px;height:14px;display:block}',
      '.mn-preview-txt{flex:1;min-width:0;font:11px/1.3 system-ui;color:#e7e7e7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.mn-preview-empty{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#6a6a6a;font-size:12px}',
      '.mn-push-arrow{flex:none;align-self:center;color:#6d5efc;font-size:18px;padding:0 2px}',
      '.mn-push-vp{margin-top:10px;display:flex;flex-direction:column;gap:4px;font:500 12px/1.6 system-ui;color:#b8b8b8}',
      '.mn-push-vp .mn-push-lines{color:#a99dff}',
      '.mn-diff-list{display:flex;flex-direction:column;gap:6px;max-height:340px;overflow:auto;padding-right:4px}',
      '.mn-diff-item{display:flex;align-items:flex-start;gap:8px;padding:8px 10px;background:#232323;border:1px solid #333;',
        'border-radius:8px;min-width:0}',
      '.mn-diff-sign{flex:none;width:16px;height:16px;border-radius:4px;display:flex;align-items:center;justify-content:center;',
        'font:700 12px/1 system-ui;margin-top:1px}',
      '.mn-diff-added .mn-diff-sign{background:rgba(76,175,125,.2);color:#7bd8a4}',
      '.mn-diff-modified .mn-diff-sign{background:rgba(217,164,65,.2);color:#e6c179}',
      '.mn-diff-removed .mn-diff-sign{background:rgba(229,115,115,.2);color:#ef9a9a}',
      '.mn-diff-ico{flex:none;display:inline-flex}',
      '.mn-diff-ico svg{width:15px;height:15px;display:block}',
      '.mn-diff-body{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}',
      '.mn-diff-title{font:500 12.5px/1.4 system-ui;color:#e7e7e7;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.mn-diff-fields{display:flex;flex-wrap:wrap;gap:4px}',
      '.mn-diff-field{font:600 10.5px/1 system-ui;color:#9a9a9a;background:#2e2e2e;border-radius:4px;padding:2px 6px}',
      '.mn-diff-none{padding:20px;text-align:center;color:#6a6a6a;font-size:13px}',
      '.mn-push-foot{flex:none;border-top:1px solid #2e2e2e;padding:14px 20px;display:flex;flex-direction:column;gap:12px}',
      '.mn-push-config{display:flex;gap:12px;flex-wrap:wrap}',
      '.mn-push-field{display:flex;flex-direction:column;gap:5px;flex:1;min-width:200px;font:600 11px/1.2 system-ui;color:#9a9a9a}',
      '.mn-push-field-sm{flex:0 0 120px;min-width:120px}',
      '.mn-push-input{background:#141414;border:1px solid #3a3a3a;border-radius:8px;color:#e7e7e7;font:400 13px/1.4 system-ui;',
        'padding:8px 11px;outline:none;box-sizing:border-box;width:100%}',
      '.mn-push-input:focus{border-color:#6d5efc;box-shadow:0 0 0 2px rgba(109,94,252,.25)}',
      '.mn-push-input::placeholder{color:#5a5a5a}',
      '.mn-push-actions{display:flex;justify-content:flex-end;gap:10px;align-items:center}',
      '.mn-push-err{flex:1;color:#ef9a9a;font:500 12.5px/1.4 system-ui;white-space:pre-wrap;display:none;min-width:0}',
      '.mn-push-btn{display:inline-flex;align-items:center;gap:7px;padding:9px 16px;border-radius:8px;border:1px solid #3a3a3a;',
        'background:#2a2a2a;color:#e7e7e7;font:600 13px/1 system-ui;cursor:pointer;white-space:nowrap}',
      '.mn-push-btn:hover:not(:disabled){background:#383838}',
      '.mn-push-btn:disabled{opacity:.55;cursor:not-allowed}',
      '.mn-push-btn.mn-push-primary{background:#6d5efc;border-color:#6d5efc;color:#fff}',
      '.mn-push-btn.mn-push-primary:hover:not(:disabled){background:#7d6efc}',
      '.mn-push-success{min-height:200px;align-items:center;justify-content:center;gap:10px;padding:40px;text-align:center}',
      '.mn-push-success-ico{width:48px;height:48px;border-radius:50%;background:rgba(76,175,125,.18);color:#7bd8a4;',
        'display:flex;align-items:center;justify-content:center;font-size:26px}',
      '.mn-push-success-title{font:600 18px/1.3 system-ui;color:#fff}',
      '.mn-push-success-sub{font:500 13px/1.5 system-ui;color:#9a9a9a}',
      '.mn-push-topbtn{display:inline-flex;align-items:center;gap:6px;padding:6px 11px;border-radius:5px;',
        'border:1px solid #3a3a3a;background:#2f2f2f;color:#e7e7e7;font:600 12px/1 system-ui;cursor:pointer;',
        'white-space:nowrap;flex:none}',
      '.mn-push-topbtn:hover{background:#3a3a3a;border-color:#6d5efc}',
      '.mn-push-topbtn svg{width:14px;height:14px;flex:none;color:#c8c8c8}',
      '.mn-push-topbtn-label{white-space:nowrap}',
  ].join('\n')

  function injectStyles() {
      var tag = document.getElementById(CSS_ID)
      if (tag) {
        if (tag.textContent !== CSS) tag.textContent = CSS  // 自愈：旧内容直接覆盖
        return
      }
      tag = document.createElement('style')
      tag.id = CSS_ID
      tag.textContent = CSS
      document.head.appendChild(tag)
  }

  injectStyles()  // 注册即注入样式（幂等自愈），无需等实例化

  registry['sync'] = function (deps) {
    var el = deps.el, elNS = deps.elNS, t = deps.t
    var colorForType = deps.colorForType, contentIcon = deps.contentIcon
    var typeLabel = deps.typeLabel, cardLabel = deps.cardLabel
    var api = deps.api, emptyBoard = deps.emptyBoard
    var getBoard = deps.getBoard, getWorkspace = deps.getWorkspace


    // ---------------------------------------------------------------------
    // GitHub push: before pushing, diff the in-memory board against the last
    // committed board.json and show a review dialog with (1) a visual
    // before/after view comparison and (2) an added/modified/removed card list.
    // ---------------------------------------------------------------------
    var FIELD_LABELS = { type: '类型', text: '文本', xy: '位置', wh: '尺寸', meta: '属性' }

    function changedFields(a, b) {
      var fields = []
      if ((a.type || '') !== (b.type || '')) fields.push('type')
      if ((a.text || '') !== (b.text || '')) fields.push('text')
      if ((a.x || 0) !== (b.x || 0) || (a.y || 0) !== (b.y || 0)) fields.push('xy')
      if ((a.w || 0) !== (b.w || 0) || (a.h || 0) !== (b.h || 0)) fields.push('wh')
      if (JSON.stringify(a.meta || {}) !== JSON.stringify(b.meta || {})) fields.push('meta')
      return fields
    }
    function computeCardDiff(headBoard, curBoard) {
      var headCards = (headBoard && Array.isArray(headBoard.cards)) ? headBoard.cards : []
      var curCards = Array.isArray(curBoard.cards) ? curBoard.cards : []
      var headMap = {}, curMap = {}
      headCards.forEach(function (c) { headMap[c.id] = c })
      curCards.forEach(function (c) { curMap[c.id] = c })

      var added = [], removed = [], modified = []
      curCards.forEach(function (c) { if (!headMap[c.id]) added.push(c) })
      headCards.forEach(function (c) { if (!curMap[c.id]) removed.push(c) })
      curCards.forEach(function (c) {
        var before = headMap[c.id]
        if (!before) return
        var fields = changedFields(before, c)
        if (fields.length > 0) modified.push({ card: c, before: before, fields: fields })
      })

      var headLines = (headBoard && Array.isArray(headBoard.lines)) ? headBoard.lines : []
      var curLines = Array.isArray(curBoard.lines) ? curBoard.lines : []
      var linesChanged = JSON.stringify(headLines) !== JSON.stringify(curLines)
      return { added: added, removed: removed, modified: modified, linesChanged: linesChanged }
    }
    function viewportChanged(headBoard, curBoard) {
      var hv = (headBoard && headBoard.viewport) || { x: 0, y: 0, zoom: 1 }
      var cv = curBoard.viewport || { x: 0, y: 0, zoom: 1 }
      return hv.x !== cv.x || hv.y !== cv.y || hv.zoom !== cv.zoom
    }
    function titleChanged(headBoard, curBoard) {
      return (((headBoard && headBoard.title) || '') !== (curBoard.title || ''))
    }
    function githubIcon() {
      var s = elNS('svg', { viewBox: '0 0 16 16', width: '16', height: '16', fill: 'currentColor', 'aria-hidden': 'true' })
      s.appendChild(elNS('path', { d: 'M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z' }))
      return s
    }

    // Static, scaled-down thumbnail of a board document (fit-to-content).
    function renderBoardPreview(doc, container) {
      container.innerHTML = ''
      var cards = Array.isArray(doc && doc.cards) ? doc.cards : []
      if (cards.length === 0) {
        container.appendChild(el('div', { class: 'mn-preview-empty' }, [t('（空画板）')]))
        return
      }
      var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      cards.forEach(function (c) {
        var w = c.w || 180, h = c.h || 60
        minX = Math.min(minX, c.x || 0); minY = Math.min(minY, c.y || 0)
        maxX = Math.max(maxX, (c.x || 0) + w); maxY = Math.max(maxY, (c.y || 0) + h)
      })
      var PAD = 36
      var ox = minX - PAD, oy = minY - PAD
      var cw = (maxX - minX) + PAD * 2, ch = (maxY - minY) + PAD * 2
      var vw = container.clientWidth || 360, vh = container.clientHeight || 200
      var scale = Math.min(vw / cw, vh / ch, 1.5)

      var stage = el('div', { class: 'mn-preview-stage' })
      var world = el('div', { class: 'mn-preview-world', style: {
        width: cw + 'px', height: ch + 'px', transform: 'scale(' + scale + ')',
      } })
      cards.forEach(function (c) {
        var box = el('div', { class: 'mn-preview-card', style: {
          left: ((c.x || 0) - ox) + 'px', top: ((c.y || 0) - oy) + 'px',
          width: (c.w || 180) + 'px', height: (c.h || 60) + 'px',
          borderLeftColor: colorForType(c.type),
        } })
        box.appendChild(el('span', { class: 'mn-preview-ico', style: { color: colorForType(c.type) } }, [contentIcon(c.type)]))
        box.appendChild(el('span', { class: 'mn-preview-txt' }, [cardLabel(c)]))
        world.appendChild(box)
      })
      stage.appendChild(world)
      container.appendChild(stage)
    }

    // ---- push dialog state ----
    var pushDialogEl = null
    var pushRemoteInput = null
    var pushBranchInput = null
    var pushConfirmBtn = null
    var pushErrEl = null
    var pushKeyHandler = null

    function closePushDialog() {
      if (pushDialogEl) { pushDialogEl.remove(); pushDialogEl = null }
      if (pushKeyHandler) { document.removeEventListener('keydown', pushKeyHandler); pushKeyHandler = null }
      pushRemoteInput = null
      pushBranchInput = null
      pushConfirmBtn = null
      pushErrEl = null
    }

    function diffRow(sign, cls, card, fields) {
      var row = el('div', { class: 'mn-diff-item ' + cls })
      row.appendChild(el('span', { class: 'mn-diff-sign' }, [sign]))
      row.appendChild(el('span', { class: 'mn-diff-ico', style: { color: colorForType(card.type) } }, [contentIcon(card.type)]))
      var body = el('div', { class: 'mn-diff-body' })
      body.appendChild(el('div', { class: 'mn-diff-title' }, [typeLabel(card.type) + ' · ' + cardLabel(card)]))
      if (fields && fields.length > 0) {
        var tags = el('div', { class: 'mn-diff-fields' })
        fields.forEach(function (f) { tags.appendChild(el('span', { class: 'mn-diff-field' }, [t(FIELD_LABELS[f] || f)])) })
        body.appendChild(tags)
      }
      row.appendChild(body)
      return row
    }

    function renderPushDialog(head) {
      if (!pushDialogEl) return
      var board = getBoard()
      var headBoard = (head && head.board) || null
      var remote = (head && head.remote) || ''
      var branch = (head && head.branch) || 'main'
      var headError = head && head.error ? String(head.error) : ''
      var diff = computeCardDiff(headBoard, board)
      var vpChanged = viewportChanged(headBoard, board)
      var tChanged = titleChanged(headBoard, board)
      var total = diff.added.length + diff.removed.length + diff.modified.length
      var headTitle = headBoard ? ((headBoard.title || '') || t('（空）')) : t('（从未推送）')
      var hv = (headBoard && headBoard.viewport) || { x: 0, y: 0, zoom: 1 }
      var cv = board.viewport || { x: 0, y: 0, zoom: 1 }

      var dialog = el('div', { class: 'mn-push-dialog' })

      // header
      dialog.appendChild(el('div', { class: 'mn-push-head' }, [
        el('div', { class: 'mn-push-title' }, [githubIcon(), t('推送到 GitHub')]),
        el('button', { class: 'mn-push-x', title: t('关闭'), type: 'button', onclick: closePushDialog }, ['✕']),
      ]))

      // summary chips
      var chips = el('div', { class: 'mn-push-summary' })
      function chip(cls, label) { return el('span', { class: 'mn-push-chip ' + cls }, [label]) }
      chips.appendChild(chip('mn-chip-added', '+' + diff.added.length + t(' 新增')))
      chips.appendChild(chip('mn-chip-modified', '~' + diff.modified.length + t(' 修改')))
      chips.appendChild(chip('mn-chip-removed', '−' + diff.removed.length + t(' 删除')))
      if (vpChanged || tChanged || diff.linesChanged) chips.appendChild(chip('mn-chip-view', t('视图已变化')))
      if (headError) chips.appendChild(chip('mn-chip-warn', t('读取失败，仅展示当前状态')))
      dialog.appendChild(chips)

      // body: view comparison + card list
      var bodyEl = el('div', { class: 'mn-push-body' })

      var viewSection = el('div', { class: 'mn-push-section' }, [
        el('div', { class: 'mn-push-section-title' }, [t('视图变化对比')]),
      ])
      var previews = el('div', { class: 'mn-push-previews' })
      var beforeBox = el('div', { class: 'mn-push-preview-box' }, [
        el('div', { class: 'mn-preview-label' }, [t('推送前 · GitHub')]),
        el('div', { class: 'mn-preview' }),
      ])
      var afterBox = el('div', { class: 'mn-push-preview-box' }, [
        el('div', { class: 'mn-preview-label' }, [t('推送后 · 当前')]),
        el('div', { class: 'mn-preview' }),
      ])
      previews.appendChild(beforeBox)
      previews.appendChild(el('div', { class: 'mn-push-arrow' }, ['→']))
      previews.appendChild(afterBox)
      viewSection.appendChild(previews)

      var vpText = el('div', { class: 'mn-push-vp' })
      vpText.appendChild(el('div', {}, [t('缩放：') + Math.round(hv.zoom * 100) + '% → ' + Math.round(cv.zoom * 100) + '%']))
      vpText.appendChild(el('div', {}, [t('位置：(') + Math.round(hv.x) + ', ' + Math.round(hv.y) + ') → (' + Math.round(cv.x) + ', ' + Math.round(cv.y) + ')']))
      vpText.appendChild(el('div', {}, [t('标题：') + headTitle + ' → ' + (board.title || t('（空）'))]))
      if (diff.linesChanged) vpText.appendChild(el('div', { class: 'mn-push-lines' }, [t('连线已变化')]))
      viewSection.appendChild(vpText)

      var listSection = el('div', { class: 'mn-push-section' }, [
        el('div', { class: 'mn-push-section-title' }, [t('卡片变更列表')]),
      ])
      var listEl = el('div', { class: 'mn-diff-list' })
      diff.added.forEach(function (c) { listEl.appendChild(diffRow('+', 'mn-diff-added', c, null)) })
      diff.modified.forEach(function (m) { listEl.appendChild(diffRow('~', 'mn-diff-modified', m.card, m.fields)) })
      diff.removed.forEach(function (c) { listEl.appendChild(diffRow('−', 'mn-diff-removed', c, null)) })
      if (total === 0) listEl.appendChild(el('div', { class: 'mn-diff-none' }, [t('没有检测到卡片变更')]))
      listSection.appendChild(listEl)

      bodyEl.appendChild(viewSection)
      bodyEl.appendChild(listSection)
      dialog.appendChild(bodyEl)

      // footer: remote/branch config + actions
      var foot = el('div', { class: 'mn-push-foot' })
      var remoteRow = el('div', { class: 'mn-push-config' })
      remoteRow.appendChild(el('label', { class: 'mn-push-field' }, [
        el('span', {}, [t('GitHub 远程仓库 (https://… 或 git@… .git)')]),
        (pushRemoteInput = el('input', { class: 'mn-push-input', placeholder: 'https://github.com/you/repo.git', value: remote, spellcheck: 'false' })),
      ]))
      remoteRow.appendChild(el('label', { class: 'mn-push-field mn-push-field-sm' }, [
        el('span', {}, [t('分支')]),
        (pushBranchInput = el('input', { class: 'mn-push-input', placeholder: 'main', value: branch, spellcheck: 'false' })),
      ]))
      foot.appendChild(remoteRow)

      var actions = el('div', { class: 'mn-push-actions' })
      pushErrEl = el('div', { class: 'mn-push-err' })
      var cancelBtn = el('button', { class: 'mn-push-btn', type: 'button', onclick: closePushDialog }, [t('取消')])
      var confirmBtn = el('button', { class: 'mn-push-btn mn-push-primary', type: 'button', onclick: doPush }, [t('推送到 GitHub')])
      pushConfirmBtn = confirmBtn
      actions.appendChild(pushErrEl)
      actions.appendChild(cancelBtn)
      actions.appendChild(confirmBtn)
      foot.appendChild(actions)
      dialog.appendChild(foot)

      pushDialogEl.innerHTML = ''
      pushDialogEl.appendChild(dialog)

      // Render previews after the dialog is in the DOM so sizes are measurable.
      renderBoardPreview(headBoard || emptyBoard(), beforeBox.querySelector('.mn-preview'))
      renderBoardPreview(board, afterBox.querySelector('.mn-preview'))
    }

    function doPush() {
      if (!pushConfirmBtn) return
      var remote = pushRemoteInput ? pushRemoteInput.value.trim() : ''
      var branch = pushBranchInput ? pushBranchInput.value.trim() : ''
      pushConfirmBtn.disabled = true
      pushConfirmBtn.textContent = t('推送中…')
      if (pushErrEl) pushErrEl.style.display = 'none'
      api.push(getBoard(), getWorkspace(), remote, branch).then(function (res) {
        var st = (res && res.status) || {}
        if (st.error) { showPushFailure(st.error); return }
        showPushSuccess(st)
      }).catch(function (e) {
        showPushFailure(String(e && (e.message || e) || e))
      })
    }
    function showPushFailure(msg) {
      if (!pushDialogEl) return
      if (pushErrEl) { pushErrEl.textContent = msg; pushErrEl.style.display = 'block' }
      if (pushConfirmBtn) { pushConfirmBtn.disabled = false; pushConfirmBtn.textContent = t('推送到 GitHub') }
    }
    function showPushSuccess(st) {
      if (!pushDialogEl) return
      var pushed = !!(st && st.pushed)
      pushDialogEl.innerHTML = ''
      pushDialogEl.appendChild(el('div', { class: 'mn-push-dialog mn-push-success' }, [
        el('div', { class: 'mn-push-success-ico' }, ['✓']),
        el('div', { class: 'mn-push-success-title' }, [t('已推送完成')]),
        el('div', { class: 'mn-push-success-sub' }, [
          pushed ? t('已推送到 GitHub 远程仓库。') : t('已提交到本地 git 历史（未配置远程仓库，仅本地提交）。'),
        ]),
        el('button', { class: 'mn-push-btn mn-push-primary', type: 'button', onclick: closePushDialog }, [t('完成')]),
      ]))
    }

    function openPushDialog() {
      if (pushDialogEl) closePushDialog()
      pushDialogEl = el('div', { class: 'mn-push-backdrop' })
      pushDialogEl.appendChild(el('div', { class: 'mn-push-dialog mn-push-loading' }, [
        el('div', { class: 'mn-push-spinner' }),
        el('div', { class: 'mn-push-loading-txt' }, [t('正在读取已推送版本…')]),
      ]))
      pushDialogEl.addEventListener('click', function (e) {
        if (e.target === pushDialogEl) closePushDialog()
      })
      pushKeyHandler = function (e) {
        if (e.key === 'Escape') closePushDialog()
      }
      document.addEventListener('keydown', pushKeyHandler)
      document.body.appendChild(pushDialogEl)
      api.gitHead().then(renderPushDialog).catch(function (e) {
        renderPushDialog({ error: String(e && (e.message || e) || e) })
      })
    }

    // 顶栏按钮：GitHub 图标 + sync 文案
    function createSyncButton() {
      return el('button', {
        class: 'mn-push-topbtn',
        title: t('对比变更并推送到 GitHub'),
        type: 'button',
        onclick: function (e) { e.stopPropagation(); openPushDialog() },
      }, [
        githubIcon(),
        el('span', { class: 'mn-push-topbtn-label' }, ['sync']),
      ])
    }

    // 模块对外 API
    return {
      injectStyles: injectStyles,
      createButton: createSyncButton,
      openDialog: openPushDialog,
      closeDialog: closePushDialog,
    }
  }
})()
