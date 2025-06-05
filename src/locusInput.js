import { template, ELEMENT_IDS } from './locusInput.template.js';
import { prettyPrint } from './utils/utils.js';

// Regular expressions for parsing genomic loci
const LOCUS_PATTERN = { REGION: /^(chr\d+):([0-9,]+)-([0-9,]+)$/i };

const pangenomeURLTemplate = 'https://3.145.184.140:8443/json?chrom=_CHR_&start=_START_&end=_END_&graphtype=minigraph&debug_small_graphs=false&minnodelen=5&nodeseglen=20&edgelen=5&nodelenpermb=1000'

class LocusInput {
    constructor(container, sceneManager) {
        this.container = container;
        this.sceneManager = sceneManager;
        this.render();
        this.setupEventListeners();

        // Check for locus parameter in URL
        const urlLocus = this.getUrlParameter('locus');
        if (urlLocus) {
            this.processLocusInput(urlLocus);
        } else {
            // Default to chr1:25240000-25460000
            this.processLocusInput("chr1:25240000-25460000");
            this.inputElement.value = 'chr1:25240000-25460000';
        }
    }

    getUrlParameter(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
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

    processLocusInput(value) {
        // Reset error state
        this.inputElement.classList.remove('is-invalid');
        this.errorDiv.style.display = 'none';

        if (!value) {
            this.showError('Please enter a genomic locus');
            return;
        }

        const result = value.match(LOCUS_PATTERN.REGION);
        if (result) {
            let [_, chr, startBP, endBP] = result;
            startBP = this.parsePosition(startBP);
            endBP = this.parsePosition(endBP);

            if (startBP === null || endBP === null) {
                this.showError(`Invalid base pair position format ${value}`);
                return;
            }

            if (startBP >= endBP) {
                this.showError(`Start position must be less than end position ${value}`);
                return;
            }

            this.ingestLocus(chr, startBP, endBP);
            return;
        }

        this.showError('Invalid locus format');
    }

    parsePosition(pos) {
        try {
            // Remove commas and convert to number
            return parseInt(pos.replace(/,/g, ''), 10);
        } catch {
            return null;
        }
    }

    parseLocusString(locusString) {
        const match = locusString.match(LOCUS_PATTERN.REGION);
        if (match) {
            return { chr: match[1], startBP: this.parsePosition(match[2]), endBP: this.parsePosition(match[3]) };
        }
        return null;
    }

    prettyPrintLocus(locus) {
        const { chr, startBP, endBP } = locus;
        return `${chr}:${prettyPrint(startBP)}-${prettyPrint(endBP)}`;
    }

    showError(message) {
        this.inputElement.classList.add('is-invalid');
        this.errorDiv.textContent = message;
        this.errorDiv.style.display = 'block';
    }

    async ingestLocus(chr, startBP, endBP) {
        const path = pangenomeURLTemplate.replace('_CHR_', chr).replace('_START_', startBP).replace('_END_', endBP);
        // console.log(`Pangenome URL: ${path}`);
        await this.sceneManager.handleSearch(path);
    }
}

export default LocusInput;
