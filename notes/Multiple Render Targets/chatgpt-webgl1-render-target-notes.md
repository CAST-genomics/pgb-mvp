# Configuring a High-Res `THREE.WebGLRenderTarget` for WebGL1

* **Linear filtering** on both minification & magnification
* **Clamp-to-edge wrapping** (required for NPOT textures in WebGL1)
* **No mipmaps** (again, NPOT requirement)
* **Max anisotropy** for extra crispness
* **Device-pixel-ratio scaling** for true hi-res output

---

## 🖥️ Live Demo

Fork and experiment over on JSFiddle:
[https://jsfiddle.net/3js-antialias/3/](https://jsfiddle.net/3js-antialias/3/)

---

## 1. HTML + Import-Map Boilerplate

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Three.js Hi-Res RenderTarget (WebGL1)</title>

  <!-- import-map to grab Three.js modules from UNPKG -->
  <script type="importmap">
  {
    "imports": {
      "three": "https://unpkg.com/three@0.152.2/build/three.module.js",
      "three/addons/": "https://unpkg.com/three@0.152.2/examples/jsm/"
    }
  }
  </script>
</head>
<body style="margin:0; overflow:hidden">
  <script type="module">
    import * as THREE from 'three';
    // …your scene/camera/renderer setup goes here…
  </script>
</body>
</html>
```

---

## 2. Create the Renderer

```js
// turn on browser-level MSAA (if available) on the default canvas
const renderer = new THREE.WebGLRenderer({ antialias: true });
// clamp DPR so we don't blow out GPU memory
const dpr = Math.min(window.devicePixelRatio, 2);
renderer.setPixelRatio(dpr);
renderer.setSize(window.innerWidth, window.innerHeight);
```

---

## 3. Configure the `WebGLRenderTarget`

```js
// High-res off-screen target, DPI-scaled:
const renderTarget = new THREE.WebGLRenderTarget(
  window.innerWidth * dpr,
  window.innerHeight * dpr,
  {
    // Smooth sampling
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,

    // NPOT in WebGL1 → no mipmaps + clamp-to-edge
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    generateMipmaps: false,

    // Max anisotropy for the sharpest fetches
    anisotropy: renderer.capabilities.getMaxAnisotropy(),

    // Standard color/depth buffers
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    depthBuffer: true,
    stencilBuffer: false
  }
);
```

**Why these settings?**

* **`LinearFilter`** smooths edge sampling in both directions.
* **`ClampToEdgeWrapping` + no mipmaps** satisfy WebGL1’s NPOT texture rules.
* **`anisotropy`** bumps up texture sampling quality along grazing angles.
* Scaling by **`devicePixelRatio`** gives you a true hi-res buffer.

---

## 4. Using Your Render Target

Once created, just treat `renderTarget.texture` like any other `THREE.Texture`:

```js
// Example: render your scene into it...
renderer.setRenderTarget(renderTarget);
renderer.render(scene, camera);
renderer.setRenderTarget(null);

// …and then use it in a post-process pass or draw it on a fullscreen quad:
someFullScreenMaterial.map = renderTarget.texture;
```

---

## 5. Handling Resizes

Don’t forget to update both your renderer and render target on window resize:

```js
window.addEventListener('resize', () => {
  const w = window.innerWidth * dpr;
  const h = window.innerHeight * dpr;

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderTarget.setSize(w, h);

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});
```

---

That’s it! You now have a simple, high-quality off-screen render target suitable for WebGL1, with all the right filters and settings for sharp, alias-free results. Feel free to tweak the DPR clamp or swap in custom wrap/filter combos to suit your project.
