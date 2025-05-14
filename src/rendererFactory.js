import * as THREE from 'three'

class RendererFactory {
    static create(container) {
        // Create a canvas element
        const canvas = document.createElement('canvas')
        
        // Try to create WebGL2 renderer with explicit context parameters
        let renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            powerPreference: 'high-performance',
            canvas,
            context: canvas.getContext('webgl2', {
                alpha: true,          // Enable alpha channel for transparency
                antialias: true,      // Enable antialiasing
                depth: true,          // Enable depth buffer
                stencil: true,        // Enable stencil buffer
                powerPreference: 'high-performance'  // Request high-performance GPU
            })
        })

        // Check if WebGL2 is available
        if (!renderer.getContext().isWebGL2) {
            console.warn('WebGL2 not available, falling back to WebGL1')
            // Create a new renderer with WebGL1
            renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', canvas })
        } else {
            console.warn('Using WebGL2 renderer')
        }

        // Configure renderer
        renderer.setPixelRatio(window.devicePixelRatio)
        renderer.setSize(container.clientWidth, container.clientHeight)
        
        // Enable shadow maps if needed
        renderer.shadowMap.enabled = true
        renderer.shadowMap.type = THREE.PCFSoftShadowMap

        // Add the canvas to the container
        container.appendChild(renderer.domElement)

        return renderer
    }
}

export default RendererFactory 