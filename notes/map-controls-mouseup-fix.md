# Three.js MapControls Mouseup Event Fix

## Issue Description
When using Three.js MapControls, there is a known issue where mouseup events can be missed, particularly in the following scenarios:
- When the mouse moves outside the container during a drag operation
- During rapid mouse movements
- When the mouse is released quickly after starting a drag

This can result in the controls getting "stuck" in drag mode, even though the user has released the mouse button.

## Solution
The solution involves adding global event listeners and implementing a safety mechanism to force the controls to reset their internal state.

### Implementation
```javascript
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
```

### Key Components

1. **Global Event Listeners**
   - Added `mouseup` event listener on the window level
   - Added `touchend` event listener for touch devices
   - This ensures we catch all mouse releases, even outside the container

2. **Safety Mechanism**
   - Temporarily disables and re-enables the controls on mouseup
   - Forces the controls to reset their internal state
   - Prevents the controls from getting stuck in drag mode

3. **Cleanup**
   - Overrides the `dispose` method
   - Removes event listeners when controls are disposed
   - Prevents memory leaks

## Why This Works

The solution works by:
1. Catching all mouseup events at the window level
2. Using a quick disable/enable cycle to force the controls to reset
3. Properly cleaning up event listeners

This ensures the controls will properly reset when:
- The mouse is released outside the container
- The mouse is released after a rapid movement
- The touch interaction ends on mobile devices

## Additional Notes

- This is a common issue with Three.js MapControls
- The solution is non-intrusive and doesn't affect the normal operation of the controls
- The fix works for both mouse and touch interactions
- The cleanup mechanism ensures there are no memory leaks

## References

- [Three.js MapControls Documentation](https://threejs.org/docs/#examples/en/controls/MapControls)
- [Three.js GitHub Issues](https://github.com/mrdoob/three.js/issues) (contains similar reported issues) 