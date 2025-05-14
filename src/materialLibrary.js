import * as THREE from 'three';
import vertexShader from '../shaders/animated-arrow.vert.glsl';
import fragmentShader from '../shaders/animated-arrow.frag.glsl';

/**
 * Creates a basic material for an arrow with a single color tint.
 * 
 * @param {THREE.Texture} heroTexture - The texture to use for the arrow shape (e.g., arrow-white)
 * @param {THREE.Color} color - The color to tint the arrow
 * @returns {THREE.MeshBasicMaterial} The configured material instance
 */
function getArrowMaterial(heroTexture, color) {
    const material = new THREE.MeshBasicMaterial({
        color,
        map: heroTexture,
        side: THREE.DoubleSide,
        transparent: true,
        alphaTest: 0.1,
        opacity: 1,
        depthWrite: false,
    });

    // Enable texture wrapping
    material.map.wrapS = THREE.RepeatWrapping;
    material.map.wrapT = THREE.RepeatWrapping;

    return material;
}

/**
 * Creates a material that blends between two colors using a gradient texture
 * while maintaining the shape of the provided hero texture.
 * 
 * @param {THREE.Color} startColor - The color at the start of the gradient
 * @param {THREE.Color} endColor - The color at the end of the gradient
 * @param {THREE.Texture} heroTexture - The texture to use for the arrow shape (e.g., arrow-white)
 * @returns {THREE.ShaderMaterial} The configured material instance
 */
function getColorRampArrowMaterial(startColor, endColor, heroTexture) {
    // Create gradient texture (1x256 pixels, black to white)
    const gradientCanvas = document.createElement('canvas');
    gradientCanvas.width = 256;
    gradientCanvas.height = 1;
    const ctx = gradientCanvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 256, 0);
    gradient.addColorStop(0, 'black');
    gradient.addColorStop(1, 'white');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 1);
    
    const gradientTexture = new THREE.CanvasTexture(gradientCanvas);
    gradientTexture.wrapS = THREE.ClampToEdgeWrapping;
    gradientTexture.wrapT = THREE.ClampToEdgeWrapping;

    // Configure hero texture wrapping
    heroTexture.wrapS = THREE.RepeatWrapping;
    heroTexture.wrapT = THREE.RepeatWrapping;
    heroTexture.needsUpdate = true;
    
    // Create the shader material
    const material = new THREE.ShaderMaterial({
        uniforms: {
            startColor: { value: startColor },
            endColor: { value: endColor },
            map: { value: heroTexture },
            gradientMap: { value: gradientTexture },
            uvOffset: { value: new THREE.Vector2(0.0, 0.0) }
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        side: THREE.DoubleSide,
        alphaTest: 0.1,
        depthWrite: false
    });

    return material;
}

export { getArrowMaterial, getColorRampArrowMaterial }