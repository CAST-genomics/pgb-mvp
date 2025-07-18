import * as THREE from 'three'
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import materialService from './materialService.js';
import { colorRampArrowMaterialFactory } from './materialService.js';
import eventBus from './utils/eventBus.js';
import GeometryFactory from './geometryFactory.js';

class GeometryManager {

    #NODE_LINE_Z_OFFSET = -8
    #NODE_LINE_DEEMPHASIS_Z_OFFSET = -16

    constructor(genomicService) {
        this.genomicService = genomicService
        this.geometryFactory = new GeometryFactory(genomicService);
        this.linesGroup = new THREE.Group();
        this.edgesGroup = new THREE.Group();
        this.isEdgeAnimationEnabled = true;
        this.deemphasizedNodes = new Set(); // Track which nodes are currently deemphasized
        this.geometryData = null; // Store geometry data

        // Subscribe to genome interaction events
        this.deemphasizeUnsub = eventBus.subscribe('genome:deemphasizeNodes', (data) => {
            this.deemphasizeLinesAndEdgesViaNodeNameSet(data.nodeNames);
        });

        this.restoreUnsub = eventBus.subscribe('genome:restoreEmphasis', (data) => {
            this.restoreLinesandEdgesViaZOffset(data.nodeNames);
        });

    }

    createGeometry(json) {

        this.geometryData = this.geometryFactory.createGeometryData(json);

        this.linesGroup.clear();
        this.edgesGroup.clear();

        this.#createNodeMeshes();
        this.#createEdgeMeshes();
    }

    #createNodeMeshes() {

        for (const [nodeName, data] of this.geometryData.nodeGeometries) {

            const materialConfig = {
                color: this.genomicService.getAssemblyColor(nodeName),
                linewidth: 16,
                worldUnits: true,
                opacity: 1,
                transparent: true
            };

            const material = new LineMaterial(materialConfig);
            const mesh = new Line2(data.geometry, material);

            // Store reference to original geometry data
            mesh.userData = { nodeName, geometryKey: `node:${nodeName}`, geometryData: data };

            this.linesGroup.add(mesh);
        }
    }

    #createEdgeMeshes() {

        for (const [edgeKey, data] of this.geometryData.edgeGeometries) {

            const material = colorRampArrowMaterialFactory(data.startColor, data.endColor, materialService.getTexture('arrow-white'), 1);

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

    addToScene(scene) {
        scene.add(this.linesGroup);
        scene.add(this.edgesGroup);
    }

    getSpline(nodeName) {
        return this.geometryFactory.getSpline(nodeName);
    }

    getGeometryData() {
        return this.geometryData;
    }

    animateEdgeTextures(deltaTime) {
        if (false === this.isEdgeAnimationEnabled) {
            return;
        }

        const baseSpeed = 0.5; // Base speed in units per second
        const speed = baseSpeed * deltaTime;

        // Update all edge materials
        this.edgesGroup.traverse((object) => {
            if (object.material && object.material.uniforms) {
                // Handle ShaderMaterial - animate all materials except deemphasis ones
                if (!materialService.isDeemphasisMaterial(object.material)) {
                    object.material.uniforms.uvOffset.value.x = (object.material.uniforms.uvOffset.value.x - speed) % 1.0;
                }
            } else if (object.material && object.material.map) {
                // Handle MeshBasicMaterial
                object.material.map.offset.x = (object.material.map.offset.x - speed) % 1;
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
        // Unsubscribe from events
        if (this.deemphasizeUnsub) {
            this.deemphasizeUnsub();
        }
        if (this.restoreUnsub) {
            this.restoreUnsub();
        }

        // Dispose of geometry factory
        this.geometryFactory.dispose();

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
        this.geometryData = null;
    }

    deemphasizeLinesAndEdgesViaNodeNameSet(nodeNameSet) {

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

                    object.material = materialService.createNodeLineDeemphasisMaterial();

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
                    object.material = materialService.createEdgeLineDeemphasisMaterial();
                }
            }
        });
    }

    restoreLinesandEdgesViaZOffset(nodeNameSet) {

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



}

export default GeometryManager;
