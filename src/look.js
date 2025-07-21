/**
 * Base Look class that provides generic material and behavior management.
 * Subclasses implement specific mesh factory methods for their domain.
 */
class Look {
    constructor(name, config) {
        this.name = name;
        this.material = config.material;
        this.behaviors = config.behaviors || {};
        this.zOffset = config.zOffset || 0;

        // Animation state - independent per Look instance
        this.animationState = {
            uvOffset: 0,
            enabled: config.behaviors?.animation?.enabled ?? false
        };

        // Emphasis state - tracks which objects are emphasized/deemphasized
        this.emphasisStates = new Map();
    }

    /**
     * Update animation state (called each frame)
     */
    updateAnimation(deltaTime) {
        if (!this.animationState.enabled) return;

        const behavior = this.behaviors.animation;
        if (behavior?.type === 'uvOffset') {
            const speed = behavior.speed * deltaTime;
            this.animationState.uvOffset = (this.animationState.uvOffset - speed) % 1.0;
        }
    }

    /**
     * Get current Z-offset for an object based on its emphasis state
     */
    getZOffset(objectId) {
        const emphasisBehavior = this.behaviors.emphasis;
        if (!emphasisBehavior) return this.zOffset;

        const state = this.emphasisStates.get(objectId) || 'normal';
        switch (state) {
            case 'deemphasized':
                return emphasisBehavior.deemphasizedZ;
            case 'emphasized':
                return emphasisBehavior.emphasizedZ;
            case 'normal':
            default:
                return emphasisBehavior.normalZ;
        }
    }

    /**
     * Set emphasis state for an object
     */
    setEmphasisState(nodeName, state) {
        this.emphasisStates.set(nodeName, state);
    }

    /**
     * Get emphasis state for an object
     */
    getEmphasisState(objectId) {
        return this.emphasisStates.get(objectId) || 'normal';
    }



    /**
     * Enable/disable animation
     */
    setAnimationEnabled(enabled) {
        this.animationState.enabled = enabled;
    }

    /**
     * Check if animation is enabled
     */
    isAnimationEnabled() {
        return this.animationState.enabled;
    }

    /**
     * Abstract method - subclasses must implement
     * Create a mesh from geometry and context data
     */
    createMesh(geometry, context) {
        throw new Error('createMesh() must be implemented by subclass');
    }

    /**
     * Abstract method - subclasses must implement
     * Get material for an object based on context
     */
    getMaterial(context) {
        throw new Error('getMaterial() must be implemented by subclass');
    }

    /**
     * Dispose of the look and its material
     */
    dispose() {
        if (this.material) {
            this.material.dispose();
        }
        this.emphasisStates.clear();
    }
}

export default Look;
