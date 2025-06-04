import {getPerceptuallyDistinctColors} from "./utils/hsluv-utils.js"
import AnnotationRenderService from "./annotationRenderService.js"
import { locusInput } from "./main.js"

class GenomicService {

    constructor() {
        this.metadata = new Map()
        this.allNodeNames = new Set()
        this.assemblySet = new Set()
        this.assemblyColors = new Map()
        this.renderLibrary = new Map()
    }

    async createMetadata(nodes, sequences, genomeLibrary) {

        for (const [nodeName, nodeData] of Object.entries(nodes)) {

            const { length: bpLength, assembly, range } = nodeData;

            const metadata =  { nodeName, bpLength, assembly, sequence: sequences[nodeName] };

            if (typeof range === 'string' && range.trim().length > 0) {
                const locus = locusInput.parseLocusString(range)

                // Internal to the app we use 0-indexed
                locus.startBP -= 1
                metadata.locus = locus
                console.log(`GenomicService: genome: ${assembly} locus: ${locusInput.prettyPrintLocus(locus)}`)

                if (!this.renderLibrary.has(assembly)) {

                    const {geneFeatureSource, geneRenderer} = await genomeLibrary.getGenomePayload(assembly)
                    const container = document.querySelector('#pgb-gene-render-container')
                    const annotationRenderService = new AnnotationRenderService(container, geneFeatureSource, geneRenderer)
                    this.renderLibrary.set(assembly, annotationRenderService)
                }
            } else {
                console.log(`GenomicService: genome: ${assembly} no locus`);
            }

            this.metadata.set(nodeName, metadata);
            this.assemblySet.add(assembly);
            this.allNodeNames.add(nodeName);
        }

        const uniqueColors = getPerceptuallyDistinctColors(this.assemblySet.size)

        let i = 0;
        for (const assembly of this.assemblySet) {
            this.assemblyColors.set(assembly, uniqueColors[i]);
            i++;
        }

        console.log(`GenomicService: Created ${this.assemblyColors.size} assembly colors`);

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
        return this.assemblyColors.get(metadata.assembly);
    }

    getNodeNameSetWithAssembly(assembly) {
        const metadataList = [ ...this.metadata.values() ];
        const some = metadataList.filter(metadata => metadata.assembly === assembly);
        return new Set(some.map(metadata => metadata.nodeName));
    }

    clear() {
        this.metadata.clear();
        this.allNodeNames.clear();
        this.assemblySet.clear();
        this.assemblyColors.clear();
    }
}

export default GenomicService;
