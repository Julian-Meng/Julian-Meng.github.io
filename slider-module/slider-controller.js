import { WebglFireRenderer } from './webgl-fire.js';

export class SliderController {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.threshold = options.threshold || 100;
    this.onValueChange = options.onValueChange || (() => {});
    
    this.sliderValue = options.initialValue || 33; 
    this.isAnimating = false;
    this.timer = null;
    
    this.initDOM();
    
    const canvasEl = this.container.querySelector('canvas');
    this.fireRenderer = new WebglFireRenderer(canvasEl);
    
    this.updateState();
  }
  
  initDOM() {
    this.statusTextEl = this.container.querySelector('.status-text');
    this.trackWrapperEl = this.container.querySelector('.track-wrapper');
    this.inputEl = this.container.querySelector('input[type="range"]');
    this.canvasEl = this.container.querySelector('canvas');
    
    this.inputEl.value = this.sliderValue;
    this.inputEl.addEventListener('input', this.onInput.bind(this));
  }
  
  onInput(e) {
    this.sliderValue = parseInt(e.target.value, 10);
    this.updateState();
    this.onValueChange(this.sliderValue);
  }
  
  updateState() {
    const isActive = this.sliderValue >= this.threshold;
    const isFull = this.sliderValue === 100;
    
    let statusLabel = 'Ultra Fast';
    if (this.sliderValue < 33) statusLabel = 'Slow';
    else if (this.sliderValue < 66) statusLabel = 'Normal';
    else if (this.sliderValue < this.threshold) statusLabel = 'Fast';
    
    const prevLabel = this.statusTextEl.textContent.trim();
    this.statusTextEl.textContent = statusLabel;
    
    if (statusLabel === 'Ultra Fast' && prevLabel !== 'Ultra Fast') {
      this.playFlipUp();
    } else if (statusLabel !== 'Ultra Fast' && prevLabel === 'Ultra Fast') {
      this.clearAnimation();
    }
    
    if (isActive) {
      this.statusTextEl.classList.add('glowing');
      this.trackWrapperEl.classList.add('active');
      this.inputEl.classList.add('glowing');
    } else {
      this.statusTextEl.classList.remove('glowing');
      this.trackWrapperEl.classList.remove('active');
      this.inputEl.classList.remove('glowing');
    }
    
    if (isFull) {
      this.trackWrapperEl.classList.add('full');
    } else {
      this.trackWrapperEl.classList.remove('full');
    }
    
    // Update mask
    const p = Math.min(this.sliderValue + 2, 100);
    const mask = `linear-gradient(to right, black 0%, black ${p}%, transparent ${p}%)`;
    this.canvasEl.style.maskImage = mask;
    this.canvasEl.style.WebkitMaskImage = mask;
    
    // Update WebGL
    this.fireRenderer.setSliderValue(this.sliderValue);
    this.fireRenderer.setActive(isActive);
  }
  
  clearAnimation() {
    if (this.timer != null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.isAnimating = false;
    this.statusTextEl.classList.remove('animate-up');
  }
  
  playFlipUp() {
    this.clearAnimation();
    this.isAnimating = true;
    this.statusTextEl.classList.add('animate-up');
    this.timer = setTimeout(() => {
      this.isAnimating = false;
      this.statusTextEl.classList.remove('animate-up');
      this.timer = null;
    }, 460);
  }
}
