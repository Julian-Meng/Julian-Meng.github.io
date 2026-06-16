import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SliderController } from './slider-module/slider-controller.js';
import { params, generateGalaxy, generateBackgroundStars } from './galaxy/galaxy.js';

let scene, camera, renderer;
let material, geometry, points;
let bgMaterial, bgGeometry, bgStars;
let timeScale = 0.5;
const baseSpeed = 0.5;

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function init() {
    const minSpeed = 0.0;
    const maxSpeed = 1.5;

    const cores = navigator.hardwareConcurrency || 8;
    if (window.innerWidth < 900 || cores <= 4) {
        params.count = 80000;
    } else if (window.innerWidth < 1200 || cores <= 8) {
        params.count = 110000;
    }

    timeScale = clamp(timeScale, minSpeed, maxSpeed);
    const initialPercent = Math.round(((timeScale - minSpeed) / (maxSpeed - minSpeed)) * 100);

    new SliderController('slider-container', {
        initialValue: initialPercent,
        onValueChange: (val) => {
            timeScale = minSpeed + (val / 100) * (maxSpeed - minSpeed);
        }
    });

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2('#000000', 0.0015);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 500);
    camera.position.set(0, 6.5, 11.5);

    renderer = new THREE.WebGLRenderer({
        antialias: false,
        powerPreference: "high-performance",
        precision: "highp"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor('#000000');
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.9;
    document.body.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = false;
    controls.target.set(0, 0, 0);
    controls.update();
    controls.maxDistance = 60;
    controls.minDistance = 0.5;

    const galaxyResult = generateGalaxy(scene, renderer, {});
    geometry = galaxyResult.geometry;
    material = galaxyResult.material;
    points = galaxyResult.points;

    const bgResult = generateBackgroundStars(scene, renderer, {});
    bgGeometry = bgResult.bgGeometry;
    bgMaterial = bgResult.bgMaterial;
    bgStars = bgResult.bgStars;

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    animate();
}

function animate() {
    requestAnimationFrame(animate);
    const dt = 0.02 * baseSpeed * timeScale;

    if (material) material.uniforms.uTime.value += dt;
    if (bgMaterial) bgMaterial.uniforms.uTime.value += dt * 0.2;

    renderer.render(scene, camera);
}

init();
