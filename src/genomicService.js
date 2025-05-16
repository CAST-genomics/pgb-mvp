import {generateUniqueColors} from "./utils/color.js"

class GenomicService {
    constructor() {
        this.sequences = new Map();
        this.metadata = new Map();
        this.allNodeNames = new Set();
        this.assemblySet = new Set();
        this.assemblyColors = new Map();
    }

    createSequences(sequences) {
        for (const [nodeName, sequenceString] of Object.entries(sequences)) {
            this.sequences.set(nodeName, sequenceString);
        }

        console.log(`GenomicService: Created ${this.sequences.size} sequences`);
    }

    createMetadata(nodes) {
        for (const [nodeName, nodeData] of Object.entries(nodes)) {
            const { length: bpLength, assembly, range: genomicRange } = nodeData;
            let metadata;
            if (typeof genomicRange === 'string' && genomicRange.trim().length > 0) {
                metadata = { nodeName, bpLength, assembly, genomicRange };
            } else {
                metadata = { nodeName, bpLength, assembly };
            }
            this.metadata.set(nodeName, metadata);
            this.assemblySet.add(assembly);
            this.allNodeNames.add(nodeName);
        }

        const uniqueColors = generateUniqueColors(this.assemblySet.size, { minSaturation: 60 })

        let i = 0;
        for (const assembly of this.assemblySet) {
            this.assemblyColors.set(assembly, uniqueColors[i]);
            i++;
        }

        console.log(`GenomicService: Created ${this.assemblyColors.size} assembly colors`);

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
        this.sequences.clear();
        this.metadata.clear();
        this.allNodeNames.clear();
        this.assemblySet.clear();
        this.assemblyColors.clear();
    }
}

export default GenomicService;
