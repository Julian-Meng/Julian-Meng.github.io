# Galaxy — 个人视觉门面页

基于 **Three.js** 和 **WebGL2** 的交互式旋涡星系可视化，作为个人主页使用。

---

## 功能特性

- **旋涡星系** — 15 万颗粒子分层结构：中心核球、薄盘、厚盘、旋臂、恒星晕及深空背景
- **火焰动画滑块** — WebGL2 着色器实现仿真 / 模糊 / 合成三通道火焰效果，动态控制星系旋转速度
- **响应式布局** — 桌面端与移动端自适应

## 技术栈

- [Three.js](https://threejs.org) — 场景、相机、粒子渲染
- WebGL2 — 速度滑块上的自定义火焰着色器
- 原生 JS (ES Modules) — 零构建步骤，无框架依赖

## 灵感来源

- 星系视觉概念：[CodePen by prisoner849](https://codepen.io/prisoner849/pen/RwyzrVj)
- 滑块动画：灵感来自 [Claude Code](https://github.com/anthropics/claude-code)

由 **Deepseek V4 Pro** 辅助构建。

## 项目结构

```
.
├── galaxy/galaxy.js            # 星系生成与着色器
├── slider-module/              # 火焰动画滑块
│   ├── shaders.js
│   ├── slider-controller.js
│   ├── slider.css
│   └── webgl-fire.js
├── index.html                  # 入口文件
├── main.js                     # 场景初始化与动画循环
└── main.css                    # 全局样式
```

---

[English](README.md) | [License (WTFPL)](LICENSE)
