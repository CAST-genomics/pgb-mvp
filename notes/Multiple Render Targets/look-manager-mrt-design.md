# LookManager MRT Design

## Overview

The `LookManager` serves as a **central registry** for all Looks across multiple scenes in the MRT (Multiple Render Target) system. Each scene has exactly one Look, identified by scene name, enabling shared geometry with different visual appearances per scene.

## Core MRT Principles

1. **Shared Geometry** - Only geometry is shared across scenes
2. **Scene-Specific Looks** - Each scene has exactly one Look
3. **Independent State** - Each scene maintains its own material/animation state
4. **Central Coordination** - LookManager provides unified access to all scene Looks

## MRT-Optimized LookManager Features

### 1. Scene-to-Look Mapping

Register different Looks for different scenes:

```javascript
// Register different Looks for different scenes
lookManager.setLook('blue-scene', blueLook);
lookManager.setLook('red-scene', redLook);
lookManager.setLook('green-scene', greenLook);
```

### 2. Scene-Specific Operations

Update animation and state for specific scenes:

```javascript
// Update animation for specific scene
lookManager.updateBehavior('blue-scene');

// Enable/disable animation for specific scene
lookManager.setAnimationEnabled('blue-scene', true);

// Check animation state for specific scene
const isEnabled = lookManager.isAnimationEnabled('blue-scene');
```

### 3. Cross-Scene Operations

Perform operations across all scenes simultaneously:

```javascript
// Update all scenes at once
lookManager.updateAllAnimations(deltaTime);

// Get all registered scenes
const sceneNames = lookManager.getSceneNames(); 
// Returns: ['blue-scene', 'red-scene', 'green-scene']
```

### 4. Scene Discovery and Management

Discover and manage scenes in the MRT system:

```javascript
// Check if a scene has a Look registered
const hasLook = lookManager.hasLook('blue-scene');

// Get the Look for a specific scene
const look = lookManager.getLook('blue-scene');

// Remove a Look for a specific scene
lookManager.removeLook('blue-scene');

// Dispose of all Looks and clear the registry
lookManager.dispose();
```

## MRT Usage Pattern

### Setup Multiple Scenes with Different Looks

```javascript
// Create the central LookManager
const lookManager = new LookManager();

// Create different Looks for different visual styles
const blueLook = GenomeVisualizationLook.createGenomeVisualizationLook('blue', { 
    genomicService, 
    colorScheme: 'blue' 
});
const redLook = GenomeVisualizationLook.createGenomeVisualizationLook('red', { 
    genomicService, 
    colorScheme: 'red' 
});

// Register Looks for scenes
lookManager.setLook('blue-scene', blueLook);
lookManager.setLook('red-scene', redLook);
```

### Create Meshes Using Scene-Specific Looks

```javascript
// Create meshes using scene-specific Looks
const blueMesh = lookManager.createMesh('blue-scene', geometry, context);
const redMesh = lookManager.createMesh('red-scene', geometry, context);
```

### Independent Animation Per Scene

```javascript
// Update animation for individual scenes
lookManager.updateBehavior('blue-scene');
lookManager.updateBehavior('red-scene');

// Or update all scenes at once
lookManager.updateAllAnimations(deltaTime);
```

### Scene Discovery and Iteration

```javascript
// Get all scene names for iteration
const sceneNames = lookManager.getSceneNames();

// Iterate through all scenes
sceneNames.forEach(sceneName => {
    const look = lookManager.getLook(sceneName);
    // Perform scene-specific operations
});
```

## Architecture Benefits

### 1. Centralized Look Management
- Single point of access to all scene Looks
- Consistent interface across all scenes
- Easy scene discovery and iteration

### 2. MRT-Specific Design
- **Shared geometry** across scenes ✅
- **One Look per scene** ✅
- **Independent state** per scene ✅
- **Central coordination** for cross-scene operations ✅
- **Scene discovery** and management ✅

### 3. Clean Separation of Concerns
- LookManager handles general Look operations
- Domain-specific functionality (emphasis/deemphasis) stays in appropriate classes
- No tight coupling between scenes

### 4. Scalability
- Easy to add new scenes with different Looks
- Simple to remove scenes
- Efficient cross-scene operations

## Integration with MRT Rendering

```javascript
// In the main rendering loop
function animate() {
    const deltaTime = clock.getDelta();
    
    // Update all scene animations
    lookManager.updateAllAnimations(deltaTime);
    
    // Render each scene to different render targets
    const sceneNames = lookManager.getSceneNames();
    sceneNames.forEach(sceneName => {
        const scene = getScene(sceneName);
        const renderTarget = getRenderTarget(sceneName);
        
        renderer.setRenderTarget(renderTarget);
        renderer.render(scene, camera);
    });
    
    requestAnimationFrame(animate);
}
```

## Comparison with Previous Design

### Before (Single Scene Focus)
```javascript
// Old design - one LookManager per scene
const blueLookManager = new LookManager('blue-scene');
const redLookManager = new LookManager('red-scene');

blueLookManager.setLook(blueLook);
redLookManager.setLook(redLook);
```

### After (MRT Central Registry)
```javascript
// New design - central registry for all scenes
const lookManager = new LookManager();

lookManager.setLook('blue-scene', blueLook);
lookManager.setLook('red-scene', redLook);

// Cross-scene operations
lookManager.updateAllAnimations(deltaTime);
```

## Key Design Decisions

1. **Scene Name as Key** - Uses scene name as the primary identifier for Looks
2. **No Emphasis/Deemphasis** - Domain-specific functionality excluded from general LookManager
3. **Central Registry Pattern** - Single LookManager manages all scenes
4. **Scene-Specific Methods** - Most methods take scene name as first parameter
5. **Cross-Scene Operations** - Special methods for operations across all scenes

This design transforms `LookManager` from unnecessary delegation to essential MRT infrastructure, providing the foundation for true Multiple Render Target architecture. 
