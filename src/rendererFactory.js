import * as THREE from 'three'

class RendererFactory {
    static createRenderer(container) {

        const canvas = document.createElement('canvas')

        const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', canvas })

        renderer.setPixelRatio(window.devicePixelRatio)

        const { clientWidth, clientHeight } = container
        renderer.setSize(clientWidth, clientHeight)

        container.appendChild(renderer.domElement)

        return renderer
    }

    static createRenderTarget(){

    }
}

export default RendererFactory
