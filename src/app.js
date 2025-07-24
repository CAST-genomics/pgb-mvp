import * as THREE from 'three'
import CameraManager from './cameraManager.js'
import MapControlsFactory from './mapControlsFactory.js'
import RendererFactory from './rendererFactory.js'
import eventBus from './utils/eventBus.js';
import { loadPath } from './utils/utils.js'

class App {

    constructor(container, backgroundColor, frustumSize, raycastService, sequenceService, genomicService, geometryManager, genomeWidget, genomeLibrary, lookManager) {
        this.container = container

        this.scene = new THREE.Scene()
        this.scene.background = backgroundColor
        this.renderer = RendererFactory.create(container)

        this.sequenceService = sequenceService
        this.genomicService = genomicService
        this.geometryManager = geometryManager
        this.genomeWidget = genomeWidget
        this.genomeLibrary = genomeLibrary
        this.lookManager = lookManager

        // Initialize time tracking
        this.clock = new THREE.Clock()
        this.lastTime = 0

        this.cameraManager = new CameraManager(frustumSize, container.clientWidth/container.clientHeight)
        this.mapControl = MapControlsFactory.create(this.cameraManager.camera, container)

        this.raycastService = raycastService
        this.raycastService.setupVisualFeedback(this.scene)
        this.scene.add(this.raycastService.raycastVisualFeedback);

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
        const deltaTime = this.clock.getDelta()

        if (true === this.raycastService.isEnabled) {
            const intersections = this.raycastService.intersectObjects(this.cameraManager.camera, this.geometryManager.linesGroup.children)
            this.handleIntersection(intersections)
        }

        this.sequenceService.update();

        this.mapControl.update()

        this.lookManager.updateAnimation(deltaTime)

        // Update edge animation through the Look (genome-specific animation)
        const look = this.lookManager.getLook();
        if (look && look.updateEdgeAnimation) {
            look.updateEdgeAnimation(this.geometryManager.edgesGroup)
        }

        this.renderer.render(this.scene, this.cameraManager.camera)
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

        let json
        try {
            json = await loadPath(url)
        } catch (error) {
            console.error(`Error loading ${url}:`, error)
        }

        this.genomicService.clear()
        await this.genomicService.createMetadata(json.node, json.sequence, this.genomeLibrary, this.raycastService)

        this.geometryManager.createGeometry(json, this.lookManager)
        this.geometryManager.addToScene(this.scene)

        this.genomeWidget.populateList()

        this.updateViewToFitScene(this.scene, this.cameraManager, this.mapControl)

        this.startAnimation()
    }
}

export default App
