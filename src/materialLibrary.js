import * as THREE from 'three';
import vertexShader from '../shaders/animated-arrow.vert.glsl';
import fragmentShader from '../shaders/animated-arrow.frag.glsl';
import { createGradientTexture } from './utils/textureService';

/**
 * Creates a material that blends between two colors using a gradient texture
 * while maintaining the shape of the provided hero texture.
 * 
 * @param {THREE.Color} startColor - The color at the start of the gradient
 * @param {THREE.Color} endColor - The color at the end of the gradient
 * @param {THREE.Texture} heroTexture - The texture to use for the arrow shape (e.g., arrow-white)
 * @param {number} [opacity=1] - The opacity of the material (0.0 to 1.0)
 * @returns {THREE.ShaderMaterial} The configured material instance
 */
function getColorRampArrowMaterial(startColor, endColor, heroTexture, opacity = 1) {
        
    // Configure hero texture wrapping
    heroTexture.wrapS = THREE.RepeatWrapping;
    heroTexture.wrapT = THREE.RepeatWrapping;
    heroTexture.needsUpdate = true;

    const uniforms = {
        startColor: { value: startColor },
        endColor: { value: endColor },
        map: { value: heroTexture },
        gradientMap: { value: createGradientTexture() },
        uvOffset: { value: new THREE.Vector2(0.0, 0.0) },
        opacity: { value: opacity }
    }
    
    // Create the shader material
    return new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, transparent:true, side:THREE.DoubleSide, alphaTest:0.1, depthWrite:false });
}

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

export { getArrowMaterial, getColorRampArrowMaterial }