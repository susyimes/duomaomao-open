# 风铃岛素材来源

制作日期：2026-09-07。此包从独立参数、几何和配色生成，没有读取原作模型、纹理、音频或提取的着色器。

## 模型、布局与动画

使用 Three.js 几何构造编写新模型，以 GLTFExporter 导出 GLB。源文件为 `src/lib/duomaomao/assets/{model-kit,environment,characters,catalog,collision}.ts`。

- 岛屿为平面草地、水岸与岩层；地图为重新编排的树屋、风车、房屋、池塘、集市和道路。
- 8 个动物角色有独立外形、配色和命名部件，包含 `idle`、`walk`、`celebrate` 三段动画。
- 动画使用刚性层级部件，没有使用上游模型或动作数据；不是蒙皮变形骨架。
- 材质使用新配色与 Three.js 标准材质，没有使用上游提取的 GLSL。
- 草地贴图独立供应，预览为 `meadow_grass` 材质指定该纹理；GLB 自带基础颜色。
- 1.1 版将木桥延长至跨过池塘，并从同一场景摆放参数导出 `world.json`：54 个障碍轮廓、出生点、水域与桥面。回合规则、输入和镜头由应用代码实现，不包含在素材包内。

## 草地贴图

`textures/meadow.png` 使用 Codex 内置 imagegen 生成，未提供参考图片或原作贴图。原始生成文件标识：`exec-a9525a3b-3ce6-42db-84a8-d94b5e19abed.png`。最终 SHA-256 和实际尺寸见 `manifest.json`。

最终提示词：

> Use case: stylized-concept. Asset type: a single square seamless albedo texture for a Three.js low-poly hide-and-seek game, used on the meadow ground of a miniature woodland village. Create an ORIGINAL hand-painted meadow-grass texture viewed perfectly straight down, flat orthographic, covering the entire square edge to edge. Soft muted sage green base, subtle clusters of small short grass brush strokes, a few extremely tiny pale ivory clover flecks. Gentle irregular gouache pigment and paper grain, charming handcrafted game material, broad quiet areas, low contrast, readable at a distance. Seamless tileable on both axes with no visible borders, large objects, horizon, shadows, perspective, lighting gradients, vignette, text, logo, watermark, buildings, animals, rocks, or paths. This is raw surface color only, not a rendered scene. Square 1024 by 1024 image. Do not emulate or reproduce any existing game's art or assets.

无缝平铺是生成时的目标，预览用单张纹理覆盖草地，不依赖边缘精确拼接。

## 音效、图标与字体

5 段 WAV 为 `scripts/generate-assets.mjs` 使用正弦合成和包络从零生成，没有采样第三方录音。页面爪印标志为新写的 SVG，字体使用系统字体，无额外字体资源。

## 上游边界

原仓库的历史、代码许可证和参考文件仍在开发仓库中保留。新的运行入口使用 `public/`，不再发布旧的 `static/` 或 `reference/`。此压缩包只收录本套新素材及生成源码，不包含上游参考文件，也不包含 Three.js 本身。
