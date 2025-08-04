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

    createGeometryData(json) {
        this.splines.clear();
        this.geometryCache.clear();

        const bbox = this.#calculateBoundingBox(json);

        this.#createSplines(bbox, json.node);

        this.#createNodeGeometries(json.node);

        this.#createEdgeGeometries(json.edge);

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
    #createEdgeGeometries(edges) {

        const getEdgeNodeSign = node => {
            const parts = node.split('');
            const sign = parts.pop();
            const nodeName = parts.join('');
            return { sign, nodeName };
        }

        for (const { starting_node, ending_node } of Object.values(edges)) {
            // Start node
            const { sign: signStart, nodeName: nodeNameStart } = getEdgeNodeSign(starting_node);

            // NOTE: We currently assume node names with ALWAYS have a positive (+) sign
            // TODO: In the future generalize this to handle either (-) or (+) signed node
            const startSpline = this.splines.get(`${nodeNameStart}+`);
            if (!startSpline) {
                console.error(`Could not find start spline at node ${nodeNameStart}+`);
                continue;
            }

            // This is a starting_node. If the sign is opposite to the node sign
            // use node.start xyz. If the sign is the same, use node.end xyz
            const xyzStart = startSpline.getPoint(signStart === '+' ? 1 : 0);
            xyzStart.z = GeometryFactory.EDGE_LINE_Z_OFFSET;

            // End node
            const { sign: signEnd, nodeName: nodeNameEnd } = getEdgeNodeSign(ending_node);

            // NOTE: We currently assume node names with ALWAYS have a positive (+) sign
            // TODO: In the future generalize this to handle either (-) or (+) signed node
            const endSpline = this.splines.get(`${nodeNameEnd}+`);
            if (!endSpline) {
                console.error(`Could not find end spline at node ${nodeNameEnd}+`);
                continue;
            }

            // This is an ending_node. If the sign is opposite to the node sign
            // use node.end xyz. If the sign is the same, use node.start xyz
            const xyzEnd = endSpline.getPoint(signEnd === '+' ? 0 : 1);
            xyzEnd.z = GeometryFactory.EDGE_LINE_Z_OFFSET;

            const startNode = `${nodeNameStart}+`
            const endNode = `${nodeNameEnd}+`
            const payload =
                {
                    type: 'edge',
                    geometry: LineFactory.createEdgeRectGeometry(xyzStart, xyzEnd),
                    startPoint: xyzStart,
                    endPoint: xyzEnd,
                    startNode,
                    endNode
                };

            const edgeKey = `edge:${nodeNameStart}+:${nodeNameEnd}+`;
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
