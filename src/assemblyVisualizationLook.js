import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import Look from './look.js';
import { colorRampArrowMaterialFactory } from './materialService.js';
import materialService from './materialService.js';
import GeometryFactory from "./geometryFactory.js"
import eventBus from "./utils/eventBus.js"
import {getAppleCrayonColorByName, getRandomAppleCrayonColor} from "./utils/color.js"
import genomicService from "./genomicService.js"

class AssemblyVisualizationLook extends Look {

    static ANIMATION_SPEED = 0.5;

    constructor(name, config) {
        super(name, config);

        this.emphasisStates = new Map();

        this.genomicService = config.genomicService;
        this.geometryManager = config.geometryManager;

        this.edgeArrowAnimationState =
            {
                uvOffset: 0,
                enabled: config.behaviors?.edgeArrowAnimation?.enabled ?? false
            };

        // Event subscription references - will be set up when activated
        this.deemphasizeUnsub = null;
        this.restoreUnsub = null;
    }

    static createAssemblyVisualizationLook(name, config) {

        const factoryConfig =
            {
                behaviors:
                    {
                        edgeArrowAnimation:
                            {
                                type: 'uvOffset',
                                speed: AssemblyVisualizationLook.ANIMATION_SPEED,
                                enabled: true
                            }
                    }
            };

        return new AssemblyVisualizationLook(name, {...factoryConfig, ...config });
    }

    /**
     * Create a node mesh from geometry
     */
    createNodeMesh(geometry, context) {

        const {nodeName} = context

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
    createEdgeMesh(geometry, context) {

        const { startNode, endNode, edgeKey } = context;

        // const startColor = this.genomicService.getAssemblyColor(`${startNode}`)
        // const endColor = this.genomicService.getAssemblyColor(`${endNode}`)
        const startColor = getAppleCrayonColorByName('steel')
        const endColor = getAppleCrayonColorByName('steel')
        const material = this.getEdgeMaterial(startColor, endColor)

        const mesh = new THREE.Mesh(geometry, material);

        mesh.userData =
            {
                nodeNameStart: startNode,
                nodeNameEnd: endNode,
                geometryKey: edgeKey,
                lookName: this.name,
                type: 'edge',
                originalMaterial: material // Store original material for emphasis/deemphasis
            };

        return mesh;
    }

    getNodeMaterial(nodeName) {

        return new LineMaterial({
            color: getAppleCrayonColorByName('aqua'),
            linewidth: Look.NODE_LINE_WIDTH,
            worldUnits: true,
            opacity: 1,
            transparent: true
        });
    }

    getAssemblyMaterial(assembly) {

        return new LineMaterial({
            color: this.genomicService.getAssemblyColor(assembly),
            linewidth: Look.NODE_LINE_WIDTH,
            worldUnits: true,
            opacity: 1,
            transparent: true
        });
    }

    getEdgeMaterial(startColor, endColor) {
        return colorRampArrowMaterialFactory(startColor, endColor, materialService.getTexture('arrow-white'), 1);
    }

    setNodeAndEdgeEmphasis(emphasisAssembly) {

        this.emphasisStates.clear()

        const emphasisNodeSet = this.genomicService.getNodeNameSetWithAssembly(emphasisAssembly);
        const deemphasisNodeNameSet = this.genomicService.getNodeNameSet().difference(emphasisNodeSet);

        for (const nodeName of deemphasisNodeNameSet) {
            this.setEmphasisState(nodeName, 'deemphasized');
        }

        this.#updateNodeEmphasis(deemphasisNodeNameSet, 'deemphasized', undefined);
        this.#updateEdgeEmphasis(deemphasisNodeNameSet, 'deemphasized', undefined);

        this.#updateNodeEmphasis(emphasisNodeSet, 'emphasized', emphasisAssembly);
        this.#updateEdgeEmphasis(emphasisNodeSet, 'emphasized', emphasisAssembly);

        this.#updateGeometryPositions();
    }

    restoreLinesandEdgesViaZOffset(nodeNameSet) {

        for (const nodeName of nodeNameSet) {
            this.setEmphasisState(nodeName, 'normal');
        }

        this.#updateNodeEmphasis(nodeNameSet, 'normal', undefined);

        this.#updateEdgeEmphasis(nodeNameSet, 'normal', undefined);

        this.#updateGeometryPositions();
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
                case 'emphasized':
                    return GeometryFactory.NODE_LINE_Z_OFFSET;
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
                case 'emphasized':
                    return GeometryFactory.EDGE_LINE_Z_OFFSET;
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

    applyEmphasisState(mesh, emphasisState, assembly) {
        if (!mesh.userData) return;

        const { type, originalMaterial } = mesh.userData;

        if (emphasisState === 'deemphasized') {
            if (type === 'node') {
                mesh.material = materialService.createNodeLineDeemphasisMaterial();
            } else if (type === 'edge') {
                mesh.material = materialService.getEdgeDeemphasisMaterial();
            }
        } else if (emphasisState === 'emphasized') {

            if (type === 'node') {
                mesh.material = this.getAssemblyMaterial(assembly);
            } else if (type === 'edge') {
                mesh.material = materialService.getEdgeEmphasisMaterial(this.genomicService.getAssemblyColor(assembly));
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

    setAnimationEnabled(enabled) {
        this.edgeArrowAnimationState.enabled = enabled;
    }

    isAnimationEnabled() {
        return this.edgeArrowAnimationState.enabled;
    }

    createNodeTooltipContent(nodeObject) {
        const { nodeName } = nodeObject.userData;
        const nativeAssemblies = this.genomicService.getAssemblyListForNodeName(nodeName);
        const set = new Set([ ...nativeAssemblies ])
        const str = [ ...set ].map(assembly => `<div><strong>Assembly:</strong> ${assembly}</div>`)
        return `<div><strong>Node:</strong> ${nodeName}</div>${ str.join('') }`
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

    #updateEdgeEmphasis(nodeNameSet, emphasisState, assembly) {

        // Find edges connected to the specified nodes and update their emphasis state
        this.geometryManager.edgesGroup.traverse((object) => {
            if (object.userData?.type === 'edge') {

                const edgeKey = object.userData.geometryKey;
                this.setEmphasisState(edgeKey, emphasisState);

                const [ unused, startNodeName, endNodeName ] = edgeKey.split(':')

                if ('deemphasized' === emphasisState) {
                    if (nodeNameSet.has(startNodeName) || nodeNameSet.has(endNodeName)) {
                        this.applyEmphasisState(object, emphasisState, assembly);
                    }
                } else {
                    if (nodeNameSet.has(startNodeName) && nodeNameSet.has(endNodeName)) {
                        this.applyEmphasisState(object, emphasisState, assembly);
                    }
                }

            }
        })
    }

    #updateNodeEmphasis(nodeNameSet, emphasisState, assembly) {

        this.geometryManager.linesGroup.traverse((object) => {
            if (object.userData?.nodeName && nodeNameSet.has(object.userData.nodeName)) {
                this.applyEmphasisState(object, emphasisState, assembly);
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

    /**
     * Activate this look - subscribe to events
     */
    activate() {
        super.activate();

        // Subscribe to assembly interaction events
        this.deemphasizeUnsub = eventBus.subscribe('assembly:deemphasizeNodes', (data) => {
            const { assembly } = data
            this.setNodeAndEdgeEmphasis(assembly);
        });

        this.restoreUnsub = eventBus.subscribe('assembly:restoreEmphasis', (data) => {
            this.restoreLinesandEdgesViaZOffset(data.nodeNames);
        });
    }

    /**
     * Deactivate this look - unsubscribe from events
     */
    deactivate() {
        super.deactivate();

        // Unsubscribe from events
        if (this.deemphasizeUnsub) {
            this.deemphasizeUnsub();
            this.deemphasizeUnsub = null;
        }

        if (this.restoreUnsub) {
            this.restoreUnsub();
            this.restoreUnsub = null;
        }
    }

    dispose() {
        this.deactivate(); // Ensure we unsubscribe before disposing
        super.dispose();
        this.emphasisStates.clear();
    }
}

export default AssemblyVisualizationLook;
