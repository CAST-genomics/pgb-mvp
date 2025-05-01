import * as THREE from 'three';

class RayCastService {
    constructor(threshold) {
        this.pointer = new THREE.Vector2();
        this.raycaster = new THREE.Raycaster();
        this.setup(threshold);
        this.setupEventListeners();
    }

    setup(threshold) {
        this.raycaster.params.Line2 = {};
        this.raycaster.params.Line2.threshold = threshold;
    }

    setupEventListeners() {
        document.addEventListener('pointermove', this.onPointerMove.bind(this));
    }

    cleanup() {
        document.removeEventListener('pointermove', this.onPointerMove.bind(this));
    }

    onPointerMove(event) {
        this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
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
}

export default RayCastService;
