import { VERT, FRAG_SIM, FRAG_BLUR, FRAG_COMP } from './shaders.js'

export class WebglFireRenderer {
  constructor(canvasEl) {
    this.canvasEl = canvasEl
    this.gl = null
    this.rafId = null
    this.resizeObserver = null
    this.resizeDebounce = null

    this.loopRunning = false
    this.idleFrames = 0
    this.wasActive = false
    this.ultraStart = null
    this.MAX_IDLE = 180

    this.simProg = null; this.blurProg = null; this.compProg = null;
    this.vao = null; this.vbo = null;
    this.programsReady = false

    this.simA = null; this.simB = null; this.blurH = null; this.blurV = null;

    this.U = {
      simTime: null, simSlider: null, simElapsed: null, simBack: null,
      blurDir: null, blurExt: null, blurTex: null, blurRes: null,
      compScene: null, compGlow: null,
    }

    this.cachedActive = false
    this.cachedSlider = 0.5 // Default to 50%

    // Bind methods
    this.onContextLost = this.onContextLost.bind(this)
    this.onContextRestored = this.onContextRestored.bind(this)
    this.render = this.render.bind(this)
    this.resize = this.resize.bind(this)

    // Wait a tick for DOM layout
    setTimeout(() => this.init(), 0)
  }

  setSliderValue(val) {
    this.cachedSlider = val / 100
  }

  setActive(isActive) {
    this.cachedActive = isActive
    if (isActive && this.ultraStart == null) {
      this.ultraStart = performance.now()
    } else if (!isActive) {
      this.ultraStart = null
    }
    
    if (isActive) {
      this.ensureLoop()
    }
  }

  onContextLost(e) {
    e.preventDefault()
  }

  onContextRestored() {
    this.programsReady = false
    this.compilePrograms()
    if (this.programsReady) {
      this.resize()
      if (this.cachedActive) this.ensureLoop()
    }
  }

  init() {
    if (!this.canvasEl) return

    const ctx = this.canvasEl.getContext('webgl2', {
      preserveDrawingBuffer: false,
      antialias: false,
    })
    if (!ctx) {
      console.warn('WebGL2 not supported')
      return
    }

    this.gl = ctx
    this.canvasEl.addEventListener('webglcontextlost', this.onContextLost)
    this.canvasEl.addEventListener('webglcontextrestored', this.onContextRestored)

    this.compilePrograms()
    if (!this.programsReady) return

    this.resizeObserver = new ResizeObserver(() => {
      clearTimeout(this.resizeDebounce)
      this.resizeDebounce = setTimeout(this.resize, 80)
    })
    this.resizeObserver.observe(this.canvasEl)

    this.resize()
  }

  resize() {
    if (!this.gl || !this.canvasEl) return
    const rect = this.canvasEl.getBoundingClientRect()
    if (!rect.width || !rect.height) return

    const dpr = window.devicePixelRatio || 1
    this.canvasEl.width = Math.round(rect.width * dpr)
    this.canvasEl.height = Math.round(rect.height * dpr)

    this.destroyFBOs()
    this.createFBOs()
  }

  compileShader(type, src) {
    const gl = this.gl
    const sh = gl.createShader(type)
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(sh))
      gl.deleteShader(sh)
      return null
    }
    return sh
  }

  linkProgram(vsSrc, fsSrc) {
    const gl = this.gl
    const v = this.compileShader(gl.VERTEX_SHADER, vsSrc)
    const f = this.compileShader(gl.FRAGMENT_SHADER, fsSrc)
    if (!v || !f) return null
    const p = gl.createProgram()
    gl.attachShader(p, v)
    gl.attachShader(p, f)
    gl.bindAttribLocation(p, 0, 'a_pos')
    gl.linkProgram(p)
    gl.deleteShader(v)
    gl.deleteShader(f)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(p))
      return null
    }
    return p
  }

  compilePrograms() {
    const gl = this.gl
    if (!gl) return

    this.simProg = this.linkProgram(VERT, FRAG_SIM)
    this.blurProg = this.linkProgram(VERT, FRAG_BLUR)
    this.compProg = this.linkProgram(VERT, FRAG_COMP)
    if (!this.simProg || !this.blurProg || !this.compProg) return

    this.vao = gl.createVertexArray()
    gl.bindVertexArray(this.vao)
    this.vbo = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1,
    ]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

    const U = this.U
    U.simTime = gl.getUniformLocation(this.simProg, 'u_time')
    U.simSlider = gl.getUniformLocation(this.simProg, 'u_slider')
    U.simElapsed = gl.getUniformLocation(this.simProg, 'u_elapsed')
    U.simBack = gl.getUniformLocation(this.simProg, 'u_back')
    U.blurDir = gl.getUniformLocation(this.blurProg, 'u_dir')
    U.blurExt = gl.getUniformLocation(this.blurProg, 'u_ext')
    U.blurTex = gl.getUniformLocation(this.blurProg, 'u_tex')
    U.blurRes = gl.getUniformLocation(this.blurProg, 'u_res')
    U.compScene = gl.getUniformLocation(this.compProg, 'u_scene')
    U.compGlow = gl.getUniformLocation(this.compProg, 'u_glow')

    this.programsReady = true
  }

  makeFBO() {
    const gl = this.gl
    const fbo = gl.createFramebuffer()
    const tex = gl.createTexture()
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,
      this.canvasEl.width, this.canvasEl.height, 0,
      gl.RGBA, gl.UNSIGNED_BYTE, null)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D, tex, 0)
    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)
    return { fbo, tex }
  }

  createFBOs() {
    if (!this.gl || !this.canvasEl) return
    this.simA = this.makeFBO()
    this.simB = this.makeFBO()
    this.blurH = this.makeFBO()
    this.blurV = this.makeFBO()
  }

  destroyFBO(entry) {
    if (!this.gl || !entry) return
    this.gl.deleteFramebuffer(entry.fbo)
    this.gl.deleteTexture(entry.tex)
  }

  destroyFBOs() {
    this.destroyFBO(this.simA); this.simA = null
    this.destroyFBO(this.simB); this.simB = null
    this.destroyFBO(this.blurH); this.blurH = null
    this.destroyFBO(this.blurV); this.blurV = null
  }

  destroyPrograms() {
    const gl = this.gl
    if (!gl) return
    if (this.simProg) { gl.deleteProgram(this.simProg); this.simProg = null }
    if (this.blurProg) { gl.deleteProgram(this.blurProg); this.blurProg = null }
    if (this.compProg) { gl.deleteProgram(this.compProg); this.compProg = null }
    if (this.vao) { gl.deleteVertexArray(this.vao); this.vao = null }
    if (this.vbo) { gl.deleteBuffer(this.vbo); this.vbo = null }
    this.programsReady = false
  }

  ensureLoop() {
    if (!this.simA || !this.simB) {
      this.resize()
      if (!this.simA || !this.simB) return
    }
    if (this.loopRunning) {
      this.idleFrames = 0
      return
    }

    this.loopRunning = true
    this.idleFrames = 0
    this.wasActive = false

    const gl = this.gl
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.simA.fbo)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.simB.fbo)
    gl.clear(gl.COLOR_BUFFER_BIT)

    this.rafId = requestAnimationFrame(this.render)
  }

  render(t) {
    const gl = this.gl
    const active = this.cachedActive

    if (!active && !this.wasActive) {
      if (++this.idleFrames > this.MAX_IDLE) {
        this.loopRunning = false
        this.rafId = null
        return
      }
      this.rafId = requestAnimationFrame(this.render)
      return
    }

    this.idleFrames = 0

    if (active && !this.wasActive) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.simA.fbo)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.simB.fbo)
      gl.clear(gl.COLOR_BUFFER_BIT)
    }
    this.wasActive = active

    const elapsed = active
      ? (performance.now() - (this.ultraStart || 0)) / 1000
      : -1.0
    const sv = this.cachedSlider

    gl.viewport(0, 0, this.canvasEl.width, this.canvasEl.height)

    const U = this.U

    // pass 1: simulation
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.simB.fbo)
    gl.useProgram(this.simProg)
    gl.uniform1f(U.simTime, t * 0.001)
    gl.uniform1f(U.simSlider, sv)
    gl.uniform1f(U.simElapsed, elapsed)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.simA.tex)
    gl.uniform1i(U.simBack, 0)
    gl.drawArrays(gl.TRIANGLES, 0, 6)

    // pass 2: horizontal blur
    gl.useProgram(this.blurProg)
    gl.uniform2f(U.blurRes, this.canvasEl.width, this.canvasEl.height)
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.blurH.fbo)
    gl.uniform2f(U.blurDir, 1.0, 0.0)
    gl.uniform1f(U.blurExt, 1.0)
    gl.bindTexture(gl.TEXTURE_2D, this.simB.tex)
    gl.uniform1i(U.blurTex, 0)
    gl.drawArrays(gl.TRIANGLES, 0, 6)

    // pass 3: vertical blur
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.blurV.fbo)
    gl.uniform2f(U.blurDir, 0.0, 1.0)
    gl.uniform1f(U.blurExt, 0.0)
    gl.bindTexture(gl.TEXTURE_2D, this.blurH.tex)
    gl.drawArrays(gl.TRIANGLES, 0, 6)

    // pass 4: composite
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.useProgram(this.compProg)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.simB.tex)
    gl.uniform1i(U.compScene, 0)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, this.blurV.tex)
    gl.uniform1i(U.compGlow, 1)
    gl.drawArrays(gl.TRIANGLES, 0, 6)

    // ping-pong swap
    const tmp = this.simA; this.simA = this.simB; this.simB = tmp

    this.rafId = requestAnimationFrame(this.render)
  }

  destroy() {
    if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null }
    if (this.resizeObserver) { this.resizeObserver.disconnect(); this.resizeObserver = null }
    if (this.resizeDebounce) { clearTimeout(this.resizeDebounce); this.resizeDebounce = null }
    this.loopRunning = false
    this.destroyFBOs()
    this.destroyPrograms()
    if (this.canvasEl) {
      this.canvasEl.removeEventListener('webglcontextlost', this.onContextLost)
      this.canvasEl.removeEventListener('webglcontextrestored', this.onContextRestored)
    }
    this.gl = null
    this.canvasEl = null
  }
}
