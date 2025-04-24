import * as THREE from "three"

class CameraManager {
    constructor(frustumSize, aspectRatio) {

        const frustumHalfSize = frustumSize/2
        const [ left, right, top, bottom ] =
            [
                -frustumHalfSize * aspectRatio,
                frustumHalfSize * aspectRatio,
                frustumHalfSize,
                -frustumHalfSize
            ];

        const [ near, far ] =
            [
                1e2,
                1e5
            ];

        this.camera = new THREE.OrthographicCamera(left, right, top, bottom, near, far)
        this.camera.position.set(0, 0, 5)

    }

    windowResizeHelper(frustumSize, aspectRatio){
        this.camera.left = (-frustumSize * aspectRatio) / 2;
        this.camera.right = (frustumSize * aspectRatio) / 2;
        this.camera.top = frustumSize / 2;
        this.camera.bottom = -frustumSize / 2;
        this.camera.updateProjectionMatrix();
    }
}

export default CameraManager
