import AnnotationRenderService from "./annotationRenderService.js"
import { locusInput } from "./main.js"
import LocusInput from "./locusInput.js"
import {getPerceptuallyDistinctColors} from "./utils/hsluv-utils.js"
import {colors32Distinct, colors64Distinct} from "./utils/color.js"
import {prettyPrint, uniqueRandomGenerator} from "./utils/utils.js"
import {tripleKey} from "./unused/chatGraphAssemblyWalkLinearizeGraph/assemblyWalkUtils.js"

class GenomicService {

    constructor() {
        this.metadata = new Map()
        this.assemblyPayload = new Map()
        this.nodeAssemblyStats = new Map()
        this.assemblySet = new Set()
        this.assemblyWalkMap = new Map()
        this.annotationRenderServiceMap = new Map()
        this.startNode = undefined
    }

    async createMetadata(json, pangenomeService, genomeLibrary, geometryManager, raycastService) {

        const { locus:locusString, node:nodes, edge:edges, sequence:sequences } = json

        this.locus = LocusInput.parseLocusString(locusString)

        // Internal to the app we use 0-indexed
        this.locus.startBP -= 1
        console.log(`locus length ${ prettyPrint(this.locus.endBP - this.locus.startBP) }`)

        this.startNode = undefined
        for (const [nodeName, { assembly, length }] of Object.entries(nodes)) {

            if (undefined === this.startNode) {
                this.startNode = nodeName
            }

            const assemblySet = new Set()
            for(const item of assembly){
                assemblySet.add(tripleKey(item))
            }

            const metadata =  { assemblySet, sequence: sequences[nodeName] }
            this.metadata.set(nodeName, metadata);

        }

        // Build assembly set
        this.assemblySet = new Set()
        for (const [ key, { assemblySet }] of this.metadata) {
            for (const item of assemblySet){
                this.assemblySet.add(item)
            }
        }

        for (const assemblyKey of this.assemblySet){
            if (assemblyKey.includes('GRCh38')) {
                const {geneFeatureSource, geneRenderer} = await genomeLibrary.getGenomePayload('GRCh38')
                const container = document.querySelector('.pgb-gene-annotation-track-container')
                const annotationRenderService = new AnnotationRenderService(container, assemblyKey, geneFeatureSource, geneRenderer, this, geometryManager, raycastService)
                this.annotationRenderServiceMap.set(assemblyKey, annotationRenderService)
            }
        }

        // Build assembly walk map
        const assemblyWalks = pangenomeService.createAssemblyWalks({ mode:'auto', directionPolicy: "edgeFlow" })
        for (const key of this.assemblySet){
            const walks = assemblyWalks.find(walk => key === walk.key)
            this.assemblyWalkMap.set(key, walks)
        }

        const uniqueColors = getPerceptuallyDistinctColors(1 + this.assemblySet.size)
        const uniqueColorsRandomized = Array.from(uniqueRandomGenerator(uniqueColors, uniqueColors.length - 1));

        let i = 0;
        for (const assemblyKey of this.assemblySet) {
            this.assemblyPayload.set(assemblyKey, { color:uniqueColorsRandomized[ i ] });
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
        return [ ...metadata.assemblySet ]
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
            const assemblies = [ ...this.metadata.get(nodeName).assemblySet ]
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

        this.startNode = undefined

        this.metadata.clear()

        this.assemblyPayload.clear()

        this.nodeAssemblyStats.clear()

        this.assemblySet.clear()

        this.assemblyWalkMap.clear()

        for (const annotationRenderService of this.annotationRenderServiceMap.values()) {
            annotationRenderService.dispose()
        }
        this.annotationRenderServiceMap.clear()
    }
}

export default GenomicService;
