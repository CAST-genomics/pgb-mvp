import { TextureLoader } from 'three'

function prettyPrint(number) {

    if (typeof number !== "number") {
        console.error(`${ number } must be a number`)
        return
    }

    const integerPart = Math.trunc(number)
    return integerPart.toLocaleString()
}

/**
 * Loads a texture asynchronously
 * @param {string} url - The URL of the texture to load
 * @param {Object} options - Optional texture loading options
 * @param {boolean} options.flipY - Whether to flip the texture vertically (default: true)
 * @param {boolean} options.generateMipmaps - Whether to generate mipmaps (default: true)
 * @returns {Promise<THREE.Texture>} A promise that resolves with the loaded texture
 */
async function loadTexture(url, options = {}) {
    const loader = new TextureLoader()
    
    return new Promise((resolve, reject) => {
        loader.load(
            url,
            (texture) => {
                // Apply default options
                texture.flipY = options.flipY !== undefined ? options.flipY : true
                texture.generateMipmaps = options.generateMipmaps !== undefined ? options.generateMipmaps : true
                
                // Apply any additional options
                Object.entries(options).forEach(([key, value]) => {
                    if (key !== 'flipY' && key !== 'generateMipmaps') {
                        texture[key] = value
                    }
                })
                
                resolve(texture)
            },
            undefined, // onProgress callback not implemented
            (error) => {
                console.error(`Error loading texture from ${url}:`, error)
                reject(error)
            }
        )
    })
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

export { prettyPrint, loadTexture, loadPath, ingestData }
