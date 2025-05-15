import * as THREE from 'three'
import CameraManager from './cameraManager.js'
import CameraRig from "./cameraRig.js"
import MapControlsFactory from './mapControlsFactory.js'
import RendererFactory from './rendererFactory.js'
import eventBus from './utils/eventBus.js';
import { loadPath } from './utils/utils.js'

class SceneManager {

    constructor(container, backgroundColor, frustumSize, raycastService, sequenceService, genomicService, geometryManager, genomeWidget) {
        this.container = container
        this.scene = new THREE.Scene()
        this.scene.background = backgroundColor

        this.geometryManager = geometryManager
        this.sequenceService = sequenceService
        this.genomicService = genomicService
        this.genomeWidget = genomeWidget
        // Initialize time tracking
        this.clock = new THREE.Clock()
        this.lastTime = 0

        // Initialize renderer
        this.renderer = RendererFactory.create(container)

        // Initialize camera system
        const cameraManager = new CameraManager(frustumSize, container.clientWidth/container.clientHeight)
        const mapControl = MapControlsFactory.create(cameraManager.camera, container)
        this.cameraRig = new CameraRig(cameraManager, mapControl)
        this.scene.add(this.cameraRig.camera)

        this.raycastService = raycastService
        this.raycastService.setupVisualFeedback(this.scene)

        // Register Raycast click handler
        this.raycastService.registerClickHandler((nodeLine, nodeName, ignore) => {
            this.sequenceService.renderWithNode(nodeLine, nodeName)
        });

        // Setup resize handler
        window.addEventListener('resize', () => this.handleResize())
    }

    addToScene(object) {
        this.scene.add(object)
    }

    handleResize() {
        const { clientWidth, clientHeight } = this.container
        this.cameraRig.cameraManager.windowResizeHelper(clientWidth/clientHeight)
        this.renderer.setSize(clientWidth, clientHeight)
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
            const intersections = this.raycastService.intersectObjects(this.cameraRig.camera, this.geometryManager.linesGroup.children)
            this.handleIntersection(intersections)
        }

        this.sequenceService.update();
        this.cameraRig.update()
        this.geometryManager.animateEdgeTextures(deltaTime)
        this.renderer.render(this.scene, this.cameraRig.camera)
    }

    startAnimation() {
        this.renderer.setAnimationLoop(() => this.animate())
    }

    stopAnimation() {
        this.renderer.setAnimationLoop(null)
    }

    updateViewToFitScene() {
        // Create a bounding box that encompasses all objects in the scene
        const bbox = new THREE.Box3()
        this.scene.traverse((object) => {
            if (object.isLine2 && object.name !== 'boundingSphereHelper') {
                object.geometry.computeBoundingBox()
                const objectBox = object.geometry.boundingBox.clone()
                objectBox.applyMatrix4(object.matrixWorld)
                bbox.union(objectBox)
            } else if (object.isMesh && object.name !== 'boundingSphereHelper') {
                object.geometry.computeBoundingBox()
                const objectBox = object.geometry.boundingBox.clone()
                objectBox.applyMatrix4(object.matrixWorld)
                bbox.union(objectBox)
            }
        })

        // Calculate the bounding sphere from the bounding box
        const boundingSphere = new THREE.Sphere()
        bbox.getBoundingSphere(boundingSphere)

        const found = this.scene.getObjectByName('boundingSphereHelper')
        if (found) {
            this.scene.remove(found)
        }

        // const boundingSphereHelper = this.#createBoundingSphereHelper(boundingSphere)
        // this.scene.add(boundingSphereHelper)

        // Multiplier used to add padding around scene bounding sphere when framing the view
        const SCENE_VIEW_PADDING = 1.5

        // Calculate required frustum size based on the bounding sphere (with padding)
        this.cameraRig.controls.reset()
        const { clientWidth, clientHeight } = this.container
        this.cameraRig.cameraManager.frustumHalfSize = boundingSphere.radius * SCENE_VIEW_PADDING
        this.cameraRig.cameraManager.windowResizeHelper(clientWidth/clientHeight)

        // Position camera to frame the scene
        this.cameraRig.camera.position.set(0, 0, 2 * boundingSphere.radius) // Position camera at 2x the radius
        this.cameraRig.camera.lookAt(boundingSphere.center)
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
        this.genomicService.createMetadata(json.node)
        this.genomicService.createSequences(json.sequence)

        this.geometryManager.createGeometry(json)
        this.geometryManager.addToScene(this.scene)

        this.genomeWidget.populateList()

        this.updateViewToFitScene()

        this.startAnimation()
    }
}

export default SceneManager
