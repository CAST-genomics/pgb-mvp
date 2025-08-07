import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000);
document.body.appendChild(renderer.domElement);

// Create UI for the slider
const sliderContainer = document.createElement('div');
sliderContainer.style.position = 'absolute';
sliderContainer.style.top = '20px';
sliderContainer.style.left = '20px';
sliderContainer.style.zIndex = '1000';
sliderContainer.style.color = 'white';
sliderContainer.style.fontFamily = 'Arial, sans-serif';
sliderContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
sliderContainer.style.padding = '10px';
sliderContainer.style.borderRadius = '5px';

const label = document.createElement('label');
label.textContent = 'Morph Weight: ';
label.style.marginRight = '10px';

const slider = document.createElement('input');
slider.type = 'range';
slider.min = '0';
slider.max = '1';
slider.step = '0.01';
slider.value = '0';
slider.style.width = '200px';

const valueDisplay = document.createElement('span');
valueDisplay.textContent = '0.00';
valueDisplay.style.marginLeft = '10px';

sliderContainer.appendChild(label);
sliderContainer.appendChild(slider);
sliderContainer.appendChild(valueDisplay);
document.body.appendChild(sliderContainer);

// Parameters for the spline
const numKnots = 20;
const worldWidth = 10;
const worldHeight = 6;
let sineAmplitude

// Create sine curve knots (base shape)
const sineKnots = [];
sineAmplitude = 2
for (let i = 0; i < numKnots; i++) {
    const t = i / (numKnots - 1); // 0 to 1
    const x = (t - 0.5) * worldWidth; // -5 to 5
    const y = Math.sin(t * 2 * Math.PI) * sineAmplitude; // One complete sine cycle
    sineKnots.push(new THREE.Vector3(x, y, 0));
}

// Create straight line knots (morph target) - same X positions, Y = 0
sineAmplitude = 0
const straightKnots = [];
for (let i = 0; i < numKnots; i++) {
    const t = i / (numKnots - 1); // 0 to 1
    const x = (t - 0.5) * worldWidth; // -5 to 5
    const y = Math.sin(t * 2 * Math.PI) * sineAmplitude
    straightKnots.push(new THREE.Vector3(x, y, 0));
}

// Create the base spline
const spline = new THREE.CatmullRomCurve3(sineKnots);

// Create LineGeometry from spline
const divisions = 100;
const points = spline.getPoints(divisions);
const xyzList = points.flatMap(p => [p.x, p.y, p.z]);

const geometry = new LineGeometry();
geometry.setPositions(xyzList);

// Create target data from straight spline
const straightSpline = new THREE.CatmullRomCurve3(straightKnots);
const straightPoints = straightSpline.getPoints(divisions);
const straightXyzList = straightPoints.flatMap(p => [p.x, p.y, p.z]);

// Store the original XYZ lists for lerping
console.log('Original xyzList length:', xyzList.length);
console.log('Straight xyzList length:', straightXyzList.length);

// Create LineMaterial
const material = new LineMaterial({
    color: 0x00ff88,
    linewidth: 3
});

// Create Line2
const line = new Line2(geometry, material);
scene.add(line);

// Position camera
camera.position.z = 8;

// Update function - simple lerp between xyzList and straightXyzList
function updateMorph() {
    const weight = parseFloat(slider.value);
    
    // Create lerped XYZ list from the lerp between xyzList and straightXyzList
    const lerpedXyzList = [];
    for (let i = 0; i < xyzList.length; i++) {
        lerpedXyzList[i] = xyzList[i] * (1 - weight) + straightXyzList[i] * weight;
    }
    
    // Call geometry.setPositions(lerpedXyzList) for the interactive lerp
    geometry.setPositions(lerpedXyzList);
    
    // Update line distances for Line2 objects
    if (line.computeLineDistances) {
        line.computeLineDistances();
    }
    
    valueDisplay.textContent = weight.toFixed(2);
}

// Event listeners
slider.addEventListener('input', updateMorph);

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start animation
animate();
