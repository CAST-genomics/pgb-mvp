# GeometryFactory: Intermediate Step for Decoupling Geometry from Materials

## Problem

The current `GeometryManager` methods `#createSplinesAndNodeLines()` and `#createEdgeLines()` tightly couple:
- Geometry creation (splines, LineGeometry)
- Material creation and assignment
- Scene management

This makes it difficult to transition to the MRT architecture where geometry should be shared across multiple scenes with different materials.

## Solution: GeometryFactory Intermediate Class

Create a `GeometryFactory` class that separates geometry creation from material assignment, allowing the same geometry to be used with different materials across multiple scenes.

## Implementation

### 1. GeometryFactory Class

```javascript
// src/geometryFactory.js
import * as THREE from 'three';
import LineFactory from './lineFactory.js';

class GeometryFactory {
    constructor(genomicService) {
        this.genomicService = genomicService;
        this.splines = new Map();
        this.geometryCache = new Map(); // Cache geometries by node name
    }

    /**
     * Create all geometry data from JSON without assigning materials
     */
    createGeometryData(json) {
        this.splines.clear();
        this.geometryCache.clear();

        const bbox = this.#calculateBoundingBox(json);
        this.#createSplines(bbox, json.node);
        this.#createNodeGeometries(json.node);
        this.#createEdgeGeometries(json.edge);

        return {
            splines: this.splines,
            nodeGeometries: this.getNodeGeometries(),
            edgeGeometries: this.getEdgeGeometries(),
            bbox: bbox
        };
    }

    /**
     * Create splines from node coordinates
     */
    #createSplines(bbox, nodes) {
        for (const [nodeName, nodeData] of Object.entries(nodes)) {
            const { ogdf_coordinates } = nodeData;
            
            // Build spline from coordinates recentered around origin
            const coordinates = ogdf_coordinates.map(({ x, y }) => 
                new THREE.Vector3(x - bbox.x.centroid, y - bbox.y.centroid, 0)
            );
            const spline = new THREE.CatmullRomCurve3(coordinates);
            
            this.splines.set(nodeName, spline);
        }
    }

    /**
     * Create node line geometries without materials
     */
    #createNodeGeometries(nodes) {
        for (const [nodeName, nodeData] of Object.entries(nodes)) {
            const spline = this.splines.get(nodeName);
            if (!spline) continue;

            // Create LineGeometry without material
            const lineGeometry = LineFactory.createNodeLineGeometry(spline, 4);
            
            this.geometryCache.set(`node:${nodeName}`, {
                type: 'node',
                geometry: lineGeometry,
                spline: spline,
                nodeName: nodeName,
                assembly: this.genomicService.metadata.get(nodeName)?.assembly
            });
        }
    }

    /**
     * Create edge line geometries without materials
     */
    #createEdgeGeometries(edges) {
        const getEdgeNodeSign = node => {
            const parts = node.split('');
            const sign = parts.pop();
            const remainder = parts.join('');
            return { sign, remainder };
        };

        for (const { starting_node, ending_node } of Object.values(edges)) {
            // Start node
            const { sign: signStart, remainder: remainderStart } = getEdgeNodeSign(starting_node);
            const startSpline = this.splines.get(`${remainderStart}+`);
            if (!startSpline) {
                console.error(`Could not find start spline at node ${remainderStart}+`);
                continue;
            }
            const xyzStart = startSpline.getPoint(signStart === '+' ? 1 : 0);

            // End node
            const { sign: signEnd, remainder: remainderEnd } = getEdgeNodeSign(ending_node);
            const endSpline = this.splines.get(`${remainderEnd}+`);
            if (!endSpline) {
                console.error(`Could not find end spline at node ${remainderEnd}+`);
                continue;
            }
            const xyzEnd = endSpline.getPoint(signEnd === '+' ? 0 : 1);

            // Create edge geometry without material
            const edgeGeometry = LineFactory.createEdgeLineGeometry(xyzStart, xyzEnd);
            
            const edgeKey = `edge:${remainderStart}+:${remainderEnd}+`;
            this.geometryCache.set(edgeKey, {
                type: 'edge',
                geometry: edgeGeometry,
                startPoint: xyzStart,
                endPoint: xyzEnd,
                startNode: `${remainderStart}+`,
                endNode: `${remainderEnd}+`,
                startColor: this.genomicService.getAssemblyColor(`${remainderStart}+`),
                endColor: this.genomicService.getAssemblyColor(`${remainderEnd}+`)
            });
        }
    }

    /**
     * Get all node geometries
     */
    getNodeGeometries() {
        const nodeGeometries = new Map();
        for (const [key, data] of this.geometryCache.entries()) {
            if (data.type === 'node') {
                nodeGeometries.set(data.nodeName, data);
            }
        }
        return nodeGeometries;
    }

    /**
     * Get all edge geometries
     */
    getEdgeGeometries() {
        const edgeGeometries = new Map();
        for (const [key, data] of this.geometryCache.entries()) {
            if (data.type === 'edge') {
                edgeGeometries.set(key, data);
            }
        }
        return edgeGeometries;
    }

    /**
     * Get a specific geometry by key
     */
    getGeometry(key) {
        return this.geometryCache.get(key);
    }

    /**
     * Get spline by node name
     */
    getSpline(nodeName) {
        return this.splines.get(nodeName);
    }

    /**
     * Calculate bounding box from JSON data
     */
    #calculateBoundingBox(json) {
        const acc = [];
        for (const { ogdf_coordinates } of Object.values(json.node)) {
            const xyzList = ogdf_coordinates.map(({ x, y }) => [x, y]);
            acc.push(...xyzList);
        }

        const [xCoords, yCoords] = acc.reduce((result, [x, y]) => {
            result[0].push(x);
            result[1].push(y);
            return result;
        }, [[], []]);

        const minX = Math.min(...xCoords);
        const maxX = Math.max(...xCoords);
        const minY = Math.min(...yCoords);
        const maxY = Math.max(...yCoords);
        
        return {
            x: { min: minX, max: maxX, centroid: (minX + maxX) / 2 },
            y: { min: minY, max: maxY, centroid: (minY + maxY) / 2 }
        };
    }

    /**
     * Dispose of all geometries
     */
    dispose() {
        this.geometryCache.forEach(data => {
            if (data.geometry) {
                data.geometry.dispose();
            }
        });
        this.geometryCache.clear();
        this.splines.clear();
    }
}

export default GeometryFactory;
```

### 2. Updated LineFactory (Add Geometry-Only Methods)

```javascript
// src/lineFactory.js (add these methods)
class LineFactory {
    // ... existing methods ...

    /**
     * Create node line geometry without material
     */
    static createNodeLineGeometry(spline, segments) {
        const points = [];
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            points.push(spline.getPoint(t));
        }
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        return geometry;
    }

    /**
     * Create edge line geometry without material
     */
    static createEdgeLineGeometry(startPoint, endPoint) {
        const points = [startPoint, endPoint];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        return geometry;
    }

    // ... existing methods remain unchanged ...
}
```

### 3. Updated GeometryManager (Intermediate Step)

```javascript
// src/geometryManager.js (updated to use GeometryFactory)
import GeometryFactory from './geometryFactory.js';

class GeometryManager {
    constructor(genomicService) {
        this.genomicService = genomicService;
        this.geometryFactory = new GeometryFactory(genomicService);
        this.linesGroup = new THREE.Group();
        this.edgesGroup = new THREE.Group();
        this.isEdgeAnimationEnabled = true;
        this.deemphasizedNodes = new Set();
        this.geometryData = null; // Store geometry data

        this.setupEventListeners();
    }

    createGeometry(json) {
        // Use GeometryFactory to create geometry data
        this.geometryData = this.geometryFactory.createGeometryData(json);
        
        // Clear existing groups
        this.linesGroup.clear();
        this.edgesGroup.clear();

        // Create meshes with materials (temporary coupling)
        this.#createNodeMeshes();
        this.#createEdgeMeshes();
    }

    #createNodeMeshes() {
        const nodeGeometries = this.geometryData.nodeGeometries;
        
        for (const [nodeName, data] of nodeGeometries) {
            const materialConfig = {
                color: this.genomicService.getAssemblyColor(nodeName),
                linewidth: 16,
                worldUnits: true,
                opacity: 1,
                transparent: true
            };

            const material = new LineMaterial(materialConfig);
            const mesh = new THREE.Line(data.geometry, material);
            
            // Store reference to original geometry data
            mesh.userData = {
                nodeName: nodeName,
                geometryKey: `node:${nodeName}`,
                geometryData: data
            };

            this.linesGroup.add(mesh);
        }
    }

    #createEdgeMeshes() {
        const edgeGeometries = this.geometryData.edgeGeometries;
        
        for (const [edgeKey, data] of edgeGeometries) {
            const heroTexture = materialService.getTexture('arrow-white');
            const material = getColorRampArrowMaterial(
                data.startColor, 
                data.endColor, 
                heroTexture, 
                1
            );

            const mesh = new THREE.Mesh(data.geometry, material);
            
            // Store reference to original geometry data
            mesh.userData = {
                nodeNameStart: data.startNode,
                nodeNameEnd: data.endNode,
                geometryKey: edgeKey,
                geometryData: data
            };

            this.edgesGroup.add(mesh);
        }
    }

    // ... rest of existing methods remain the same ...
}
```

## Benefits of This Intermediate Step

### 1. **Separation of Concerns**
- `GeometryFactory` handles pure geometry creation
- `GeometryManager` handles material assignment and scene management
- Clear boundary between geometry and material concerns

### 2. **Reusable Geometry**
- Same geometry can be used with different materials
- Geometry data is cached and accessible
- Easy to create multiple meshes from the same geometry

### 3. **MRT Ready**
- Geometry can be shared across multiple scenes
- Each scene can apply different materials to the same geometry
- Foundation for the Look-based material system

### 4. **Incremental Migration**
- Existing functionality is preserved
- Can be implemented alongside current system
- Easy to test and validate

## Next Steps Toward MRT

Once this intermediate step is in place:

1. **Replace material assignment** in `GeometryManager` with Look-based materials
2. **Create multiple scenes** that share geometry from `GeometryFactory`
3. **Move material logic** to `MaterialStateManager`
4. **Implement scene-specific** material assignment

This intermediate class provides the foundation needed to transition smoothly to the full MRT/Look architecture while maintaining existing functionality. 