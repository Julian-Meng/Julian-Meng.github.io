import * as THREE from 'three';

export const params = {
    count: 150000,
    size: 0.015,
    radius: 8.0,
    branches: 4,
    spin: 0.8,

    bulgeRadius: 1.6,
    bulgeRatio: 0.18,
    thinDiskRatio: 0.22,
    thickDiskRatio: 0.12,
    haloRatio: 0.06,
    outerRatio: 0.05,

    speedMax: 1.4,
    speedScale: 2.2,
    patternSpeed: 0.11,

    colorHot: ['#9bb0ff', '#aabfff', '#cad7ff', '#f8f7ff'],
    colorWarm: ['#ffdec0', '#ffcfa0', '#ffb075', '#ff9560'],
    colorCore: '#fffdfa',
};

export const REGION = {
    BULGE: 0,
    THIN_DISK: 1,
    THICK_DISK: 2,
    ARM: 3,
    HALO: 4,
    OUTER: 5,
};

function randomExp(lambda = 1.0) {
    return -Math.log(1.0 - Math.random()) / lambda;
}

function d3_randomNormal() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function sampleExponential(scale, maxR) {
    return Math.min(-Math.log(1.0 - Math.random()) * scale, maxR);
}

function sampleLuminosity() {
    const n = d3_randomNormal();
    const lum = Math.exp(-0.4 + 0.85 * n);
    return THREE.MathUtils.clamp(lum, 0.12, 2.8);
}

function pickStarColor(region, armDensity = 0) {
    let color;

    if (region === REGION.BULGE) {
        color = new THREE.Color(params.colorCore);
        const warm = new THREE.Color('#ffd7b0');
        color.lerp(warm, Math.random() * 0.35);
    } else if (region === REGION.ARM) {
        const hotProb = 0.45 + armDensity * 0.35;
        const palette = Math.random() < hotProb ? params.colorHot : params.colorWarm;
        color = new THREE.Color(palette[Math.floor(Math.random() * palette.length)]);
    } else if (region === REGION.HALO || region === REGION.OUTER) {
        const palette = Math.random() < 0.2 ? params.colorHot : params.colorWarm;
        color = new THREE.Color(palette[Math.floor(Math.random() * palette.length)]);
    } else {
        const palette = Math.random() < 0.15 ? params.colorHot : params.colorWarm;
        color = new THREE.Color(palette[Math.floor(Math.random() * palette.length)]);
    }

    const hsl = {};
    color.getHSL(hsl);

    if (region === REGION.HALO || region === REGION.OUTER) {
        hsl.s *= 0.4;
        hsl.l *= 0.7;
    } else if (region === REGION.THICK_DISK) {
        hsl.s *= 0.8;
        hsl.l *= 0.85;
    } else if (region === REGION.BULGE) {
        hsl.s *= 0.9;
        hsl.l += 0.08;
    } else if (region === REGION.ARM) {
        hsl.l += 0.05 * armDensity;
    }

    hsl.l += (Math.random() - 0.5) * 0.08;
    color.setHSL(
        hsl.h,
        THREE.MathUtils.clamp(hsl.s, 0, 1),
        THREE.MathUtils.clamp(hsl.l, 0, 1)
    );
    return color;
}

export function generateGalaxy(scene, renderer, { oldGeometry, oldMaterial, oldPoints }) {
    if (oldPoints) {
        oldGeometry.dispose();
        oldMaterial.dispose();
        scene.remove(oldPoints);
    }

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(params.count * 3);
    const colors = new Float32Array(params.count * 3);
    const scales = new Float32Array(params.count * 1);
    const regions = new Float32Array(params.count * 1);
    const luminosities = new Float32Array(params.count * 1);
    const jitterPhases = new Float32Array(params.count * 1);

    for (let i = 0; i < params.count; i++) {
        const i3 = i * 3;

        const randType = Math.random();
        let x, y, z, r, theta;
        let color;
        let scale = Math.random();
        let region = REGION.THIN_DISK;
        let armDensity = 0.0;

        if (randType < params.bulgeRatio) {
            region = REGION.BULGE;
            r = Math.pow(Math.random(), 3.0) * params.bulgeRadius * 1.8;
            theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            x = r * Math.sin(phi) * Math.cos(theta);
            y = r * Math.sin(phi) * Math.sin(theta) * 0.5;
            z = r * Math.cos(phi);

            color = pickStarColor(region, 0);
        }
        else if (randType < params.bulgeRatio + params.haloRatio) {
            region = REGION.HALO;
            r = params.radius * 0.5 + randomExp(0.5) * params.radius;
            theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            x = r * Math.sin(phi) * Math.cos(theta);
            y = r * Math.sin(phi) * Math.sin(theta) * 0.8;
            z = r * Math.cos(phi);
            color = pickStarColor(region, 0);
        }
        else if (randType < params.bulgeRatio + params.haloRatio + params.outerRatio) {
            region = REGION.OUTER;
            const rBase = params.radius * 0.95;
            const rMax = params.radius * 1.8;
            r = Math.min(rBase + randomExp(1.2) * params.radius * 0.6, rMax);
            theta = Math.random() * Math.PI * 2;
            x = r * Math.cos(theta);
            z = r * Math.sin(theta);
            y = d3_randomNormal() * (0.25 + r * 0.06);
            color = pickStarColor(region, 0);
        }
        else if (randType < params.bulgeRatio + params.haloRatio + params.outerRatio + params.thickDiskRatio) {
            region = REGION.THICK_DISK;
            r = sampleExponential(params.radius * 0.45, params.radius * 1.05);
            theta = Math.random() * Math.PI * 2;
            x = r * Math.cos(theta);
            z = r * Math.sin(theta);
            y = d3_randomNormal() * (0.12 + r * 0.03);
            color = pickStarColor(region, 0);
        }
        else if (randType < params.bulgeRatio + params.haloRatio + params.outerRatio + params.thickDiskRatio + params.thinDiskRatio) {
            region = REGION.THIN_DISK;
            r = sampleExponential(params.radius * 0.38, params.radius * 1.02);
            theta = Math.random() * Math.PI * 2;
            x = r * Math.cos(theta);
            z = r * Math.sin(theta);
            y = d3_randomNormal() * (0.035 + r * 0.012);
            color = pickStarColor(region, 0);
        }
        else {
            region = REGION.ARM;
            const rMin = params.bulgeRadius * 0.5;
            const rMax = params.radius * 1.05;
            r = rMin + Math.pow(Math.random(), 0.8) * (rMax - rMin);
            const branchAngle = (i % params.branches) / params.branches * Math.PI * 2;
            const spiralAngle = -r * params.spin;
            const maxSpread = 0.5 + (r / params.radius) * 0.6;
            const randomOffset = d3_randomNormal() * maxSpread * 0.4;

            theta = branchAngle + spiralAngle + randomOffset;
            x = r * Math.cos(theta);
            z = r * Math.sin(theta);
            y = d3_randomNormal() * (0.03 + r * 0.012);

            armDensity = 1.0 - Math.min(Math.abs(randomOffset) / maxSpread, 1.0);
            const armCoreMask = THREE.MathUtils.smoothstep(r, params.bulgeRadius * 0.8, params.bulgeRadius * 2.0);
            armDensity *= armCoreMask;
            color = pickStarColor(region, armDensity);
        }

        const edgeFadeInner = 1.0 - THREE.MathUtils.smoothstep(r, params.radius * 0.85, params.radius * 1.08);
        const edgeFadeOuter = 1.0 - THREE.MathUtils.smoothstep(r, params.radius * 1.05, params.radius * 1.75);
        const edgeFade = (region === REGION.HALO || region === REGION.OUTER) ? edgeFadeOuter : edgeFadeInner;
        const coreBoost = 1.0 + 0.7 * (1.0 - THREE.MathUtils.smoothstep(r, 0.25, params.bulgeRadius * 1.4));

        const baseLum = sampleLuminosity();
        let lumScale = 1.0;
        if (region === REGION.BULGE) lumScale = 1.25;
        if (region === REGION.THICK_DISK) lumScale = 0.75;
        if (region === REGION.HALO) lumScale = 0.45;
        if (region === REGION.OUTER) lumScale = 0.35;
        if (region === REGION.ARM) lumScale = 0.7 + 0.45 * armDensity;

        if (region === REGION.BULGE || region === REGION.THIN_DISK || region === REGION.THICK_DISK) {
            lumScale *= coreBoost;
        }

        if (region !== REGION.BULGE) {
            lumScale *= THREE.MathUtils.clamp(edgeFade, 0.0, 1.0);
        }

        const lum = baseLum * lumScale;
        scale = Math.sqrt(Math.max(lum, 0.001)) * (0.55 + Math.random() * 0.55);

        if (region !== REGION.BULGE) {
            scale *= 0.6 + 0.4 * THREE.MathUtils.clamp(edgeFade, 0.0, 1.0);
        }

        if (region === REGION.BULGE && r < 0.5) {
            scale *= 1.2;
        }

        positions[i3] = x;
        positions[i3 + 1] = y;
        positions[i3 + 2] = z;
        colors[i3] = color.r;
        colors[i3 + 1] = color.g;
        colors[i3 + 2] = color.b;
        scales[i] = scale;
        regions[i] = region;
        luminosities[i] = lum;
        jitterPhases[i] = Math.random() * Math.PI * 2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
    geometry.setAttribute('aRegion', new THREE.BufferAttribute(regions, 1));
    geometry.setAttribute('aLum', new THREE.BufferAttribute(luminosities, 1));
    geometry.setAttribute('aJitterPhase', new THREE.BufferAttribute(jitterPhases, 1));

    const material = new THREE.ShaderMaterial({
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true,
        uniforms: {
            uTime: { value: 0 },
            uSize: { value: 20 * renderer.getPixelRatio() },
            uVmax: { value: params.speedMax },
            uSpeedScale: { value: params.speedScale },
            uPatternSpeed: { value: params.patternSpeed },
            uJitterAmp: { value: 0.035 }
        },
        vertexShader: `
            uniform float uTime;
            uniform float uSize;
            uniform float uVmax;
            uniform float uSpeedScale;
            uniform float uPatternSpeed;
            uniform float uJitterAmp;
            attribute float aScale;
            attribute float aRegion;
            attribute float aLum;
            attribute float aJitterPhase;
            varying vec3 vColor;

            float getOmega(float r) {
                float v = uVmax * (1.0 - exp(-r / uSpeedScale));
                return v / max(r, 0.35);
            }

            void main() {
                vec4 modelPosition = modelMatrix * vec4(position, 1.0);
                float r = length(modelPosition.xz);
                float angle = atan(modelPosition.x, modelPosition.z);

                float omega = getOmega(r);
                float armFactor = 1.0 - min(abs(aRegion - 3.0), 1.0);
                float haloFactor = 1.0 - min(min(abs(aRegion - 4.0), abs(aRegion - 5.0)), 1.0);

                float speed = mix(omega, uPatternSpeed, armFactor);
                speed *= mix(1.0, 0.18, haloFactor);
                angle += -uTime * speed;

                modelPosition.x = cos(angle) * r;
                modelPosition.z = sin(angle) * r;

                float jitter = sin(uTime * 0.6 + aJitterPhase) * uJitterAmp;
                modelPosition.y += jitter * (1.0 - haloFactor) * (1.0 - armFactor * 0.4);

                vec4 viewPosition = viewMatrix * modelPosition;
                gl_Position = projectionMatrix * viewPosition;

                float bloom = smoothstep(1.2, 2.2, aLum);
                float pointSize = uSize * aScale * (1.0 + bloom * 0.6) * (1.0 / -viewPosition.z);
                gl_PointSize = max(pointSize, 1.2);
                vColor = color * aLum;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            void main() {
                vec2 uv = gl_PointCoord - 0.5;
                float d = length(uv);
                if (d > 0.5) discard;
                float core = 1.0 - smoothstep(0.0, 0.25, d);
                float halo = 1.0 - smoothstep(0.25, 0.5, d);
                float strength = core + halo * 0.35;
                strength = pow(strength, 1.4);
                gl_FragColor = vec4(vColor * strength, strength);
            }
        `
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    return { geometry, material, points };
}

export function generateBackgroundStars(scene, renderer, { oldBgGeometry, oldBgMaterial, oldBgStars }) {
    if (oldBgStars) {
        oldBgGeometry.dispose();
        oldBgMaterial.dispose();
        scene.remove(oldBgStars);
    }

    const bgGeometry = new THREE.BufferGeometry();
    const bgCount = THREE.MathUtils.clamp(Math.round(params.count * 0.035), 2500, 7000);

    const positions = new Float32Array(bgCount * 3);
    const colors = new Float32Array(bgCount * 3);
    const sizes = new Float32Array(bgCount * 1);
    const phases = new Float32Array(bgCount * 1);

    for (let i = 0; i < bgCount; i++) {
        const i3 = i * 3;

        const r = 50 + Math.random() * 100;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        positions[i3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i3 + 2] = r * Math.cos(phi);

        const colorType = Math.random();
        let c = new THREE.Color();

        if (colorType > 0.8) {
            c.setHSL(0.6 + Math.random() * 0.1, 0.4, Math.random() * 0.4 + 0.5);
        } else if (colorType > 0.6) {
            c.setHSL(Math.random() * 0.1, 0.5, Math.random() * 0.4 + 0.4);
        } else {
            c.setHSL(0.6, 0.0, Math.random() * 0.5 + 0.3);
        }

        colors[i3] = c.r;
        colors[i3 + 1] = c.g;
        colors[i3 + 2] = c.b;

        sizes[i] = Math.random() * 2.5 + 0.5;
        phases[i] = Math.random() * Math.PI * 2;
    }

    bgGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    bgGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    bgGeometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    bgGeometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

    const bgMaterial = new THREE.ShaderMaterial({
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
                vec4 viewPosition = viewMatrix * modelPosition;
                gl_Position = projectionMatrix * viewPosition;

                float twinkle = 0.85 + 0.15 * sin(uTime * 0.6 + aPhase);
                gl_PointSize = aSize * uPixelRatio * twinkle;
                vColor = color;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            void main() {
                vec2 uv = gl_PointCoord - 0.5;
                float d = length(uv);
                if (d > 0.5) discard;
                float core = 1.0 - smoothstep(0.0, 0.2, d);
                float halo = 1.0 - smoothstep(0.2, 0.5, d);
                float alpha = core + halo * 0.35;
                alpha = pow(alpha, 1.2);
                gl_FragColor = vec4(vColor, alpha * 0.9);
            }
        `
    });

    const bgStars = new THREE.Points(bgGeometry, bgMaterial);
    scene.add(bgStars);

    return { bgGeometry, bgMaterial, bgStars };
}
