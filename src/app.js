import * as THREE from 'three'
import CameraManager from './cameraManager.js'
import MapControlsFactory from './mapControlsFactory.js'
import RendererFactory from './rendererFactory.js'
import eventBus from './utils/eventBus.js';
import { loadPath } from './utils/utils.js'

class App {

    constructor(container, frustumSize, raycastService, sequenceService, genomicService, geometryManager, genomeWidget, genomeLibrary, sceneManager, lookManager) {
        this.container = container

        this.renderer = RendererFactory.createRenderer(container)

        this.sequenceService = sequenceService
        this.genomicService = genomicService
        this.geometryManager = geometryManager
        this.genomeWidget = genomeWidget
        this.genomeLibrary = genomeLibrary
        this.sceneManager = sceneManager
        this.lookManager = lookManager

        // Initialize time tracking
        this.clock = new THREE.Clock()

        this.cameraManager = new CameraManager(frustumSize, container.clientWidth/container.clientHeight)
        this.mapControl = MapControlsFactory.create(this.cameraManager.camera, container)

        this.raycastService = raycastService

        sceneManager.getActiveScene().add(this.raycastService.setupVisualFeedback());

        // Setup resize handler
        window.addEventListener('resize', () => {
            const { clientWidth, clientHeight } = this.container
            this.cameraManager.windowResizeHelper(clientWidth/clientHeight)
            this.renderer.setSize(clientWidth, clientHeight)
        })
    }

    handleIntersection(intersections) {
        if (undefined === intersections || 0 === intersections.length) {
            this.clearIntersection()
            return
        }

        // Sort by distance to get the closest intersection
        intersections.sort((a, b) => a.distance - b.distance);

        const { faceIndex, pointOnLine, object } = intersections[0];

        this.renderer.domElement.style.cursor = 'none';

        const { t, nodeName, nodeLine } = this.raycastService.handleIntersection(this.geometryManager, object, pointOnLine, faceIndex);

        eventBus.publish('lineIntersection', { t, nodeName, nodeLine })
    }

    clearIntersection() {
        this.raycastService.clearIntersection()
        this.renderer.domElement.style.cursor = '';
    }

    animate() {

        if (true === this.raycastService.isEnabled) {
            const intersections = this.raycastService.intersectObjects(this.cameraManager.camera, this.geometryManager.linesGroup.children)
            this.handleIntersection(intersections)
        }

        this.sequenceService.update();

        this.mapControl.update()

        const deltaTime = this.clock.getDelta()

        const look = this.lookManager.getLook(this.sceneManager.getActiveSceneName())
        look.updateBehavior(deltaTime, this.geometryManager)

        this.renderer.render(this.sceneManager.getActiveScene(), this.cameraManager.camera)
    }

    startAnimation() {
        this.renderer.setAnimationLoop(() => this.animate())
    }

    stopAnimation() {
        this.renderer.setAnimationLoop(null)
    }

    updateViewToFitScene(scene, cameraManager, mapControl) {

        const bbox = new THREE.Box3()

        let foundObjects = 0;
        scene.traverse((object) => {

            // Handle Line2 objects (both node lines and edge lines) - check constructor name since isLine2 might not be set
            if ((object.isLine2 || object.constructor.name === 'Line2') && object.name !== 'boundingSphereHelper') {
                object.geometry.computeBoundingBox()
                const objectBox = object.geometry.boundingBox.clone()
                objectBox.applyMatrix4(object.matrixWorld)
                bbox.union(objectBox)
                foundObjects++;
            }

            // Handle Mesh objects (if any remain)
            else if (object.isMesh && object.name !== 'boundingSphereHelper') {
                object.geometry.computeBoundingBox()
                const objectBox = object.geometry.boundingBox.clone()
                objectBox.applyMatrix4(object.matrixWorld)
                bbox.union(objectBox)
                foundObjects++;
            }
        })

        // Calculate the bounding sphere from the bounding box
        const boundingSphere = new THREE.Sphere()
        bbox.getBoundingSphere(boundingSphere)

        const found = scene.getObjectByName('boundingSphereHelper')
        if (found) {
            scene.remove(found)
        }

        // const boundingSphereHelper = this.#createBoundingSphereHelper(boundingSphere)
        // this.scene.add(boundingSphereHelper)

        // Multiplier used to add padding around scene bounding sphere when framing the view
        const SCENE_VIEW_PADDING = 1.5

        // Calculate required frustum size based on the bounding sphere (with padding)
        mapControl.reset()
        const { clientWidth, clientHeight } = this.container
        cameraManager.frustumHalfSize = boundingSphere.radius * SCENE_VIEW_PADDING
        cameraManager.windowResizeHelper(clientWidth/clientHeight)

        // Position camera to frame the scene
        cameraManager.camera.position.set(0, 0, 2 * boundingSphere.radius) // Position camera at 2x the radius
        cameraManager.camera.lookAt(boundingSphere.center)
    }

    #createBoundingSphereHelper(boundingSphere) {
        const materialConfig = {
            color: 0xdddddd,
            wireframe: true,
            transparent: true,
            opacity: 0.5
        }

        const boundingSphereHelper = new THREE.Mesh(
            new THREE.SphereGeometry(boundingSphere.radius, 16, 16),
            new THREE.MeshBasicMaterial(materialConfig)
        )
        boundingSphereHelper.position.copy(boundingSphere.center)
        boundingSphereHelper.name = 'boundingSphereHelper'
        return boundingSphereHelper
    }

    async handleSearch(url) {
        this.stopAnimation()

        // Clear existing data and geometry
        this.clearCurrentData()

        let json
        try {
            json = await loadPath(url)
        } catch (error) {
            console.error(`Error loading ${url}:`, error)
            this.startAnimation()
            return
        }

        this.genomicService.clear()
        await this.genomicService.createMetadata(json.node, json.sequence, this.genomeLibrary, this.raycastService)

        const look = this.lookManager.getLook(this.sceneManager.getActiveSceneName())
        const scene = this.sceneManager.getActiveScene()

        this.geometryManager.createGeometry(json, look)
        this.geometryManager.addToScene(scene)

        this.genomeWidget.populateList()

        this.updateViewToFitScene(scene, this.cameraManager, this.mapControl)

        this.startAnimation()
    }

    /**
     * Clear current data and geometry from the active scene
     */
    clearCurrentData() {
        // Clear genomic service data
        this.genomicService.clear()

        // Clear geometry manager
        this.geometryManager.clear()

        // Clear the current scene (but keep the scene itself)
        this.sceneManager.clearScene(this.sceneManager.getActiveScene())

        // Re-add visual feedback to the cleared scene
        const scene = this.sceneManager.getActiveScene()
        scene.add(this.raycastService.setupVisualFeedback())
    }

    /**
     * Switch to a different scene
     * @param {string} sceneName - Name of the scene to switch to
     */
    switchScene(sceneName) {
        if (!this.sceneManager.hasScene(sceneName)) {
            console.error(`Scene '${sceneName}' not found`)
            return false
        }

        this.sceneManager.setActiveScene(sceneName)
        return true
    }

    /**
     * Create a new scene with the given name and look
     * @param {string} sceneName - Name for the new scene
     * @param {Object} look - The look to apply to the scene
     * @param {THREE.Color} backgroundColor - Background color for the scene
     */
    createScene(sceneName, look, backgroundColor = new THREE.Color(0xffffff)) {
        // Create the scene
        const scene = this.sceneManager.createScene(sceneName, backgroundColor)

        // Set the look for this scene
        this.lookManager.setLook(sceneName, look)

        // Add visual feedback to the new scene
        scene.add(this.raycastService.setupVisualFeedback())

        return scene
    }
}

export default App
