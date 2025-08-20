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
    }

    async createMetadata(json, pangenomeService, genomeLibrary, raycastService) {

        const { locus:locusString, node:nodes, edge:edges, sequence:sequences } = json

        // TODO: For now we will use a single graph spanning locus in conjunction
        //       with the annotation renderer
        this.locus = LocusInput.parseLocusString(locusString)

        // Internal to the app we use 0-indexed
        this.locus.startBP -= 1
        console.log(`locus length ${ prettyPrint(this.locus.endBP - this.locus.startBP) }`)

        const renderLibrary = new Map()
        const locusExtentMap = new Map()

        for (const [nodeName, { assembly, length }] of Object.entries(nodes)) {

            const assemblySet = new Set()
            for(const item of assembly){
                assemblySet.add(tripleKey(item))
            }

            const metadata =  { assemblySet, sequence: sequences[nodeName] }
            this.metadata.set(nodeName, metadata);

        }

        this.assemblySet = new Set()
        for (const [ key, { assemblySet }] of this.metadata) {
            for (const item of assemblySet){
                this.assemblySet.add(item)
            }
        }

        const assemblyWalks = pangenomeService.createAssemblyWalks({ mode:'auto' })
        for (const key of this.assemblySet){
            const walks = assemblyWalks.find(walk => key === walk.key)
            this.assemblyWalkMap.set(key, walks)
        }

        const uniqueColors = getPerceptuallyDistinctColors(1 + this.assemblySet.size)
        const uniqueColorsRandomized = Array.from(uniqueRandomGenerator(uniqueColors, uniqueColors.length - 1));

        let i = 0;
        for (const tripleKey of this.assemblySet) {
            // const annotationRenderService = renderLibrary.get(assembly);
            // const locus = locusExtentMap.get(assembly);
            this.assemblyPayload.set(tripleKey, { color:uniqueColorsRandomized[ i ], /*annotationRenderService, locus*/ });
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
        this.metadata.clear()

        for (const {annotationRenderService} of this.assemblyPayload.values()) {

            if (annotationRenderService) {
                annotationRenderService.dispose();
            }
        }

        this.assemblyPayload.clear()

        this.nodeAssemblyStats.clear()

        this.assemblySet.clear()

        this.assemblyWalkMap.clear()
    }
}

export default GenomicService;
