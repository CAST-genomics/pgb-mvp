class GenomicService {
    constructor() {
        this.sequences = new Map();
        this.metadata = new Map();
    }

    #createSequences(sequences) {
        for (const [nodeName, sequenceString] of Object.entries(sequences)) {
            this.sequences.set(nodeName, sequenceString);
        }
    }

    #createMetadata(nodes) {
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
    }

    createSequences(sequences) {
        this.#createSequences(sequences);
    }

    createMetadata(nodes) {
        this.#createMetadata(nodes);
    }

    getSequence(nodeName) {
        return this.sequences.get(nodeName);
    }

    getMetadata(nodeName) {
        return this.metadata.get(nodeName);
    }

    clear() {
        this.sequences.clear();
        this.metadata.clear();
    }
}

export default GenomicService; 