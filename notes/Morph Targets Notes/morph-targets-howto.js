import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.157.0/build/three.module.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Create a box geometry with morph targets
const geometry = new THREE.BoxGeometry();
geometry.morphAttributes.position = [
  new THREE.Float32BufferAttribute(
    geometry.attributes.position.array.map((v, i) => i % 3 === 1 ? v * 0.1 : v), // squish Y axis
    3
  ),
];

const material = new THREE.MeshNormalMaterial({ morphTargets: true });
const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

camera.position.z = 5;

// Animate morph target
function animate() {
  requestAnimationFrame(animate);
  mesh.morphTargetInfluences[0] = (Math.sin(Date.now() * 0.002) + 1) / 2; // oscillate between 0 and 1
  renderer.render(scene, camera);
}
animate();
