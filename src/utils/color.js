// Color utility functions will be added here
import * as THREE from 'three'

/**
 * Apple Crayon color palette
 * A collection of 16 classic colors used in Apple's classic Mac OS
 */
const appleCrayonColors = new Map([
    ['black', new THREE.Color(0x000000)],
    ['blue', new THREE.Color(0x0000FF)],
    ['brown', new THREE.Color(0x996633)],
    ['cyan', new THREE.Color(0x00FFFF)],
    ['green', new THREE.Color(0x00FF00)],
    ['magenta', new THREE.Color(0xFF00FF)],
    ['orange', new THREE.Color(0xFF9900)],
    ['purple', new THREE.Color(0x9900FF)],
    ['red', new THREE.Color(0xFF0000)],
    ['yellow', new THREE.Color(0xFFFF00)],
    ['gray', new THREE.Color(0x808080)],
    ['lightBlue', new THREE.Color(0x6666FF)],
    ['lightGreen', new THREE.Color(0x66FF66)],
    ['lightOrange', new THREE.Color(0xFFCC66)],
    ['lightPurple', new THREE.Color(0xCC66FF)],
    ['lightRed', new THREE.Color(0xFF6666)]
]);

/**
 * Returns a random color from the Apple Crayon palette
 * @returns {THREE.Color} A THREE.Color object
 */
function getRandomAppleCrayonColor() {
    const colors = Array.from(appleCrayonColors.values());
    return colors[Math.floor(Math.random() * colors.length)].clone();
}

/**
 * Returns a random vibrant color from the Apple Crayon palette
 * Excludes black, gray, and light variants
 * @returns {THREE.Color} A THREE.Color object
 */
function getRandomVibrantAppleCrayonColor() {
    const vibrantColors = [
        'blue',
        'brown',
        'cyan',
        'green',
        'magenta',
        'orange',
        'purple',
        'red',
        'yellow'
    ];
    const colorName = vibrantColors[Math.floor(Math.random() * vibrantColors.length)];
    return getAppleCrayonColorByName(colorName);
}

/**
 * Returns a color from the Apple Crayon palette by name
 * @param {string} name - The name of the color
 * @returns {THREE.Color|undefined} A THREE.Color object or undefined if not found
 */
function getAppleCrayonColorByName(name) {
    const color = appleCrayonColors.get(name);
    return color ? color.clone() : undefined;
}

export { getRandomAppleCrayonColor, getRandomVibrantAppleCrayonColor, getAppleCrayonColorByName };