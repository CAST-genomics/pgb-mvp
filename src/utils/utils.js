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

export { prettyPrint, loadTexture }
