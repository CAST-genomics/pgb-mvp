import Look from './look.js';

/**
 * Manages Looks for a specific scene.
 * Each scene will have one LookManager with one Look.
 */
class LookManager {
    constructor(sceneName) {
        this.sceneName = sceneName;
        this.currentLook = null;
    }

    /**
     * Set the current look for this scene
     */
    setLook(look) {
        if (!(look instanceof Look)) {
            throw new Error('Look must be an instance of Look class');
        }

        if (this.currentLook) {
            this.currentLook.dispose();
        }
        this.currentLook = look;
    }

    /**
     * Get the current look
     */
    getLook() {
        return this.currentLook;
    }

    /**
     * Create a mesh using the current look's factory method
     */
    createMesh(geometry, context) {
        if (!this.currentLook) {
            throw new Error('No look set for this scene');
        }

        return this.currentLook.createMesh(geometry, context);
    }

    /**
     * Update animation state
     */
    updateAnimation(deltaTime) {
        if (this.currentLook) {
            this.currentLook.updateAnimation(deltaTime);
        }
    }

    /**
     * Set emphasis state (delegates to current look)
     */
    setEmphasisState(nodeName, state) {
        if (this.currentLook) {
            this.currentLook.setEmphasisState(nodeName, state);
        }
    }

    /**
     * Get emphasis state (delegates to current look)
     */
    getEmphasisState(objectId) {
        return this.currentLook ? this.currentLook.getEmphasisState(objectId) : 'normal';
    }

    /**
     * Enable/disable animation
     */
    setAnimationEnabled(enabled) {
        if (this.currentLook) {
            this.currentLook.setAnimationEnabled(enabled);
        }
    }

    /**
     * Check if animation is enabled
     */
    isAnimationEnabled() {
        return this.currentLook ? this.currentLook.isAnimationEnabled() : false;
    }

    /**
     * Dispose of the look manager
     */
    dispose() {
        if (this.currentLook) {
            this.currentLook.dispose();
        }
    }
}

export default LookManager;
