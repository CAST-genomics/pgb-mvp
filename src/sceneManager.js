import * as THREE from 'three'
import CameraManager from './cameraManager.js'
import CameraRig from "./cameraRig.js"
import MapControlsFactory from './mapControlsFactory.js'
import RendererFactory from './rendererFactory.js'


class SceneManager {

    constructor(container, backgroundColor, frustumSize, raycastService, dataService) {
        this.container = container
        this.scene = new THREE.Scene()
        this.scene.background = backgroundColor
        this.initialFrustumSize = frustumSize
        this.dataService = dataService
        // Initialize renderer
        this.renderer = RendererFactory.create(container)

        // Initialize camera system
        const cameraManager = new CameraManager(frustumSize, container.clientWidth/container.clientHeight)
        const mapControl = MapControlsFactory.create(cameraManager.camera, container)
        this.cameraRig = new CameraRig(cameraManager, mapControl)
        this.scene.add(this.cameraRig.camera)

        this.raycastService = raycastService
        this.raycastService.setupVisualFeedback(this.scene)

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
            this.clearIntersectionFeedback()
            return
        }

        // Sort by distance to get the closest intersection
        intersections.sort((a, b) => a.distance - b.distance);

		const { faceIndex, pointOnLine, object:nodeLine } = intersections[0];

        // Show feedback for line intersection
		this.raycastService.showVisualFeedback(pointOnLine, nodeLine.material.color)

        const { userData } = nodeLine
        const { nodeName } = userData
        // console.log(`Intersected node line: ${ nodeName }`);

		// Calculate parametric coordinate for the spiral
        const spline = this.dataService.splines.get(nodeName)
        const segments = nodeLine.geometry.getAttribute('instanceStart')
		const t = this.findClosestT(spline, pointOnLine, faceIndex, segments.count);
		console.log(`line ${ nodeName } t: ${ t }`);

		this.renderer.domElement.style.cursor = 'none';
	}

    findClosestT(spline, targetPoint, segmentIndex, totalSegments, tolerance = 0.0001) {
		// Convert segment index to parameter range
		const segmentSize = 1 / totalSegments;
		const left = segmentIndex * segmentSize;
		const right = (segmentIndex + 1) * segmentSize;

		// Do a local search within this segment
		let iterations = 0;
		const maxIterations = 16;
		let bestT = left;
		let bestDist = spline.getPoint(left).distanceTo(targetPoint);

		// Sample points within the segment to find closest
		const samples = 10;
		for (let i = 0; i <= samples; i++) {
			const t = left + (right - left) * (i / samples);
			const dist = spline.getPoint(t).distanceTo(targetPoint);

			if (dist < bestDist) {
				bestDist = dist;
				bestT = t;
			}
		}

		return bestT;
	}

	clearIntersectionFeedback() {
		this.raycastService.clearVisualFeedback()
        this.renderer.domElement.style.cursor = '';
	}

    animate() {
        const intersections = this.raycastService.intersectObject(this.cameraRig.camera, this.dataService.linesGroup)

        this.handleIntersection(intersections)

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




        // const found = this.scene.getObjectByName('boundingSphereHelper')
        // if (found) {
        //     this.scene.remove(found)
        // }

        // const materialConfig =
        // {
        //     color: 0xdddddd,
        //     wireframe: true,
        //     transparent: true,
        //     opacity: 0.5
        // }

        // const boundingSphereHelper = new THREE.Mesh(new THREE.SphereGeometry(boundingSphere.radius, 16, 16), new THREE.MeshBasicMaterial(materialConfig))
        // boundingSphereHelper.position.copy(boundingSphere.center)
        // boundingSphereHelper.name = 'boundingSphereHelper'
        // this.scene.add(boundingSphereHelper)



        // Multiplier used to add padding around scene bounding sphere when framing the view
        const SCENE_VIEW_PADDING = 1.5

        // Calculate required frustum size based on the bounding sphere (with padding)
        const { clientWidth, clientHeight } = this.container
        this.cameraRig.cameraManager.frustumHalfSize = boundingSphere.radius * SCENE_VIEW_PADDING
        this.cameraRig.cameraManager.windowResizeHelper(clientWidth/clientHeight)

        // Position camera to frame the scene
        this.cameraRig.camera.position.set(0, 0, 2 * boundingSphere.radius) // Position camera at 2x the radius
        this.cameraRig.camera.lookAt(boundingSphere.center)
    }

    async handleSearch(url) {
        console.log('Search URL:', url);

        let json
        try {
            json = await this.dataService.loadPath(url)
        } catch (error) {
            console.error(`Error loading ${url}:`, error)
        }

        this.dataService.dispose()

        this.dataService.ingestData(json)

        this.dataService.addToScene(this.scene)

        this.updateViewToFitScene()
    }
}

export default SceneManager
