import * as THREE from 'three'
import LineFactory from './lineFactory.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import {getAppleCrayonColorByName, generateUniqueColors} from './utils/color.js';

class DataService {
    constructor() {
        this.splines = new Map() // Store splines by node name
        this.lines = new Map() // Store lines by node name
        this.edges = new Map() // Store edges by edge name
    }

    #calculateBoundingBox(json) {
        // Accumulate all coordinates
        const acc = []
        for (const { odgf_coordinates } of Object.values(json.node)) {
            const xyzList = odgf_coordinates.map(({ x, y }) => { return [x, y] })
            acc.push(...xyzList)
        }

        // Partition x and y coordinates into separate lists
        const [xCoords, yCoords] = acc.reduce((result, [x, y]) => { result[0].push(x); result[1].push(y); return result; }, [[], []]);

        // Calculate bbox
        const minX = Math.min(...xCoords);
        const maxX = Math.max(...xCoords);
        const minY = Math.min(...yCoords);
        const maxY = Math.max(...yCoords);
        return {
            x: { min: minX, max: maxX, centroid: (minX + maxX) / 2 },
            y: { min: minY, max: maxY, centroid: (minY + maxY) / 2 }
        };
    }

    async loadPath(url) {
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

    ingestData(json) {

        if (!json || !json.node) {
            console.error('Invalid data format: missing node section')
            return
        }

        // Clear existing splines
        this.splines.clear()
        this.lines.clear()

        // Use bounding box to recenter coordinates
        const bbox = this.#calculateBoundingBox(json);

        // Create splines & lines
        const uniqueColors = generateUniqueColors(Object.keys(json.node).length, { minSaturation: 60 })
        let i = 0
        for (const [nodeName, nodeData] of Object.entries(json.node)) {

            // Build spline from recentered coordinates
            const coordinates = nodeData.odgf_coordinates.map(({ x, y }) => new THREE.Vector3(x - bbox.x.centroid, y - bbox.y.centroid, 0))
            const spline = new THREE.CatmullRomCurve3(coordinates)

            this.splines.set(nodeName, spline)

            const lineMaterialConfig =
                {
                    color: uniqueColors[i],
                    // color: getRandomVibrantAppleCrayonColor(),
                    // color: getAppleCrayonColorByName('tin'),
                    linewidth: 16,
                    worldUnits: true
                }
            const line = LineFactory.createNodeLine(spline, false, 4, new LineMaterial(lineMaterialConfig))
            this.lines.set(nodeName, line)

            i++
        }

        for (const { starting_node, ending_node } of Object.values(json.edge)) {

            let spline

            spline = this.splines.get( starting_node )
            if (!spline) {
                console.error(`Could not find start spline at node ${ starting_node }`)
            }
            const xyzStart = spline.getPoint(1)

            spline = this.splines.get( ending_node )
            if (!spline) {
                console.error(`Could not find end spline at node ${ ending_node }`)
            }
            const xyzEnd = spline.getPoint(0)

            const lineMaterialConfig =
                {
                    color: getAppleCrayonColorByName('tin'),
                    linewidth: 8,
                    worldUnits: true
                }

            const edgeLine = LineFactory.createEdgeLine(xyzStart, xyzEnd, new LineMaterial(lineMaterialConfig))
            this.edges.set( `${ starting_node }-${ ending_node }`, edgeLine )

        }
    }

    addToScene(scene) {
        for (const line of this.lines.values()) {
            scene.add(line)
        }
        for (const edge of this.edges.values()) {
            scene.add(edge)
        }
    }

    getLine(nodeName) {
        return this.lines.get(nodeName)
    }

    getSpline(nodeName) {
        return this.splines.get(nodeName)
    }
}

export default DataService
