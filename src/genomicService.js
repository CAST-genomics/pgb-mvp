import {getPerceptuallyDistinctColors} from "./utils/hsluv-utils.js"
import AnnotationRenderService from "./annotationRenderService.js"
import { locusInput } from "./main.js"

class GenomicService {

    constructor() {
        this.metadata = new Map()
        this.assemblyPayload = new Map()
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

    clear() {
        this.metadata.clear();

        for (const {annotationRenderService} of this.assemblyPayload.values()) {

            if (annotationRenderService) {
                annotationRenderService.dispose();
            }
        }

        this.assemblyPayload.clear();
    }
}

export default GenomicService;
