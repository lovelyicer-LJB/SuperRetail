// ============================================================================
// Evoloop 客户端子模块：cards-workflow（n8n 工作流节点卡片）
//
// 🔴 改动 2026-09-25 · 自 client.js 整体拆出（原内联块约 130 行 +
// .mn-wf-* 样式 13 条），按架构文档「十一、模块化规则」作为新规则首块样板。
//
// 加载方式同 sync.js（方案A · 注册表模式，详见该文件头注释）。
// deps：el / uid / getBoard / getRootEl / createCard / renderCard /
//       renderLines / reRender / applyViewport / scheduleSave /
//       importWorkflow / exportWorkflow / openN8n
// 卡片数据：card.meta.n8n = { id, name, type, typeVersion, parameters, position }，
// 连线数据：line = { workflow:true, channel, output, input }，均随 board.json 落盘。
// ============================================================================
;(function () {
  var registry = window.__EVOLOOP__ = window.__EVOLOOP__ || {}
  if (registry['cards-workflow']) return

  // ---- 样式（自注入 + 自愈）----
  // 与 client.js 主常量保持一致（注册期注入样式时 deps 尚不存在，故硬编码）
  var OVERLAY_ID = 'dsh-evoloop-overlay'
  var CSS_ID = 'dsh-evoloop-cards-workflow-css'
  var CSS = [
      '#' + OVERLAY_ID + ' .mn-wf-card{height:100%;box-sizing:border-box;padding:16px;display:flex;flex-direction:column;gap:10px;border-left:3px solid #f28b70}',
      '#' + OVERLAY_ID + ' .mn-wf-kind{font:600 11px system-ui;color:#f28b70;text-transform:uppercase;letter-spacing:.05em}',
      '#' + OVERLAY_ID + ' .mn-wf-name{font:600 16px system-ui;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '#' + OVERLAY_ID + ' .mn-wf-caption{font:11px system-ui;color:var(--mn-muted)}',
      '#' + OVERLAY_ID + ' .mn-wf-ports{margin-top:auto;display:flex;justify-content:space-between;font:11px system-ui;color:var(--mn-muted)}',
      '#' + OVERLAY_ID + ' .mn-wf-shade{position:absolute;inset:0;background:#0006;z-index:200;display:flex;align-items:center;justify-content:center;padding:16px}',
      '#' + OVERLAY_ID + ' .mn-wf-dialog{width:580px;max-width:100%;max-height:90%;overflow:auto;background:var(--mn-surface);color:var(--mn-text);border:1px solid var(--mn-border);border-radius:12px;box-shadow:0 20px 70px #0005;padding:20px;font:13px/1.6 system-ui;box-sizing:border-box}',
      '#' + OVERLAY_ID + ' .mn-wf-heading{display:flex;align-items:center;justify-content:space-between;font-size:18px}',
      '#' + OVERLAY_ID + ' .mn-wf-palette{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}',
      '#' + OVERLAY_ID + ' .mn-wf-field{display:flex;flex-direction:column;gap:6px;margin:12px 0}',
      '#' + OVERLAY_ID + ' .mn-wf-field input:not([type=checkbox]),#' + OVERLAY_ID + ' .mn-wf-field select,#' + OVERLAY_ID + ' .mn-wf-json{box-sizing:border-box;width:100%;padding:9px;border:1px solid var(--mn-border);border-radius:6px;background:var(--mn-bg);color:var(--mn-text);font:13px/1.5 system-ui}',
      '#' + OVERLAY_ID + ' .mn-wf-json{min-height:190px;resize:vertical;font-family:monospace}',
      '#' + OVERLAY_ID + ' .mn-wf-status{color:#f28b70;white-space:pre-wrap}',
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

  registry['cards-workflow'] = function (deps) {
    var el = deps.el, uid = deps.uid
    var getBoard = deps.getBoard, getRootEl = deps.getRootEl
    var createCard = deps.createCard, renderCard = deps.renderCard
    var renderLines = deps.renderLines, reRender = deps.reRender
    var applyViewport = deps.applyViewport, scheduleSave = deps.scheduleSave
    var importWorkflow = deps.importWorkflow, exportWorkflow = deps.exportWorkflow
    var openN8n = deps.openN8n

    // Native workflow cards share Evoloop's canvas, selection and persistence.
    // 🔴 改动 2026-09-25 · 节点名改英文（卡片名字先用英文，与 n8n 官方节点名对齐）
    // ↳ 改前[js]: 手动触发/HTTP 请求/编辑字段/条件分支/合并/等待/代码
    // ↳ 改后[js]: Manual Trigger/HTTP Request/Set/IF/Merge/Wait/Code
    var WORKFLOW_TYPES = [
      ['Manual Trigger', 'manualTrigger', 1, {}],
      ['Webhook', 'webhook', 2, { httpMethod: 'POST', path: 'evoloop', options: {} }],
      ['HTTP Request', 'httpRequest', 4.2, { method: 'GET', url: '', options: {} }],
      ['Set', 'set', 3.4, { assignments: { assignments: [] }, options: {} }],
      ['IF', 'if', 2.2, { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 }, conditions: [], combinator: 'and' }, options: {} }],
      ['Merge', 'merge', 3, { mode: 'append', numberInputs: 2 }],
      ['Wait', 'wait', 1.1, { amount: 1, unit: 'minutes' }],
      ['Code', 'code', 2, { jsCode: 'return $input.all();' }]
    ]
    function workflowDialog(title) {
      var root = getRootEl()
      var previous = root.querySelector('.mn-wf-shade')
      if (previous) previous.remove()
      var shade = el('div', { class: 'mn-wf-shade' })
      var dialog = el('div', { class: 'mn-wf-dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': title, tabindex: '-1' })
      var focusBefore = document.activeElement
      function closeDialog() { shade.remove(); if (focusBefore && focusBefore.isConnected) focusBefore.focus() }
      dialog.appendChild(el('div', { class: 'mn-wf-heading' }, [el('strong', {}, [title]), el('button', { class: 'mn-btn', 'aria-label': '关闭', onclick: closeDialog }, ['×'])]))
      var content = el('div', { class: 'mn-wf-content' })
      var status = el('div', { class: 'mn-wf-status', role: 'status' })
      dialog.appendChild(content); dialog.appendChild(status); shade.appendChild(dialog); root.appendChild(shade)
      shade.addEventListener('pointerdown', function (e) { e.stopPropagation() })
      shade.addEventListener('keydown', function (e) {
        e.stopPropagation()
        if (e.key === 'Escape') closeDialog()
        if (e.key === 'Tab') {
          var inputs = dialog.querySelectorAll('button,input,select,textarea,a[href]')
          var first = inputs[0], last = inputs[inputs.length - 1]
          if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { e.preventDefault(); last.focus() }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
        }
      })
      dialog.focus()
      return { content: content, status: status, close: closeDialog }
    }
    function wfField(parent, label, input) {
      parent.appendChild(el('label', { class: 'mn-wf-field' }, [el('span', {}, [label]), input])); return input
    }
    function newWorkflowNode(spec) {
      var board = getBoard()
      var card = createCard('workflow')
      var name = spec[0], suffix = 2
      while (board.cards.some(function (c) { return c !== card && c.type === 'workflow' && c.meta.n8n.name === name })) name = spec[0] + ' ' + suffix++
      card.meta.n8n = { id: uid(), name: name, type: 'n8n-nodes-base.' + spec[1], typeVersion: spec[2], parameters: JSON.parse(JSON.stringify(spec[3])), position: [card.x, card.y] }
      card.text = name; renderCard(card); scheduleSave(); editWorkflowNode(card)
    }
    function buildWorkflow(node, card) {
      card.meta = card.meta || {}
      if (!card.meta.n8n) card.meta.n8n = { id: uid(), name: 'Manual Trigger ' + card.id, type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, parameters: {} }
      var n = card.meta.n8n
      var kind = n.type.split('.').pop()
      var spec = WORKFLOW_TYPES.find(function (x) { return x[1] === kind })
      node.appendChild(el('div', { class: 'mn-wf-card' }, [
        el('div', { class: 'mn-wf-kind' }, ['◇  ' + (spec ? spec[0] : kind)]),
        el('strong', { class: 'mn-wf-name' }, [n.name]),
        el('div', { class: 'mn-wf-caption' }, [n.disabled ? '已停用' : '双击配置 · 使用连线连接下一步']),
        el('div', { class: 'mn-wf-ports' }, [el('span', {}, ['○ 输入']), el('span', {}, [kind === 'if' ? 'True / False ○' : '输出 ○'])])
      ]))
      node.__edit = function () { editWorkflowNode(card) }
    }
    function editWorkflowNode(card) {
      var n = card.meta.n8n, ui = workflowDialog('配置节点 · ' + n.name)
      ui.content.appendChild(el('p', {}, ['节点名称：' + n.name + '（表达式通过此名称引用数据）']))
      var params = JSON.parse(JSON.stringify(n.parameters || {}))
      var url = null, method = null
      if (n.type === 'n8n-nodes-base.httpRequest') {
        url = wfField(ui.content, '请求地址', el('input', { type: 'url', placeholder: 'https://…' })); url.value = params.url || ''
        method = wfField(ui.content, '请求方法', el('select', {}, ['GET','POST','PUT','PATCH','DELETE','HEAD'].map(function (m) { return el('option', {value:m}, [m]) }))); method.value = params.method || 'GET'
      }
      var disabled = wfField(ui.content, '停用此节点', el('input', { type: 'checkbox' })); disabled.checked = !!n.disabled
      var text = wfField(ui.content, '节点参数（JSON，支持 n8n 表达式）', el('textarea', { class: 'mn-wf-json', spellcheck: 'false' })); text.value = JSON.stringify(params, null, 2)
      ui.content.appendChild(el('p', {}, ['凭证在 n8n 中配置。这里保存配置，不执行代码或表达式。']))
      ui.content.appendChild(el('button', { class: 'mn-btn mn-primary', onclick: function () {
        try {
          var value = JSON.parse(text.value)
          if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error('参数必须是 JSON 对象')
          if (url) { value.url = url.value; value.method = method.value }
          n.parameters = value; n.disabled = disabled.checked
          renderCard(card); scheduleSave(); ui.close()
        } catch (e) { ui.status.textContent = e.message }
      } }, ['保存配置']))
    }
    function editWorkflowLine(line) {
      var board = getBoard()
      var ui = workflowDialog('连接设置')
      var channel = wfField(ui.content, '连接类型', el('input', {})); channel.value = line.channel || 'main'
      var output = wfField(ui.content, '输出端口（0 为第一路，IF 的 1 为 False）', el('input', { type: 'number', min: '0', max: '99' })); output.value = line.output || 0
      var input = wfField(ui.content, '目标输入端口（从 0 开始）', el('input', { type: 'number', min: '0', max: '99' })); input.value = line.input || 0
      ui.content.appendChild(el('button', { class: 'mn-btn mn-primary', onclick: function () {
        var a = Number(output.value), b = Number(input.value)
        if (!channel.value.trim() || !Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0 || a > 99 || b > 99) { ui.status.textContent = '请输入有效端口（0–99）和连接类型'; return }
        line.channel = channel.value.trim(); line.targetType = line.channel; line.output = a; line.input = b
        renderLines(); scheduleSave(); ui.close()
      } }, ['保存连接']))
      ui.content.appendChild(el('button', { class: 'mn-btn', onclick: function () { board.lines = board.lines.filter(function (l) { return l.id !== line.id }); renderLines(); scheduleSave(); ui.close() } }, ['删除连接']))
    }
    // 🔴 注意 2026-09-25 · showWorkflowTools 在 client.js 内原本就没有调用点
    // （历史遗留：工作流工具箱入口尚未接线），拆分时原样保留并导出，待后续接入口。
    function showWorkflowTools() {
      var board = getBoard()
      var ui = workflowDialog('工作流')
      ui.content.appendChild(el('p', {}, ['把步骤放在画布上，使用“连线”依次选择起点和终点。双击节点配置，双击连线设置分支。']))
      var palette = el('div', { class: 'mn-wf-palette' })
      WORKFLOW_TYPES.forEach(function (spec) { palette.appendChild(el('button', { class: 'mn-btn', onclick: function () { ui.close(); newWorkflowNode(spec) } }, [spec[0]])) })
      ui.content.appendChild(palette)
      var json = wfField(ui.content, '导入 / 导出 n8n 工作流', el('textarea', { class: 'mn-wf-json', placeholder: '粘贴 n8n 工作流 JSON，或选择文件', spellcheck: 'false' }))
      var file = wfField(ui.content, '选择 JSON 文件', el('input', { type: 'file', accept: '.json,application/json' }))
      file.addEventListener('change', function () { if (file.files[0]) file.files[0].text().then(function (value) { json.value = value }).catch(function (e) { ui.status.textContent = e.message }) })
      var actions = el('div', { class: 'mn-wf-palette' })
      actions.appendChild(el('button', { class: 'mn-btn', onclick: function () {
        try {
          if (board.cards.some(function (c) { return c.type === 'workflow' })) throw new Error('当前画板已有工作流；请在空白子画板中导入，避免同名节点和表达式冲突')
          var mapped = importWorkflow(JSON.parse(json.value), uid)
          board.cards = board.cards.concat(mapped.cards); board.lines = (board.lines || []).concat(mapped.lines); board.workflowTemplate = mapped.template
          board.viewport.x = 40 - Math.min.apply(null, mapped.cards.map(function (c) { return c.x })); board.viewport.y = 40 - Math.min.apply(null, mapped.cards.map(function (c) { return c.y })); board.viewport.zoom = 1
          reRender(); applyViewport(); scheduleSave(); ui.close()
        } catch (e) { ui.status.textContent = e.message }
      } }, ['导入到画布']))
      actions.appendChild(el('button', { class: 'mn-btn', onclick: function () {
        try { json.value = JSON.stringify(exportWorkflow(board), null, 2); ui.status.textContent = '结构校验通过。工作流以未激活状态导出；在 n8n 中配置凭证并运行。' } catch (e) { ui.status.textContent = e.message }
      } }, ['校验并导出']))
      actions.appendChild(el('button', { class: 'mn-btn', onclick: function () {
        try {
          var value = JSON.stringify(exportWorkflow(board), null, 2)
          var url = URL.createObjectURL(new Blob([value], {type:'application/json'})), a = el('a', { href:url, download:'evoloop-workflow.json' })
          a.click(); setTimeout(function () { URL.revokeObjectURL(url) }, 1000)
        } catch (e) { ui.status.textContent = e.message }
      } }, ['下载 JSON']))
      actions.appendChild(el('button', { class: 'mn-btn', onclick: openN8n }, ['在 n8n 中运行 ↗']))
      ui.content.appendChild(actions)
      ui.content.appendChild(el('p', {}, ['运行方法：下载 JSON → 在 n8n 中导入 → 配置凭证 → 执行。执行记录和定时触发由 n8n 管理。']))
    }

    return {
      buildWorkflow: buildWorkflow,
      editWorkflowNode: editWorkflowNode,
      editWorkflowLine: editWorkflowLine,
      showWorkflowTools: showWorkflowTools,
      WORKFLOW_TYPES: WORKFLOW_TYPES,
    }
  }
})()
