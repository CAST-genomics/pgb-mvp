import { template, ELEMENT_IDS } from './locusInput.template.js';
import { prettyPrint } from './utils/utils.js';
import {searchFeatures} from "./igvCore/search.js"
import {defaultGenome} from "./main.js"

// Regular expressions for parsing genomic loci
const LOCUS_PATTERN = { REGION: /^(chr\d+):([0-9,]+)-([0-9,]+)$/i };

const pangenomeURLTemplate = 'https://3.145.184.140:8443/json?chrom=_CHR_&start=_START_&end=_END_&graphtype=minigraph&debug_small_graphs=false&minnodelen=5&nodeseglen=20&edgelen=5&nodelenpermb=1000'

class LocusInput {
    constructor(container, sceneManager) {
        this.container = container;
        this.sceneManager = sceneManager;
        this.render();
        this.setupEventListeners();
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
        const handleLocusUpdate = async () => {
            const candidateLocus = this.inputElement.value.trim()
            const locus = this.processLocusInput(candidateLocus);
            if (locus) {
                await this.ingestLocus(locus.chr, locus.startBP, locus.endBP);
            } else {
                const result = await searchFeatures({ genome: defaultGenome }, candidateLocus)
                if (result) {
                    const { chr, start, end, name } = result
                    await this.ingestLocus(chr, start, end);
                } else {
                    this.showError(`Invalid locus format value: ${candidateLocus}`);
                }
            }
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
            this.showError('Please enter a genomic locus, e.g. chr1:25240000-25460000');
            return null;
        }

        // TODO: Implement gene name search
        // TODO: Use defaultGenome declared in main.js
        // let { chr, start, end, name } = await searchFeatures({ genome }, 'brca2')

        const result = value.match(LOCUS_PATTERN.REGION);
        if (result) {
            let [_, chr, startBP, endBP] = result;
            startBP = this.parsePosition(startBP);
            endBP = this.parsePosition(endBP);

            if (startBP === null || endBP === null) {
                this.showError(`Invalid base pair position format ${value}`);
                return null;
            }

            if (startBP >= endBP) {
                this.showError(`Start position must be less than end position ${value}`);
                return null;
            }

            return { chr, startBP, endBP };
        } else {
            // this.showError(`Invalid locus format value: ${value}`);
            return null;
        }
    }

    parsePosition(pos) {
        try {
            // Remove commas and convert to number
            return parseInt(pos.replace(/,/g, ''), 10);
        } catch {
            console.error(`Error parsing position: ${pos}`);
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
        console.error(message)
        this.inputElement.classList.add('is-invalid');
        this.errorDiv.textContent = message;
        this.errorDiv.style.display = 'block';
    }

    async ingestLocus(chr, startBP, endBP) {
        const path = pangenomeURLTemplate.replace('_CHR_', chr).replace('_START_', startBP).replace('_END_', endBP);
        await this.sceneManager.handleSearch(path);
    }
}

export default LocusInput;
