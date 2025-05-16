// Element IDs as constants to prevent typos and enable reuse
export const ELEMENT_IDS = {
    INPUT: 'pgb-locus-input',
    GO_BUTTON: 'pgb-locus-go-button',
    ERROR: 'pgb-locus-error'
};

export const template = `
    <div class="pgb-locus-input">
        <div class="input-group">
            <input type="text" 
                   class="pgb-locus-input__control form-control" 
                   id="${ELEMENT_IDS.INPUT}"
                   placeholder="Enter locus (e.g., chr8:30,000-50,000)"
                   aria-label="Genomic locus">
            <button class="pgb-locus-input__button btn btn-outline-secondary" 
                    type="button" 
                    id="${ELEMENT_IDS.GO_BUTTON}">Go</button>
        </div>
        <div class="invalid-feedback" id="${ELEMENT_IDS.ERROR}"></div>
    </div>
`;
