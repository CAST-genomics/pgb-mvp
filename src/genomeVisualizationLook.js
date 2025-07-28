import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import Look from './look.js';
import { colorRampArrowMaterialFactory } from './materialService.js';
import materialService from './materialService.js';
import GeometryFactory from "./geometryFactory.js"
import eventBus from "./utils/eventBus.js"

/**
 * GenomeVisualizationLook - specific implementation for genome visualization
 * Handles node lines and edge meshes with genome-specific material creation
 */
class GenomeVisualizationLook extends Look {

    static NODE_LINE_WIDTH = 16;
    static ANIMATION_SPEED = 0.5;

    constructor(name, config) {
        super(name, config);

        this.emphasisStates = new Map();

        this.genomicService = config.genomicService;
        this.geometryManager = config.geometryManager;

        // Animation state specific to genome visualization (arrow texture animation)
        this.edgeArrowAnimationState =
            {
                uvOffset: 0,
                enabled: config.behaviors?.edgeArrowAnimation?.enabled ?? false
            };

        // Subscribe to genome interaction events
        this.deemphasizeUnsub = eventBus.subscribe('genome:deemphasizeNodes', (data) => {
            this.deemphasizeLinesAndEdgesViaNodeNameSet(data.nodeNames);
        });

        this.restoreUnsub = eventBus.subscribe('genome:restoreEmphasis', (data) => {
            this.restoreLinesandEdgesViaZOffset(data.nodeNames);
        });

    }

    /**
     * Factory method for creating a complete genome visualization look
     * with animated edges and node emphasis/deemphasis
     */
    static createGenomeVisualizationLook(name, config) {

        const factoryConfig =
            {
                behaviors:
                    {
                        edgeArrowAnimation:
                            {
                                type: 'uvOffset',
                                speed: GenomeVisualizationLook.ANIMATION_SPEED,
                                enabled: true
                            }
                    }
            };

        return new GenomeVisualizationLook(name, {...factoryConfig, ...config });
    }

    /**
     * Create a mesh from geometry and genome context
     */
    createMesh(geometry, context) {
        if (context.type === 'node') {
            return this.createNodeMesh(geometry, context.nodeName);
        } else if (context.type === 'edge') {
            const { startNode, endNode, edgeKey, frequencyCalculationNodeID } = context;

            return this.createEdgeMesh(geometry, startNode, endNode, edgeKey, frequencyCalculationNodeID);
        }

        throw new Error(`Unknown context type: ${context.type}`);
    }

    /**
     * Create a node mesh from geometry
     */
    createNodeMesh(geometry, nodeName) {
        const material = this.getNodeMaterial(nodeName);

        const mesh = new Line2(geometry, material);

        // Set up user data
        mesh.userData = {
            nodeName,
            geometryKey: `node:${nodeName}`,
            lookName: this.name,
            type: 'node',
            originalMaterial: material // Store original material for emphasis/deemphasis
        };

        return mesh;
    }

    /**
     * Create an edge mesh from geometry
     */
    createEdgeMesh(geometry, startNode, endNode, edgeKey, frequencyCalculationNodeID) {

        const startColor = this.genomicService.getAssemblyColor(`${startNode}`)
        const endColor = this.genomicService.getAssemblyColor(`${endNode}`)
        const material = this.getEdgeMaterial(startColor, endColor);

        const mesh = new THREE.Mesh(geometry, material);

        mesh.userData =
            {
                nodeNameStart: startNode,
                nodeNameEnd: endNode,
                geometryKey: edgeKey,
                frequencyCalculationNodeID,
                lookName: this.name,
                type: 'edge',
                originalMaterial: material // Store original material for emphasis/deemphasis
            };

        return mesh;
    }

    /**
     * Get node material based on assembly
     */
    getNodeMaterial(nodeName) {

        return new LineMaterial({
            color: this.genomicService.getAssemblyColor(nodeName),
            linewidth: GenomeVisualizationLook.NODE_LINE_WIDTH,
            worldUnits: true,
            opacity: 1,
            transparent: true
        });
    }

    /**
     * Get edge material based on colors
     */
    getEdgeMaterial(startColor, endColor) {
        return colorRampArrowMaterialFactory(startColor, endColor, materialService.getTexture('arrow-white'), 1);
    }

    /**
     * Override getZOffset to handle both nodes and edges with different Z-offsets
     */
    getZOffset(objectId) {

        if (objectId.startsWith('node:')) {
            // Node emphasis behavior
            const nodeName = objectId.replace('node:', '');
            const state = this.emphasisStates.get(nodeName) || 'normal';
            switch (state) {
                case 'deemphasized':
                    return GeometryFactory.NODE_LINE_DEEMPHASIS_Z_OFFSET;
                case 'normal':
                    return GeometryFactory.NODE_LINE_Z_OFFSET;
                default:
                    console.error(`getZOffset: object ${ objectId } has invalid emphasis state`);
                    return GeometryFactory.EDGE_LINE_Z_OFFSET;
            }
        } else if (objectId.startsWith('edge:')) {

            const state = this.emphasisStates.get(objectId) || 'normal';
            switch (state) {
                case 'deemphasized':
                    return GeometryFactory.EDGE_LINE_Z_OFFSET - 4;
                case 'normal':
                    return GeometryFactory.EDGE_LINE_Z_OFFSET;
                default:
                    console.error(`getZOffset: object ${ objectId } has invalid emphasis state`);
                    return GeometryFactory.EDGE_LINE_Z_OFFSET;
            }
        }

        // Fallback to parent implementation
        return super.getZOffset(objectId);
    }

    setEmphasisState(nodeName, state) {
        this.emphasisStates.set(nodeName, state);
    }

    applyEmphasisState(mesh, emphasisState) {
        if (!mesh.userData) return;

        const { type, originalMaterial } = mesh.userData;

        if (emphasisState === 'deemphasized') {
            if (type === 'node') {
                mesh.material = materialService.createNodeLineDeemphasisMaterial();
            } else if (type === 'edge') {
                mesh.material = materialService.createEdgeLineDeemphasisMaterial();
            }
        } else {
            if (originalMaterial) {
                mesh.material = originalMaterial;
            }
        }
    }

    /**
     * Override updateAnimation to update arrow texture animation
     */
    updateBehavior(deltaTime, geometryManager) {

        if (!this.edgeArrowAnimationState.enabled) return;

        const behavior = this.behaviors.edgeArrowAnimation;

        if (behavior?.type === 'uvOffset') {
            const speed = behavior.speed * deltaTime;
            this.edgeArrowAnimationState.uvOffset = (this.edgeArrowAnimationState.uvOffset - speed) % 1.0;
        }

        this.#updateEdgeAnimation(geometryManager.edgesGroup)

    }

    /**
     * Override setAnimationEnabled for genome-specific animation
     */
    setAnimationEnabled(enabled) {
        this.edgeArrowAnimationState.enabled = enabled;
    }

    /**
     * Override isAnimationEnabled for genome-specific animation
     */
    isAnimationEnabled() {
        return this.edgeArrowAnimationState.enabled;
    }

    #updateEdgeAnimation(edgesGroup) {

        if (!this.edgeArrowAnimationState.enabled) return;

        const uvOffset = new THREE.Vector2(this.edgeArrowAnimationState.uvOffset, 0);

        let edgeCount = 0;
        edgesGroup.traverse((object) => {
            if (object.userData?.type === 'edge' && object.material && object.material.uniforms) {
                if (object.material.uniforms.uvOffset) {
                    object.material.uniforms.uvOffset.value.copy(uvOffset);
                    edgeCount++;
                }
            }
        });

    }

    deemphasizeLinesAndEdgesViaNodeNameSet(nodeNameSet) {

        for (const nodeName of nodeNameSet) {
            this.setEmphasisState(nodeName, 'deemphasized');
        }

        this.#updateNodeEmphasis(nodeNameSet, 'deemphasized');

        this.#updateEdgeEmphasis(nodeNameSet, 'deemphasized');

        this.#updateGeometryPositions();
    }

    restoreLinesandEdgesViaZOffset(nodeNameSet) {

        for (const nodeName of nodeNameSet) {
            this.setEmphasisState(nodeName, 'normal');
        }

        this.#updateNodeEmphasis(nodeNameSet, 'normal');

        this.#updateEdgeEmphasis(nodeNameSet, 'normal');

        this.#updateGeometryPositions();
    }

    #updateEdgeEmphasis(nodeNameSet, emphasisState) {

        // Find edges connected to the specified nodes and update their emphasis state
        this.geometryManager.edgesGroup.traverse((object) => {
            if (object.userData?.type === 'edge') {
                const { nodeNameStart, nodeNameEnd } = object.userData;

                // Check if this edge connects to any of the nodes being updated
                if (nodeNameSet.has(nodeNameStart) || nodeNameSet.has(nodeNameEnd)) {
                    // Use the edge key as the identifier for emphasis state
                    const edgeKey = object.userData.geometryKey;
                    this.setEmphasisState(edgeKey, emphasisState);

                    // Apply material switching
                    this.applyEmphasisState(object, emphasisState);
                }
            }
        });
    }

    #updateNodeEmphasis(nodeNameSet, emphasisState) {

        this.geometryManager.linesGroup.traverse((object) => {
            if (object.userData?.nodeName && nodeNameSet.has(object.userData.nodeName)) {
                this.applyEmphasisState(object, emphasisState);
            }
        });
    }

    #updateGeometryPositions() {

        // Update node positions
        this.geometryManager.linesGroup.traverse((object) => {
            if (object.userData?.nodeName) {
                const nodeName = object.userData.nodeName;
                const zOffset = this.getZOffset(`node:${nodeName}`);

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
        this.geometryManager.edgesGroup.traverse((object) => {
            if (object.userData?.type === 'edge') {
                const edgeKey = object.userData.geometryKey;
                object.position.z = this.getZOffset(edgeKey);
            }
        });
    }

    dispose() {
        super.dispose();
        this.emphasisStates.clear();
    }
}

export default GenomeVisualizationLook;
