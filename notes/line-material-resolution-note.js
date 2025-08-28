const size = new THREE.Vector2();

function updateLineResolution(materials) {
  // use drawing buffer size so DPR (HiDPI) is handled correctly
  renderer.getDrawingBufferSize(size);
  materials.forEach(m => m.resolution.copy(size));
}

// initial
updateLineResolution([mat]);

// on resize
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  updateLineResolution([mat]);
});

// if you ever change pixel ratio manually, update again:
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
updateLineResolution([mat]);
