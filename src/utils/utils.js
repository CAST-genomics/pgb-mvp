function prettyPrint(number) {

    if (typeof number !== "number") {
        console.error(`${ number } must be a number`)
        return
    }

    const integerPart = Math.trunc(number)
    return integerPart.toLocaleString()
}

/**
 * Loads data from a URL and returns the JSON response
 * @param {string} url - The URL to fetch data from
 * @returns {Promise<Object>} A promise that resolves with the JSON data
 */
async function loadPath(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const json = await response.json();
        console.log(`Successfully loaded data from ${url}`);

        return json;
    } catch (error) {
        console.error(`Error loading ${url}:`, error);
        throw error;
    }
}

/**
 * Processes and ingests JSON data into genomic and geometry services
 * @param {Object} json - The JSON data to ingest
 * @param {Object} genomicService - Service for handling genomic data
 * @param {Object} geometryManager - Manager for handling geometry data
 */
function ingestData(json, genomicService, geometryManager) {
    if (!json || !json.node) {
        console.error('Invalid data format: missing node section')
        return
    }

    genomicService.clear()
    genomicService.createMetadata(json.node)
    genomicService.createSequences(json.sequence)

    geometryManager.createGeometry(json)
}

export { prettyPrint, loadPath, ingestData }
