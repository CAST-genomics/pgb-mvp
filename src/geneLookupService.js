class GeneLookupService {
    constructor(genomeAssembly = 'GRCh38') {
        this.genomeAssembly = genomeAssembly;
        this.baseUrl = this.getEnsemblBaseUrl(genomeAssembly);
        this.cache = new Map();
    }

    getEnsemblBaseUrl(assembly) {
        // Map assembly versions to their corresponding Ensembl REST API base URLs
        const assemblyUrls = {
            'GRCh38': 'https://rest.ensembl.org',
            'GRCh37': 'https://grch37.rest.ensembl.org'
        };
        return assemblyUrls[assembly] || assemblyUrls['GRCh38'];
    }

    async lookupGene(geneName) {
        // Check cache first
        const cacheKey = `${geneName}_${this.genomeAssembly}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            // First, search for the gene to get its ID
            const path = `${this.baseUrl}/lookup/symbol/homo_sapiens/${geneName}?expand=1`;
            const searchResponse = await fetch(
                path,
                { headers: { 'Content-Type': 'application/json' } }
            );
            
            if (!searchResponse.ok) {
                throw new Error(`Gene ${geneName} not found`);
            }

            const geneData = await searchResponse.json();
            
            // Get the gene's location, handling strand orientation
            let start = geneData.start;
            let end = geneData.end;
            
            // If gene is on reverse strand, swap start and end
            if (geneData.strand === -1) {
                [start, end] = [end, start];
            }
            
            const result = {
                name: geneName,
                chr: `chr${geneData.seq_region_name}`,
                start,
                end,
                strand: geneData.strand,
                description: geneData.description || geneName,
                assembly: this.genomeAssembly
            };

            // Cache the result with assembly-specific key
            this.cache.set(cacheKey, result);
            
            return result;
        } catch (error) {
            console.error('Error looking up gene:', error);
            throw error;
        }
    }

    // Method to change genome assembly
    setGenomeAssembly(assembly) {
        this.genomeAssembly = assembly;
        this.baseUrl = this.getEnsemblBaseUrl(assembly);
        this.cache.clear(); // Clear cache when assembly changes
    }
}

export default GeneLookupService; 