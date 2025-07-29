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

        // Initialize edge tooltip
        this.edgeTooltip = this.createEdgeTooltip();

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

        const { faceIndex, point, pointOnLine, object } = intersections[0];

        this.renderer.domElement.style.cursor = 'none';

        if (object.userData?.type === 'edge') {
            this.handleEdgeIntersection(object, point);
        } else if (object.userData?.type === 'node') {
            const { t, nodeName, nodeLine } = this.raycastService.handleIntersection(this.geometryManager, object, pointOnLine, faceIndex);
            eventBus.publish('lineIntersection', { t, nodeName, nodeLine })
        }
    }

    handleEdgeIntersection(edgeObject, point) {
        this.raycastService.showVisualFeedback(point, new THREE.Color(0x00ff00));
        this.showEdgeTooltip(edgeObject, point);
    }

    createEdgeTooltip() {
        const tooltip = document.createElement('div');
        tooltip.className = 'edge-tooltip';
        tooltip.style.cssText = `
            position: absolute;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-family: monospace;
            pointer-events: none;
            z-index: 1000;
            display: none;
            white-space: nowrap;
        `;

        this.container.appendChild(tooltip);
        return tooltip;
    }

    showEdgeTooltip(edgeObject, point) {
        const { nodeNameStart, nodeNameEnd, geometryKey } = edgeObject.userData;

        // Convert 3D world coordinates to screen coordinates
        const screenPoint = point.clone().project(this.cameraManager.camera);

        // Convert to CSS coordinates
        const rect = this.container.getBoundingClientRect();
        const x = (screenPoint.x + 1) * rect.width / 2;
        const y = (-screenPoint.y + 1) * rect.height / 2;

        // Update tooltip content
        this.edgeTooltip.innerHTML = `
            <div><strong>Key:</strong> ${geometryKey}</div>
            <div><strong>Start Node:</strong> ${nodeNameStart}</div>
            <div><strong>End Node:</strong> ${nodeNameEnd}</div>`;

        // Position tooltip
        const deltaX = 24
        const deltaY = 24
        this.edgeTooltip.style.left = `${x + deltaX}px`;
        this.edgeTooltip.style.top = `${y - deltaY}px`;
        this.edgeTooltip.style.display = 'block';
    }

    hideEdgeTooltip() {
        if (this.edgeTooltip) {
            this.edgeTooltip.style.display = 'none';
        }
    }

    clearIntersection() {
        this.raycastService.clearIntersection()
        this.renderer.domElement.style.cursor = '';
        this.hideEdgeTooltip();
    }

    animate() {

        if (true === this.raycastService.isEnabled) {
            // Combine both node lines and edge meshes for raycasting
            const allObjects = [
                ...this.geometryManager.linesGroup.children,
                ...this.geometryManager.edgesGroup.children
            ];
            const intersections = this.raycastService.intersectObjects(this.cameraManager.camera, allObjects)
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

        const nodeGeometries = this.geometryManager.geometryFactory.getNodeGeometries()
        const edgeGeometries = this.geometryManager.geometryFactory.getEdgeGeometries()
        this.genomicService.buildNodeAssemblyStatistics(nodeGeometries, edgeGeometries)

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
