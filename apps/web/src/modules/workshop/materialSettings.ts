// 🔴 改动 2026-10-09 · 所有材质艺术参数集中配置，供滑条及数值输入实时驱动。
export type Setting = { key: string; label: string; value: number; min: number; max: number; step: number }
export const laserSettings: Setting[] = [
  {
    "key": "frequencyX",
    "label": "横向彩条密度",
    "value": 1.8,
    "min": 0,
    "max": 6,
    "step": 0.01
  },
  {
    "key": "frequencyY",
    "label": "纵向彩条密度",
    "value": 2.4,
    "min": 0,
    "max": 6,
    "step": 0.01
  },
  {
    "key": "tiltX",
    "label": "水平变色速度",
    "value": 1.7,
    "min": 0,
    "max": 5,
    "step": 0.01
  },
  {
    "key": "tiltY",
    "label": "垂直变色速度",
    "value": 1.3,
    "min": 0,
    "max": 5,
    "step": 0.01
  },
  {
    "key": "hue",
    "label": "色相偏移",
    "value": 0,
    "min": -1,
    "max": 1,
    "step": 0.01
  },
  {
    "key": "saturation",
    "label": "色彩浓度",
    "value": 1.5,
    "min": 0.1,
    "max": 4,
    "step": 0.01
  },
  {
    "key": "streakOffset",
    "label": "彩色高光位置",
    "value": 0.7,
    "min": -6.28,
    "max": 6.28,
    "step": 0.01
  },
  {
    "key": "streakSharpness",
    "label": "彩色高光锐度",
    "value": 24,
    "min": 1,
    "max": 80,
    "step": 0.01
  },
  {
    "key": "reflectionBase",
    "label": "暗部亮度",
    "value": 0.45,
    "min": 0,
    "max": 1,
    "step": 0.01
  },
  {
    "key": "reflectionGain",
    "label": "反光对比",
    "value": 0.55,
    "min": 0,
    "max": 2,
    "step": 0.01
  },
  {
    "key": "reflectionPower",
    "label": "反光锐度",
    "value": 2,
    "min": 0.1,
    "max": 8,
    "step": 0.01
  },
  {
    "key": "angleY",
    "label": "垂直反光影响",
    "value": 0.35,
    "min": -2,
    "max": 2,
    "step": 0.01
  },
  {
    "key": "silverAngle",
    "label": "银白触发角度",
    "value": 0.5,
    "min": 0,
    "max": 1.5,
    "step": 0.01
  },
  {
    "key": "silverWidth",
    "label": "银白角度范围",
    "value": 0.19,
    "min": 0.01,
    "max": 1,
    "step": 0.01
  },
  {
    "key": "bandX",
    "label": "银白光带倾斜",
    "value": 0.65,
    "min": -2,
    "max": 2,
    "step": 0.01
  },
  {
    "key": "bandTiltX",
    "label": "光带水平移动",
    "value": 0.65,
    "min": -2,
    "max": 2,
    "step": 0.01
  },
  {
    "key": "bandTiltY",
    "label": "光带垂直移动",
    "value": 0.45,
    "min": -2,
    "max": 2,
    "step": 0.01
  },
  {
    "key": "bandPosition",
    "label": "银白光带位置",
    "value": 0.18,
    "min": -2,
    "max": 2,
    "step": 0.01
  },
  {
    "key": "bandWidth",
    "label": "银白光带宽度",
    "value": 0.4,
    "min": 0.01,
    "max": 2,
    "step": 0.01
  },
  {
    "key": "silverBase",
    "label": "整圈银白强度",
    "value": 0.58,
    "min": 0,
    "max": 1,
    "step": 0.01
  },
  {
    "key": "silverBandGain",
    "label": "光带银白强度",
    "value": 0.42,
    "min": 0,
    "max": 1,
    "step": 0.01
  },
  {
    "key": "blackLevel",
    "label": "彩条底亮度",
    "value": 0.035,
    "min": 0,
    "max": 1,
    "step": 0.01
  },
  {
    "key": "colorGain",
    "label": "彩条亮度",
    "value": 1.6,
    "min": 0,
    "max": 5,
    "step": 0.01
  },
  {
    "key": "streakGain",
    "label": "彩色高光强度",
    "value": 0.65,
    "min": 0,
    "max": 4,
    "step": 0.01
  },
  {
    "key": "silverR",
    "label": "银白红通道",
    "value": 3.8,
    "min": 0,
    "max": 8,
    "step": 0.01
  },
  {
    "key": "silverG",
    "label": "银白绿通道",
    "value": 3.95,
    "min": 0,
    "max": 8,
    "step": 0.01
  },
  {
    "key": "silverB",
    "label": "银白蓝通道",
    "value": 4.1,
    "min": 0,
    "max": 8,
    "step": 0.01
  },
  {
    "key": "silverPeak",
    "label": "银白峰值亮度",
    "value": 1.8,
    "min": 0,
    "max": 8,
    "step": 0.01
  },
  {
    "key": "silverSharpness",
    "label": "银白光带锐度",
    "value": 5,
    "min": 0.1,
    "max": 20,
    "step": 0.01
  }
]
export const foilSettings: Setting[] = [
  {
    "key": "frequencyX",
    "label": "横向虹彩密度",
    "value": 0.62,
    "min": 0,
    "max": 5,
    "step": 0.01
  },
  {
    "key": "frequencyY",
    "label": "纵向虹彩密度",
    "value": 0.88,
    "min": 0,
    "max": 5,
    "step": 0.01
  },
  {
    "key": "tiltX",
    "label": "水平变色速度",
    "value": 1.35,
    "min": 0,
    "max": 5,
    "step": 0.01
  },
  {
    "key": "tiltY",
    "label": "垂直变色速度",
    "value": 0.85,
    "min": 0,
    "max": 5,
    "step": 0.01
  },
  {
    "key": "hue",
    "label": "色相偏移",
    "value": 0,
    "min": -1,
    "max": 1,
    "step": 0.01
  },
  {
    "key": "sweepFrequency",
    "label": "高光密度",
    "value": 0.74,
    "min": 0,
    "max": 4,
    "step": 0.01
  },
  {
    "key": "sweepOffset",
    "label": "高光位置",
    "value": 0.18,
    "min": -1,
    "max": 1,
    "step": 0.01
  },
  {
    "key": "sweepSharpness",
    "label": "高光锐度",
    "value": 10,
    "min": 1,
    "max": 60,
    "step": 0.01
  },
  {
    "key": "silverR",
    "label": "银底红通道",
    "value": 0.72,
    "min": 0,
    "max": 1,
    "step": 0.01
  },
  {
    "key": "silverG",
    "label": "银底绿通道",
    "value": 0.76,
    "min": 0,
    "max": 1,
    "step": 0.01
  },
  {
    "key": "silverB",
    "label": "银底蓝通道",
    "value": 0.82,
    "min": 0,
    "max": 1,
    "step": 0.01
  },
  {
    "key": "colorBase",
    "label": "虹彩底亮度",
    "value": 0.24,
    "min": 0,
    "max": 1,
    "step": 0.01
  },
  {
    "key": "colorGain",
    "label": "虹彩亮度",
    "value": 0.76,
    "min": 0,
    "max": 2,
    "step": 0.01
  },
  {
    "key": "colorMix",
    "label": "虹彩混合",
    "value": 0.58,
    "min": 0,
    "max": 1,
    "step": 0.01
  },
  {
    "key": "sweepGain",
    "label": "高光强度",
    "value": 0.2,
    "min": 0,
    "max": 2,
    "step": 0.01
  },
  {
    "key": "grain",
    "label": "颗粒强度",
    "value": 0.012,
    "min": 0,
    "max": 0.2,
    "step": 0.01
  }
]
export const physicalSettings: Setting[] = [
  {
    "key": "red",
    "label": "颜色 R",
    "value": 1,
    "min": 0,
    "max": 1,
    "step": 0.01
  },
  {
    "key": "green",
    "label": "颜色 G",
    "value": 1,
    "min": 0,
    "max": 1,
    "step": 0.01
  },
  {
    "key": "blue",
    "label": "颜色 B",
    "value": 1,
    "min": 0,
    "max": 1,
    "step": 0.01
  },
  {
    "key": "metalness",
    "label": "金属度",
    "value": 0.78,
    "min": 0,
    "max": 1,
    "step": 0.01
  },
  {
    "key": "roughness",
    "label": "粗糙度",
    "value": 0.27,
    "min": 0,
    "max": 1,
    "step": 0.01
  },
  {
    "key": "clearcoat",
    "label": "清漆强度",
    "value": 1,
    "min": 0,
    "max": 1,
    "step": 0.01
  },
  {
    "key": "clearcoatRoughness",
    "label": "清漆粗糙度",
    "value": 0.12,
    "min": 0,
    "max": 1,
    "step": 0.01
  },
  {
    "key": "iridescence",
    "label": "薄膜干涉强度",
    "value": 1,
    "min": 0,
    "max": 1,
    "step": 0.01
  },
  {
    "key": "iridescenceIOR",
    "label": "薄膜折射率",
    "value": 1.35,
    "min": 1,
    "max": 2.5,
    "step": 0.01
  },
  {
    "key": "thicknessMin",
    "label": "薄膜最小厚度",
    "value": 180,
    "min": 0,
    "max": 1500,
    "step": 1
  },
  {
    "key": "thicknessMax",
    "label": "薄膜最大厚度",
    "value": 520,
    "min": 0,
    "max": 1500,
    "step": 1
  }
]
export type MaterialValues = Record<string, number>
export const defaults = (settings: Setting[]): MaterialValues => Object.fromEntries(settings.map(s => [s.key, s.value]))
