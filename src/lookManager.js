import Look from './look.js';

/**
 * Central registry for all Looks across multiple scenes in the MRT system.
 * Each scene has exactly one Look, identified by scene name.
 */
class LookManager {
    constructor() {
        // Map of scene names to their associated Looks
        this.looks = new Map();
    }

    /**
     * Register a Look for a specific scene
     * @param {string} sceneName - The name of the scene
     * @param {Look} look - The Look instance for this scene
     */
    setLook(sceneName, look) {
        if (!(look instanceof Look)) {
            throw new Error('Look must be an instance of Look class');
        }

        // Dispose of existing look if it exists
        if (this.looks.has(sceneName)) {
            this.looks.get(sceneName).dispose();
        }

        this.looks.set(sceneName, look);
    }

    /**
     * Get the Look for a specific scene
     * @param {string} sceneName - The name of the scene
     * @returns {Look|null} The Look instance or null if not found
     */
    getLook(sceneName) {
        return this.looks.get(sceneName) || null;
    }

    /**
     * Check if a scene has a Look registered
     * @param {string} sceneName - The name of the scene
     * @returns {boolean} True if the scene has a Look
     */
    hasLook(sceneName) {
        return this.looks.has(sceneName);
    }

    /**
     * Create a mesh using the Look for a specific scene
     * @param {string} sceneName - The name of the scene
     * @param {THREE.BufferGeometry} geometry - The geometry to create mesh from
     * @param {Object} context - Context data for mesh creation
     * @returns {THREE.Object3D} The created mesh
     */
    createMesh(sceneName, geometry, context) {
        const look = this.getLook(sceneName);
        if (!look) {
            throw new Error(`No look registered for scene: ${sceneName}`);
        }

        return look.createMesh(geometry, context);
    }

    /**
     * Update animation state for a specific scene
     * @param {string} sceneName - The name of the scene
     * @param {number} deltaTime - Time delta for animation
     */
    updateAnimation(sceneName, deltaTime) {
        const look = this.getLook(sceneName);
        if (look) {
            look.updateAnimation(deltaTime);
        }
    }

    /**
     * Update animation state for all scenes
     * @param {number} deltaTime - Time delta for animation
     */
    updateAllAnimations(deltaTime) {
        this.looks.forEach(look => {
            look.updateAnimation(deltaTime);
        });
    }

    /**
     * Enable/disable animation for a specific scene
     * @param {string} sceneName - The name of the scene
     * @param {boolean} enabled - Whether animation should be enabled
     */
    setAnimationEnabled(sceneName, enabled) {
        const look = this.getLook(sceneName);
        if (look) {
            look.setAnimationEnabled(enabled);
        }
    }

    /**
     * Check if animation is enabled for a specific scene
     * @param {string} sceneName - The name of the scene
     * @returns {boolean} True if animation is enabled
     */
    isAnimationEnabled(sceneName) {
        const look = this.getLook(sceneName);
        return look ? look.isAnimationEnabled() : false;
    }

    /**
     * Get all registered scene names
     * @returns {string[]} Array of scene names
     */
    getSceneNames() {
        return Array.from(this.looks.keys());
    }

    /**
     * Remove a Look for a specific scene
     * @param {string} sceneName - The name of the scene
     */
    removeLook(sceneName) {
        const look = this.looks.get(sceneName);
        if (look) {
            look.dispose();
            this.looks.delete(sceneName);
        }
    }

    /**
     * Dispose of all Looks and clear the registry
     */
    dispose() {
        this.looks.forEach(look => {
            look.dispose();
        });
        this.looks.clear();
    }
}

export default LookManager;

