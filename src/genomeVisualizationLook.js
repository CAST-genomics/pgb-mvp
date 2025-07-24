import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import Look from './look.js';
import { colorRampArrowMaterialFactory } from './materialService.js';
import materialService from './materialService.js';
import GeometryFactory from "./geometryFactory.js"

/**
 * GenomeVisualizationLook - specific implementation for genome visualization
 * Handles node lines and edge meshes with genome-specific material creation
 */
class GenomeVisualizationLook extends Look {

    static NODE_LINE_WIDTH = 16;
    static ANIMATION_SPEED = 0.5;

    constructor(name, config) {
        super(name, config);

        // Genome-specific configuration
        this.assemblyColors = config.assemblyColors || new Map();
        this.genomicService = config.genomicService;

        // Animation state specific to genome visualization (arrow texture animation)
        this.animationState = {
            uvOffset: 0,
            enabled: config.behaviors?.animation?.enabled ?? false
        };
    }

    /**
     * Factory method for creating a complete genome visualization look
     * with animated edges and node emphasis/deemphasis
     */
    static createGenomeVisualizationLook(name, config = {}) {
        return new GenomeVisualizationLook(name, {
            material: config.material,
            behaviors: {
                // Node emphasis behavior
                emphasis: {
                    type: 'zDepth',
                    normalZ: GeometryFactory.NODE_LINE_Z_OFFSET,
                    deemphasizedZ: GeometryFactory.NODE_LINE_DEEMPHASIS_Z_OFFSET
                },
                // Edge animation behavior
                animation: {
                    type: 'uvOffset',
                    speed: GenomeVisualizationLook.ANIMATION_SPEED,
                    enabled: true
                }
            },
            zOffset: GeometryFactory.NODE_LINE_Z_OFFSET,
            nodeLineWidth: GenomeVisualizationLook.NODE_LINE_WIDTH,
            genomicService: config.genomicService
        });
    }

    /**
     * Create a mesh from geometry and genome context
     */
    createMesh(geometry, context) {
        if (context.type === 'node') {
            return this.createNodeMesh(geometry, context.nodeName);
        } else if (context.type === 'edge') {
            const { startColor, endColor, startNode, endNode, edgeKey } = context;
            return this.createEdgeMesh(geometry, startColor, endColor, startNode, endNode, edgeKey);
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
    createEdgeMesh(geometry, startColor, endColor, startNode, endNode, edgeKey) {

        const material = this.getEdgeMaterial(startColor, endColor);

        const mesh = new THREE.Mesh(geometry, material);

        // Set up user data
        mesh.userData = {
            nodeNameStart: startNode,
            nodeNameEnd: endNode,
            geometryKey: edgeKey,
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
     * Override to use nodeName as objectId for emphasis tracking
     */
    setNodeEmphasisState(nodeName, state) {
        this.setEmphasisState(nodeName, state);
    }

    /**
     * Override to use nodeName as objectId for emphasis tracking
     */
    getNodeEmphasisState(nodeName) {
        return this.getEmphasisState(nodeName);
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
                default:
                    return GeometryFactory.NODE_LINE_Z_OFFSET;
            }
        } else if (objectId.startsWith('edge:')) {

            const state = this.emphasisStates.get(objectId) || 'normal';
            switch (state) {
                case 'deemphasized':
                    return GeometryFactory.EDGE_LINE_Z_OFFSET - 4; // Move edges further back when deemphasized
                case 'normal':
                default:
                    return GeometryFactory.EDGE_LINE_Z_OFFSET;
            }
        }

        // Fallback to parent implementation
        return super.getZOffset(objectId);
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
    updateAnimation(deltaTime, geometryManager) {

        if (!this.animationState.enabled) return;

        const behavior = this.behaviors.animation;

        if (behavior?.type === 'uvOffset') {
            const speed = behavior.speed * deltaTime;
            this.animationState.uvOffset = (this.animationState.uvOffset - speed) % 1.0;
        }

        this.#updateEdgeAnimation(geometryManager.edgesGroup)

    }

    /**
     * Apply current UV offset to edge materials
     * This method should be called from GeometryManager with access to scene objects
     */
    applyUVOffsetToEdgeMaterials(edgesGroup) {
        if (!this.animationState.enabled) return;

        const uvOffset = new THREE.Vector2(this.animationState.uvOffset, 0);

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

    /**
     * Override setAnimationEnabled for genome-specific animation
     */
    setAnimationEnabled(enabled) {
        this.animationState.enabled = enabled;
    }

    /**
     * Override isAnimationEnabled for genome-specific animation
     */
    isAnimationEnabled() {
        return this.animationState.enabled;
    }

    #updateEdgeAnimation(edgesGroup) {
        if (!this.animationState.enabled) return;
        this.applyUVOffsetToEdgeMaterials(edgesGroup);
    }
}

export default GenomeVisualizationLook;
