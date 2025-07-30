import {getPerceptuallyDistinctColors} from "./utils/hsluv-utils.js"
import AnnotationRenderService from "./annotationRenderService.js"
import { locusInput } from "./main.js"
import { calculateDistributionStats, normalizeDataset } from "./utils/stats.js"

class GenomicService {

    constructor() {
        this.metadata = new Map()
        this.assemblyPayload = new Map()
        this.nodeAssemblyStats = new Map()
    }

    async createMetadata(nodes, sequences, genomeLibrary, raycastService) {

        const assemblySet = new Set()
        const assemblyColors = new Map()
        const renderLibrary = new Map()
        const locusExtentMap = new Map()

        for (const [nodeName, nodeData] of Object.entries(nodes)) {

            const { length: bpLength, assembly, range } = nodeData;

            const metadata =  { nodeName, bpLength, assembly, sequence: sequences[nodeName] };

            if (typeof range === 'string' && range.trim().length > 0) {
                const locus = locusInput.parseLocusString(range)

                // Internal to the app we use 0-indexed
                locus.startBP -= 1
                metadata.locus = locus
                // console.log(`GenomicService: genome: ${assembly} locus: ${locusInput.prettyPrintLocus(locus)}`)

                // Update locusExtentMap with the full extent for this assembly
                // const currentExtent = this.locusExtentMap.get(assembly) || { chr: locus.chr, startBP: locus.startBP, endBP: locus.endBP }

                // Update the extent if this locus extends beyond current bounds
                const currentExtent = locusExtentMap.get(assembly)
                if (currentExtent) {
                    locusExtentMap.set(assembly, {
                        chr: currentExtent.chr,
                        startBP: Math.min(currentExtent.startBP, locus.startBP),
                        endBP: Math.max(currentExtent.endBP, locus.endBP)
                    })
                } else {
                    const { chr, startBP, endBP } = locus
                    locusExtentMap.set(assembly, { chr, startBP, endBP })
                }

                if (!renderLibrary.has(assembly)) {

                    const {geneFeatureSource, geneRenderer} = await genomeLibrary.getGenomePayload(assembly)
                    const container = document.querySelector('#pgb-gene-render-container')
                    const annotationRenderService = new AnnotationRenderService(container, geneFeatureSource, geneRenderer, this, raycastService)
                    renderLibrary.set(assembly, annotationRenderService)
                }
            } else {
                // console.log(`GenomicService: genome: ${assembly} no locus`);
            }

            this.metadata.set(nodeName, metadata);
            assemblySet.add(assembly);
        }

        const uniqueColors = getPerceptuallyDistinctColors(assemblySet.size)

        let i = 0;
        for (const assembly of assemblySet) {
            assemblyColors.set(assembly, uniqueColors[i]);
            i++;
        }

        console.log(`GenomicService: Created ${assemblyColors.size} assembly colors`);

        // Combine all local instances into assemblyPayload
        for (const assembly of assemblySet) {
            const color = assemblyColors.get(assembly);
            const annotationRenderService = renderLibrary.get(assembly);
            const locus = locusExtentMap.get(assembly);

            this.assemblyPayload.set(assembly, { color, annotationRenderService, locus });
        }
    }

    getAssemblyForNodeName(nodeName) {
        const metadata = this.metadata.get(nodeName);
        if (!metadata) {
            console.error(`GenomicService: Metadata not found for node: ${nodeName}`);
            return null;
        }
        return metadata.assembly;
    }

    getAssemblyColor(nodeName) {
        const metadata = this.metadata.get(nodeName);
        if (!metadata) {
            console.error(`GenomicService: Metadata not found for node: ${nodeName}`);
            return null;
        }
        return this.assemblyPayload.get(metadata.assembly).color;
    }

    getNodeNameSetWithAssembly(assembly) {
        const metadataList = [ ...this.metadata.values() ];
        const some = metadataList.filter(metadata => metadata.assembly === assembly);
        return new Set(some.map(metadata => metadata.nodeName));
    }

    getNodeNameSet() {
        return new Set(this.metadata.keys());
    }

    /**
     * Build assembly statistics for each node by analyzing connected edges
     * @param {Map} nodeGeometries - Map of node geometries
     * @param {Map} edgeGeometries - Map of edge geometries
     * @returns {Map} Node assembly statistics
     */
    buildNodeAssemblyStatistics(nodeGeometries, edgeGeometries) {

        this.nodeAssemblyStats.clear()

        for (const [nodeName, nodeData] of nodeGeometries) {
            this.nodeAssemblyStats.set(nodeName, {
                incomingAssemblies: new Set(),
                outgoingAssemblies: new Set(),
                percentage: 0,
                normalizedPercentage: 0,
                percentile: 0,
                distributionStats: null
            });
        }

        for (const [edgeKey, edgeData] of edgeGeometries) {
            const { startNode, endNode } = edgeData;

            // Get startNode assembly
            const startNodeAssembly = this.getAssemblyForNodeName(startNode);
            if (startNodeAssembly) {
                const endNodeStats = this.nodeAssemblyStats.get(endNode);
                if (endNodeStats) {

                    // startNode assemblies contribute to the tally of assemblies associated
                    // with the endNode. They "flow in" to the endNode
                    endNodeStats.incomingAssemblies.add(startNodeAssembly);
                }
            }

            // Get endNode assembly
            const endNodeAssembly = this.getAssemblyForNodeName(endNode);
            if (endNodeAssembly) {
                const startNodeStats = this.nodeAssemblyStats.get(startNode);
                if (startNodeStats) {

                    // endNode assemblies contribute to the tally of assemblies associated
                    // with the startNode they "flow out" of the startNode
                    startNodeStats.outgoingAssemblies.add(endNodeAssembly);
                }
            }
        }

        // Calculate percentage for each node
        const allPercentages = [];
        const nodePercentages = new Map();

        for (const [nodeName, nodeStats] of this.nodeAssemblyStats.entries()) {
            // Get the node's own assembly
            const nodeAssembly = this.getAssemblyForNodeName(nodeName);
            
            // Create a set of all assemblies associated with this node
            const allAssemblies = new Set();
            
            // Add the node's own assembly
            if (nodeAssembly) {
                allAssemblies.add(nodeAssembly);
            }
            
            // Add incoming assemblies
            for (const assembly of nodeStats.incomingAssemblies) {
                allAssemblies.add(assembly);
            }
            
            // Add outgoing assemblies
            for (const assembly of nodeStats.outgoingAssemblies) {
                allAssemblies.add(assembly);
            }

            // Calculate percentage of total assemblies
            const totalAssemblies = this.assemblyPayload.size;
            const nodeAssemblyCount = allAssemblies.size;
            const percentage = totalAssemblies > 0 ? nodeAssemblyCount / totalAssemblies : 0;
            
            nodeStats.percentage = percentage;
            allPercentages.push(percentage);
            nodePercentages.set(nodeName, percentage);
        }

        // Calculate distribution statistics across all nodes
        const distributionStats = calculateDistributionStats(allPercentages);
        
        // Calculate normalized percentages using percentile-based normalization
        const normalizedPercentages = normalizeDataset(allPercentages, 'percentile');
        
        // Update each node with distribution stats and normalized values
        let index = 0;
        for (const [nodeName, nodeStats] of this.nodeAssemblyStats.entries()) {
            nodeStats.normalizedPercentage = normalizedPercentages[index];
            nodeStats.percentile = (index / (allPercentages.length - 1)) || 0; // Rank among all nodes
            nodeStats.distributionStats = distributionStats;
            index++;
        }

        // Log distribution statistics for debugging
        console.log('Node Assembly Distribution Statistics:', distributionStats);

    }

    clear() {
        this.metadata.clear();

        for (const {annotationRenderService} of this.assemblyPayload.values()) {

            if (annotationRenderService) {
                annotationRenderService.dispose();
            }
        }

        this.assemblyPayload.clear()
        this.nodeAssemblyStats.clear()
    }
}

export default GenomicService;
