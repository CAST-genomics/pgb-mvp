# Handling Textures with Alpha Channels in Three.js

## Material Configuration

When using textures with alpha channels (transparency), the material needs to be properly configured:

```javascript
const materialConfig = {
    // Basic properties
    color: 0xffffff,                    // Base color that tints the texture
    map: textureService.getTexture('my-texture'),  // The texture with alpha channel
    side: THREE.DoubleSide,             // Render both sides of the geometry
    
    // Alpha/Transparency properties
    transparent: true,                  // Enable transparency
    alphaTest: 0.1,                     // Threshold for transparency (0-1)
    depthWrite: false,                  // Optional: helps with transparency sorting
    opacity: 1.0                        // Optional: overall material opacity
};
```

## Key Properties Explained

### Essential Properties
- `transparent: true` - Must be set to enable transparency
- `alphaTest: 0.1` - Pixels with alpha below this value become fully transparent
- `map` - The texture containing the alpha channel

### Optional Properties
- `depthWrite: false` - Helps prevent z-fighting with transparent objects
- `opacity` - Controls overall material transparency (0-1)
- `side` - Determines which sides of the geometry are rendered

## Texture Requirements

1. **Format**: PNG is recommended for alpha channels
2. **Alpha Channel**: Must be present in the texture file
3. **UV Mapping**: Geometry must have proper UV coordinates

## Common Issues and Solutions

### Z-Fighting
If transparent objects are fighting for depth:
```javascript
materialConfig.depthWrite = false;
```

### Sorting Issues
If transparent objects appear in wrong order:
```javascript
// Set render order on the mesh
mesh.renderOrder = 1;
```

### Performance
For better performance with many transparent objects:
1. Use `alphaTest` instead of full transparency
2. Keep transparent areas to a minimum
3. Consider using `depthWrite: false` only when necessary

## Best Practices

1. **Alpha Test Threshold**
   - Start with `alphaTest: 0.1`
   - Adjust based on texture content
   - Higher values (e.g., 0.5) for sharper edges
   - Lower values (e.g., 0.01) for softer edges

2. **Texture Optimization**
   - Use power-of-two dimensions
   - Compress textures when possible
   - Keep alpha areas minimal

3. **Material Setup**
   - Always set `transparent: true`
   - Consider using `alphaTest` instead of full transparency
   - Set appropriate `side` property

4. **Performance Considerations**
   - Minimize number of transparent objects
   - Use `alphaTest` for better performance
   - Consider using `depthWrite: false` for complex scenes

## Example Usage

```javascript
// Create material with alpha support
const material = new THREE.MeshBasicMaterial({
    map: textureService.getTexture('my-texture'),
    transparent: true,
    alphaTest: 0.1,
    side: THREE.DoubleSide
});

// Apply to mesh
const mesh = new THREE.Mesh(geometry, material);
```

## Debugging Tips

1. **Check Texture Loading**
   ```javascript
   textureService.getTexture('my-texture').then(texture => {
       console.log('Texture loaded:', texture);
   });
   ```

2. **Verify Alpha Channel**
   - Open texture in image editor
   - Confirm alpha channel exists
   - Check alpha values are correct

3. **Common Issues**
   - Black edges: Adjust `alphaTest` value
   - Wrong transparency: Check texture alpha channel
   - Z-fighting: Try `depthWrite: false`
   - Performance: Use `alphaTest` instead of full transparency 