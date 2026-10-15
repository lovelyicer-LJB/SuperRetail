// ============================================================================
// Evoloop 客户端子模块：cards-basic（基础卡片：note / link / color / comment）
//
// 加载方式同 sync.js（方案A · 注册表模式，样式注册期注入，详见该文件头注释）。
// deps：el / t / contentIcon / fitTextCard / scheduleSave / startEdit / stopEdit / setEditingId
// ============================================================================
;(function () {
  var registry = window.__EVOLOOP__ = window.__EVOLOOP__ || {}
  if (registry['cards-basic']) return

  // 与 client.js 主常量保持一致（注册期注入样式时 deps 尚不存在，故硬编码）
  var OVERLAY_ID = 'dsh-evoloop-overlay'
  var CSS_ID = 'dsh-evoloop-cards-basic-css'
  var CSS = [
    // --- note ---
    '#' + OVERLAY_ID + ' .mn-card:not(.mn-editing) .mn-note-ta{cursor:default}',
    '#' + OVERLAY_ID + ' .mn-card.mn-editing .mn-note-ta{cursor:text;user-select:text}',
    '#' + OVERLAY_ID + ' .mn-note{padding:0;width:100%;height:100%;display:flex}',
    '#' + OVERLAY_ID + ' .mn-note-ta{flex:1;border:none;outline:none;resize:none;padding:14px 16px;',
      'background:transparent;color:var(--mn-text);font:15px/1.6 system-ui,"Segoe UI",sans-serif;overflow:hidden}',
    '#' + OVERLAY_ID + ' .mn-note-ta.mn-empty::placeholder{color:var(--mn-muted)}',
    '#' + OVERLAY_ID + ' .mn-note-ta::placeholder{color:var(--mn-muted)}',
    // --- link ---
    '#' + OVERLAY_ID + ' .mn-link{display:flex;align-items:center;gap:12px;height:100%;padding:14px 16px;cursor:default}',
    '#' + OVERLAY_ID + ' .mn-link-icon{width:38px;height:38px;flex:none;display:flex;align-items:center;justify-content:center;font-size:18px;background:var(--mn-icon-bg);border-radius:4px}',
    '#' + OVERLAY_ID + ' .mn-link-body{min-width:0}',
    '#' + OVERLAY_ID + ' .mn-link-title{color:var(--mn-text);font:600 14px/1.4 system-ui;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '#' + OVERLAY_ID + ' .mn-link-title-input{width:100%;min-width:0;border:0;background:transparent;outline:none;color:inherit;font:inherit;padding:0;letter-spacing:inherit}',
    '#' + OVERLAY_ID + ' .mn-link-url{color:var(--mn-link);font:500 12px/1.4 system-ui;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    // --- color ---
    '#' + OVERLAY_ID + ' .mn-color{width:100%;height:100%;border-radius:4px;cursor:default}',
    '#' + OVERLAY_ID + ' .mn-color-picker{position:absolute;opacity:0;width:100%;height:100%;left:0;top:0;cursor:default;border:0;padding:0;background:transparent}',
    // --- comment ---
    '#' + OVERLAY_ID + ' .mn-comment{display:flex;flex-direction:column;height:100%;padding:12px 14px;box-sizing:border-box}',
    '#' + OVERLAY_ID + ' .mn-comment-head{color:#d5ad78;font:600 12px/1.6 system-ui;margin-bottom:4px}',
    '#' + OVERLAY_ID + ' .mn-comment-ta{flex:1;border:none;outline:none;resize:none;background:transparent;color:var(--mn-text);font:14px/1.6 system-ui;overflow:hidden;box-sizing:border-box}',
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

  registry['cards-basic'] = function (deps) {
    var el = deps.el, t = deps.t
    var contentIcon = deps.contentIcon
    var fitTextCard = deps.fitTextCard
    var scheduleSave = deps.scheduleSave
    var startEdit = deps.startEdit, stopEdit = deps.stopEdit
    var setEditingId = deps.setEditingId

    function buildNote(node, card) {
      var wrap = el('div', { class: 'mn-note' })
      var ta = el('textarea', {
        class: 'mn-note-ta',
        placeholder: t('写点什么…'),
        dataset: { mnTa: 'note', id: card.id },
      }, [card.text || ''])
      wrap.appendChild(ta)
      node.appendChild(wrap)

      function fit() {
        fitTextCard(node, card, ta, 'note', '15px system-ui,"Segoe UI",sans-serif')
      }
      ta.addEventListener('input', function () {
        card.text = ta.value
        fit()
        scheduleSave()
      })
      ta.addEventListener('blur', function () {
        stopEdit(card)
      })
      // Double-click enters the edit state (text editing).
      node.__edit = function (e) {
        startEdit(card, ta)
      }
      fit()
    }

    function buildLink(node, card) {
      var meta = card.meta || (card.meta = {})
      var wrap = el('div', { class: 'mn-link' })
      var icon = el('div', { class: 'mn-link-icon' }, [contentIcon('link')])
      var body = el('div', { class: 'mn-link-body' })
      var title = el('div', { class: 'mn-link-title' }, [meta.title || t('未命名链接')])
      var url = el('div', { class: 'mn-link-url' }, [meta.url || t('双击输入链接')])
      body.appendChild(title); body.appendChild(url)
      wrap.appendChild(icon); wrap.appendChild(body)
      node.appendChild(wrap)
      function editUrl() {
        var v = window.prompt(t('输入链接地址'), meta.url || 'https://')
        if (v && v.trim()) {
          meta.url = v.trim()
          url.textContent = meta.url
          title.textContent = meta.url.replace(/^https?:\/\//, '').split('/')[0] || meta.url
          scheduleSave()
        }
      }
      node.__edit = function (e) { editUrl() }
      // F2 — inline headline editing, no prompt dialog. Enter commits,
      // Escape cancels; dblclick stays local so it never re-opens the URL prompt.
      node.__rename = function () {
        if (title.querySelector('input')) return
        var inp = el('input', { class: 'mn-link-title-input', 'aria-label': t('重命名链接') })
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
          if (v) { meta.title = v; title.textContent = meta.title; scheduleSave() }
          else title.textContent = meta.title || t('未命名链接')
        })
      }
      node.style.height = 'auto'
    }

    function buildColor(node, card) {
      var meta = card.meta || (card.meta = {})
      if (!meta.color) meta.color = '#0AB9E6'
      node.style.width = '120px'; node.style.height = '120px'; card.w = 120; card.h = 120
      var sw = el('div', { class: 'mn-color' })
      sw.style.background = meta.color
      node.appendChild(sw)
      var picker = el('input', { type: 'color', class: 'mn-color-picker' })
      picker.value = meta.color
      picker.addEventListener('input', function () { meta.color = picker.value; sw.style.background = meta.color; scheduleSave() })
      node.appendChild(picker)
      node.__edit = function (e) { try { picker.click() } catch (err) {} }
    }

    function buildComment(node, card) {
      var wrap = el('div', { class: 'mn-comment' })
      var head = el('div', { class: 'mn-comment-head' }, [contentIcon('comment'), t('评论')])
      var ta = el('textarea', { class: 'mn-comment-ta', placeholder: t('留下评论…') }, [card.text || ''])
      ta.addEventListener('input', function () {
        card.text = ta.value
        fitTextCard(node, card, ta, 'comment', '14px system-ui,"Segoe UI",sans-serif')
        scheduleSave()
      })
      wrap.appendChild(head); wrap.appendChild(ta)
      node.appendChild(wrap)
      node.__edit = function (e) { setEditingId(card.id); ta.focus() }
      fitTextCard(node, card, ta, 'comment', '14px system-ui,"Segoe UI",sans-serif')
    }

    return {
      buildNote: buildNote,
      buildLink: buildLink,
      buildColor: buildColor,
      buildComment: buildComment,
    }
  }
})()
