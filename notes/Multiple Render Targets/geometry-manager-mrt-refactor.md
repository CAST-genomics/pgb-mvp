# GeometryManager MRT Refactor: Decoupling Geometry from Material/Scene Concerns

## Overview

This document outlines a refactoring approach for the `GeometryManager` class to support Multiple Render Target (MRT) architecture. The goal is to decouple pure geometry operations from material state management and scene-specific operations, enabling geometry sharing across multiple scenes with different visual appearances.

## Core MRT Principles

1. **Shared Geometry**: Only geometry is shared amongst scenes - this is the core MRT concept
2. **Scene-Specific Looks**: Each scene has exactly one Look - Looks are not shared across scenes
3. **Independent State**: Each scene maintains its own independent material and animation state

## Current Problems

The existing `GeometryManager` has several methods that create tight coupling between geometry, materials, and scene operations:

- `animateEdgeTextures()` - Directly manipulates materials and assumes single scene
- `enableEdgeAnimation()` / `disableEdgeAnimation()` - Global animation state
- `deemphasizeLinesViaNodeNameSet()` - Mixes geometry Z-coordinate changes with material switching
- `restoreLinesViaZOffset()` - Similar coupling issues

These methods make it difficult to:
- Share geometry across multiple scenes
- Apply different material states per scene
- Maintain independent animation states per scene
- Test components in isolation

## Proposed Architecture

### 1. Core Geometry Manager (Pure Geometry)

**Responsibility**: Handle only geometry creation, storage, and transformations.

```javascript
class GeometryManager {
    #splines = new Map();
    #geometryStates = new Map(); // Track geometry state per node
    #NODE_LINE_Z_OFFSET = -8;
    #NODE_LINE_DEEMPHASIS_Z_OFFSET = -16;
    #EDGE_LINE_Z_OFFSET = -12;

    constructor(genomicService) {
        this.genomicService = genomicService;
    }

    // Pure geometry operations
    createGeometry(json) {
        // Create splines and store geometry data
        // No material or scene concerns
    }

    getSpline(nodeName) {
        return this.splines.get(nodeName);
    }

    setGeometryState(nodeName, state) {
        // Store geometry state (Z-offset, etc.) without material concerns
        this.#geometryStates.set(nodeName, state);
        this.#updateGeometryPosition(nodeName, state);
    }

    #updateGeometryPosition(nodeName, state) {
        // Pure geometry transformation - no material logic
        const zOffset = state === 'deemphasized' 
            ? this.#NODE_LINE_DEEMPHASIS_Z_OFFSET 
            : this.#NODE_LINE_Z_OFFSET;
        
        // Update geometry coordinates
    }

    dispose() {
        // Dispose of geometries only
    }
}
```

### 2. Look Definition and Material State Manager

**Responsibility**: Define "looks" as cohesive units of material + behavior, and manage material state tracking.

#### Look Definition

A "look" encapsulates a material plus its associated functionality:

```javascript
class Look {
    constructor(name, config) {
        this.name = name;
        this.material = config.material;
        this.behaviors = config.behaviors || {};
        this.zOffset = config.zOffset || 0;
        this.animationState = { offset: 0 }; // Single animation state per look
    }

    // Behavior definitions
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

    // Get current animation state for material application
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
```

#### Material State Manager

```javascript
class MaterialStateManager {
    #looks = new Map(); // Registered looks by name
    #nodeEmphasisStates = new Map(); // Track emphasis state per node

    constructor(materialService) {
        this.materialService = materialService;
        this.#registerDefaultLooks();
    }

    // Look registration and management
    registerLook(look) {
        this.#looks.set(look.name, look);
    }

    getLook(lookName) {
        return this.#looks.get(lookName);
    }

    // Emphasis state management
    setNodeEmphasisState(nodeName, state) {
        this.#nodeEmphasisStates.set(nodeName, state);
    }

    getNodeEmphasisState(nodeName) {
        return this.#nodeEmphasisStates.get(nodeName) || 'normal';
    }

    // Material retrieval with look application
    getMaterialForNode(nodeName, look) {
        if (!look) {
            // Fallback to default material
            return this.#createDefaultMaterial(nodeName);
        }

        // Apply current emphasis state to the look's material
        const emphasisState = this.getNodeEmphasisState(nodeName);
        const zOffset = look.getZOffset(emphasisState);

        // Return a copy of the material with current state applied
        return this.#applyLookToMaterial(look, zOffset, emphasisState);
    }

    #applyLookToMaterial(look, zOffset, emphasisState) {
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
        // Update all registered looks that have animation behavior
        this.#looks.forEach(look => {
            look.updateBehavior(deltaTime);
        });
    }

    // Default look registration
    #registerDefaultLooks() {
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

        this.registerLook(Look.createColorLook('node-color',
            this.materialService.getNodeMaterial(), {
                baseColor: 0xffffff,
                variants: {
                    'blue': 0x0000ff,
                    'purple': 0x800080,
                    'green': 0x00ff00
                },
                zOffset: -8
            }
        ));
    }

    #createDefaultMaterial(nodeName, sceneType) {
        // Fallback material creation
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
```

### 3. Scene Render Manager (Scene-Specific Operations)

**Responsibility**: Coordinate between geometry and materials for specific scenes.

```javascript
class SceneRenderManager {
    constructor(geometryManager, materialManager) {
        this.geometryManager = geometryManager;
        this.materialManager = materialManager;
        this.scenes = new Map(); // Track scenes and their looks
    }

    // Scene-specific operations
    createScene(sceneId, look) {
        const scene = new THREE.Group();
        this.scenes.set(sceneId, {
            scene: scene,
            look: look,
            objects: new Map() // Track objects by node name
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
}
```

### 4. Coordinator/Facade (Optional)

**Responsibility**: Provide a simplified interface for common operations.

```javascript
class GenomeVisualizationCoordinator {
    constructor(geometryManager, materialManager, sceneManager) {
        this.geometryManager = geometryManager;
        this.materialManager = materialManager;
        this.sceneManager = sceneManager;
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
            this.#populateScene(config.id, json);
        });
    }

    #populateScene(sceneId, json) {
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
}
```

## Migration Strategy

### Phase 1: Extract Pure Geometry
1. Create new `GeometryManager` with only geometry operations
2. Move geometry creation and transformation logic
3. Remove material and scene dependencies

### Phase 2: Create Material Manager
1. Create `MaterialStateManager` class
2. Move material creation and state tracking
3. Implement animation logic

### Phase 3: Create Scene Manager
1. Create `SceneRenderManager` class
2. Implement scene-specific operations
3. Coordinate between geometry and materials

### Phase 4: Update Existing Code
1. Replace direct `GeometryManager` usage with coordinator
2. Update animation loops to use new managers
3. Test with single scene first, then multiple scenes

### Phase 5: Implement MRT
1. Create multiple scenes with shared geometry
2. Implement render target switching
3. Add scene-specific material variations

## Benefits

1. **Geometry Reusability**: Pure geometry can be shared across multiple scenes
2. **Material Flexibility**: Each scene can have different material assignments
3. **State Isolation**: Animation and emphasis states managed separately
4. **Scene Independence**: Each scene maintains independent state
5. **Easier Testing**: Single responsibility per manager
6. **MRT Support**: Natural fit for multiple render targets
7. **Maintainability**: Clear separation of concerns

## Look Creation and Usage Examples

### Creating Custom Looks

```javascript
// Create an animated edge look with custom speed
const animatedEdgeLook = Look.createAnimatedLook('custom-edge', 
    materialService.getEdgeMaterial(), {
        speed: 0.8,
        zOffset: -10
    }
);

// Create an emphasis look with custom Z-depths
const emphasisLook = Look.createEmphasisLook('custom-emphasis',
    materialService.getNodeMaterial(), {
        normalZ: -6,
        emphasizedZ: -2,
        deemphasizedZ: -18
    }
);

// Create a color look with multiple variants
const colorLook = Look.createColorLook('custom-color',
    materialService.getNodeMaterial(), {
        baseColor: 0xff0000,
        variants: {
            'red': 0xff0000,
            'orange': 0xff8000,
            'yellow': 0xffff00
        },
        zOffset: -6
    }
);

// Register looks with the material manager
materialManager.registerLook(animatedEdgeLook);
materialManager.registerLook(emphasisLook);
materialManager.registerLook(colorLook);
```

### Scene-Specific Look Assignment

```javascript
// Assign different looks to different scenes
coordinator.setNodeLook('blue', 'node1', 'custom-color-red');
coordinator.setNodeLook('purple', 'node1', 'custom-color-orange');
coordinator.setNodeLook('green', 'node1', 'custom-color-yellow');

// Switch entire scene to a different look
coordinator.switchSceneLook('blue', 'custom-emphasis');
```

### Complex Look Combinations

```javascript
// Create a look that combines multiple behaviors
const complexLook = new Look('complex-node', {
    material: materialService.getNodeMaterial(),
    behaviors: {
        animation: {
            type: 'uniform',
            uniform: 'uvOffset',
            speed: 0.3,
            enabled: true
        },
        emphasis: {
            type: 'zDepth',
            normalZ: -8,
            emphasizedZ: -2,
            deemphasizedZ: -16
        },
        color: {
            type: 'uniform',
            uniform: 'color',
            baseColor: 0x00ff00,
            variants: {
                'highlight': 0xffff00,
                'warning': 0xff0000
            }
        }
    },
    zOffset: -8
});

// This look can handle animation, emphasis changes, and color variants
materialManager.registerLook(complexLook);
```

## Example Usage

```javascript
// Setup
const geometryManager = new GeometryManager(genomicService);
const materialManager = new MaterialStateManager(materialService);
const sceneManager = new SceneRenderManager(geometryManager, materialManager);
const coordinator = new GenomeVisualizationCoordinator(
    geometryManager, materialManager, sceneManager
);

// Create visualization with different looks per scene
coordinator.createVisualization(jsonData);

// Animation loop
function animate() {
    const deltaTime = clock.getDelta();
    coordinator.animateAllScenes(deltaTime);
    
    // Render each scene to different render targets
    renderer.setRenderTarget(renderTarget);
    renderer.render(sceneManager.getScene('blue'), camera);
    renderer.render(sceneManager.getScene('purple'), camera);
    
    requestAnimationFrame(animate);
}

// User interactions
function onNodeSelection(nodeNames) {
    coordinator.deemphasizeNodes(nodeNames);
}

// Get scene for rendering
function getSceneForRendering(sceneId) {
    return sceneManager.getScene(sceneId);
}
```

This architecture provides a clean separation of concerns while enabling the MRT approach you're targeting. Each manager has a single responsibility, making the code more maintainable and testable. 
