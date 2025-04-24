import * as THREE from 'three'
import CameraManager from './cameraManager.js'
import CameraRig from "./cameraRig.js"
import MapControlsFactory from './mapControlsFactory.js'
import RendererFactory from './rendererFactory.js'

class SceneManager {

    // Multiplier used to add padding around scene bounding sphere when framing the view
    static SCENE_VIEW_PADDING = 1.0

    constructor(container, backgroundColor, frustumSize) {
        this.container = container
        this.scene = new THREE.Scene()
        this.scene.background = backgroundColor
        this.initialFrustumSize = frustumSize
        
        // Initialize renderer
        this.renderer = RendererFactory.create(container)
        
        // Initialize camera system
        const cameraManager = new CameraManager(frustumSize, container.clientWidth/container.clientHeight)
        const mapControl = MapControlsFactory.create(cameraManager.camera, container)
        this.cameraRig = new CameraRig(cameraManager, mapControl)
        this.scene.add(this.cameraRig.camera)
        
        // Setup resize handler
        window.addEventListener('resize', () => this.handleResize())
    }
    
    addToScene(object) {
        this.scene.add(object)
    }
    
    handleResize() {
        
        // Recalculate the frustum size based on current scene bounds
        const bbox = new THREE.Box3()
        this.scene.traverse((object) => {
            if (object.isMesh && object.name !== 'boundingSphereHelper') {
                object.geometry.computeBoundingBox()
                const objectBox = object.geometry.boundingBox.clone()
                objectBox.applyMatrix4(object.matrixWorld)
                bbox.union(objectBox)
            }
        })

        const boundingSphere = new THREE.Sphere()
        bbox.getBoundingSphere(boundingSphere)
        
        // Update camera frustum with new dimensions
        const { clientWidth, clientHeight } = this.container
        this.cameraRig.cameraManager.windowResizeHelper(2 * boundingSphere.radius * SceneManager.SCENE_VIEW_PADDING, clientWidth/clientHeight)
        
        this.renderer.setSize(clientWidth, clientHeight)
    }
    
    animate() {
        this.cameraRig.update()
        this.renderer.render(this.scene, this.cameraRig.camera)
    }
    
    startAnimation() {
        this.renderer.setAnimationLoop(() => this.animate())
    }

    updateViewToFitScene() {
        // Create a bounding box that encompasses all objects in the scene
        const bbox = new THREE.Box3()
        this.scene.traverse((object) => {
            if (object.isMesh && object.name !== 'boundingSphereHelper') {
                object.geometry.computeBoundingBox()
                const objectBox = object.geometry.boundingBox.clone()
                objectBox.applyMatrix4(object.matrixWorld)
                bbox.union(objectBox)
            }
        })

        // Calculate the bounding sphere from the bounding box
        const boundingSphere = new THREE.Sphere()
        bbox.getBoundingSphere(boundingSphere)

        // Remove existing bounding sphere helper if it exists
        const found = this.scene.getObjectByName('boundingSphereHelper')
        if (found) {
            this.scene.remove(found)
        }

        // Create and add bounding sphere helper
        const materialConfig = 
        {
            color: 0xdddddd,
            wireframe: true,
            transparent: true,
            opacity: 0.5
        }

        const boundingSphereHelper = new THREE.Mesh(new THREE.SphereGeometry(boundingSphere.radius, 16, 16), new THREE.MeshBasicMaterial(materialConfig))
        boundingSphereHelper.position.copy(boundingSphere.center)
        boundingSphereHelper.name = 'boundingSphereHelper'
        this.scene.add(boundingSphereHelper)

        // Calculate required frustum size based on the bounding sphere (with padding)
        const { clientWidth, clientHeight } = this.container
        this.cameraRig.cameraManager.windowResizeHelper(2 * boundingSphere.radius * SceneManager.SCENE_VIEW_PADDING, clientWidth/clientHeight)

        // Position camera to frame the scene
        this.cameraRig.camera.position.set(0, 0, 2 * boundingSphere.radius) // Position camera at 2x the radius
        this.cameraRig.camera.lookAt(boundingSphere.center)
    }
}

export default SceneManager 