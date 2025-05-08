import { MapControls } from 'three/examples/jsm/controls/MapControls'

class MapControlsFactory {
    static create(camera, container) {
        const controls = new MapControls(camera, container)
        
        // Configure controls
        controls.zoomToCursor = true
        controls.enableRotate = false
        controls.screenSpacePanning = true
        controls.zoomSpeed = 1.2
        controls.panSpeed = 1

        // Add safety handlers for mouseup events
        const handleMouseUp = () => {
            if (controls.enabled) {
                controls.enabled = false
                controls.enabled = true
            }
        }

        // Listen for mouseup events on the window to catch cases where mouse is released outside container
        window.addEventListener('mouseup', handleMouseUp)
        window.addEventListener('touchend', handleMouseUp)

        // Clean up event listeners when controls are disposed
        const originalDispose = controls.dispose
        controls.dispose = () => {
            window.removeEventListener('mouseup', handleMouseUp)
            window.removeEventListener('touchend', handleMouseUp)
            originalDispose.call(controls)
        }

        return controls
    }
}

export default MapControlsFactory 