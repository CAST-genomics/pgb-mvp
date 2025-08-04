## Note: Transparent Materials and Render Order in three.js

When using transparent materials in three.js (i.e., `material.transparent = true`), the renderer sorts these objects separately from opaque ones. This can lead to subtle bugs with `renderOrder`:

- **If you want to control the draw order of transparent objects (e.g., to ensure a highlight sphere always appears above transparent lines), you must set `transparent: true` on all involved materials.**
- If only some objects are marked as transparent, `renderOrder` may not work as expected, since three.js handles opaque and transparent objects in different rendering passes.
- Always ensure both your lines and overlay objects (like highlight spheres) have `transparent: true` if you want `renderOrder` to determine their stacking.

**Example:**
```js
line.material.transparent = true;
line.renderOrder = 0;

sphere.material.transparent = true;
sphere.renderOrder = 10;
```

**Without `transparent: true` on both, the overlay may not appear above the lines, even if `renderOrder` is set.** 