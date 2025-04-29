import * as THREE from 'three'
import LineFactory from './lineFactory.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import {getAppleCrayonColorByName, generateUniqueColors} from './utils/color.js';

class DataService {
    constructor() {
        this.splines = new Map() // Store splines by node name
        this.linesGroup = new THREE.Group();
        this.edgesGroup = new THREE.Group();
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
        this.linesGroup.clear()
        this.edgesGroup.clear()

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
            const line = LineFactory.createNodeLine(nodeName, spline, false, 4, new LineMaterial(lineMaterialConfig))
            this.linesGroup.add(line)

            i++
        }

        for (const { starting_node, ending_node } of Object.values(json.edge)) {

            const edgeNodeSign = node => {
                const parts = node.split('')
                const sign = parts.pop()
                const remainder = parts.join('')
                return { sign, remainder }
            }

            let spline
            let node
            let t

            // Start node
            const { sign: signStart, remainder: remainderStart } = edgeNodeSign( starting_node )
            node = `${ remainderStart }+`
            spline = this.splines.get( node )
            if (!spline) {
                console.error(`Could not find start spline at node ${ node }`)
            }

            t = signStart === '+' ? 1 : 0
            const xyzStart = spline.getPoint(t)

            // End node
            const { sign: signEnd, remainder: remainderEnd } = edgeNodeSign( ending_node )
            node = `${ remainderEnd }+`
            spline = this.splines.get( node )
            if (!spline) {
                console.error(`Could not find end spline at node ${ node }`)
            }

            t = signEnd === '+' ? 0 : 1
            const xyzEnd = spline.getPoint(t)

            const lineMaterialConfig =
                {
                    color: getAppleCrayonColorByName('tin'),
                    linewidth: 8,
                    worldUnits: true
                };

            // position egde lines behind nodes in z-axis
            xyzStart.z = -4
            xyzEnd.z = -4

            const edgeLine = LineFactory.createEdgeLine(xyzStart, xyzEnd, new LineMaterial(lineMaterialConfig))
            this.edgesGroup.add(edgeLine)

        }
    }

    addToScene(scene) {
        scene.add(this.linesGroup);
        scene.add(this.edgesGroup);
    }

    dispose() {
        // Remove from scene
        this.linesGroup.parent?.remove(this.linesGroup);
        this.edgesGroup.parent?.remove(this.edgesGroup);
        
        // Dispose of all geometries and materials
        [this.linesGroup, this.edgesGroup].forEach(group => {
            group.traverse((object) => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
            group.clear();
        });
        
        // Clear the maps
        this.splines.clear();

    }

    getSpline(nodeName) {
        return this.splines.get(nodeName)
    }
}

export default DataService
