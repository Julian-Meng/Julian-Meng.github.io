import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer;
let material, geometry, points; // 银河系变量
let bgMaterial, bgGeometry, bgStars; // 背景星空变量
let timeScale = 0.5;

// --- 银河系参数 ---
const params = {
    count: 150000,
    size: 0.015,
    radius: 8.0,
    branches: 4,
    spin: 0.8,

    bulgeRadius: 1.6,
    bulgeRatio: 0.15,
    diskRatio: 0.08,
    haloRatio: 0.10,
    armRatio: 0.67,

    colorHot: ['#9bb0ff', '#aabfff', '#cad7ff', '#f8f7ff'],
    colorWarm: ['#ffdec0', '#ffcfa0', '#ffb075', '#ff9560'],
    colorCore: '#fffdfa',
};

function init() {
    const slider = document.getElementById('speedSlider');
    const speedValueDisplay = document.getElementById('speed-value');

    slider.addEventListener('input', (e) => {
        timeScale = parseFloat(e.target.value);
        speedValueDisplay.textContent = timeScale.toFixed(1) + 'x';
    });

    scene = new THREE.Scene();

    // 雾效：稍微减弱雾的浓度，让远处的背景星也能看见
    scene.fog = new THREE.FogExp2('#000000', 0.0015);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 500);
    camera.position.set(0, 8, 12);

    renderer = new THREE.WebGLRenderer({
        antialias: false,
        powerPreference: "high-performance",
        precision: "highp"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor('#000000');
    document.body.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = false;

    controls.maxDistance = 60;
    controls.minDistance = 0.5;

    generateGalaxy();
    generateBackgroundStars();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    animate();
}

// --- 背景星空生成函数 (调整亮度) ---
function generateBackgroundStars() {
    if (bgStars) {
        bgGeometry.dispose();
        bgMaterial.dispose();
        scene.remove(bgStars);
    }

    bgGeometry = new THREE.BufferGeometry();
    const bgCount = 6000; // 稍微增加一点数量

    const positions = new Float32Array(bgCount * 3);
    const colors = new Float32Array(bgCount * 3);
    const sizes = new Float32Array(bgCount * 1);
    const phases = new Float32Array(bgCount * 1);

    for (let i = 0; i < bgCount; i++) {
        const i3 = i * 3;

        // 球壳分布：半径 50 - 150
        const r = 50 + Math.random() * 100;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        positions[i3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i3 + 2] = r * Math.cos(phi);

        // 颜色：大幅提升亮度，降低“极暗”的比例
        const colorType = Math.random();
        let c = new THREE.Color();

        if (colorType > 0.8) {
            // 蓝星 (O/B型) - 提升亮度和饱和度
            // 亮度: 0.5~0.9, 饱和度: 0.4
            c.setHSL(0.6 + Math.random() * 0.1, 0.4, Math.random() * 0.4 + 0.5);
        } else if (colorType > 0.6) {
            // 红/橙星 - 提升可见度
            // 亮度: 0.4~0.8
            c.setHSL(Math.random() * 0.1, 0.5, Math.random() * 0.4 + 0.4);
        } else {
            // 白/灰星 - 主力背景
            // 亮度: 0.3~0.8 (之前只有 0.1~0.5)
            c.setHSL(0.6, 0.0, Math.random() * 0.5 + 0.3);
        }

        colors[i3] = c.r;
        colors[i3 + 1] = c.g;
        colors[i3 + 2] = c.b;

        // 大小随机：稍微调大一点点远处的星星
        sizes[i] = Math.random() * 2.5 + 0.5;
        phases[i] = Math.random() * Math.PI * 2;
    }

    bgGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    bgGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    bgGeometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    bgGeometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

    bgMaterial = new THREE.ShaderMaterial({
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
            uTime: { value: 0 },
            uPixelRatio: { value: renderer.getPixelRatio() }
        },
        vertexShader: `
                    uniform float uTime;
                    uniform float uPixelRatio;
                    attribute float aSize;
                    attribute float aPhase;
                    varying vec3 vColor;

                    void main() {
                        vec4 modelPosition = modelMatrix * vec4(position, 1.0);
                        
                        // 极慢的漂移
                        float driftX = sin(uTime * 0.1 + aPhase) * 0.5;
                        float driftY = cos(uTime * 0.1 + aPhase * 0.5) * 0.5;
                        float driftZ = sin(uTime * 0.05 + aPhase * 2.0) * 0.5;
                        
                        modelPosition.xyz += vec3(driftX, driftY, driftZ);

                        vec4 viewPosition = viewMatrix * modelPosition;
                        gl_Position = projectionMatrix * viewPosition;

                        gl_PointSize = aSize * uPixelRatio;
                        vColor = color;
                    }
                `,
        fragmentShader: `
                    varying vec3 vColor;
                    void main() {
                        vec2 uv = gl_PointCoord - 0.5;
                        float d = length(uv);
                        if (d > 0.5) discard;
                        
                        // 柔和圆点，但核心更实一点
                        float alpha = 1.0 - smoothstep(0.3, 0.5, d);
                        
                        // 增加整体不透明度，让星星更亮 (原0.8 -> 1.0)
                        gl_FragColor = vec4(vColor, alpha * 1.0);
                    }
                `
    });

    bgStars = new THREE.Points(bgGeometry, bgMaterial);
    scene.add(bgStars);
}

// --- 银河系辅助函数 ---
function pickNaturalColor(isArmRegion, densityFactor) {
    let isHotStar = false;
    if (isArmRegion) {
        const prob = 0.4 + densityFactor * 0.5;
        isHotStar = Math.random() < prob;
    } else {
        isHotStar = Math.random() < 0.05;
    }

    const palette = isHotStar ? params.colorHot : params.colorWarm;
    const hex = palette[Math.floor(Math.random() * palette.length)];
    const color = new THREE.Color(hex);

    const hsl = {};
    color.getHSL(hsl);
    hsl.l += (Math.random() - 0.5) * 0.1;
    hsl.s += (Math.random() - 0.5) * 0.05;
    color.setHSL(hsl.h, THREE.MathUtils.clamp(hsl.s, 0, 1), THREE.MathUtils.clamp(hsl.l, 0, 1));
    return color;
}

function randomExp(lambda = 1.0) {
    return -Math.log(1.0 - Math.random()) / lambda;
}

function d3_randomNormal() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function generateGalaxy() {
    if (points) {
        geometry.dispose();
        material.dispose();
        scene.remove(points);
    }

    geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(params.count * 3);
    const colors = new Float32Array(params.count * 3);
    const scales = new Float32Array(params.count * 1);
    const motionTypes = new Float32Array(params.count * 1);

    const colorCoreObj = new THREE.Color(params.colorCore);

    for (let i = 0; i < params.count; i++) {
        const i3 = i * 3;

        const randType = Math.random();
        let x, y, z, r, theta;
        let color;
        let scale = Math.random();
        let motionType = 0.0;

        // 1. 核球
        if (randType < params.bulgeRatio) {
            r = Math.pow(Math.random(), 2.5) * params.bulgeRadius * 1.8;
            theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            x = r * Math.sin(phi) * Math.cos(theta);
            y = r * Math.sin(phi) * Math.sin(theta) * 0.6;
            z = r * Math.cos(phi);

            if (r < 0.5) {
                color = new THREE.Color('#fffef0');
                scale *= 2.5;
            } else {
                color = pickNaturalColor(false, 0);
                color.lerp(new THREE.Color('#fff0e0'), 0.5);
            }
        }
        // 2. 星系晕
        else if (randType < params.bulgeRatio + params.haloRatio) {
            r = params.radius * 0.5 + randomExp(0.5) * params.radius;
            theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            x = r * Math.sin(phi) * Math.cos(theta);
            y = r * Math.sin(phi) * Math.sin(theta) * 0.8;
            z = r * Math.cos(phi);
            color = pickNaturalColor(false, 0);
            color.multiplyScalar(0.4);
            scale *= 0.6;
            motionType = 1.0;
        }
        // 3. 背景盘
        else if (randType < params.bulgeRatio + params.haloRatio + params.diskRatio) {
            r = params.bulgeRadius + Math.abs(d3_randomNormal()) * (params.radius * 0.6);
            theta = Math.random() * Math.PI * 2;
            x = r * Math.cos(theta);
            z = r * Math.sin(theta);
            y = (Math.random() - 0.5) * 0.2 * (1 + r * 0.3);
            color = pickNaturalColor(false, 0);
            color.multiplyScalar(0.5);
            scale *= 0.7;
        }
        // 4. 旋臂
        else {
            const rMin = params.bulgeRadius * 0.5;
            const rMax = params.radius * 1.2;
            r = rMin + Math.pow(Math.random(), 0.8) * (rMax - rMin);
            const branchAngle = (i % params.branches) / params.branches * Math.PI * 2;
            const spiralAngle = -r * params.spin;
            const maxSpread = 0.5 + (r / params.radius) * 0.6;
            const randomOffset = d3_randomNormal() * maxSpread * 0.4;

            theta = branchAngle + spiralAngle + randomOffset;
            x = r * Math.cos(theta);
            z = r * Math.sin(theta);
            y = (Math.random() - 0.5) * 0.2 * (1 + r * 0.2);

            const armDensity = 1.0 - Math.min(Math.abs(randomOffset) / maxSpread, 1.0);
            color = pickNaturalColor(true, armDensity);
            if (color.b > color.r && armDensity > 0.8) scale *= 1.3;
        }

        positions[i3] = x;
        positions[i3 + 1] = y;
        positions[i3 + 2] = z;
        colors[i3] = color.r;
        colors[i3 + 1] = color.g;
        colors[i3 + 2] = color.b;
        scales[i] = scale;
        motionTypes[i] = motionType;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
    geometry.setAttribute('aMotionType', new THREE.BufferAttribute(motionTypes, 1));

    material = new THREE.ShaderMaterial({
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true,
        uniforms: {
            uTime: { value: 0 },
            uSize: { value: 24 * renderer.getPixelRatio() }
        },
        vertexShader: `
                    uniform float uTime;
                    uniform float uSize;
                    attribute float aScale;
                    attribute float aMotionType; 
                    varying vec3 vColor;

                    void main() {
                        vec4 modelPosition = modelMatrix * vec4(position, 1.0);
                        float r = length(modelPosition.xz);
                        float angle = atan(modelPosition.x, modelPosition.z);
                        
                        float baseSpeed = 0.05;
                        float speedMultiplier = 1.0;
                        if (aMotionType > 0.5) {
                            speedMultiplier = 0.05; 
                        }
                        float coreSpeedBoost = 1.0 + 1.0 * (1.0 - smoothstep(0.0, 2.0, r));
                        float rotation = -uTime * baseSpeed * speedMultiplier * coreSpeedBoost;
                        angle += rotation;

                        modelPosition.x = cos(angle) * r;
                        modelPosition.z = sin(angle) * r;

                        vec4 viewPosition = viewMatrix * modelPosition;
                        gl_Position = projectionMatrix * viewPosition;

                        float pointSize = uSize * aScale * (1.0 / -viewPosition.z);
                        gl_PointSize = max(pointSize, 1.5); 
                        vColor = color;
                    }
                `,
        fragmentShader: `
                    varying vec3 vColor;
                    void main() {
                        vec2 uv = gl_PointCoord - 0.5;
                        float d = length(uv);
                        if (d > 0.5) discard;
                        float strength = 1.0 - (d * 2.0);
                        strength = pow(strength, 2.2); 
                        gl_FragColor = vec4(vColor * strength, 1.0);
                    }
                `
    });

    points = new THREE.Points(geometry, material);
    scene.add(points);
}

function animate() {
    requestAnimationFrame(animate);
    const dt = 0.02 * timeScale;

    // 更新银河系
    if (material) material.uniforms.uTime.value += dt;

    // 更新背景星空 (独立极慢时钟)
    if (bgMaterial) bgMaterial.uniforms.uTime.value += dt * 0.2;

    renderer.render(scene, camera);
}

init();