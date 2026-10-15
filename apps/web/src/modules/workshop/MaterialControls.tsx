// 🔴 改动 2026-10-09 · 卡片旁的实时材质滑条与数值输入。
import { useState } from 'react'
import { defaults, foilSettings, laserSettings, physicalSettings, type MaterialValues, type Setting } from './materialSettings'

const extra = (key: string, label: string, value: number, min: number, max: number): Setting => ({ key, label, value, min, max, step: .01 })
const materialGroups = [
  { key: 'foil', label: '全息底材 · 虹彩与颜色', settings: foilSettings },
  { key: 'physical', label: '底材 · 物理反射', settings: physicalSettings },
  { key: 'outer', label: '外边框 · 彩条与银白高光', settings: laserSettings },
  { key: 'inner', label: '图片描边 · 彩条与银白高光', settings: laserSettings },
  { key: 'glass', label: '玻璃侧边', settings: [extra('red','颜色 R',.644,0,1),extra('green','颜色 G',.863,0,1),extra('blue','颜色 B',1,0,1),extra('roughness','粗糙度',.08,0,1),extra('transmission','透射强度',.95,0,1),extra('ior','折射率',1.5,1,2.5),extra('thickness','光学厚度',2,0,10),extra('clearcoat','清漆强度',1,0,1),extra('attenuationDistance','吸收距离',12,.1,50)] },
  { key: 'light', label: '灯光与曝光', settings: [extra('exposure','曝光',.8,.05,3),extra('ambient','环境灯强度',2,0,6),extra('direct','主灯强度',3,0,10),extra('x','主灯 X',-300,-1000,1000),extra('y','主灯 Y',400,-1000,1000),extra('z','主灯 Z',600,-1000,1000)] },
]
export type MaterialState = Record<string, MaterialValues>
const defaultMaterialState = (): MaterialState => Object.fromEntries(materialGroups.map(g => [g.key, defaults(g.settings)]))

export function MaterialControls({ onChange }: { onChange: (values: MaterialState) => void }) {
  const [values, setValues] = useState(defaultMaterialState)
  const apply = (next: MaterialState) => { setValues(next); onChange(next) }
  const update = (group: string, setting: Setting, raw: string) => {
    if (raw.trim() === '' || !Number.isFinite(Number(raw))) return
    const value = Math.min(setting.max, Math.max(setting.min, Number(raw)))
    const next = { ...values, [group]: { ...values[group], [setting.key]: value } }
    if (group === 'physical') {
      if (setting.key === 'thicknessMin') next.physical.thicknessMax = Math.max(value, next.physical.thicknessMax)
      if (setting.key === 'thicknessMax') next.physical.thicknessMin = Math.min(value, next.physical.thicknessMin)
    }
    apply(next)
  }
  return <aside className="material-controls" aria-label="自定义全息材质">
    <div className="material-controls-heading"><strong>Customize</strong><button onClick={() => apply(defaultMaterialState())}>全部重置</button></div>
    <p>拖动滑条或输入数值 · 实时生效</p>
    {materialGroups.map(group => <details key={group.key} open={group.key === 'foil'}>
      <summary>{group.label}</summary>
      <button className="material-reset" onClick={() => apply({ ...values, [group.key]: defaults(group.settings) })}>重置本组</button>
      {group.settings.map(setting => <div className="material-control-row" key={setting.key}>
        <label htmlFor={`${group.key}-${setting.key}`}>{setting.label}</label>
        <div><input aria-label={`${group.label} ${setting.label} 滑条`} type="range" min={setting.min} max={setting.max} step={setting.step} value={values[group.key][setting.key]} onChange={e => update(group.key, setting, e.target.value)} />
        <input id={`${group.key}-${setting.key}`} type="number" min={setting.min} max={setting.max} step={setting.step} value={values[group.key][setting.key]} onChange={e => update(group.key, setting, e.target.value)} /></div>
      </div>)}
    </details>)}
  </aside>
}

