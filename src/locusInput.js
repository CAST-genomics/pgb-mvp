import { template, ELEMENT_IDS } from './locusInput.template.js';
import { prettyPrint } from './utils/utils.js';
import {getChromosomeLength} from "./utils/genomicUtils.js"

// Regular expressions for parsing genomic loci
const LOCUS_PATTERNS = {
    // Matches "chr5" or "5"
    CHROMOSOME_ONLY: /^(?:chr)?(\d{1,2}|[XY])$/i,

    // Matches "chr12:50,464,921-53,983,987" or "12:50,464,921-53,983,987"
    REGION: /^(?:chr)?(\d{1,2}|[XY]):([0-9,]+)-([0-9,]+)$/i
};

const DEPRICATED_pangenomeURLTemplate = 'https://3.145.184.140:8440/json?chrom=_CHR_&start=_START_&end=_END_&graphtype=minigraph&exact_overlap=true&debug_small_graphs=false&minnodelen=5&nodeseglen=20&edgelen=5&nodelenpermb=1000'

const pangenomeURLTemplate = 'https://3.145.184.140:8440/json?chrom=_CHR_&start=_START_&end=_END_&graphtype=minigraph&debug_small_graphs=false&minnodelen=5&nodeseglen=20&edgelen=5&nodelenpermb=1000'

class LocusInput {
    constructor(container, sceneManager) {
        this.container = container;
        this.sceneManager = sceneManager;
        this.render();
        this.setupEventListeners();
    }

    render() {
        this.container.innerHTML = template;
        this.inputElement = this.container.querySelector(`#${ELEMENT_IDS.INPUT}`);
        this.goButton = this.container.querySelector(`#${ELEMENT_IDS.GO_BUTTON}`);
        this.errorDiv = this.container.querySelector(`#${ELEMENT_IDS.ERROR}`);
    }

    setupEventListeners() {

        const handleLocusUpdate = () => {
            this.processLocusInput(this.inputElement.value.trim())
        };

        this.inputElement.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleLocusUpdate();
            }
        });

        this.goButton.addEventListener('click', handleLocusUpdate);

    }

    handleLocusChange({ chr, startBP, endBP }) {
        // If only chromosome is provided, show entire chromosome
        if (!startBP || !endBP) {
            const chrLength = getChromosomeLength(chr);
            this.ingestLocus(chr, 0, chrLength);
        } else {
            this.ingestLocus(chr, startBP, endBP);
        }
    }

    processLocusInput(value) {
        // Reset error state
        this.inputElement.classList.remove('is-invalid');
        this.errorDiv.style.display = 'none';

        if (!value) {
            this.showError('Please enter a genomic locus');
            return;
        }

        // Try chromosome-only pattern first
        let match = value.match(LOCUS_PATTERNS.CHROMOSOME_ONLY);
        if (match) {
            const chr = this.formatChromosome(match[1]);
            this.handleLocusChange({ chr });
            return;
        }

        // Try region pattern
        match = value.match(LOCUS_PATTERNS.REGION);
        if (match) {
            const chr = this.formatChromosome(match[1]);
            const startBP = this.parsePosition(match[2]);
            const endBP = this.parsePosition(match[3]);

            if (startBP === null || endBP === null) {
                this.showError('Invalid base pair position format');
                return;
            }

            if (startBP >= endBP) {
                this.showError('Start position must be less than end position');
                return;
            }

            this.handleLocusChange({ chr, startBP, endBP });
            return;
        }

        this.showError('Invalid locus format');
    }

    formatChromosome(chr) {
        return `chr${chr.toUpperCase()}`;
    }

    parsePosition(pos) {
        try {
            // Remove commas and convert to number
            return parseInt(pos.replace(/,/g, ''), 10);
        } catch {
            return null;
        }
    }

    showError(message) {
        this.inputElement.classList.add('is-invalid');
        this.errorDiv.textContent = message;
        this.errorDiv.style.display = 'block';
    }

    async ingestLocus(chr, startBP, endBP) {
        const path = pangenomeURLTemplate.replace('_CHR_', chr).replace('_START_', startBP).replace('_END_', endBP);
        console.log(`Pangenome URL: ${path}`);
        await this.sceneManager.handleSearch(path);
    }
}

export default LocusInput;
