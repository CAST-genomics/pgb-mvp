import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import Look from './look.js';
import { colorRampArrowMaterialFactory } from './materialService.js';
import materialService from './materialService.js';
import GeometryFactory from "./geometryFactory.js"
import { getRandomVibrantAppleCrayonColor, getAppleCrayonColorByName, getHeatmapColorViaColorInterpolation, getHeatmapColorHSLLightnessVariation } from './utils/color.js'

/**
 * GenomeFrequencyLook - specific implementation for genome frequency visualization
 * Handles node lines and edge meshes with frequency-specific material creation
 * No animation or emphasis/deemphasis functionality
 */
class GenomeFrequencyLook extends Look {

    constructor(name, config) {
        super(name, config);

        this.genomicService = config.genomicService;
        this.geometryManager = config.geometryManager;

        // No event subscriptions for emphasis/deemphasis
        // No animation state
    }

    /**
     * Factory method for creating a complete genome frequency look
     * with static edges and no emphasis/deemphasis
     */
    static createGenomeFrequencyLook(name, config) {

        const factoryConfig =
            {
                behaviors:
                    {
                        // No animation behaviors
                    }
            };

        return new GenomeFrequencyLook(name, {...factoryConfig, ...config });
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
            originalMaterial: material
        };

        return mesh;
    }

    /**
     * Create an edge mesh from geometry
     */
    createEdgeMesh(geometry, context) {

        const { startNode, endNode, edgeKey } = context;

        // Use a single random vibrant color for both start and end
        const edgeColor = getAppleCrayonColorByName('magnesium')
        const material = this.getEdgeMaterial(edgeColor, edgeColor);

        const mesh = new THREE.Mesh(geometry, material);

        mesh.userData =
            {
                nodeNameStart: startNode,
                nodeNameEnd: endNode,
                geometryKey: edgeKey,
                lookName: this.name,
                type: 'edge',
                originalMaterial: material
            };

        return mesh;
    }

    getNodeMaterial(nodeName) {
        // Calculate assembly count percentage for this node
        const nodeColor = this.getNodeAssemblyHeatmapColor(nodeName);

        return new LineMaterial({
            color: nodeColor,
            linewidth: Look.NODE_LINE_WIDTH,
            worldUnits: true,
            opacity: 1,
            transparent: true
        });
    }

    /**
     * Calculate assembly count percentage for a node and return appropriate heatmap color
     * @param {string} nodeName - The name of the node
     * @returns {THREE.Color} Heatmap color based on assembly count percentage
     */
    getNodeAssemblyHeatmapColor(nodeName) {
        if (!this.genomicService || !this.genomicService.nodeAssemblyStats) {
            // Fallback to random color if genomic service is not available
            return getRandomVibrantAppleCrayonColor();
        }

        const nodeStats = this.genomicService.nodeAssemblyStats.get(nodeName);
        if (!nodeStats) {
            // Fallback to random color if node stats are not available
            return getRandomVibrantAppleCrayonColor();
        }

        // Use the normalized percentage for better heatmap visualization
        const percentage = nodeStats.normalizedPercentage;

        console.log(`Node ${nodeName} - Raw: ${nodeStats.percentage.toFixed(3)}, Normalized: ${percentage.toFixed(3)}`);
        // return getHeatmapColorHSLLightnessVariation(percentage, 'aqua');
        return getHeatmapColorViaColorInterpolation(percentage, 'sky', 'aqua');
    }

    getEdgeMaterial(startColor, endColor) {
        return colorRampArrowMaterialFactory(startColor, endColor, materialService.getTexture('arrow-white'), 1);
    }

    /**
     * Override getZOffset to handle both nodes and edges with fixed Z-offsets
     */
    getZOffset(objectId) {

        if (objectId.startsWith('node:')) {
            // Fixed Z-offset for nodes
            return GeometryFactory.NODE_LINE_Z_OFFSET;
        } else if (objectId.startsWith('edge:')) {
            // Fixed Z-offset for edges
            return GeometryFactory.EDGE_LINE_Z_OFFSET;
        }

        // Fallback to parent implementation
        return super.getZOffset(objectId);
    }

    /**
     * No animation behavior - edges are static
     */
    updateBehavior(deltaTime, geometryManager) {
        // No animation for frequency visualization
    }

    /**
     * No animation enabled for frequency visualization
     */
    setAnimationEnabled(enabled) {
        // Animation is always disabled for frequency visualization
    }

    /**
     * Animation is always disabled for frequency visualization
     */
    isAnimationEnabled() {
        return false;
    }

    /**
     * Create custom tooltip content for nodes showing frequency information
     * @param {Object} nodeObject - The node object with userData
     * @returns {string} HTML content for the node tooltip
     */
    createNodeTooltipContent(nodeObject) {
        const { nodeName } = nodeObject.userData;

        const nodeStats = this.genomicService.nodeAssemblyStats.get(nodeName);
        if (!nodeStats) {
            return `
                <div><strong>Node:</strong> ${nodeName}</div>
                <div><em>No frequency data available</em></div>`;
        }

        const percentage = nodeStats.percentage;
        const normalizedPercentage = nodeStats.normalizedPercentage;
        const allAssemblies = Array.from(nodeStats.allAssemblies).sort();
        
        // Get the node's native assembly
        const nativeAssembly = this.genomicService.getAssemblyForNodeName(nodeName);
        
        // Get connected assemblies (all assemblies minus the native one)
        const connectedAssemblies = allAssemblies.filter(assembly => assembly !== nativeAssembly);

        return `
            <div><strong>Node:</strong> ${nodeName}</div>
            <div><strong>Native Assembly:</strong> ${nativeAssembly || 'Unknown'}</div>
            ${connectedAssemblies.length > 0 ? `<div><strong>Connected Assemblies:</strong></div>
            ${connectedAssemblies.map(assembly => `<div style="margin-left: 10px;">• ${assembly}</div>`).join('')}` : ''}
            <div><strong>Frequency:</strong> ${(percentage * 100).toFixed(1)}%</div>
            <div><strong>Normalized Frequency:</strong> ${(normalizedPercentage * 100).toFixed(1)}%</div>`;
    }

    dispose() {
        super.dispose();
    }
}

export default GenomeFrequencyLook;
