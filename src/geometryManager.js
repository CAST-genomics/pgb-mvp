import * as THREE from 'three'
import LineFactory from './lineFactory.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import materialService from './utils/materialService.js';
import { getColorRampArrowMaterial } from './utils/materialService.js';

class GeometryManager {

    #EDGE_LINE_Z_OFFSET = -12

    #NODE_LINE_Z_OFFSET = -8
    #NODE_LINE_DEEMPHASIS_Z_OFFSET = -16

    constructor(genomicService) {
        this.genomicService = genomicService
        this.splines = new Map()
        this.linesGroup = new THREE.Group();
        this.edgesGroup = new THREE.Group();
        this.isEdgeAnimationEnabled = true;
        this.deemphasizedNodes = new Set(); // Track which nodes are currently deemphasized

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
        if (false === this.isEdgeAnimationEnabled) {
            return;
        }

        const baseSpeed = 0.5; // Base speed in units per second
        const speed = baseSpeed * deltaTime;

        // Update all edge materials
        this.edgesGroup.traverse((object) => {
            if (object.material && object.material !== materialService.getEdgeLineDeemphasisMaterial()) {
                if (object.material.uniforms) {
                    // Handle ShaderMaterial
                    object.material.uniforms.uvOffset.value.x = (object.material.uniforms.uvOffset.value.x - speed) % 1.0;
                } else {
                    // Handle MeshBasicMaterial
                    if (object.material.map) {
                        object.material.map.offset.x = (object.material.map.offset.x - speed) % 1;
                    }
                }
            }
        });
    }

    enableEdgeAnimation() {
        this.isEdgeAnimationEnabled = true;
    }

    disableEdgeAnimation() {
        this.isEdgeAnimationEnabled = false;
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

    deemphasizeLinesViaNodeNameSet(nodeNameSet) {

        this.deemphasizedNodes.clear();

        this.linesGroup.traverse((object) => {
            if (object.userData && nodeNameSet.has(object.userData.nodeName)) {
                if (!this.deemphasizedNodes.has(object.userData.nodeName)) {
                    // console.log('Deemphasizing object:', object.userData.nodeName);
                    // console.log('Object type:', object.constructor.name);
                    // console.log('Geometry attributes:', Object.keys(object.geometry.attributes));
                    
                    // LineGeometry uses instanceStart and instanceEnd attributes
                    if (object.geometry.attributes.instanceStart) {
                        const instanceStart = object.geometry.attributes.instanceStart.array;
                        const instanceEnd = object.geometry.attributes.instanceEnd.array;
                        
                        // console.log('InstanceStart array length:', instanceStart.length);
                        // console.log('InstanceEnd array length:', instanceEnd.length);
                        // console.log('Original Z values (start):', Array.from(instanceStart).filter((_, i) => i % 3 === 2));
                        // console.log('Original Z values (end):', Array.from(instanceEnd).filter((_, i) => i % 3 === 2));
                        
                        // Update Z coordinates in both instanceStart and instanceEnd
                        for (let i = 0; i < instanceStart.length; i += 3) {
                            instanceStart[i + 2] = this.#NODE_LINE_DEEMPHASIS_Z_OFFSET;
                        }
                        for (let i = 0; i < instanceEnd.length; i += 3) {
                            instanceEnd[i + 2] = this.#NODE_LINE_DEEMPHASIS_Z_OFFSET;
                        }
                        
                        // console.log('New Z values (start):', Array.from(instanceStart).filter((_, i) => i % 3 === 2));
                        // console.log('New Z values (end):', Array.from(instanceEnd).filter((_, i) => i % 3 === 2));
                        
                        // Update line distances for Line2 objects
                        if (object.computeLineDistances) {
                            object.computeLineDistances();
                        }
                        
                        object.geometry.attributes.instanceStart.needsUpdate = true;
                        object.geometry.attributes.instanceEnd.needsUpdate = true;
                    } else {
                        console.error('No instanceStart attribute found on object:', object);
                    }

                    // Store original material if not already stored
                    if (!object.userData.originalMaterial) {
                        object.userData.originalMaterial = object.material;
                    }

                    object.material = materialService.getNodeLineDeemphasisMaterial();

                    this.deemphasizedNodes.add(object.userData.nodeName);
                }
            }
        });

        this.edgesGroup.traverse((object) => {
            if (object.userData) {
                if (this.deemphasizedNodes.has(object.userData.nodeNameStart) && this.deemphasizedNodes.has(object.userData.nodeNameEnd)) {
                    if (!object.userData.originalMaterial) {
                        object.userData.originalMaterial = object.material;
                    }
                    object.material = materialService.getEdgeLineDeemphasisMaterial();
                }
            }
        });
    }

    restoreLinesViaZOffset(nodeNameSet) {

        this.edgesGroup.traverse((object) => {
            if (object.userData) {
                if (this.deemphasizedNodes.has(object.userData.nodeNameStart) && this.deemphasizedNodes.has(object.userData.nodeNameEnd)) {
                    // Restore original material
                    if (object.userData.originalMaterial) {
                        object.material = object.userData.originalMaterial;
                    }
                }
            }
        });

        this.linesGroup.traverse((object) => {

            if (object.userData && nodeNameSet.has(object.userData.nodeName)) {
                if (this.deemphasizedNodes.has(object.userData.nodeName)) {

                    // LineGeometry uses instanceStart and instanceEnd attributes
                    if (object.geometry.attributes.instanceStart) {
                        const instanceStart = object.geometry.attributes.instanceStart.array;
                        const instanceEnd = object.geometry.attributes.instanceEnd.array;
                        
                        // Update Z coordinates in both instanceStart and instanceEnd
                        for (let i = 0; i < instanceStart.length; i += 3) {
                            instanceStart[i + 2] = this.#NODE_LINE_Z_OFFSET;
                        }
                        for (let i = 0; i < instanceEnd.length; i += 3) {
                            instanceEnd[i + 2] = this.#NODE_LINE_Z_OFFSET;
                        }
                        
                        // Update line distances for Line2 objects
                        if (object.computeLineDistances) {
                            object.computeLineDistances();
                        }
                        
                        object.geometry.attributes.instanceStart.needsUpdate = true;
                        object.geometry.attributes.instanceEnd.needsUpdate = true;
                    }

                    // Restore original material
                    if (object.userData.originalMaterial) {
                        object.material = object.userData.originalMaterial;
                    }

                    this.deemphasizedNodes.delete(object.userData.nodeName);
                }
            }
        });

        this.deemphasizedNodes.clear();
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
        let i = 0
        for (const [nodeName, nodeData] of Object.entries(nodes)) {

            const { ogdf_coordinates } = nodeData;

            // Build spline from coordinates recentered around origin
            const coordinates = ogdf_coordinates.map(({ x, y }) => new THREE.Vector3(x - bbox.x.centroid, y - bbox.y.centroid, 0))
            const spline = new THREE.CatmullRomCurve3(coordinates)

            this.splines.set(nodeName, spline)

            const materialConfig = {
                color: this.genomicService.getAssemblyColor(nodeName),
                linewidth: 16,
                worldUnits: true,
                opacity: 1,
                transparent: true
            }

            const assembly = this.genomicService.metadata.get(nodeName).assembly;
            const line = LineFactory.createNodeLine(nodeName, assembly, spline, 4, this.#NODE_LINE_Z_OFFSET, new LineMaterial(materialConfig))
            this.linesGroup.add(line)

            i++
        }

        console.log(`GeometryManager: Created ${this.splines.size} splines`);
    }

    #createEdgeLines(edges) {

        const getEdgeNodeSign = node => {
            const parts = node.split('')
            const sign = parts.pop()
            const remainder = parts.join('')
            return { sign, remainder }
        }

        for (const { starting_node, ending_node } of Object.values(edges)) {

            let spline

            // Start node
            const { sign: signStart, remainder: remainderStart } = getEdgeNodeSign(starting_node)
            spline = this.splines.get(`${remainderStart}+`)
            if (!spline) {
                console.error(`Could not find start spline at node ${remainderStart}+`)
                continue
            }
            const xyzStart = spline.getPoint(signStart === '+' ? 1 : 0)



            // End node
            const { sign: signEnd, remainder: remainderEnd } = getEdgeNodeSign(ending_node)
            spline = this.splines.get(`${remainderEnd}+`)
            if (!spline) {
                console.error(`Could not find end spline at node ${remainderEnd}+`)
                continue
            }
            const xyzEnd = spline.getPoint(signEnd === '+' ? 0 : 1)

            // position edge lines behind nodes in z coordinate
            xyzStart.z = this.#EDGE_LINE_Z_OFFSET
            xyzEnd.z = this.#EDGE_LINE_Z_OFFSET


            const startColor = this.genomicService.getAssemblyColor(`${remainderStart}+`)
            const endColor = this.genomicService.getAssemblyColor(`${remainderEnd}+`)
            const heroTexture = materialService.getTexture('arrow-white')
            const colorRampMaterial = getColorRampArrowMaterial(startColor, endColor, heroTexture, 1)

            const edgeLine = LineFactory.createEdgeRect(xyzStart, xyzEnd, colorRampMaterial, `${remainderStart}+`, `${remainderEnd}+`)

            this.edgesGroup.add(edgeLine)
        }
    }

}

export default GeometryManager;
