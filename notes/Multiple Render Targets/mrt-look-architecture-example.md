# MRT/Look Architecture Example Implementation

This document provides a complete example implementation of the MRT/Look architecture, serving as a roadmap for the refactoring process.

## Core Classes Implementation

### 1. Look Class

```javascript
// src/looks/Look.js
import * as THREE from 'three';

class Look {
    constructor(name, config) {
        this.name = name;
        this.material = config.material;
        this.behaviors = config.behaviors || {};
        this.zOffset = config.zOffset || 0;
        this.animationState = { offset: 0 };
    }

    // Factory methods for common look types
    static createAnimatedLook(name, material, animationConfig) {
        return new Look(name, {
            material: material,
            behaviors: {
                animation: {
                    type: 'uniform',
                    uniform: 'uvOffset',
                    speed: animationConfig.speed || 0.5,
                    enabled: true
                }
            },
            zOffset: animationConfig.zOffset || 0
        });
    }

    static createEmphasisLook(name, material, emphasisConfig) {
        return new Look(name, {
            material: material,
            behaviors: {
                emphasis: {
                    type: 'zDepth',
                    normalZ: emphasisConfig.normalZ || -8,
                    emphasizedZ: emphasisConfig.emphasizedZ || -4,
                    deemphasizedZ: emphasisConfig.deemphasizedZ || -16
                }
            },
            zOffset: emphasisConfig.zOffset || 0
        });
    }

    static createColorLook(name, material, colorConfig) {
        return new Look(name, {
            material: material,
            behaviors: {
                color: {
                    type: 'uniform',
                    uniform: 'color',
                    baseColor: colorConfig.baseColor,
                    variants: colorConfig.variants || {}
                }
            },
            zOffset: colorConfig.zOffset || 0
        });
    }

    // Behavior execution methods
    updateAnimation(deltaTime) {
        if (!this.behaviors.animation?.enabled) return;
        
        const behavior = this.behaviors.animation;
        if (behavior.type === 'uniform') {
            const speed = behavior.speed * deltaTime;
            this.animationState.offset = (this.animationState.offset - speed) % 1.0;
        }
    }

    getAnimationState() {
        return this.animationState;
    }

    getZOffset(state = 'normal') {
        if (this.behaviors.emphasis) {
            switch (state) {
                case 'emphasized': return this.behaviors.emphasis.emphasizedZ;
                case 'deemphasized': return this.behaviors.emphasis.deemphasizedZ;
                default: return this.behaviors.emphasis.normalZ;
            }
        }
        return this.zOffset;
    }

    setColor(variant = 'base') {
        if (this.behaviors.color && this.material.uniforms) {
            const color = this.behaviors.color.variants[variant] || 
                         this.behaviors.color.baseColor;
            this.material.uniforms[this.behaviors.color.uniform].value.setHex(color);
        }
    }
}

export default Look;
```

### 2. Material State Manager

```javascript
// src/managers/MaterialStateManager.js
import {LineMaterial} from 'three/examples/jsm/lines/LineMaterial.js';
import Look from '../looks/Look.js';

class MaterialStateManager {
    constructor(materialService, genomicService) {
        this.materialService = materialService;
        this.genomicService = genomicService;
        this.looks = new Map();
        this.nodeEmphasisStates = new Map();

        this.registerDefaultLooks();
    }

    // Look registration and management
    registerLook(look) {
        this.looks.set(look.name, look);
    }

    getLook(lookName) {
        return this.looks.get(lookName);
    }

    // Emphasis state management
    setNodeEmphasisState(nodeName, state) {
        this.nodeEmphasisStates.set(nodeName, state);
    }

    getNodeEmphasisState(nodeName) {
        return this.nodeEmphasisStates.get(nodeName) || 'normal';
    }

    // Material retrieval with look application
    getMaterialForNode(nodeName, look) {
        if (!look) {
            return this.createDefaultMaterial(nodeName);
        }

        const emphasisState = this.getNodeEmphasisState(nodeName);
        const zOffset = look.getZOffset(emphasisState);

        return this.applyLookToMaterial(look, zOffset, emphasisState);
    }

    applyLookToMaterial(look, zOffset, emphasisState) {
        // Create a copy of the material to avoid modifying the original
        const material = look.material.clone();

        // Apply Z-offset if the material supports it
        if (material.uniforms && material.uniforms.zOffset) {
            material.uniforms.zOffset.value = zOffset;
        }

        // Apply animation state if the look has animation behavior
        if (look.behaviors.animation && material.uniforms) {
            const animationState = look.getAnimationState();
            const uniformName = look.behaviors.animation.uniform;
            if (material.uniforms[uniformName]) {
                material.uniforms[uniformName].value.x = animationState.offset;
            }
        }

        return material;
    }

    // Animation management
    updateAnimation(deltaTime) {
        this.looks.forEach(look => {
            look.updateBehavior(deltaTime);
        });
    }

    // Default look registration
    registerDefaultLooks() {
        // Register default looks for different scene types
        this.registerLook(Look.createAnimatedLook('edge-animated',
            this.materialService.getEdgeMaterial(), {
                speed: 0.5,
                zOffset: -12
            }
        ));

        this.registerLook(Look.createEmphasisLook('node-emphasis',
            this.materialService.getNodeMaterial(), {
                normalZ: -8,
                emphasizedZ: -4,
                deemphasizedZ: -16
            }
        ));

        this.registerLook(Look.createColorLook('node-color-blue',
            this.materialService.getNodeMaterial(), {
                baseColor: 0x0000ff,
                variants: {
                    'highlight': 0x4444ff,
                    'warning': 0xff0000
                },
                zOffset: -8
            }
        ));

        this.registerLook(Look.createColorLook('node-color-purple',
            this.materialService.getNodeMaterial(), {
                baseColor: 0x800080,
                variants: {
                    'highlight': 0xaa44aa,
                    'warning': 0xff0000
                },
                zOffset: -8
            }
        ));

        this.registerLook(Look.createColorLook('node-color-green',
            this.materialService.getNodeMaterial(), {
                baseColor: 0x00ff00,
                variants: {
                    'highlight': 0x44ff44,
                    'warning': 0xff0000
                },
                zOffset: -8
            }
        ));
    }

    createDefaultMaterial(nodeName) {
        const color = this.genomicService.getAssemblyColor(nodeName);
        return new LineMaterial({
            color: color,
            linewidth: 16,
            worldUnits: true,
            opacity: 1,
            transparent: true
        });
    }
}

export default MaterialStateManager;
```

### 3. Scene Render Manager

```javascript
// src/managers/SceneRenderManager.js
import * as THREE from 'three';

class SceneRenderManager {
    constructor(geometryManager, materialManager) {
        this.geometryManager = geometryManager;
        this.materialManager = materialManager;
        this.scenes = new Map();
    }

    // Scene-specific operations
    createScene(sceneId, look) {
        const scene = new THREE.Group();
        this.scenes.set(sceneId, {
            scene: scene,
            look: look,
            objects: new Map()
        });
        return scene;
    }

    addGeometryToScene(sceneId, nodeName, geometry) {
        const sceneData = this.scenes.get(sceneId);
        if (!sceneData) throw new Error(`Scene ${sceneId} not found`);

        const material = this.materialManager.getMaterialForNode(nodeName, sceneData.look);
        const mesh = new THREE.Mesh(geometry, material);

        sceneData.objects.set(nodeName, mesh);
        sceneData.scene.add(mesh);
    }

    updateSceneAnimation(sceneId, deltaTime) {
        const sceneData = this.scenes.get(sceneId);
        if (!sceneData) return;

        // Update the scene's look animation
        if (sceneData.look && sceneData.look.behaviors.animation) {
            sceneData.look.updateBehavior(deltaTime);

            // Apply updated animation state to all materials in this scene
            sceneData.objects.forEach((mesh, nodeName) => {
                if (mesh.material && mesh.material.uniforms) {
                    const animationState = sceneData.look.getAnimationState();
                    const uniformName = sceneData.look.behaviors.animation.uniform;
                    if (mesh.material.uniforms[uniformName]) {
                        mesh.material.uniforms[uniformName].value.x = animationState.offset;
                    }
                }
            });
        }
    }

    deemphasizeNodesInScene(sceneId, nodeNameSet) {
        const sceneData = this.scenes.get(sceneId);
        if (!sceneData) return;

        nodeNameSet.forEach(nodeName => {
            // Update emphasis state in material manager
            this.materialManager.setNodeEmphasisState(nodeName, 'deemphasized');

            // Update scene object with new material based on scene's look
            const mesh = sceneData.objects.get(nodeName);
            if (mesh) {
                mesh.material = this.materialManager.getMaterialForNode(nodeName, sceneData.look);
            }
        });
    }

    restoreNodesInScene(sceneId, nodeNameSet) {
        const sceneData = this.scenes.get(sceneId);
        if (!sceneData) return;

        nodeNameSet.forEach(nodeName => {
            // Restore emphasis state in material manager
            this.materialManager.setNodeEmphasisState(nodeName, 'normal');

            // Update scene object
            const mesh = sceneData.objects.get(nodeName);
            if (mesh) {
                mesh.material = this.materialManager.getMaterialForNode(nodeName, sceneData.look);
            }
        });
    }

    getScene(sceneId) {
        const sceneData = this.scenes.get(sceneId);
        return sceneData ? sceneData.scene : null;
    }

    dispose() {
        this.scenes.forEach(sceneData => {
            sceneData.objects.forEach(mesh => {
                if (mesh.geometry) mesh.geometry.dispose();
                if (mesh.material) mesh.material.dispose();
            });
            sceneData.scene.clear();
        });
        this.scenes.clear();
    }
}

export default SceneRenderManager;
```

### 4. Genome Visualization Coordinator

```javascript
// src/coordinators/GenomeVisualizationCoordinator.js
import eventBus from '../utils/eventBus.js';

class GenomeVisualizationCoordinator {
    constructor(geometryManager, materialManager, sceneManager) {
        this.geometryManager = geometryManager;
        this.materialManager = materialManager;
        this.sceneManager = sceneManager;
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Subscribe to genome interaction events
        this.deemphasizeUnsub = eventBus.subscribe('genome:deemphasizeNodes', (data) => {
            this.deemphasizeNodes(data.nodeNames);
        });

        this.restoreUnsub = eventBus.subscribe('genome:restoreEmphasis', (data) => {
            this.restoreNodes(data.nodeNames);
        });
    }

    // High-level operations that coordinate across managers
    createVisualization(json) {
        this.geometryManager.createGeometry(json);
        
        // Create multiple scenes with different looks
        const sceneConfigs = [
            { id: 'blue', look: this.materialManager.getLook('node-color-blue') },
            { id: 'purple', look: this.materialManager.getLook('node-color-purple') },
            { id: 'green', look: this.materialManager.getLook('node-color-green') }
        ];
        
        sceneConfigs.forEach(config => {
            this.sceneManager.createScene(config.id, config.look);
            this.populateScene(config.id, json);
        });
    }

    populateScene(sceneId, json) {
        // Add geometry to scene (look is already assigned to scene)
        Object.keys(json.node).forEach(nodeName => {
            const geometry = this.geometryManager.getGeometryForNode(nodeName);
            this.sceneManager.addGeometryToScene(sceneId, nodeName, geometry);
        });
    }

    animateAllScenes(deltaTime) {
        // Update each scene's animation independently
        ['blue', 'purple', 'green'].forEach(sceneId => {
            this.sceneManager.updateSceneAnimation(sceneId, deltaTime);
        });
    }

    deemphasizeNodes(nodeNameSet) {
        ['blue', 'purple', 'green'].forEach(sceneId => {
            this.sceneManager.deemphasizeNodesInScene(sceneId, nodeNameSet);
        });
    }

    restoreNodes(nodeNameSet) {
        ['blue', 'purple', 'green'].forEach(sceneId => {
            this.sceneManager.restoreNodesInScene(sceneId, nodeNameSet);
        });
    }

    getScene(sceneId) {
        return this.sceneManager.getScene(sceneId);
    }

    dispose() {
        // Unsubscribe from events
        if (this.deemphasizeUnsub) {
            this.deemphasizeUnsub();
        }
        if (this.restoreUnsub) {
            this.restoreUnsub();
        }

        // Dispose of managers
        this.geometryManager.dispose();
        this.sceneManager.dispose();
    }
}

export default GenomeVisualizationCoordinator;
```

## Main Application Setup

```javascript
// src/main.js
import * as THREE from 'three';
import { MapControls } from 'three/examples/jsm/controls/MapControls.js';
import GeometryManager from './managers/GeometryManager.js';
import MaterialStateManager from './managers/MaterialStateManager.js';
import SceneRenderManager from './managers/SceneRenderManager.js';
import GenomeVisualizationCoordinator from './coordinators/GenomeVisualizationCoordinator.js';
import materialService from './materialService.js';
import genomicService from './genomicService.js';

class GenomeVisualizationApp {
    constructor() {
        this.setupRenderer();
        this.setupCamera();
        this.setupControls();
        this.setupManagers();
        this.setupRenderTargets();
        this.setupDisplayScene();
        
        this.clock = new THREE.Clock();
        this.animate();
    }

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);
    }

    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 0, 5);
    }

    setupControls() {
        this.controls = new MapControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
    }

    setupManagers() {
        // Create managers
        this.geometryManager = new GeometryManager(genomicService);
        this.materialManager = new MaterialStateManager(materialService, genomicService);
        this.sceneManager = new SceneRenderManager(this.geometryManager, this.materialManager);
        
        // Create coordinator
        this.coordinator = new GenomeVisualizationCoordinator(
            this.geometryManager,
            this.materialManager,
            this.sceneManager
        );
    }

    setupRenderTargets() {
        // Create render target for MRT
        this.renderTarget = new THREE.WebGLRenderTarget(
            window.innerWidth,
            window.innerHeight,
            {
                count: 3, // Three render targets for blue, purple, green
                minFilter: THREE.NearestFilter,
                magFilter: THREE.NearestFilter
            }
        );

        // Name the targets for debugging
        this.renderTarget.textures[0].name = 'blueLook';
        this.renderTarget.textures[1].name = 'purpleLook';
        this.renderTarget.textures[2].name = 'greenLook';
    }

    setupDisplayScene() {
        // Create display scene for showing the selected look
        this.displayScene = new THREE.Scene();
        
        // Create a plane geometry that fills the screen
        const quadGeometry = new THREE.PlaneGeometry(2, 2);
        
        // Create a basic material that will display the render target texture
        this.displayMaterial = new THREE.MeshBasicMaterial({
            map: this.renderTarget.textures[0] // Initially show the first render target
        });
        
        // Create the quad mesh
        this.quad = new THREE.Mesh(quadGeometry, this.displayMaterial);
        this.displayScene.add(this.quad);
        
        // Set up an orthographic camera for the quad
        this.quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        this.quadCamera.position.z = 0.5;
    }

    loadData(jsonData) {
        // Create visualization with the new architecture
        this.coordinator.createVisualization(jsonData);
    }

    switchLook(index) {
        this.displayMaterial.map = this.renderTarget.textures[index];
        this.displayMaterial.needsUpdate = true;
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        
        const deltaTime = this.clock.getDelta();
        
        // Update controls
        this.controls.update();
        
        // Update animation
        this.coordinator.animateAllScenes(deltaTime);
        
        // Render to render targets
        this.renderer.setRenderTarget(this.renderTarget);
        
        // Render each scene to different render targets
        this.renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
        this.renderer.render(this.coordinator.getScene('blue'), this.camera);
        
        this.renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
        this.renderer.render(this.coordinator.getScene('purple'), this.camera);
        
        this.renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
        this.renderer.render(this.coordinator.getScene('green'), this.camera);
        
        // Render display quad to screen
        this.renderer.setRenderTarget(null);
        this.renderer.render(this.displayScene, this.quadCamera);
    }

    onWindowResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        // Update main camera
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        // Update renderer and render target
        this.renderer.setSize(width, height);
        this.renderTarget.setSize(width, height);
        
        // Update quad camera to maintain aspect ratio
        const aspect = width / height;
        this.quadCamera.left = -aspect;
        this.quadCamera.right = aspect;
        this.quadCamera.updateProjectionMatrix();
    }

    dispose() {
        this.coordinator.dispose();
        this.renderer.dispose();
        this.renderTarget.dispose();
    }
}

// Usage
const app = new GenomeVisualizationApp();

// Load data
fetch('/path/to/your/data.json')
    .then(response => response.json())
    .then(data => {
        app.loadData(data);
    });

// Handle window resize
window.addEventListener('resize', () => app.onWindowResize());

// Handle look switching
document.getElementById('blue-btn').addEventListener('click', () => app.switchLook(0));
document.getElementById('purple-btn').addEventListener('click', () => app.switchLook(1));
document.getElementById('green-btn').addEventListener('click', () => app.switchLook(2));
```

## Migration Path

### Phase 1: Create New Classes
1. Create `Look.js` with factory methods
2. Create `MaterialStateManager.js`
3. Create `SceneRenderManager.js`
4. Create `GenomeVisualizationCoordinator.js`

### Phase 2: Update Main Application
1. Replace direct `GeometryManager` usage with coordinator
2. Set up render targets for MRT
3. Create display scene for look switching

### Phase 3: Test and Refine
1. Test with single scene first
2. Add multiple scenes with different looks
3. Test user interactions (emphasis/deemphasis)
4. Test animation independence

### Phase 4: Clean Up
1. Remove old `GeometryManager` methods
2. Update any remaining direct dependencies
3. Optimize performance if needed

This architecture provides a complete roadmap for implementing the MRT/Look system while maintaining clean separation of concerns and enabling independent scene management. 
