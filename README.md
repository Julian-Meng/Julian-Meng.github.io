# Galaxy — Personal Visual Front Page

An interactive spiral galaxy visualization built with **Three.js** and **WebGL2**, serving as a personal landing page.

---

## Features

- **Spiral Galaxy** — 150K particles in a layered structure: central bulge, thin disk, thick disk, spiral arms, stellar halo, and deep-space background
- **Fire-Animated Speed Slider** — WebGL2 flame shader with simulation / blur / composite passes, dynamically controls galaxy rotation speed
- **Responsive** — adapts layout for desktop and mobile viewports

## Tech Stack

- [Three.js](https://threejs.org) — scene, camera, particle rendering
- WebGL2 — custom fire shader on the speed slider
- Vanilla JS (ES modules) — zero build step, no framework

## Inspiration

- Galaxy visual concept: [CodePen by prisoner849](https://codepen.io/prisoner849/pen/RwyzrVj)
- Slider animation: inspired by [Claude Code](https://github.com/anthropics/claude-code)

Built with **Deepseek V4 Pro**.

## Structure

```
.
├── galaxy/galaxy.js            # Galaxy generation & shaders
├── slider-module/              # Fire-animated slider
│   ├── shaders.js
│   ├── slider-controller.js
│   ├── slider.css
│   └── webgl-fire.js
├── index.html                  # Entry point
├── main.js                     # Scene setup & animation loop
└── main.css                    # Global styles
```

---

[中文文档](README_zh-CN.md) | [License (WTFPL)](LICENSE)
