import * as THREE from 'three';

class TextureService {
    constructor() {
        this.textureLibrary = new Map()
        this.loadingPromises = new Map()
    }

    /**
     * Initialize the texture library with a list of texture paths
     * @param {Object} textureConfig - Configuration object containing texture paths and options
     * @param {Object} textureConfig.textures - Object mapping texture names to their paths
     * @param {Object} textureConfig.defaultOptions - Default options to apply to all textures
     * @returns {Promise<void>}
     */
    async initialize(textureConfig) {
        const { textures, defaultOptions = {} } = textureConfig

        const loadPromises = Object.entries(textures).map(([name, path]) =>
            this.loadTexture(name, path, defaultOptions)
        )

        try {
            await Promise.all(loadPromises)
            // console.log('Texture library initialized successfully')
        } catch (error) {
            console.error('Failed to initialize texture library:', error)
            throw error
        }
    }

    /**
     * Load a single texture and add it to the library
     * @param {string} name - Unique identifier for the texture
     * @param {string} path - Path to the texture file
     * @param {Object} options - Texture loading options
     * @returns {Promise<THREE.Texture>}
     */
    async loadTexture(name, path, options = {}) {

        // console.log('Loading texture:', name, path)

        // If texture is already loaded, return it
        if (this.textureLibrary.has(name)) {
            return this.textureLibrary.get(name)
        }

        // If texture is currently loading, return the existing promise
        if (this.loadingPromises.has(name)) {
            return this.loadingPromises.get(name)
        }

        // Create new loading promise
        const loadPromise = loadTexture(path, options)
            .then(texture => {
                this.textureLibrary.set(name, texture)
                this.loadingPromises.delete(name)
                return texture
            })
            .catch(error => {
                this.loadingPromises.delete(name)
                throw error
            })

        this.loadingPromises.set(name, loadPromise)
        return loadPromise
    }

    /**
     * Get a texture from the library
     * @param {string} name - Name of the texture to retrieve
     * @returns {THREE.Texture|undefined}
     */
    getTexture(name) {
        return this.textureLibrary.get(name)
    }

    /**
     * Check if a texture is loaded
     * @param {string} name - Name of the texture to check
     * @returns {boolean}
     */
    isTextureLoaded(name) {
        return this.textureLibrary.has(name)
    }

    /**
     * Get all loaded texture names
     * @returns {string[]}
     */
    getLoadedTextureNames() {
        return Array.from(this.textureLibrary.keys())
    }

    /**
     * Dispose of a texture and remove it from the library
     * @param {string} name - Name of the texture to dispose
     */
    disposeTexture(name) {
        const texture = this.textureLibrary.get(name)
        if (texture) {
            texture.dispose()
            this.textureLibrary.delete(name)
        }
    }

    /**
     * Dispose of all textures and clear the library
     */
    disposeAll() {
        this.textureLibrary.forEach(texture => texture.dispose())
        this.textureLibrary.clear()
        this.loadingPromises.clear()
    }
}

// Create and export a singleton instance
const textureService = new TextureService()
export default textureService

/**
 * Loads a texture asynchronously
 * @param {string} url - The URL of the texture to load
 * @param {Object} options - Optional texture loading options
 * @param {boolean} options.flipY - Whether to flip the texture vertically (default: true)
 * @param {boolean} options.generateMipmaps - Whether to generate mipmaps (default: true)
 * @returns {Promise<THREE.Texture>} A promise that resolves with the loaded texture
 */
async function loadTexture(url, options = {}) {
    const loader = new THREE.TextureLoader()

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
 * Creates a 1x256 horizontal black-to-white gradient texture as a THREE.CanvasTexture.
 * @returns {THREE.CanvasTexture} The generated gradient texture
 */
function createGradientTexture() {
    // Create gradient texture (1x256 pixels, black to white)
    const gradientCanvas = document.createElement('canvas');
    gradientCanvas.width = 256;
    gradientCanvas.height = 1;
    const ctx = gradientCanvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 256, 0);
    gradient.addColorStop(0, 'black');
    gradient.addColorStop(1, 'white');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 1);

    const gradientTexture = new THREE.CanvasTexture(gradientCanvas);
    gradientTexture.wrapS = THREE.ClampToEdgeWrapping;
    gradientTexture.wrapT = THREE.ClampToEdgeWrapping;
    return gradientTexture;
}

export { loadTexture, createGradientTexture }
