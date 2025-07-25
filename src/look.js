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
    }

    /**
     * Update animation state (called each frame)
     * Base implementation does nothing - subclasses override for specific animation
     */
    updateBehavior(deltaTime, geometryManager) {
        // Base class has no animation by default
        // Subclasses override this method for specific animation behaviors
    }

    /**
     * Abstract method - subclasses must implement
     * Create a mesh from geometry and context data
     */
    createMesh(geometry, context) {
        throw new Error('createMesh() must be implemented by subclass');
    }

    dispose() {
        if (this.material) {
            this.material.dispose();
        }
    }
}

export default Look;
