import * as THREE from 'three';
import LineFactory from './lineFactory.js';

class GeometryFactory {
    // Z-offset constants (matching GeometryManager)
    #EDGE_LINE_Z_OFFSET = -12;
    #NODE_LINE_Z_OFFSET = -8;

    constructor(genomicService) {
        this.genomicService = genomicService;
        this.splines = new Map();
        this.geometryCache = new Map(); // Cache geometries by node name
    }

    /**
     * Create all geometry data from JSON without assigning materials
     */
    createGeometryData(json) {
        console.log('GeometryFactory: Starting geometry data creation');
        console.log('GeometryFactory: JSON data:', json);
        
        this.splines.clear();
        this.geometryCache.clear();

        const bbox = this.#calculateBoundingBox(json);
        console.log('GeometryFactory: Bounding box calculated:', bbox);
        
        this.#createSplines(bbox, json.node);
        console.log('GeometryFactory: Splines created, count:', this.splines.size);
        
        this.#createNodeGeometries(json.node);
        console.log('GeometryFactory: Node geometries created');
        
        this.#createEdgeGeometries(json.edge);
        console.log('GeometryFactory: Edge geometries created');

        const result = {
            splines: this.splines,
            nodeGeometries: this.getNodeGeometries(),
            edgeGeometries: this.getEdgeGeometries(),
            bbox: bbox
        };
        
        console.log('GeometryFactory: Final result:', result);
        return result;
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

            // Create LineGeometry without material, but with proper Z-offset
            const lineGeometry = LineFactory.createNodeLineGeometry(spline, 4, this.#NODE_LINE_Z_OFFSET);
            
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

            // Position edge lines behind nodes in z coordinate (like original code)
            xyzStart.z = this.#EDGE_LINE_Z_OFFSET;
            xyzEnd.z = this.#EDGE_LINE_Z_OFFSET;

            // Create edge geometry without material - this creates a rectangular BufferGeometry with UVs for texture mapping
            const edgeGeometry = LineFactory.createEdgeRectGeometry(xyzStart, xyzEnd);
            
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