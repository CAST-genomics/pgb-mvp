import * as THREE from 'three'
import LineFactory from './lineFactory.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import {getAppleCrayonColorByName, generateUniqueColors} from './utils/color.js';

class DataService {
    #EDGE_Z_OFFSET = -4

    constructor() {
        this.splines = new Map()
        this.sequences = new Map()
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

    #createSplinesAndNodeLines(bbox, nodes) {
        const uniqueColors = generateUniqueColors(Object.keys(nodes).length, { minSaturation: 60 })
        let i = 0
        for (const [nodeName, nodeData] of Object.entries(nodes)) {

            // Build spline from coordinates recentered around origin
            const coordinates = nodeData.odgf_coordinates.map(({ x, y }) => new THREE.Vector3(x - bbox.x.centroid, y - bbox.y.centroid, 0))
            const spline = new THREE.CatmullRomCurve3(coordinates)

            this.splines.set(nodeName, spline)

            const lineMaterialConfig = {
                color: uniqueColors[i],
                linewidth: 16,
                worldUnits: true
            }
            const line = LineFactory.createNodeLine(nodeName, spline, 4, 1 + i, new LineMaterial(lineMaterialConfig))
            this.linesGroup.add(line)

            i++
        }
    }

    #createEdgeLines(edges) {

        const edgeNodeSign = node => {
            const parts = node.split('')
            const sign = parts.pop()
            const remainder = parts.join('')
            return { sign, remainder }
        }

        for (const { starting_node, ending_node } of Object.values(edges)) {
            let spline
            let node

            // Start node
            const { sign: signStart, remainder: remainderStart } = edgeNodeSign(starting_node)
            node = `${remainderStart}+`
            spline = this.splines.get(node)
            if (!spline) {
                console.error(`Could not find start spline at node ${node}`)
                continue
            }

            const xyzStart = spline.getPoint(signStart === '+' ? 1 : 0)

            // End node
            const { sign: signEnd, remainder: remainderEnd } = edgeNodeSign(ending_node)
            node = `${remainderEnd}+`
            spline = this.splines.get(node)
            if (!spline) {
                console.error(`Could not find end spline at node ${node}`)
                continue
            }

            const xyzEnd = spline.getPoint(signEnd === '+' ? 0 : 1)

            const lineMaterialConfig = {
                color: getAppleCrayonColorByName('tin'),
                linewidth: 4,
                worldUnits: true
            };

            // position edge lines behind nodes in z coordinate
            xyzStart.z = this.#EDGE_Z_OFFSET
            xyzEnd.z = this.#EDGE_Z_OFFSET

            const edgeLine = LineFactory.createEdgeLine(xyzStart, xyzEnd, new LineMaterial(lineMaterialConfig))
            this.edgesGroup.add(edgeLine)
        }
    }

    #createSequences(sequences) {
        for (const [ nodeName, sequenceString ] of Object.entries(sequences)) {
            this.sequences.set(nodeName, sequenceString)
        }
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
        this.sequences.clear()
        this.linesGroup.clear()
        this.edgesGroup.clear()

        // Use bounding box to recenter coordinates
        const bbox = this.#calculateBoundingBox(json);

        // Create splines & lines
        this.#createSplinesAndNodeLines(bbox, json.node);
        this.#createEdgeLines(json.edge);
        this.#createSequences(json.sequence);
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
