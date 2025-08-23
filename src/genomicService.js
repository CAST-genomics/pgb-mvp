import AnnotationRenderService from "./annotationRenderService.js"
import {app, locusInput} from "./main.js"
import LocusInput from "./locusInput.js"
import {getPerceptuallyDistinctColors} from "./utils/hsluv-utils.js"
import {colors32Distinct, colors64Distinct} from "./utils/color.js"
import {prettyPrint, uniqueRandomGenerator} from "./utils/utils.js"
import PangenomeService from "./pangenomeService.js"

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

        const { locus:locusString, node:nodes, sequence:sequences } = json

        this.locus = LocusInput.parseLocusString(locusString)

        // Internal to the app we use 0-indexed
        this.locus.startBP -= 1
        console.log(`locus length ${ prettyPrint(this.locus.endBP - this.locus.startBP) }`)

        this.startNode = undefined
        for (const [nodeName, { assembly }] of Object.entries(nodes)) {

            if (undefined === this.startNode) {
                this.startNode = nodeName
            }

            const assemblySet = new Set()
            for(const item of assembly){
                assemblySet.add(GenomicService.tripleKey(item))
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


        // Build assembly walk map
        const assemblyWalks = pangenomeService.createAssemblyWalks({ mode:'auto', directionPolicy: "edgeFlow" })
        for (const key of this.assemblySet){
            const walks = assemblyWalks.find(walk => key === walk.key)
            this.assemblyWalkMap.set(key, walks)
        }

        for (const key of this.assemblySet){

            const [ assembly, haplotype, sequence_id ] = key.split('#')

            const walk = this.assemblyWalkMap.get(key)
            const longestPath = walk.paths.reduce((best, p) => (p.bpLen > (best?.bpLen||0) ? p : best), null)

            const spineWalk = { key: walk.key, paths: [ longestPath ]}

            const config =
                {
                    // discovery toggles
                    includeAdjacent: true,           // show pills (adjacent-anchor insertions)
                    includeUpstream: false,           // ignore mirror (R,L) events
                    allowMidSpineReentry: true,      // allow detours to touch mid-spine nodes → richer braids
                    includeDangling: true,           // show branches that don't rejoin in-window
                    includeOffSpineComponents: true, // report islands that never touch the spine (context)

                    // path sampling & safety rails
                    maxPathsPerEvent: 5,             // 3–5 for UI; up to 8+ for analysis
                    maxRegionNodes: 5000,
                    maxRegionEdges: 8000,

                    // optional x-origin in bp (default 0)
                    locusStartBp: this.locus.startBP
                };

            const { spine } = app.pangenomeService.assessGraphFeatures(spineWalk, config)

            const { nodes } = spine

            const { chr } = this.locus
            const bpStart = nodes[0].bpStart
            const bpEnd = nodes[ nodes.length - 1].bpEnd

            const result = await genomeLibrary.getGenomePayload(assembly)

            if (undefined === result) {

                const sequenceStripAccessor = PangenomeService.buildSequenceStripAccessor(nodes.map(({id}) =>id), sequences)
                const sequence = { sequenceStripAccessor, nodes, chr, bpStart, bpEnd }
                this.annotationRenderServiceMap.set(key, sequence)
            } else {

                const {geneFeatureSource, geneRenderer} = await genomeLibrary.getGenomePayload('GRCh38')
                const geneAnnotation = { geneFeatureSource, geneRenderer, nodes, chr, bpStart, bpEnd }
                this.annotationRenderServiceMap.set(key, geneAnnotation)
            }
        }

        const uniqueColors = getPerceptuallyDistinctColors(1 + this.assemblySet.size)
        const uniqueColorsRandomized = Array.from(uniqueRandomGenerator(uniqueColors, uniqueColors.length - 1));

        let i = 0;
        for (const assemblyKey of this.assemblySet) {
            this.assemblyPayload.set(assemblyKey, { color:uniqueColorsRandomized[ i ] });
            i++;
        }

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

        this.annotationRenderServiceMap.clear()
    }

    static tripleKey(a) {
        return `${a.assembly_name}#${a.haplotype}#${a.sequence_id}`
    }

}

export default GenomicService;
