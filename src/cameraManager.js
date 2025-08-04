import * as THREE from "three"

class CameraManager {
    constructor(frustumSize, aspectRatio) {

        const [ near, far ] = [ 1e2, 1e5 ];

        this.frustumHalfSize = frustumSize/2
        const [ left, right, top, bottom ] =
            [
                -this.frustumHalfSize * aspectRatio,
                this.frustumHalfSize * aspectRatio,
                this.frustumHalfSize,
                -this.frustumHalfSize
            ];

        this.camera = new THREE.OrthographicCamera(left, right, top, bottom, near, far)
        this.camera.name = 'camera'
        this.camera.position.set(0, 0, 5)

    }

    windowResizeHelper(aspectRatio){
        this.camera.left = (-this.frustumHalfSize * aspectRatio);
        this.camera.right = (this.frustumHalfSize * aspectRatio);
        this.camera.top = this.frustumHalfSize;
        this.camera.bottom = -this.frustumHalfSize;
        this.camera.updateProjectionMatrix();
    }
}

export default CameraManager
