import {generateUniqueColors} from "./utils/color.js"

class GenomicService {
    constructor() {
        this.sequences = new Map();
        this.metadata = new Map();
        this.assemblyColors = new Map();
    }

    createSequences(sequences) {
        for (const [nodeName, sequenceString] of Object.entries(sequences)) {
            this.sequences.set(nodeName, sequenceString);
        }
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
            
        }

        const uniqueAssemblies = [...new Set([...this.metadata.values()].map(item => item.assembly))];
        const uniqueColors = generateUniqueColors(uniqueAssemblies.length, { minSaturation: 60 })
        
        let i = 0;
        for (const assembly of uniqueAssemblies) {
            this.assemblyColors.set(assembly, uniqueColors[i]);
            i++;
        }

    }

    getSequence(nodeName) {
        return this.sequences.get(nodeName);
    }

    getMetadata(nodeName) {
        return this.metadata.get(nodeName);
    }

    getAssemblyColor(nodeName) {
        const metadata = this.metadata.get(nodeName);
        if (!metadata) {
            console.error(`GenomicService: Metadata not found for node: ${nodeName}`);
            return null;
        }
        return this.assemblyColors.get(metadata.assembly);
    }

    getAllAssemblyColors() {
        const colors = [...this.assemblyColors.values()];
        return colors;
    }

    getAllAssemblyNames() {
        const names = [...this.assemblyColors.keys()];
        return names;
    }

    clear() {
        this.sequences.clear();
        this.metadata.clear();
        this.assemblyColors.clear();
    }
}

export default GenomicService;
