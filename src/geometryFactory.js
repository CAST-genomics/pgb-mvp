import * as THREE from 'three';
import LineFactory from './lineFactory.js';

class GeometryFactory {

    static EDGE_LINE_Z_OFFSET = -12;
    static NODE_LINE_Z_OFFSET = -8;
    static NODE_LINE_DEEMPHASIS_Z_OFFSET = -16;

    constructor(genomicService) {
        this.genomicService = genomicService;
        this.splines = new Map();
        this.geometryCache = new Map(); // Cache geometries by node name
    }

    createGeometryData(json, pangenomeGraph) {
        this.splines.clear();
        this.geometryCache.clear();

        const bbox = this.#calculateBoundingBox(json);

        this.#createSplines(bbox, json.node);

        this.#createNodeGeometries(json.node);

        this.#createEdgeGeometries(json.edge, pangenomeGraph);

        const result = {
            splines: this.splines,
            nodeGeometries: this.getNodeGeometries(),
            edgeGeometries: this.getEdgeGeometries(),
            bbox
        };

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

            const payload =
                {
                    type: 'node',
                    geometry: LineFactory.createNodeLineGeometry(spline, 4, GeometryFactory.NODE_LINE_Z_OFFSET),
                    spline,
                    nodeName,
                    assembly: this.genomicService.metadata.get(nodeName)?.assembly
                };

            this.geometryCache.set(`node:${nodeName}`, payload);
        }
    }

    /**
     * Create edge line geometries without materials
     */
    #createEdgeGeometries(edges, pangenomeGraph) {

        for (const { starting_node, ending_node } of Object.values(edges)) {

            const startNodeName = pangenomeGraph.getActualSignedNodeName(starting_node);
            const startParam = pangenomeGraph.getSplineParameter(starting_node, 'starting');
            const startSpline = this.splines.get(startNodeName);
            const xyzStart = startSpline.getPoint(startParam);
            xyzStart.z = GeometryFactory.EDGE_LINE_Z_OFFSET;

            const endNodeName = pangenomeGraph.getActualSignedNodeName(ending_node);
            const endParam = pangenomeGraph.getSplineParameter(ending_node, 'ending');
            const endSpline = this.splines.get(endNodeName);
            const xyzEnd = endSpline.getPoint(endParam);
            xyzEnd.z = GeometryFactory.EDGE_LINE_Z_OFFSET;


            const payload =
                {
                    type: 'edge',
                    geometry: LineFactory.createEdgeRectGeometry(xyzStart, xyzEnd),
                    startPoint: xyzStart,
                    endPoint: xyzEnd,
                    startNode: startNodeName,
                    endNode: endNodeName
                };

            // Use the proper node name for key design. This will allow
            // direct retrieval of the associated nodes.
            const edgeKey = `edge:${startNodeName}:${endNodeName}`;
            this.geometryCache.set(edgeKey, payload);
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
