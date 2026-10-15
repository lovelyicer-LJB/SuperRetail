// 🔴 改动 2026-10-13 · GI 点位生成管线：
// 读取 tools/gi-source-cnipa.txt（国家知识产权局 GI 名录）+ tools/gi-source-agi.txt（农业农村部 AGI 名录），
// 结合 tools/gi-manual-alias.json 手工落点表，用 tmp_shots/adcode-all.json（DataV 全国行政区中心点）做地理编码，
// 输出 apps/web/public/assets/atlas/gi-points.json。
// schema: [{ n:名称, t:'GI'|'AGI', c:区县adcode, p:[lng,lat], sr?:1(在册资产), sid?:工坊id, f?:1(仅省级精度) }]
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const TOOLS = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(TOOLS, '..')
const OUT = path.join(ROOT, 'apps/web/public/assets/atlas/gi-points.json')

// ---------- 行政区索引 ----------
const adcodes = JSON.parse(fs.readFileSync(path.join(TOOLS, '../tmp_shots/adcode-all.json'), 'utf-8'))
const byAdcode = new Map(adcodes.map((d) => [d.adcode, d]))

// 🔴 改动 2026-10-13 · 区名归一化：后缀只剥到「剩余核心名 ≥2 字」为止（保住「涉县/蠡县」等单字县、
// 「清新区」不被「新区」误剥）；民族族称按 56 民族显式名单从词尾剥离（「延边朝鲜族→延边」「乳源瑶族→乳源」）。
const SUFFIXES = ['特别行政区', '自治州', '自治县', '自治旗', '自治区', '地区', '林区', '新区', '盟', '省', '市', '区', '县', '旗']
const ETHNIC = [
  '维吾尔', '柯尔克孜', '乌孜别克', '塔吉克', '塔塔尔', '俄罗斯', '鄂温克', '鄂伦春', '达斡尔',
  '布依', '朝鲜', '哈萨克', '傈僳', '哈尼', '土家', '高山', '拉祜', '东乡', '纳西', '景颇',
  '仫佬', '布朗', '撒拉', '毛南', '仡佬', '锡伯', '阿昌', '普米', '德昂', '保安', '裕固',
  '独龙', '赫哲', '门巴', '珞巴', '基诺', '蒙古', '傣', '黎', '佤', '畲', '仡', '侗', '瑶',
  '苗', '彝', '壮', '满', '白', '水', '羌', '怒', '京', '回', '藏', '土', '汉',
]
const ETHNIC_RE = new RegExp(`(?:(?:${ETHNIC.join('|')})族)+$`)
function strip(n) {
  let prev
  do {
    prev = n
    for (const suf of SUFFIXES) {
      if (n.endsWith(suf) && n.length - suf.length >= 2) {
        n = n.slice(0, -suf.length)
        break
      }
    }
    n = n.replace(ETHNIC_RE, '')
  } while (n !== prev)
  return n
}

// 省 adcode → 该省全部行政区（含省自身）
const provOf = (d) => (d.level === 'province' ? d.adcode : d.level === 'city' ? d.parent : Math.floor(d.adcode / 10000) * 10000)
const byProv = new Map()
for (const d of adcodes) {
  const p = provOf(d)
  if (!byProv.has(p)) byProv.set(p, [])
  byProv.get(p).push({ ...d, stripped: strip(d.name) })
}
const provByName = new Map(adcodes.filter((d) => d.level === 'province').map((d) => [d.name, d]))

const LEVEL_RANK = { district: 0, city: 1, province: 2 }

function resolveInProv(targetName, provAdcode) {
  const pool = byProv.get(provAdcode) || []
  const ts = strip(targetName)
  const hits = pool.filter((e) => e.name === targetName || e.stripped === ts)
  hits.sort((a, b) => LEVEL_RANK[a.level] - LEVEL_RANK[b.level])
  return hits[0] || null
}

// ---------- 名录读取 ----------
const alias = JSON.parse(fs.readFileSync(path.join(TOOLS, 'gi-manual-alias.json'), 'utf-8'))
delete alias._comment

function readSource(file, type) {
  const lines = fs.readFileSync(path.join(TOOLS, file), 'utf-8').split(/\r?\n/)
  const rows = []
  for (const line of lines) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const [prov, name] = t.split('|').map((s) => s.trim())
    if (!prov || !name) continue
    rows.push({ prov, name, type })
  }
  return rows
}

const rows = [
  ...readSource('gi-source-cnipa.txt', 'GI'),
  ...readSource('gi-source-agi.txt', 'AGI'),
]

// ---------- 地理编码 ----------
function hashStr(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const results = []
const seen = new Map()
const fallbacks = []
const aliasMiss = []

function locate(row) {
  const provEntry = provByName.get(row.prov)
  if (!provEntry) return { err: `省份未识别: ${row.prov}` }
  const pool = byProv.get(provEntry.adcode)

  // 1) 手工落点表
  const at = alias[row.name]
  if (at) {
    const hit = resolveInProv(at, provEntry.adcode)
    if (hit) return { entry: hit }
    aliasMiss.push(`${row.name} → ${at}（${row.prov} 内未解析）`)
  }

  // 2) 区名最长前缀匹配
  const cands = pool
    .filter((e) => e.stripped.length >= 2 && row.name.startsWith(e.stripped))
    .sort((a, b) => b.stripped.length - a.stripped.length || LEVEL_RANK[a.level] - LEVEL_RANK[b.level])
  if (cands.length) return { entry: cands[0] }

  // 3) 省级中心兜底
  return { entry: { ...provEntry, stripped: strip(provEntry.name) }, fallback: true }
}

function jitter(name, scale) {
  const h = hashStr(name)
  const dx = (((h & 1023) / 1023) - 0.5) * 2 * scale
  const dy = ((((h >> 10) & 1023) / 1023) - 0.5) * 2 * scale * 0.7
  return [dx, dy]
}

for (const row of rows) {
  if (seen.has(row.name)) continue
  const { entry, fallback, err } = locate(row)
  if (err) {
    fallbacks.push(`${row.name}（${err}）`)
    continue
  }
  const [dx, dy] = jitter(row.name, fallback ? 0.8 : 0.13)
  const rec = {
    n: row.name,
    t: row.type,
    c: entry.adcode,
    p: [+(entry.lng + dx).toFixed(4), +(entry.lat + dy).toFixed(4)],
  }
  if (fallback) {
    rec.f = 1
    fallbacks.push(`${row.name}（${row.prov} 省级兜底）`)
  }
  seen.set(row.name, rec)
  results.push(rec)
}

// ---------- 12 款在册资产 ----------
const SR = [
  { n: '西湖龙井', sid: 'xihu-longjing', at: '西湖区', prov: '浙江省', t: 'GI' },
  { n: '金华火腿', sid: 'jinhua-ham', at: '婺城区', prov: '浙江省', t: 'GI' },
  { n: '安集海辣皮子', sid: 'anjihai-chili', at: '沙湾市', prov: '新疆维吾尔自治区', t: 'AGI' },
  { n: '樟树港辣椒', sid: 'zhangshugang-chili', at: '湘阴县', prov: '湖南省', t: 'AGI' },
  { n: '郫县豆瓣', sid: 'pixian-douban', at: '郫都区', prov: '四川省', t: 'GI' },
  { n: '汉源花椒', sid: 'hanyuan-huajiao', at: '汉源县', prov: '四川省', t: 'GI' },
  { n: '五常大米', sid: 'wuchang-rice', at: '五常市', prov: '黑龙江省', t: 'GI' },
  { n: '盱眙龙虾', sid: 'xuyi-crayfish', at: '盱眙县', prov: '江苏省', t: 'GI' },
  { n: '盐池滩羊', sid: 'yanchi-tanyang', at: '盐池县', prov: '宁夏回族自治区', t: 'GI' },
  { n: '大连海参', sid: 'dalian-haishen', at: '长海县', prov: '辽宁省', t: 'GI' },
  { n: '章丘大葱', sid: 'zhangqiu-dacong', at: '章丘区', prov: '山东省', t: 'AGI' },
  { n: '兰州百合', sid: 'lanzhou-baihe', at: '七里河区', prov: '甘肃省', t: 'AGI' },
]
const srMiss = []
for (const sr of SR) {
  const provEntry = provByName.get(sr.prov)
  const hit = resolveInProv(sr.at, provEntry.adcode)
  if (!hit) {
    srMiss.push(`${sr.n} → ${sr.at} 未解析`)
    continue
  }
  const exist = seen.get(sr.n)
  const [dx, dy] = jitter(sr.n, 0.13)
  const p = [+(hit.lng + dx).toFixed(4), +(hit.lat + dy).toFixed(4)]
  if (exist) {
    exist.sr = 1
    exist.sid = sr.sid
    exist.c = hit.adcode
    exist.p = p
    delete exist.f
  } else {
    const rec = { n: sr.n, t: sr.t, c: hit.adcode, p, sr: 1, sid: sr.sid }
    seen.set(sr.n, rec)
    results.push(rec)
  }
}

// ---------- 输出 ----------
results.sort((a, b) => a.c - b.c || a.n.localeCompare(b.n, 'zh'))
fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, JSON.stringify(results))

const gi = results.filter((r) => r.t === 'GI').length
const agi = results.filter((r) => r.t === 'AGI').length
console.log(`总点位 ${results.length}（GI ${gi} / AGI ${agi}），在册资产 ${results.filter((r) => r.sr).length} 款`)
console.log(`输出: ${OUT}（${(fs.statSync(OUT).size / 1024).toFixed(1)} KB）`)
if (aliasMiss.length) console.log(`\n别名未解析 ${aliasMiss.length}:\n  ${aliasMiss.join('\n  ')}`)
if (srMiss.length) console.log(`\n在册资产未解析 ${srMiss.length}:\n  ${srMiss.join('\n  ')}`)
if (fallbacks.length) console.log(`\n省级兜底 ${fallbacks.length}:\n  ${fallbacks.join('\n  ')}`)
