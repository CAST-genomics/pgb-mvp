import * as THREE from 'three'
import LineFactory from './lineFactory.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import {getAppleCrayonColorByName, generateUniqueColors} from './utils/color.js';
import textureService from './utils/textureService.js';

class GeometryManager {
    #EDGE_Z_OFFSET = -4

    constructor(genomicService) {
        this.genomicService = genomicService
        this.splines = new Map()
        this.linesGroup = new THREE.Group();
        this.edgesGroup = new THREE.Group();
    }

    #calculateBoundingBox(json) {
        // Accumulate all coordinates
        const acc = []
        for (const { ogdf_coordinates } of Object.values(json.node)) {
            const xyzList = ogdf_coordinates.map(({ x, y }) => { return [x, y] })
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
            const coordinates = nodeData.ogdf_coordinates.map(({ x, y }) => new THREE.Vector3(x - bbox.x.centroid, y - bbox.y.centroid, 0))
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

            const materialConfig = {
                color: this.genomicService.getAssemblyColor(ending_node),
                // color: getAppleCrayonColorByName('carnation'),
                map: textureService.getTexture('arrow-white'),
                side: THREE.DoubleSide,
                transparent: true,
                alphaTest: 0.1,
                opacity: 0.75,
                depthWrite: false,
            };

            // Enable texture wrapping
            materialConfig.map.wrapS = THREE.RepeatWrapping;
            materialConfig.map.wrapT = THREE.RepeatWrapping;

            // position edge lines behind nodes in z coordinate
            xyzStart.z = this.#EDGE_Z_OFFSET
            xyzEnd.z = this.#EDGE_Z_OFFSET

            const edgeLine = LineFactory.createEdgeRect(xyzStart, xyzEnd, new THREE.MeshBasicMaterial(materialConfig))
            this.edgesGroup.add(edgeLine)
        }
    }

    createGeometry(json) {
        this.splines.clear()
        this.linesGroup.clear()
        this.edgesGroup.clear()

        const bbox = this.#calculateBoundingBox(json);
        this.#createSplinesAndNodeLines(bbox, json.node);
        this.#createEdgeLines(json.edge);
    }

    addToScene(scene) {
        scene.add(this.linesGroup);
        scene.add(this.edgesGroup);
    }

    getSpline(nodeName) {
        return this.splines.get(nodeName)
    }

    animateEdgeTextures(deltaTime) {
        const baseSpeed = 0.025; // Base speed in units per second
        const speed = baseSpeed * deltaTime;
        
        // Update all edge materials
        this.edgesGroup.traverse((object) => {
            if (object.material && object.material.map) {
                // Animate the U coordinate (equivalent to offset.x)
                object.material.map.offset.x = (object.material.map.offset.x - speed) % 1;
            }
        });
    }

    dispose() {
        // Remove from scene
        this.linesGroup.parent?.remove(this.linesGroup);
        this.edgesGroup.parent?.remove(this.edgesGroup);

        // Dispose of all geometries and materials
        for (const group of [this.linesGroup, this.edgesGroup]) {
            group.traverse((object) => {
                if (object.geometry) {
                    object.geometry.dispose();
                }

                if (object.material) {
                    if (Array.isArray(object.material)) {
                        for (const material of object.material) {
                            material.dispose();
                        }
                    } else {
                        object.material.dispose();
                    }
                }
            });

            group.clear();
        }

        // Clear the maps
        this.splines.clear();
    }
}

export default GeometryManager;
