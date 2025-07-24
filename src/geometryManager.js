import * as THREE from 'three'
import eventBus from './utils/eventBus.js';
import GeometryFactory from './geometryFactory.js';

class GeometryManager {

    constructor(genomicService, look) {

        this.genomicService = genomicService;
        this.geometryFactory = new GeometryFactory(genomicService);

        this.setupEventListeners(look);

        this.linesGroup = new THREE.Group();
        this.edgesGroup = new THREE.Group();

        this.geometryData = null;
    }

    setupEventListeners(look) {
        // Subscribe to genome interaction events
        this.deemphasizeUnsub = eventBus.subscribe('genome:deemphasizeNodes', (data) => {
            this.deemphasizeLinesAndEdgesViaNodeNameSet(data.nodeNames, look);
        });

        this.restoreUnsub = eventBus.subscribe('genome:restoreEmphasis', (data) => {
            this.restoreLinesandEdgesViaZOffset(data.nodeNames, look);
        });
    }

    createGeometry(json, look) {
        this.geometryData = this.geometryFactory.createGeometryData(json);

        this.linesGroup.clear();
        this.edgesGroup.clear();

        this.#createNodeMeshes(look);
        this.#createEdgeMeshes(look);
    }

    #createNodeMeshes(look) {
        for (const [nodeName, data] of this.geometryData.nodeGeometries) {
            const context = { type: 'node', nodeName };
            const mesh = look.createMesh(data.geometry, context);
            this.linesGroup.add(mesh);
        }
    }

    #createEdgeMeshes(look) {
        for (const [edgeKey, data] of this.geometryData.edgeGeometries) {

            const { startColor, endColor, startNode, endNode } = data;
            const context =
             {
                type: 'edge',
                startColor,
                endColor,
                startNode,
                endNode,
                edgeKey
            };

            const mesh = look.createMesh(data.geometry, context);
            this.edgesGroup.add(mesh);
        }
    }

    getSpline(nodeName) {
        return this.geometryFactory.getSpline(nodeName);
    }

    deemphasizeLinesAndEdgesViaNodeNameSet(nodeNameSet, look) {

        for (const nodeName of nodeNameSet) {
            look.setEmphasisState(nodeName, 'deemphasized');
        }

        // Apply material changes to nodes
        this.#updateNodeEmphasis(nodeNameSet, 'deemphasized', look);

        // Deemphasize edges connected to these nodes
        this.#updateEdgeEmphasis(nodeNameSet, 'deemphasized', look);

        this.#updateGeometryPositions(look);
    }

    restoreLinesandEdgesViaZOffset(nodeNameSet, look) {

        // Set emphasis state for all nodes in the set
        for (const nodeName of nodeNameSet) {
            look.setEmphasisState(nodeName, 'normal');
        }

        // Apply material changes to nodes
        this.#updateNodeEmphasis(nodeNameSet, 'normal', look);

        // Restore edges connected to these nodes
        this.#updateEdgeEmphasis(nodeNameSet, 'normal', look);

        this.#updateGeometryPositions(look);
    }

    #updateEdgeEmphasis(nodeNameSet, emphasisState, look) {

        // Find edges connected to the specified nodes and update their emphasis state
        this.edgesGroup.traverse((object) => {
            if (object.userData?.type === 'edge') {
                const { nodeNameStart, nodeNameEnd } = object.userData;

                // Check if this edge connects to any of the nodes being updated
                if (nodeNameSet.has(nodeNameStart) || nodeNameSet.has(nodeNameEnd)) {
                    // Use the edge key as the identifier for emphasis state
                    const edgeKey = object.userData.geometryKey;
                    look.setEmphasisState(edgeKey, emphasisState);

                    // Apply material switching
                    look.applyEmphasisState(object, emphasisState);
                }
            }
        });
    }

    #updateNodeEmphasis(nodeNameSet, emphasisState, look) {

        // Apply material changes in a single traversal
        this.linesGroup.traverse((object) => {
            if (object.userData?.nodeName && nodeNameSet.has(object.userData.nodeName)) {
                look.applyEmphasisState(object, emphasisState);
            }
        });
    }

    #updateGeometryPositions(look) {

        // Update node positions
        this.linesGroup.traverse((object) => {
            if (object.userData?.nodeName) {
                const nodeName = object.userData.nodeName;
                const zOffset = look.getZOffset(`node:${nodeName}`);

                // Update geometry Z coordinates
                if (object.geometry.attributes.instanceStart) {
                    const instanceStart = object.geometry.attributes.instanceStart.array;
                    const instanceEnd = object.geometry.attributes.instanceEnd.array;

                    for (let i = 0; i < instanceStart.length; i += 3) {
                        instanceStart[i + 2] = zOffset;
                        instanceEnd[i + 2] = zOffset;
                    }

                    // Update line distances for Line2 objects
                    if (object.computeLineDistances) {
                        object.computeLineDistances();
                    }

                    object.geometry.attributes.instanceStart.needsUpdate = true;
                    object.geometry.attributes.instanceEnd.needsUpdate = true;
                }
            }
        });

        // Update edge positions
        this.edgesGroup.traverse((object) => {
            if (object.userData?.type === 'edge') {
                const edgeKey = object.userData.geometryKey;
                object.position.z = look.getZOffset(edgeKey);
            }
        });
    }

    addToScene(scene) {
        scene.add(this.linesGroup);
        scene.add(this.edgesGroup);
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

}

export default GeometryManager;
