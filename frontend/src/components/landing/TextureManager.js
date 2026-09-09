import * as THREE from 'three';

/*
 * TextureManager — Singleton for efficient frame-sequence texture management.
 *
 * Optimized for Mobile & Desktop:
 *  - Mobile: zero mipmap generation overhead (LinearFilter), low GPU RAM, instant texture binding
 *  - Desktop: full trilinear mipmapping & 16x anisotropic filtering for maximum sharpness
 *  - Memory budget: 30 textures on mobile, 70 textures on desktop
 *  - Sliding-window preloading with dynamic radius
 */

const DEFAULT_INITIAL_PRELOAD = 12;

class TextureManager {
  constructor() {
    /** @type {Map<number, THREE.Texture>} */
    this.cache = new Map();
    /** @type {Map<number, number>} LRU timestamps */
    this.lastUsed = new Map();
    /** @type {Set<number>} Currently loading indices */
    this.loading = new Set();
    /** @type {number} */
    this.readyCount = 0;
    /** @type {boolean} */
    this._initialized = false;
    /** @type {THREE.TextureLoader} */
    this.loader = new THREE.TextureLoader();
    /** @type {number} Frame count discovered dynamically (defaults to 240) */
    this.frameCount = 240;
    /** @type {Array<string>} Frame URLs */
    this.framePaths = [];
    /** @type {number} Max textures in memory: 70 desktop, 30 mobile */
    this.maxCached = this._isMobile() ? 30 : 70;
    /** @type {Array<Function>} Callbacks when ready state changes */
    this._readyCallbacks = [];
    /** @type {Array<Function>} Callbacks when frame count is determined */
    this._countCallbacks = [];
  }

  _isMobile() {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768 || (window.screen && window.screen.width < 768);
  }

  /** Path for a given frame index (0-based) */
  _framePath(index) {
    if (this.framePaths[index]) {
      return this.framePaths[index];
    }
    const num = String(index + 1).padStart(3, '0');
    return `/frames/frame_${num}.jpg`;
  }

  /** Discover frame count from manifest */
  async discoverFrames() {
    try {
      const res = await fetch('/frames/manifest.json');
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data.count === 'number' && data.count > 0) {
          this.frameCount = data.count;
          if (Array.isArray(data.frames) && data.frames.length > 0) {
            this.framePaths = data.frames;
          } else {
            this.framePaths = Array.from({ length: data.count }, (_, i) => {
              const num = String(i + 1).padStart(3, '0');
              return `/frames/frame_${num}.jpg`;
            });
          }
          this._notifyCount();
          return;
        }
      }
    } catch {
      // Manifest load failed, keep 240
    }
  }

  /** Initialize texture loading */
  init() {
    if (this._initialized) return;
    this._initialized = true;

    this.discoverFrames().then(() => {
      const preloadCount = Math.min(DEFAULT_INITIAL_PRELOAD, this.frameCount);
      for (let i = 0; i < preloadCount; i++) {
        this._loadFrame(i);
      }
    });

    // Immediate preload of first 6 frames
    for (let i = 0; i < 6; i++) {
      this._loadFrame(i);
    }
  }

  /** Load a single frame asynchronously with platform-optimized settings */
  _loadFrame(index) {
    if (index < 0 || index >= this.frameCount) return;
    if (this.cache.has(index) || this.loading.has(index)) return;

    this.loading.add(index);
    const path = this._framePath(index);
    const isMob = this._isMobile();

    this.loader.load(
      path,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        if (isMob) {
          // Mobile optimization: no CPU/GPU mipmap generation stalls
          texture.generateMipmaps = false;
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.anisotropy = 1;
        } else {
          // Desktop: full trilinear mipmapping & anisotropic filtering
          texture.generateMipmaps = true;
          texture.minFilter = THREE.LinearMipmapLinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.anisotropy = 16;
        }
        this.cache.set(index, texture);
        this.lastUsed.set(index, Date.now());
        this.loading.delete(index);
        this.readyCount = this.cache.size;
        this._notifyReady();
        this._enforceMemoryBudget(index);
      },
      undefined,
      () => {
        this.loading.delete(index);
      }
    );
  }

  /** Preload frames around active index */
  preloadAround(centerIndex, radius = 6) {
    const r = this._isMobile() ? Math.min(radius, 4) : radius;
    for (let i = centerIndex - r; i <= centerIndex + r; i++) {
      if (i >= 0 && i < this.frameCount) {
        this._loadFrame(i);
      }
    }
  }

  /** Get texture for frame index */
  getFrame(index) {
    const clamped = Math.max(0, Math.min(this.frameCount - 1, index));
    this.lastUsed.set(clamped, Date.now());

    if (this.cache.has(clamped)) {
      return this.cache.get(clamped);
    }

    // Trigger asynchronous load
    this._loadFrame(clamped);

    // Return closest available frame as immediate fallback
    for (let offset = 1; offset < 30; offset++) {
      if (this.cache.has(clamped - offset)) return this.cache.get(clamped - offset);
      if (this.cache.has(clamped + offset)) return this.cache.get(clamped + offset);
    }

    return null;
  }

  /** Enforce memory budget */
  _enforceMemoryBudget(protectIndex) {
    if (this.cache.size <= this.maxCached) return;

    const entries = [...this.lastUsed.entries()]
      .filter(([idx]) => this.cache.has(idx))
      .sort((a, b) => a[1] - b[1]);

    const protectRange = this._isMobile() ? 6 : 14;
    let evicted = 0;
    for (const [idx] of entries) {
      if (this.cache.size - evicted <= this.maxCached) break;
      if (Math.abs(idx - protectIndex) <= protectRange) continue;

      const texture = this.cache.get(idx);
      if (texture) {
        texture.dispose();
        this.cache.delete(idx);
        this.lastUsed.delete(idx);
        evicted++;
      }
    }
  }

  onReady(callback) {
    this._readyCallbacks.push(callback);
    return () => {
      this._readyCallbacks = this._readyCallbacks.filter(cb => cb !== callback);
    };
  }

  _notifyReady() {
    const isReady = this.readyCount >= 6;
    for (const cb of this._readyCallbacks) {
      try {
        cb(this.readyCount, isReady);
      } catch (e) {
        console.error('TextureManager callback error:', e);
      }
    }
  }

  onCountChange(callback) {
    this._countCallbacks.push(callback);
    return () => {
      this._countCallbacks = this._countCallbacks.filter(cb => cb !== callback);
    };
  }

  _notifyCount() {
    for (const cb of this._countCallbacks) {
      try {
        cb(this.frameCount);
      } catch (e) {
        console.error('TextureManager count error:', e);
      }
    }
  }

  getProgress() {
    const target = Math.min(DEFAULT_INITIAL_PRELOAD, this.frameCount);
    return Math.min(100, Math.round((this.readyCount / target) * 100));
  }

  getFrameCount() {
    return this.frameCount;
  }

  dispose() {
    for (const [, texture] of this.cache) {
      texture.dispose();
    }
    this.cache.clear();
    this.lastUsed.clear();
    this.loading.clear();
    this.readyCount = 0;
    this._initialized = false;
  }
}

const textureManager = new TextureManager();
export default textureManager;
