import * as THREE from 'three'

class CameraRig {
    constructor(cameraManager, controls) {
        this.cameraManager = cameraManager
        this.controls = controls

        // Add light to camera
        // const light = new THREE.PointLight(0xffffff, 2.5, 0, 0)
        // this.cameraManager.camera.add(light)
    }

    update() {
        this.controls.update()
    }

    get camera() {
        return this.cameraManager.camera
    }
}

export default CameraRig
