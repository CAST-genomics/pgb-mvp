uniform vec3 startColor;
uniform vec3 endColor;
uniform sampler2D map;
uniform sampler2D gradientMap;
uniform vec2 uvOffset;
uniform float opacity;
varying vec2 vUv;

void main() {
    // Sample the gradient texture
    vec4 gradient = texture2D(gradientMap, vUv);
    
    // Sample the arrow texture with animation
    vec2 animatedUv = vUv + uvOffset;
    vec4 arrow = texture2D(map, animatedUv);
    
    // Mix the colors based on the gradient
    vec3 mixedColor = mix(startColor, endColor, gradient.r);
    
    // Combine with the arrow texture
    gl_FragColor = vec4(mixedColor, arrow.a * opacity);
} 