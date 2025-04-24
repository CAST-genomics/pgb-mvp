import * as THREE from 'three'
import LineFactory from './lineFactory.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';

class SplineManager {
    constructor() {
        this.splines = new Map() // Store splines by node name
        this.lines = new Map() // Store lines by node name
    }

    async loadFromFile(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const json = await response.json();
            console.log(`Successfully loaded data from ${url}`);

            return json;
        } catch (error) {
            console.error(`Error loading ${url}:`, error);
            throw error;
        }
    }

    loadFromData(json) {

        if (!json || !json.node) {
            console.error('Invalid data format: missing node section')
            return
        }

        // Clear existing splines
        this.splines.clear()

        // Process each node
        const acc = []
        for (const [ignore, nodeData] of Object.entries(json.node)) {
            const xyzList = nodeData.odgf_coordinates.map(({ x, y }) => { return [x, y] })
            acc.push(...xyzList)
        }

        // Transform array of [x,y] pairs into separate x and y arrays
        const [xCoords, yCoords] = acc.reduce((result, [x, y]) => {
            result[0].push(x);
            result[1].push(y);
            return result;
        }, [[], []]);

        // Calculate min/max and centroid
        const bbox = {
            x: {
                min: Math.min(...xCoords),
                max: Math.max(...xCoords),
                centroid: xCoords.reduce((sum, val) => sum + val, 0) / xCoords.length
            },
            y: {
                min: Math.min(...yCoords),
                max: Math.max(...yCoords),
                centroid: yCoords.reduce((sum, val) => sum + val, 0) / yCoords.length
            }
        };

        console.log(`Bounding Box ${bbox.x.min} ${bbox.x.centroid} ${bbox.x.max} ${bbox.y.min} ${bbox.y.centroid} ${bbox.y.max}`);

    }

    getLine(nodeName) {
        return this.lines.get(nodeName)
    }

    getAllLines() {
        return Array.from(this.lines.values())
    }

    getSpline(nodeName) {
        return this.splines.get(nodeName)
    }

    getAllSplines() {
        return Array.from(this.splines.values())
    }
}

export default SplineManager
