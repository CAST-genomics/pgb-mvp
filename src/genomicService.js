import AnnotationRenderService from "./annotationRenderService.js"
import { locusInput } from "./main.js"
import {getPerceptuallyDistinctColors} from "./utils/hsluv-utils.js"
import {colors32Distinct, colors64Distinct} from "./utils/color.js"
import {uniqueRandomGenerator} from "./utils/utils.js"

class GenomicService {

    constructor() {
        this.metadata = new Map()
        this.assemblyPayload = new Map()
        this.nodeAssemblyStats = new Map()
        this.assemblySet = new Set()
    }

    async createMetadata(nodes, sequences, genomeLibrary, raycastService) {

        this.assemblySet.clear()
        const renderLibrary = new Map()
        const locusExtentMap = new Map()

        for (const [nodeName, nodeData] of Object.entries(nodes)) {

            const { length: bpLength, assembly, range } = nodeData;

            const metadata =  { bpLength, assembly, sequence: sequences[nodeName] };

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

            const list = assembly.map(({ assembly_name }) => assembly_name)
            for (const str of list) {
                this.assemblySet.add(str)
            }

        }

        const uniqueColors = getPerceptuallyDistinctColors(1 + this.assemblySet.size)
        const uniqueColorsRandomized = Array.from(uniqueRandomGenerator(uniqueColors, uniqueColors.length - 1));

        let i = 0;
        for (const assembly of this.assemblySet) {
            const annotationRenderService = renderLibrary.get(assembly);
            const locus = locusExtentMap.get(assembly);
            this.assemblyPayload.set(assembly, { color:uniqueColorsRandomized[ i ], annotationRenderService, locus });
            i++;
        }

        console.log(`GenomicService: Created ${this.assemblySet.size} assembly colors`);

    }

    getAssemblyListForNodeName(nodeName) {
        const metadata = this.metadata.get(nodeName);
        if (!metadata) {
            console.error(`GenomicService: Metadata not found for node: ${nodeName}`);
            return null;
        }
        return metadata.assembly.map(({ assembly_name }) => assembly_name);
    }

    getAssemblyForNodeName(nodeName) {
        const metadata = this.metadata.get(nodeName);
        if (!metadata) {
            console.error(`GenomicService: Metadata not found for node: ${nodeName}`);
            return null;
        }
        return metadata.assembly;
    }

    getAssemblyColor(assembly) {
        return this.assemblyPayload.get(assembly).color;
    }

    getNodeNameSetWithAssembly(assembly) {

        const nodeNameSet = new Set()
        for (const nodeName of this.getNodeNameSet()) {
            const assemblies = this.metadata.get(nodeName).assembly.map(({ assembly_name }) => assembly_name)
            if (new Set([ ...assemblies]).has(assembly)) {
                nodeNameSet.add (nodeName)
            }
        }

        return nodeNameSet.size > 0 ? nodeNameSet : undefined
    }

    getNodeNameSet() {
        return new Set(this.metadata.keys());
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
