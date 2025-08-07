import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.z = 8;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000);

document.body.appendChild(renderer.domElement);

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

const material = new LineMaterial({ color: 0x00ff88, linewidth: 3 });

const divisions = 100;
const geometry = new LineGeometry();

// Parameters for the spline
const numKnots = 20;
const worldWidth = 10;
const worldHeight = 6;

// Function to create knots with given amplitude
function createKnots(numKnots, sineAmplitude) {
    const knots = [];
    for (let i = 0; i < numKnots; i++) {
        const t = i / (numKnots - 1); // 0 to 1
        const x = (t - 0.5) * worldWidth; // -5 to 5
        const y = Math.sin(t * 2 * Math.PI) * sineAmplitude; // One complete sine cycle
        knots.push(new THREE.Vector3(x, y, 0));
    }
    return knots;
}

// Create sine curve knots (base shape)
const spline = new THREE.CatmullRomCurve3(createKnots(numKnots, 2));
const points = spline.getPoints(divisions);
const xyz = points.flatMap(p => [p.x, p.y, p.z]);
geometry.setPositions(xyz);

const line = new Line2(geometry, material);
scene.add(line);

// Add knot visualization helpers
function addKnotVisualization(knots, color = 0xff0000) {
    // Add axes helper for reference
    const axesHelper = new THREE.AxesHelper(1);
    // scene.add(axesHelper);
    
    // Add spheres at each knot position
    const sphereGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const sphereMaterial = new THREE.MeshBasicMaterial({ color: color });
    
    knots.forEach((knot, index) => {
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        sphere.position.copy(knot);
        sphere.userData = { knotIndex: index };
        // scene.add(sphere);
    });
}

// Add derived points visualization
function addDerivedPointsVisualization(points, color = 0xffff00) {
    // Add smaller spheres at each derived point position
    const smallSphereGeometry = new THREE.SphereGeometry(0.05, 6, 6);
    const smallSphereMaterial = new THREE.MeshBasicMaterial({ color: color });
    
    points.forEach((point, index) => {
        const sphere = new THREE.Mesh(smallSphereGeometry, smallSphereMaterial);
        sphere.position.copy(point);
        sphere.userData = { derivedPointIndex: index };
        scene.add(sphere);
    });
}

// Visualize the sine curve knots and derived points
const sineKnots = createKnots(numKnots, 2);
addKnotVisualization(sineKnots, 0xff0000); // Red spheres for sine knots
addDerivedPointsVisualization(points, 0xffff00); // Yellow spheres for derived points

// Create target knots (straight line)
const straightKnots = createKnots(numKnots, 0);
const splineTarget = new THREE.CatmullRomCurve3(straightKnots);
const pointsTarget = splineTarget.getPoints(divisions);
const xyzTarget = pointsTarget.flatMap(p => [p.x, p.y, p.z]);

// Visualize the straight line knots and derived points
addKnotVisualization(straightKnots, 0x00ff00); // Green spheres for straight knots
addDerivedPointsVisualization(pointsTarget, 0x00ffff); // Cyan spheres for target derived points

function updateMorph(src, dst) {

    const weight = parseFloat(slider.value);
    valueDisplay.textContent = weight.toFixed(2);

    const lerped = src.map((number, i) => number * (1 - weight) + dst[i] * weight);

    geometry.setPositions(lerped);

    if (line.computeLineDistances) {    
        line.computeLineDistances();
    }

}

// Event listeners
slider.addEventListener('input', () => updateMorph(xyz, xyzTarget));

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
