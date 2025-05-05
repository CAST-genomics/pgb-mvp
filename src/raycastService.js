import * as THREE from 'three';

class RayCastService {
    constructor(container, threshold) {
        this.pointer = new THREE.Vector2();
        this.raycaster = new THREE.Raycaster();
        this.setup(threshold);
        this.setupEventListeners(container);
    }

    setup(threshold) {
        this.raycaster.params.Line2 = {};
        this.raycaster.params.Line2.threshold = threshold;
    }

    setupEventListeners(container) {
        this.container = container;
        container.addEventListener('pointermove', this.onPointerMove.bind(this));
    }

    cleanup() {
        if (this.container) {
            this.container.removeEventListener('pointermove', this.onPointerMove.bind(this));
        }
    }

    onPointerMove(event) {
        const rect = this.container.getBoundingClientRect();
        this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    updateRaycaster(camera) {
        this.raycaster.setFromCamera(this.pointer, camera);
    }

    intersectObject(camera, object) {
        this.updateRaycaster(camera)
        return this.raycaster.intersectObject(object)
    }

    intersectObjects(camera, objects) {
        this.updateRaycaster(camera)
        return this.raycaster.intersectObjects(objects)
    }

    setupVisualFeedback(scene) {
		this.raycastVisualFeedback = this.createVisualFeeback(0x00ff00);
		scene.add(this.raycastVisualFeedback);
	}

    createVisualFeeback(color) {
		const sphere = new THREE.Mesh(new THREE.SphereGeometry(16, 32, 16), new THREE.MeshBasicMaterial({ color, depthTest: false }))
		sphere.name = 'raycastVisualFeedback'
		sphere.visible = false
		sphere.renderOrder = 10
		return sphere
	}

    showVisualFeedback(pointOnLine, visualFeedbackColor) {
        this.raycastVisualFeedback.visible = true;
		this.raycastVisualFeedback.position.copy(pointOnLine);
		this.raycastVisualFeedback.material.color.copy(visualFeedbackColor).offsetHSL(0.7, 0, 0);
    }

    clearVisualFeedback() {
        this.raycastVisualFeedback.visible = false;
    }

    handleIntersection(dataService, nodeLine, pointOnLine, faceIndex) {
        const { userData } = nodeLine;
        const { nodeName } = userData;
        const spline = dataService.splines.get(nodeName);
        const segments = nodeLine.geometry.getAttribute('instanceStart');
        const t = this.findClosestT(spline, pointOnLine, faceIndex, segments.count);
        return { t, nodeName };
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
}

export default RayCastService;
