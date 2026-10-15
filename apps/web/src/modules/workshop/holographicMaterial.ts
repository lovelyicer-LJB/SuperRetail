// 🔴 改动 2026-10-09 · 第三步：随视角变化的银色全息薄膜与镭射边框。
import * as T from 'three'
import { laserSettings, foilSettings } from './materialSettings'
const uniformsFor = (settings: typeof laserSettings) => Object.fromEntries(settings.map(s => [s.key, { value: s.value }]))
const declarations = (settings: typeof laserSettings) => settings.map(s => `uniform float ${s.key};`).join('\n')

// 🔴 改动 2026-10-09 · 描边采用独立高饱和光谱与窄高光，避免白色自发光冲淡彩条。
export function createLaserFrameMaterial(width: number, height: number) {
  return new T.ShaderMaterial({
    name: 'prismatic-laser-frame',
    uniforms: { ...uniformsFor(laserSettings), frameSize: { value: new T.Vector2(width, height) } },
    vertexShader: `
      uniform vec2 frameSize;
      varying vec2 framePoint;
      varying vec2 viewTilt;
      void main() {
        framePoint = position.xy / frameSize;
        viewTilt = vec2(normalize(modelViewMatrix[0].xyz).z, normalize(modelViewMatrix[1].xyz).z);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      ${declarations(laserSettings)}
      varying vec2 framePoint;
      varying vec2 viewTilt;
      void main() {
        float phase = framePoint.x * frequencyX + framePoint.y * frequencyY
          + viewTilt.x * tiltX + viewTilt.y * tiltY + hue;
        vec3 spectrum = .5 + .5 * cos(6.2831853 * (phase + vec3(0., .333, .667)));
        spectrum = pow(spectrum, vec3(saturation));
        float streak = pow(.5 + .5 * cos(phase * 6.2831853 + streakOffset), streakSharpness);
        float reflection = reflectionBase + reflectionGain * pow(.5 + .5 * sin(phase * 3.14159), reflectionPower);
        // 🔴 改动 2026-10-09 · 银白镜面高光只在反射角附近出现，并随旋转扫过边框。
        float incidence = abs(viewTilt.x + viewTilt.y * angleY);
        float silverResponse = exp(-pow((incidence - silverAngle) / silverWidth, 2.));
        float bandCoordinate = framePoint.x * bandX + framePoint.y
          + viewTilt.x * bandTiltX - viewTilt.y * bandTiltY;
        float silverBand = exp(-pow((bandCoordinate - bandPosition) / bandWidth, 2.));
        float silver = clamp(silverResponse * (silverBase + silverBandGain * silverBand), 0., 1.);
        vec3 color = (blackLevel + spectrum * colorGain) * reflection + streak * streakGain;
        color = mix(color, vec3(silverR, silverG, silverB), silver);
        color += vec3(silverPeak) * silverResponse * pow(silverBand, silverSharpness);
        gl_FragColor = vec4(color, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  })
}

export function createHolographicMaterial(frame = false) {
  const material = new T.MeshPhysicalMaterial({
    color: '#ffffff', metalness: .78, roughness: frame ? .16 : .27,
    clearcoat: 1, clearcoatRoughness: .12,
    emissive: frame ? '#d8ecff' : '#000000', emissiveIntensity: frame ? .65 : 0,
    iridescence: 1, iridescenceIOR: 1.35, iridescenceThicknessRange: [180, 520],
  })
  const foilUniforms = uniformsFor(foilSettings)
  material.userData.foilUniforms = foilUniforms
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, foilUniforms)
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vFoilPosition; varying vec3 vFoilAxisX; varying vec3 vFoilAxisY;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFoilPosition = position.xy / vec2(325.0, 475.0); vFoilAxisX = normalize(vec3(modelViewMatrix[0])); vFoilAxisY = normalize(vec3(modelViewMatrix[1]));')
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
      ${declarations(foilSettings)}
      varying vec2 vFoilPosition; varying vec3 vFoilAxisX; varying vec3 vFoilAxisY;
      vec3 foilSpectrum(float phase) {
        return 0.5 + 0.5 * cos(6.2831853 * (phase + vec3(0.0, 0.333, 0.667)));
      }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        // Orthographic views need a parallel view ray, transformed into local face axes.
        vec3 ray = isOrthographic ? vec3(0.0, 0.0, 1.0) : normalize(vViewPosition);
        vec3 axisX = normalize(vFoilAxisX);
        vec3 axisY = normalize(vFoilAxisY);
        float viewX = dot(ray, axisX);
        float viewY = dot(ray, axisY);
        float phase = vFoilPosition.x * frequencyX + vFoilPosition.y * frequencyY
          + viewX * tiltX + viewY * tiltY + hue;
        vec3 rainbow = foilSpectrum(phase);
        float sweep = pow(.5 + .5 * cos(6.2831853 * (phase * sweepFrequency + sweepOffset)), sweepSharpness);
        float noiseValue = fract(sin(dot(vFoilPosition, vec2(127.1, 311.7))) * 43758.5453);
        diffuseColor.rgb *= mix(vec3(silverR, silverG, silverB), colorBase + rainbow * colorGain, colorMix);
        diffuseColor.rgb += sweep * sweepGain + (noiseValue - .5) * grain;
      `)
  }
  material.customProgramCacheKey = () => `foil-v1-${frame}`
  material.name = frame ? 'holographic-laser-frame' : 'holographic-silver-foil'
  return material
}

